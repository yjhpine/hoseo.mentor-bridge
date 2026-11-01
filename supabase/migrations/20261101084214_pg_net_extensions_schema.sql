-- pg_net 확장을 public이 아니라 extensions 스키마에 둡니다 (Supabase 보안 점검 0014).
-- 함수는 확장이 만드는 net 스키마에 있어 트리거(net.http_post)는 그대로 동작합니다.
drop extension if exists pg_net;
create extension pg_net schema extensions;
