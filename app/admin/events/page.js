"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function EventsPage() {
  const router = useRouter();

  const [adminToken, setAdminToken] = useState("");
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [eventLoading, setEventLoading] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [addingAll, setAddingAll] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

  function getKoreaNow() {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).formatToParts(new Date());

    const values = {};

    parts.forEach((part) => {
      if (part.type !== "literal") {
        values[part.type] = Number(part.value);
      }
    });

    return {
      year: values.year,
      month: values.month,
      day: values.day,
    };
  }

  const currentKoreaDate = useMemo(() => {
    return getKoreaNow();
  }, []);

  const currentEvent = useMemo(() => {
    return events.find(
      (event) =>
        Number(event.year) === currentKoreaDate.year &&
        Number(event.month) === currentKoreaDate.month
    );
  }, [events, currentKoreaDate]);

  const participantCount = useMemo(() => {
    return members.filter(
      (member) => member.is_participant
    ).length;
  }, [members]);

  const notParticipantCount = useMemo(() => {
    return members.filter(
      (member) =>
        !member.is_participant &&
        member.member_status === "active"
    ).length;
  }, [members]);

  const filteredMembers = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase()
      .replace(/^@/, "");

    return members.filter((member) => {
      if (
        filter === "participant" &&
        !member.is_participant
      ) {
        return false;
      }

      if (
        filter === "notParticipant" &&
        member.is_participant
      ) {
        return false;
      }

      if (
        filter === "notParticipant" &&
        member.member_status !== "active"
      ) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const nickname = (
        member.kakao_nickname || ""
      ).toLowerCase();

      const instagram = (
        member.instagram_id || ""
      ).toLowerCase();

      return (
        nickname.includes(keyword) ||
        instagram.includes(keyword)
      );
    });
  }, [members, search, filter]);

  async function checkAdmin() {
    const token = localStorage.getItem(
      "jungle_follow_admin"
    );

    if (!token) {
      router.replace("/admin");
      return;
    }

    const { data, error } = await supabase.rpc(
      "get_current_admin",
      {
        p_session_token: token,
      }
    );

    if (error || !data?.length) {
      localStorage.removeItem(
        "jungle_follow_admin"
      );

      router.replace("/admin");
      return;
    }

    setAdminToken(token);

    const loadedEvents = await loadEvents(token);

    if (loadedEvents) {
      const event = loadedEvents.find(
        (item) =>
          Number(item.year) ===
            currentKoreaDate.year &&
          Number(item.month) ===
            currentKoreaDate.month
      );

      if (event) {
        await loadEventMembers(
          token,
          event.id
        );
      }
    }

    setLoading(false);
  }

  async function loadEvents(token = adminToken) {
    if (!token) return [];

    setEventLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "admin_get_follow_events",
      {
        p_session_token: token,
      }
    );

    if (error) {
      setErrorMessage(
        `맞팔데이를 불러오지 못했어요: ${error.message}`
      );

      setEventLoading(false);
      return [];
    }

    const list = data || [];

    setEvents(list);
    setEventLoading(false);

    return list;
  }

  async function loadEventMembers(
    token = adminToken,
    eventId = currentEvent?.id
  ) {
    if (!token || !eventId) {
      setMembers([]);
      return;
    }

    setMemberLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "admin_get_follow_event_members",
      {
        p_session_token: token,
        p_event_id: eventId,
      }
    );

    if (error) {
      setErrorMessage(
        `참여 회원을 불러오지 못했어요: ${error.message}`
      );

      setMemberLoading(false);
      return;
    }

    setMembers(data || []);
    setMemberLoading(false);
  }

  async function refreshEverything() {
    const list = await loadEvents(adminToken);

    const event = list.find(
      (item) =>
        Number(item.year) ===
          currentKoreaDate.year &&
        Number(item.month) ===
          currentKoreaDate.month
    );

    if (event) {
      await loadEventMembers(
        adminToken,
        event.id
      );
    } else {
      setMembers([]);
    }
  }

  async function createCurrentEvent() {
    const year = currentKoreaDate.year;
    const month = currentKoreaDate.month;

    const ok = window.confirm(
      `${year}년 ${month}월 맞팔데이를 생성할까요?`
    );

    if (!ok) return;

    setEventLoading(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "admin_create_follow_event",
      {
        p_session_token: adminToken,
        p_year: year,
        p_month: month,
      }
    );

    if (error) {
      setErrorMessage(
        `맞팔데이 생성 실패: ${error.message}`
      );

      setEventLoading(false);
      return;
    }

    setMessage(
      `${year}년 ${month}월 맞팔데이가 생성됐어요 💚`
    );

    await refreshEverything();

    setEventLoading(false);
  }

  async function addAllActiveMembers() {
    if (!currentEvent) return;

    const ok = window.confirm(
      `현재 입장 중인 회원을 ${currentEvent.month}월 맞팔데이에 전체 추가할까요?`
    );

    if (!ok) return;

    setAddingAll(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "admin_add_all_active_members",
      {
        p_session_token: adminToken,
        p_event_id: currentEvent.id,
      }
    );

    if (error) {
      setErrorMessage(
        `전체 추가 실패: ${error.message}`
      );

      setAddingAll(false);
      return;
    }

    setMessage(
      "현재 입장 중인 회원을 모두 추가했어요 💚"
    );

    await loadEventMembers(
      adminToken,
      currentEvent.id
    );

    setAddingAll(false);
  }

  async function addMember(member) {
    if (!currentEvent) return;

    setActionLoading(member.member_id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "admin_add_follow_member",
      {
        p_session_token: adminToken,
        p_event_id: currentEvent.id,
        p_member_id: member.member_id,
      }
    );

    if (error) {
      setErrorMessage(
        `${member.kakao_nickname}님 추가 실패: ${error.message}`
      );

      setActionLoading("");
      return;
    }

    setMessage(
      `${member.kakao_nickname}님을 맞팔데이에 추가했어요 💚`
    );

    await loadEventMembers(
      adminToken,
      currentEvent.id
    );

    setActionLoading("");
  }

  async function removeMember(member) {
    if (!currentEvent) return;

    const ok = window.confirm(
      `${member.kakao_nickname}님을 이번 맞팔데이에서 제외할까요?`
    );

    if (!ok) return;

    setActionLoading(member.member_id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "admin_remove_follow_member",
      {
        p_session_token: adminToken,
        p_event_id: currentEvent.id,
        p_member_id: member.member_id,
      }
    );

    if (error) {
      setErrorMessage(
        `${member.kakao_nickname}님 제외 실패: ${error.message}`
      );

      setActionLoading("");
      return;
    }

    setMessage(
      `${member.kakao_nickname}님을 이번 맞팔데이에서 제외했어요.`
    );

    await loadEventMembers(
      adminToken,
      currentEvent.id
    );

    setActionLoading("");
  }

  function getEventStatus(event) {
    const now = new Date();
    const start = new Date(event.starts_at);
    const end = new Date(event.ends_at);

    if (now < start) {
      return "예정";
    }

    if (now >= end) {
      return "마감";
    }

    return "진행중";
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

        <div className="memberPageHeader">
          <button
            type="button"
            className="backButton"
            onClick={() =>
              router.push("/admin/dashboard")
            }
          >
            ←
          </button>

          <div>
            <span className="dashboardBadge">
              FOLLOW DAY
            </span>

            <h1 className="memberPageTitle">
              맞팔데이 관리 🌿
            </h1>

            <p className="dashboardHello">
              매월 맞팔데이와 참여 회원을 관리해요.
            </p>
          </div>
        </div>

        {message && (
          <p className="message">
            {message}
          </p>
        )}

        {errorMessage && (
          <p className="memberError">
            {errorMessage}
          </p>
        )}

        <section className="memberAdminCard">

          <div className="memberListTop">
            <div>
              <h2>
                {currentKoreaDate.year}년{" "}
                {currentKoreaDate.month}월
              </h2>

              <p className="memberCount">
                이번 달 맞팔데이
              </p>
            </div>

            <button
              type="button"
              className="refreshButton"
              onClick={refreshEverything}
              disabled={
                eventLoading ||
                memberLoading
              }
            >
              ↻ 새로고침
            </button>
          </div>

          {eventLoading ? (
            <div className="emptyMembers">
              <span>🌿</span>
              <strong>
                맞팔데이 확인 중...
              </strong>
            </div>
          ) : !currentEvent ? (
            <div
              style={{
                padding: "28px 0 4px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "34px",
                  marginBottom: "10px",
                }}
              >
                🐯
              </div>

              <h3
                style={{
                  margin: "0 0 8px",
                }}
              >
                아직 이번 달 맞팔데이가 없어요
              </h3>

              <p
                style={{
                  margin: "0 0 24px",
                  fontSize: "13px",
                  opacity: 0.65,
                }}
              >
                맞팔데이를 먼저 생성해주세요.
              </p>

              <button
                type="button"
                onClick={createCurrentEvent}
              >
                {currentKoreaDate.month}월 맞팔데이 생성
              </button>
            </div>
          ) : (
            <>
              <div
                style={{
                  marginTop: "18px",
                  padding: "18px",
                  borderRadius: "18px",
                  background: "#f7f8ef",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: "800",
                        color: "#799458",
                        marginBottom: "5px",
                      }}
                    >
                      MONTHLY FOLLOW DAY
                    </div>

                    <strong
                      style={{
                        fontSize: "17px",
                      }}
                    >
                      {currentEvent.year}년{" "}
                      {currentEvent.month}월 맞팔데이
                    </strong>
                  </div>

                  <span
                    className="memberStatus active"
                  >
                    {getEventStatus(
                      currentEvent
                    )}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: "16px",
                    paddingTop: "14px",
                    borderTop:
                      "1px solid #e3e8d8",
                  }}
                >
                  <small
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      opacity: 0.6,
                    }}
                  >
                    투표 기간
                  </small>

                  <strong>
                    {currentEvent.month}월 1일
                    00:00 ~{" "}
                    {currentEvent.month}월 3일
                    23:59
                  </strong>
                </div>
              </div>
            </>
          )}

        </section>

        {currentEvent && (
          <section className="memberAdminCard">

            <div className="memberListTop">
              <div>
                <h2>참여 대상 회원</h2>

                <p className="memberCount">
                  참여 {participantCount}명 ·
                  미참여 {notParticipantCount}명
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={addAllActiveMembers}
              disabled={addingAll}
              style={{
                marginBottom: "18px",
              }}
            >
              {addingAll
                ? "전체 추가 중..."
                : "입장 회원 전체 추가"}
            </button>

            <div className="memberSearchWrap">
              <span>🔎</span>

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="닉네임 또는 인스타 아이디 검색"
              />
            </div>

            <div
              className="memberFilters"
              style={{
                gridTemplateColumns:
                  "repeat(3, 1fr)",
              }}
            >
              <button
                type="button"
                className={
                  filter === "all"
                    ? "memberFilter active"
                    : "memberFilter"
                }
                onClick={() =>
                  setFilter("all")
                }
              >
                전체
              </button>

              <button
                type="button"
                className={
                  filter === "participant"
                    ? "memberFilter active"
                    : "memberFilter"
                }
                onClick={() =>
                  setFilter("participant")
                }
              >
                참여중
              </button>

              <button
                type="button"
                className={
                  filter === "notParticipant"
                    ? "memberFilter active"
                    : "memberFilter"
                }
                onClick={() =>
                  setFilter(
                    "notParticipant"
                  )
                }
              >
                미참여
              </button>
            </div>

            {memberLoading ? (
              <div className="emptyMembers">
                <span>🌿</span>

                <strong>
                  회원 목록 불러오는 중...
                </strong>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="emptyMembers">
                <span>🐯</span>

                <strong>
                  표시할 회원이 없어요.
                </strong>
              </div>
            ) : (
              <div className="membersList">

                {filteredMembers.map(
                  (member) => (
                    <div
                      className="memberItem"
                      key={member.member_id}
                    >
                      <div className="memberAvatar">
                        {member.kakao_nickname
                          ?.charAt(0) ||
                          "🌿"}
                      </div>

                      <div className="memberInfo">

                        <div className="memberNameRow">
                          <strong>
                            {
                              member.kakao_nickname
                            }
                          </strong>

                          {member.is_participant ? (
                            <span className="memberStatus active">
                              참여중
                            </span>
                          ) : (
                            <span className="memberStatus inactive">
                              미참여
                            </span>
                          )}
                        </div>

                        <p>
                          @{member.instagram_id}
                        </p>

                        {member.member_status ===
                          "inactive" && (
                          <small>
                            현재 퇴장 회원
                          </small>
                        )}

                        <div className="memberActions">

                          {member.is_participant ? (
                            <button
                              type="button"
                              className="memberAction leave"
                              disabled={
                                actionLoading ===
                                member.member_id
                              }
                              onClick={() =>
                                removeMember(
                                  member
                                )
                              }
                            >
                              제외
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="memberAction rejoin"
                              disabled={
                                actionLoading ===
                                member.member_id
                              }
                              onClick={() =>
                                addMember(member)
                              }
                            >
                              추가
                            </button>
                          )}

                        </div>
                      </div>
                    </div>
                  )
                )}

              </div>
            )}

          </section>
        )}

      </section>
    </main>
  );
}
