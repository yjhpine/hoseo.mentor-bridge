import type { NextConfig } from "next";

// 모든 화면 응답에 붙이는 보안 헤더 (docs/security-review.md M1).
// - frame-ancestors 'none' / X-Frame-Options: 다른 사이트가 이 사이트를 틀(iframe)에 넣어 속이는 클릭재킹 방지
// - nosniff: 브라우저가 파일 형식을 멋대로 추측해 실행하지 않게
// - Referrer-Policy: 다른 사이트로 나갈 때 주소 전체(톡방 번호 등)를 넘기지 않게
// - Permissions-Policy: 쓰지 않는 카메라·마이크·위치 등을 막음 (알림은 이 목록과 무관)
// 스크립트 출처를 제한하는 전체 CSP는 Turnstile·Supabase·Next.js 인라인 스크립트와 맞춰야 해서 아직 넣지 않습니다.
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

// Cache Components(cacheComponents)는 끕니다. Cloudflare Workers(OpenNext)에서 setTimeout 구현 차이로
// 렌더링이 멈추는 문제가 있었고, 이 앱은 'use cache' 캐시를 쓰지 않아 잃는 것이 없습니다.
const nextConfig: NextConfig = {
  // 응답에 "x-powered-by: Next.js"를 붙이지 않습니다 (사용 기술 노출 줄이기).
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
