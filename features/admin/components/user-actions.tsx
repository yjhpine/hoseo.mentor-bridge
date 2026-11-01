"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/native-select";
import { createAdmin, resetPin, updateIdentity } from "@/features/admin/api/admin-users";
import type { FormState } from "@/features/auth/api/actions";
import { FormMessage, submitWithoutReset } from "@/features/auth/components/fields";
import { NAME_MAX_LENGTH } from "@/lib/auth/login-key";

/** 서버 액션이 성공하면 목록을 다시 읽게 합니다. */
function useOnSuccess(state: FormState, onDone?: () => void) {
  useEffect(() => {
    if (state.success) onDone?.();
    // 성공 메시지가 바뀔 때마다 한 번만 부릅니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);
}

export function ResetPinButton({
  userId,
  name,
  onDone,
}: {
  userId: string;
  name: string;
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPin, {});
  useOnSuccess(state, onDone);

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

export function IdentityForm({
  user,
  departments,
  onDone,
}: {
  user: { id: string; name: string; nameTag: string | null; departmentId: number | null };
  /** 멘티일 때만 넘깁니다. 멘토·관리자는 소속이 바뀌지 않습니다. */
  departments?: { id: number; label: string }[];
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateIdentity, {});
  useOnSuccess(state, onDone);

  return (
    <form
      action={action}
      onSubmit={submitWithoutReset(action)}
      className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <input type="hidden" name="userId" value={user.id} />
      <div className="grid flex-1 gap-1">
        <Label htmlFor={`name-${user.id}`}>이름</Label>
        <Input id={`name-${user.id}`} name="name" maxLength={NAME_MAX_LENGTH} required defaultValue={user.name} />
      </div>
      <div className="grid gap-1 sm:w-28">
        <Label htmlFor={`tag-${user.id}`}>구분 문자</Label>
        <Input
          id={`tag-${user.id}`}
          name="nameTag"
          maxLength={3}
          pattern="[A-Za-z0-9]{1,3}"
          defaultValue={user.nameTag ?? ""}
        />
      </div>
      {departments && (
        <div className="grid gap-1 sm:w-56">
          <Label htmlFor={`dept-${user.id}`}>학과</Label>
          <Select
            id={`dept-${user.id}`}
            name="departmentId"
            required
            defaultValue={user.departmentId ? String(user.departmentId) : ""}
          >
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.label}
              </option>
            ))}
          </Select>
        </div>
      )}
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "바꾸는 중…" : "이름·소속 바꾸기"}
      </Button>
      <div className="sm:basis-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function CreateAdminForm({ onDone }: { onDone?: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createAdmin, {});
  useOnSuccess(state, onDone);

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
