-- =========================================================
-- 정글맞팔웹
-- 관리자 가입승인/거절 + 회원 플랫폼 링크 관리
-- =========================================================


-- =========================================================
-- 1. 가입신청 거절 RPC
-- =========================================================

CREATE OR REPLACE FUNCTION public.admin_reject_join_request(
  p_session_token text,
  p_request_id uuid,
  p_admin_memo text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  v_admin_id uuid;
  v_request_status text;
BEGIN

  -- 관리자 로그인 확인
  SELECT a.id
  INTO v_admin_id
  FROM public.admin_sessions s
  JOIN public.admins a
    ON a.id = s.admin_id
  WHERE s.token_hash = encode(
    extensions.digest(
      p_session_token,
      'sha256'
    ),
    'hex'
  )
    AND s.expires_at > now()
    AND a.is_active = true
  LIMIT 1;


  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION
      '관리자 로그인 정보가 유효하지 않습니다.';
  END IF;


  -- 신청 상태 확인
  SELECT r.status
  INTO v_request_status
  FROM public.member_join_requests r
  WHERE r.id = p_request_id
  FOR UPDATE;


  IF v_request_status IS NULL THEN
    RAISE EXCEPTION
      '가입신청을 찾을 수 없습니다.';
  END IF;


  IF v_request_status <> 'pending' THEN
    RAISE EXCEPTION
      '이미 처리된 가입신청입니다.';
  END IF;


  -- 거절 처리
  UPDATE public.member_join_requests
  SET
    status = 'rejected',
    admin_memo = NULLIF(
      trim(p_admin_memo),
      ''
    ),
    reviewed_at = now(),
    reviewed_by = v_admin_id
  WHERE id = p_request_id;

END;
$function$;



-- =========================================================
-- 2. 회원 플랫폼 링크 저장 RPC
--
-- 인스타그램은 members.instagram_id에서 관리
-- 나머지 플랫폼은 member_platform_rooms에서 관리
--
-- 링크가 비어있으면 해당 플랫폼에서 제외
-- 링크가 있으면 해당 플랫폼에 포함
-- =========================================================

CREATE OR REPLACE FUNCTION public.admin_set_member_platform_link(
  p_session_token text,
  p_member_id uuid,
  p_platform text,
  p_account_value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  v_admin_id uuid;
  v_member_exists boolean;
  v_value text;
BEGIN

  -- 관리자 로그인 확인
  SELECT a.id
  INTO v_admin_id
  FROM public.admin_sessions s
  JOIN public.admins a
    ON a.id = s.admin_id
  WHERE s.token_hash = encode(
    extensions.digest(
      p_session_token,
      'sha256'
    ),
    'hex'
  )
    AND s.expires_at > now()
    AND a.is_active = true
  LIMIT 1;


  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION
      '관리자 로그인 정보가 유효하지 않습니다.';
  END IF;


  -- 회원 확인
  SELECT EXISTS (
    SELECT 1
    FROM public.members m
    WHERE m.id = p_member_id
  )
  INTO v_member_exists;


  IF NOT v_member_exists THEN
    RAISE EXCEPTION
      '회원을 찾을 수 없습니다.';
  END IF;


  -- 인스타그램은 여기서 수정하지 않음
  IF p_platform NOT IN (
    'blog',
    'naver_clip',
    'youtube',
    'tiktok',
    'today_house'
  ) THEN
    RAISE EXCEPTION
      '지원하지 않는 플랫폼입니다.';
  END IF;


  v_value :=
    NULLIF(
      trim(p_account_value),
      ''
    );


  -- 링크가 비어 있으면 해당 플랫폼에서 제외
  IF v_value IS NULL THEN

    DELETE FROM public.member_platform_rooms
    WHERE member_id = p_member_id
      AND platform = p_platform;

    RETURN;

  END IF;


  -- 링크가 있으면 등록 또는 수정
  INSERT INTO public.member_platform_rooms (
    member_id,
    platform,
    account_value
  )
  VALUES (
    p_member_id,
    p_platform,
    v_value
  )
  ON CONFLICT (
    member_id,
    platform
  )
  DO UPDATE SET
    account_value = EXCLUDED.account_value;

END;
$function$;



-- =========================================================
-- 3. 회원 플랫폼 전체 링크 조회 RPC
-- =========================================================

CREATE OR REPLACE FUNCTION public.admin_get_member_platform_links(
  p_session_token text,
  p_member_id uuid
)
RETURNS TABLE (
  platform text,
  account_value text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  v_admin_id uuid;
  v_instagram_id text;
BEGIN

  -- 관리자 로그인 확인
  SELECT a.id
  INTO v_admin_id
  FROM public.admin_sessions s
  JOIN public.admins a
    ON a.id = s.admin_id
  WHERE s.token_hash = encode(
    extensions.digest(
      p_session_token,
      'sha256'
    ),
    'hex'
  )
    AND s.expires_at > now()
    AND a.is_active = true
  LIMIT 1;


  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION
      '관리자 로그인 정보가 유효하지 않습니다.';
  END IF;


  -- 회원 인스타 아이디
  SELECT m.instagram_id
  INTO v_instagram_id
  FROM public.members m
  WHERE m.id = p_member_id;


  IF v_instagram_id IS NULL THEN
    RAISE EXCEPTION
      '회원을 찾을 수 없습니다.';
  END IF;


  -- 인스타그램
  RETURN QUERY

  SELECT
    'instagram'::text AS platform,
    v_instagram_id::text AS account_value


  UNION ALL


  -- 추가 플랫폼
  SELECT
    r.platform,
    r.account_value
  FROM public.member_platform_rooms r
  WHERE r.member_id = p_member_id
    AND r.platform IN (
      'blog',
      'naver_clip',
      'youtube',
      'tiktok',
      'today_house'
    );

END;
$function$;



-- =========================================================
-- 4. 가입신청 상세 조회
--
-- 관리자 화면에서
-- 신청자가 입력한 링크를 전부 볼 수 있음
-- =========================================================

CREATE OR REPLACE FUNCTION public.admin_get_join_request_platforms(
  p_session_token text,
  p_request_id uuid
)
RETURNS TABLE (
  platform text,
  account_value text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  v_admin_id uuid;
  v_instagram_id text;
BEGIN

  -- 관리자 로그인 확인
  SELECT a.id
  INTO v_admin_id
  FROM public.admin_sessions s
  JOIN public.admins a
    ON a.id = s.admin_id
  WHERE s.token_hash = encode(
    extensions.digest(
      p_session_token,
      'sha256'
    ),
    'hex'
  )
    AND s.expires_at > now()
    AND a.is_active = true
  LIMIT 1;


  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION
      '관리자 로그인 정보가 유효하지 않습니다.';
  END IF;


  SELECT r.instagram_id
  INTO v_instagram_id
  FROM public.member_join_requests r
  WHERE r.id = p_request_id;


  IF v_instagram_id IS NULL THEN
    RAISE EXCEPTION
      '가입신청을 찾을 수 없습니다.';
  END IF;


  -- 인스타그램은 항상 표시
  RETURN QUERY

  SELECT
    'instagram'::text,
    v_instagram_id::text


  UNION ALL


  SELECT
    rr.platform,
    rr.account_value
  FROM public.member_join_request_rooms rr
  WHERE rr.request_id = p_request_id
    AND NULLIF(
      trim(rr.account_value),
      ''
    ) IS NOT NULL;

END;
$function$;



-- =========================================================
-- 5. 권한 설정
-- =========================================================

REVOKE ALL ON FUNCTION
public.admin_reject_join_request(
  text,
  uuid,
  text
)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
public.admin_reject_join_request(
  text,
  uuid,
  text
)
TO anon;



REVOKE ALL ON FUNCTION
public.admin_set_member_platform_link(
  text,
  uuid,
  text,
  text
)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
public.admin_set_member_platform_link(
  text,
  uuid,
  text,
  text
)
TO anon;



REVOKE ALL ON FUNCTION
public.admin_get_member_platform_links(
  text,
  uuid
)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
public.admin_get_member_platform_links(
  text,
  uuid
)
TO anon;



REVOKE ALL ON FUNCTION
public.admin_get_join_request_platforms(
  text,
  uuid
)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
public.admin_get_join_request_platforms(
  text,
  uuid
)
TO anon;
