"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/features/auth/api/actions";
import { FormMessage } from "@/features/auth/components/fields";
import { openChatRoom } from "@/features/chats/api/actions";

/** 멘토 상세의 "질문하기" (멘티만, 멘토가 질문을 받을 때) */
export function AskButton({ mentorId }: { mentorId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(openChatRoom, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="mentorId" value={mentorId} />
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "톡방 여는 중…" : "질문하기"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
