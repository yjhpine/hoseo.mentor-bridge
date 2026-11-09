import { describe, expect, it } from "vitest";
import { LIMITS, cleanPath, describeError, isNoise, truncate } from "@/lib/errors/normalize";

describe("오류 기록 다듬기 (11장 34번)", () => {
  it("주소의 쿼리·해시를 버림", () => {
    expect(cleanPath("/mentors?q=홍길동&college=6")).toBe("/mentors");
    expect(cleanPath("/chats/3#bottom")).toBe("/chats/3");
    expect(cleanPath("https://example.com/courses/9?x=1")).toBe("/courses/9");
    expect(cleanPath("https://example.com")).toBe("/");
    expect(cleanPath(null)).toBe("");
  });

  it("길이를 자름", () => {
    expect(truncate("a".repeat(5000), LIMITS.detail)).toHaveLength(LIMITS.detail);
    expect(cleanPath("/" + "x".repeat(400))).toHaveLength(LIMITS.path);
    expect(truncate(undefined, 10)).toBe("");
  });

  it("잡음은 거름", () => {
    expect(isNoise("ResizeObserver loop completed with undelivered notifications.")).toBe(true);
    expect(isNoise("Script error.")).toBe(true);
    expect(isNoise("TypeError: x", "at chrome-extension://abc/content.js:1:1")).toBe(true);
    expect(isNoise("Error: NEXT_REDIRECT")).toBe(true);
    expect(isNoise("   ")).toBe(true);
    expect(isNoise("TypeError: Cannot read properties of undefined (reading 'id')")).toBe(false);
  });

  it("오류 객체를 문구와 상세로", () => {
    const error = Object.assign(new TypeError("boom"), { digest: "123" });
    const described = describeError(error);
    expect(described.message).toBe("TypeError: boom");
    expect(described.detail.startsWith("digest: 123")).toBe(true);
    expect(describeError("문자열 오류").message).toBe("문자열 오류");
    expect(describeError({ code: 1 }).message).toBe('{"code":1}');
    expect(describeError(new Error("x".repeat(2000))).message).toHaveLength(LIMITS.message);
  });
});
