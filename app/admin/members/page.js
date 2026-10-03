"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PLATFORM_FIELDS = [
  {
    key: "blog",
    label: "블로그",
    icon: "📝",
    placeholder: "블로그 링크",
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
    placeholder: "유튜브 링크",
  },
  {
    key: "tiktok",
    label: "틱톡",
    icon: "🎵",
    placeholder: "틱톡 링크",
  },
  {
    key: "today_house",
    label: "오늘의집",
    icon: "🏠",
    placeholder: "오늘의집 링크",
  },
];

const EMPTY_LINKS = {
  blog: "",
  naver_clip: "",
  youtube: "",
  tiktok: "",
  today_house: "",
};

export default function AdminMembersPage() {
  const router = useRouter();

  const [adminToken, setAdminToken] = useState("");
  const [currentAdminRole, setCurrentAdminRole] =
    useState("");

  const [members, setMembers] = useState([]);
  const [memberRoles, setMemberRoles] = useState({});
  const [pushStatus, setPushStatus] = useState({});
  const [expandedMemberId, setExpandedMemberId] = useState(null);

  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [requestLoading, setRequestLoading] =
    useState(true);

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] =
    useState("");

  const [actionLoadingId, setActionLoadingId] =
    useState(null);
  const [leaveFormMemberId, setLeaveFormMemberId] = useState(null);
  const [leaveReason, setLeaveReason] = useState("");

  const [roleLoadingId, setRoleLoadingId] =
    useState(null);

  const [showAddForm, setShowAddForm] =
    useState(false);
  const [leftMembers, setLeftMembers] = useState([]);
  const [leftMembersLoading, setLeftMembersLoading] = useState(false);
  const [leftEditingId, setLeftEditingId] = useState(null);
  const [leftEditNickname, setLeftEditNickname] = useState("");
  const [leftEditInstagram, setLeftEditInstagram] = useState("");
  const [leftEditReason, setLeftEditReason] = useState("");
  const [leftEditAt, setLeftEditAt] = useState("");
  const [leftSaving, setLeftSaving] = useState(false);

  const [newNickname, setNewNickname] =
    useState("");
  const [newInstagram, setNewInstagram] =
    useState("");
  const [newMemo, setNewMemo] = useState("");
  const [newLinks, setNewLinks] =
    useState(EMPTY_LINKS);
  const [adding, setAdding] = useState(false);

  const [editingMemberId, setEditingMemberId] =
    useState(null);

  const [profileEditingId, setProfileEditingId] =
    useState(null);
  const [profileNickname, setProfileNickname] =
    useState("");
  const [profileInstagram, setProfileInstagram] =
    useState("");
  const [profileSaving, setProfileSaving] =
    useState(false);

  const [historyMemberId, setHistoryMemberId] =
    useState(null);
  const [profileHistory, setProfileHistory] =
    useState([]);
  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [editingLinks, setEditingLinks] =
    useState(EMPTY_LINKS);

  const [linksLoading, setLinksLoading] =
    useState(false);

  const [linksSaving, setLinksSaving] =
    useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  function normalizeInstagram(value) {
    return (value || "")
      .trim()
      .replace(/^@/, "");
  }

  async function checkAdmin() {
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

    const role =
      currentMember.admin_role || "";

    if (
      role !== "admin" &&
      role !== "super_admin"
    ) {
      router.replace("/member");
      return;
    }

    setAdminToken(token);
    setCurrentAdminRole(role);

    await refreshAll(token);
  }

  async function refreshAll(token = adminToken) {
    if (!token) return;

    setMessage("");
    setErrorMessage("");

    await Promise.all([
      loadMembers(token),
      loadRequests(token),
      loadMemberRoles(token),
      loadPushStatus(token),
      loadLeftMembers(token),
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

  async function loadLeftMembers(token = adminToken) {
    if (!token) return;
    setLeftMembersLoading(true);

    const { data, error } = await supabase.rpc(
      "admin_get_left_members",
      { p_session_token: token }
    );

    if (error) {
      setErrorMessage(error.message || "퇴장자 목록을 불러오지 못했습니다.");
      setLeftMembersLoading(false);
      return;
    }

    const sorted = [...(data || [])].sort((x, y) => {
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

  async function loadRequests(
    token = adminToken
  ) {
    if (!token) return;

    setRequestLoading(true);

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
      setRequestLoading(false);
      return;
    }

    const pending = (data || []).filter(
      (item) => item.status === "pending"
    );

    setRequests(pending);
    setRequestLoading(false);
  }

  async function loadMemberRoles(
    token = adminToken
  ) {
    if (!token) return;

    const { data, error } = await supabase.rpc(
      "admin_get_member_roles",
      {
        p_session_token: token,
      }
    );

    if (error) {
      console.error(
        "관리자 권한 조회 오류:",
        error
      );
      return;
    }

    const roleMap = {};

    (data || []).forEach((item) => {
      if (item.member_id) {
        roleMap[item.member_id] =
          item.admin_role;
      }
    });

    setMemberRoles(roleMap);
  }

  async function loadPushStatus(token = adminToken) {
    if (!token) return;

    const { data, error } = await supabase.rpc(
      "admin_get_member_push_status",
      {
        p_session_token: token,
      }
    );

    if (error) {
      console.error("알림 설정 상태 조회 오류:", error);
      return;
    }

    const statusMap = {};

    (data || []).forEach((item) => {
      statusMap[item.member_id] = {
        enabled: Boolean(item.notification_enabled),
        count: Number(item.subscription_count || 0),
      };
    });

    setPushStatus(statusMap);
  }

  async function approveRequest(request) {
    const confirmed = window.confirm(
      `${request.kakao_nickname}님의 가입을 승인할까요?`
    );

    if (!confirmed) return;

    setActionLoadingId(request.request_id);
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

      setActionLoadingId(null);
      return;
    }

    setMessage(
      `${request.kakao_nickname}님의 가입을 승인했습니다. 💚`
    );

    await refreshAll(adminToken);

    setActionLoadingId(null);
  }

  async function rejectRequest(request) {
    const confirmed = window.confirm(
      `${request.kakao_nickname}님의 가입신청을 거절할까요?`
    );

    if (!confirmed) return;

    const memo =
      window.prompt(
        "거절 사유를 입력해주세요.\n(선택사항)"
      ) || "";

    setActionLoadingId(request.request_id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "admin_reject_join_request",
      {
        p_session_token: adminToken,
        p_request_id: request.request_id,
        p_admin_memo: memo.trim() || null,
      }
    );

    if (error) {
      setErrorMessage(
        error.message ||
          "가입신청 거절 중 오류가 발생했습니다."
      );

      setActionLoadingId(null);
      return;
    }

    setMessage(
      `${request.kakao_nickname}님의 가입신청을 거절했습니다.`
    );

    await loadRequests(adminToken);

    setActionLoadingId(null);
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

      if (error) throw error;

      if (!memberId) {
        throw new Error(
          "회원 ID를 확인할 수 없습니다."
        );
      }

      for (const platform of PLATFORM_FIELDS) {
        const value =
          newLinks[platform.key]?.trim() || "";

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

        if (linkError) throw linkError;
      }

      setNewNickname("");
      setNewInstagram("");
      setNewMemo("");
      setNewLinks({ ...EMPTY_LINKS });
      setShowAddForm(false);

      setMessage(
        "회원 입장이 등록되었습니다. 💚"
      );

      await refreshAll(adminToken);
    } catch (error) {
      setErrorMessage(
        error?.message ||
          "회원 등록 중 오류가 발생했습니다."
      );
    } finally {
      setAdding(false);
    }
  }

  function openLeftEditor(item) {
    setLeftEditingId(item.id);
    setLeftEditNickname(item.kakao_nickname || "");
    setLeftEditInstagram(item.instagram_id || "");
    setLeftEditReason(item.leave_reason || "");
    setLeftEditAt(item.left_at || "");
  }

  async function saveLeftMember(item) {
    if (!leftEditNickname.trim() || !leftEditInstagram.trim()) {
      setErrorMessage("카톡방 닉네임과 인스타그램 아이디를 입력해주세요.");
      return;
    }

    setLeftSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("admin_update_left_member", {
      p_session_token: adminToken,
      p_id: item.id,
      p_kakao_nickname: leftEditNickname.trim(),
      p_instagram_id: normalizeInstagram(leftEditInstagram),
      p_reason: leftEditReason.trim() || null,
      p_left_at: leftEditAt || null,
    });

    if (error) {
      setErrorMessage(error.message || "퇴장자 수정 중 오류가 발생했습니다.");
      setLeftSaving(false);
      return;
    }

    setLeftEditingId(null);
    setMessage("퇴장자 정보를 수정했습니다. 💚");
    await loadLeftMembers(adminToken);
    setLeftSaving(false);
  }

  async function openLinkEditor(member) {
    setMessage("");
    setErrorMessage("");

    if (editingMemberId === member.id) {
      setEditingMemberId(null);
      setEditingLinks({ ...EMPTY_LINKS });
      return;
    }

    setEditingMemberId(member.id);
    setLinksLoading(true);
    setEditingLinks({ ...EMPTY_LINKS });

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

    const nextLinks = {
      ...EMPTY_LINKS,
    };

    (data || []).forEach((item) => {
      if (
        item.platform !== "instagram" &&
        Object.prototype.hasOwnProperty.call(
          nextLinks,
          item.platform
        )
      ) {
        nextLinks[item.platform] =
          item.account_value || "";
      }
    });

    setEditingLinks(nextLinks);
    setLinksLoading(false);
  }

  async function saveMemberLinks(member) {
    setLinksSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      for (const platform of PLATFORM_FIELDS) {
        const value =
          editingLinks[
            platform.key
          ]?.trim() || "";

        const { error } = await supabase.rpc(
          "admin_set_member_platform_link",
          {
            p_session_token: adminToken,
            p_member_id: member.id,
            p_platform: platform.key,
            p_account_value: value,
          }
        );

        if (error) throw error;
      }

      setEditingMemberId(null);
      setEditingLinks({
        ...EMPTY_LINKS,
      });

      setMessage(
        `${member.kakao_nickname}님의 플랫폼 정보를 저장했습니다. 💚`
      );
    } catch (error) {
      setErrorMessage(
        error?.message ||
          "플랫폼 저장 중 오류가 발생했습니다."
      );
    } finally {
      setLinksSaving(false);
    }
  }

  async function leaveMember(member) {
    const role = memberRoles[member.id];

    if (role === "super_admin") {
      window.alert("최고관리자는 퇴장 처리할 수 없습니다.");
      return;
    }

    if (!leaveReason.trim()) {
      setErrorMessage("퇴장 사유를 입력해주세요.");
      return;
    }

    const confirmed = window.confirm(
      `${member.kakao_nickname}님을 퇴장 처리할까요?\n\n퇴장 사유: ${leaveReason.trim()}`
    );
    if (!confirmed) return;

    setActionLoadingId(member.id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("leave_member", {
      p_session_token: adminToken,
      p_member_id: member.id,
      p_reason: leaveReason.trim(),
      p_memo: null,
    });

    if (error) {
      setErrorMessage(error.message || "퇴장 처리 중 오류가 발생했습니다.");
      setActionLoadingId(null);
      return;
    }

    if (editingMemberId === member.id) {
      setEditingMemberId(null);
      setEditingLinks({ ...EMPTY_LINKS });
    }

    setLeaveFormMemberId(null);
    setLeaveReason("");
    setMessage(`${member.kakao_nickname}님을 퇴장 처리했습니다.`);
    await refreshAll(adminToken);
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

    await refreshAll(adminToken);

    setActionLoadingId(null);
  }

  async function deleteMemberPermanently(member) {
    const firstConfirmed = window.confirm(
      `${member.kakao_nickname}님을 완전히 삭제할까요?\n\n회원 기록과 연결된 정보가 삭제되며 되돌릴 수 없습니다.`
    );

    if (!firstConfirmed) return;

    const typedName = window.prompt(
      `완전 삭제하려면 카카오톡 닉네임 "${member.kakao_nickname}"을 입력해주세요.`
    );

    if (typedName !== member.kakao_nickname) {
      if (typedName !== null) {
        window.alert("닉네임이 일치하지 않아 삭제하지 않았습니다.");
      }
      return;
    }

    setActionLoadingId(member.id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "admin_delete_member",
      {
        p_session_token: adminToken,
        p_member_id: member.id,
      }
    );

    if (error) {
      setErrorMessage(
        error.message ||
          "회원 완전 삭제 중 오류가 발생했습니다."
      );
      setActionLoadingId(null);
      return;
    }

    setMessage(
      `${member.kakao_nickname}님의 회원 기록을 완전히 삭제했습니다.`
    );

    await refreshAll(adminToken);
    setActionLoadingId(null);
  }

  function openProfileEditor(member) {
    if (profileEditingId === member.id) {
      setProfileEditingId(null);
      return;
    }

    setProfileEditingId(member.id);
    setProfileNickname(member.kakao_nickname || "");
    setProfileInstagram(member.instagram_id || "");
    setHistoryMemberId(null);
  }

  async function saveProfile(member) {
    const nickname = profileNickname.trim();
    const instagram = normalizeInstagram(profileInstagram);

    if (!nickname || !instagram) {
      setErrorMessage("닉네임과 인스타그램 아이디를 모두 입력해주세요.");
      return;
    }

    setProfileSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "admin_update_member_profile",
      {
        p_session_token: adminToken,
        p_member_id: member.id,
        p_kakao_nickname: nickname,
        p_instagram_id: instagram,
      }
    );

    if (error) {
      setErrorMessage(error.message || "회원정보 수정 중 오류가 발생했습니다.");
      setProfileSaving(false);
      return;
    }

    setProfileEditingId(null);
    setMessage(`${nickname}님의 회원정보를 수정했습니다. 💚`);
    await refreshAll(adminToken);
    setProfileSaving(false);
  }

  async function openProfileHistory(member) {
    if (historyMemberId === member.id) {
      setHistoryMemberId(null);
      setProfileHistory([]);
      return;
    }

    setHistoryMemberId(member.id);
    setProfileEditingId(null);
    setHistoryLoading(true);
    setProfileHistory([]);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "admin_get_member_profile_history",
      {
        p_session_token: adminToken,
        p_member_id: member.id,
      }
    );

    if (error) {
      setErrorMessage(error.message || "변경내역을 불러오지 못했습니다.");
      setHistoryMemberId(null);
      setHistoryLoading(false);
      return;
    }

    setProfileHistory(data || []);
    setHistoryLoading(false);
  }

  function formatHistoryDate(value) {
    if (!value) return "-";

    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  async function makeAdmin(member) {
    if (currentAdminRole !== "super_admin") {
      window.alert(
        "최고관리자만 관리자 지정을 할 수 있습니다."
      );
      return;
    }

    const confirmed = window.confirm(
      `${member.kakao_nickname}님을 관리자로 지정할까요?`
    );

    if (!confirmed) return;

    setRoleLoadingId(member.id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "admin_set_member_role",
      {
        p_session_token: adminToken,
        p_member_id: member.id,
        p_role: "admin",
      }
    );

    if (error) {
      setErrorMessage(
        error.message ||
          "관리자 지정 중 오류가 발생했습니다."
      );

      setRoleLoadingId(null);
      return;
    }

    setMessage(
      `${member.kakao_nickname}님을 관리자로 지정했습니다. ♛`
    );

    await loadMemberRoles(adminToken);

    setRoleLoadingId(null);
  }

  async function removeAdmin(member) {
    if (currentAdminRole !== "super_admin") {
      window.alert(
        "최고관리자만 관리자 권한을 해제할 수 있습니다."
      );
      return;
    }

    const confirmed = window.confirm(
      `${member.kakao_nickname}님의 관리자 권한을 해제할까요?`
    );

    if (!confirmed) return;

    setRoleLoadingId(member.id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "admin_set_member_role",
      {
        p_session_token: adminToken,
        p_member_id: member.id,
        p_role: "member",
      }
    );

    if (error) {
      setErrorMessage(
        error.message ||
          "관리자 권한 해제 중 오류가 발생했습니다."
      );

      setRoleLoadingId(null);
      return;
    }

    setMessage(
      `${member.kakao_nickname}님의 관리자 권한을 해제했습니다.`
    );

    await loadMemberRoles(adminToken);

    setRoleLoadingId(null);
  }

  async function copyMemberList(status) {
    const targetMembers = members.filter((member) =>
      status === "active"
        ? member.status !== "inactive"
        : member.status === "inactive"
    );

    if (targetMembers.length === 0) {
      window.alert(
        status === "active"
          ? "복사할 입장 회원이 없습니다."
          : "복사할 퇴장 회원이 없습니다."
      );
      return;
    }

    const header = [
      "번호",
      "카카오톡 닉네임",
      "인스타그램 아이디",
      "상태",
      "권한",
    ];

    const rows = targetMembers.map((member, index) => {
      const role = memberRoles[member.id] || "member";

      const roleLabel =
        role === "super_admin"
          ? "최고관리자"
          : role === "admin"
            ? "관리자"
            : "회원";

      return [
        index + 1,
        member.kakao_nickname || "",
        member.instagram_id
          ? `@${member.instagram_id.replace(/^@/, "")}`
          : "",
        status === "active" ? "입장" : "퇴장",
        roleLabel,
      ];
    });

    const text = [header, ...rows]
      .map((row) => row.join("\t"))
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);

      setMessage(
        status === "active"
          ? `입장 목록 ${targetMembers.length}명을 복사했습니다. 엑셀에 바로 붙여넣어주세요. 💚`
          : `퇴장 목록 ${targetMembers.length}명을 복사했습니다. 엑셀에 바로 붙여넣어주세요. 💚`
      );

      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        "목록 복사에 실패했어요. 브라우저의 클립보드 권한을 확인해주세요."
      );
    }
  }

  const filteredMembers = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase()
      .replace(/^@/, "");

    return members
      .filter((member) => {
        const isInactive =
          member.status === "inactive";

        if (
          filter === "active" &&
          isInactive
        ) {
          return false;
        }

        if (
          filter === "inactive" &&
          !isInactive
        ) {
          return false;
        }

        const notificationEnabled =
          Boolean(pushStatus[member.id]?.enabled);

        if (
          filter === "notification_on" &&
          !notificationEnabled
        ) {
          return false;
        }

        if (
          filter === "notification_off" &&
          notificationEnabled
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
      })
      .sort((a, b) =>
        (a.kakao_nickname || "").localeCompare(
          b.kakao_nickname || "",
          "ko-KR"
        )
      );
  }, [members, filter, search, pushStatus]);

  const activeCount = members.filter((member) => {
    if (member.status === "inactive") return false;

    const role = memberRoles[member.id] || "member";

    return role !== "admin" && role !== "super_admin";
  }).length;

  // 퇴장 수는 현재 회원 테이블의 inactive가 아니라
  // 공개 퇴장자 리스트(left_member_list) 기준으로 표시해요.
  const inactiveCount = leftMembers.length;

  const adminCount = members.filter((member) => {
    const role = memberRoles[member.id] || "member";

    return role === "admin" || role === "super_admin";
  }).length;

  const notificationOnCount = members.filter(
    (member) =>
      member.status !== "inactive" &&
      Boolean(pushStatus[member.id]?.enabled)
  ).length;

  const notificationOffCount = members.filter(
    (member) =>
      member.status !== "inactive" &&
      !Boolean(pushStatus[member.id]?.enabled)
  ).length;

  return (
    <main
      className="page dashboardPage"
      style={{
        minHeight: "100vh",
        background: "#f7f5ed",
      }}
    >
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
              가입승인 · 입장 · 퇴장 · 플랫폼을
              관리해요.
            </p>
          </div>
        </div>

        {message && (
          <div style={successBox}>
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="memberError">
            {errorMessage}
          </div>
        )}

        {/* 가입대기 */}
        <div
          className="memberAdminCard"
          style={{
            marginBottom: "18px",
          }}
        >
          <div className="memberListTop">
            <div>
              <div style={kickerStyle}>
                JOIN REQUEST
              </div>

              <div className="memberCount">
                가입대기
              </div>

              <div style={subText}>
                승인 대기 {requests.length}명
              </div>
            </div>

            <button
              type="button"
              className="refreshButton"
              onClick={() =>
                loadRequests(adminToken)
              }
            >
              새로고침
            </button>
          </div>

          {requestLoading ? (
            <div className="emptyMembers">
              가입신청 불러오는 중...
            </div>
          ) : requests.length === 0 ? (
            <div
              className="emptyMembers"
              style={{
                marginTop: "18px",
              }}
            >
              🌿 현재 가입대기 회원이 없습니다.
            </div>
          ) : (
            <div
              style={{
                marginTop: "18px",
                display: "grid",
                gap: "12px",
              }}
            >
              {requests.map((request) => (
                <div
                  key={request.request_id}
                  style={requestCard}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "11px",
                    }}
                  >
                    <div className="memberAvatar">
                      {(
                        request.kakao_nickname ||
                        "?"
                      )
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: "900",
                          fontSize: "16px",
                        }}
                      >
                        {request.kakao_nickname}
                      </div>

                      <div style={instagramText}>
                        @{request.instagram_id}
                      </div>
                    </div>

                    <span style={pendingBadge}>
                      승인대기
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: "13px",
                      display: "grid",
                      gap: "7px",
                    }}
                  >
                    <PlatformLine
                      label="인스타그램"
                      value={`@${request.instagram_id}`}
                      required
                    />

                    {PLATFORM_FIELDS.map(
                      (platform) =>
                        request[platform.key] ? (
                          <PlatformLine
                            key={platform.key}
                            label={
                              platform.label
                            }
                            value={
                              request[
                                platform.key
                              ]
                            }
                          />
                        ) : null
                    )}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "1fr 1fr",
                      gap: "8px",
                      marginTop: "14px",
                    }}
                  >
                    <button
                      type="button"
                      disabled={
                        actionLoadingId ===
                        request.request_id
                      }
                      onClick={() =>
                        approveRequest(request)
                      }
                      style={approveButton}
                    >
                      {actionLoadingId ===
                      request.request_id
                        ? "처리 중..."
                        : "승인"}
                    </button>

                    <button
                      type="button"
                      disabled={
                        actionLoadingId ===
                        request.request_id
                      }
                      onClick={() =>
                        rejectRequest(request)
                      }
                      style={rejectButton}
                    >
                      거절
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 회원목록 */}
        <div className="memberAdminCard">
          <div className="memberListTop">
            <div>
              <div style={kickerStyle}>
                MEMBERS
              </div>

              <div className="memberCount">
                전체 {members.length}명
              </div>

              <div style={subText}>
                관리자 {adminCount}명 · 입장 {activeCount}명 · 퇴장{" "}
                {inactiveCount}명
                <br />
                🔔 알림 ON {notificationOnCount}명 · 🔕 알림 OFF{" "}
                {notificationOffCount}명
              </div>
            </div>

            <button
              type="button"
              className="refreshButton"
              onClick={() =>
                setShowAddForm(
                  (prev) => !prev
                )
              }
            >
              {showAddForm
                ? "닫기"
                : "+ 직접 입장"}
            </button>
          </div>

          {showAddForm && (
            <form
              onSubmit={handleAddMember}
              style={addForm}
            >
              <div style={formTitle}>
                직접 입장
              </div>

              <input
                value={newNickname}
                onChange={(event) =>
                  setNewNickname(
                    event.target.value
                  )
                }
                placeholder="카카오톡 닉네임 *"
                style={inputStyle}
              />

              <input
                value={newInstagram}
                onChange={(event) =>
                  setNewInstagram(
                    event.target.value
                  )
                }
                placeholder="인스타그램 아이디 *"
                style={{
                  ...inputStyle,
                  marginTop: "9px",
                }}
              />

              <div style={instagramRequired}>
                📸 인스타그램은 필수 플랫폼입니다.
              </div>

              <div style={platformTitle}>
                추가 플랫폼
              </div>

              {PLATFORM_FIELDS.map(
                (platform) => (
                  <div
                    key={platform.key}
                    style={{
                      marginTop: "9px",
                    }}
                  >
                    <div style={fieldLabel}>
                      {platform.icon}{" "}
                      {platform.label}
                    </div>

                    <input
                      value={
                        newLinks[
                          platform.key
                        ] || ""
                      }
                      onChange={(event) =>
                        setNewLinks(
                          (prev) => ({
                            ...prev,
                            [platform.key]:
                              event.target
                                .value,
                          })
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

              <textarea
                value={newMemo}
                onChange={(event) =>
                  setNewMemo(
                    event.target.value
                  )
                }
                placeholder="관리자 메모 (선택)"
                rows={3}
                style={{
                  ...inputStyle,
                  marginTop: "12px",
                  resize: "vertical",
                }}
              />

              <button
                type="submit"
                disabled={adding}
                style={mainButton}
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
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="닉네임 또는 인스타 아이디 검색"
            />
          </div>

          <div className="memberFilters">
            {[
              ["all", "전체"],
              ["active", "입장"],
              ["inactive", "퇴장"],
              ["notification_on", "🔔 알림 ON"],
              ["notification_off", "🔕 알림 OFF"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`memberFilter ${
                  filter === key
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setFilter(key)
                }
              >
                {label}
              </button>
            ))}
          </div>

          <div style={copyButtonGrid}>
            <button
              type="button"
              onClick={() =>
                copyMemberList("active")
              }
              style={copyActiveButton}
            >
              📋 입장목록 엑셀 복사
            </button>

            <button
              type="button"
              onClick={() =>
                copyMemberList("inactive")
              }
              style={copyInactiveButton}
            >
              📋 퇴장목록 엑셀 복사
            </button>
          </div>

          {filter === "inactive" && (
            <div style={{ marginTop: "16px", display: "grid", gap: "10px" }}>
              <div style={{ ...subText, fontWeight: "900" }}>
                공개 퇴장자 리스트 {leftMembers.length}명
              </div>

              {leftMembersLoading ? (
                <div className="emptyMembers">퇴장자 목록 불러오는 중...</div>
              ) : leftMembers.length === 0 ? (
                <div className="emptyMembers">등록된 퇴장자가 없습니다.</div>
              ) : (
                leftMembers.map((item) => (
                  <div key={item.id} style={requestCard}>
                    {leftEditingId === item.id ? (
                      <>
                        <input
                          value={leftEditNickname}
                          onChange={(e) => setLeftEditNickname(e.target.value)}
                          placeholder="카톡방 닉네임"
                          style={inputStyle}
                        />
                        <input
                          value={leftEditInstagram}
                          onChange={(e) => setLeftEditInstagram(e.target.value)}
                          placeholder="인스타그램 아이디"
                          style={{ ...inputStyle, marginTop: "8px" }}
                        />
                        <textarea
                          value={leftEditReason}
                          onChange={(e) => setLeftEditReason(e.target.value)}
                          placeholder="퇴장사유"
                          rows={2}
                          style={{ ...inputStyle, marginTop: "8px", resize: "vertical" }}
                        />
                        <input
                          type="date"
                          value={leftEditAt}
                          onChange={(e) => setLeftEditAt(e.target.value)}
                          style={{ ...inputStyle, marginTop: "8px" }}
                        />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" }}>
                          <button type="button" disabled={leftSaving} onClick={() => saveLeftMember(item)} style={approveButton}>
                            {leftSaving ? "저장 중..." : "저장"}
                          </button>
                          <button type="button" onClick={() => setLeftEditingId(null)} style={rejectButton}>
                            취소
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                          <div>
                            <strong>{item.kakao_nickname}</strong>
                            <div style={instagramText}>@{String(item.instagram_id || "").replace(/^@/, "")}</div>
                          </div>
                          <button type="button" onClick={() => openLeftEditor(item)} className="refreshButton">
                            수정
                          </button>
                        </div>
                        <div style={{ marginTop: "9px", fontSize: "10px", color: "#6f7868", lineHeight: 1.6 }}>
                          퇴장사유 · {item.leave_reason || "-"}
                          <br />
                          퇴장일 · {item.left_at || "-"}
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

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

                  const role =
                    memberRoles[
                      member.id
                    ] || "member";

                  const isSuperAdmin =
                    role === "super_admin";

                  const isAdmin =
                    role === "admin";

                  const isEditing =
                    editingMemberId ===
                    member.id;

                  const isProfileEditing =
                    profileEditingId ===
                    member.id;

                  const isHistoryOpen =
                    historyMemberId ===
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
                          alignItems:
                            "center",
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
                          style={{
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              flexWrap:
                                "wrap",
                              alignItems:
                                "center",
                              gap: "6px",
                            }}
                          >
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

                            <span
                              style={{
                                padding: "4px 8px",
                                borderRadius: "999px",
                                background: pushStatus[member.id]?.enabled
                                  ? "#e8f5dc"
                                  : "#f1f1ed",
                                color: pushStatus[member.id]?.enabled
                                  ? "#58763d"
                                  : "#85877f",
                                fontSize: "9px",
                                fontWeight: "900",
                              }}
                            >
                              {pushStatus[member.id]?.enabled
                                ? "🔔 알림 ON"
                                : "🔕 알림 OFF"}
                            </span>

                            {isSuperAdmin && (
                              <span
                                style={
                                  superAdminBadge
                                }
                              >
                                👑 최고관리자
                              </span>
                            )}

                            {isAdmin && (
                              <span
                                style={
                                  adminBadge
                                }
                              >
                                ♛ 관리자
                              </span>
                            )}
                          </div>

                          <div
                            style={
                              instagramText
                            }
                          >
                            @
                            {
                              member.instagram_id
                            }
                          </div>

                          {!isInactive && member.created_at && (
                            <div
                              style={{
                                marginTop: "4px",
                                fontSize: "10px",
                                fontWeight: "800",
                                color: "#85877f",
                              }}
                            >
                              입장일 · {new Intl.DateTimeFormat("ko-KR", {
                                timeZone: "Asia/Seoul",
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                              }).format(new Date(member.created_at)).replace(/\. /g, ".").replace(/\.$/, "")}
                            </div>
                          )}
                        </div>
                      </div>

                      <div
                        style={
                          instagramRequired
                        }
                      >
                        📸 인스타그램 · 필수
                      </div>

                      {!isInactive && (
                        <>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedMemberId(
                              expandedMemberId === member.id ? null : member.id
                            )
                          }
                          style={{
                            ...softButton,
                            width: "100%",
                            marginTop: "8px",
                            padding: "8px 11px",
                            minHeight: "36px",
                            borderRadius: "11px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: "11px",
                          }}
                        >
                          <span>회원 관리 메뉴</span>
                          <span>
                            {expandedMemberId === member.id ? "▲ 접기" : "▼ 펼치기"}
                          </span>
                        </button>

                        {expandedMemberId === member.id && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "7px",
                            marginTop: "8px",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              openProfileEditor(member)
                            }
                            style={softButton}
                          >
                            {isProfileEditing
                              ? "수정 닫기"
                              : "회원정보 수정"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openProfileHistory(member)
                            }
                            style={softButton}
                          >
                            {isHistoryOpen
                              ? "내역 닫기"
                              : "변경내역"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openLinkEditor(
                                member
                              )
                            }
                            style={
                              softButton
                            }
                          >
                            {isEditing
                              ? "플랫폼 닫기"
                              : "플랫폼 수정"}
                          </button>

                          {currentAdminRole ===
                            "super_admin" &&
                            !isSuperAdmin &&
                            !isAdmin && (
                              <button
                                type="button"
                                disabled={
                                  roleLoadingId ===
                                  member.id
                                }
                                onClick={() =>
                                  makeAdmin(
                                    member
                                  )
                                }
                                style={
                                  adminAssignButton
                                }
                              >
                                {roleLoadingId ===
                                member.id
                                  ? "처리 중..."
                                  : "♛ 관리자 지정"}
                              </button>
                            )}

                          {currentAdminRole ===
                            "super_admin" &&
                            isAdmin && (
                              <button
                                type="button"
                                disabled={
                                  roleLoadingId ===
                                  member.id
                                }
                                onClick={() =>
                                  removeAdmin(
                                    member
                                  )
                                }
                                style={
                                  adminRemoveButton
                                }
                              >
                                {roleLoadingId ===
                                member.id
                                  ? "처리 중..."
                                  : "관리자 해제"}
                              </button>
                            )}

                          {!isSuperAdmin && (
                            <>
                              <button
                                type="button"
                                disabled={actionLoadingId === member.id}
                                onClick={() => {
                                  if (leaveFormMemberId === member.id) {
                                    setLeaveFormMemberId(null);
                                    setLeaveReason("");
                                  } else {
                                    setLeaveFormMemberId(member.id);
                                    setLeaveReason("");
                                    setErrorMessage("");
                                  }
                                }}
                                style={leaveButton}
                              >
                                {leaveFormMemberId === member.id ? "퇴장 취소" : "퇴장"}
                              </button>

                              {leaveFormMemberId === member.id && (
                                <div
                                  style={{
                                    width: "100%",
                                    marginTop: "8px",
                                    padding: "12px",
                                    borderRadius: "12px",
                                    background: "#fff7f7",
                                    border: "1px solid #f0d4d4",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      fontWeight: "900",
                                      color: "#a25757",
                                      marginBottom: "7px",
                                    }}
                                  >
                                    퇴장 사유
                                  </div>
                                  <textarea
                                    value={leaveReason}
                                    onChange={(event) => setLeaveReason(event.target.value)}
                                    placeholder="퇴장 사유를 입력해주세요."
                                    rows={3}
                                    style={{
                                      ...inputStyle,
                                      width: "100%",
                                      resize: "vertical",
                                      margin: 0,
                                    }}
                                  />
                                  <button
                                    type="button"
                                    disabled={actionLoadingId === member.id}
                                    onClick={() => leaveMember(member)}
                                    style={{
                                      ...leaveButton,
                                      width: "100%",
                                      marginTop: "8px",
                                    }}
                                  >
                                    {actionLoadingId === member.id
                                      ? "퇴장 처리 중..."
                                      : "퇴장 처리"}
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        )}
                        </>
                      )}

                      {isInactive && (
                        <div
                          style={{
                            marginTop:
                              "12px",
                          }}
                        >
                          <div style={inactiveActionGrid}>
                            <button
                              type="button"
                              disabled={
                                actionLoadingId ===
                                member.id
                              }
                              onClick={() =>
                                rejoinMember(
                                  member
                                )
                              }
                              style={
                                rejoinButton
                              }
                            >
                              {actionLoadingId ===
                              member.id
                                ? "처리 중..."
                                : "재입장"}
                            </button>

                            <button
                              type="button"
                              disabled={
                                actionLoadingId ===
                                member.id
                              }
                              onClick={() =>
                                deleteMemberPermanently(
                                  member
                                )
                              }
                              style={
                                deleteButton
                              }
                            >
                              {actionLoadingId ===
                              member.id
                                ? "처리 중..."
                                : "완전 삭제"}
                            </button>
                          </div>
                        </div>
                      )}

                      {isProfileEditing && (
                        <div style={editorBox}>
                          <div style={formTitle}>
                            회원정보 수정
                          </div>

                          <div style={fieldLabel}>
                            카카오톡 닉네임
                          </div>
                          <input
                            value={profileNickname}
                            onChange={(event) =>
                              setProfileNickname(event.target.value)
                            }
                            style={inputStyle}
                          />

                          <div
                            style={{
                              ...fieldLabel,
                              marginTop: "10px",
                            }}
                          >
                            인스타그램 아이디
                          </div>
                          <input
                            value={profileInstagram}
                            onChange={(event) =>
                              setProfileInstagram(event.target.value)
                            }
                            style={inputStyle}
                          />

                          <button
                            type="button"
                            disabled={profileSaving}
                            onClick={() => saveProfile(member)}
                            style={mainButton}
                          >
                            {profileSaving
                              ? "저장 중..."
                              : "변경사항 저장"}
                          </button>
                        </div>
                      )}

                      {isHistoryOpen && (
                        <div style={editorBox}>
                          <div style={formTitle}>
                            회원정보 변경내역
                          </div>

                          {historyLoading ? (
                            <div style={centerText}>
                              변경내역 불러오는 중...
                            </div>
                          ) : profileHistory.length === 0 ? (
                            <div style={centerText}>
                              아직 변경내역이 없습니다.
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "grid",
                                gap: "9px",
                                marginTop: "10px",
                              }}
                            >
                              {profileHistory.map((history) => (
                                <div
                                  key={history.history_id}
                                  style={historyCard}
                                >
                                  <div style={historyDate}>
                                    {formatHistoryDate(history.created_at)}
                                    {history.changed_by_nickname
                                      ? ` · ${history.changed_by_nickname}`
                                      : ""}
                                  </div>

                                  {history.old_kakao_nickname !==
                                    history.new_kakao_nickname && (
                                    <div style={historyLine}>
                                      <b>닉네임</b>{" "}
                                      {history.old_kakao_nickname || "-"}
                                      {" → "}
                                      {history.new_kakao_nickname || "-"}
                                    </div>
                                  )}

                                  {normalizeInstagram(
                                    history.old_instagram_id
                                  ) !==
                                    normalizeInstagram(
                                      history.new_instagram_id
                                    ) && (
                                    <div style={historyLine}>
                                      <b>인스타</b>{" "}
                                      @{normalizeInstagram(
                                        history.old_instagram_id
                                      )}
                                      {" → "}
                                      @{normalizeInstagram(
                                        history.new_instagram_id
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {isEditing &&
                        !isInactive && (
                          <div
                            style={
                              editorBox
                            }
                          >
                            {linksLoading ? (
                              <div
                                style={
                                  centerText
                                }
                              >
                                플랫폼 정보
                                불러오는 중...
                              </div>
                            ) : (
                              <>
                                <div
                                  style={
                                    editorTitle
                                  }
                                >
                                  플랫폼 링크
                                  수정
                                </div>

                                <div
                                  style={
                                    instagramFixed
                                  }
                                >
                                  <strong>
                                    📸
                                    인스타그램
                                  </strong>

                                  <span>
                                    @
                                    {
                                      member.instagram_id
                                    }
                                  </span>
                                </div>

                                {PLATFORM_FIELDS.map(
                                  (
                                    platform
                                  ) => (
                                    <div
                                      key={
                                        platform.key
                                      }
                                      style={{
                                        marginTop:
                                          "10px",
                                      }}
                                    >
                                      <div
                                        style={
                                          fieldLabel
                                        }
                                      >
                                        {
                                          platform.icon
                                        }{" "}
                                        {
                                          platform.label
                                        }
                                      </div>

                                      <input
                                        value={
                                          editingLinks[
                                            platform
                                              .key
                                          ] ||
                                          ""
                                        }
                                        onChange={(
                                          event
                                        ) =>
                                          setEditingLinks(
                                            (
                                              prev
                                            ) => ({
                                              ...prev,
                                              [platform.key]:
                                                event
                                                  .target
                                                  .value,
                                            })
                                          )
                                        }
                                        placeholder={`${platform.label} 링크 · 비우면 해당 플랫폼에서 제외`}
                                        style={
                                          inputStyle
                                        }
                                      />
                                    </div>
                                  )
                                )}

                                <button
                                  type="button"
                                  disabled={
                                    linksSaving
                                  }
                                  onClick={() =>
                                    saveMemberLinks(
                                      member
                                    )
                                  }
                                  style={
                                    mainButton
                                  }
                                >
                                  {linksSaving
                                    ? "저장 중..."
                                    : "플랫폼 저장"}
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

        <button
          type="button"
          onClick={() =>
            refreshAll(adminToken)
          }
          style={{
            ...mainButton,
            marginTop: "18px",
            marginBottom: "30px",
          }}
        >
          전체 새로고침
        </button>
      </section>
    </main>
  );
}

function PlatformLine({
  label,
  value,
  required = false,
}) {
  return (
    <div style={platformLine}>
      <div
        style={{
          fontWeight: "900",
          fontSize: "12px",
          color: "#6e7868",
        }}
      >
        {label}
        {required ? " · 필수" : ""}
      </div>

      <div
        style={{
          marginTop: "3px",
          fontSize: "12px",
          wordBreak: "break-all",
          color: "#3f463c",
        }}
      >
        {value}
      </div>
    </div>
  );
}

const copyButtonGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px",
  marginTop: "10px",
  marginBottom: "14px",
};

const copyActiveButton = {
  padding: "11px 8px",
  border: "1px solid #cfe1bd",
  borderRadius: "13px",
  background: "#f1f8e9",
  color: "#58734a",
  fontSize: "12px",
  fontWeight: "900",
  cursor: "pointer",
};

const copyInactiveButton = {
  padding: "11px 8px",
  border: "1px solid #e0dddd",
  borderRadius: "13px",
  background: "#f8f7f7",
  color: "#747070",
  fontSize: "12px",
  fontWeight: "900",
  cursor: "pointer",
};

const kickerStyle = {
  fontSize: "12px",
  fontWeight: "900",
  color: "#7b8b72",
  marginBottom: "5px",
  letterSpacing: "0.04em",
};

const subText = {
  marginTop: "5px",
  fontSize: "13px",
  color: "#76806f",
};

const historyCard = {
  padding: "11px 12px",
  borderRadius: "14px",
  background: "#fff",
  border: "1px solid #e6e5db",
};

const historyDate = {
  fontSize: "10px",
  fontWeight: "800",
  color: "#8a8f82",
  marginBottom: "6px",
};

const historyLine = {
  fontSize: "12px",
  lineHeight: 1.7,
  color: "#4f5949",
};

const successBox = {
  marginBottom: "14px",
  padding: "13px 15px",
  borderRadius: "16px",
  background: "#eef7e8",
  fontSize: "14px",
  fontWeight: "800",
};

const requestCard = {
  padding: "15px",
  borderRadius: "18px",
  border: "1px solid #e3e6da",
  background: "#fbfcf8",
};

const pendingBadge = {
  padding: "6px 9px",
  borderRadius: "999px",
  background: "#fff4d8",
  color: "#8c6a1d",
  fontSize: "11px",
  fontWeight: "900",
};

const instagramText = {
  marginTop: "4px",
  fontSize: "13px",
  color: "#737b70",
  wordBreak: "break-all",
};

const platformLine = {
  padding: "9px 11px",
  borderRadius: "12px",
  background: "#f3f6ee",
};

const approveButton = {
  padding: "11px",
  border: "none",
  borderRadius: "13px",
  background: "#a9d95d",
  fontWeight: "900",
  cursor: "pointer",
};

const rejectButton = {
  padding: "11px",
  border: "1px solid #ead7d7",
  borderRadius: "13px",
  background: "#fff7f7",
  color: "#9b5555",
  fontWeight: "900",
  cursor: "pointer",
};

const addForm = {
  marginTop: "18px",
  padding: "18px",
  borderRadius: "20px",
  background: "#f7f8f1",
  border: "1px solid #e5e8d9",
};

const formTitle = {
  fontSize: "17px",
  fontWeight: "900",
  marginBottom: "15px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  borderRadius: "13px",
  border: "1px solid #dfe3d8",
  background: "#ffffff",
  outline: "none",
  fontSize: "14px",
};

const instagramRequired = {
  marginTop: "11px",
  padding: "10px 12px",
  borderRadius: "13px",
  background: "#f2f7eb",
  color: "#68765e",
  fontSize: "12px",
  fontWeight: "800",
};

const platformTitle = {
  marginTop: "18px",
  marginBottom: "5px",
  fontWeight: "900",
  fontSize: "14px",
};

const fieldLabel = {
  marginBottom: "5px",
  fontSize: "12px",
  fontWeight: "800",
  color: "#6e7868",
};

const mainButton = {
  width: "100%",
  marginTop: "16px",
  padding: "13px",
  border: "none",
  borderRadius: "15px",
  background: "#a9d95d",
  fontWeight: "900",
  fontSize: "14px",
  cursor: "pointer",
};

const softButton = {
  padding: "9px 12px",
  border: "1px solid #d9e3ce",
  borderRadius: "12px",
  background: "#f3f8ed",
  color: "#506346",
  fontWeight: "900",
  cursor: "pointer",
};

const adminAssignButton = {
  padding: "9px 12px",
  border: "1px solid #d8cce8",
  borderRadius: "12px",
  background: "#f5effc",
  color: "#6d5286",
  fontWeight: "900",
  cursor: "pointer",
};

const adminRemoveButton = {
  padding: "9px 12px",
  border: "1px solid #ded8e6",
  borderRadius: "12px",
  background: "#faf8fc",
  color: "#776a83",
  fontWeight: "900",
  cursor: "pointer",
};

const leaveButton = {
  padding: "9px 12px",
  border: "1px solid #ead5d5",
  borderRadius: "12px",
  background: "#fff7f7",
  color: "#a65c5c",
  fontWeight: "900",
  cursor: "pointer",
};

const inactiveActionGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px",
};

const deleteButton = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #efcaca",
  borderRadius: "12px",
  background: "#fff1f1",
  color: "#b64d4d",
  fontWeight: "900",
  cursor: "pointer",
};

const rejoinButton = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #cfe1bd",
  borderRadius: "12px",
  background: "#f1f8e9",
  color: "#58734a",
  fontWeight: "900",
  cursor: "pointer",
};

const superAdminBadge = {
  display: "inline-flex",
  alignItems: "center",
  padding: "5px 8px",
  borderRadius: "999px",
  background: "#fff1c8",
  color: "#8a6517",
  fontSize: "11px",
  fontWeight: "900",
};

const adminBadge = {
  display: "inline-flex",
  alignItems: "center",
  padding: "5px 8px",
  borderRadius: "999px",
  background: "#f1eafa",
  color: "#72568c",
  fontSize: "11px",
  fontWeight: "900",
};

const editorBox = {
  marginTop: "14px",
  padding: "15px",
  borderRadius: "17px",
  background: "#f8f8f3",
  border: "1px solid #e2e5da",
};

const editorTitle = {
  fontSize: "15px",
  fontWeight: "900",
  marginBottom: "11px",
};

const instagramFixed = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  padding: "11px 12px",
  borderRadius: "13px",
  background: "#edf5e6",
  fontSize: "12px",
  color: "#5e6e55",
};

const centerText = {
  padding: "15px",
  textAlign: "center",
  color: "#798174",
  fontSize: "13px",
};

