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
  const [actionLoading, setActionLoading] = useState("");

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

    if (!adminToken) return;

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
      `${cleanNickname}님 입장 등록 완료 💚`
    );

    await loadMembers(adminToken);

    setSaving(false);
  }

  async function leaveMember(member) {
    const reason = window.prompt(
      `${member.kakao_nickname}님 퇴장 사유를 입력해주세요.`,
      ""
    );

    if (reason === null) return;

    const memoValue = window.prompt(
      "관리자 메모가 있으면 입력해주세요.\n없으면 비워두고 확인을 눌러주세요.",
      ""
    );

    if (memoValue === null) return;

    const ok = window.confirm(
      `${member.kakao_nickname}님을 퇴장 처리할까요?\n\n퇴장 기록은 보관됩니다.`
    );

    if (!ok) return;

    setActionLoading(member.id);
    setMessage("");

    const { error } = await supabase.rpc(
      "leave_member",
      {
        p_session_token: adminToken,
        p_member_id: member.id,
        p_reason: reason.trim() || null,
        p_memo: memoValue.trim() || null,
      }
    );

    if (error) {
      setMessage(
        `퇴장 처리 실패: ${error.message}`
      );

      setActionLoading("");
      return;
    }

    setMessage(
      `${member.kakao_nickname}님 퇴장 처리 완료`
    );

    await loadMembers(adminToken);

    setActionLoading("");
  }

  async function rejoinMember(member) {
    const memoValue = window.prompt(
      `${member.kakao_nickname}님 재입장 메모가 있으면 입력해주세요.\n없으면 비워두고 확인을 눌러주세요.`,
      ""
    );

    if (memoValue === null) return;

    const ok = window.confirm(
      `${member.kakao_nickname}님을 다시 입장 처리할까요?`
    );

    if (!ok) return;

    setActionLoading(member.id);
    setMessage("");

    const { error } = await supabase.rpc(
      "rejoin_member",
      {
        p_session_token: adminToken,
        p_member_id: member.id,
        p_memo: memoValue.trim() || null,
      }
    );

    if (error) {
      setMessage(
        `재입장 실패: ${error.message}`
      );

      setActionLoading("");
      return;
    }

    setMessage(
      `${member.kakao_nickname}님 재입장 완료 💚`
    );

    await loadMembers(adminToken);

    setActionLoading("");
  }

  const filteredMembers = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase()
      .replace(/^@/, "");

    return members.filter((member) => {
      let statusMatch = true;

      if (filter === "active") {
        statusMatch = member.status === "active";
      }

      if (filter === "inactive") {
        statusMatch = member.status === "inactive";
      }

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
    if (status === "inactive") {
      return "퇴장";
    }

    return "입장";
  }

  function getStatusClass(status) {
    if (status === "inactive") {
      return "memberStatus inactive";
    }

    return "memberStatus active";
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
              회원 입장과 퇴장 기록을 관리해요.
            </p>
          </div>
        </div>

        <section className="memberAdminCard">
          <h2>새 회원 입장</h2>

          <form onSubmit={addMember}>

            <label>카톡방 닉네임</label>

            <input
              value={nickname}
              onChange={(e) =>
                setNickname(e.target.value)
              }
              placeholder="예) 세미"
              required
            />

            <label>인스타 아이디</label>

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
                : "회원 입장 등록"}
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

          <div
            className="memberFilters"
            style={{
              gridTemplateColumns:
                "repeat(3, 1fr)",
            }}
          >
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
              입장
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
                        ?.charAt(0) || "🌿"}
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
                          메모: {member.admin_memo}
                        </small>
                      )}

                      <div className="memberActions">

                        {member.status !==
                          "inactive" && (
                          <button
                            type="button"
                            className="memberAction leave"
                            disabled={
                              actionLoading ===
                              member.id
                            }
                            onClick={() =>
                              leaveMember(member)
                            }
                          >
                            퇴장
                          </button>
                        )}

                        {member.status ===
                          "inactive" && (
                          <button
                            type="button"
                            className="memberAction rejoin"
                            disabled={
                              actionLoading ===
                              member.id
                            }
                            onClick={() =>
                              rejoinMember(member)
                            }
                          >
                            재입장
                          </button>
                        )}

                      </div>
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
