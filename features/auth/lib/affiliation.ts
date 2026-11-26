// 소속 2단계 선택 (docs/architecture.md 11장 39번).
// ① 단과대학(또는 멘토·관리자) → ② 학과. 제출 값은 그대로 login_group(dept:<id>, mentor, admin)입니다.

export type AffiliationCollege = { id: number; departments: { id: number }[] };

/** 첫 칸 값: "college:<id>", "mentor", "admin", "" */
export type AffiliationStep = { top: string; departmentId: string };

/** 제출 값(dept:<id> / mentor / admin)에서 두 칸의 값을 되살립니다. 모르는 값이면 빈칸. */
export function splitAffiliation(value: string | undefined, colleges: AffiliationCollege[]): AffiliationStep {
  if (value === "mentor" || value === "admin") return { top: value, departmentId: "" };
  const match = /^dept:(\d+)$/.exec(value ?? "");
  if (match) {
    const id = Number(match[1]);
    const college = colleges.find((c) => c.departments.some((d) => d.id === id));
    if (college) return { top: `college:${college.id}`, departmentId: String(id) };
  }
  return { top: "", departmentId: "" };
}

/** 두 칸의 값을 제출 값으로 합칩니다. 단과대학만 고르고 학과를 안 골랐으면 "". */
export function joinAffiliation({ top, departmentId }: AffiliationStep): string {
  if (top === "mentor" || top === "admin") return top;
  if (top.startsWith("college:") && /^\d+$/.test(departmentId)) return `dept:${departmentId}`;
  return "";
}

/** 첫 칸이 단과대학이면 그 id, 아니면 null */
export function selectedCollegeId(top: string): number | null {
  const match = /^college:(\d+)$/.exec(top);
  return match ? Number(match[1]) : null;
}
