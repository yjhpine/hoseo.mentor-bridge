// 브라우저 보안 헤더 (docs/security-review.md).
// - 화면 응답(proxy를 거치는 모든 요청, 이동 응답 포함)에는 proxy가 아래 기본 헤더와 전체 CSP를 붙입니다.
// - proxy를 거치지 않는 정적 파일에는 next.config.ts와 public/_headers가 기본 헤더를 붙입니다.

/** CSP를 뺀 기본 보안 헤더 */
export const BASE_SECURITY_HEADERS: ReadonlyArray<{ key: string; value: string }> = [
  // 다른 사이트가 이 사이트를 틀(iframe)에 넣어 속이는 클릭재킹 방지 (옛 브라우저용, CSP frame-ancestors와 같은 뜻)
  { key: "X-Frame-Options", value: "DENY" },
  // 브라우저가 파일 형식을 멋대로 추측해 실행하지 않게
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 다른 사이트로 나갈 때 주소 전체(톡방 번호 등)를 넘기지 않게
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 쓰지 않는 카메라·마이크·위치 등을 막음 (알림은 이 목록과 무관)
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

/** Cloudflare Turnstile(자동 입력 방지 위젯)의 스크립트와 틀이 오는 곳 */
export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

/** 요청마다 새로 만드는 무작위 값. 이 값이 붙은 스크립트만 실행됩니다. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * 화면 응답의 Content-Security-Policy.
 * - script-src: nonce가 붙은 스크립트(Next.js가 자기 스크립트에 자동으로 붙임)와, 그 스크립트가 불러온 스크립트('strict-dynamic',
 *   Turnstile)만 실행. 공격자가 글 속에 심은 <script>나 onclick 같은 속성은 실행되지 않습니다.
 * - style-src: 화면 부품이 style 속성을 쓰므로 인라인 스타일은 허용합니다 (스크립트보다 위험이 훨씬 작음).
 * - connect-src: 브라우저가 직접 부르는 곳은 이 사이트와 Supabase(데이터·톡방 실시간)뿐입니다.
 * - img-src: Supabase는 나중에 멘토 사진을 Storage에서 받을 때를 위해 둡니다.
 */
export function buildContentSecurityPolicy({
  nonce,
  supabaseUrl,
  isDev = false,
}: {
  nonce: string;
  supabaseUrl: string;
  isDev?: boolean;
}): string {
  const supabase = new URL(supabaseUrl);
  const supabaseHttp = supabase.origin;
  const supabaseWs = `${supabase.protocol === "http:" ? "ws:" : "wss:"}//${supabase.host}`;
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 개발 서버에서만 React가 오류 위치를 보여 주려고 eval을 씁니다. 운영에는 넣지 않습니다.
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", TURNSTILE_ORIGIN, ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", supabaseHttp],
    "font-src": ["'self'"],
    "connect-src": ["'self'", supabaseHttp, supabaseWs],
    "frame-src": [TURNSTILE_ORIGIN],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const parts = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  if (!isDev) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}
