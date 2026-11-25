// 기본 프로필 캐릭터 (docs/architecture.md 11장 38번).
// 사진이 없는 멘토는 정장 입은 동물 10종 중 고른 캐릭터(없으면 id로 자동), 멘티는 6종 중 id로 자동.
// 그림은 담당자가 ChatGPT로 만들어 제공한 512px WEBP입니다(public/characters/).
// 서버·브라우저 코드 양쪽에서 씁니다.

export type Character = { id: number; name: string; src: string };

const two = (n: number) => String(n).padStart(2, "0");

const MENTOR_NAMES = ["곰", "고양이", "토끼", "시바견", "여우", "판다", "호랑이", "펭귄", "너구리", "햄스터"];
const MENTEE_NAMES = ["곰", "고양이", "토끼", "시바견", "판다", "펭귄"];

export const MENTOR_CHARACTERS: readonly Character[] = MENTOR_NAMES.map((name, i) => ({
  id: i + 1,
  name,
  src: `/characters/mentor-${two(i + 1)}.webp`,
}));

export const MENTEE_CHARACTERS: readonly Character[] = MENTEE_NAMES.map((name, i) => ({
  id: i + 1,
  name,
  src: `/characters/mentee-${two(i + 1)}.webp`,
}));

/** id(uuid)로 늘 같은 번호(1~count)를 고릅니다. */
export function characterIndexFor(id: string, count: number): number {
  let hash = 0;
  for (const ch of id.toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (hash % count) + 1;
}

/** 멘토가 고른 번호가 올바르면 그 번호, 아니면 id로 정한 번호 */
export function mentorCharacterId(mentorId: string, chosen?: number | null): number {
  if (typeof chosen === "number" && Number.isInteger(chosen) && chosen >= 1 && chosen <= MENTOR_CHARACTERS.length) {
    return chosen;
  }
  return characterIndexFor(mentorId, MENTOR_CHARACTERS.length);
}

/** 사진이 없는 멘토의 기본 이미지 */
export function mentorCharacterSrc(mentorId: string, chosen?: number | null): string {
  return MENTOR_CHARACTERS[mentorCharacterId(mentorId, chosen) - 1].src;
}

/** 멘티의 기본 이미지 (멘티는 고르지 않음) */
export function menteeCharacterSrc(menteeId: string): string {
  return MENTEE_CHARACTERS[characterIndexFor(menteeId, MENTEE_CHARACTERS.length) - 1].src;
}
