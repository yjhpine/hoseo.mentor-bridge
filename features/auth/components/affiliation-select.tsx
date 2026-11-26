"use client";

import { useState } from "react";
import { Select } from "@/components/ui/native-select";
import type { CollegeOption } from "@/features/auth/api/affiliations";
import {
  joinAffiliation,
  selectedCollegeId,
  splitAffiliation,
  type AffiliationStep,
} from "@/features/auth/lib/affiliation";

/**
 * 소속 2단계 선택 (11장 39번): ① 단과대학 또는 "멘토"·(로그인 화면만) "관리자" → ② 그 단과대학의 학과.
 * 실제로 제출되는 값은 숨은 칸(name)에 담긴 login_group(dept:<학과 id>, mentor, admin)입니다.
 * departmentOnly면 멘토·관리자 없이 단과대학 → 학과만 고르고, 숨은 칸에 학과 id만 담습니다(관리자 화면).
 */
export function AffiliationSelect({
  id,
  name,
  colleges,
  includeAdmin,
  departmentOnly,
  defaultValue,
  onValueChange,
}: {
  id: string;
  name: string;
  colleges: CollegeOption[];
  includeAdmin?: boolean;
  departmentOnly?: boolean;
  /** dept:<id> / mentor / admin (departmentOnly면 학과 id) */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  // 고르기 전에는 defaultValue에서 매번 되살립니다. 관리자 화면처럼 단과대학 목록이 늦게 와도 처음 값이 비지 않습니다.
  const [picked, setPicked] = useState<AffiliationStep | null>(null);
  const step =
    picked ?? splitAffiliation(departmentOnly && defaultValue ? `dept:${defaultValue}` : defaultValue, colleges);
  const collegeId = selectedCollegeId(step.top);
  const college = colleges.find((c) => c.id === collegeId);
  const joined = joinAffiliation(step);
  const value = departmentOnly ? joined.replace(/^dept:/, "") : joined;

  function change(next: AffiliationStep) {
    setPicked(next);
    const nextJoined = joinAffiliation(next);
    onValueChange?.(departmentOnly ? nextJoined.replace(/^dept:/, "") : nextJoined);
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <input type="hidden" name={name} value={value} />
      <Select
        id={id}
        required
        value={step.top}
        onChange={(e) => change({ top: e.target.value, departmentId: "" })}
      >
        <option value="" disabled>
          {departmentOnly ? "단과대학을 고르세요" : "단과대학 또는 멘토"}
        </option>
        <optgroup label="재학생: 단과대학">
          {colleges.map((c) => (
            <option key={c.id} value={`college:${c.id}`}>
              {c.name}
            </option>
          ))}
        </optgroup>
        {!departmentOnly && (
          <optgroup label="재학생이 아닌 경우">
            <option value="mentor">멘토</option>
            {includeAdmin && <option value="admin">관리자</option>}
          </optgroup>
        )}
      </Select>
      {college && (
        <Select
          id={`${id}-department`}
          aria-label="학과"
          required
          value={step.departmentId}
          onChange={(e) => change({ top: step.top, departmentId: e.target.value })}
        >
          <option value="" disabled>
            학과를 고르세요
          </option>
          {college.departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}
