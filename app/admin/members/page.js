"use client";

import { useEffect, useState } from "react";
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

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
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
    setLoading(false);
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

    setSaving(false);
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

          <div className="memberListTitle">

            <div>
              <h2>회원 목록</h2>

              <p>
                회원 검색 · 퇴장 · 재입장 · 일시정지
              </p>
            </div>

            <span className="comingBadge">
              준비 중
            </span>

          </div>

          <div className="emptyMembers">

            <span>🐯</span>

            <strong>
              회원 목록 기능을 연결할게요.
            </strong>

            <p>
              등록 기능부터 먼저 테스트한 뒤
              전체 회원 목록을 붙여요.
            </p>

          </div>

        </section>

      </section>

    </main>
  );
}
