"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAdmin, resetPin } from "@/features/admin/api/admin-users";
import type { FormState } from "@/features/auth/api/actions";
import { FormMessage } from "@/features/auth/components/fields";
import { NAME_MAX_LENGTH } from "@/lib/auth/login-key";

export function ResetPinButton({ userId, name }: { userId: string; name: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPin, {});

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm(`${name}님의 PIN을 임시 PIN으로 초기화할까요?`)) {
          event.preventDefault();
        }
      }}
      className="flex flex-col items-end gap-1"
    >
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "초기화하는 중…" : "PIN 초기화"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

export function CreateAdminForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createAdmin, {});

  return (
    <form
      action={action}
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="grid flex-1 gap-2">
        <Label htmlFor="admin-name">이름</Label>
        <Input
          id="admin-name"
          name="name"
          maxLength={NAME_MAX_LENGTH}
          required
          defaultValue={state.values?.name}
        />
      </div>
      <div className="grid gap-2 sm:w-40">
        <Label htmlFor="admin-tag">구분 문자 (필요할 때만)</Label>
        <Input
          id="admin-tag"
          name="nameTag"
          maxLength={3}
          pattern="[A-Za-z0-9]{1,3}"
          defaultValue={state.values?.nameTag}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "만드는 중…" : "관리자 만들기"}
      </Button>
      <div className="sm:basis-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
