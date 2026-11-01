"use client";

import { Select } from "@/components/ui/native-select";
import type { Semester } from "./semester-stats";

export function SemesterSelect({
  semesters,
  value,
  onChange,
}: {
  semesters: Semester[];
  value: number | null;
  onChange: (id: number) => void;
}) {
  if (semesters.length === 0) {
    return <p className="text-sm text-muted-foreground">아직 학기가 없습니다. 학기 화면에서 먼저 만드세요.</p>;
  }
  return (
    <Select
      value={value ?? ""}
      onChange={(e) => onChange(Number(e.target.value))}
      className="sm:w-64"
      aria-label="학기"
    >
      {semesters.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
          {s.is_current ? " (현재)" : ""}
          {s.closed_at ? " (종료)" : ""}
        </option>
      ))}
    </Select>
  );
}
