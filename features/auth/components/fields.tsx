import { startTransition } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/native-select";
import type { CollegeOption } from "@/features/auth/api/affiliations";

/**
 * 폼 action으로 제출하면 React가 끝난 뒤 폼을 초기화해 소속 선택(select)이 빈칸으로 돌아갑니다.
 * onSubmit에서 직접 action을 불러 초기화를 막고, 실패했을 때 입력값을 그대로 둡니다.
 */
export function submitWithoutReset(action: (formData: FormData) => void) {
  return (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  };
}

/** 숫자 6자리 PIN 입력칸. 휴대폰에서는 숫자 키패드가 뜹니다. */
export function PinInput(
  props: Omit<React.ComponentProps<"input">, "type" | "inputMode" | "pattern">,
) {
  return (
    <Input
      type="password"
      inputMode="numeric"
      pattern="\d{6}"
      minLength={6}
      maxLength={6}
      title="숫자 6자리"
      required
      {...props}
    />
  );
}

/**
 * 소속 선택: 단과대학별 학과, "멘토", (로그인 화면에서만) "관리자".
 * 값은 로그인 키의 login_group입니다 (dept:<학과 id>, mentor, admin).
 */
export function AffiliationSelect({
  colleges,
  includeAdmin,
  ...props
}: Omit<React.ComponentProps<"select">, "children"> & {
  colleges: CollegeOption[];
  includeAdmin?: boolean;
}) {
  return (
    <Select required {...props}>
      <option value="" disabled>
        소속을 고르세요
      </option>
      {colleges.map((college) => (
        <optgroup key={college.id} label={college.name}>
          {college.departments.map((department) => (
            <option key={department.id} value={`dept:${department.id}`}>
              {department.name}
            </option>
          ))}
        </optgroup>
      ))}
      <optgroup label="재학생이 아닌 경우">
        <option value="mentor">멘토</option>
        {includeAdmin && <option value="admin">관리자</option>}
      </optgroup>
    </Select>
  );
}

export function FormMessage({ state }: { state: { error?: string; success?: string } }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p role="status" className="text-sm text-green-700 dark:text-green-400">
        {state.success}
      </p>
    );
  }
  return null;
}

export { Select };
