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
  const [adminName, setAdminName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const token = localStorage.getItem("jungle_follow_admin");

    if (!token) {
      router.replace("/admin");
      return;
    }

    const { data, error } = await supabase.rpc("get_current_admin", {
      p_session_token: token,
    });

    if (error || !data?.length) {
      localStorage.removeItem("jungle_follow_admin");
      router.replace("/admin");
      return;
    }

    const admin = data[0];

    setAdminName(
      admin.kakao_nickname ||
      admin.nickname ||
      "관리자"
    );

    setLoading(false);
  }

  async function logout() {
    const token = localStorage.getItem("jungle_follow_admin");

    if (token) {
      await supabase.rpc("logout_admin", {
        p_session_token: token,
      });
    }

    localStorage.removeItem("jungle_follow_admin");
    router.replace("/admin");
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
              정글맞팔 관리 🐯
            </h1>

            <p className="dashboardHello">
              {adminName}님, 안녕하세요 💚
            </p>
          </div>

          <button
            type="button"
            className="logoutButton"
            onClick={logout}
          >
            로그아웃
          </button>
        </div>

        <div className="dashboardMenu">

          <a
            href="/admin/members"
            className="dashboardMenuCard"
          >
            <span className="menuIcon">👥</span>
            <div>
              <strong>회원 관리</strong>
              <p>
                회원 등록 · 퇴장 · 재입장 · 일시정지
              </p>
            </div>
            <span className="menuArrow">›</span>
          </a>

          <a
            href="/admin/events"
            className="dashboardMenuCard"
          >
            <span className="menuIcon">🌿</span>
            <div>
              <strong>맞팔데이 관리</strong>
              <p>
                이번 달 맞팔데이 생성 · 참여자 관리
              </p>
            </div>
            <span className="menuArrow">›</span>
          </a>

          <a
            href="/admin/status"
            className="dashboardMenuCard"
          >
            <span className="menuIcon">📊</span>
            <div>
              <strong>참여 현황</strong>
              <p>
                투표 현황 · 미참여자 확인
              </p>
            </div>
            <span className="menuArrow">›</span>
          </a>

          <a
            href="/admin/platforms"
            className="dashboardMenuCard"
          >
            <span className="menuIcon">📱</span>
            <div>
              <strong>플랫폼별 현황</strong>
              <p>
                인스타 · 블로그 · 클립 등 확인
              </p>
            </div>
            <span className="menuArrow">›</span>
          </a>

        </div>

      </section>
    </main>
  );
}
