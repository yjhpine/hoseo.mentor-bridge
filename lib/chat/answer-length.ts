// 멘토 답변 글자 수 (docs/architecture.md 6.3). DB의 answer_length()와 같은 결과를 내야 합니다.
// 공백 제외면 JavaScript의 \s를 모두 뺍니다. DB는 같은 글자들을 직접 나열해 둡니다.
// 화면에 보이지 않는 글자(한글 채움 문자, 폭 없는 공백, 방향 표시, 이체 선택자 등)도 뺍니다 (보안 검수 2차 C2).
// DB 마이그레이션 security_review_2의 answer_length()와 같은 목록입니다.
const INVISIBLE =
  /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\u2800\u3164\uFE00-\uFE0F\uFFA0\u{E0000}-\u{E007F}]/gu;

export function answerLength(body: string, countSpaces: boolean): number {
  const text = countSpaces ? body : body.replace(/\s/g, "").replace(INVISIBLE, "");
  // 한글 한 글자를 1자로 셉니다. 이모지 같은 문자도 Postgres char_length처럼 코드 포인트 단위로 셉니다.
  return Array.from(text).length;
}

export type AnswerRule = { minLength: number; countSpaces: boolean };

/** 시각을 한국 시간으로 보여 줍니다. 서버와 브라우저가 같은 결과를 내도록 시간대를 고정합니다. */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
