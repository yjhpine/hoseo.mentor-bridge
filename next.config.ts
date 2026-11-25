import type { NextConfig } from "next";
import { BASE_SECURITY_HEADERS } from "./lib/security/headers";

// 보안 헤더 (docs/security-review.md M1, 2차 C1).
// 화면 응답에는 proxy(lib/supabase/proxy.ts)가 기본 헤더와 요청마다 nonce를 넣은 전체 CSP를 붙입니다.
// 여기서는 proxy를 거치지 않는 경로(proxy.ts matcher에서 빠지는 이미지 최적화·파비콘·이미지 파일)에만 같은 값을 붙입니다.
// 모든 경로에 붙이면 화면 응답에 같은 헤더가 두 번 붙습니다(X-Frame-Options: DENY, DENY, 2026-11-25 3차 점검).
// /_next/static과 public 파일은 Cloudflare 정적 파일이라 public/_headers가 맡습니다.
// CSP는 여기서 붙이지 않습니다. 같은 이름의 헤더가 두 번 붙으면 proxy의 CSP를 덮거나 겹칠 수 있습니다.

// Cache Components(cacheComponents)는 끕니다. Cloudflare Workers(OpenNext)에서 setTimeout 구현 차이로
// 렌더링이 멈추는 문제가 있었고, 이 앱은 'use cache' 캐시를 쓰지 않아 잃는 것이 없습니다.
const nextConfig: NextConfig = {
  // 응답에 "x-powered-by: Next.js"를 붙이지 않습니다 (사용 기술 노출 줄이기).
  poweredByHeader: false,
  experimental: {
    // Next.js 보안 업그레이드 안내(next upgrade --agent=security)를 따르도록 표시합니다 (2026-11-24, 16.4.3 → 16.4.6).
    agentUpgrade: "security",
  },
  async headers() {
    const headers = [...BASE_SECURITY_HEADERS];
    return [
      { source: "/_next/image/:path*", headers },
      { source: "/favicon.ico", headers },
      { source: "/:path(.*\\.(?:svg|png|jpg|jpeg|gif|webp))", headers },
    ];
  },
};

export default nextConfig;
