BEGIN;

DO $$
DECLARE
  v_member_id uuid;
  v_admin_id uuid;
BEGIN

  /* 세미 회원 찾기 */
  SELECT id
  INTO v_member_id
  FROM public.members
  WHERE lower(
    regexp_replace(trim(instagram_id), '^@', '')
  ) = lower('homensem_')
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION '세미(@homensem_) 회원을 찾을 수 없습니다.';
  END IF;


  /* 기존 최고관리자 찾기 */
  SELECT id
  INTO v_admin_id
  FROM public.admins
  WHERE role = 'super_admin'
    AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION '기존 최고관리자 계정을 찾을 수 없습니다.';
  END IF;


  /* 세미 회원과 최고관리자 연결 */
  UPDATE public.admins
  SET
    member_id = v_member_id,
    kakao_nickname = '세미',
    instagram_id = 'homensem_',
    role = 'super_admin',
    is_active = true
  WHERE id = v_admin_id;

END $$;

COMMIT;


/* 결과 확인 */
SELECT
  m.kakao_nickname,
  m.instagram_id,
  a.role,
  a.is_active,
  a.member_id
FROM public.admins a
JOIN public.members m
  ON m.id = a.member_id
WHERE lower(
  regexp_replace(trim(m.instagram_id), '^@', '')
) = lower('homensem_');
