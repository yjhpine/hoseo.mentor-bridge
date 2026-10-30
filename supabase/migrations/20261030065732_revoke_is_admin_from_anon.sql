-- 비로그인 사용자의 정책에는 is_admin()이 없으므로 anon이 부를 이유가 없습니다 (보안 점검 0028).
-- authenticated는 RLS 정책에서 쓰므로 남겨 둡니다. 직접 불러도 자기 자신이 관리자인지만 알 수 있습니다.
revoke execute on function public.is_admin() from public, anon;
