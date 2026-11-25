-- 관리자가 대신 만든 멘토를 동의 없이 바로 공개 (docs/architecture.md 11장 36번, 2026-11-25 변경)
-- 구역을 정해 만들었지만 동의를 기다리던 멘토(publish_on_consent)를 지금 공개합니다.
-- 앞으로는 admin-users의 create_mentor가 구역이 있으면 만들 때 바로 공개하므로 publish_on_consent는 쓰지 않습니다.
-- 스키마는 바꾸지 않습니다. 공개 상태·자동 공개 설정은 관리자·백엔드만 바꿀 수 있어 마이그레이션으로 바꿉니다.

update public.mentor_profiles
   set status = 'published',
       published_at = coalesce(published_at, now()),
       publish_on_consent = false
 where publish_on_consent
   and status = 'pending'
   and college_id is not null;
