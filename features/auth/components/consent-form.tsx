"use client";

import { useActionState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/features/auth/api/actions";
import { logout } from "@/features/auth/api/actions";
import { recordConsent } from "@/features/auth/api/consent";
import { FormMessage } from "./fields";
import { PrivacyConsent } from "./privacy-consent";

export function ConsentForm({ isMentor }: { isMentor: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(recordConsent, {});
  const [leaving, startLeave] = useTransition();
  return (
    <form action={action} className="flex flex-col gap-4">
      <PrivacyConsent isMentor={isMentor} refuseText="동의하지 않을 수 있지만, 그러면 서비스를 이용할 수 없습니다." />
      <FormMessage state={state} />
      <Button type="submit" size="lg" disabled={pending || leaving}>
        {pending ? "저장하는 중…" : "동의하고 시작하기"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        동의하지 않으면 서비스를 이용할 수 없습니다.{" "}
        <button
          type="button"
          className="font-medium text-foreground underline underline-offset-4"
          disabled={leaving}
          onClick={() => startLeave(() => logout())}
        >
          {leaving ? "로그아웃하는 중…" : "로그아웃"}
        </button>
      </p>
    </form>
  );
}
