// 로그인하지 않아도 볼 수 있는 화면 (docs/architecture.md 2.2, 4.1, 11장 32번).
// 멘토 상세(/mentors/[id]), 강의 상세(/courses/[id]), 톡방, 마이페이지, 관리자 화면은 로그인해야 합니다.

export const LOGIN_PATH = "/auth/login";

// 개인정보 처리방침(6.7), 웹 앱 매니페스트와 알림 서비스 워커(6.9)도 로그인과 상관없이 받을 수 있어야 합니다.
const EXACT_PUBLIC_PATHS = new Set([
  "/",
  "/about",
  "/guide",
  "/mentors",
  "/courses",
  "/privacy",
  "/manifest.webmanifest",
  "/sw.js",
]);

/** 단과대학 구역 화면 /colleges/[숫자] */
const COLLEGE_PATH = /^\/colleges\/[0-9]+$/;

export function isPublicPath(pathname: string): boolean {
  return EXACT_PUBLIC_PATHS.has(pathname) || COLLEGE_PATH.test(pathname);
}

/**
 * 로그인한 뒤 돌아갈 주소. 이 사이트 안의 경로만 받습니다(오픈 리다이렉트 방지).
 * `/`로 시작하고 `//`, `/\`로 시작하지 않으며, 제어 문자가 없어야 합니다. 로그인 화면 자체로는 돌려보내지 않습니다.
 */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  // 탭·줄바꿈 등은 브라우저가 지우고 해석해 //로 바뀔 수 있습니다.
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return null;
  if (value === "/auth" || value.startsWith("/auth/") || value.startsWith("/auth?")) return null;
  return value;
}

/** 로그인 화면 주소. 돌아갈 곳이 있으면 ?next=를 붙입니다. */
export function loginHref(next?: string | null): string {
  const safe = safeNextPath(next);
  return safe && safe !== "/" ? `${LOGIN_PATH}?next=${encodeURIComponent(safe)}` : LOGIN_PATH;
}
