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

  const [loading, setLoading] = useState(true);
  const [eventLoading, setEventLoading] = useState(false);
  const [addingAll, setAddingAll] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const token = localStorage.getItem("jungle_follow_admin");

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
      localStorage.removeItem("jungle_follow_admin");
      router.replace("/admin");
      return;
    }

    setAdminToken(token);

    await loadEvents(token);

    setLoading(false);
  }

  async function loadEvents(token = adminToken) {
    if (!token) return;

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
      return;
    }

    setEvents(data || []);
    setEventLoading(false);
  }

  function getKoreaNow() {
    const now = new Date();

    const parts = new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "numeric",
        day: "numeric",
      }
    ).formatToParts(now);

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

  const currentKoreaDate = useMemo(
    () => getKoreaNow(),
    []
  );

  const currentEvent = useMemo(() => {
    return events.find(
      (event) =>
        Number(event.year) === currentKoreaDate.year &&
        Number(event.month) === currentKoreaDate.month
    );
  }, [events, currentKoreaDate]);

  async function createCurrentEvent() {
    if (!adminToken) return;

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

    await loadEvents(adminToken);
  }

  async function addAllActiveMembers() {
    if (!currentEvent) return;

    const ok = window.confirm(
      `현재 입장 중인 회원을 ${currentEvent.month}월 맞팔데이 대상에 전체 추가할까요?`
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
        `회원 전체 추가 실패: ${error.message}`
      );
      setAddingAll(false);
      return;
    }

    setMessage(
      "현재 입장 중인 회원을 맞팔데이에 추가했어요 💚"
    );

    setAddingAll(false);
  }

  function getEventStatus(event) {
    const now = new Date();
    const start = new Date(event.starts_at);
    const end = new Date(event.ends_at);

    if (now < start) {
      return {
        text: "예정",
        className: "upcoming",
      };
    }

    if (now >= end) {
      return {
        text: "마감",
        className: "closed",
      };
    }

    return {
      text: "진행중",
      className: "open",
    };
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
              onClick={() =>
                loadEvents(adminToken)
              }
              disabled={eventLoading}
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
            <div className="followEmpty">

              <div className="followEmptyIcon">
                🐯
              </div>

              <h3>
                아직 이번 달 맞팔데이가 없어요
              </h3>

              <p>
                생성하면 회원들이 맞팔데이
                투표에 참여할 수 있어요.
              </p>

              <button
                type="button"
                onClick={createCurrentEvent}
              >
                {currentKoreaDate.month}월 맞팔데이 생성
              </button>

            </div>
          ) : (
            <div className="followEventBox">

              <div className="followEventTop">
                <div>
                  <span className="followEventMini">
                    MONTHLY FOLLOW DAY
                  </span>

                  <h3>
                    {currentEvent.title ||
                      `${currentEvent.year}년 ${currentEvent.month}월 맞팔데이`}
                  </h3>
                </div>

                <span
                  className={`followEventStatus ${
                    getEventStatus(currentEvent)
                      .className
                  }`}
                >
                  {
                    getEventStatus(currentEvent)
                      .text
                  }
                </span>
              </div>

              <div className="followPeriod">
                <span>🗓️</span>

                <div>
                  <strong>투표 기간</strong>

                  <p>
                    매월 1일 00:00 ~
                    3일 23:59
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={addAllActiveMembers}
                disabled={addingAll}
              >
                {addingAll
                  ? "회원 추가 중..."
                  : "입장 회원 전체 추가"}
              </button>

            </div>
          )}

        </section>

        <section className="memberAdminCard">

          <h2>맞팔데이 운영 안내</h2>

          <div className="followGuide">

            <div>
              <span>1</span>

              <p>
                <strong>맞팔데이 생성</strong>
                <small>
                  매월 맞팔데이를 생성해요.
                </small>
              </p>
            </div>

            <div>
              <span>2</span>

              <p>
                <strong>참여 회원 등록</strong>
                <small>
                  현재 입장 회원을 맞팔 대상에
                  추가해요.
                </small>
              </p>
            </div>

            <div>
              <span>3</span>

              <p>
                <strong>회원 투표</strong>
                <small>
                  회원이 원하는 플랫폼을
                  직접 선택해요.
                </small>
              </p>
            </div>

            <div>
              <span>4</span>

              <p>
                <strong>3일 23:59 마감</strong>
                <small>
                  4일 00:00부터 최종 명단을
                  확인해요.
                </small>
              </p>
            </div>

          </div>

        </section>

      </section>
    </main>
  );
}
