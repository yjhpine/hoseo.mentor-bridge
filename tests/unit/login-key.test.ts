import { describe, expect, it } from "vitest";
import {
  cleanName,
  isValidName,
  isValidNameTag,
  isValidPin,
  loginEmail,
  normalizeLoginName,
  parseLoginGroup,
} from "@/lib/auth/login-key";

// 앱(lib/auth/login-key.ts)과 DB(normalize_login_name, login_email)가 같은 가상 이메일을 내야 로그인이 됩니다.
// 아래 기대값은 2026-11-02에 운영 DB 함수가 실제로 낸 값입니다. 한쪽만 고치면 이 시험이 깨집니다.
const DB_RESULTS = [
  { raw: "홍길동", loginName: "홍길동", dept25: "u-5f38207fffddccb4e170a34bc707612f", mentor: "u-043287be3d64aa7624992bc7daa24360" },
  { raw: "홍 길 동", loginName: "홍길동", dept25: "u-5f38207fffddccb4e170a34bc707612f", mentor: "u-043287be3d64aa7624992bc7daa24360" },
  { raw: " Hong GilDong A ", loginName: "honggildonga", dept25: "u-67012e2d6a73650981eec46378c8482f", mentor: "u-43b3086d642d6910390d94d88b1c27b9" },
  { raw: "홍길동　A", loginName: "홍길동a", dept25: "u-ce3bcfbc4953b48d6b88c42dc35df503", mentor: "u-38ac999dc332ea6772050d3eacc0ea2d" },
  { raw: "홍길동 B", loginName: "홍길동b", dept25: "u-b3947db05135fc0cf31fe3a36f1c5ec5", mentor: "u-7207cba8e914db75ffaf9b748e4e962f" },
  // 자모로 풀어 쓴(NFD) 홍길동도 같은 계정이어야 합니다 (휴대폰 키보드에 따라 생김).
  { raw: "홍길동", loginName: "홍길동", dept25: "u-5f38207fffddccb4e170a34bc707612f", mentor: "u-043287be3d64aa7624992bc7daa24360" },
  { raw: "Kim\tMinJi\n7", loginName: "kimminji7", dept25: "u-53a544b261811bfc95fac4992f4e1aad", mentor: "u-447119a20da2ba9922542e3c977ac929" },
];

describe("가상 이메일이 DB와 같음", () => {
  for (const row of DB_RESULTS) {
    it(JSON.stringify(row.raw), async () => {
      const loginName = normalizeLoginName(row.raw);
      expect(loginName).toBe(row.loginName);
      expect(await loginEmail("dept:25", loginName)).toBe(`${row.dept25}@login.hoseo-mentor.invalid`);
      expect(await loginEmail("mentor", loginName)).toBe(`${row.mentor}@login.hoseo-mentor.invalid`);
    });
  }
});

describe("입력 검사", () => {
  it("소속 값", () => {
    expect(parseLoginGroup("admin")).toBe("admin");
    expect(parseLoginGroup("mentor")).toBe("mentor");
    expect(parseLoginGroup("dept:25")).toBe("dept:25");
    expect(parseLoginGroup("dept:0")).toBeNull();
    expect(parseLoginGroup("dept:abc")).toBeNull();
    expect(parseLoginGroup("teacher")).toBeNull();
  });

  it("이름: 한글·영문, 단어 사이 한 칸, 30자까지", () => {
    expect(cleanName("  홍   길동 ")).toBe("홍 길동");
    expect(isValidName("홍길동")).toBe(true);
    expect(isValidName("Hong Gildong")).toBe(true);
    expect(isValidName("홍길동1")).toBe(false);
    expect(isValidName("홍길동!")).toBe(false);
    expect(isValidName("가".repeat(30))).toBe(true);
    expect(isValidName("가".repeat(31))).toBe(false);
  });

  it("구분 문자: 영문·숫자 1~3자", () => {
    expect(isValidNameTag("A")).toBe(true);
    expect(isValidNameTag("a12")).toBe(true);
    expect(isValidNameTag("ABCD")).toBe(false);
    expect(isValidNameTag("가")).toBe(false);
    expect(isValidNameTag("")).toBe(false);
  });

  it("PIN: 숫자 6자리", () => {
    expect(isValidPin("123456")).toBe(true);
    expect(isValidPin("12345")).toBe(false);
    expect(isValidPin("1234567")).toBe(false);
    expect(isValidPin("12345a")).toBe(false);
    expect(isValidPin("１２３４５６")).toBe(false);
  });
});
