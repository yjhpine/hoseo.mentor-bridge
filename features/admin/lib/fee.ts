// 강사료 계산 (docs/architecture.md 6.6, 11장 29·30번)
// 계산 금액 = 답변 수 × 학기 단가. 상한이 있으면 상한을 넘지 않습니다.
// 계산 금액은 추천값이고, 최종 금액은 관리자가 확인하고 고쳐서 책정합니다.

export type FeeRate = { perAnswer: number; cap: number | null };

/** DB 제약과 같은 범위: 단가 0~1천만 원, 상한 0~1억 원 */
export const MAX_PER_ANSWER = 10_000_000;
export const MAX_CAP = 100_000_000;

export function calculateFee(answerCount: number, rate: FeeRate): number {
  const raw = Math.max(0, answerCount) * rate.perAnswer;
  return rate.cap === null ? raw : Math.min(raw, rate.cap);
}

/** 상한 때문에 계산 금액이 줄었는지 */
export function isCapped(answerCount: number, rate: FeeRate): boolean {
  return rate.cap !== null && Math.max(0, answerCount) * rate.perAnswer > rate.cap;
}

/** "12,000" "12000원" " 12 000 " 같은 입력을 원 단위 정수로. 비어 있으면 null, 잘못된 값이면 NaN */
export function parseWon(input: string): number | null {
  const text = input.replace(/[,\s원]/g, "");
  if (text === "") return null;
  return /^\d+$/.test(text) ? Number(text) : NaN;
}

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
