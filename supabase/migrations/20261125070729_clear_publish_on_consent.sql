-- 바로 공개로 바꾸기 전에 관리자가 이미 개설한 멘토도 자동 공개 표시를 끕니다 (11장 36번, 2026-11-25).
-- 이제 publish_on_consent는 쓰지 않으므로 남은 참 값을 모두 정리합니다.
update public.mentor_profiles
   set publish_on_consent = false
 where publish_on_consent;
