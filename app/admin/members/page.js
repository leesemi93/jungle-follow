"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PLATFORMS = [
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

function emptyLinks() {
  return {
    blog: "",
    naver_clip: "",
    youtube: "",
    tiktok: "",
    today_house: "",
  };
}

export default function AdminMembersPage() {
  const router = useRouter();

  const [adminToken, setAdminToken] = useState("");

  const [members, setMembers] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] =
    useState(true);

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [showAddForm, setShowAddForm] =
    useState(false);

  const [newNickname, setNewNickname] =
    useState("");
  const [newInstagram, setNewInstagram] =
    useState("");
  const [newMemo, setNewMemo] = useState("");
  const [newLinks, setNewLinks] =
    useState(emptyLinks());

  const [adding, setAdding] = useState(false);

  const [editingMemberId, setEditingMemberId] =
    useState(null);

  const [editingLinks, setEditingLinks] =
    useState(emptyLinks());

  const [linksLoading, setLinksLoading] =
    useState(false);

  const [linksSaving, setLinksSaving] =
    useState(false);

  const [actionLoadingId, setActionLoadingId] =
    useState(null);

  const [requestLoadingId, setRequestLoadingId] =
    useState(null);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const token = localStorage.getItem(
      "jungle_follow_admin"
    );

    if (!token) {
      router.replace("/admin");
      return;
    }

    setAdminToken(token);

    const { error } = await supabase.rpc(
      "get_current_admin",
      {
        p_session_token: token,
      }
    );

    if (error) {
      localStorage.removeItem(
        "jungle_follow_admin"
      );

      router.replace("/admin");
      return;
    }

    await Promise.all([
      loadMembers(token),
      loadJoinRequests(token),
    ]);
  }

  async function loadMembers(token = adminToken) {
    if (!token) return;

    setLoading(true);

    const { data, error } = await supabase.rpc(
      "admin_get_members",
      {
        p_session_token: token,
      }
    );

    if (error) {
      setErrorMessage(
        error.message ||
          "회원 목록을 불러오지 못했습니다."
      );

      setLoading(false);
      return;
    }

    setMembers(data || []);
    setLoading(false);
  }

  async function loadJoinRequests(
    token = adminToken
  ) {
    if (!token) return;

    setRequestsLoading(true);

    const { data, error } = await supabase.rpc(
      "admin_get_join_requests",
      {
        p_session_token: token,
      }
    );

    if (error) {
      setErrorMessage(
        error.message ||
          "가입신청 목록을 불러오지 못했습니다."
      );

      setRequestsLoading(false);
      return;
    }

    const pending = (data || []).filter(
      (item) => item.status === "pending"
    );

    setJoinRequests(pending);
    setRequestsLoading(false);
  }

  function normalizeInstagram(value) {
    return value.trim().replace(/^@/, "");
  }

  function changeNewLink(platform, value) {
    setNewLinks((prev) => ({
      ...prev,
      [platform]: value,
    }));
  }

  function changeEditingLink(platform, value) {
    setEditingLinks((prev) => ({
      ...prev,
      [platform]: value,
    }));
  }

  async function refreshAll() {
    setMessage("");
    setErrorMessage("");

    await Promise.all([
      loadMembers(adminToken),
      loadJoinRequests(adminToken),
    ]);
  }

  // =====================================================
  // 가입신청 승인
  // =====================================================

  async function approveRequest(request) {
    const confirmed = window.confirm(
      `${request.kakao_nickname}님의 가입을 승인할까요?\n\n승인하면 바로 입장 회원으로 등록됩니다.`
    );

    if (!confirmed) return;

    setRequestLoadingId(request.request_id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "admin_approve_join_request",
      {
        p_session_token: adminToken,
        p_request_id: request.request_id,
        p_admin_memo: null,
      }
    );

    if (error) {
      setErrorMessage(
        error.message ||
          "가입 승인 중 오류가 발생했습니다."
      );

      setRequestLoadingId(null);
      return;
    }

    setMessage(
      `${request.kakao_nickname}님의 가입을 승인했습니다. 💚`
    );

    await Promise.all([
      loadMembers(adminToken),
      loadJoinRequests(adminToken),
    ]);

    setRequestLoadingId(null);
  }

  // =====================================================
  // 가입신청 거절
  // =====================================================

  async function rejectRequest(request) {
    const reason = window.prompt(
      `${request.kakao_nickname}님의 가입신청을 거절할까요?\n\n거절 사유 또는 메모를 입력해주세요.\n필요 없으면 빈칸으로 확인을 눌러주세요.`
    );

    if (reason === null) return;

    const confirmed = window.confirm(
      `${request.kakao_nickname}님의 가입신청을 정말 거절할까요?`
    );

    if (!confirmed) return;

    setRequestLoadingId(request.request_id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "admin_reject_join_request",
      {
        p_session_token: adminToken,
        p_request_id: request.request_id,
        p_admin_memo: reason.trim() || null,
      }
    );

    if (error) {
      setErrorMessage(
        error.message ||
          "가입 거절 중 오류가 발생했습니다."
      );

      setRequestLoadingId(null);
      return;
    }

    setMessage(
      `${request.kakao_nickname}님의 가입신청을 거절했습니다.`
    );

    await loadJoinRequests(adminToken);

    setRequestLoadingId(null);
  }

  // =====================================================
  // 관리자 직접 회원 추가
  // =====================================================

  async function handleAddMember(event) {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");

    const nickname = newNickname.trim();

    const instagram =
      normalizeInstagram(newInstagram);

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

    setAdding(true);

    try {
      const { data: memberId, error } =
        await supabase.rpc("add_member", {
          p_session_token: adminToken,
          p_kakao_nickname: nickname,
          p_instagram_id: instagram,
          p_admin_memo:
            newMemo.trim() || null,
        });

      if (error) {
        throw error;
      }

      if (!memberId) {
        throw new Error(
          "회원 ID를 확인할 수 없습니다."
        );
      }

      for (const platform of PLATFORMS) {
        const value =
          newLinks[platform.key]?.trim() || "";

        if (!value) continue;

        const { error: linkError } =
          await supabase.rpc(
            "admin_set_member_platform_link",
            {
              p_session_token: adminToken,
              p_member_id: memberId,
              p_platform: platform.key,
              p_account_value: value,
            }
          );

        if (linkError) {
          throw linkError;
        }
      }

      setNewNickname("");
      setNewInstagram("");
      setNewMemo("");
      setNewLinks(emptyLinks());
      setShowAddForm(false);

      setMessage(
        "회원 입장이 등록되었습니다. 💚"
      );

      await loadMembers(adminToken);
    } catch (error) {
      setErrorMessage(
        error?.message ||
          "회원 등록 중 오류가 발생했습니다."
      );
    } finally {
      setAdding(false);
    }
  }

  // =====================================================
  // 회원 플랫폼 링크 수정 열기
  // =====================================================

  async function openPlatformEditor(member) {
    setMessage("");
    setErrorMessage("");

    if (editingMemberId === member.id) {
      setEditingMemberId(null);
      setEditingLinks(emptyLinks());
      return;
    }

    setEditingMemberId(member.id);
    setEditingLinks(emptyLinks());
    setLinksLoading(true);

    const { data, error } = await supabase.rpc(
      "admin_get_member_platform_links",
      {
        p_session_token: adminToken,
        p_member_id: member.id,
      }
    );

    if (error) {
      setErrorMessage(
        error.message ||
          "플랫폼 정보를 불러오지 못했습니다."
      );

      setEditingMemberId(null);
      setLinksLoading(false);
      return;
    }

    const nextLinks = emptyLinks();

    for (const item of data || []) {
      if (
        Object.prototype.hasOwnProperty.call(
          nextLinks,
          item.platform
        )
      ) {
        nextLinks[item.platform] =
          item.account_value || "";
      }
    }

    setEditingLinks(nextLinks);
    setLinksLoading(false);
  }

  // =====================================================
  // 회원 플랫폼 링크 저장
  // =====================================================

  async function savePlatformLinks(member) {
    setLinksSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      for (const platform of PLATFORMS) {
        const { error } = await supabase.rpc(
          "admin_set_member_platform_link",
          {
            p_session_token: adminToken,
            p_member_id: member.id,
            p_platform: platform.key,
            p_account_value:
              editingLinks[
                platform.key
              ]?.trim() || "",
          }
        );

        if (error) {
          throw error;
        }
      }

      setEditingMemberId(null);
      setEditingLinks(emptyLinks());

      setMessage(
        `${member.kakao_nickname}님의 플랫폼 링크를 저장했습니다. 💚`
      );
    } catch (error) {
      setErrorMessage(
        error?.message ||
          "플랫폼 링크 저장 중 오류가 발생했습니다."
      );
    } finally {
      setLinksSaving(false);
    }
  }

  // =====================================================
  // 퇴장
  // =====================================================

  async function leaveMember(member) {
    const confirmed = window.confirm(
      `${member.kakao_nickname}님을 퇴장 처리할까요?\n\n회원 기록은 삭제되지 않습니다.`
    );

    if (!confirmed) return;

    const reason =
      window.prompt(
        "퇴장 사유를 입력해주세요.\n(선택사항)"
      ) || "";

    setActionLoadingId(member.id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "leave_member",
      {
        p_session_token: adminToken,
        p_member_id: member.id,
        p_reason: reason.trim() || null,
        p_memo: null,
      }
    );

    if (error) {
      setErrorMessage(
        error.message ||
          "퇴장 처리 중 오류가 발생했습니다."
      );

      setActionLoadingId(null);
      return;
    }

    if (editingMemberId === member.id) {
      setEditingMemberId(null);
      setEditingLinks(emptyLinks());
    }

    setMessage(
      `${member.kakao_nickname}님을 퇴장 처리했습니다.`
    );

    await loadMembers(adminToken);
    setActionLoadingId(null);
  }

  // =====================================================
  // 재입장
  // =====================================================

  async function rejoinMember(member) {
    const confirmed = window.confirm(
      `${member.kakao_nickname}님을 다시 입장 처리할까요?`
    );

    if (!confirmed) return;

    setActionLoadingId(member.id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "rejoin_member",
      {
        p_session_token: adminToken,
        p_member_id: member.id,
        p_memo: null,
      }
    );

    if (error) {
      setErrorMessage(
        error.message ||
          "재입장 처리 중 오류가 발생했습니다."
      );

      setActionLoadingId(null);
      return;
    }

    setMessage(
      `${member.kakao_nickname}님을 재입장 처리했습니다. 💚`
    );

    await loadMembers(adminToken);
    setActionLoadingId(null);
  }

  const filteredMembers = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase()
      .replace(/^@/, "");

    return members.filter((member) => {
      if (
        filter === "active" &&
        member.status === "inactive"
      ) {
        return false;
      }

      if (
        filter === "inactive" &&
        member.status !== "inactive"
      ) {
        return false;
      }

      if (!keyword) return true;

      const nickname = (
        member.kakao_nickname || ""
      ).toLowerCase();

      const instagram = (
        member.instagram_id || ""
      )
        .toLowerCase()
        .replace(/^@/, "");

      return (
        nickname.includes(keyword) ||
        instagram.includes(keyword)
      );
    });
  }, [members, filter, search]);

  const activeCount = members.filter(
    (member) => member.status !== "inactive"
  ).length;

  const inactiveCount = members.filter(
    (member) => member.status === "inactive"
  ).length;

  return (
    <main className="page dashboardPage">
      <section className="dashboard">

        {/* 헤더 */}

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
            <div className="dashboardBadge">
              MEMBER
            </div>

            <h1 className="memberPageTitle">
              회원 관리 🌿
            </h1>

            <p className="dashboardHello">
              가입승인 · 입장 · 퇴장 · 플랫폼을
              관리해요.
            </p>
          </div>
        </div>

        {message && (
          <div style={successStyle}>
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="memberError">
            {errorMessage}
          </div>
        )}

        {/* ============================================= */}
        {/* 가입대기 */}
        {/* ============================================= */}

        <div
          className="memberAdminCard"
          style={{
            marginBottom: "18px",
          }}
        >
          <div className="memberListTop">
            <div>
              <div style={sectionBadgeStyle}>
                JOIN REQUEST
              </div>

              <div className="memberCount">
                가입대기
              </div>

              <div style={subTextStyle}>
                승인 대기 {joinRequests.length}명
              </div>
            </div>

            <button
              type="button"
              className="refreshButton"
              onClick={() =>
                loadJoinRequests(adminToken)
              }
            >
              새로고침
            </button>
          </div>

          {requestsLoading ? (
            <div className="emptyMembers">
              가입신청 불러오는 중...
            </div>
          ) : joinRequests.length === 0 ? (
            <div
              className="emptyMembers"
              style={{
                marginTop: "16px",
              }}
            >
              🌿 현재 가입대기 회원이 없습니다.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "12px",
                marginTop: "17px",
              }}
            >
              {joinRequests.map((request) => (
                <div
                  key={request.request_id}
                  style={requestCardStyle}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "11px",
                    }}
                  >
                    <div className="memberAvatar">
                      {(request.kakao_nickname || "?")
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "7px",
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <strong
                          style={{
                            fontSize: "16px",
                          }}
                        >
                          {request.kakao_nickname}
                        </strong>

                        <span style={pendingBadgeStyle}>
                          승인대기
                        </span>
                      </div>

                      <div style={instagramTextStyle}>
                        @{request.instagram_id}
                      </div>
                    </div>
                  </div>

                  <div style={requestPlatformsStyle}>
                    <PlatformRow
                      icon="📸"
                      label="인스타그램"
                      value={`@${request.instagram_id}`}
                      required
                    />

                    {request.blog && (
                      <PlatformRow
                        icon="📝"
                        label="블로그"
                        value={request.blog}
                      />
                    )}

                    {request.naver_clip && (
                      <PlatformRow
                        icon="🎬"
                        label="네이버 클립"
                        value={request.naver_clip}
                      />
                    )}

                    {request.youtube && (
                      <PlatformRow
                        icon="▶️"
                        label="유튜브"
                        value={request.youtube}
                      />
                    )}

                    {request.tiktok && (
                      <PlatformRow
                        icon="🎵"
                        label="틱톡"
                        value={request.tiktok}
                      />
                    )}

                    {request.today_house && (
                      <PlatformRow
                        icon="🏠"
                        label="오늘의집"
                        value={request.today_house}
                      />
                    )}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                      marginTop: "13px",
                    }}
                  >
                    <button
                      type="button"
                      disabled={
                        requestLoadingId ===
                        request.request_id
                      }
                      onClick={() =>
                        approveRequest(request)
                      }
                      style={approveButtonStyle}
                    >
                      {requestLoadingId ===
                      request.request_id
                        ? "처리 중..."
                        : "✓ 승인"}
                    </button>

                    <button
                      type="button"
                      disabled={
                        requestLoadingId ===
                        request.request_id
                      }
                      onClick={() =>
                        rejectRequest(request)
                      }
                      style={rejectButtonStyle}
                    >
                      거절
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ============================================= */}
        {/* 회원목록 */}
        {/* ============================================= */}

        <div className="memberAdminCard">
          <div className="memberListTop">
            <div>
              <div style={sectionBadgeStyle}>
                MEMBERS
              </div>

              <div className="memberCount">
                전체 {members.length}명
              </div>

              <div style={subTextStyle}>
                입장 {activeCount}명 · 퇴장{" "}
                {inactiveCount}명
              </div>
            </div>

            <button
              type="button"
              className="refreshButton"
              onClick={() =>
                setShowAddForm((prev) => !prev)
              }
            >
              {showAddForm
                ? "닫기"
                : "+ 직접 입장"}
            </button>
          </div>

          {/* 관리자 직접 회원 추가 */}

          {showAddForm && (
            <form
              onSubmit={handleAddMember}
              style={formBoxStyle}
            >
              <div style={formTitleStyle}>
                새 회원 직접 입장
              </div>

              <div style={guideBoxStyle}>
                💚 일반 회원은 가입신청을 이용하면
                돼요. 이 메뉴는 관리자가 직접
                등록해야 할 때 사용해요.
              </div>

              <label style={labelStyle}>
                카카오톡 닉네임 *
              </label>

              <input
                type="text"
                value={newNickname}
                onChange={(event) =>
                  setNewNickname(
                    event.target.value
                  )
                }
                placeholder="카카오톡 닉네임"
                style={inputStyle}
              />

              <label style={labelWithTopStyle}>
                인스타그램 아이디 *
              </label>

              <input
                type="text"
                value={newInstagram}
                onChange={(event) =>
                  setNewInstagram(
                    event.target.value
                  )
                }
                placeholder="예) bubbly_ayul"
                style={inputStyle}
              />

              <div style={instagramRequiredStyle}>
                📸 인스타그램은 필수입니다.
              </div>

              <div style={platformTitleStyle}>
                플랫폼 링크
                <span style={optionalStyle}>
                  선택
                </span>
              </div>

              {PLATFORMS.map((platform) => (
                <div
                  key={platform.key}
                  style={{
                    marginTop: "11px",
                  }}
                >
                  <label style={platformLabelStyle}>
                    {platform.icon} {platform.label}
                  </label>

                  <input
                    type="text"
                    value={newLinks[platform.key]}
                    onChange={(event) =>
                      changeNewLink(
                        platform.key,
                        event.target.value
                      )
                    }
                    placeholder={platform.placeholder}
                    style={inputStyle}
                  />
                </div>
              ))}

              <label style={labelWithTopStyle}>
                관리자 메모
              </label>

              <textarea
                value={newMemo}
                onChange={(event) =>
                  setNewMemo(event.target.value)
                }
                placeholder="관리자 메모 (선택)"
                rows={3}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                }}
              />

              <button
                type="submit"
                disabled={adding}
                style={{
                  ...mainSaveButtonStyle,
                  opacity: adding ? 0.6 : 1,
                }}
              >
                {adding
                  ? "등록 중..."
                  : "입장 등록하기"}
              </button>
            </form>
          )}

          <div
            className="memberSearchWrap"
            style={{
              marginTop: "18px",
            }}
          >
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="닉네임 또는 인스타 아이디 검색"
            />
          </div>

          <div className="memberFilters">
            <button
              type="button"
              className={`memberFilter ${
                filter === "all" ? "active" : ""
              }`}
              onClick={() => setFilter("all")}
            >
              전체
            </button>

            <button
              type="button"
              className={`memberFilter ${
                filter === "active" ? "active" : ""
              }`}
              onClick={() => setFilter("active")}
            >
              입장
            </button>

            <button
              type="button"
              className={`memberFilter ${
                filter === "inactive" ? "active" : ""
              }`}
              onClick={() =>
                setFilter("inactive")
              }
            >
              퇴장
            </button>
          </div>

          {loading ? (
            <div className="emptyMembers">
              회원 목록 불러오는 중...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="emptyMembers">
              해당하는 회원이 없습니다.
            </div>
          ) : (
            <div className="membersList">
              {filteredMembers.map((member) => {
                const isInactive =
                  member.status === "inactive";

                const isEditing =
                  editingMemberId === member.id;

                return (
                  <div
                    key={member.id}
                    className="memberItem"
                    style={{
                      display: "block",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div className="memberAvatar">
                        {(member.kakao_nickname || "?")
                          .slice(0, 1)
                          .toUpperCase()}
                      </div>

                      <div
                        className="memberInfo"
                        style={{ flex: 1 }}
                      >
                        <div className="memberNameRow">
                          <strong>
                            {member.kakao_nickname}
                          </strong>

                          <span
                            className={`memberStatus ${
                              isInactive
                                ? "inactive"
                                : "active"
                            }`}
                          >
                            {isInactive
                              ? "퇴장"
                              : "입장"}
                          </span>
                        </div>

                        <div style={instagramTextStyle}>
                          @{member.instagram_id}
                        </div>

                        {member.admin_memo && (
                          <div style={memoStyle}>
                            메모 ·{" "}
                            {member.admin_memo}
                          </div>
                        )}
                      </div>
                    </div>

                    {!isInactive && (
                      <div style={instagramBaseStyle}>
                        📸 인스타그램
                        <span
                          style={{
                            marginLeft: "6px",
                            color: "#76856c",
                            fontSize: "11px",
                          }}
                        >
                          필수
                        </span>
                      </div>
                    )}

                    <div
                      className="memberActions"
                      style={{
                        marginTop: "12px",
                      }}
                    >
                      {!isInactive && (
                        <>
                          <button
                            type="button"
                            className="memberAction resume"
                            onClick={() =>
                              openPlatformEditor(member)
                            }
                          >
                            {isEditing
                              ? "플랫폼 닫기"
                              : "플랫폼 수정"}
                          </button>

                          <button
                            type="button"
                            className="memberAction leave"
                            disabled={
                              actionLoadingId ===
                              member.id
                            }
                            onClick={() =>
                              leaveMember(member)
                            }
                          >
                            {actionLoadingId ===
                            member.id
                              ? "처리 중..."
                              : "퇴장"}
                          </button>
                        </>
                      )}

                      {isInactive && (
                        <button
                          type="button"
                          className="memberAction rejoin"
                          disabled={
                            actionLoadingId ===
                            member.id
                          }
                          onClick={() =>
                            rejoinMember(member)
                          }
                        >
                          {actionLoadingId ===
                          member.id
                            ? "처리 중..."
                            : "재입장"}
                        </button>
                      )}
                    </div>

                    {isEditing && !isInactive && (
                      <div style={editorBoxStyle}>
                        <div style={formTitleStyle}>
                          플랫폼 링크 수정
                        </div>

                        <div style={instagramLockedStyle}>
                          <div>
                            <div
                              style={{
                                fontSize: "13px",
                                fontWeight: "900",
                              }}
                            >
                              📸 인스타그램
                            </div>

                            <div
                              style={{
                                marginTop: "3px",
                                fontSize: "12px",
                                color: "#6f7b69",
                              }}
                            >
                              @{member.instagram_id}
                            </div>
                          </div>

                          <span style={requiredBadgeStyle}>
                            필수
                          </span>
                        </div>

                        {linksLoading ? (
                          <div
                            style={{
                              padding: "15px 0",
                              fontSize: "13px",
                              color: "#7b8377",
                            }}
                          >
                            플랫폼 정보 불러오는 중...
                          </div>
                        ) : (
                          <>
                            {PLATFORMS.map(
                              (platform) => (
                                <div
                                  key={platform.key}
                                  style={{
                                    marginTop: "11px",
                                  }}
                                >
                                  <label
                                    style={
                                      platformLabelStyle
                                    }
                                  >
                                    {platform.icon}{" "}
                                    {platform.label}
                                  </label>

                                  <input
                                    type="text"
                                    value={
                                      editingLinks[
                                        platform.key
                                      ]
                                    }
                                    onChange={(event) =>
                                      changeEditingLink(
                                        platform.key,
                                        event.target.value
                                      )
                                    }
                                    placeholder={
                                      platform.placeholder
                                    }
                                    style={inputStyle}
                                  />
                                </div>
                              )
                            )}

                            <div style={linkDeleteGuideStyle}>
                              링크를 비우고 저장하면 해당
                              플랫폼 명단에서 제외돼요.
                            </div>

                            <button
                              type="button"
                              disabled={linksSaving}
                              onClick={() =>
                                savePlatformLinks(member)
                              }
                              style={{
                                ...mainSaveButtonStyle,
                                opacity: linksSaving
                                  ? 0.6
                                  : 1,
                              }}
                            >
                              {linksSaving
                                ? "저장 중..."
                                : "플랫폼 링크 저장"}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={refreshAll}
          style={bottomRefreshStyle}
        >
          전체 새로고침
        </button>
      </section>
    </main>
  );
}

// =====================================================
// 작은 컴포넌트
// =====================================================

function PlatformRow({
  icon,
  label,
  value,
  required = false,
}) {
  return (
    <div style={platformRowStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "5px",
        }}
      >
        <span>{icon}</span>

        <strong
          style={{
            fontSize: "12px",
          }}
        >
          {label}
        </strong>

        {required && (
          <span style={tinyRequiredStyle}>
            필수
          </span>
        )}
      </div>

      {value?.startsWith("http") ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          style={linkStyle}
        >
          {value}
        </a>
      ) : (
        <div style={valueStyle}>
          {value}
        </div>
      )}
    </div>
  );
}

// =====================================================
// 스타일
// =====================================================

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "13px 14px",
  borderRadius: "14px",
  border: "1px solid #dde1d5",
  background: "#ffffff",
  outline: "none",
  fontSize: "14px",
};

const successStyle = {
  marginBottom: "14px",
  padding: "13px 15px",
  borderRadius: "16px",
  background: "#eef7e8",
  fontSize: "14px",
  fontWeight: "700",
};

const sectionBadgeStyle = {
  fontSize: "11px",
  fontWeight: "900",
  color: "#7b8b72",
  marginBottom: "5px",
  letterSpacing: "0.7px",
};

const subTextStyle = {
  marginTop: "5px",
  fontSize: "13px",
  color: "#76806f",
};

const requestCardStyle = {
  padding: "16px",
  borderRadius: "20px",
  border: "1px solid #e0e7d7",
  background: "#fbfcf8",
};

const pendingBadgeStyle = {
  padding: "4px 8px",
  borderRadius: "999px",
  background: "#fff1c9",
  color: "#8d6c21",
  fontSize: "10px",
  fontWeight: "900",
};

const instagramTextStyle = {
  marginTop: "4px",
  fontSize: "13px",
  color: "#737b70",
};

const requestPlatformsStyle = {
  display: "grid",
  gap: "7px",
  marginTop: "14px",
};

const platformRowStyle = {
  padding: "10px 11px",
  borderRadius: "13px",
  background: "#f3f7ed",
};

const tinyRequiredStyle = {
  padding: "2px 6px",
  borderRadius: "999px",
  background: "#dcecc7",
  color: "#687b52",
  fontSize: "9px",
  fontWeight: "900",
};

const linkStyle = {
  display: "block",
  color: "#627d48",
  fontSize: "12px",
  lineHeight: "1.45",
  overflowWrap: "anywhere",
  textDecoration: "underline",
};

const valueStyle = {
  color: "#667063",
  fontSize: "12px",
  overflowWrap: "anywhere",
};

const approveButtonStyle = {
  padding: "12px",
  border: "none",
  borderRadius: "14px",
  background: "#a9d95d",
  color: "#2f4223",
  fontWeight: "900",
  cursor: "pointer",
};

const rejectButtonStyle = {
  padding: "12px",
  border: "1px solid #eadbd8",
  borderRadius: "14px",
  background: "#fff7f5",
  color: "#a15d55",
  fontWeight: "900",
  cursor: "pointer",
};

const formBoxStyle = {
  marginTop: "18px",
  padding: "18px",
  borderRadius: "20px",
  background: "#f7f8f1",
  border: "1px solid #e5e8d9",
};

const formTitleStyle = {
  fontSize: "17px",
  fontWeight: "900",
  marginBottom: "13px",
};

const guideBoxStyle = {
  marginBottom: "15px",
  padding: "11px 12px",
  borderRadius: "13px",
  background: "#eef5e4",
  color: "#69765f",
  fontSize: "12px",
  lineHeight: "1.55",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontSize: "13px",
  fontWeight: "900",
};

const labelWithTopStyle = {
  ...labelStyle,
  marginTop: "13px",
};

const instagramRequiredStyle = {
  marginTop: "8px",
  padding: "9px 11px",
  borderRadius: "12px",
  background: "#eaf5df",
  color: "#697b5a",
  fontSize: "11px",
  fontWeight: "800",
};

const platformTitleStyle = {
  marginTop: "19px",
  marginBottom: "3px",
  fontSize: "14px",
  fontWeight: "900",
};

const optionalStyle = {
  marginLeft: "6px",
  color: "#9a9f95",
  fontSize: "10px",
  fontWeight: "700",
};

const platformLabelStyle = {
  display: "block",
  marginBottom: "6px",
  fontSize: "12px",
  fontWeight: "900",
};

const mainSaveButtonStyle = {
  width: "100%",
  marginTop: "15px",
  padding: "13px",
  border: "none",
  borderRadius: "14px",
  background: "#a9d95d",
  color: "#2f4223",
  fontWeight: "900",
  fontSize: "14px",
  cursor: "pointer",
};

const memoStyle = {
  marginTop: "6px",
  fontSize: "12px",
  color: "#8b8f87",
};

const instagramBaseStyle = {
  marginTop: "13px",
  padding: "10px 12px",
  borderRadius: "14px",
  background: "#f4f8ed",
  fontSize: "13px",
  fontWeight: "800",
};

const editorBoxStyle = {
  marginTop: "13px",
  padding: "15px",
  borderRadius: "17px",
  background: "#fafbf6",
  border: "1px solid #e4e7dc",
};

const instagramLockedStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  padding: "12px",
  borderRadius: "14px",
  background: "#edf6e2",
  border: "1px solid #d8e7c8",
};

const requiredBadgeStyle = {
  padding: "5px 8px",
  borderRadius: "999px",
  background: "#d7eabf",
  color: "#64774e",
  fontSize: "10px",
  fontWeight: "900",
};

const linkDeleteGuideStyle = {
  marginTop: "13px",
  padding: "10px 11px",
  borderRadius: "12px",
  background: "#f6f4e9",
  color: "#7b7b70",
  fontSize: "11px",
  lineHeight: "1.5",
};

const bottomRefreshStyle = {
  width: "100%",
  marginTop: "15px",
  padding: "12px",
  borderRadius: "14px",
  border: "1px solid #dde4d5",
  background: "#ffffff",
  color: "#687263",
  fontSize: "12px",
  fontWeight: "800",
  cursor: "pointer",
};
