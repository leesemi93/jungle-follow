"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function MemberPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadMember();
  }, []);

  async function loadMember() {
    setLoading(true);
    setErrorMessage("");

    const token = localStorage.getItem(
      "jungle_follow_session"
    );

    if (!token) {
      router.replace("/");
      return;
    }

    const { data, error } = await supabase.rpc(
      "get_current_member",
      {
        p_session_token: token,
      }
    );

    if (error) {
      console.error(error);

      localStorage.removeItem(
        "jungle_follow_session"
      );

      localStorage.removeItem(
        "jungle_follow_name"
      );

      router.replace("/");
      return;
    }

    const currentMember = Array.isArray(data)
      ? data[0]
      : data;

    if (!currentMember) {
      localStorage.removeItem(
        "jungle_follow_session"
      );

      localStorage.removeItem(
        "jungle_follow_name"
      );

      router.replace("/");
      return;
    }

    setMember(currentMember);
    setLoading(false);
  }

  async function handleLogout() {
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

    router.replace("/");
  }

  function goAdmin() {
    if (!member?.is_admin) return;

    router.push("/admin/dashboard");
  }

  const isSuperAdmin =
    member?.admin_role === "super_admin";

  const isAdmin =
    member?.admin_role === "admin";

  if (loading) {
    return (
      <main style={styles.page}>
        <section style={styles.container}>
          <div style={styles.loadingCard}>
            <div style={styles.loadingTiger}>
              🐯
            </div>

            <div style={styles.loadingText}>
              정글룸 불러오는 중...
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.container}>
        {/* 상단 */}

        <div style={styles.top}>
          <div style={styles.brandBadge}>
            JUNGLE FOLLOW
          </div>

          <div style={styles.logoCircle}>
            🐯
          </div>

          <h1 style={styles.title}>
            정글맞팔웹
          </h1>

          <p style={styles.subtitle}>
            정글 맞팔을 더 편하게 🌿
          </p>
        </div>

        {/* 내 정보 */}

        <div style={styles.profileCard}>
          <div style={styles.profileTop}>
            <div style={styles.avatar}>
              {member?.kakao_nickname
                ?.slice(0, 1)
                ?.toUpperCase() || "🌿"}
            </div>

            <div style={styles.profileInfo}>
              <div style={styles.nameLine}>
                <span style={styles.name}>
                  {member?.kakao_nickname}
                </span>

                {isSuperAdmin && (
                  <span
                    style={
                      styles.superAdminBadge
                    }
                  >
                    👑 최고관리자
                  </span>
                )}

                {isAdmin && (
                  <span
                    style={styles.adminBadge}
                  >
                    ♛ 관리자
                  </span>
                )}

                {!isSuperAdmin &&
                  !isAdmin && (
                    <span
                      style={
                        styles.memberBadge
                      }
                    >
                      입장
                    </span>
                  )}
              </div>

              <div style={styles.instagram}>
                @{member?.instagram_id}
              </div>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div style={styles.errorBox}>
            {errorMessage}
          </div>
        )}

        {/* 맞팔데이 */}

        <div style={styles.sectionCard}>
          <div style={styles.sectionTop}>
            <div>
              <div style={styles.smallLabel}>
                MONTHLY FOLLOW
              </div>

              <h2 style={styles.sectionTitle}>
                이번 달 맞팔데이 🌿
              </h2>
            </div>

            <div style={styles.leafCircle}>
              🌱
            </div>
          </div>

          <p style={styles.description}>
            매월 1일 00:00 ~ 3일 23:59
            <br />
            참여할 플랫폼을 선택할 수 있어요.
          </p>

          <button
            type="button"
            style={styles.mainButton}
            onClick={() =>
              router.push("/member/follow")
            }
          >
            맞팔데이 참여하기
          </button>
        </div>

        {/* 관리자 메뉴 */}

        {(isAdmin || isSuperAdmin) && (
          <div style={styles.adminCard}>
            <div style={styles.adminCardTop}>
              <div>
                <div
                  style={
                    styles.adminSmallLabel
                  }
                >
                  ADMIN
                </div>

                <h2
                  style={
                    styles.adminCardTitle
                  }
                >
                  {isSuperAdmin
                    ? "👑 최고관리자 메뉴"
                    : "♛ 관리자 메뉴"}
                </h2>
              </div>

              <div style={styles.crownCircle}>
                {isSuperAdmin
                  ? "👑"
                  : "♛"}
              </div>
            </div>

            <p
              style={
                styles.adminDescription
              }
            >
              회원 관리, 가입 승인,
              맞팔데이 관리 기능을 이용할 수
              있어요.
            </p>

            <button
              type="button"
              onClick={goAdmin}
              style={styles.adminButton}
            >
              관리자 메뉴 들어가기
            </button>
          </div>
        )}

        {/* 안내 */}

        <div style={styles.notice}>
          <div style={styles.noticeTitle}>
            🌿 정글맞팔웹
          </div>

          <div style={styles.noticeText}>
            인스타그램은 모든 회원의 필수
            플랫폼이에요.
            <br />
            추가 플랫폼은 등록된 링크를
            기준으로 맞팔 명단에 포함됩니다.
          </div>
        </div>

        {/* 로그아웃 */}

        <button
          type="button"
          onClick={handleLogout}
          style={styles.logoutButton}
        >
          로그아웃
        </button>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",

    background:
      "linear-gradient(180deg, #f5f1e7 0%, #f8f6ef 48%, #eef4e7 100%)",

    padding: "34px 18px 60px",

    color: "#253326",
  },

  container: {
    width: "100%",
    maxWidth: "460px",
    margin: "0 auto",
  },

  top: {
    textAlign: "center",
    marginBottom: "25px",
  },

  brandBadge: {
    display: "inline-block",

    padding: "7px 12px",

    borderRadius: "999px",

    background: "#e3eccd",

    color: "#687a4d",

    fontSize: "11px",

    fontWeight: "900",

    letterSpacing: "1.5px",
  },

  logoCircle: {
    width: "72px",
    height: "72px",

    margin: "18px auto 12px",

    borderRadius: "24px",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    background: "#dcebb9",

    fontSize: "38px",

    boxShadow:
      "0 10px 28px rgba(91,112,62,0.13)",
  },

  title: {
    margin: 0,

    fontSize: "30px",

    fontWeight: "950",

    letterSpacing: "-1.3px",
  },

  subtitle: {
    margin: "8px 0 0",

    color: "#788176",

    fontSize: "14px",
  },

  profileCard: {
    padding: "18px",

    borderRadius: "24px",

    background:
      "rgba(255,255,255,0.94)",

    border: "1px solid #ebe9df",

    boxShadow:
      "0 12px 35px rgba(66,73,54,0.07)",

    marginBottom: "14px",
  },

  profileTop: {
    display: "flex",

    alignItems: "center",

    gap: "13px",
  },

  avatar: {
    width: "48px",
    height: "48px",

    flexShrink: 0,

    borderRadius: "16px",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    background: "#edf5df",

    color: "#536642",

    fontSize: "19px",

    fontWeight: "950",
  },

  profileInfo: {
    flex: 1,
    minWidth: 0,
  },

  nameLine: {
    display: "flex",

    alignItems: "center",

    flexWrap: "wrap",

    gap: "6px",
  },

  name: {
    fontSize: "17px",

    fontWeight: "950",
  },

  instagram: {
    marginTop: "4px",

    color: "#788176",

    fontSize: "12px",
  },

  memberBadge: {
    padding: "4px 7px",

    borderRadius: "999px",

    background: "#e7f2d4",

    color: "#668146",

    fontSize: "9px",

    fontWeight: "950",
  },

  adminBadge: {
    padding: "4px 8px",

    borderRadius: "999px",

    background: "#f2eafa",

    color: "#79579b",

    fontSize: "9px",

    fontWeight: "950",
  },

  superAdminBadge: {
    padding: "4px 8px",

    borderRadius: "999px",

    background: "#fff0c7",

    color: "#8d6918",

    fontSize: "9px",

    fontWeight: "950",
  },

  sectionCard: {
    padding: "22px 20px",

    borderRadius: "25px",

    background:
      "rgba(255,255,255,0.94)",

    border: "1px solid #ebe9df",

    boxShadow:
      "0 12px 35px rgba(66,73,54,0.07)",

    marginBottom: "14px",
  },

  sectionTop: {
    display: "flex",

    alignItems: "center",

    justifyContent:
      "space-between",

    gap: "15px",
  },

  smallLabel: {
    color: "#87a15d",

    fontSize: "10px",

    fontWeight: "950",

    letterSpacing: "1.3px",

    marginBottom: "5px",
  },

  sectionTitle: {
    margin: 0,

    fontSize: "20px",

    fontWeight: "950",

    letterSpacing: "-0.6px",
  },

  leafCircle: {
    width: "43px",
    height: "43px",

    flexShrink: 0,

    borderRadius: "15px",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    background: "#eef5df",

    fontSize: "21px",
  },

  description: {
    margin: "13px 0 0",

    color: "#7d8579",

    fontSize: "12px",

    lineHeight: "1.65",
  },

  mainButton: {
    width: "100%",

    marginTop: "18px",

    padding: "15px",

    border: "none",

    borderRadius: "16px",

    background: "#a9d95d",

    color: "#2d3b24",

    fontSize: "14px",

    fontWeight: "950",

    cursor: "pointer",
  },

  adminCard: {
    padding: "22px 20px",

    borderRadius: "25px",

    background:
      "linear-gradient(135deg, #faf6ff 0%, #f4edfb 100%)",

    border: "1px solid #dfd0ee",

    boxShadow:
      "0 12px 35px rgba(104,72,135,0.08)",

    marginBottom: "14px",
  },

  adminCardTop: {
    display: "flex",

    justifyContent:
      "space-between",

    alignItems: "center",

    gap: "15px",
  },

  adminSmallLabel: {
    color: "#9271ae",

    fontSize: "10px",

    fontWeight: "950",

    letterSpacing: "1.4px",

    marginBottom: "5px",
  },

  adminCardTitle: {
    margin: 0,

    fontSize: "19px",

    fontWeight: "950",

    color: "#5f4775",
  },

  crownCircle: {
    width: "43px",
    height: "43px",

    flexShrink: 0,

    borderRadius: "15px",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    background: "#ffffff",

    fontSize: "20px",

    boxShadow:
      "0 4px 12px rgba(104,72,135,0.08)",
  },

  adminDescription: {
    margin: "12px 0 0",

    color: "#806e8e",

    fontSize: "12px",

    lineHeight: "1.6",
  },

  adminButton: {
    width: "100%",

    marginTop: "17px",

    padding: "14px",

    border:
      "1px solid #d6c2e8",

    borderRadius: "15px",

    background: "#ffffff",

    color: "#66477e",

    fontSize: "13px",

    fontWeight: "950",

    cursor: "pointer",
  },

  notice: {
    padding: "16px",

    borderRadius: "19px",

    background: "#f3f5e9",

    marginTop: "14px",
  },

  noticeTitle: {
    fontSize: "12px",

    fontWeight: "950",

    color: "#61744c",
  },

  noticeText: {
    marginTop: "6px",

    color: "#7b8176",

    fontSize: "11px",

    lineHeight: "1.65",
  },

  logoutButton: {
    width: "100%",

    marginTop: "18px",

    padding: "13px",

    border: "none",

    background: "transparent",

    color: "#969b92",

    fontSize: "11px",

    fontWeight: "800",

    cursor: "pointer",
  },

  errorBox: {
    marginBottom: "12px",

    padding: "12px 14px",

    borderRadius: "14px",

    background: "#fff0ed",

    color: "#a84d43",

    fontSize: "13px",

    fontWeight: "800",
  },

  loadingCard: {
    marginTop: "100px",

    padding: "35px",

    borderRadius: "28px",

    background: "#ffffff",

    textAlign: "center",

    border: "1px solid #ebe9df",
  },

  loadingTiger: {
    fontSize: "42px",
  },

  loadingText: {
    marginTop: "12px",

    color: "#778072",

    fontSize: "13px",

    fontWeight: "800",
  },
};
