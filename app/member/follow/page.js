"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PLATFORM_INFO = {
  instagram: {
    name: "인스타그램",
    icon: "📷",
  },
  blog: {
    name: "블로그",
    icon: "📝",
  },
  naver_clip: {
    name: "네이버 클립",
    icon: "🎬",
  },
  youtube: {
    name: "유튜브",
    icon: "▶️",
  },
  tiktok: {
    name: "틱톡",
    icon: "🎵",
  },
  today_house: {
    name: "오늘의집",
    icon: "🏠",
  },
};

export default function FollowPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [member, setMember] = useState(null);
  const [event, setEvent] = useState(null);

  const [platforms, setPlatforms] = useState([]);
  const [votes, setVotes] = useState({});

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setErrorMessage("");

    const token = localStorage.getItem(
      "jungle_follow_session"
    );

    if (!token) {
      router.replace("/");
      return;
    }

    // -----------------------------------------
    // 1. 회원 확인
    // -----------------------------------------

    const {
      data: memberData,
      error: memberError,
    } = await supabase.rpc(
      "get_current_member",
      {
        p_session_token: token,
      }
    );

    const currentMember = Array.isArray(
      memberData
    )
      ? memberData[0]
      : memberData;

    if (memberError || !currentMember) {
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

    // -----------------------------------------
    // 2. 이번 달 이벤트
    // -----------------------------------------

    const {
      data: eventData,
      error: eventError,
    } = await supabase.rpc(
      "get_current_follow_event",
      {
        p_session_token: token,
      }
    );

    if (eventError) {
      setErrorMessage(eventError.message);
      setLoading(false);
      return;
    }

    const currentEvent = Array.isArray(
      eventData
    )
      ? eventData[0]
      : eventData;

    if (!currentEvent) {
      setEvent(null);
      setLoading(false);
      return;
    }

    setEvent(currentEvent);

    // -----------------------------------------
    // 3. 내 플랫폼
    // -----------------------------------------

    const {
      data: platformData,
      error: platformError,
    } = await supabase.rpc(
      "get_my_follow_platforms",
      {
        p_session_token: token,
      }
    );

    if (platformError) {
      setErrorMessage(
        "플랫폼 정보를 불러오지 못했어요. " +
          platformError.message
      );

      setLoading(false);
      return;
    }

    const myPlatforms = Array.isArray(
      platformData
    )
      ? platformData
      : [];

    setPlatforms(myPlatforms);

    // -----------------------------------------
    // 4. 기존 투표 불러오기
    // -----------------------------------------

    const {
      data: voteData,
      error: voteError,
    } = await supabase.rpc(
      "get_my_follow_votes",
      {
        p_session_token: token,
        p_event_id: currentEvent.event_id,
      }
    );

    if (voteError) {
      setErrorMessage(
        "기존 참여내역을 불러오지 못했어요. " +
          voteError.message
      );

      setLoading(false);
      return;
    }

    const voteMap = {};

    (voteData || []).forEach((item) => {
      voteMap[item.platform] =
        item.vote_status || "participate";
    });

    setVotes(voteMap);
    setLoading(false);
  }

  // -----------------------------------------
  // 참여 / 제한 선택
  // -----------------------------------------

  function selectVote(platform, status) {
    if (!event?.is_open) return;

    setMessage("");
    setErrorMessage("");

    setVotes((prev) => ({
      ...prev,
      [platform]: status,
    }));
  }

  // -----------------------------------------
  // 전체 저장
  // -----------------------------------------

  async function saveAll() {
    if (!event?.is_open) {
      setErrorMessage(
        "현재는 맞팔데이 참여기간이 아니에요."
      );
      return;
    }

    const token = localStorage.getItem(
      "jungle_follow_session"
    );

    if (!token) {
      router.replace("/");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      for (const item of platforms) {
        const status = votes[item.platform];

        // 선택하지 않은 플랫폼은 기존 투표 삭제
        if (!status) {
          const { error } = await supabase.rpc(
            "delete_follow_vote",
            {
              p_session_token: token,
              p_event_id: event.event_id,
              p_platform: item.platform,
            }
          );

          if (error) {
            throw error;
          }

          continue;
        }

        const { error } = await supabase.rpc(
          "save_follow_vote",
          {
            p_session_token: token,
            p_event_id: event.event_id,
            p_platform: item.platform,
            p_account_value:
              item.account_value || "",
            p_vote_status: status,
          }
        );

        if (error) {
          throw error;
        }
      }

      setMessage(
        "맞팔데이 선택이 저장되었어요 💚"
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error?.message ||
          "저장 중 오류가 발생했어요."
      );
    }

    setSaving(false);
  }

  function clearVote(platform) {
    if (!event?.is_open) return;

    setVotes((prev) => {
      const next = { ...prev };
      delete next[platform];
      return next;
    });

    setMessage("");
  }

  // -----------------------------------------
  // 로딩
  // -----------------------------------------

  if (loading) {
    return (
      <main style={styles.page}>
        <section style={styles.container}>
          <div style={styles.loadingCard}>
            <div style={styles.loadingIcon}>
              🐯
            </div>

            <div style={styles.loadingText}>
              맞팔데이 불러오는 중...
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.container}>

        {/* 뒤로가기 */}

        <button
          type="button"
          style={styles.backButton}
          onClick={() =>
            router.push("/member")
          }
        >
          ← 회원 홈
        </button>

        {/* 상단 */}

        <div style={styles.header}>
          <div style={styles.badge}>
            MONTHLY FOLLOW
          </div>

          <div style={styles.tiger}>
            🐯
          </div>

          <h1 style={styles.title}>
            맞팔데이
          </h1>

          <p style={styles.subtitle}>
            참여할 플랫폼을 선택해주세요 🌿
          </p>
        </div>

        {/* 회원 */}

        <div style={styles.memberCard}>
          <div>
            <strong style={styles.memberName}>
              {member?.kakao_nickname}
            </strong>

            <div style={styles.memberInstagram}>
              @{member?.instagram_id}
            </div>
          </div>

          {event && (
            <div style={styles.monthBadge}>
              {event.event_year}년{" "}
              {event.event_month}월
            </div>
          )}
        </div>

        {/* 이벤트 없음 */}

        {!event && (
          <div style={styles.emptyCard}>
            <div style={styles.emptyIcon}>
              🌿
            </div>

            <strong>
              이번 달 맞팔데이가 아직
              생성되지 않았어요.
            </strong>

            <p>
              관리자에게 문의해주세요.
            </p>
          </div>
        )}

        {/* 이벤트 있음 */}

        {event && (
          <>
            <div
              style={
                event.is_open
                  ? styles.openNotice
                  : styles.closedNotice
              }
            >
              <strong>
                {event.is_open
                  ? "🟢 지금 참여 가능"
                  : "🔒 참여 마감"}
              </strong>

              <span>
                매월 1일 00:00 ~ 3일 23:59
              </span>
            </div>

            {platforms.length === 0 ? (
              <div style={styles.emptyCard}>
                등록된 플랫폼이 없어요.
              </div>
            ) : (
              <div style={styles.platformList}>
                {platforms.map((item) => {
                  const info =
                    PLATFORM_INFO[
                      item.platform
                    ] || {
                      name: item.platform,
                      icon: "🌿",
                    };

                  const selected =
                    votes[item.platform];

                  return (
                    <div
                      key={item.platform}
                      style={styles.platformCard}
                    >
                      <div
                        style={
                          styles.platformTop
                        }
                      >
                        <div
                          style={
                            styles.platformIcon
                          }
                        >
                          {info.icon}
                        </div>

                        <div
                          style={
                            styles.platformInfo
                          }
                        >
                          <strong
                            style={
                              styles.platformName
                            }
                          >
                            {info.name}
                          </strong>

                          <div
                            style={
                              styles.accountValue
                            }
                          >
                            {item.platform ===
                            "instagram"
                              ? `@${
                                  item.account_value ||
                                  member?.instagram_id
                                }`
                              : item.account_value}
                          </div>
                        </div>
                      </div>

                      <div
                        style={
                          styles.voteButtons
                        }
                      >
                        <button
                          type="button"
                          disabled={
                            !event.is_open
                          }
                          onClick={() =>
                            selectVote(
                              item.platform,
                              "participate"
                            )
                          }
                          style={{
                            ...styles.voteButton,

                            ...(selected ===
                            "participate"
                              ? styles.participateSelected
                              : {}),
                          }}
                        >
                          ✓ 참여
                        </button>

                        <button
                          type="button"
                          disabled={
                            !event.is_open
                          }
                          onClick={() =>
                            selectVote(
                              item.platform,
                              "restricted"
                            )
                          }
                          style={{
                            ...styles.voteButton,

                            ...(selected ===
                            "restricted"
                              ? styles.restrictedSelected
                              : {}),
                          }}
                        >
                          제한
                        </button>
                      </div>

                      {event.is_open &&
                        selected && (
                          <button
                            type="button"
                            onClick={() =>
                              clearVote(
                                item.platform
                              )
                            }
                            style={
                              styles.cancelButton
                            }
                          >
                            선택 취소
                          </button>
                        )}
                    </div>
                  );
                })}
              </div>
            )}

            {message && (
              <div style={styles.successBox}>
                {message}
              </div>
            )}

            {errorMessage && (
              <div style={styles.errorBox}>
                {errorMessage}
              </div>
            )}

            {event.is_open &&
              platforms.length > 0 && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={saveAll}
                  style={{
                    ...styles.saveButton,

                    opacity: saving
                      ? 0.65
                      : 1,
                  }}
                >
                  {saving
                    ? "저장 중..."
                    : "선택 저장하기"}
                </button>
              )}
          </>
        )}

        <div style={styles.guide}>
          <strong>
            🌿 참여 안내
          </strong>

          <p>
            <b>참여</b>는 이번 달 해당
            플랫폼 맞팔에 참여하는 경우예요.
            <br />
            <b>제한</b>은 이번 달 해당
            플랫폼 참여가 어려운 경우예요.
            <br />
            선택하지 않으면 미참여로
            처리됩니다.
          </p>
        </div>

      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg, #f5f1e7 0%, #faf8f1 52%, #edf4e4 100%)",
    padding: "24px 16px 60px",
    color: "#273426",
  },

  container: {
    width: "100%",
    maxWidth: "460px",
    margin: "0 auto",
  },

  backButton: {
    border: "none",
    background: "transparent",
    color: "#718064",
    fontSize: "12px",
    fontWeight: "900",
    cursor: "pointer",
    padding: "8px 2px",
  },

  header: {
    textAlign: "center",
    margin: "15px 0 24px",
  },

  badge: {
    display: "inline-block",
    background: "#e4edce",
    color: "#6f8150",
    padding: "6px 11px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "950",
    letterSpacing: "1.3px",
  },

  tiger: {
    fontSize: "40px",
    marginTop: "13px",
  },

  title: {
    margin: "5px 0 0",
    fontSize: "29px",
    fontWeight: "950",
    letterSpacing: "-1px",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#7c8577",
    fontSize: "13px",
  },

  memberCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    background: "#fff",
    border: "1px solid #ebe9df",
    borderRadius: "20px",
    padding: "16px",
    marginBottom: "12px",
  },

  memberName: {
    fontSize: "15px",
  },

  memberInstagram: {
    marginTop: "3px",
    color: "#81877e",
    fontSize: "11px",
  },

  monthBadge: {
    background: "#edf4df",
    color: "#64784b",
    borderRadius: "999px",
    padding: "7px 10px",
    fontSize: "10px",
    fontWeight: "900",
  },

  openNotice: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    padding: "13px 14px",
    borderRadius: "16px",
    background: "#edf6df",
    color: "#58703f",
    fontSize: "11px",
    marginBottom: "12px",
  },

  closedNotice: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    padding: "13px 14px",
    borderRadius: "16px",
    background: "#f1f0ec",
    color: "#777a73",
    fontSize: "11px",
    marginBottom: "12px",
  },

  platformList: {
    display: "grid",
    gap: "10px",
  },

  platformCard: {
    background: "#fff",
    border: "1px solid #e7e6dc",
    borderRadius: "21px",
    padding: "16px",
  },

  platformTop: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
  },

  platformIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "14px",
    background: "#f0f5e5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "19px",
    flexShrink: 0,
  },

  platformInfo: {
    minWidth: 0,
    flex: 1,
  },

  platformName: {
    fontSize: "14px",
  },

  accountValue: {
    marginTop: "3px",
    color: "#848980",
    fontSize: "10px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  voteButtons: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    marginTop: "14px",
  },

  voteButton: {
    border: "1px solid #dfe4d7",
    background: "#fafbf8",
    color: "#737b6d",
    borderRadius: "13px",
    padding: "12px 8px",
    fontSize: "12px",
    fontWeight: "950",
    cursor: "pointer",
  },

  participateSelected: {
    background: "#a9d95d",
    border: "1px solid #a9d95d",
    color: "#2d3b24",
  },

  restrictedSelected: {
    background: "#eee7f7",
    border: "1px solid #d8c8e8",
    color: "#73588c",
  },

  cancelButton: {
    width: "100%",
    marginTop: "8px",
    border: "none",
    background: "transparent",
    color: "#a0a39d",
    fontSize: "10px",
    cursor: "pointer",
  },

  saveButton: {
    width: "100%",
    marginTop: "16px",
    border: "none",
    borderRadius: "17px",
    padding: "16px",
    background: "#a9d95d",
    color: "#2b3922",
    fontSize: "14px",
    fontWeight: "950",
    cursor: "pointer",
    boxShadow:
      "0 8px 20px rgba(123,163,64,0.18)",
  },

  successBox: {
    marginTop: "13px",
    padding: "13px",
    borderRadius: "14px",
    background: "#edf6df",
    color: "#59733e",
    fontSize: "12px",
    fontWeight: "900",
    textAlign: "center",
  },

  errorBox: {
    marginTop: "13px",
    padding: "13px",
    borderRadius: "14px",
    background: "#fff0ed",
    color: "#a84d43",
    fontSize: "11px",
    fontWeight: "800",
  },

  guide: {
    marginTop: "16px",
    padding: "16px",
    borderRadius: "18px",
    background: "#f1f4e9",
    color: "#687263",
    fontSize: "11px",
    lineHeight: "1.7",
  },

  emptyCard: {
    padding: "28px 20px",
    background: "#fff",
    border: "1px solid #ebe9df",
    borderRadius: "22px",
    textAlign: "center",
    color: "#70786b",
    fontSize: "12px",
  },

  emptyIcon: {
    fontSize: "30px",
    marginBottom: "10px",
  },

  loadingCard: {
    marginTop: "100px",
    padding: "35px",
    borderRadius: "26px",
    background: "#fff",
    textAlign: "center",
  },

  loadingIcon: {
    fontSize: "40px",
  },

  loadingText: {
    marginTop: "10px",
    color: "#7c8477",
    fontSize: "12px",
    fontWeight: "800",
  },
};
