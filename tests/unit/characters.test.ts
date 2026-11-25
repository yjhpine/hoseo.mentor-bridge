import { describe, expect, it } from "vitest";
import {
  MENTEE_CHARACTERS,
  MENTOR_CHARACTERS,
  characterIndexFor,
  menteeCharacterId,
  menteeCharacterSrc,
  mentorCharacterId,
  mentorCharacterSrc,
} from "@/features/mentors/lib/characters";

const A = "2a384d3c-4417-4be4-9039-fba063427286";
const B = "e0000000-0000-4000-8000-000000000011";

describe("기본 프로필 캐릭터 (11장 38번)", () => {
  it("멘토 10종, 멘티 6종이고 그림 주소가 겹치지 않음", () => {
    expect(MENTOR_CHARACTERS).toHaveLength(10);
    expect(MENTEE_CHARACTERS).toHaveLength(6);
    const all = [...MENTOR_CHARACTERS, ...MENTEE_CHARACTERS].map((c) => c.src);
    expect(new Set(all).size).toBe(all.length);
    expect(MENTOR_CHARACTERS[0].src).toBe("/characters/mentor-01.webp");
    expect(MENTEE_CHARACTERS[5].src).toBe("/characters/mentee-06.webp");
  });

  it("같은 id는 늘 같은 번호, 번호는 범위 안", () => {
    for (const id of [A, B, A.toUpperCase()]) {
      const n = characterIndexFor(id, 10);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(10);
      expect(characterIndexFor(id, 10)).toBe(n);
    }
    expect(characterIndexFor(A, 10)).toBe(characterIndexFor(A.toUpperCase(), 10));
  });

  it("멘토가 고른 번호가 먼저, 잘못된 번호면 자동", () => {
    expect(mentorCharacterId(A, 7)).toBe(7);
    expect(mentorCharacterSrc(A, 7)).toBe("/characters/mentor-07.webp");
    const auto = mentorCharacterId(A, null);
    for (const bad of [0, 11, 2.5, -1, undefined]) expect(mentorCharacterId(A, bad)).toBe(auto);
  });

  it("멘티는 평상복 6종 안에서만: 고른 값 우선, 7 이상은 자동", () => {
    expect(MENTEE_CHARACTERS.map((c) => c.src)).toContain(menteeCharacterSrc(B));
    expect(menteeCharacterId(B, 4)).toBe(4);
    expect(menteeCharacterSrc(B, 4)).toBe("/characters/mentee-04.webp");
    expect(menteeCharacterId(B, 7)).toBe(menteeCharacterId(B, null));
    expect(menteeCharacterId(B, 7)).toBeLessThanOrEqual(6);
  });
});
