"use client";

import { useState } from "react";
import type { FormState } from "@/features/auth/api/actions";
import { setMyMenteeCharacter } from "@/features/mentees/api/character";
import { CharacterPicker } from "@/features/mentors/components/character-picker";
import { MENTEE_CHARACTERS } from "@/features/mentors/lib/characters";

/** 마이페이지 "내 캐릭터": 톡방에서 멘토에게 보이는 평상복 캐릭터를 고릅니다 (11장 38번). */
export function MenteeCharacter({ initial }: { initial: number }) {
  const [selected, setSelected] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<FormState>({});
  const current = MENTEE_CHARACTERS[selected - 1] ?? MENTEE_CHARACTERS[0];

  async function pick(id: number) {
    setBusy(true);
    const result = await setMyMenteeCharacter(id);
    setBusy(false);
    setState(result);
    if (result.success) setSelected(id);
  }

  return (
    <section className="flex flex-col gap-3 rounded-md border p-4">
      <h2 className="text-lg font-semibold">내 캐릭터</h2>
      <div className="flex flex-wrap items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- 작은 정적 그림 */}
        <img src={current.src} alt={`내 캐릭터: ${current.name}`} width={80} height={80} className="size-20 rounded-full" />
        <p className="flex-1 text-sm text-muted-foreground">
          톡방에서 멘토에게 보이는 내 프로필 캐릭터입니다. 누르면 바로 바뀝니다.
        </p>
      </div>
      <CharacterPicker characters={MENTEE_CHARACTERS} selected={selected} busy={busy} onPick={(id) => void pick(id)} />
      {state.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state.success && <p role="status" className="text-sm text-green-700 dark:text-green-400">{state.success}</p>}
    </section>
  );
}
