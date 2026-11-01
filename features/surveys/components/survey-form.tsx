"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/features/auth/api/actions";
import { FormMessage } from "@/features/auth/components/fields";
import { submitSurvey } from "@/features/surveys/api/actions";

export function SurveyForm({
  semesterId,
  mentorId,
  mentorName,
}: {
  semesterId: number;
  mentorId: string;
  mentorName: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitSurvey, {});
  if (state.success) {
    return <FormMessage state={state} />;
  }
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="semesterId" value={semesterId} />
      <input type="hidden" name="mentorId" value={mentorId} />
      <fieldset className="flex flex-wrap items-center gap-3">
        <legend className="sr-only">{mentorName} 멘토 만족도</legend>
        {[5, 4, 3, 2, 1].map((n) => (
          <label key={n} className="flex items-center gap-1 text-sm">
            <input type="radio" name="rating" value={n} required className="size-4" />
            {"★".repeat(n)}
          </label>
        ))}
      </fieldset>
      <textarea
        name="comment"
        maxLength={2000}
        rows={3}
        placeholder="멘토에게 도움이 된 점이나 아쉬운 점 (선택, 관리자만 봅니다)"
        aria-label={`${mentorName} 멘토 의견`}
        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
      />
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="w-fit">{pending ? "보내는 중…" : "응답하기"}</Button>
    </form>
  );
}
