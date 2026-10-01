"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function MembersPage() {
  const router = useRouter();

  const [adminToken, setAdminToken] = useState("");

  const [nickname, setNickname] = useState("");
  const [instagram, setInstagram] = useState("");
  const [memo, setMemo] = useState("");

  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [message, setMessage] = useState("");
  const [listError, setListError] = useState("");

  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const token = localStorage.getItem(
      "jungle_follow_admin"
    );

    if (!token) {
      router.replace("/admin");
      return;
    }

    const { data, error } = await supabase.rpc(
      "get_current_admin",
      {
        p_session_token: token,
      }
    );

    if (error || !data?.length) {
      localStorage.removeItem(
        "jungle_follow_admin"
      );

      router.replace("/admin");
      return;
    }

    setAdminToken(token);

    await loadMembers(token);

    setLoading(false);
  }

  async function loadMembers(token = adminToken) {
    if (!token) return;

    setListLoading(true);
    setListError("");

    const { data, error } = await supabase.rpc(
      "admin_get_members",
      {
        p_session_token: token,
      }
    );

    if (error) {
      setListError(
        `회원 목록 불러오기 실패: ${error.message}`
      );

      setListLoading(false);
      return;
    }

    setMembers(data || []);
    setListLoading(false);
  }

  async function addMember(e) {
    e.preventDefault();

    if (!adminToken) {
      setMessage(
        "관리자 로그인 정보를 확인해주세요."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    const cleanNickname = nickname.trim();

    const cleanInstagram = instagram
      .trim()
      .replace(/^@/, "");

    const { error } = await supabase.rpc(
      "add_member",
      {
        p_session_token: adminToken,
        p_kakao_nickname: cleanNickname,
        p_instagram_id: cleanInstagram,
        p_admin_memo: memo.trim() || null,
      }
    );

    if (error) {
      setMessage(
        `회원 등록 실패: ${error.message}`
      );

      setSaving(false);
      return;
    }

    setNickname("");
    setInstagram("");
    setMemo("");

    setMessage(
      `${cleanNickname}님 회원 등록 완료 💚`
    );

    await loadMembers(adminToken);

    setSaving(false);
  }

  const filteredMembers = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase()
      .replace(/^@/, "");

    return members.filter((member) => {
      const statusMatch =
        filter === "all" ||
        member.status === filter;

      if (!statusMatch) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const memberNickname = (
        member.kakao_nickname || ""
      ).toLowerCase();

      const memberInstagram = (
        member.instagram_id || ""
      ).toLowerCase();

      return (
        memberNickname.includes(keyword) ||
        memberInstagram.includes(keyword)
      );
    });
  }, [members, search, filter]);

  function getStatusText(status) {
    if (status === "active") {
      return "활동중";
    }

    if (status === "paused") {
      return "일시정지";
    }

    if (status === "inactive") {
      return "퇴장";
    }

    return status || "-";
  }

  function getStatusClass(status) {
    if (status === "active") {
      return "memberStatus active";
    }

    if (status === "paused") {
      return "memberStatus paused";
    }

    if (status === "inactive") {
      return "memberStatus inactive";
    }

    return "memberStatus";
  }

  if (loading) {
    return (
      <main className="page">
        <section className="card">
          <p className="dashboardLoading">
            관리자 확인 중... 🌿
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="page dashboardPage">
      <section className="dashboard">

        <div className="memberPageHeader">
          <button
            type="button"
            className="backButton"
            onClick={() =>
              router.push("/admin/dashboard")
            }
          >
            ←
          </button>

          <div>
            <span className="dashboardBadge">
              MEMBERS
            </span>

            <h1 className="memberPageTitle">
              회원 관리 👥
            </h1>

            <p className="dashboardHello">
              정글맞팔 회원을 등록하고 관리해요.
            </p>
          </div>
        </div>

        <section className="memberAdminCard">
          <h2>새 회원 등록</h2>

          <form onSubmit={addMember}>
            <label>
              카톡방 닉네임
            </label>

            <input
              value={nickname}
              onChange={(e) =>
                setNickname(e.target.value)
              }
              placeholder="예) 세미"
              required
            />

            <label>
              인스타 아이디
            </label>

            <div className="inputWrap">
              <span>@</span>

              <input
                value={instagram}
                onChange={(e) =>
                  setInstagram(e.target.value)
                }
                placeholder="인스타 아이디"
                required
              />
            </div>

            <label>
              메모 <small>(선택)</small>
            </label>

            <input
              value={memo}
              onChange={(e) =>
                setMemo(e.target.value)
              }
              placeholder="필요한 내용이 있으면 적어주세요"
            />

            <button
              type="submit"
              disabled={saving}
            >
              {saving
                ? "등록 중..."
                : "회원 등록하기"}
            </button>
          </form>

          {message && (
            <p className="message">
              {message}
            </p>
          )}
        </section>

        <section className="memberAdminCard">

          <div className="memberListTop">
            <div>
              <h2>회원 목록</h2>

              <p className="memberCount">
                총 {members.length}명
              </p>
            </div>

            <button
              type="button"
              className="refreshButton"
              onClick={() =>
                loadMembers(adminToken)
              }
              disabled={listLoading}
            >
              ↻ 새로고침
            </button>
          </div>

          <div className="memberSearchWrap">
            <span>🔎</span>

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="닉네임 또는 인스타 아이디 검색"
            />
          </div>

          <div className="memberFilters">
            <button
              type="button"
              className={
                filter === "all"
                  ? "memberFilter active"
                  : "memberFilter"
              }
              onClick={() =>
                setFilter("all")
              }
            >
              전체
            </button>

            <button
              type="button"
              className={
                filter === "active"
                  ? "memberFilter active"
                  : "memberFilter"
              }
              onClick={() =>
                setFilter("active")
              }
            >
              활동중
            </button>

            <button
              type="button"
              className={
                filter === "paused"
                  ? "memberFilter active"
                  : "memberFilter"
              }
              onClick={() =>
                setFilter("paused")
              }
            >
              일시정지
            </button>

            <button
              type="button"
              className={
                filter === "inactive"
                  ? "memberFilter active"
                  : "memberFilter"
              }
              onClick={() =>
                setFilter("inactive")
              }
            >
              퇴장
            </button>
          </div>

          {listError && (
            <p className="memberError">
              {listError}
            </p>
          )}

          {listLoading ? (
            <div className="emptyMembers">
              <span>🌿</span>
              <strong>
                회원 목록 불러오는 중...
              </strong>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="emptyMembers">
              <span>🐯</span>

              <strong>
                표시할 회원이 없어요.
              </strong>

              <p>
                검색어나 상태를 확인해주세요.
              </p>
            </div>
          ) : (
            <div className="membersList">

              {filteredMembers.map(
                (member) => (
                  <div
                    className="memberItem"
                    key={member.id}
                  >
                    <div className="memberAvatar">
                      {member.kakao_nickname
                        ?.charAt(0)
                        ?.toUpperCase() || "🌿"}
                    </div>

                    <div className="memberInfo">
                      <div className="memberNameRow">
                        <strong>
                          {member.kakao_nickname}
                        </strong>

                        <span
                          className={getStatusClass(
                            member.status
                          )}
                        >
                          {getStatusText(
                            member.status
                          )}
                        </span>
                      </div>

                      <p>
                        @{member.instagram_id}
                      </p>

                      {member.admin_memo && (
                        <small>
                          {member.admin_memo}
                        </small>
                      )}
                    </div>
                  </div>
                )
              )}

            </div>
          )}

        </section>

      </section>
    </main>
  );
}
