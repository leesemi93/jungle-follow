"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PLATFORMS = [
  {
    value: "instagram",
    label: "인스타그램",
  },
  {
    value: "blog",
    label: "블로그",
  },
  {
    value: "naver_clip",
    label: "네이버 클립",
  },
  {
    value: "youtube",
    label: "유튜브",
  },
  {
    value: "tiktok",
    label: "틱톡",
  },
  {
    value: "today_house",
    label: "오늘의집",
  },
];

export default function AdminDashboard() {
  const router = useRouter();

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joinRequestCount, setJoinRequestCount] = useState(0);

  const [events, setEvents] = useState([]);
  const [targetType, setTargetType] =
    useState("all");
  const [eventId, setEventId] =
    useState("");
  const [platform, setPlatform] =
    useState("instagram");

  const [notVotedCount, setNotVotedCount] =
    useState(null);
  const [countLoading, setCountLoading] =
    useState(false);

  const [pushTitle, setPushTitle] =
    useState("정글맞팔웹 🐯");
  const [pushMessage, setPushMessage] =
    useState("");

  const [pushLoading, setPushLoading] =
    useState(false);
  const [pushResult, setPushResult] =
    useState("");

  const [history, setHistory] =
    useState([]);
  const [historyLoading, setHistoryLoading] =
    useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const token =
      localStorage.getItem(
        "jungle_follow_session"
      );

    if (!token) {
      router.replace("/");
      return;
    }

    const {
      data,
      error,
    } = await supabase.rpc(
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

    if (
      currentMember.admin_role !==
        "admin" &&
      currentMember.admin_role !==
        "super_admin"
    ) {
      router.replace("/member");
      return;
    }

    setMember(currentMember);

    await loadEvents(token);
    await loadHistory(token);
    await loadJoinRequestCount(token);

    setLoading(false);
  }

  async function loadJoinRequestCount(token) {
    const { data, error } = await supabase.rpc(
      "admin_get_join_requests",
      {
        p_session_token: token,
      }
    );

    if (error) {
      console.error("가입대기 건수 조회 오류:", error);
      setJoinRequestCount(0);
      return;
    }

    const pendingCount = (Array.isArray(data) ? data : []).filter(
      (item) => item.status === "pending"
    ).length;

    setJoinRequestCount(pendingCount);
  }

  async function loadEvents(token) {
    const {
      data,
      error,
    } = await supabase.rpc(
      "admin_get_follow_events",
      {
        p_session_token: token,
      }
    );

    if (error) {
      console.error(
        "맞팔데이 불러오기 오류:",
        error
      );
      return;
    }

    const list =
      Array.isArray(data)
        ? data
        : [];

    setEvents(list);

    if (list.length > 0) {
      setEventId(list[0].id);
    }
  }

  async function loadHistory(token) {
    setHistoryLoading(true);

    try {
      const {
        data,
        error,
      } = await supabase.rpc(
        "admin_get_push_history",
        {
          p_session_token:
            token,
        }
      );

      if (error) {
        console.error(
          "알림 내역 조회 오류:",
          error
        );

        setHistory([]);
        return;
      }

      setHistory(
        Array.isArray(data)
          ? data
          : []
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadNotVotedCount() {
    if (
      targetType !==
        "not_voted" ||
      !eventId ||
      !platform
    ) {
      setNotVotedCount(null);
      return;
    }

    const token =
      localStorage.getItem(
        "jungle_follow_session"
      );

    if (!token) return;

    setCountLoading(true);

    try {
      const {
        data,
        error,
      } = await supabase.rpc(
        "admin_get_platform_vote_counts",
        {
          p_session_token:
            token,
          p_event_id:
            eventId,
          p_platform:
            platform,
        }
      );

      if (error) {
        console.error(
          "미참여자 수 조회 오류:",
          error
        );

        setNotVotedCount(null);
        return;
      }

      const row =
        Array.isArray(data)
          ? data[0]
          : data;

      setNotVotedCount(
        Number(
          row?.not_voted_count || 0
        )
      );
    } finally {
      setCountLoading(false);
    }
  }

  useEffect(() => {
    loadNotVotedCount();
  }, [
    targetType,
    eventId,
    platform,
  ]);

  async function sendPushNotification() {
    const title =
      pushTitle.trim();

    const message =
      pushMessage.trim();

    if (!title || !message) {
      setPushResult(
        "알림 제목과 내용을 입력해주세요."
      );
      return;
    }

    if (
      targetType ===
        "not_voted" &&
      (!eventId || !platform)
    ) {
      setPushResult(
        "맞팔데이와 플랫폼을 선택해주세요."
      );
      return;
    }

    const token =
      localStorage.getItem(
        "jungle_follow_session"
      );

    if (!token) {
      router.replace("/");
      return;
    }

    setPushLoading(true);
    setPushResult("");

    try {
      const response =
        await fetch(
          "/api/admin/send-push",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              sessionToken:
                token,

              title,

              message,

              targetType,

              eventId:
                targetType ===
                "not_voted"
                  ? eventId
                  : null,

              platform:
                targetType ===
                "not_voted"
                  ? platform
                  : null,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "알림 발송에 실패했습니다."
        );
      }

      setPushResult(
        `발송 완료 💚 성공 ${result.sent}명 · 실패 ${result.failed}명`
      );

      setPushMessage("");

      await loadHistory(token);
    } catch (error) {
      console.error(error);

      setPushResult(
        error?.message ||
          "알림 발송 중 문제가 발생했어요."
      );
    } finally {
      setPushLoading(false);
    }
  }

  async function logout() {
    const token =
      localStorage.getItem(
        "jungle_follow_session"
      );

    if (token) {
      try {
        await supabase.rpc(
          "logout_member",
          {
            p_session_token:
              token,
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

  function platformLabel(value) {
    const item =
      PLATFORMS.find(
        (item) =>
          item.value === value
      );

    return item?.label || value;
  }

  function formatDate(value) {
    if (!value) return "";

    return new Date(
      value
    ).toLocaleString(
      "ko-KR",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
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

        {/* 관리자 상단 */}

        <div className="dashboardTop">
          <div>
            <span className="dashboardBadge">
              ADMIN
            </span>

            <h1 className="dashboardTitle">
              관리자 메뉴 🐯
            </h1>

            <p className="dashboardHello">
              {member?.kakao_nickname ||
                "관리자"}
              님, 안녕하세요 💚
            </p>
          </div>

          <button
            type="button"
            className="logoutButton"
            onClick={() =>
              router.push("/member")
            }
          >
            회원 홈
          </button>
        </div>


        {/* 기존 관리자 메뉴 */}

        <div className="dashboardMenu">

          <a
            href="/admin/members"
            className="dashboardMenuCard"
          >
            <span className="menuIcon">
              👥
            </span>

            <div>
              <strong
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                }}
              >
                회원 관리

                {joinRequestCount > 0 && (
                  <span
                    style={{
                      minWidth: "20px",
                      height: "20px",
                      padding: "0 6px",
                      borderRadius: "999px",
                      background: "#e85d5d",
                      color: "#fff",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      fontWeight: "950",
                      lineHeight: 1,
                    }}
                  >
                    {joinRequestCount > 99
                      ? "99+"
                      : joinRequestCount}
                  </span>
                )}
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

        </div>


        {/* 휴대폰 알림 */}

        <section
          style={{
            marginTop: "20px",
            padding: "22px 20px",
            borderRadius: "24px",
            background:
              "linear-gradient(135deg, #f7fbea 0%, #eef5df 100%)",
            border:
              "1px solid #dce8c7",
          }}
        >

          <div
            style={{
              color: "#7f9958",
              fontSize: "10px",
              fontWeight: "950",
              letterSpacing: "1.4px",
            }}
          >
            PUSH NOTIFICATION
          </div>

          <h2
            style={{
              margin:
                "5px 0",
              fontSize:
                "20px",
              fontWeight:
                "950",
              color:
                "#455b35",
            }}
          >
            회원 휴대폰 알림 보내기 🔔
          </h2>

          <p
            style={{
              margin:
                "9px 0 17px",
              color:
                "#748069",
              fontSize:
                "11px",
              lineHeight:
                "1.6",
            }}
          >
            알림 설정을 완료한 회원에게
            휴대폰 알림을 보낼 수 있어요.
          </p>


          {/* 알림 대상 */}

          <div
            style={{
              marginBottom:
                "15px",
            }}
          >

            <div
              style={{
                marginBottom:
                  "7px",
                color:
                  "#536941",
                fontSize:
                  "11px",
                fontWeight:
                  "900",
              }}
            >
              알림 대상
            </div>

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap:
                  "8px",
              }}
            >

              <button
                type="button"
                onClick={() => {
                  setTargetType(
                    "all"
                  );
                  setNotVotedCount(
                    null
                  );
                }}
                style={{
                  padding:
                    "12px 8px",
                  borderRadius:
                    "13px",
                  border:
                    targetType ===
                    "all"
                      ? "2px solid #9bc957"
                      : "1px solid #d8e4c4",
                  background:
                    targetType ===
                    "all"
                      ? "#eaf5dc"
                      : "#ffffff",
                  color:
                    "#536941",
                  fontSize:
                    "11px",
                  fontWeight:
                    "950",
                  cursor:
                    "pointer",
                }}
              >
                👥 전체 회원
              </button>


              <button
                type="button"
                onClick={() =>
                  setTargetType(
                    "not_voted"
                  )
                }
                style={{
                  padding:
                    "12px 8px",
                  borderRadius:
                    "13px",
                  border:
                    targetType ===
                    "not_voted"
                      ? "2px solid #9bc957"
                      : "1px solid #d8e4c4",
                  background:
                    targetType ===
                    "not_voted"
                      ? "#eaf5dc"
                      : "#ffffff",
                  color:
                    "#536941",
                  fontSize:
                    "11px",
                  fontWeight:
                    "950",
                  cursor:
                    "pointer",
                }}
              >
                ⚠️ 미참여자만
              </button>

            </div>
          </div>


          {/* 미참여자 설정 */}

          {targetType ===
            "not_voted" && (
            <div
              style={{
                padding:
                  "14px",
                marginBottom:
                  "15px",
                borderRadius:
                  "15px",
                background:
                  "rgba(255,255,255,0.8)",
                border:
                  "1px solid #dce8c7",
              }}
            >

              <div
                style={{
                  color:
                    "#536941",
                  fontSize:
                    "11px",
                  fontWeight:
                    "950",
                  marginBottom:
                    "10px",
                }}
              >
                어떤 미참여자에게
                보낼까요?
              </div>


              <label
                style={{
                  display:
                    "block",
                  marginBottom:
                    "6px",
                  color:
                    "#748069",
                  fontSize:
                    "10px",
                  fontWeight:
                    "800",
                }}
              >
                맞팔데이
              </label>

              <select
                value={eventId}
                onChange={(e) =>
                  setEventId(
                    e.target.value
                  )
                }
                style={{
                  width:
                    "100%",
                  boxSizing:
                    "border-box",
                  padding:
                    "12px",
                  borderRadius:
                    "12px",
                  border:
                    "1px solid #d8e4c4",
                  background:
                    "#ffffff",
                  color:
                    "#455b35",
                  fontSize:
                    "12px",
                  marginBottom:
                    "11px",
                }}
              >

                {events.length ===
                0 ? (
                  <option value="">
                    맞팔데이가 없습니다
                  </option>
                ) : (
                  events.map(
                    (event) => (
                      <option
                        key={
                          event.id
                        }
                        value={
                          event.id
                        }
                      >
                        {event.year}년{" "}
                        {event.month}월{" "}
                        {event.title}
                      </option>
                    )
                  )
                )}

              </select>


              <label
                style={{
                  display:
                    "block",
                  marginBottom:
                    "6px",
                  color:
                    "#748069",
                  fontSize:
                    "10px",
                  fontWeight:
                    "800",
                }}
              >
                플랫폼
              </label>

              <select
                value={platform}
                onChange={(e) =>
                  setPlatform(
                    e.target.value
                  )
                }
                style={{
                  width:
                    "100%",
                  boxSizing:
                    "border-box",
                  padding:
                    "12px",
                  borderRadius:
                    "12px",
                  border:
                    "1px solid #d8e4c4",
                  background:
                    "#ffffff",
                  color:
                    "#455b35",
                  fontSize:
                    "12px",
                }}
              >

                {PLATFORMS.map(
                  (item) => (
                    <option
                      key={
                        item.value
                      }
                      value={
                        item.value
                      }
                    >
                      {item.label}
                    </option>
                  )
                )}

              </select>


              <div
                style={{
                  marginTop:
                    "12px",
                  padding:
                    "11px",
                  borderRadius:
                    "12px",
                  background:
                    "#f4f8eb",
                  textAlign:
                    "center",
                  color:
                    "#60744e",
                  fontSize:
                    "11px",
                  fontWeight:
                    "950",
                }}
              >
                {countLoading
                  ? "미참여자 확인 중..."
                  : notVotedCount ===
                    null
                  ? "미참여자 수 확인 중"
                  : `현재 미참여자 ${notVotedCount}명`}
              </div>

            </div>
          )}


          {/* 제목 */}

          <label
            style={{
              display:
                "block",
              marginBottom:
                "6px",
              color:
                "#536941",
              fontSize:
                "11px",
              fontWeight:
                "900",
            }}
          >
            알림 제목
          </label>

          <input
            value={pushTitle}
            onChange={(e) =>
              setPushTitle(
                e.target.value
              )
            }
            maxLength={80}
            style={{
              width:
                "100%",
              boxSizing:
                "border-box",
              padding:
                "12px",
              borderRadius:
                "12px",
              border:
                "1px solid #d8e4c4",
              background:
                "#ffffff",
              marginBottom:
                "11px",
              fontSize:
                "12px",
            }}
          />


          {/* 내용 */}

          <label
            style={{
              display:
                "block",
              marginBottom:
                "6px",
              color:
                "#536941",
              fontSize:
                "11px",
              fontWeight:
                "900",
            }}
          >
            알림 내용
          </label>

          <textarea
            value={pushMessage}
            onChange={(e) =>
              setPushMessage(
                e.target.value
              )
            }
            maxLength={300}
            rows={4}
            placeholder="예: 아직 맞팔 참여하지 않으신 분들은 지금 참여해주세요 🌿"
            style={{
              width:
                "100%",
              boxSizing:
                "border-box",
              padding:
                "12px",
              borderRadius:
                "12px",
              border:
                "1px solid #d8e4c4",
              background:
                "#ffffff",
              marginBottom:
                "12px",
              fontSize:
                "12px",
              lineHeight:
                "1.5",
              resize:
                "vertical",
            }}
          />


          {/* 보내기 */}

          <button
            type="button"
            onClick={
              sendPushNotification
            }
            disabled={
              pushLoading
            }
            style={{
              width:
                "100%",
              padding:
                "14px",
              border:
                "none",
              borderRadius:
                "14px",
              background:
                "#a9d95d",
              color:
                "#2d3b24",
              fontSize:
                "12px",
              fontWeight:
                "950",
              cursor:
                "pointer",
              opacity:
                pushLoading
                  ? 0.6
                  : 1,
            }}
          >
            {pushLoading
              ? "알림 보내는 중..."
              : targetType ===
                "not_voted"
              ? "⚠️ 미참여자에게 알림 보내기"
              : "🔔 전체 회원에게 알림 보내기"}
          </button>


          {pushResult && (
            <div
              style={{
                marginTop:
                  "11px",
                padding:
                  "11px 12px",
                borderRadius:
                  "12px",
                background:
                  "#ffffff",
                color:
                  "#5f704f",
                fontSize:
                  "10px",
              }}
            >
              {pushResult}
            </div>
          )}

        </section>


        {/* 발송 내역 */}

        <section
          style={{
            marginTop:
              "18px",
            padding:
              "20px",
            borderRadius:
              "24px",
            background:
              "#ffffff",
            border:
              "1px solid #e8e7df",
          }}
        >

          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              marginBottom:
                "14px",
            }}
          >
            <div>
              <div
                style={{
                  color:
                    "#7f9958",
                  fontSize:
                    "10px",
                  fontWeight:
                    "950",
                  letterSpacing:
                    "1.3px",
                }}
              >
                NOTIFICATION HISTORY
              </div>

              <h2
                style={{
                  margin:
                    "5px 0 0",
                  fontSize:
                    "19px",
                  fontWeight:
                    "950",
                  color:
                    "#455b35",
                }}
              >
                알림 발송 내역
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                const token =
                  localStorage.getItem(
                    "jungle_follow_session"
                  );

                if (token) {
                  loadHistory(
                    token
                  );
                }
              }}
              style={{
                padding: "7px 10px",
                border: "1px solid #b9cf91",
                borderRadius: "9px",
                background: "#eaf4d9",
                color: "#4f6839",
                fontSize: "9px",
                fontWeight: "950",
                cursor: "pointer",
                boxShadow: "0 3px 7px rgba(84, 108, 58, 0.08)",
                width: "auto",
                minWidth: "0",
                flex: "0 0 auto",
              }}
            >
              🔄 새로고침
            </button>
          </div>


          {historyLoading ? (
            <p
              style={{
                fontSize:
                  "11px",
                color:
                  "#899082",
              }}
            >
              발송 내역 불러오는 중...
            </p>
          ) : history.length ===
            0 ? (
            <p
              style={{
                fontSize:
                  "11px",
                color:
                  "#899082",
              }}
            >
              아직 알림 발송 내역이 없어요.
            </p>
          ) : (
            history.map(
              (item) => (
                <div
                  key={
                    item.id
                  }
                  style={{
                    padding:
                      "13px",
                    marginBottom:
                      "8px",
                    borderRadius:
                      "15px",
                    background:
                      "#f7f9f2",
                    border:
                      "1px solid #e6ecd9",
                  }}
                >

                  <strong
                    style={{
                      fontSize:
                        "12px",
                      color:
                        "#52663e",
                    }}
                  >
                    {item.title}
                  </strong>

                  <p
                    style={{
                      margin:
                        "6px 0",
                      fontSize:
                        "10px",
                      color:
                        "#687263",
                    }}
                  >
                    {item.message}
                  </p>

                  <div
                    style={{
                      fontSize:
                        "9px",
                      color:
                        "#92998c",
                      lineHeight:
                        "1.6",
                    }}
                  >
                    {item.target_type ===
                    "not_voted"
                      ? `⚠️ 미참여자 · ${platformLabel(
                          item.platform
                        )}`
                      : "👥 전체 회원"}

                    <br />

                    성공{" "}
                    {
                      item.sent_count
                    }명 · 실패{" "}
                    {
                      item.failed_count
                    }명

                    <br />

                    {formatDate(
                      item.created_at
                    )}
                  </div>

                </div>
              )
            )
          )}

        </section>


        {/* 로그아웃 */}

        <button
          type="button"
          className="logoutButton"
          onClick={logout}
          style={{
            marginTop:
              "22px",
          }}
        >
          로그아웃
        </button>

      </section>
    </main>
  );
}
