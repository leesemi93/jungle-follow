"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const EXTRA_ROOMS = [
  {
    key: "blog",
    label: "블로그",
    icon: "📝",
  },
  {
    key: "naver_clip",
    label: "네이버 클립",
    icon: "🎬",
  },
  {
    key: "youtube",
    label: "유튜브",
    icon: "▶️",
  },
  {
    key: "tiktok",
    label: "틱톡",
    icon: "🎵",
  },
  {
    key: "today_house",
    label: "오늘의집",
    icon: "🏠",
  },
];

export default function HomePage() {
  const router = useRouter();

  const [mode, setMode] = useState("login");

  const [loginNickname, setLoginNickname] =
    useState("");
  const [loginInstagram, setLoginInstagram] =
    useState("");
  const [loginLoading, setLoginLoading] =
    useState(false);

  const [joinNickname, setJoinNickname] =
    useState("");
  const [joinInstagram, setJoinInstagram] =
    useState("");
  const [joinRooms, setJoinRooms] = useState([]);
  const [joinLoading, setJoinLoading] =
    useState(false);

  const [joinSuccess, setJoinSuccess] =
    useState(false);

  const [message, setMessage] = useState("");
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
    return value.trim().replace(/^@/, "");
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setMessage("");
    setErrorMessage("");
    setJoinSuccess(false);
  }

  function toggleRoom(platform) {
    setJoinRooms((prev) => {
      if (prev.includes(platform)) {
        return prev.filter(
          (item) => item !== platform
        );
      }

      return [...prev, platform];
    });
  }

  async function handleLogin(event) {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");

    const nickname = loginNickname.trim();
    const instagram =
      normalizeInstagram(loginInstagram);

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

    const { data, error } = await supabase.rpc(
      "login_member",
      {
        p_kakao_nickname: nickname,
        p_instagram_id: instagram,
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
          data?.[0]?.session_token ||
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

  async function handleJoin(event) {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");

    const nickname = joinNickname.trim();
    const instagram =
      normalizeInstagram(joinInstagram);

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

    const { error } = await supabase.rpc(
      "request_member_join",
      {
        p_kakao_nickname: nickname,
        p_instagram_id: instagram,
        p_platforms: joinRooms,
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
    setJoinSuccess(true);

    setJoinNickname("");
    setJoinInstagram("");
    setJoinRooms([]);
  }

  if (joinSuccess && mode === "join") {
    return (
      <main style={styles.page}>
        <section style={styles.container}>
          <div style={styles.brandBadge}>
            JUNGLE FOLLOW
          </div>

          <div style={styles.successCard}>
            <div style={styles.successIcon}>
              🌿
            </div>

            <h1 style={styles.successTitle}>
              가입신청 완료!
            </h1>

            <p style={styles.successText}>
              관리자 승인 후 로그인할 수 있어요.
            </p>

            <div style={styles.successNotice}>
              📸 인스타그램은 기본 참여방이에요.
              <br />
              선택한 추가 참여방도 함께
              신청되었습니다.
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
            정글 맞팔방을 편하게 이용해요 🌿
          </p>
        </div>

        <div style={styles.modeTabs}>
          <button
            type="button"
            onClick={() => changeMode("login")}
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
            onClick={() => changeMode("join")}
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

        {message && (
          <div style={styles.messageBox}>
            {message}
          </div>
        )}

        {mode === "login" ? (
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
                승인된 회원만 로그인할 수 있어요.
              </p>
            </div>

            <label style={styles.label}>
              카카오톡 닉네임
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
                marginTop: "14px",
              }}
            >
              인스타그램 아이디
            </label>

            <div style={styles.instagramInput}>
              <span style={styles.at}>@</span>

              <input
                type="text"
                value={loginInstagram}
                onChange={(event) =>
                  setLoginInstagram(
                    event.target.value
                  )
                }
                placeholder="instagram_id"
                style={styles.instagramField}
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              style={{
                ...styles.mainButton,
                opacity: loginLoading ? 0.6 : 1,
              }}
            >
              {loginLoading
                ? "로그인 중..."
                : "로그인"}
            </button>

            <div style={styles.bottomGuide}>
              아직 회원이 아니신가요?
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
                신청 후 관리자 승인이 필요해요.
              </p>
            </div>

            <label style={styles.label}>
              카카오톡 닉네임
            </label>

            <input
              type="text"
              value={joinNickname}
              onChange={(event) =>
                setJoinNickname(
                  event.target.value
                )
              }
              placeholder="카카오톡방 닉네임"
              style={styles.input}
            />

            <label
              style={{
                ...styles.label,
                marginTop: "14px",
              }}
            >
              인스타그램 아이디
            </label>

            <div style={styles.instagramInput}>
              <span style={styles.at}>@</span>

              <input
                type="text"
                value={joinInstagram}
                onChange={(event) =>
                  setJoinInstagram(
                    event.target.value
                  )
                }
                placeholder="instagram_id"
                style={styles.instagramField}
              />
            </div>

            <div style={styles.roomSection}>
              <div style={styles.roomTitle}>
                참여방
              </div>

              <div style={styles.instagramRoom}>
                <div>
                  <strong>
                    ✓ 📸 인스타그램
                  </strong>

                  <div style={styles.roomSub}>
                    모든 회원 필수 참여방
                  </div>
                </div>

                <span style={styles.requiredBadge}>
                  필수
                </span>
              </div>

              <div style={styles.extraRoomTitle}>
                추가로 활동하는 방을
                선택해주세요.
              </div>

              <div style={styles.roomGrid}>
                {EXTRA_ROOMS.map((room) => {
                  const selected =
                    joinRooms.includes(room.key);

                  return (
                    <button
                      key={room.key}
                      type="button"
                      onClick={() =>
                        toggleRoom(room.key)
                      }
                      style={{
                        ...styles.roomButton,
                        ...(selected
                          ? styles.roomButtonSelected
                          : {}),
                      }}
                    >
                      <span
                        style={{
                          fontSize: "19px",
                        }}
                      >
                        {room.icon}
                      </span>

                      <span>
                        {selected
                          ? "✓ "
                          : ""}
                        {room.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={styles.joinNotice}>
              💚 신청하신 정보와 참여방을
              관리자가 확인한 후 승인해드려요.
            </div>

            <button
              type="submit"
              disabled={joinLoading}
              style={{
                ...styles.mainButton,
                opacity: joinLoading ? 0.6 : 1,
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
      "0 10px 28px rgba(91, 112, 62, 0.13)",
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
    gridTemplateColumns: "1fr 1fr",
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
      "0 3px 10px rgba(60, 70, 50, 0.08)",
  },

  card: {
    padding: "25px 21px",
    borderRadius: "28px",
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #ebe9df",
    boxShadow:
      "0 18px 50px rgba(66, 73, 54, 0.08)",
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

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 15px",
    borderRadius: "15px",
    border: "1px solid #dde1d5",
    background: "#fbfcf9",
    outline: "none",
    fontSize: "15px",
  },

  instagramInput: {
    display: "flex",
    alignItems: "center",
    border: "1px solid #dde1d5",
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
    padding: "14px 14px 14px 5px",
    border: "none",
    background: "transparent",
    outline: "none",
    fontSize: "15px",
  },

  roomSection: {
    marginTop: "22px",
  },

  roomTitle: {
    fontSize: "14px",
    fontWeight: "950",
    marginBottom: "9px",
  },

  instagramRoom: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px",
    borderRadius: "16px",
    border: "1px solid #cfe0ad",
    background: "#edf6dc",
    fontSize: "14px",
  },

  roomSub: {
    marginTop: "3px",
    color: "#7c896f",
    fontSize: "11px",
    fontWeight: "600",
  },

  requiredBadge: {
    padding: "5px 8px",
    borderRadius: "999px",
    background: "#d5e9ae",
    color: "#617742",
    fontSize: "10px",
    fontWeight: "950",
  },

  extraRoomTitle: {
    margin: "14px 0 9px",
    color: "#7e857a",
    fontSize: "12px",
  },

  roomGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "8px",
  },

  roomButton: {
    minHeight: "56px",
    padding: "10px 8px",
    borderRadius: "15px",
    border: "1px solid #e0e3d8",
    background: "#ffffff",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    alignItems: "center",
    justifyContent: "center",
    color: "#4c5549",
    fontSize: "12px",
    fontWeight: "850",
    cursor: "pointer",
  },

  roomButtonSelected: {
    border: "1px solid #9fbe78",
    background: "#eef7e4",
    color: "#506a36",
  },

  joinNotice: {
    marginTop: "17px",
    padding: "12px 13px",
    borderRadius: "14px",
    background: "#f6f4e9",
    color: "#77796c",
    fontSize: "12px",
    lineHeight: "1.6",
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

  messageBox: {
    marginBottom: "12px",
    padding: "12px 14px",
    borderRadius: "14px",
    background: "#edf6df",
    color: "#607848",
    fontSize: "13px",
    fontWeight: "800",
  },

  successCard: {
    marginTop: "70px",
    padding: "35px 24px",
    borderRadius: "28px",
    background: "#ffffff",
    textAlign: "center",
    border: "1px solid #ebe9df",
    boxShadow:
      "0 18px 50px rgba(66, 73, 54, 0.08)",
  },

  successIcon: {
    fontSize: "48px",
    marginBottom: "13px",
  },

  successTitle: {
    margin: 0,
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
    lineHeight: "1.7",
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
