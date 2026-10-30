// 소속·이름으로 Supabase Auth에 넘길 가상 이메일을 계산합니다 (docs/architecture.md 6.1).
// DB의 normalize_login_name(), login_email()과 같은 결과를 내야 합니다.
// 한쪽을 고치면 다른 쪽도 함께 고칩니다.

export const LOGIN_EMAIL_DOMAIN = "login.hoseo-mentor.invalid";

export type LoginGroup = "admin" | "mentor" | `dept:${number}`;

// JavaScript의 \s입니다. DB의 normalize_login_name()은 같은 글자들을 직접 나열해 둡니다.
const WHITESPACE = /\s/g;

const PIN_PATTERN = /^\d{6}$/;

export function departmentLoginGroup(departmentId: number): LoginGroup {
  return `dept:${departmentId}`;
}

/** 이름 + 구분 문자를 NFC로 정규화하고, 공백을 모두 빼고, 영문 대문자만 소문자로 바꿉니다. */
export function normalizeLoginName(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(WHITESPACE, "")
    .replace(/[A-Z]/g, (c) => c.toLowerCase());
}

/** loginName은 normalizeLoginName()을 거친 값을 받습니다. */
export async function loginEmail(
  loginGroup: LoginGroup,
  loginName: string,
): Promise<string> {
  const data = new TextEncoder().encode(`${loginGroup}|${loginName}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  return `u-${hex.slice(0, 32)}@${LOGIN_EMAIL_DOMAIN}`;
}

export function isValidPin(pin: string): boolean {
  return PIN_PATTERN.test(pin);
}
