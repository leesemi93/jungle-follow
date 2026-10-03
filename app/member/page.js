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
    base64String + padding
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
  const [followEvent, setFollowEvent] = useState(null);

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

  const [showPlatformManager, setShowPlatformManager] =
    useState(false);
  const [platformLinks, setPlatformLinks] = useState({
    blog: "",
    naver_clip: "",
    youtube: "",
    tiktok: "",
    today_house: "",
  });
  const [platformSaving, setPlatformSaving] = useState("");
  const [platformMessage, setPlatformMessage] = useState("");

  const [showLeftMembers, setShowLeftMembers] = useState(false);
  const [leftMembers, setLeftMembers] = useState([]);
  const [leftMembersLoading, setLeftMembersLoading] = useState(false);
  const [leftMembersError, setLeftMembersError] = useState("");

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

    const { data, error } =
      await supabase.rpc(
        "get_current_member",
        {
          p_session_token: token,
        }
      );

    const currentMember =
      Array.isArray(data)
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

    await Promise.all([
      checkNotificationStatus(token),
      loadMyPlatforms(token),
      loadFollowEvent(token),
    ]);

    setLoading(false);
  }

  async function loadFollowEvent(token) {
    const { data, error } = await supabase.rpc(
      "get_current_follow_event",
      { p_session_token: token }
    );

    if (error) {
      console.error("맞팔데이 상태 조회 오류:", error);
      return;
    }

    const currentEvent = Array.isArray(data) ? data[0] : data;
    setFollowEvent(currentEvent || null);
  }

  async function loadMyPlatforms(token) {
    const { data, error } = await supabase.rpc(
      "get_my_follow_platforms",
      { p_session_token: token }
    );

    if (error) {
      console.error("플랫폼 조회 오류:", error);
      return;
    }

    const next = {
      blog: "",
      naver_clip: "",
      youtube: "",
      tiktok: "",
      today_house: "",
    };

    (Array.isArray(data) ? data : []).forEach((item) => {
      if (Object.prototype.hasOwnProperty.call(next, item.platform)) {
        next[item.platform] = item.account_value || "";
      }
    });

    setPlatformLinks(next);
  }

  async function loadLeftMembers() {
    const token = localStorage.getItem("jungle_follow_session");
    if (!token) return;

    setLeftMembersLoading(true);
    setLeftMembersError("");

    const { data, error } = await supabase.rpc(
      "get_member_left_members",
      { p_session_token: token }
    );

    if (error) {
      setLeftMembersError("퇴장자 리스트를 불러오지 못했어요.");
      setLeftMembersLoading(false);
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    const sorted = [...rows].sort((x, y) => {
      const xDate = x.left_at ? new Date(x.left_at).getTime() : 0;
      const yDate = y.left_at ? new Date(y.left_at).getTime() : 0;
      if (yDate !== xDate) return yDate - xDate;
      return (x.kakao_nickname || "").localeCompare(
        y.kakao_nickname || "",
        "ko-KR"
      );
    });

    setLeftMembers(sorted);
    setLeftMembersLoading(false);
  }

  async function toggleLeftMembers() {
    const next = !showLeftMembers;
    setShowLeftMembers(next);

    if (next && leftMembers.length === 0) {
      await loadLeftMembers();
    }
  }

  async function copyLeftMembers() {
    if (leftMembers.length === 0) return;

    const text = leftMembers
      .map((item) => {
        const nickname = item.kakao_nickname || "";
        const instagram = String(item.instagram_id || "").replace(/^@/, "");
        return `${nickname} | @${instagram}`;
      })
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      window.alert(`퇴장자 ${leftMembers.length}명 목록을 복사했어요. 💚`);
    } catch (error) {
      window.alert("복사에 실패했어요. 브라우저의 클립보드 권한을 확인해주세요.");
    }
  }

  async function saveMyPlatform(platform) {
    const token = localStorage.getItem("jungle_follow_session");
    if (!token) return;

    setPlatformSaving(platform);
    setPlatformMessage("");

    const { error } = await supabase.rpc(
      "member_set_my_platform_link",
      {
        p_session_token: token,
        p_platform: platform,
        p_account_value: platformLinks[platform] || "",
      }
    );

    if (error) {
      setPlatformMessage(error.message);
    } else {
      setPlatformMessage("저장되었습니다 💚");
      await loadMyPlatforms(token);
    }

    setPlatformSaving("");
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

  const isSuperAdmin =
    member?.admin_role ===
    "super_admin";

  const isAdmin =
    member?.admin_role === "admin";

  const hasAdminAccess =
    isSuperAdmin || isAdmin;

  function goAdmin() {
    if (!hasAdminAccess) return;

    router.push("/admin/dashboard");
  }

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

        {/* 관리자 모드 */}

        {hasAdminAccess && (
          <button
            type="button"
            onClick={goAdmin}
            style={styles.adminQuickButton}
          >
            👑 관리자 모드
          </button>
        )}

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


        {/* MOBILE / NOTIFICATION */}

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


          {/* 홈 화면 추가 방법 */}

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


          {/* 휴대폰 알림 */}

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
              style={
                styles.notificationButton
              }
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
            {followEvent?.late_completion_open && !followEvent?.is_open
              ? "⏰ 지각 완료하기"
              : "맞팔데이 참여하기"}
          </button>

        </div>


        {/* MY PLATFORM MANAGER */}

        <div style={styles.platformManagerCard}>
          <button
            type="button"
            onClick={() => setShowPlatformManager(!showPlatformManager)}
            style={styles.platformManagerToggle}
          >
            <span>🌿 내 플랫폼 관리</span>
            <span>{showPlatformManager ? "▲" : "▼"}</span>
          </button>

          {showPlatformManager && (
            <div style={styles.platformManagerBody}>
              {[
                ["blog", "📝", "블로그"],
                ["naver_clip", "🎬", "네이버 클립"],
                ["youtube", "▶️", "유튜브"],
                ["tiktok", "🎵", "틱톡"],
                ["today_house", "🏠", "오늘의집"],
              ].map(([key, icon, label]) => (
                <div key={key} style={styles.platformEditRow}>
                  <div style={styles.platformEditTitle}>
                    <span>{icon} {label}</span>
                    <span style={platformLinks[key] ? styles.registeredBadge : styles.emptyBadge}>
                      {platformLinks[key] ? "✓ 등록됨" : "+ 추가"}
                    </span>
                  </div>
                  <div style={styles.platformInputRow}>
                    <input
                      value={platformLinks[key]}
                      onChange={(e) =>
                        setPlatformLinks((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      placeholder="링크를 입력해주세요"
                      style={styles.platformInput}
                      disabled={Boolean(platformLinks[key])}
                    />
                    <button
                      type="button"
                      onClick={() => saveMyPlatform(key)}
                      disabled={
                        platformSaving === key ||
                        Boolean(platformLinks[key])
                      }
                      style={{
                        ...styles.platformSaveButton,
                        ...(platformLinks[key]
                          ? {
                              background: "#eef0ea",
                              color: "#92978e",
                              cursor: "default",
                            }
                          : {}),
                      }}
                    >
                      {platformLinks[key]
                        ? "등록완료"
                        : platformSaving === key
                          ? "저장중"
                          : "등록"}
                    </button>
                  </div>
                </div>
              ))}

              <div style={styles.platformHelp}>
                최초 등록만 가능해요. 등록 후 변경은 관리자에게 요청해주세요.
              </div>

              {platformMessage && (
                <div style={styles.platformMessage}>{platformMessage}</div>
              )}
            </div>
          )}
        </div>


        {/* LEFT MEMBERS */}

        <div style={styles.leftMembersCard}>
          <button
            type="button"
            onClick={toggleLeftMembers}
            style={styles.leftMembersToggle}
          >
            <span>🚪 퇴장자 리스트</span>
            <span>{showLeftMembers ? "▲" : "▼"}</span>
          </button>

          {showLeftMembers && (
            <div style={styles.leftMembersBody}>
              {!leftMembersLoading && !leftMembersError && leftMembers.length > 0 && (
                <button
                  type="button"
                  onClick={copyLeftMembers}
                  style={{
                    width: "100%",
                    marginBottom: "8px",
                    padding: "9px 12px",
                    border: "1px solid #dce7cf",
                    borderRadius: "10px",
                    background: "#f4f8ee",
                    color: "#536642",
                    fontSize: "11px",
                    fontWeight: "900",
                    cursor: "pointer",
                  }}
                >
                  📋 퇴장자 전체 복사
                </button>
              )}
              {leftMembersLoading ? (
                <div style={styles.leftMembersEmpty}>불러오는 중...</div>
              ) : leftMembersError ? (
                <div style={styles.leftMembersError}>{leftMembersError}</div>
              ) : leftMembers.length === 0 ? (
                <div style={styles.leftMembersEmpty}>퇴장자가 없어요.</div>
              ) : (
                leftMembers.map((item, index) => (
                  <div
                    key={item.member_id || item.id || index}
                    style={styles.leftMemberRow}
                  >
                    <strong style={styles.leftMemberName}>
                      {item.kakao_nickname}
                    </strong>
                    <div style={styles.leftMemberInfo}>
                      <span style={styles.leftMemberInstagram}>
                        @{String(item.instagram_id || "").replace(/^@/, "")}
                      </span>
                      {item.leave_reason && (
                        <span style={styles.leftMemberReason}>
                          퇴장사유 · {item.leave_reason}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>


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
    position: "relative",
  },

  /* 관리자 모드 - 오른쪽 위 모서리 */

  adminQuickButton: {
    position: "fixed",
    top: "10px",
    right: "10px",
    width: "auto",
    minWidth: "0",
    maxWidth: "calc(100vw - 20px)",
    margin: "0",
    padding: "6px 9px",
    border: "1px solid #e2d5ee",
    borderRadius: "999px",
    background:
      "rgba(255,255,255,0.94)",
    color: "#76558f",
    fontSize: "9px",
    lineHeight: "1",
    fontWeight: "900",
    boxShadow:
      "0 3px 10px rgba(90,70,110,0.08)",
    cursor: "pointer",
    zIndex: 9999,
    whiteSpace: "nowrap",
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
    background:
      "rgba(255,255,255,0.75)",
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

  leftMembersCard: {
    marginTop: "10px",
    marginBottom: "14px",
    borderRadius: "20px",
    background: "#ffffff",
    border: "1px solid #e6e7df",
    overflow: "hidden",
    boxShadow: "0 6px 18px rgba(67, 86, 52, 0.05)",
  },

  leftMembersToggle: {
    width: "100%",
    padding: "15px 17px",
    border: "none",
    background: "#ffffff",
    color: "#43583a",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "12px",
    fontWeight: "900",
    cursor: "pointer",
  },

  leftMembersBody: {
    padding: "0 14px 14px",
  },

  leftMemberRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    padding: "11px 3px",
    borderTop: "1px solid #edf0e8",
  },

  leftMemberName: {
    color: "#3f4f39",
    fontSize: "11px",
    fontWeight: "900",
  },

  leftMemberInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "3px",
    minWidth: 0,
  },

  leftMemberInstagram: {
    color: "#858d80",
    fontSize: "10px",
  },

  leftMemberReason: {
    color: "#a16d66",
    fontSize: "9px",
    textAlign: "right",
    wordBreak: "keep-all",
  },

  leftMembersEmpty: {
    padding: "15px 4px 5px",
    borderTop: "1px solid #edf0e8",
    color: "#8a9085",
    fontSize: "10px",
    textAlign: "center",
  },

  leftMembersError: {
    padding: "12px",
    borderTop: "1px solid #edf0e8",
    color: "#a05047",
    fontSize: "10px",
    textAlign: "center",
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

  platformManagerCard: {
    marginTop: "10px",
    marginBottom: "16px",
    borderRadius: "20px",
    background: "#ffffff",
    border: "1px solid #e6e7df",
    overflow: "hidden",
    boxShadow: "0 6px 18px rgba(67, 86, 52, 0.05)",
  },
  platformManagerToggle: {
    width: "100%",
    padding: "15px 17px",
    border: "none",
    background: "#ffffff",
    color: "#43583a",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "12px",
    fontWeight: "900",
    cursor: "pointer",
  },
  platformManagerBody: {
    padding: "0 14px 14px",
  },
  platformEditRow: {
    padding: "12px 0",
    borderTop: "1px solid #edf0e8",
  },
  platformEditTitle: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
    color: "#3f4f39",
    fontSize: "10px",
    fontWeight: "850",
  },
  registeredBadge: {
    padding: "4px 7px",
    borderRadius: "999px",
    background: "#edf6df",
    color: "#607b45",
    fontSize: "8px",
    fontWeight: "900",
  },
  emptyBadge: {
    padding: "4px 7px",
    borderRadius: "999px",
    background: "#f4f4f0",
    color: "#8b8f86",
    fontSize: "8px",
    fontWeight: "900",
  },
  platformInputRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 54px",
    gap: "7px",
  },
  platformInput: {
    minWidth: 0,
    padding: "10px 11px",
    borderRadius: "11px",
    border: "1px solid #dde5d4",
    background: "#fafbf8",
    color: "#3d4938",
    fontSize: "10px",
    outline: "none",
  },
  platformSaveButton: {
    border: "none",
    borderRadius: "11px",
    background: "#a9d95d",
    color: "#314426",
    fontSize: "9px",
    fontWeight: "900",
    cursor: "pointer",
  },
  platformHelp: {
    marginTop: "7px",
    color: "#8a9085",
    fontSize: "8px",
    lineHeight: "1.5",
  },
  platformMessage: {
    marginTop: "9px",
    padding: "9px",
    borderRadius: "10px",
    background: "#edf6df",
    color: "#59733e",
    fontSize: "9px",
    fontWeight: "850",
    textAlign: "center",
  },
};
