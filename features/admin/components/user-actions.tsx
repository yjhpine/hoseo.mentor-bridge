"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/native-select";
import { createAdmin, createMentor, deleteUser, resetPin, updateIdentity } from "@/features/admin/api/admin-users";
import type { FormState } from "@/features/auth/api/actions";
import type { CollegeOption } from "@/features/auth/api/affiliations";
import { AffiliationSelect } from "@/features/auth/components/affiliation-select";
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

/** 탈퇴 처리. 되돌릴 수 없어서 이름을 그대로 입력해야 지웁니다. */
export function DeleteUserButton({
  userId,
  name,
  onDone,
}: {
  userId: string;
  name: string;
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(deleteUser, {});
  useOnSuccess(state, onDone);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        const typed = prompt(
          `${name}님의 계정과 질문·답변, 강의, 수강·만족도 기록을 모두 지웁니다. 되돌릴 수 없습니다.\n` +
            `지우기 전에 백업 화면에서 백업을 받아 두세요.\n\n확인하려면 이름(${name})을 입력하세요.`,
        );
        if (typed?.trim() !== name) {
          event.preventDefault();
          if (typed !== null) alert("이름이 맞지 않아 지우지 않았습니다.");
        }
      }}
      className="flex flex-col items-end gap-1"
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="name" value={name} />
      <Button type="submit" size="sm" variant="outline" disabled={pending} className="text-red-600 dark:text-red-400">
        {pending ? "지우는 중…" : "탈퇴 처리"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

export function IdentityForm({
  user,
  colleges,
  onDone,
}: {
  user: { id: string; name: string; nameTag: string | null; departmentId: number | null };
  /** 멘티일 때만 넘깁니다. 멘토·관리자는 소속이 바뀌지 않습니다. */
  colleges?: CollegeOption[];
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
      {colleges && (
        <div className="grid gap-1 sm:w-[28rem]">
          <Label htmlFor={`dept-${user.id}`}>단과대학 · 학과</Label>
          <AffiliationSelect
            id={`dept-${user.id}`}
            name="departmentId"
            colleges={colleges}
            departmentOnly
            defaultValue={user.departmentId ? String(user.departmentId) : ""}
          />
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

/** 관리자가 대신 만드는 멘토 계정 (11장 36번) */
export function CreateMentorForm({
  jobFields,
  colleges,
  onDone,
}: {
  jobFields: { id: number; name: string }[];
  colleges: { id: number; name: string }[];
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(createMentor, {});
  useOnSuccess(state, onDone);
  const v = state.values ?? {};

  return (
    <form action={action} onSubmit={submitWithoutReset(action)} className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="mentor-name">이름</Label>
        <Input id="mentor-name" name="name" maxLength={NAME_MAX_LENGTH} required defaultValue={v.name} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="mentor-tag">구분 문자 (필요할 때만)</Label>
        <Input id="mentor-tag" name="nameTag" maxLength={3} pattern="[A-Za-z0-9]{1,3}" defaultValue={v.nameTag} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="mentor-company">기업명</Label>
        <Input id="mentor-company" name="company" maxLength={100} required defaultValue={v.company} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="mentor-job">직무 분야</Label>
        <Select id="mentor-job" name="jobFieldId" required defaultValue={v.jobFieldId ?? ""}>
          <option value="" disabled>
            직무 분야를 고르세요
          </option>
          {jobFields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="mentor-college">단과대학 구역 (고르면 바로 공개)</Label>
        <Select id="mentor-college" name="collegeId" defaultValue={v.collegeId ?? ""}>
          <option value="">나중에 정함 (개설 대기로 둠)</option>
          {colleges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="mentor-headline">대표 멘토링 분야 (선택)</Label>
        <Input id="mentor-headline" name="headline" maxLength={100} defaultValue={v.headline} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "만드는 중…" : "멘토 계정 만들기"}
        </Button>
      </div>
      <div className="sm:col-span-2">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
