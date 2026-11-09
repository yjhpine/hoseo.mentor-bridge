// 오류 기록에 남길 값 다듬기 (docs/architecture.md 11장 34번). 화면·서버 모두 쓰는 순수 함수입니다.
// DB 함수 report_error()도 길이를 자르고 주소의 ? 뒤를 버리지만, 보내기 전에 한 번 더 줄입니다.

export const LIMITS = { message: 1000, detail: 4000, path: 300, userAgent: 300 } as const;

export function truncate(value: string | null | undefined, max: number): string {
  if (!value) return "";
  return value.length > max ? value.slice(0, max) : value;
}

/** 주소에서 쿼리·해시를 버립니다. 검색어 같은 개인정보가 남지 않게 합니다. 전체 URL이면 경로만 남깁니다. */
export function cleanPath(raw: string | null | undefined): string {
  if (!raw) return "";
  let path = raw;
  const scheme = path.match(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i);
  if (scheme) path = path.slice(scheme[0].length) || "/";
  path = path.split("#")[0].split("?")[0];
  return truncate(path, LIMITS.path);
}

// 사용자 화면과 상관없는 잡음: 브라우저 확장 프로그램, ResizeObserver 경고, 다른 출처 스크립트의 가려진 오류,
// Next.js가 일부러 던지는 이동·찾을 수 없음 신호
const NOISE = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i,
  /(chrome|moz|safari(-web)?)-extension:\/\//i,
  /NEXT_REDIRECT|NEXT_NOT_FOUND|NEXT_HTTP_ERROR_FALLBACK/,
  /^AbortError\b|The (user|operation) (aborted|was aborted)/i,
];

export function isNoise(message: string, detail = ""): boolean {
  if (!message.trim()) return true;
  return NOISE.some((pattern) => pattern.test(message) || pattern.test(detail));
}

/** 던져진 값(오류 객체, 문자열 등)을 기록용 문구와 상세로 바꿉니다. 상세에는 digest와 스택 앞부분만 남깁니다. */
export function describeError(value: unknown): { message: string; detail: string } {
  if (value instanceof Error) {
    const digest = (value as Error & { digest?: string }).digest;
    const stack = (value.stack ?? "").split("\n").slice(0, 12).join("\n");
    return {
      message: truncate(`${value.name}: ${value.message}`, LIMITS.message),
      detail: truncate([digest ? `digest: ${digest}` : "", stack].filter(Boolean).join("\n"), LIMITS.detail),
    };
  }
  if (typeof value === "string") return { message: truncate(value, LIMITS.message), detail: "" };
  try {
    return { message: truncate(JSON.stringify(value) ?? String(value), LIMITS.message), detail: "" };
  } catch {
    return { message: truncate(String(value), LIMITS.message), detail: "" };
  }
}
