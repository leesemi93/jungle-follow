"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function AdminMembersPage() {
  const router = useRouter();

  const [adminToken, setAdminToken] = useState("");

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);

  const [newNickname, setNewNickname] = useState("");
  const [newInstagram, setNewInstagram] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [newRooms, setNewRooms] = useState([]);

  const [adding, setAdding] = useState(false);

  const [editingMemberId, setEditingMemberId] =
    useState(null);

  const [editingRooms, setEditingRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] =
    useState(false);
  const [roomsSaving, setRoomsSaving] =
    useState(false);

  const [actionLoadingId, setActionLoadingId] =
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

    await loadMembers(token);
  }

  async function loadMembers(token = adminToken) {
    if (!token) return;

    setLoading(true);
    setErrorMessage("");

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

  function normalizeInstagram(value) {
    return value.trim().replace(/^@/, "");
  }

  function toggleNewRoom(platform) {
    setNewRooms((prev) => {
      if (prev.includes(platform)) {
        return prev.filter(
          (item) => item !== platform
        );
      }

      return [...prev, platform];
    });
  }

  function toggleEditingRoom(platform) {
    setEditingRooms((prev) => {
      if (prev.includes(platform)) {
        return prev.filter(
          (item) => item !== platform
        );
      }

      return [...prev, platform];
    });
  }

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

      for (const platform of newRooms) {
        const { error: roomError } =
          await supabase.rpc(
            "admin_add_member_room",
            {
              p_session_token: adminToken,
              p_member_id: memberId,
              p_platform: platform,
            }
          );

        if (roomError) {
          throw roomError;
        }
      }

      setNewNickname("");
      setNewInstagram("");
      setNewMemo("");
      setNewRooms([]);

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

  async function openRoomEditor(member) {
    setMessage("");
    setErrorMessage("");

    if (editingMemberId === member.id) {
      setEditingMemberId(null);
      setEditingRooms([]);
      return;
    }

    setRoomsLoading(true);
    setEditingMemberId(member.id);
    setEditingRooms([]);

    const { data, error } = await supabase.rpc(
      "admin_get_member_rooms",
      {
        p_session_token: adminToken,
        p_member_id: member.id,
      }
    );

    if (error) {
      setErrorMessage(
        error.message ||
          "참여방 정보를 불러오지 못했습니다."
      );

      setEditingMemberId(null);
      setRoomsLoading(false);
      return;
    }

    const roomKeys = (data || [])
      .map((item) => item.platform)
      .filter(
        (platform) => platform !== "instagram"
      );

    setEditingRooms(roomKeys);
    setRoomsLoading(false);
  }

  async function saveMemberRooms(member) {
    setRoomsSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const { data, error } = await supabase.rpc(
        "admin_get_member_rooms",
        {
          p_session_token: adminToken,
          p_member_id: member.id,
        }
      );

      if (error) {
        throw error;
      }

      const currentRooms = (data || [])
        .map((item) => item.platform)
        .filter(
          (platform) =>
            platform !== "instagram"
        );

      const roomsToAdd = editingRooms.filter(
        (room) => !currentRooms.includes(room)
      );

      const roomsToRemove = currentRooms.filter(
        (room) => !editingRooms.includes(room)
      );

      for (const platform of roomsToAdd) {
        const { error: addError } =
          await supabase.rpc(
            "admin_add_member_room",
            {
              p_session_token: adminToken,
              p_member_id: member.id,
              p_platform: platform,
            }
          );

        if (addError) {
          throw addError;
        }
      }

      for (const platform of roomsToRemove) {
        const { error: removeError } =
          await supabase.rpc(
            "admin_remove_member_room",
            {
              p_session_token: adminToken,
              p_member_id: member.id,
              p_platform: platform,
            }
          );

        if (removeError) {
          throw removeError;
        }
      }

      setEditingMemberId(null);
      setEditingRooms([]);

      setMessage(
        `${member.kakao_nickname}님의 참여방을 저장했습니다. 💚`
      );
    } catch (error) {
      setErrorMessage(
        error?.message ||
          "참여방 저장 중 오류가 발생했습니다."
      );
    } finally {
      setRoomsSaving(false);
    }
  }

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
      setEditingRooms([]);
    }

    setMessage(
      `${member.kakao_nickname}님을 퇴장 처리했습니다.`
    );

    await loadMembers(adminToken);

    setActionLoadingId(null);
  }

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

      if (!keyword) {
        return true;
      }

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
              입장 · 퇴장 · 참여방을 관리해요.
            </p>
          </div>
        </div>

        {message && (
          <div
            style={{
              marginBottom: "14px",
              padding: "13px 15px",
              borderRadius: "16px",
              background: "#eef7e8",
              fontSize: "14px",
              fontWeight: "700",
            }}
          >
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="memberError">
            {errorMessage}
          </div>
        )}

        <div className="memberAdminCard">
          <div className="memberListTop">
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "800",
                  color: "#7b8b72",
                  marginBottom: "5px",
                }}
              >
                MEMBERS
              </div>

              <div className="memberCount">
                전체 {members.length}명
              </div>

              <div
                style={{
                  marginTop: "5px",
                  fontSize: "13px",
                  color: "#76806f",
                }}
              >
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
                : "+ 회원 입장"}
            </button>
          </div>

          {showAddForm && (
            <form
              onSubmit={handleAddMember}
              style={{
                marginTop: "18px",
                padding: "18px",
                borderRadius: "20px",
                background: "#f7f8f1",
                border: "1px solid #e5e8d9",
              }}
            >
              <div
                style={{
                  fontSize: "17px",
                  fontWeight: "900",
                  marginBottom: "15px",
                }}
              >
                새 회원 입장
              </div>

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

              <input
                type="text"
                value={newInstagram}
                onChange={(event) =>
                  setNewInstagram(
                    event.target.value
                  )
                }
                placeholder="인스타그램 아이디"
                style={{
                  ...inputStyle,
                  marginTop: "9px",
                }}
              />

              <textarea
                value={newMemo}
                onChange={(event) =>
                  setNewMemo(event.target.value)
                }
                placeholder="관리자 메모 (선택)"
                rows={3}
                style={{
                  ...inputStyle,
                  marginTop: "9px",
                  resize: "vertical",
                }}
              />

              <div
                style={{
                  marginTop: "18px",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "900",
                    marginBottom: "9px",
                  }}
                >
                  참여방
                </div>

                <div
                  style={{
                    padding: "13px 14px",
                    borderRadius: "15px",
                    background: "#eaf5df",
                    border:
                      "1px solid #d3e6c1",
                    fontSize: "14px",
                    fontWeight: "800",
                    marginBottom: "9px",
                  }}
                >
                  ✓ 📸 인스타그램
                  <span
                    style={{
                      marginLeft: "7px",
                      color: "#71816a",
                      fontSize: "12px",
                    }}
                  >
                    기본 참여
                  </span>
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    color: "#7b8377",
                    marginBottom: "9px",
                  }}
                >
                  추가로 활동하는 방을
                  선택해주세요.
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap: "8px",
                  }}
                >
                  {EXTRA_ROOMS.map((room) => {
                    const selected =
                      newRooms.includes(room.key);

                    return (
                      <button
                        key={room.key}
                        type="button"
                        onClick={() =>
                          toggleNewRoom(room.key)
                        }
                        style={{
                          padding: "12px 10px",
                          borderRadius: "14px",
                          border: selected
                            ? "1px solid #9fbe78"
                            : "1px solid #e0e3d8",
                          background: selected
                            ? "#eef7e4"
                            : "#ffffff",
                          fontWeight: "800",
                          cursor: "pointer",
                        }}
                      >
                        {selected
                          ? "✓ "
                          : ""}
                        {room.icon} {room.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={adding}
                style={{
                  width: "100%",
                  marginTop: "17px",
                  padding: "14px",
                  border: "none",
                  borderRadius: "16px",
                  background: "#a9d95d",
                  fontWeight: "900",
                  fontSize: "15px",
                  cursor: "pointer",
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
                filter === "all"
                  ? "active"
                  : ""
              }`}
              onClick={() => setFilter("all")}
            >
              전체
            </button>

            <button
              type="button"
              className={`memberFilter ${
                filter === "active"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setFilter("active")
              }
            >
              입장
            </button>

            <button
              type="button"
              className={`memberFilter ${
                filter === "inactive"
                  ? "active"
                  : ""
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
              {filteredMembers.map(
                (member) => {
                  const isInactive =
                    member.status ===
                    "inactive";

                  const isEditing =
                    editingMemberId ===
                    member.id;

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
                          {(
                            member.kakao_nickname ||
                            "?"
                          )
                            .slice(0, 1)
                            .toUpperCase()}
                        </div>

                        <div
                          className="memberInfo"
                          style={{
                            flex: 1,
                          }}
                        >
                          <div className="memberNameRow">
                            <strong>
                              {
                                member.kakao_nickname
                              }
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

                          <div
                            style={{
                              marginTop: "4px",
                              fontSize: "13px",
                              color: "#737b70",
                            }}
                          >
                            @
                            {
                              member.instagram_id
                            }
                          </div>

                          {member.admin_memo && (
                            <div
                              style={{
                                marginTop: "6px",
                                fontSize: "12px",
                                color:
                                  "#8b8f87",
                              }}
                            >
                              메모 ·{" "}
                              {
                                member.admin_memo
                              }
                            </div>
                          )}
                        </div>
                      </div>

                      {!isInactive && (
                        <div
                          style={{
                            marginTop: "13px",
                            padding: "10px 12px",
                            borderRadius: "14px",
                            background: "#f4f8ed",
                            fontSize: "13px",
                            fontWeight: "800",
                          }}
                        >
                          📸 인스타그램 · 기본
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
                                openRoomEditor(
                                  member
                                )
                              }
                            >
                              {isEditing
                                ? "참여방 닫기"
                                : "참여방 수정"}
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

                      {isEditing &&
                        !isInactive && (
                          <div
                            style={{
                              marginTop: "13px",
                              padding: "15px",
                              borderRadius:
                                "17px",
                              background:
                                "#fafbf6",
                              border:
                                "1px solid #e4e7dc",
                            }}
                          >
                            <div
                              style={{
                                fontSize:
                                  "14px",
                                fontWeight:
                                  "900",
                                marginBottom:
                                  "10px",
                              }}
                            >
                              추가 참여방
                            </div>

                            {roomsLoading ? (
                              <div
                                style={{
                                  fontSize:
                                    "13px",
                                  color:
                                    "#7b8377",
                                }}
                              >
                                참여방 불러오는
                                중...
                              </div>
                            ) : (
                              <>
                                <div
                                  style={{
                                    display:
                                      "grid",
                                    gridTemplateColumns:
                                      "repeat(2, minmax(0, 1fr))",
                                    gap: "8px",
                                  }}
                                >
                                  {EXTRA_ROOMS.map(
                                    (room) => {
                                      const selected =
                                        editingRooms.includes(
                                          room.key
                                        );

                                      return (
                                        <button
                                          key={
                                            room.key
                                          }
                                          type="button"
                                          onClick={() =>
                                            toggleEditingRoom(
                                              room.key
                                            )
                                          }
                                          style={{
                                            padding:
                                              "11px 8px",
                                            borderRadius:
                                              "13px",
                                            border:
                                              selected
                                                ? "1px solid #9fbe78"
                                                : "1px solid #e0e3d8",
                                            background:
                                              selected
                                                ? "#eef7e4"
                                                : "#ffffff",
                                            fontSize:
                                              "13px",
                                            fontWeight:
                                              "800",
                                            cursor:
                                              "pointer",
                                          }}
                                        >
                                          {selected
                                            ? "✓ "
                                            : ""}
                                          {
                                            room.icon
                                          }{" "}
                                          {
                                            room.label
                                          }
                                        </button>
                                      );
                                    }
                                  )}
                                </div>

                                <button
                                  type="button"
                                  disabled={
                                    roomsSaving
                                  }
                                  onClick={() =>
                                    saveMemberRooms(
                                      member
                                    )
                                  }
                                  style={{
                                    width:
                                      "100%",
                                    marginTop:
                                      "12px",
                                    padding:
                                      "12px",
                                    border:
                                      "none",
                                    borderRadius:
                                      "14px",
                                    background:
                                      "#a9d95d",
                                    fontWeight:
                                      "900",
                                    cursor:
                                      "pointer",
                                    opacity:
                                      roomsSaving
                                        ? 0.6
                                        : 1,
                                  }}
                                >
                                  {roomsSaving
                                    ? "저장 중..."
                                    : "참여방 저장"}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

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
