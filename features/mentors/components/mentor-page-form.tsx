"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/features/auth/api/actions";
import { FormMessage, submitWithoutReset } from "@/features/auth/components/fields";
import { updateMyMentorPage } from "@/features/mentors/api/actions";

const textareaClassName =
  "flex min-h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

export type MentorPageValues = {
  headline: string | null;
  intro: string | null;
  career: string | null;
  acceptingQuestions: boolean;
};

export function MentorPageForm({ initial }: { initial: MentorPageValues }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    updateMyMentorPage,
    {},
  );

  return (
    <form
      action={action}
      onSubmit={submitWithoutReset(action)}
      className="flex flex-col gap-5"
    >
      <div className="grid gap-2">
        <Label htmlFor="headline">대표 멘토링 분야 (100자까지)</Label>
        <Input
          id="headline"
          name="headline"
          maxLength={100}
          placeholder="예: 반도체 공정 엔지니어 취업과 직무 준비"
          defaultValue={initial.headline ?? ""}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="intro">멘토 소개 (5000자까지)</Label>
        <textarea
          id="intro"
          name="intro"
          maxLength={5000}
          className={textareaClassName}
          defaultValue={initial.intro ?? ""}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="career">주요 경력 (5000자까지)</Label>
        <textarea
          id="career"
          name="career"
          maxLength={5000}
          className={textareaClassName}
          placeholder={"예:\n2020~ ○○전자 공정기술팀\n2016~2020 ○○반도체"}
          defaultValue={initial.career ?? ""}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="acceptingQuestions"
          defaultChecked={initial.acceptingQuestions}
          className="size-4"
        />
        멘티의 1:1 질문 받기
      </label>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="sm:w-fit">
        {pending ? "저장하는 중…" : "저장"}
      </Button>
    </form>
  );
}
