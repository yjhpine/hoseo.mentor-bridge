// Cloudflare Worker 진입점 (docs/architecture.md 10장 "일시 정지").
// 요청 처리는 OpenNext가 만든 .open-next/worker.js에 그대로 맡기고, 정기 실행(Cron Trigger)만 덧붙입니다.
// Supabase 무료 플랜은 7일 동안 사용이 적으면 프로젝트를 정지하므로, 하루 한 번 DB를 한 번 읽어 활동을 남깁니다.
// 일정은 wrangler.jsonc의 triggers.crons에 있습니다.

// 빌드 전에는 파일이 없고 빌드 뒤에는 있어서, 두 경우 모두 통과하도록 @ts-ignore를 씁니다.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: OpenNext 빌드(npx opennextjs-cloudflare build)가 만드는 파일입니다.
import openNextWorker from "../.open-next/worker.js";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: OpenNext 빌드가 만드는 파일입니다. Durable Object 클래스도 그대로 내보냅니다.
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "../.open-next/worker.js";

type Env = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
};

type ScheduledController = { cron: string; scheduledTime: number };

/** 공개 키로 단과대학 목록 한 줄을 읽습니다. 가입 화면이 이미 비로그인으로 읽는 값이라 새 권한이 필요 없습니다. */
export async function keepSupabaseAwake(env: Env) {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/colleges?select=id&limit=1`;
  const response = await fetch(url, {
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      "User-Agent": "hoseo-mentor-keepalive",
    },
  });
  const body = await response.text();
  if (!response.ok) {
    // 실패로 끝내야 Cloudflare 대시보드의 Cron 기록에 실패로 남습니다.
    throw new Error(`Supabase keepalive 실패: ${response.status} ${body.slice(0, 200)}`);
  }
  return { status: response.status, body };
}

const worker = {
  fetch: openNextWorker.fetch,
  async scheduled(controller: ScheduledController, env: Env) {
    const result = await keepSupabaseAwake(env);
    console.log(`Supabase keepalive 성공 (${controller.cron}): ${result.status} ${result.body}`);
  },
};

export default worker;
