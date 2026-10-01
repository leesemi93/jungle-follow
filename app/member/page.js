"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat(
    (4 - (base64String.length % 4)) % 4
  );

  const base64 = (
    base64String +
    padding
  )
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((char) =>
      char.charCodeAt(0)
    )
  );
}

export default function MemberPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState(null);

  const [notificationLoading, setNotificationLoading] =
    useState(false);

  const [notificationEnabled, setNotificationEnabled] =
    useState(false);

  const [notificationMessage, setNotificationMessage] =
    useState("");

  const [notificationError, setNotificationError] =
    useState("");

  const [showInstallGuide, setShowInstallGuide] =
    useState(false);

  useEffect(() => {
    loadMember();
  }, []);

  async function loadMember() {
    setLoading(true);

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

    const currentMember = Array.isArray(data)
      ? data[0]
      : data;

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

    setMember(currentMember);

    await checkNotificationStatus(token);

    setLoading(false);
  }

  async function checkNotificationStatus(token) {
    try {
      if (
        typeof window === "undefined" ||
        !("Notification" in window)
      ) {
        return;
      }

      if (
        Notification.permission !== "granted"
      ) {
        return;
      }

      if (!("serviceWorker" in navigator)) {
        return;
      }

      const registration =
        await navigator.serviceWorker.getRegistration(
          "/"
        );

      if (!registration) {
        return;
      }

      const subscription =
        await registration.pushManager.getSubscription();

      if (subscription) {
        setNotificationEnabled(true);
        return;
      }

      const { data, error } =
        await supabase.rpc(
          "get_my_push_status",
          {
            p_session_token: token,
          }
        );

      if (!error) {
        const count = Number(
          Array.isArray(data)
            ? data[0]?.subscription_count || 0
            : data?.subscription_count || 0
        );

        if (count > 0) {
          setNotificationEnabled(true);
        }
      }
    } catch (error) {
      console.error(
        "알림 상태 확인 오류:",
        error
      );
    }
  }

  async function enableNotifications() {
    setNotificationLoading(true);
    setNotificationMessage("");
    setNotificationError("");

    try {
      if (
        typeof window === "undefined"
      ) {
        return;
      }

      if (!("Notification" in window)) {
        throw new Error(
          "현재 브라우저에서는 휴대폰 알림을 지원하지 않아요."
        );
      }

      if (!("serviceWorker" in navigator)) {
        throw new Error(
          "현재 브라우저에서는 알림 기능을 사용할 수 없어요."
        );
      }

      const vapidPublicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        throw new Error(
          "알림 설정값이 아직 연결되지 않았어요. 관리자에게 문의해주세요."
        );
      }

      /*
       * iPhone은 홈 화면에 설치된 웹앱에서
       * Web Push를 사용하는 것이 중요합니다.
       */
      const isStandalone =
        window.matchMedia(
          "(display-mode: standalone)"
        ).matches ||
        window.navigator.standalone === true;

      const isIOS =
        /iPad|iPhone|iPod/.test(
          window.navigator.userAgent
        ) ||
        (
          navigator.platform ===
            "MacIntel" &&
          navigator.maxTouchPoints > 1
        );

      if (isIOS && !isStandalone) {
        setShowInstallGuide(true);

        setNotificationMessage(
          "아이폰은 먼저 정글맞팔웹을 홈 화면에 추가한 후 알림을 설정해주세요 📱"
        );

        setNotificationLoading(false);
        return;
      }

      let permission =
        Notification.permission;

      if (permission === "default") {
        permission =
          await Notification.requestPermission();
      }

      if (permission !== "granted") {
        throw new Error(
          "휴대폰 알림 권한이 허용되지 않았어요. 브라우저 설정에서 알림을 허용해주세요."
        );
      }

      const registration =
        await navigator.serviceWorker.register(
          "/sw.js",
          {
            scope: "/",
          }
        );

      await navigator.serviceWorker.ready;

      let subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription =
          await registration.pushManager.subscribe(
            {
              userVisibleOnly: true,
              applicationServerKey:
                urlBase64ToUint8Array(
                  vapidPublicKey
                ),
            }
          );
      }

      const subscriptionJson =
        subscription.toJSON();

      const endpoint =
        subscriptionJson.endpoint;

      const p256dh =
        subscriptionJson.keys?.p256dh;

      const auth =
        subscriptionJson.keys?.auth;

      if (
        !endpoint ||
        !p256dh ||
        !auth
      ) {
        throw new Error(
          "푸시 구독 정보를 가져오지 못했어요."
        );
      }

      const token = localStorage.getItem(
        "jungle_follow_session"
      );

      if (!token) {
        router.replace("/");
        return;
      }

      const { error } =
        await supabase.rpc(
          "save_push_subscription",
          {
            p_session_token: token,
            p_endpoint: endpoint,
            p_p256dh: p256dh,
            p_auth: auth,
            p_user_agent:
              navigator.userAgent,
          }
        );

      if (error) {
        throw error;
      }

      setNotificationEnabled(true);

      setNotificationMessage(
        "🔔 휴대폰 알림 설정이 완료됐어요!"
      );
    } catch (error) {
      console.error(
        "푸시 알림 설정 오류:",
        error
      );

      setNotificationError(
        error?.message ||
          "알림 설정 중 문제가 발생했어요."
      );
    } finally {
      setNotificationLoading(false);
    }
  }

  async function handleLogout() {
    const token = localStorage.getItem(
      "jungle_follow_session"
    );

    if (token) {
      try {
        await supabase.rpc(
          "logout_member",
          {
            p_session_token: token,
          }
        );
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

    localStorage.removeItem(
      "jungle_follow_admin"
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

  const hasAdminAccess =
    isSuperAdmin || isAdmin;

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

        {/* HEADER */}

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


        {/* PROFILE */}

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

                {!hasAdminAccess && (
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


        {/* MONTHLY FOLLOW */}

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
              router.push(
                "/member/follow"
              )
            }
          >
            맞팔데이 참여하기
          </button>

        </div>


        {/* PHONE / NOTIFICATION */}

        <div style={styles.phoneCard}>

          <div style={styles.phoneTop}>

            <div>
              <div style={styles.phoneSmallLabel}>
                MOBILE
              </div>

              <h2 style={styles.phoneTitle}>
                정글맞팔웹 설정 📱
              </h2>
            </div>

            <div style={styles.phoneCircle}>
              📱
            </div>

          </div>

          <p style={styles.phoneDescription}>
            웹앱을 휴대폰 홈 화면에 추가하고
            <br />
            정글맞팔 알림을 받아보세요 🔔
          </p>


          {/* HOME SCREEN GUIDE */}

          <button
            type="button"
            style={styles.guideButton}
            onClick={() =>
              setShowInstallGuide(
                !showInstallGuide
              )
            }
          >
            📱 홈 화면에 추가하는 방법
            <span>
              {showInstallGuide
                ? "▲"
                : "▼"}
            </span>
          </button>


          {showInstallGuide && (
            <div style={styles.installGuide}>

              <div style={styles.installTitle}>
                🍎 아이폰
              </div>

              <div style={styles.installText}>
                Safari에서 정글맞팔웹 접속
                <br />
                → 하단 <b>공유 버튼</b>
                <br />
                → <b>홈 화면에 추가</b>
                <br />
                → 추가 후 홈 화면의
                정글맞팔웹으로 접속해주세요.
              </div>

              <div style={styles.installDivider} />

              <div style={styles.installTitle}>
                🤖 갤럭시
              </div>

              <div style={styles.installText}>
                Chrome에서 정글맞팔웹 접속
                <br />
                → 오른쪽 위 <b>⋮</b>
                <br />
                → <b>홈 화면에 추가</b>
                또는 <b>앱 설치</b>
                <br />
                → 홈 화면에서 정글맞팔웹 실행
              </div>

            </div>
          )}


          {/* NOTIFICATION */}

          <div style={styles.notificationBox}>

            <div style={styles.notificationIcon}>
              🔔
            </div>

            <div style={styles.notificationInfo}>

              <strong>
                휴대폰 알림
              </strong>

              <span>
                {notificationEnabled
                  ? "알림 설정 완료"
                  : "맞팔데이와 중요한 소식을 알려드려요."}
              </span>

            </div>

          </div>


          {notificationEnabled ? (
            <div
              style={
                styles.notificationComplete
              }
            >
              🔔 알림 설정 완료
            </div>
          ) : (
            <button
              type="button"
              style={styles.notificationButton}
              onClick={
                enableNotifications
              }
              disabled={
                notificationLoading
              }
            >
              {notificationLoading
                ? "알림 설정 중..."
                : "🔔 알림 받기"}
            </button>
          )}


          {notificationMessage && (
            <div
              style={
                styles.notificationSuccess
              }
            >
              {notificationMessage}
            </div>
          )}

          {notificationError && (
            <div
              style={
                styles.notificationError
              }
            >
              {notificationError}
            </div>
          )}

        </div>


        {/* ADMIN */}

        {hasAdminAccess && (
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
                  관리자 메뉴
                </h2>

              </div>

              <div style={styles.crownCircle}>
                👑
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


        {/* NOTICE */}

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


        {/* LOGOUT */}

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
    justifyContent: "space-between",
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


  /* MOBILE */

  phoneCard: {
    padding: "21px 20px",
    borderRadius: "25px",
    background:
      "linear-gradient(135deg, #f7fbea 0%, #eef5df 100%)",
    border: "1px solid #dce8c7",
    boxShadow:
      "0 12px 35px rgba(86,110,60,0.08)",
    marginBottom: "14px",
  },

  phoneTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
  },

  phoneSmallLabel: {
    color: "#7f9958",
    fontSize: "10px",
    fontWeight: "950",
    letterSpacing: "1.4px",
    marginBottom: "5px",
  },

  phoneTitle: {
    margin: 0,
    fontSize: "19px",
    fontWeight: "950",
    color: "#455b35",
  },

  phoneCircle: {
    width: "44px",
    height: "44px",
    flexShrink: 0,
    borderRadius: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ffffff",
    fontSize: "20px",
    boxShadow:
      "0 5px 15px rgba(76,94,56,0.08)",
  },

  phoneDescription: {
    margin: "12px 0 15px",
    color: "#748069",
    fontSize: "11px",
    lineHeight: "1.65",
  },

  guideButton: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 13px",
    border: "1px solid #d8e4c4",
    borderRadius: "13px",
    background: "#ffffff",
    color: "#60744e",
    fontSize: "11px",
    fontWeight: "900",
    cursor: "pointer",
  },

  installGuide: {
    marginTop: "9px",
    padding: "15px",
    borderRadius: "15px",
    background: "rgba(255,255,255,0.75)",
    border: "1px solid #e0e9d1",
  },

  installTitle: {
    color: "#536941",
    fontSize: "12px",
    fontWeight: "950",
    marginBottom: "7px",
  },

  installText: {
    color: "#747d6e",
    fontSize: "10px",
    lineHeight: "1.8",
  },

  installDivider: {
    height: "1px",
    background: "#e0e7d5",
    margin: "13px 0",
  },

  notificationBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "12px",
    padding: "13px",
    borderRadius: "14px",
    background: "#ffffff",
  },

  notificationIcon: {
    width: "36px",
    height: "36px",
    flexShrink: 0,
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#eef5df",
    fontSize: "18px",
  },

  notificationInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },

  notificationInfoStrong: {
    fontSize: "12px",
    fontWeight: "950",
  },

  notificationInfoSpan: {
    fontSize: "9px",
    color: "#7d8578",
  },

  notificationButton: {
    width: "100%",
    marginTop: "9px",
    padding: "14px",
    border: "none",
    borderRadius: "14px",
    background: "#a9d95d",
    color: "#2d3b24",
    fontSize: "12px",
    fontWeight: "950",
    cursor: "pointer",
  },

  notificationComplete: {
    width: "100%",
    marginTop: "9px",
    padding: "13px",
    borderRadius: "14px",
    background: "#e4f2d1",
    color: "#59743e",
    textAlign: "center",
    fontSize: "11px",
    fontWeight: "950",
  },

  notificationSuccess: {
    marginTop: "9px",
    padding: "10px",
    borderRadius: "12px",
    background: "#e5f2d4",
    color: "#5c7444",
    fontSize: "10px",
    lineHeight: "1.5",
  },

  notificationError: {
    marginTop: "9px",
    padding: "10px",
    borderRadius: "12px",
    background: "#fff0ed",
    color: "#a05047",
    fontSize: "10px",
    lineHeight: "1.5",
  },


  /* ADMIN */

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
    justifyContent: "space-between",
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
    border: "1px solid #d6c2e8",
    borderRadius: "15px",
    background: "#ffffff",
    color: "#66477e",
    fontSize: "13px",
    fontWeight: "950",
    cursor: "pointer",
  },


  /* NOTICE */

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


  /* LOADING */

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
