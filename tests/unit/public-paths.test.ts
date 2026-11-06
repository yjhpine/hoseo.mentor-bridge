import { describe, expect, it } from "vitest";
import { isPublicPath, loginHref, safeNextPath } from "@/lib/auth/public-paths";

describe("공개 화면 (11장 32번)", () => {
  it("메인·소개·이용 안내·멘토 목록·구역·강의 목록은 공개", () => {
    for (const path of ["/", "/about", "/guide", "/mentors", "/colleges/6", "/courses", "/privacy", "/sw.js"]) {
      expect(isPublicPath(path)).toBe(true);
    }
  });

  it("멘토 상세·강의 상세·톡방·마이페이지·관리자는 로그인 필요", () => {
    for (const path of [
      "/mentors/3f1c",
      "/courses/12",
      "/chats",
      "/chats/1",
      "/mypage",
      "/mentor",
      "/admin",
      "/account/pin",
      "/colleges/6/x",
      "/colleges/abc",
      "/about/x",
    ]) {
      expect(isPublicPath(path)).toBe(false);
    }
  });
});

describe("로그인 뒤 돌아갈 주소", () => {
  it("사이트 안의 경로는 그대로", () => {
    expect(safeNextPath("/mentors/abc")).toBe("/mentors/abc");
    expect(safeNextPath("/mentors?college=6&q=게임")).toBe("/mentors?college=6&q=게임");
  });

  it("다른 사이트로 가는 주소는 거부", () => {
    for (const value of [
      "//evil.com",
      "/\\evil.com",
      "https://evil.com",
      "http:/evil.com",
      "evil.com",
      "javascript:alert(1)",
      "/\t/evil.com",
      "/\n/evil.com",
      "",
      null,
      undefined,
      42,
    ]) {
      expect(safeNextPath(value)).toBeNull();
    }
  });

  it("로그인·가입 화면으로는 돌려보내지 않음", () => {
    expect(safeNextPath("/auth/login")).toBeNull();
    expect(safeNextPath("/auth/sign-up")).toBeNull();
  });

  it("로그인 화면 주소에 next를 붙임", () => {
    expect(loginHref("/mentors/abc")).toBe("/auth/login?next=%2Fmentors%2Fabc");
    expect(loginHref("/")).toBe("/auth/login");
    expect(loginHref("//evil.com")).toBe("/auth/login");
    expect(loginHref()).toBe("/auth/login");
  });
});
