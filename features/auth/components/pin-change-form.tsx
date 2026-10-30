"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { changePin, type FormState } from "@/features/auth/api/actions";
import { FormMessage, PinInput } from "./fields";

export function PinChangeForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    changePin,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid gap-2">
        <Label htmlFor="currentPin">현재 PIN</Label>
        <PinInput id="currentPin" name="currentPin" autoComplete="current-password" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="newPin">새 PIN (숫자 6자리)</Label>
        <PinInput id="newPin" name="newPin" autoComplete="new-password" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="newPinConfirm">새 PIN 확인</Label>
        <PinInput id="newPinConfirm" name="newPinConfirm" autoComplete="new-password" />
      </div>
      <FormMessage state={state} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "바꾸는 중…" : "PIN 바꾸기"}
      </Button>
    </form>
  );
}
