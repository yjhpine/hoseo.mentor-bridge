"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp, type FormState } from "@/features/auth/api/actions";
import type {
  CollegeOption,
  JobFieldOption,
} from "@/features/auth/api/affiliations";
import { NAME_MAX_LENGTH } from "@/lib/auth/login-key";
import { AffiliationSelect, FormMessage, PinInput, Select } from "./fields";

export function SignUpForm({
  colleges,
  jobFields,
}: {
  colleges: CollegeOption[];
  jobFields: JobFieldOption[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    signUp,
    {},
  );
  // 서버가 돌려준 값이 있으면 그 소속으로 다시 그립니다 (가입 실패 후 폼이 초기화될 때).
  const [selectedGroup, setSelectedGroup] = useState("");
  const group = selectedGroup || state.values?.group || "";
  const isMentor = group === "mentor";

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid gap-2">
        <Label htmlFor="group">소속</Label>
        <AffiliationSelect
          id="group"
          name="group"
          colleges={colleges}
          value={group}
          onChange={(e) => setSelectedGroup(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          재학생은 학과를, 기업 현직자는 &quot;멘토&quot;를 고릅니다.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="name">이름</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          maxLength={NAME_MAX_LENGTH}
          required
          defaultValue={state.values?.name}
        />
        <p className="text-xs text-muted-foreground">
          실명을 한글이나 영문으로 씁니다.
        </p>
      </div>

      {state.needsTag && (
        <div className="grid gap-2">
          <Label htmlFor="nameTag">구분 문자 (영문·숫자 1~3자)</Label>
          <Input
            id="nameTag"
            name="nameTag"
            maxLength={3}
            pattern="[A-Za-z0-9]{1,3}"
            required
            defaultValue={state.values?.nameTag}
          />
          <p className="text-xs text-muted-foreground">
            이름 뒤에 붙어 화면에 홍길동A처럼 보이고, 로그인할 때도 이름칸에
            함께 씁니다.
          </p>
        </div>
      )}

      {isMentor && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="company">기업명</Label>
            <Input
              id="company"
              name="company"
              autoComplete="organization"
              maxLength={100}
              required
              defaultValue={state.values?.company}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="jobFieldId">직무 분야</Label>
            <Select
              id="jobFieldId"
              name="jobFieldId"
              required
              defaultValue={state.values?.jobFieldId ?? ""}
            >
              <option value="" disabled>
                직무 분야를 고르세요
              </option>
              {jobFields.map((jobField) => (
                <option key={jobField.id} value={jobField.id}>
                  {jobField.name}
                </option>
              ))}
            </Select>
          </div>
        </>
      )}

      <div className="grid gap-2">
        <Label htmlFor="pin">PIN (숫자 6자리)</Label>
        <PinInput id="pin" name="pin" autoComplete="new-password" />
        <p className="text-xs text-muted-foreground">
          이름과 소속은 남도 알 수 있어 PIN이 유일한 비밀번호입니다. 생일이나
          학번처럼 짐작하기 쉬운 숫자는 피하세요.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="pinConfirm">PIN 확인</Label>
        <PinInput id="pinConfirm" name="pinConfirm" autoComplete="new-password" />
      </div>

      {isMentor && (
        <p className="text-xs text-muted-foreground">
          멘토 페이지는 관리자가 단과대학 구역에 배치하고 개설한 뒤에 공개됩니다.
        </p>
      )}

      <FormMessage state={state} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "가입하는 중…" : "가입하기"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        이미 계정이 있나요?{" "}
        <Link href="/auth/login" className="text-foreground underline underline-offset-4">
          로그인
        </Link>
      </p>
    </form>
  );
}
