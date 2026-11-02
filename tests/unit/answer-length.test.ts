import { describe, expect, it } from "vitest";
import { answerLength, formatTime } from "@/lib/chat/answer-length";

// 멘토 답변 50자 검증은 화면(answerLength)과 DB 트리거(answer_length)가 같은 값을 내야 합니다.
// 기대값은 2026-11-02에 운영 DB의 answer_length()가 낸 값(공백 제외)과 char_length()(공백 포함)입니다.
const DB_RESULTS = [
  { body: "안녕하세요", withoutSpaces: 5, withSpaces: 5 },
  { body: "안 녕 하 세 요", withoutSpaces: 5, withSpaces: 9 },
  { body: "줄\n바꿈\t탭", withoutSpaces: 4, withSpaces: 6 },
  { body: "전각　공백", withoutSpaces: 4, withSpaces: 5 },
  { body: "emoji 😀 ok", withoutSpaces: 8, withSpaces: 10 },
  {
    body: "전자회로와 반도체공학을 깊게 공부하세요. 면접에서 공정 원리를 물어볼 때 이 두 과목이 기본이 됩니다. 현장 실습도 꼭 해 보세요.",
    withoutSpaces: 55,
    withSpaces: 73,
  },
];

describe("답변 글자 수가 DB와 같음", () => {
  for (const row of DB_RESULTS) {
    it(JSON.stringify(row.body.slice(0, 12)), () => {
      expect(answerLength(row.body, false)).toBe(row.withoutSpaces);
      expect(answerLength(row.body, true)).toBe(row.withSpaces);
    });
  }

  it("공백만으로는 글자 수를 채울 수 없음", () => {
    expect(answerLength(" ".repeat(100), false)).toBe(0);
  });
});

describe("시각 표시", () => {
  it("한국 시간으로 보여 줌", () => {
    // 2026-11-01 15:30 UTC = 한국 2026-11-02 00:30
    expect(formatTime("2026-11-01T15:30:00Z")).toContain("11. 2.");
  });
});
