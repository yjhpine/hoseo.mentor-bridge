// 소속·이름으로 Supabase Auth에 넘길 가상 이메일을 계산합니다 (docs/architecture.md 6.1).
// DB의 normalize_login_name(), login_email()과 같은 결과를 내야 합니다.
// 한쪽을 고치면 다른 쪽도 함께 고칩니다.

export const LOGIN_EMAIL_DOMAIN = "login.hoseo-mentor.invalid";

export type LoginGroup = "admin" | "mentor" | `dept:${number}`;

// JavaScript의 \s입니다. DB의 normalize_login_name()은 같은 글자들을 직접 나열해 둡니다.
const WHITESPACE = /\s/g;

const PIN_PATTERN = /^\d{6}$/;
const LOGIN_GROUP_PATTERN = /^(admin|mentor|dept:[1-9][0-9]*)$/;

// DB profiles 테이블의 CHECK와 같은 규칙입니다.
export const NAME_MAX_LENGTH = 30;
const NAME_PATTERN = /^[가-힣A-Za-z]+( [가-힣A-Za-z]+)*$/;
const NAME_TAG_PATTERN = /^[A-Za-z0-9]{1,3}$/;

export function departmentLoginGroup(departmentId: number): LoginGroup {
  return `dept:${departmentId}`;
}

export function parseLoginGroup(value: string): LoginGroup | null {
  return LOGIN_GROUP_PATTERN.test(value) ? (value as LoginGroup) : null;
}

/** 가입할 때 받은 이름을 저장할 모양으로 다듬습니다: NFC, 앞뒤 공백 제거, 연속 공백은 한 칸. */
export function cleanName(raw: string): string {
  return raw.normalize("NFC").trim().replace(/\s+/g, " ");
}

export function isValidName(name: string): boolean {
  return name.length <= NAME_MAX_LENGTH && NAME_PATTERN.test(name);
}

export function isValidNameTag(tag: string): boolean {
  return NAME_TAG_PATTERN.test(tag);
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
