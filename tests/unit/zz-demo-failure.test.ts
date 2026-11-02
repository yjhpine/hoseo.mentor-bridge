// 시연용: 자동 검사가 실패하면 어떻게 보이는지 확인하려고 일부러 틀리게 만든 시험입니다. 확인 뒤 지웁니다.
import { expect, it } from "vitest";
import { answerLength } from "@/lib/chat/answer-length";

it("시연용 실패: 답변 글자 수 기대값을 일부러 틀리게", () => {
  expect(answerLength("안 녕 하 세 요", false)).toBe(9);
});
