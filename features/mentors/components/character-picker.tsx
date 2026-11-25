"use client";

import type { Character } from "@/features/mentors/lib/characters";

/**
 * 기본 프로필 캐릭터 고르기 (11장 38번). 멘토는 정장 10종, 멘티는 평상복 6종 목록을 넘깁니다.
 * 누르면 onPick이 저장하고, 저장하는 동안(busy)은 버튼을 잠급니다.
 */
export function CharacterPicker({
  characters,
  selected,
  busy,
  onPick,
}: {
  characters: readonly Character[];
  selected: number;
  busy: boolean;
  onPick: (id: number) => void;
}) {
  return (
    <div role="radiogroup" aria-label="기본 캐릭터" className="flex flex-wrap gap-2">
      {characters.map((item) => {
        const checked = item.id === selected;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={item.name}
            title={item.name}
            disabled={busy}
            onClick={() => {
              if (!checked) onPick(item.id);
            }}
            className={`rounded-full p-0.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 ${
              checked ? "ring-2 ring-brand ring-offset-2" : "opacity-80 hover:opacity-100"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 작은 정적 그림, 최적화 불필요 */}
            <img src={item.src} alt="" width={48} height={48} className="size-12 rounded-full" />
          </button>
        );
      })}
    </div>
  );
}
