"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AdminDashboard() {
  const router = useRouter();

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const token = localStorage.getItem(
      "jungle_follow_session"
    );

    // 회원 로그인이 안 되어 있으면 메인으로
    if (!token) {
      router.replace("/");
      return;
    }

    // 회원 세션 + 관리자 권한 확인
    const { data, error } = await supabase.rpc(
      "get_current_member",
      {
        p_session_token: token,
      }
    );

    const currentMember = Array.isArray(data)
      ? data[0]
      : data;

    // 회원 세션 자체가 유효하지 않음
    if (error || !currentMember) {
      localStorage.removeItem(
        "jungle_follow_session"
      );

      localStorage.removeItem(
        "jungle_follow_name"
      );

      router.replace("/");
      return;
    }

    // 일반 회원이면 관리자 화면 접근 차단
    if (
      currentMember.admin_role !== "admin" &&
      currentMember.admin_role !== "super_admin"
    ) {
      router.replace("/member");
      return;
    }

    setMember(currentMember);
    setLoading(false);
  }

  function goMemberHome() {
    router.push("/member");
  }

  async function logout() {
    const token = localStorage.getItem(
      "jungle_follow_session"
    );

    if (token) {
      try {
        await supabase.rpc("logout_member", {
          p_session_token: token,
        });
      } catch (error) {
        console.error(error);
      }
    }

    localStorage.removeItem(
      "jungle_follow_session"
    );

    localStorage.removeItem(
      "jungle_follow_name"
    );

    // 예전 관리자 로그인 흔적도 정리
    localStorage.removeItem(
      "jungle_follow_admin"
    );

    router.replace("/");
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

        <div className="dashboardTop">
          <div>
            <span className="dashboardBadge">
              ADMIN
            </span>

            <h1 className="dashboardTitle">
              관리자 메뉴 🐯
            </h1>

            <p className="dashboardHello">
              {member?.kakao_nickname || "관리자"}님,
              안녕하세요 💚
            </p>
          </div>

          <button
            type="button"
            className="logoutButton"
            onClick={goMemberHome}
          >
            회원 홈
          </button>
        </div>

        <div className="dashboardMenu">

          <a
            href="/admin/members"
            className="dashboardMenuCard"
          >
            <span className="menuIcon">
              👥
            </span>

            <div>
              <strong>
                회원 관리
              </strong>

              <p>
                가입 승인 · 입장 · 퇴장 · 플랫폼 관리
              </p>
            </div>

            <span className="menuArrow">
              ›
            </span>
          </a>

          <a
            href="/admin/events"
            className="dashboardMenuCard"
          >
            <span className="menuIcon">
              🌿
            </span>

            <div>
              <strong>
                맞팔데이 관리
              </strong>

              <p>
                월별 맞팔데이 · 플랫폼별 참여 현황
              </p>
            </div>

            <span className="menuArrow">
              ›
            </span>
          </a>

          <a
            href="/admin/status"
            className="dashboardMenuCard"
          >
            <span className="menuIcon">
              📊
            </span>

            <div>
              <strong>
                참여 현황
              </strong>

              <p>
                참여 · 제한 · 미참여 확인
              </p>
            </div>

            <span className="menuArrow">
              ›
            </span>
          </a>

          <a
            href="/admin/platforms"
            className="dashboardMenuCard"
          >
            <span className="menuIcon">
              📱
            </span>

            <div>
              <strong>
                플랫폼별 현황
              </strong>

              <p>
                인스타그램 · 블로그 · 클립 · 유튜브 · 틱톡 · 오늘의집
              </p>
            </div>

            <span className="menuArrow">
              ›
            </span>
          </a>

        </div>

        <button
          type="button"
          className="logoutButton"
          onClick={logout}
          style={{
            marginTop: "22px",
          }}
        >
          로그아웃
        </button>

      </section>
    </main>
  );
}
