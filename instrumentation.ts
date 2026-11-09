// 서버에서 화면·서버 액션을 처리하다 난 오류를 DB(issue_reports)에 남깁니다 (docs/architecture.md 11장 34번).
// 공개 키로 report_error()만 부릅니다(쿠키·세션 없이). 기록에 실패해도 요청 처리에는 영향을 주지 않습니다.
// Cloudflare Workers Logs에도 그대로 console.error가 남습니다.
import { LIMITS, cleanPath, describeError, isNoise, truncate } from "@/lib/errors/normalize";

export async function register() {}

type RequestInfo = { path: string; method: string; headers: Record<string, string | string[] | undefined> };
type ErrorContext = { routerKind: string; routePath: string; routeType: string };

export async function onRequestError(error: unknown, request: RequestInfo, context: ErrorContext) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;
    const described = describeError(error);
    if (isNoise(described.message, described.detail)) return;
    const agent = request.headers["user-agent"];
    await fetch(`${url}/rest/v1/rpc/report_error`, {
      method: "POST",
      headers: { apikey: key, "content-type": "application/json" },
      body: JSON.stringify({
        source: "server",
        message: described.message,
        detail: truncate(
          [`${request.method} ${context.routeType} ${context.routePath}`, described.detail].join("\n"),
          LIMITS.detail,
        ),
        path: cleanPath(request.path),
        user_agent: truncate(Array.isArray(agent) ? agent[0] : agent, LIMITS.userAgent),
      }),
    });
  } catch {
    // 기록 실패는 무시합니다.
  }
}
