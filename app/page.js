"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const OPTIONAL_PLATFORMS = [
  {
    key: "blog",
    label: "블로그",
    icon: "📝",
    placeholder: "https://m.blog.naver.com/...",
  },
  {
    key: "naver_clip",
    label: "네이버 클립",
    icon: "🎬",
    placeholder: "네이버 클립 링크",
  },
  {
    key: "youtube",
    label: "유튜브",
    icon: "▶️",
    placeholder: "https://youtube.com/...",
  },
  {
    key: "tiktok",
    label: "틱톡",
    icon: "🎵",
    placeholder: "https://www.tiktok.com/@...",
  },
  {
    key: "today_house",
    label: "오늘의집",
    icon: "🏠",
    placeholder: "오늘의집 프로필 링크",
  },
];

export default function HomePage() {
  const router = useRouter();

  const [mode, setMode] = useState("login");

  // 로그인
  const [loginNickname, setLoginNickname] =
    useState("");
  const [loginInstagram, setLoginInstagram] =
    useState("");
  const [loginLoading, setLoginLoading] =
    useState(false);

  // 가입신청
  const [joinNickname, setJoinNickname] =
    useState("");
  const [joinInstagram, setJoinInstagram] =
    useState("");

  const [platformLinks, setPlatformLinks] =
    useState({
      blog: "",
      naver_clip: "",
      youtube: "",
      tiktok: "",
      today_house: "",
    });

  const [joinLoading, setJoinLoading] =
    useState(false);

  const [joinSuccess, setJoinSuccess] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    checkExistingSession();
  }, []);

  async function checkExistingSession() {
    const token = localStorage.getItem(
      "jungle_follow_session"
    );

    if (!token) return;

    const { data, error } = await supabase.rpc(
      "get_current_member",
      {
        p_session_token: token,
      }
    );

    if (!error && data) {
      router.push("/member");
      return;
    }

    localStorage.removeItem(
      "jungle_follow_session"
    );

    localStorage.removeItem(
      "jungle_follow_name"
    );
  }

  function normalizeInstagram(value) {
    return value
      .trim()
      .replace(/^@/, "");
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setErrorMessage("");
    setJoinSuccess(false);
  }

  function updatePlatformLink(key, value) {
    setPlatformLinks((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  // =====================================================
  // 로그인
  // =====================================================

  async function handleLogin(event) {
    event.preventDefault();

    setErrorMessage("");

    const nickname =
      loginNickname.trim();

    const instagram =
      normalizeInstagram(
        loginInstagram
      );

    if (!nickname) {
      setErrorMessage(
        "카카오톡 닉네임을 입력해주세요."
      );
      return;
    }

    if (!instagram) {
      setErrorMessage(
        "인스타그램 아이디를 입력해주세요."
      );
      return;
    }

    setLoginLoading(true);

    const { data, error } =
      await supabase.rpc(
        "login_member",
        {
          p_kakao_nickname:
            nickname,

          p_instagram_id:
            instagram,
        }
      );

    if (error) {
      setErrorMessage(
        error.message ||
          "로그인할 수 없습니다."
      );

      setLoginLoading(false);
      return;
    }

    const token =
      typeof data === "string"
        ? data
        : data?.session_token ||
          data?.token ||
          data?.[0]
            ?.session_token ||
          data?.[0]?.token;

    if (!token) {
      setErrorMessage(
        "로그인 정보를 확인할 수 없습니다."
      );

      setLoginLoading(false);
      return;
    }

    localStorage.setItem(
      "jungle_follow_session",
      token
    );

    localStorage.setItem(
      "jungle_follow_name",
      nickname
    );

    router.push("/member");
  }

  // =====================================================
  // 가입신청
  // =====================================================

  async function handleJoin(event) {
    event.preventDefault();

    setErrorMessage("");

    const nickname =
      joinNickname.trim();

    const instagram =
      normalizeInstagram(
        joinInstagram
      );

    if (!nickname) {
      setErrorMessage(
        "카카오톡 닉네임을 입력해주세요."
      );
      return;
    }

    if (!instagram) {
      setErrorMessage(
        "인스타그램 아이디를 입력해주세요."
      );
      return;
    }

    setJoinLoading(true);

    const { error } =
      await supabase.rpc(
        "request_member_join",
        {
          p_kakao_nickname:
            nickname,

          p_instagram_id:
            instagram,

          p_blog:
            platformLinks.blog.trim() ||
            null,

          p_naver_clip:
            platformLinks.naver_clip.trim() ||
            null,

          p_youtube:
            platformLinks.youtube.trim() ||
            null,

          p_tiktok:
            platformLinks.tiktok.trim() ||
            null,

          p_today_house:
            platformLinks.today_house.trim() ||
            null,
        }
      );

    if (error) {
      setErrorMessage(
        error.message ||
          "가입신청 중 오류가 발생했습니다."
      );

      setJoinLoading(false);
      return;
    }

    setJoinLoading(false);

    setJoinNickname("");
    setJoinInstagram("");

    setPlatformLinks({
      blog: "",
      naver_clip: "",
      youtube: "",
      tiktok: "",
      today_house: "",
    });

    setJoinSuccess(true);
  }

  // =====================================================
  // 가입 완료
  // =====================================================

  if (
    mode === "join" &&
    joinSuccess
  ) {
    return (
      <main style={styles.page}>
        <section style={styles.container}>
          <div style={styles.successCard}>
            <div style={styles.successIcon}>
              🌿
            </div>

            <div style={styles.brandBadge}>
              JUNGLE FOLLOW
            </div>

            <h1 style={styles.successTitle}>
              가입신청 완료!
            </h1>

            <p style={styles.successText}>
              관리자 승인 후 로그인할 수
              있어요.
            </p>

            <div style={styles.successNotice}>
              📸 인스타그램은 기본 참여
              플랫폼이에요.
              <br />
              <br />
              추가로 입력한 플랫폼 링크도
              함께 등록되었습니다.
            </div>

            <button
              type="button"
              style={styles.mainButton}
              onClick={() => {
                setJoinSuccess(false);
                setMode("login");
              }}
            >
              로그인 화면으로
            </button>
          </div>
        </section>
      </main>
    );
  }

  // =====================================================
  // 기본 화면
  // =====================================================

  return (
    <main style={styles.page}>
      <section style={styles.container}>

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

        <div style={styles.modeTabs}>
          <button
            type="button"
            onClick={() =>
              changeMode("login")
            }
            style={{
              ...styles.modeTab,

              ...(mode === "login"
                ? styles.modeTabActive
                : {}),
            }}
          >
            로그인
          </button>

          <button
            type="button"
            onClick={() =>
              changeMode("join")
            }
            style={{
              ...styles.modeTab,

              ...(mode === "join"
                ? styles.modeTabActive
                : {}),
            }}
          >
            가입신청
          </button>
        </div>

        {errorMessage && (
          <div style={styles.errorBox}>
            {errorMessage}
          </div>
        )}

        {mode === "login" ? (
          // =================================================
          // 로그인
          // =================================================

          <form
            onSubmit={handleLogin}
            style={styles.card}
          >
            <div style={styles.cardTop}>
              <div style={styles.smallLabel}>
                MEMBER LOGIN
              </div>

              <h2 style={styles.cardTitle}>
                회원 로그인
              </h2>

              <p style={styles.cardDescription}>
                승인된 회원만 로그인할 수
                있어요.
              </p>
            </div>

            <label style={styles.label}>
              카카오톡 닉네임
              <span style={styles.required}>
                *
              </span>
            </label>

            <input
              type="text"
              value={loginNickname}
              onChange={(event) =>
                setLoginNickname(
                  event.target.value
                )
              }
              placeholder="카카오톡방 닉네임"
              style={styles.input}
            />

            <label
              style={{
                ...styles.label,
                marginTop: "15px",
              }}
            >
              인스타그램 아이디
              <span style={styles.required}>
                *
              </span>
            </label>

            <div style={styles.instagramInput}>
              <span style={styles.at}>
                @
              </span>

              <input
                type="text"
                value={loginInstagram}
                onChange={(event) =>
                  setLoginInstagram(
                    event.target.value
                  )
                }
                placeholder="instagram_id"
                style={
                  styles.instagramField
                }
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              style={{
                ...styles.mainButton,

                opacity: loginLoading
                  ? 0.6
                  : 1,
              }}
            >
              {loginLoading
                ? "로그인 중..."
                : "로그인"}
            </button>

            <div style={styles.bottomGuide}>
              처음 오셨나요?

              <button
                type="button"
                onClick={() =>
                  changeMode("join")
                }
                style={styles.textButton}
              >
                가입신청하기
              </button>
            </div>
          </form>
        ) : (
          // =================================================
          // 가입신청
          // =================================================

          <form
            onSubmit={handleJoin}
            style={styles.card}
          >
            <div style={styles.cardTop}>
              <div style={styles.smallLabel}>
                JOIN REQUEST
              </div>

              <h2 style={styles.cardTitle}>
                가입신청 🌿
              </h2>

              <p style={styles.cardDescription}>
                필수 정보와 활동 중인
                플랫폼을 입력해주세요.
              </p>
            </div>

            {/* 카카오톡 */}

            <label style={styles.label}>
              카카오톡 닉네임
              <span style={styles.required}>
                *
              </span>
            </label>

            <input
              type="text"
              value={joinNickname}
              onChange={(event) =>
                setJoinNickname(
                  event.target.value
                )
              }
              placeholder="예) 아율"
              style={styles.input}
            />

            {/* 인스타그램 */}

            <label
              style={{
                ...styles.label,
                marginTop: "15px",
              }}
            >
              인스타그램 아이디
              <span style={styles.required}>
                *
              </span>
            </label>

            <div style={styles.instagramInput}>
              <span style={styles.at}>
                @
              </span>

              <input
                type="text"
                value={joinInstagram}
                onChange={(event) =>
                  setJoinInstagram(
                    event.target.value
                  )
                }
                placeholder="bubbly_ayul"
                style={
                  styles.instagramField
                }
              />
            </div>

            <div style={styles.instagramInfo}>
              📸 인스타그램은 모든 회원
              필수 플랫폼입니다.
            </div>

            {/* 선택 플랫폼 */}

            <div
              style={
                styles.platformSection
              }
            >
              <div
                style={
                  styles.platformSectionTop
                }
              >
                <div>
                  <div
                    style={
                      styles.platformTitle
                    }
                  >
                    추가 플랫폼
                  </div>

                  <div
                    style={
                      styles.platformDescription
                    }
                  >
                    활동 중인 플랫폼만
                    입력해주세요.
                  </div>
                </div>

                <span
                  style={
                    styles.optionalBadge
                  }
                >
                  선택
                </span>
              </div>

              {OPTIONAL_PLATFORMS.map(
                (platform) => (
                  <div
                    key={platform.key}
                    style={
                      styles.platformItem
                    }
                  >
                    <label
                      style={
                        styles.platformLabel
                      }
                    >
                      <span
                        style={{
                          fontSize: "18px",
                        }}
                      >
                        {platform.icon}
                      </span>

                      {platform.label}

                      <span
                        style={
                          styles.optionalText
                        }
                      >
                        선택
                      </span>
                    </label>

                    <input
                      type="text"
                      value={
                        platformLinks[
                          platform.key
                        ]
                      }
                      onChange={(event) =>
                        updatePlatformLink(
                          platform.key,
                          event.target.value
                        )
                      }
                      placeholder={
                        platform.placeholder
                      }
                      style={styles.input}
                    />
                  </div>
                )
              )}
            </div>

            <div style={styles.joinNotice}>
              💚 링크를 입력한 플랫폼만
              해당 플랫폼 명단에 자동으로
              등록돼요.
              <br />
              입력하지 않은 플랫폼은
              참여 명단에 포함되지 않아요.
            </div>

            <button
              type="submit"
              disabled={joinLoading}
              style={{
                ...styles.mainButton,

                opacity: joinLoading
                  ? 0.6
                  : 1,
              }}
            >
              {joinLoading
                ? "신청 중..."
                : "가입신청하기"}
            </button>

            <div style={styles.bottomGuide}>
              이미 승인받으셨나요?

              <button
                type="button"
                onClick={() =>
                  changeMode("login")
                }
                style={styles.textButton}
              >
                로그인하기
              </button>
            </div>
          </form>
        )}

        <div style={styles.adminLinkWrap}>
          <button
            type="button"
            onClick={() =>
              router.push("/admin")
            }
            style={styles.adminLink}
          >
            관리자 로그인
          </button>
        </div>
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

  modeTabs: {
    display: "grid",

    gridTemplateColumns:
      "1fr 1fr",

    padding: "5px",

    borderRadius: "18px",

    background: "#e8e8df",

    marginBottom: "13px",
  },

  modeTab: {
    border: "none",

    borderRadius: "14px",

    padding: "12px",

    background: "transparent",

    color: "#7c8277",

    fontSize: "14px",

    fontWeight: "900",

    cursor: "pointer",
  },

  modeTabActive: {
    background: "#ffffff",

    color: "#405037",

    boxShadow:
      "0 3px 10px rgba(60,70,50,0.08)",
  },

  card: {
    padding: "25px 21px",

    borderRadius: "28px",

    background:
      "rgba(255,255,255,0.94)",

    border:
      "1px solid #ebe9df",

    boxShadow:
      "0 18px 50px rgba(66,73,54,0.08)",
  },

  cardTop: {
    marginBottom: "22px",
  },

  smallLabel: {
    color: "#87a15d",

    fontSize: "10px",

    fontWeight: "950",

    letterSpacing: "1.5px",

    marginBottom: "5px",
  },

  cardTitle: {
    margin: 0,

    fontSize: "23px",

    fontWeight: "950",

    letterSpacing: "-0.7px",
  },

  cardDescription: {
    margin: "6px 0 0",

    color: "#848b80",

    fontSize: "13px",
  },

  label: {
    display: "block",

    fontSize: "13px",

    fontWeight: "900",

    marginBottom: "7px",
  },

  required: {
    marginLeft: "4px",

    color: "#86a958",
  },

  input: {
    width: "100%",

    boxSizing: "border-box",

    padding: "14px 15px",

    borderRadius: "15px",

    border:
      "1px solid #dde1d5",

    background: "#fbfcf9",

    outline: "none",

    fontSize: "14px",
  },

  instagramInput: {
    display: "flex",

    alignItems: "center",

    border:
      "1px solid #dde1d5",

    borderRadius: "15px",

    background: "#fbfcf9",

    overflow: "hidden",
  },

  at: {
    paddingLeft: "15px",

    color: "#788272",

    fontWeight: "900",
  },

  instagramField: {
    flex: 1,

    minWidth: 0,

    padding:
      "14px 14px 14px 5px",

    border: "none",

    background: "transparent",

    outline: "none",

    fontSize: "14px",
  },

  instagramInfo: {
    marginTop: "8px",

    padding: "10px 12px",

    borderRadius: "13px",

    background: "#edf6dc",

    color: "#647552",

    fontSize: "11px",

    fontWeight: "700",
  },

  platformSection: {
    marginTop: "25px",

    paddingTop: "21px",

    borderTop:
      "1px solid #eceee7",
  },

  platformSectionTop: {
    display: "flex",

    justifyContent:
      "space-between",

    alignItems: "flex-start",

    marginBottom: "15px",
  },

  platformTitle: {
    fontSize: "16px",

    fontWeight: "950",
  },

  platformDescription: {
    marginTop: "3px",

    color: "#8a9086",

    fontSize: "11px",
  },

  optionalBadge: {
    padding: "5px 9px",

    borderRadius: "999px",

    background: "#f1f2ec",

    color: "#8b9085",

    fontSize: "10px",

    fontWeight: "900",
  },

  platformItem: {
    marginTop: "14px",
  },

  platformLabel: {
    display: "flex",

    alignItems: "center",

    gap: "6px",

    marginBottom: "7px",

    fontSize: "13px",

    fontWeight: "900",
  },

  optionalText: {
    marginLeft: "3px",

    color: "#a1a59c",

    fontSize: "10px",

    fontWeight: "700",
  },

  joinNotice: {
    marginTop: "20px",

    padding: "13px 14px",

    borderRadius: "15px",

    background: "#f6f4e9",

    color: "#77796c",

    fontSize: "12px",

    lineHeight: "1.65",
  },

  mainButton: {
    width: "100%",

    marginTop: "20px",

    padding: "15px",

    border: "none",

    borderRadius: "16px",

    background: "#a9d95d",

    color: "#2d3b24",

    fontSize: "15px",

    fontWeight: "950",

    cursor: "pointer",
  },

  bottomGuide: {
    marginTop: "17px",

    textAlign: "center",

    color: "#858b81",

    fontSize: "12px",
  },

  textButton: {
    marginLeft: "5px",

    padding: 0,

    border: "none",

    background: "transparent",

    color: "#6e8f3f",

    fontSize: "12px",

    fontWeight: "900",

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

  successCard: {
    marginTop: "60px",

    padding: "36px 24px",

    borderRadius: "28px",

    background: "#ffffff",

    textAlign: "center",

    border:
      "1px solid #ebe9df",

    boxShadow:
      "0 18px 50px rgba(66,73,54,0.08)",
  },

  successIcon: {
    fontSize: "48px",

    marginBottom: "14px",
  },

  successTitle: {
    margin: "18px 0 0",

    fontSize: "25px",

    fontWeight: "950",
  },

  successText: {
    margin: "8px 0 0",

    color: "#7c8477",

    fontSize: "14px",
  },

  successNotice: {
    marginTop: "20px",

    padding: "14px",

    borderRadius: "15px",

    background: "#f2f7e8",

    color: "#69775d",

    fontSize: "12px",

    lineHeight: "1.6",
  },

  adminLinkWrap: {
    textAlign: "center",

    marginTop: "18px",
  },

  adminLink: {
    border: "none",

    background: "transparent",

    color: "#9a9d94",

    fontSize: "11px",

    cursor: "pointer",
  },
};
