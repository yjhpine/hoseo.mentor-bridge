// 하루 한 번 Supabase 깨우기 (학교 서버용, docs/architecture.md 10장 "일시 정지").
// Supabase 무료 플랜은 7일 동안 사용이 적으면 프로젝트를 정지하므로, 공개 키로 단과대학 한 줄을 읽어 활동을 남깁니다.
// Cloudflare에서는 worker/index.ts의 keepSupabaseAwake가 같은 일을 합니다. 요청을 바꾸면 두 곳을 같이 고칩니다.
// 실행: node --env-file=deploy/school/.env scripts/keepalive.mjs   (Docker: docker exec hoseo-mentor node keepalive.mjs)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY가 필요합니다.");
  process.exit(2);
}
const response = await fetch(`${url}/rest/v1/colleges?select=id&limit=1`, {
  headers: { apikey: key, "User-Agent": "hoseo-mentor-keepalive" },
});
const body = await response.text();
const line = `${new Date().toISOString()} Supabase keepalive ${response.ok ? "성공" : "실패"}: ${response.status} ${body.slice(0, 200)}`;
if (!response.ok) {
  console.error(line);
  process.exit(1);
}
console.log(line);
