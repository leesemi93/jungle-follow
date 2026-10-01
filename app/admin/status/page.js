"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const INSTAGRAM_FOLLOW_ACCOUNT = "_jungle_room__";

const PLATFORMS = [
  { key: "instagram", label: "인스타그램", icon: "📷" },
  { key: "blog", label: "블로그", icon: "📝" },
  { key: "naver_clip", label: "네이버 클립", icon: "🎬" },
  { key: "youtube", label: "유튜브", icon: "▶️" },
  { key: "tiktok", label: "틱톡", icon: "🎵" },
  { key: "today_house", label: "오늘의집", icon: "🏠" },
];

export default function AdminStatusPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [member, setMember] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");

  const [platform, setPlatform] = useState("instagram");
  const [statusTab, setStatusTab] = useState("all");

  const [counts, setCounts] = useState({
    total_members: 0,
    participate_count: 0,
    restricted_count: 0,
    not_voted_count: 0,
  });

  const [members, setMembers] = useState([]);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isInstagram = platform === "instagram";

  const statusTabs = useMemo(
    () => [
      { key: "all", label: "전체" },
      {
        key: "participate",
        label: isInstagram ? "맞팔완료" : "완료",
      },
      { key: "restricted", label: "제한" },
      {
        key: "not_voted",
        label: isInstagram ? "미투표" : "미완료",
      },
    ],
    [isInstagram]
  );

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;

    loadPlatformData(selectedEventId, platform);
  }, [selectedEventId, platform]);

  async function initialize() {
    setLoading(true);
    setErrorMessage("");

    const token = localStorage.getItem("jungle_follow_session");

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
      localStorage.removeItem("jungle_follow_session");
      localStorage.removeItem("jungle_follow_name");
      router.replace("/");
      return;
    }

    if (
      currentMember.admin_role !== "admin" &&
      currentMember.admin_role !== "super_admin"
    ) {
      router.replace("/member");
      return;
    }

    setMember(currentMember);

    await loadEvents(token);

    setLoading(false);
  }

  async function loadEvents(existingToken) {
    const token =
      existingToken ||
      localStorage.getItem("jungle_follow_session");

    const { data, error } = await supabase.rpc(
      "admin_get_follow_events",
      {
        p_session_token: token,
      }
    );

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const rows = Array.isArray(data) ? data : [];

    setEvents(rows);

    if (!rows.length) {
      setSelectedEventId("");
      setMembers([]);
      return;
    }

    const now = new Date();

    const koreaDate = new Date(
      now.toLocaleString("en-US", {
        timeZone: "Asia/Seoul",
      })
    );

    const year = koreaDate.getFullYear();
    const month = koreaDate.getMonth() + 1;

    const current = rows.find(
      (item) =>
        Number(item.year) === year &&
        Number(item.month) === month
    );

    setSelectedEventId(current?.id || rows[0].id);
  }

  async function loadPlatformData(eventId, platformKey) {
    const token = localStorage.getItem("jungle_follow_session");

    if (!token || !eventId) return;

    setListLoading(true);
    setErrorMessage("");

    const [countResult, statusResult] = await Promise.all([
      supabase.rpc("admin_get_platform_vote_counts", {
        p_session_token: token,
        p_event_id: eventId,
        p_platform: platformKey,
      }),

      supabase.rpc("admin_get_platform_vote_status", {
        p_session_token: token,
        p_event_id: eventId,
        p_platform: platformKey,
      }),
    ]);

    if (countResult.error) {
      setErrorMessage(countResult.error.message);
      setListLoading(false);
      return;
    }

    if (statusResult.error) {
      setErrorMessage(statusResult.error.message);
      setListLoading(false);
      return;
    }

    const countRow = Array.isArray(countResult.data)
      ? countResult.data[0]
      : countResult.data;

    setCounts({
      total_members: Number(countRow?.total_members || 0),
      participate_count: Number(
        countRow?.participate_count || 0
      ),
      restricted_count: Number(
        countRow?.restricted_count || 0
      ),
      not_voted_count: Number(
        countRow?.not_voted_count || 0
      ),
    });

    setMembers(
      Array.isArray(statusResult.data)
        ? statusResult.data
        : []
    );

    setListLoading(false);
  }

  async function createCurrentEvent() {
    const token = localStorage.getItem("jungle_follow_session");

    if (!token) {
      router.replace("/");
      return;
    }

    setCreating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const now = new Date();

      const koreaDate = new Date(
        now.toLocaleString("en-US", {
          timeZone: "Asia/Seoul",
        })
      );

      const year = koreaDate.getFullYear();
      const month = koreaDate.getMonth() + 1;

      const { error } = await supabase.rpc(
        "admin_create_follow_event",
        {
          p_session_token: token,
          p_year: year,
          p_month: month,
        }
      );

      if (error) throw error;

      setSuccessMessage(
        `${year}년 ${month}월 맞팔데이를 준비했어요 💚`
      );

      await loadEvents(token);
    } catch (error) {
      setErrorMessage(
        error?.message ||
          "맞팔데이 생성 중 오류가 발생했어요."
      );
    }

    setCreating(false);
  }

  async function refresh() {
    if (!selectedEventId) return;

    setSuccessMessage("");

    await loadPlatformData(selectedEventId, platform);
  }

  const selectedEvent = useMemo(
    () =>
      events.find((item) => item.id === selectedEventId) ||
      null,
    [events, selectedEventId]
  );

  const filteredMembers = useMemo(() => {
    if (statusTab === "all") return members;

    return members.filter(
      (item) => item.vote_status === statusTab
    );
  }, [members, statusTab]);

  function getStatusCount(key) {
    if (key === "all") return counts.total_members;

    if (key === "participate") {
      return counts.participate_count;
    }

    if (key === "restricted") {
      return counts.restricted_count;
    }

    return counts.not_voted_count;
  }

  function getStatusLabel(status) {
    if (status === "participate") {
      return isInstagram ? "맞팔완료" : "완료";
    }

    if (status === "restricted") {
      return "제한";
    }

    return isInstagram ? "미투표" : "미완료";
  }

  function statusStyle(status) {
    if (status === "participate") {
      return styles.participateBadge;
    }

    if (status === "restricted") {
      return styles.restrictedBadge;
    }

    return styles.notVotedBadge;
  }

  function accountText(item) {
    if (platform === "instagram") {
      const value =
        item.account_value ||
        item.instagram_id ||
        "";

      return value.startsWith("@")
        ? value
        : `@${value}`;
    }

    return item.account_value || "-";
  }

  function openInstagramFollowAccount() {
    window.open(
      `https://www.instagram.com/${INSTAGRAM_FOLLOW_ACCOUNT}/`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function openAccount(item) {
    if (platform === "instagram") {
      const id = (
        item.account_value ||
        item.instagram_id ||
        ""
      )
        .replace(/^@/, "")
        .trim();

      if (!id) return;

      window.open(
        `https://www.instagram.com/${id}/`,
        "_blank",
        "noopener,noreferrer"
      );

      return;
    }

    let value = item.account_value;

    if (!value) return;

    if (
      !value.startsWith("http://") &&
      !value.startsWith("https://")
    ) {
      value = `https://${value}`;
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
            <div style={styles.loadingIcon}>🐯</div>

            <p style={styles.loadingText}>
              맞팔 현황 불러오는 중...
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.container}>
        <button
          type="button"
          style={styles.backButton}
          onClick={() => router.push("/admin/dashboard")}
        >
          ← 관리자 메뉴
        </button>

        <div style={styles.header}>
          <div style={styles.topBadge}>
            ADMIN · STATUS
          </div>

          <div style={styles.tiger}>🐯</div>

          <h1 style={styles.title}>
            참여 현황
          </h1>

          <p style={styles.subtitle}>
            회원별 완료 · 제한 · 미완료 현황을 확인해요 🌿
          </p>
        </div>

        {member && (
          <div style={styles.adminInfo}>
            <div>
              <strong>{member.kakao_nickname}</strong>

              <span style={styles.adminId}>
                @{member.instagram_id}
              </span>
            </div>

            <span style={styles.roleBadge}>
              {member.admin_role === "super_admin"
                ? "👑 최고관리자"
                : "♛ 관리자"}
            </span>
          </div>
        )}

        {errorMessage && (
          <div style={styles.errorBox}>
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div style={styles.successBox}>
            {successMessage}
          </div>
        )}

        {events.length === 0 ? (
          <div style={styles.emptyCard}>
            <div style={styles.emptyIcon}>🌿</div>

            <strong>
              이번 달 맞팔데이가 없어요.
            </strong>

            <p style={styles.emptyText}>
              맞팔데이를 생성하면 바로 참여를 받을 수 있어요.
            </p>

            <button
              type="button"
              onClick={createCurrentEvent}
              disabled={creating}
              style={styles.createButton}
            >
              {creating
                ? "생성 중..."
                : "이번 달 맞팔데이 생성"}
            </button>
          </div>
        ) : (
          <>
            <div style={styles.eventCard}>
              <div style={styles.eventTop}>
                <div>
                  <div style={styles.eventLabel}>
                    EVENT
                  </div>

                  <strong style={styles.eventTitle}>
                    {selectedEvent
                      ? `${selectedEvent.year}년 ${selectedEvent.month}월 맞팔데이`
                      : "맞팔데이"}
                  </strong>
                </div>

                <span
                  style={
                    selectedEvent?.is_open
                      ? styles.openBadge
                      : styles.closedBadge
                  }
                >
                  {selectedEvent?.is_open
                    ? "진행중"
                    : "마감"}
                </span>
              </div>

              {events.length > 1 && (
                <select
                  value={selectedEventId}
                  onChange={(e) => {
                    setSelectedEventId(e.target.value);
                    setStatusTab("all");
                  }}
                  style={styles.select}
                >
                  {events.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.year}년 {item.month}월
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={styles.platformSection}>
              <div style={styles.sectionLabel}>
                플랫폼
              </div>

              <div style={styles.platformTabs}>
                {PLATFORMS.map((item) => {
                  const active =
                    platform === item.key;

                  return (
                    <button
                      type="button"
                      key={item.key}
                      onClick={() => {
                        setPlatform(item.key);
                        setStatusTab("all");
                      }}
                      style={{
                        ...styles.platformTab,
                        ...(active
                          ? styles.platformTabActive
                          : {}),
                      }}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {isInstagram && (
              <div style={styles.instagramFollowCard}>
                <div>
                  <span style={styles.instagramSmall}>
                    인스타그램 맞팔계정
                  </span>

                  <strong style={styles.instagramAccount}>
                    @{INSTAGRAM_FOLLOW_ACCOUNT}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={openInstagramFollowAccount}
                  style={styles.instagramOpenButton}
                >
                  계정 열기 ↗
                </button>
              </div>
            )}

            <div style={styles.countGrid}>
              <div style={styles.countCard}>
                <span style={styles.countLabel}>
                  전체
                </span>
                <strong style={styles.countNumber}>
                  {counts.total_members}
                </strong>
              </div>

              <div style={styles.countCard}>
                <span style={styles.countLabel}>
                  {isInstagram ? "맞팔완료" : "완료"}
                </span>
                <strong style={styles.countNumber}>
                  {counts.participate_count}
                </strong>
              </div>

              <div style={styles.countCard}>
                <span style={styles.countLabel}>
                  제한
                </span>
                <strong style={styles.countNumber}>
                  {counts.restricted_count}
                </strong>
              </div>

              <div style={styles.countCard}>
                <span style={styles.countLabel}>
                  {isInstagram ? "미투표" : "미완료"}
                </span>
                <strong style={styles.countNumber}>
                  {counts.not_voted_count}
                </strong>
              </div>
            </div>

            <div style={styles.statusTabs}>
              {statusTabs.map((item) => {
                const active =
                  statusTab === item.key;

                return (
                  <button
                    type="button"
                    key={item.key}
                    onClick={() =>
                      setStatusTab(item.key)
                    }
                    style={{
                      ...styles.statusTab,
                      ...(active
                        ? styles.statusTabActive
                        : {}),
                    }}
                  >
                    {item.label}

                    <span style={styles.statusCount}>
                      {getStatusCount(item.key)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={styles.listHeader}>
              <strong style={styles.listTitle}>
                회원 명단
              </strong>

              <button
                type="button"
                onClick={refresh}
                style={styles.refreshButton}
              >
                새로고침
              </button>
            </div>

            {listLoading ? (
              <div style={styles.listLoading}>
                명단 불러오는 중...
              </div>
            ) : filteredMembers.length === 0 ? (
              <div style={styles.noMember}>
                해당 회원이 없어요 🌿
              </div>
            ) : (
              <div style={styles.memberList}>
                {filteredMembers.map((item) => (
                  <div
                    key={item.member_id}
                    style={styles.memberCardItem}
                  >
                    <div style={styles.memberTop}>
                      <div style={styles.avatar}>
                        {item.kakao_nickname
                          ?.slice(0, 1)
                          ?.toUpperCase() || "🌿"}
                      </div>

                      <div style={styles.memberInfo}>
                        <div style={styles.nameRow}>
                          <strong style={styles.memberName}>
                            {item.kakao_nickname}
                          </strong>

                          <span
                            style={statusStyle(
                              item.vote_status
                            )}
                          >
                            {getStatusLabel(
                              item.vote_status
                            )}
                          </span>
                        </div>

                        <div style={styles.instagramId}>
                          @{item.instagram_id}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        openAccount(item)
                      }
                      style={styles.accountButton}
                    >
                      <span style={styles.accountValue}>
                        {accountText(item)}
                      </span>

                      <span>열기 ↗</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={styles.guide}>
              <strong>🌿 현황 기준</strong>

              {isInstagram ? (
                <>
                  <p>
                    <b>맞팔완료</b> : 인스타그램 맞팔을
                    완료한 회원
                    <br />
                    <b>제한</b> : 팔로우 제한 등으로
                    이번 달 맞팔이 어려운 회원
                    <br />
                    <b>미투표</b> : 아직 맞팔완료 또는
                    제한을 선택하지 않은 회원
                  </p>

                  <p>
                    인스타그램은{" "}
                    <b>
                      @{INSTAGRAM_FOLLOW_ACCOUNT}
                    </b>{" "}
                    계정을 기준으로 맞팔을 진행합니다.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <b>참여</b> : 해당 플랫폼 맞팔 참여를
                    선택한 회원
                    <br />
                    <b>제한</b> : 해당 플랫폼 참여 제한을
                    선택한 회원
                    <br />
                    <b>미참여</b> : 아직 선택하지 않은 회원
                  </p>

                  <p>
                    해당 플랫폼 링크가 등록된 입장 회원만
                    집계됩니다.
                  </p>
                </>
              )}
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
    padding: "24px 15px 60px",
    color: "#273426",
  },

  container: {
    width: "100%",
    maxWidth: "520px",
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
    margin: "14px 0 22px",
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
    fontSize: "28px",
    fontWeight: "950",
    letterSpacing: "-1px",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#7c8577",
    fontSize: "12px",
  },

  adminInfo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    padding: "14px 16px",
    background: "#fff",
    border: "1px solid #ebe9df",
    borderRadius: "18px",
    marginBottom: "12px",
    fontSize: "13px",
  },

  adminId: {
    display: "block",
    marginTop: "3px",
    color: "#858b81",
    fontSize: "10px",
  },

  roleBadge: {
    padding: "6px 9px",
    borderRadius: "999px",
    background: "#fff1ca",
    color: "#85651d",
    fontSize: "9px",
    fontWeight: "950",
  },

  eventCard: {
    padding: "17px",
    borderRadius: "21px",
    background: "#fff",
    border: "1px solid #e7e6dc",
    marginBottom: "12px",
  },

  eventTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
  },

  eventLabel: {
    color: "#91a46f",
    fontSize: "9px",
    fontWeight: "950",
    letterSpacing: "1.2px",
    marginBottom: "4px",
  },

  eventTitle: {
    fontSize: "16px",
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

  select: {
    width: "100%",
    marginTop: "13px",
    padding: "11px 12px",
    border: "1px solid #dfe4d7",
    borderRadius: "13px",
    background: "#fafbf7",
    color: "#46503f",
    fontSize: "12px",
  },

  platformSection: {
    padding: "15px",
    borderRadius: "21px",
    background: "#fff",
    border: "1px solid #e7e6dc",
    marginBottom: "12px",
  },

  sectionLabel: {
    marginBottom: "10px",
    color: "#77826d",
    fontSize: "10px",
    fontWeight: "950",
  },

  platformTabs: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "7px",
  },

  platformTab: {
    minHeight: "57px",
    padding: "8px 5px",
    border: "1px solid #e1e5da",
    borderRadius: "14px",
    background: "#fafbf8",
    color: "#697264",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    fontSize: "10px",
    fontWeight: "900",
    cursor: "pointer",
  },

  platformTabActive: {
    background: "#eaf4d7",
    border: "1px solid #b9d77c",
    color: "#435b2c",
  },

  instagramFollowCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "15px 16px",
    borderRadius: "18px",
    background: "#edf5df",
    border: "1px solid #d8e8bd",
    marginBottom: "12px",
  },

  instagramSmall: {
    display: "block",
    color: "#718163",
    fontSize: "9px",
    fontWeight: "900",
    marginBottom: "3px",
  },

  instagramAccount: {
    fontSize: "13px",
    color: "#40552f",
  },

  instagramOpenButton: {
    flexShrink: 0,
    border: "none",
    borderRadius: "11px",
    background: "#fff",
    padding: "9px 10px",
    color: "#5f744c",
    fontSize: "9px",
    fontWeight: "900",
    cursor: "pointer",
  },

  countGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "7px",
    marginBottom: "12px",
  },

  countCard: {
    padding: "12px 3px",
    borderRadius: "16px",
    background: "#fff",
    border: "1px solid #e7e6dc",
    textAlign: "center",
  },

  countLabel: {
    display: "block",
    color: "#858b81",
    fontSize: "8px",
    fontWeight: "900",
    whiteSpace: "nowrap",
  },

  countNumber: {
    display: "block",
    marginTop: "4px",
    color: "#35442e",
    fontSize: "19px",
    fontWeight: "950",
  },

  statusTabs: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    padding: "4px",
    borderRadius: "16px",
    background: "#e9ede2",
    gap: "4px",
    marginBottom: "17px",
  },

  statusTab: {
    border: "none",
    borderRadius: "12px",
    padding: "10px 2px",
    background: "transparent",
    color: "#70776b",
    fontSize: "9px",
    fontWeight: "900",
    whiteSpace: "nowrap",
    cursor: "pointer",
  },

  statusTabActive: {
    background: "#fff",
    color: "#3d4f32",
    boxShadow: "0 2px 8px rgba(55,70,44,0.08)",
  },

  statusCount: {
    marginLeft: "3px",
    fontSize: "9px",
  },

  listHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    margin: "0 3px 9px",
    minHeight: "34px",
  },

  listTitle: {
    flexShrink: 0,
    whiteSpace: "nowrap",
    fontSize: "13px",
  },

  refreshButton: {
    border: "none",
    borderRadius: "11px",
    background: "#f3f5ed",
    color: "#738662",
    padding: "8px 12px",
    fontSize: "9px",
    fontWeight: "900",
    cursor: "pointer",
  },

  memberList: {
    display: "grid",
    gap: "9px",
  },

  memberCardItem: {
    padding: "14px",
    borderRadius: "19px",
    background: "#fff",
    border: "1px solid #e7e6dc",
  },

  memberTop: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  avatar: {
    width: "41px",
    height: "41px",
    borderRadius: "13px",
    background: "#edf4df",
    color: "#597043",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "15px",
    fontWeight: "950",
    flexShrink: 0,
  },

  memberInfo: {
    minWidth: 0,
    flex: 1,
  },

  nameRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "6px",
  },

  memberName: {
    fontSize: "13px",
  },

  instagramId: {
    marginTop: "3px",
    color: "#868c82",
    fontSize: "10px",
  },

  participateBadge: {
    padding: "4px 7px",
    borderRadius: "999px",
    background: "#e5f3cf",
    color: "#5b773d",
    fontSize: "8px",
    fontWeight: "950",
  },

  restrictedBadge: {
    padding: "4px 7px",
    borderRadius: "999px",
    background: "#eee6f7",
    color: "#75598c",
    fontSize: "8px",
    fontWeight: "950",
  },

  notVotedBadge: {
    padding: "4px 7px",
    borderRadius: "999px",
    background: "#efefec",
    color: "#7b7d77",
    fontSize: "8px",
    fontWeight: "950",
  },

  accountButton: {
    width: "100%",
    marginTop: "11px",
    padding: "10px 11px",
    border: "none",
    borderRadius: "12px",
    background: "#f3f6ec",
    color: "#607052",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    fontSize: "9px",
    fontWeight: "850",
    cursor: "pointer",
  },

  accountValue: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    textAlign: "left",
  },

  listLoading: {
    padding: "30px",
    borderRadius: "19px",
    background: "#fff",
    textAlign: "center",
    color: "#7c8477",
    fontSize: "11px",
  },

  noMember: {
    padding: "28px",
    borderRadius: "19px",
    background: "#fff",
    border: "1px solid #e7e6dc",
    textAlign: "center",
    color: "#7c8477",
    fontSize: "11px",
  },

  guide: {
    marginTop: "16px",
    padding: "16px",
    borderRadius: "18px",
    background: "#f1f4e9",
    color: "#687263",
    fontSize: "10px",
    lineHeight: "1.7",
  },

  errorBox: {
    marginBottom: "12px",
    padding: "13px",
    borderRadius: "14px",
    background: "#fff0ed",
    color: "#a84d43",
    fontSize: "11px",
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
    border: "1px solid #e7e6dc",
    textAlign: "center",
  },

  emptyIcon: {
    fontSize: "31px",
    marginBottom: "9px",
  },

  emptyText: {
    margin: "8px 0 17px",
    color: "#858b81",
    fontSize: "11px",
  },

  createButton: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "15px",
    background: "#a9d95d",
    color: "#2d3b24",
    fontSize: "12px",
    fontWeight: "950",
    cursor: "pointer",
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
    margin: "10px 0 0",
    color: "#7c8477",
    fontSize: "11px",
  },
};
