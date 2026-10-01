"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const INSTAGRAM_FOLLOW_ACCOUNT = "_jungle_room__";

const PLATFORM_INFO = {
  instagram: {
    label: "인스타그램",
    icon: "📷",
  },
  blog: {
    label: "블로그",
    icon: "📝",
  },
  naver_clip: {
    label: "네이버 클립",
    icon: "🎬",
  },
  youtube: {
    label: "유튜브",
    icon: "▶️",
  },
  tiktok: {
    label: "틱톡",
    icon: "🎵",
  },
  today_house: {
    label: "오늘의집",
    icon: "🏠",
  },
};

export default function MemberFollowPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [member, setMember] = useState(null);
  const [event, setEvent] = useState(null);
  const [platforms, setPlatforms] = useState([]);

  const [selections, setSelections] = useState({});
  const [originalSelections, setOriginalSelections] =
    useState({});

  const [participantLinks, setParticipantLinks] =
    useState({});

  const [linksLoading, setLinksLoading] =
    useState({});

  const [expandedLinks, setExpandedLinks] =
    useState({});

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] =
    useState("");

  const [showInstallGuide, setShowInstallGuide] =
    useState(false);

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setLoading(true);
    setErrorMessage("");
    setMessage("");

    const token = localStorage.getItem(
      "jungle_follow_session"
    );

    if (!token) {
      router.replace("/");
      return;
    }

    const [
      memberResult,
      eventResult,
      platformResult,
    ] = await Promise.all([
      supabase.rpc("get_current_member", {
        p_session_token: token,
      }),

      supabase.rpc(
        "get_current_follow_event",
        {
          p_session_token: token,
        }
      ),

      supabase.rpc(
        "get_my_follow_platforms",
        {
          p_session_token: token,
        }
      ),
    ]);

    if (memberResult.error) {
      localStorage.removeItem(
        "jungle_follow_session"
      );

      localStorage.removeItem(
        "jungle_follow_name"
      );

      router.replace("/");
      return;
    }

    const currentMember =
      Array.isArray(memberResult.data)
        ? memberResult.data[0]
        : memberResult.data;

    setMember(currentMember || null);

    const isAdminMember =
      currentMember?.admin_role === "admin" ||
      currentMember?.admin_role === "super_admin";

    if (eventResult.error) {
      setErrorMessage(
        eventResult.error.message
      );
      setLoading(false);
      return;
    }

    const currentEvent =
      Array.isArray(eventResult.data)
        ? eventResult.data[0]
        : eventResult.data;

    setEvent(currentEvent || null);

    if (platformResult.error) {
      setErrorMessage(
        platformResult.error.message
      );
      setLoading(false);
      return;
    }

    const platformRows =
      Array.isArray(platformResult.data)
        ? platformResult.data
        : [];

    const visiblePlatformRows = platformRows;

    setPlatforms(visiblePlatformRows);

    if (currentEvent?.event_id && !isAdminMember) {
      await loadMyVotes(
        token,
        currentEvent.event_id
      );
    }

    if (currentEvent?.event_id) {
      await loadParticipantLinks(
        token,
        currentEvent.event_id,
        visiblePlatformRows
      );
    }

    setLoading(false);
  }

  async function loadMyVotes(
    token,
    eventId
  ) {
    const voteResult =
      await supabase.rpc(
        "get_my_follow_votes",
        {
          p_session_token: token,
          p_event_id: eventId,
        }
      );

    if (voteResult.error) {
      setErrorMessage(
        voteResult.error.message
      );
      return;
    }

    const voteRows =
      Array.isArray(voteResult.data)
        ? voteResult.data
        : [];

    const nextSelections = {};

    voteRows.forEach((vote) => {
      nextSelections[vote.platform] =
        vote.vote_status;
    });

    setSelections(nextSelections);
    setOriginalSelections(
      nextSelections
    );
  }

  async function loadParticipantLinks(
    token,
    eventId,
    platformRows
  ) {
    const nonInstagramPlatforms =
      platformRows.filter(
        (item) =>
          item.platform !== "instagram"
      );

    const nextLinks = {};

    for (const platform of nonInstagramPlatforms) {
      setLinksLoading((prev) => ({
        ...prev,
        [platform.platform]: true,
      }));

      const { data, error } =
        await supabase.rpc(
          "get_follow_participant_links",
          {
            p_session_token: token,
            p_event_id: eventId,
            p_platform:
              platform.platform,
          }
        );

      if (error) {
        console.error(
          `${platform.platform} 링크 조회 오류:`,
          error
        );

        nextLinks[platform.platform] =
          [];
      } else {
        nextLinks[platform.platform] =
          Array.isArray(data)
            ? data
            : [];
      }

      setLinksLoading((prev) => ({
        ...prev,
        [platform.platform]: false,
      }));
    }

    setParticipantLinks(nextLinks);
  }

  function choose(
    platform,
    status
  ) {
    if (!event?.is_open) {
      return;
    }

    setMessage("");
    setErrorMessage("");

    setSelections((prev) => ({
      ...prev,
      [platform]: status,
    }));
  }

  function clearChoice(platform) {
    if (!event?.is_open) {
      return;
    }

    setMessage("");
    setErrorMessage("");

    setSelections((prev) => {
      const next = {
        ...prev,
      };

      delete next[platform];

      return next;
    });
  }

  async function saveVotes() {
    if (!event?.event_id) {
      return;
    }

    if (!event?.is_open) {
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
      for (const platform of platforms) {
        const key =
          platform.platform;

        const selectedStatus =
          selections[key];

        const originalStatus =
          originalSelections[key];

        if (selectedStatus) {
          const { error } =
            await supabase.rpc(
              "save_follow_vote",
              {
                p_session_token:
                  token,
                p_event_id:
                  event.event_id,
                p_platform:
                  key,
                p_account_value:
                  platform.account_value ||
                  "",
                p_vote_status:
                  selectedStatus,
              }
            );

          if (error) {
            throw error;
          }
        } else if (originalStatus) {
          const { error } =
            await supabase.rpc(
              "delete_follow_vote",
              {
                p_session_token:
                  token,
                p_event_id:
                  event.event_id,
                p_platform:
                  key,
              }
            );

          if (error) {
            throw error;
          }
        }
      }

      setOriginalSelections({
        ...selections,
      });

      setMessage("저장완료 💚");

      window.setTimeout(() => {
        setMessage("");
      }, 1800);
    } catch (error) {
      setErrorMessage(
        error?.message ||
          "저장 중 오류가 발생했어요."
      );
    } finally {
      setSaving(false);
    }
  }

  function openInstagramFollowAccount() {
    window.open(
      `https://www.instagram.com/${INSTAGRAM_FOLLOW_ACCOUNT}/`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function copyAllParticipantLinks(links) {
    const values = (links || [])
      .map((person) => person.account_value?.trim())
      .filter(Boolean);

    if (values.length === 0) return;

    try {
      await navigator.clipboard.writeText(values.join("\n"));
      setMessage(`전체 링크 ${values.length}개 복사되었습니다 💚`);
      window.setTimeout(() => setMessage(""), 2500);
    } catch (error) {
      console.error("전체 링크 복사 오류:", error);
      setMessage("링크 복사에 실패했어요.");
    }
  }

  function openParticipantLink(
    accountValue
  ) {
    if (!accountValue) {
      return;
    }

    let value =
      accountValue.trim();

    if (
      !value.startsWith("http://") &&
      !value.startsWith("https://")
    ) {
      value =
        `https://${value}`;
    }

    window.open(
      value,
      "_blank",
      "noopener,noreferrer"
    );
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <section style={styles.container}>
          <div style={styles.loadingCard}>
            <div style={styles.loadingIcon}>
              🐯
            </div>

            <p style={styles.loadingText}>
              맞팔데이 불러오는 중...
            </p>
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
          ← 홈으로
        </button>


        {/* HEADER */}

        <div style={styles.header}>

          <div style={styles.topBadge}>
            JUNGLE FOLLOW DAY
          </div>

           <h1 style={styles.title}>
            맞팔데이
          </h1>

          <p style={styles.subtitle}>
            다른 회원님의 링크를 확인하고
            <br />
            완료 여부를 선택해주세요
          </p>

        </div>


        {/* MEMBER */}

        {member && (
          <div style={styles.memberCard}>

            <div>
              <strong>
                {member.kakao_nickname}
              </strong>

              <span style={styles.memberId}>
                @{member.instagram_id}
              </span>
            </div>

            <span style={styles.memberBadge}>
              MEMBER
            </span>

          </div>
        )}


        {(
          member?.admin_role === "admin" ||
          member?.admin_role === "super_admin"
        ) && (
          <div style={styles.adminExemptBox}>
            👑 관리자는 맞팔데이 투표 대상에서 제외돼요.
          </div>
        )}


        {/* MESSAGE */}

        {errorMessage && (
          <div style={styles.errorBox}>
            {errorMessage}
          </div>
        )}

        {message && (
          <div style={styles.successBox}>
            {message}
          </div>
        )}


        {!event ? (
          <div style={styles.emptyCard}>

            <div style={styles.emptyIcon}>
              🌿
            </div>

            <strong>
              현재 진행 중인 맞팔데이가 없어요.
            </strong>

            <p style={styles.emptyText}>
              다음 맞팔데이를 기다려주세요 💚
            </p>

          </div>
        ) : (
          <>

            {/* EVENT */}

            <div style={styles.eventCard}>

              <div>
                <div style={styles.eventLabel}>
                  FOLLOW DAY
                </div>

                <strong style={styles.eventTitle}>
                  {event.event_year}년{" "}
                  {event.event_month}월
                </strong>
              </div>

              <span
                style={
                  event.is_open
                    ? styles.openBadge
                    : styles.closedBadge
                }
              >
                {event.is_open
                  ? "🟢 지금 참여 가능"
                  : "마감"}
              </span>

            </div>


            {/* PERIOD */}

            <div style={styles.periodCard}>
              <strong>
                📅 참여 기간
              </strong>

              <span>
                매월 1일 00:00 ~ 3일 23:59
              </span>
            </div>


            {/* MY TODO SUMMARY */}

            <div style={styles.todoCard}>
              <div style={styles.todoTop}>
                <div>
                  <div style={styles.todoLabel}>
                    MY FOLLOW
                  </div>
                  <strong style={styles.todoTitle}>
                    내가 해야 할 곳
                  </strong>
                </div>

                <span style={styles.todoCount}>
                  {platforms.filter(
                    (item) => !selections[item.platform]
                  ).length}
                  개 남음
                </span>
              </div>

              <div style={styles.todoChips}>
                {platforms.map((item) => {
                  const info =
                    PLATFORM_INFO[item.platform] || {
                      label: item.platform,
                      icon: "🌿",
                    };

                  const status =
                    selections[item.platform];

                  return (
                    <div
                      key={`todo-${item.platform}`}
                      style={{
                        ...styles.todoChip,
                        ...(status
                          ? styles.todoChipDone
                          : styles.todoChipPending),
                      }}
                    >
                      <span>{info.icon}</span>
                      <span>{info.label}</span>
                      <b style={styles.todoStatus}>
                        {status === "participate"
                          ? item.platform === "instagram"
                            ? "맞팔완료"
                            : "완료"
                          : status === "restricted"
                            ? "제한"
                            : "해야함"}
                      </b>
                    </div>
                  );
                })}
              </div>

              {platforms.every(
                (item) => selections[item.platform]
              ) && (
                <div style={styles.todoAllDone}>
                  💚 이번 달 해야 할 곳을 모두 선택했어요!
                </div>
              )}
            </div>


            {/* PLATFORMS */}

            {platforms.map((item) => {

              const info =
                PLATFORM_INFO[
                  item.platform
                ] || {
                  label:
                    item.platform,
                  icon: "🌿",
                };

              const selected =
                selections[
                  item.platform
                ];

              const isInstagram =
                item.platform ===
                "instagram";

              const links =
                participantLinks[
                  item.platform
                ] || [];

              const isLoadingLinks =
                linksLoading[
                  item.platform
                ];

              return (
                <div
                  key={item.platform}
                  style={
                    styles.platformCard
                  }
                >

                  {/* PLATFORM HEADER */}

                  <div
                    style={
                      styles.platformTop
                    }
                  >

                    <div
                      style={
                        styles.platformTitleArea
                      }
                    >

                      <div
                        style={
                          styles.platformIcon
                        }
                      >
                        {info.icon}
                      </div>

                      <div>

                        <strong
                          style={
                            styles.platformTitle
                          }
                        >
                          {info.label}
                        </strong>

                        {isInstagram && (
                          <div
                            style={
                              styles.platformAccount
                            }
                          >
                            필수 플랫폼
                          </div>
                        )}

                      </div>

                    </div>

                  </div>


                  {!isInstagram && item.account_value && (
                    <div style={styles.myPlatformLinkBox}>
                      <div style={styles.myPlatformLinkLabel}>
                        내 등록 링크
                      </div>
                      <button
                        type="button"
                        onClick={() => openParticipantLink(item.account_value)}
                        style={styles.myPlatformLinkButton}
                      >
                        <span style={styles.myPlatformLinkValue}>
                          {item.account_value}
                        </span>
                        <span style={styles.myPlatformLinkOpen}>
                          열기 ↗
                        </span>
                      </button>
                    </div>
                  )}


                  {/* INSTAGRAM */}

                  {isInstagram && (
                    <div
                      style={
                        styles.instagramBox
                      }
                    >

                      <div
                        style={
                          styles.instagramLabel
                        }
                      >
                        인스타그램 맞팔계정
                      </div>

                      <button
                        type="button"
                        onClick={
                          openInstagramFollowAccount
                        }
                        style={
                          styles.instagramAccountButton
                        }
                      >
                        <strong>
                          @
                          {
                            INSTAGRAM_FOLLOW_ACCOUNT
                          }
                        </strong>

                        <span>
                          계정 열기 ↗
                        </span>
                      </button>

                      <p
                        style={
                          styles.instagramGuide
                        }
                      >
                        위 맞팔계정을 확인한 뒤
                        맞팔을 완료하셨다면{" "}
                        <b>
                          맞팔완료
                        </b>
                        를 눌러주세요.
                        <br />
                        팔로우 제한 등이 있는
                        경우에는{" "}
                        <b>
                          제한
                        </b>
                        을 선택해주세요.
                      </p>

                    </div>
                  )}


                  {/* OTHER PLATFORM LINKS */}

                  {!isInstagram && (
                    <div
                      style={
                        styles.participantSection
                      }
                    >

                      <div
                        style={
                          styles.participantHeader
                        }
                      >
                        <strong>
                          다른 참여자 링크
                        </strong>

                        <div style={styles.participantActions}>
                          <button
                            type="button"
                            onClick={() => copyAllParticipantLinks(links)}
                            style={styles.copyAllButton}
                            disabled={links.length === 0}
                          >
                            링크 전체복사
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedLinks((prev) => ({
                                ...prev,
                                [item.platform]: !prev[item.platform],
                              }))
                            }
                            style={styles.participantToggle}
                          >
                            <span>{links.length}명</span>
                            <span>{expandedLinks[item.platform] ? "접기 ▲" : "보기 ▼"}</span>
                          </button>
                        </div>
                      </div>


                      {expandedLinks[item.platform] && (
                        isLoadingLinks ? (
                        <div
                          style={
                            styles.linksLoading
                          }
                        >
                          링크 불러오는 중...
                        </div>
                      ) : links.length ===
                        0 ? (
                        <div
                          style={
                            styles.noLinks
                          }
                        >
                          현재 참여한 회원이
                          없어요.
                        </div>
                      ) : (
                        <div
                          style={
                            styles.linkList
                          }
                        >

                          {links.map((person, index) => (
                            <button
                              key={`${person.member_id}-${index}`}
                              type="button"
                              onClick={() =>
                                openParticipantLink(person.account_value)
                              }
                              style={styles.participantItem}
                            >
                              <span style={styles.participantNumber}>
                                {index + 1}
                              </span>

                              <span style={styles.participantName}>
                                {person.kakao_nickname || "회원"}
                              </span>

                              <span style={styles.openLinkText}>
                                열기 ↗
                              </span>
                            </button>
                          ))}

                        </div>
                      )
                      )}

                    </div>
                  )}


                  {/* CHOICE */}

                  <div
                    style={
                      styles.choiceGrid
                    }
                  >

                    <button
                      type="button"
                      disabled={
                        !event.is_open
                      }
                      onClick={() =>
                        choose(
                          item.platform,
                          "participate"
                        )
                      }
                      style={{
                        ...styles.choiceButton,

                        ...(selected ===
                        "participate"
                          ? styles.choiceButtonActive
                          : {}),
                      }}
                    >

                      <span
                        style={
                          styles.choiceEmoji
                        }
                      >
                        {isInstagram
                          ? "🤝"
                          : "💚"}
                      </span>

                      <strong>
                        {isInstagram
                          ? "맞팔완료"
                          : "완료"}
                      </strong>

                    </button>


                    <button
                      type="button"
                      disabled={
                        !event.is_open
                      }
                      onClick={() =>
                        choose(
                          item.platform,
                          "restricted"
                        )
                      }
                      style={{
                        ...styles.choiceButton,

                        ...(selected ===
                        "restricted"
                          ? styles.restrictedButtonActive
                          : {}),
                      }}
                    >

                      <span
                        style={
                          styles.choiceEmoji
                        }
                      >
                        🚫
                      </span>

                      <strong>
                        제한
                      </strong>

                    </button>

                  </div>


                  {/* CURRENT */}

                  <div
                    style={
                      styles.currentChoice
                    }
                  >
                    현재 선택:{" "}

                    <strong>
                      {!selected
                        ? isInstagram
                          ? "미투표"
                          : "미완료"
                        : selected ===
                          "participate"
                        ? isInstagram
                          ? "맞팔완료"
                          : "완료"
                        : "제한"}
                    </strong>
                  </div>


                  {/* CLEAR */}

                  {selected &&
                    event.is_open && (
                      <button
                        type="button"
                        onClick={() =>
                          clearChoice(
                            item.platform
                          )
                        }
                        style={
                          styles.clearButton
                        }
                      >
                        선택 취소
                      </button>
                    )}

                </div>
              );
            })}


            {/* SAVE */}

            {event.is_open ? (
              <button
                type="button"
                disabled={saving}
                onClick={saveVotes}
                style={{
                  ...styles.saveButton,
                  opacity:
                    saving ? 0.6 : 1,
                }}
              >
                {saving
                  ? "저장 중..."
                  : "완료 상태 저장하기 💚"}
              </button>
            ) : (
              <div
                style={
                  styles.closedCard
                }
              >
                이번 달 맞팔데이 투표가
                마감되었어요 🌿
              </div>
            )}


            {message && (
              <div style={styles.saveToastBackdrop}>
                <div style={styles.saveToast}>
                  <div style={styles.saveToastIcon}>✓</div>
                  <div style={styles.saveToastText}>{message}</div>
                </div>
              </div>
            )}

            {/* GUIDE */}

            <div
              style={styles.guideCard}
            >

              <strong>
                🐯 꼭 확인해주세요
              </strong>

              <p>
                인스타그램은{" "}
                <b>
                  @{INSTAGRAM_FOLLOW_ACCOUNT}
                </b>
                {" "}
                계정을 기준으로
                맞팔을 진행합니다.
              </p>

              <p>
                다른 플랫폼은
                다른 참여자들의 링크를
                확인한 후 실제로 확인을
                완료하셨다면{" "}
                <b>완료</b>를
                선택해주세요.
              </p>

              <p>
                링크 확인이 어렵거나
                참여할 수 없는 경우에는{" "}
                <b>제한</b>을 선택해주세요.
              </p>

            </div>

          </>
        )}

      </section>
    </main>
  );
}


