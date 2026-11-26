import { describe, expect, it } from "vitest";
import { joinAffiliation, selectedCollegeId, splitAffiliation } from "@/features/auth/lib/affiliation";

const colleges = [
  { id: 1, departments: [{ id: 10 }, { id: 11 }] },
  { id: 5, departments: [{ id: 50 }] },
];

describe("소속 2단계 (11장 39번)", () => {
  it("학과 값에서 단과대학과 학과를 되살린다", () => {
    expect(splitAffiliation("dept:50", colleges)).toEqual({ top: "college:5", departmentId: "50" });
  });
  it("멘토·관리자는 첫 칸만", () => {
    expect(splitAffiliation("mentor", colleges)).toEqual({ top: "mentor", departmentId: "" });
    expect(splitAffiliation("admin", colleges)).toEqual({ top: "admin", departmentId: "" });
  });
  it("모르는 학과·이상한 값은 빈칸", () => {
    expect(splitAffiliation("dept:999", colleges)).toEqual({ top: "", departmentId: "" });
    expect(splitAffiliation("dept:1x", colleges)).toEqual({ top: "", departmentId: "" });
    expect(splitAffiliation(undefined, colleges)).toEqual({ top: "", departmentId: "" });
  });
  it("두 칸을 제출 값으로 합친다", () => {
    expect(joinAffiliation({ top: "college:1", departmentId: "11" })).toBe("dept:11");
    expect(joinAffiliation({ top: "college:1", departmentId: "" })).toBe("");
    expect(joinAffiliation({ top: "mentor", departmentId: "11" })).toBe("mentor");
    expect(joinAffiliation({ top: "", departmentId: "" })).toBe("");
  });
  it("첫 칸의 단과대학 id", () => {
    expect(selectedCollegeId("college:5")).toBe(5);
    expect(selectedCollegeId("mentor")).toBeNull();
  });
});
