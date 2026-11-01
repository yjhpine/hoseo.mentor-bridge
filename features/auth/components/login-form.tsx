"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, type FormState } from "@/features/auth/api/actions";
import type { CollegeOption } from "@/features/auth/api/affiliations";
import {
  AffiliationSelect,
  FormMessage,
  PinInput,
  submitWithoutReset,
} from "./fields";
import { Turnstile } from "./turnstile";

export function LoginForm({
  colleges,
  turnstileSiteKey,
}: {
  colleges: CollegeOption[];
  turnstileSiteKey?: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    login,
    {},
  );
  const [captchaToken, setCaptchaToken] = useState("");
  const waitingCaptcha = Boolean(turnstileSiteKey) && !captchaToken;

  return (
    <form
      action={action}
      onSubmit={submitWithoutReset(action)}
      className="flex flex-col gap-5"
    >
      <div className="grid gap-2">
        <Label htmlFor="group">소속</Label>
        <AffiliationSelect
          id="group"
          name="group"
          colleges={colleges}
          includeAdmin
          defaultValue={state.values?.group ?? ""}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="name">이름</Label>
        <Input
          id="name"
          name="name"
          autoComplete="username"
          required
          defaultValue={state.values?.name}
        />
        <p className="text-xs text-muted-foreground">
          가입할 때 구분 문자를 붙였다면 함께 씁니다. 예: 홍길동A
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="pin">PIN (숫자 6자리)</Label>
        <PinInput id="pin" name="pin" autoComplete="current-password" />
      </div>
      <Turnstile siteKey={turnstileSiteKey} resetKey={state} onTokenChange={setCaptchaToken} />
      <FormMessage state={state} />
      <Button type="submit" className="w-full" disabled={pending || waitingCaptcha}>
        {pending ? "로그인하는 중…" : waitingCaptcha ? "자동 입력 방지 확인 중…" : "로그인"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        처음이신가요?{" "}
        <Link href="/auth/sign-up" className="text-foreground underline underline-offset-4">
          회원가입
        </Link>
      </p>
      <p className="text-center text-xs text-muted-foreground">
        PIN을 잊었으면 관리자에게 임시 PIN을 요청하세요.
      </p>
    </form>
  );
}