const styles = {

  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg, #f5f1e7 0%, #faf8f1 48%, #edf4e4 100%)",
    padding: "22px 14px 60px",
    color: "#273426",
    fontFamily: "'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    letterSpacing: "-0.02em",
  },

  container: {
    width: "100%",
    maxWidth: "480px",
    margin: "0 auto",
  },

  backButton: {
    border: "none",
    background: "transparent",
    color: "#718064",
    fontSize: "12px",
    fontWeight: "900",
    padding: "8px 2px",
    cursor: "pointer",
  },

  header: {
    textAlign: "center",
    margin: "10px 0 18px",
  },

  topBadge: {
    display: "inline-block",
    padding: "6px 11px",
    borderRadius: "999px",
    background: "#e4edce",
    color: "#708252",
    fontSize: "9px",
    fontWeight: "950",
    letterSpacing: "1.3px",
  },

  tiger: {
    fontSize: "39px",
    marginTop: "12px",
  },

  title: {
    margin: "5px 0 0",
    fontSize: "27px",
    fontWeight: "900",
    letterSpacing: "-0.05em",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#7c8577",
    fontSize: "11px",
    lineHeight: "1.65",
    fontWeight: "500",
  },

  memberCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "13px 15px",
    borderRadius: "17px",
    background: "#fff",
    border: "1px solid #ebe9df",
    marginBottom: "12px",
    fontSize: "13px",
  },

  memberId: {
    display: "block",
    marginTop: "3px",
    color: "#858b81",
    fontSize: "10px",
  },

  memberBadge: {
    padding: "5px 8px",
    borderRadius: "999px",
    background: "#edf4df",
    color: "#62764e",
    fontSize: "8px",
    fontWeight: "950",
  },

  eventCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    padding: "15px",
    borderRadius: "18px",
    background: "#fff",
    border: "1px solid #e7e6dc",
    marginBottom: "8px",
  },

  eventLabel: {
    color: "#91a46f",
    fontSize: "9px",
    fontWeight: "950",
    marginBottom: "4px",
  },

  eventTitle: {
    fontSize: "17px",
  },

  openBadge: {
    padding: "6px 9px",
    borderRadius: "999px",
    background: "#e7f4d3",
    color: "#5d773e",
    fontSize: "9px",
    fontWeight: "950",
  },

  closedBadge: {
    padding: "6px 9px",
    borderRadius: "999px",
    background: "#efefec",
    color: "#777b74",
    fontSize: "9px",
    fontWeight: "950",
  },

  periodCard: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    padding: "12px 15px",
    borderRadius: "15px",
    background: "#eff4e7",
    color: "#66745c",
    fontSize: "10px",
    marginBottom: "13px",
  },

  todoCard: {
    marginTop: "12px",
    marginBottom: "12px",
    padding: "13px",
    borderRadius: "17px",
    background: "#ffffff",
    border: "1px solid #e1e7d9",
    boxShadow: "0 7px 18px rgba(76, 96, 55, 0.06)",
  },

  todoTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "12px",
    boxShadow: "none",
  },

  todoLabel: {
    marginBottom: "3px",
    color: "#91a66f",
    fontSize: "7px",
    fontWeight: "950",
    letterSpacing: "1.2px",
  },

  todoTitle: {
    color: "#34432f",
    fontSize: "13px",
    fontWeight: "950",
  },

  todoCount: {
    padding: "5px 9px",
    borderRadius: "999px",
    background: "#f1f6e8",
    color: "#71845d",
    fontSize: "9px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  todoChips: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "7px",
  },

  todoChip: {
    minWidth: 0,
    padding: "9px 10px",
    borderRadius: "12px",
    display: "grid",
    gridTemplateColumns: "20px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: "5px",
    fontSize: "9px",
    fontWeight: "850",
  },

  todoChipPending: {
    background: "#fff9ed",
    border: "1px solid #f1dfb6",
    color: "#625944",
  },

  todoChipDone: {
    background: "#f0f7e5",
    border: "1px solid #dbe9c7",
    color: "#526743",
  },

  todoStatus: {
    fontSize: "8px",
    whiteSpace: "nowrap",
  },

  todoAllDone: {
    marginTop: "9px",
    padding: "9px",
    borderRadius: "11px",
    background: "#eaf6d9",
    color: "#56713e",
    textAlign: "center",
    fontSize: "9px",
    fontWeight: "900",
  },

  platformCard: {
    padding: "15px",
    borderRadius: "18px",
    background: "#fff",
    border: "1px solid #e7e6dc",
    marginBottom: "10px",
    boxShadow: "0 4px 14px rgba(60, 78, 48, 0.035)",
  },

  platformTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  platformTitleArea: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    minWidth: 0,
  },

  platformIcon: {
    width: "36px",
    height: "36px",
    borderRadius: "11px",
    background: "#f0f4e8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    flexShrink: 0,
  },

  platformTitle: {
    fontSize: "14px",
    fontWeight: "900",
    letterSpacing: "-0.035em",
  },

  platformAccount: {
    marginTop: "3px",
    color: "#898e85",
    fontSize: "9px",
  },

  myPlatformLinkBox: {
    marginTop: "11px",
    padding: "10px 11px",
    borderRadius: "13px",
    background: "#fbfaf5",
    border: "1px solid #ece9df",
  },

  myPlatformLinkLabel: {
    marginBottom: "6px",
    color: "#8b927f",
    fontSize: "8px",
    fontWeight: "900",
  },

  myPlatformLinkButton: {
    width: "100%",
    padding: "9px 10px",
    border: "none",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#56664d",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    cursor: "pointer",
    textAlign: "left",
  },

  myPlatformLinkValue: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "9px",
    fontWeight: "700",
  },

  myPlatformLinkOpen: {
    flexShrink: 0,
    fontSize: "8px",
    fontWeight: "900",
    color: "#6c805b",
  },

  instagramBox: {
    marginTop: "13px",
    padding: "13px",
    borderRadius: "15px",
    background: "#f3f7ea",
  },

  instagramLabel: {
    marginBottom: "7px",
    color: "#718162",
    fontSize: "9px",
    fontWeight: "950",
  },

  instagramAccountButton: {
    width: "100%",
    border: "none",
    borderRadius: "12px",
    padding: "11px",
    background: "#fff",
    color: "#536547",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    fontSize: "10px",
    cursor: "pointer",
  },

  instagramGuide: {
    margin: "9px 2px 0",
    color: "#76816d",
    fontSize: "9px",
    lineHeight: "1.6",
  },

  participantSection: {
    marginTop: "12px",
    padding: "11px 12px",
    borderRadius: "13px",
    background: "#f5f7f1",
  },

  participantHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: "#66745d",
    fontSize: "10px",
    fontWeight: "700",
  },

  participantCount: {
    color: "#94a08d",
    fontSize: "9px",
  },

  participantActions: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  copyAllButton: {
    width: "auto",
    padding: "7px 9px",
    border: "1px solid #dce7ce",
    borderRadius: "999px",
    background: "#eef6e3",
    color: "#61764f",
    fontSize: "8px",
    fontWeight: "900",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  participantToggle: {
    minWidth: "0",
    width: "auto",
    padding: "7px 11px",
    border: "1px solid #dce7ce",
    borderRadius: "999px",
    background: "#ffffff",
    color: "#61764f",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    fontSize: "9px",
    fontWeight: "900",
    cursor: "pointer",
  },

  linksLoading: {
    padding: "18px 5px",
    textAlign: "center",
    color: "#8b9286",
    fontSize: "10px",
  },

  noLinks: {
    padding: "18px 5px",
    textAlign: "center",
    color: "#8b9286",
    fontSize: "10px",
  },

  linkList: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    marginTop: "10px",
  },

  participantItem: {
    width: "100%",
    minHeight: "42px",
    padding: "7px 9px",
    border: "1px solid #e1e8d8",
    borderRadius: "11px",
    background: "#ffffff",
    display: "grid",
    gridTemplateColumns: "25px minmax(0, 1fr) 50px",
    alignItems: "center",
    gap: "7px",
    textAlign: "left",
    cursor: "pointer",
    boxSizing: "border-box",
  },

  participantNumber: {
    width: "24px",
    height: "24px",
    borderRadius: "8px",
    background: "#edf5df",
    color: "#71835e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "9px",
    fontWeight: "900",
  },

  participantName: {
    minWidth: 0,
    color: "#34432f",
    fontSize: "10px",
    fontWeight: "900",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  openLinkText: {
    color: "#6d8258",
    fontSize: "9px",
    fontWeight: "900",
    textAlign: "right",
    whiteSpace: "nowrap",
  },

  choiceGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "9px",
    marginTop: "15px",
  },

  choiceButton: {
    minHeight: "44px",
    border: "1px solid #e2e5dc",
    borderRadius: "13px",
    background: "#fafbf8",
    color: "#747b70",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "2px",
    fontSize: "10px",
    fontWeight: "800",
    cursor: "pointer",
  },

  choiceButtonActive: {
    background: "#eaf5d7",
    border: "1px solid #aacf69",
    color: "#4f6b36",
  },

  restrictedButtonActive: {
    background: "#eee7f6",
    border: "1px solid #cbb5df",
    color: "#715787",
  },

  choiceEmoji: {
    fontSize: "15px",
  },

  currentChoice: {
    marginTop: "10px",
    color: "#7a8175",
    fontSize: "9px",
    textAlign: "center",
  },

  clearButton: {
    width: "100%",
    marginTop: "7px",
    border: "none",
    background: "transparent",
    color: "#9a9d97",
    fontSize: "9px",
    textDecoration: "underline",
    cursor: "pointer",
  },

  saveButton: {
    width: "100%",
    padding: "14px",
    marginTop: "4px",
    border: "none",
    borderRadius: "16px",
    background: "#a9d95d",
    color: "#2d3b24",
    fontSize: "13px",
    fontWeight: "900",
    cursor: "pointer",
    boxShadow: "0 7px 18px rgba(124, 165, 65, 0.18)",
  },

  guideCard: {
    marginTop: "14px",
    padding: "16px",
    borderRadius: "18px",
    background: "#f1f4e9",
    color: "#687263",
    fontSize: "10px",
    lineHeight: "1.7",
  },

  closedCard: {
    padding: "15px",
    borderRadius: "16px",
    background: "#eeeeeb",
    color: "#777c73",
    textAlign: "center",
    fontSize: "11px",
    fontWeight: "900",
  },

  adminExemptBox: {
    marginBottom: "12px",
    padding: "12px 14px",
    borderRadius: "14px",
    background: "#f2ecfb",
    border: "1px solid #e2d5f3",
    color: "#72588b",
    fontSize: "10px",
    fontWeight: "900",
    textAlign: "center",
  },

  errorBox: {
    marginBottom: "12px",
    padding: "13px",
    borderRadius: "14px",
    background: "#fff0ed",
    color: "#a84d43",
    fontSize: "11px",
  },

  saveToastBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    background: "rgba(38, 48, 33, 0.16)",
    backdropFilter: "blur(2px)",
  },

  saveToast: {
    minWidth: "180px",
    padding: "22px 24px",
    borderRadius: "22px",
    background: "#ffffff",
    border: "1px solid #dce9ca",
    boxShadow: "0 16px 40px rgba(57, 76, 42, 0.18)",
    textAlign: "center",
  },

  saveToastIcon: {
    width: "38px",
    height: "38px",
    margin: "0 auto 9px",
    borderRadius: "50%",
    background: "#a9d95d",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: "900",
  },

  saveToastText: {
    color: "#3e5532",
    fontSize: "14px",
    fontWeight: "900",
  },

  saveSuccessBox: {
    margin: "12px 0 4px",
    padding: "14px 16px",
    borderRadius: "16px",
    background: "#edf6df",
    border: "1px solid #d5e8b8",
    color: "#527039",
    fontSize: "12px",
    fontWeight: "950",
    textAlign: "center",
    boxShadow: "0 8px 20px rgba(76, 104, 50, 0.08)",
  },

  successBox: {
    marginBottom: "12px",
    padding: "13px",
    borderRadius: "14px",
    background: "#edf6df",
    color: "#59733e",
    fontSize: "11px",
    fontWeight: "900",
  },

  emptyCard: {
    padding: "30px 20px",
    borderRadius: "23px",
    background: "#fff",
    textAlign: "center",
  },

  emptyIcon: {
    fontSize: "31px",
    marginBottom: "9px",
  },

  emptyText: {
    color: "#858b81",
    fontSize: "11px",
  },

  loadingCard: {
    marginTop: "100px",
    padding: "35px",
    borderRadius: "25px",
    background: "#fff",
    textAlign: "center",
  },

  loadingIcon: {
    fontSize: "40px",
  },

  loadingText: {
    color: "#7c8477",
    fontSize: "11px",
  },
};
