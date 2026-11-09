"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/features/auth/components/fields";
import { submitIssueReport, type ReportState } from "@/features/issues/api/actions";

export function ReportForm({ from }: { from: string | null }) {
  const [state, action, pending] = useActionState<ReportState, FormData>(submitIssueReport, {});

  if (state.success) {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage state={state} />
        <div className="flex flex-col gap-2 sm:flex-row">
          {from && (
            <Button asChild variant="outline">
              <Link href={from}>보던 화면으로</Link>
            </Button>
          )}
          <Button asChild>
            <Link href="/">홈으로</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {from && <input type="hidden" name="from" value={from} />}
      <div className="grid gap-2">
        <Label htmlFor="message">무엇을 하다가 어떤 문제가 생겼나요?</Label>
        <textarea
          id="message"
          name="message"
          required
          minLength={5}
          maxLength={1000}
          rows={6}
          defaultValue={state.values?.message}
          placeholder="예: 멘토 상세에서 '1:1 질문하기'를 눌렀더니 아무 반응이 없어요."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          {from ? `보내면 이 화면 주소(${from})와 브라우저 정보가 함께 전달됩니다.` : "브라우저 정보가 함께 전달됩니다."}{" "}
          비밀번호(PIN) 같은 개인정보는 적지 마세요.
        </p>
      </div>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="w-full sm:w-fit">
        {pending ? "보내는 중…" : "보내기"}
      </Button>
    </form>
  );
}
