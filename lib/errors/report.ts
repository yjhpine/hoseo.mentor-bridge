"use client";

// 화면 오류를 DB(issue_reports)에 남깁니다 (11장 34번). 로그인했으면 세션이 붙어 누가 겪었는지도 남습니다.
// 같은 문구는 화면당 한 번, 화면당 최대 5건만 보내고, 실패해도 화면에는 아무 영향을 주지 않습니다.
import { createClient } from "@/lib/supabase/client";
import { LIMITS, cleanPath, describeError, isNoise, truncate } from "./normalize";

const MAX_PER_PAGE = 5;
const sent = new Set<string>();

export function reportClientError(value: unknown, extra?: { detail?: string }) {
  try {
    const described = describeError(value);
    const detail = [described.detail, extra?.detail].filter(Boolean).join("\n");
    if (isNoise(described.message, detail)) return;
    const key = described.message;
    if (sent.has(key) || sent.size >= MAX_PER_PAGE) return;
    sent.add(key);
    void createClient()
      .rpc("report_error", {
        source: "client",
        message: described.message,
        detail: truncate(detail, LIMITS.detail),
        path: cleanPath(window.location.pathname),
        user_agent: truncate(navigator.userAgent, LIMITS.userAgent),
      })
      .then(() => undefined, () => undefined);
  } catch {
    // 오류를 알리다 생긴 오류는 무시합니다.
  }
}
