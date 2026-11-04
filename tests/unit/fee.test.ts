import { describe, expect, it } from "vitest";
import { calculateFee, isCapped, parseWon, won } from "@/features/admin/lib/fee";

// 강사료 자동 계산 (11장 29·30번)

describe("계산 금액", () => {
  it("답변 수 × 단가", () => {
    expect(calculateFee(7, { perAnswer: 10_000, cap: null })).toBe(70_000);
    expect(calculateFee(0, { perAnswer: 10_000, cap: null })).toBe(0);
  });

  it("상한을 넘지 않음", () => {
    const rate = { perAnswer: 10_000, cap: 50_000 };
    expect(calculateFee(7, rate)).toBe(50_000);
    expect(isCapped(7, rate)).toBe(true);
    expect(calculateFee(5, rate)).toBe(50_000);
    expect(isCapped(5, rate)).toBe(false);
    expect(calculateFee(3, rate)).toBe(30_000);
  });

  it("상한 0원이면 0원", () => {
    expect(calculateFee(3, { perAnswer: 10_000, cap: 0 })).toBe(0);
  });
});

describe("금액 입력", () => {
  it("쉼표·공백·'원'을 빼고 읽음", () => {
    expect(parseWon("12,000")).toBe(12000);
    expect(parseWon(" 12 000원 ")).toBe(12000);
    expect(parseWon("")).toBeNull();
  });

  it("음수·소수·문자는 잘못된 값", () => {
    expect(parseWon("-100")).toBeNaN();
    expect(parseWon("1.5")).toBeNaN();
    expect(parseWon("만원")).toBeNaN();
  });

  it("표시", () => {
    expect(won(1234567)).toBe("1,234,567원");
  });
});
