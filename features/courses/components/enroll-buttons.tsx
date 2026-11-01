"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/features/auth/api/actions";
import { FormMessage } from "@/features/auth/components/fields";
import { cancelEnrollment, enroll } from "@/features/courses/api/actions";

export function EnrollButton({ courseId }: { courseId: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(enroll, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="courseId" value={courseId} />
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "신청하는 중…" : "수강 신청"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

export function CancelEnrollmentButton({ courseId }: { courseId: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(cancelEnrollment, {});
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm("수강 신청을 취소할까요? 강의 자료를 더 볼 수 없게 됩니다.")) event.preventDefault();
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="courseId" value={courseId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending} className="w-fit">
        수강 취소
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
