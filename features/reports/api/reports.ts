import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

// 멘토 학기 보고서 조회 (docs/architecture.md 11장 35번)

export type StartedSemester = Pick<Tables<"semesters">, "id" | "name" | "is_current" | "closed_at">;
export type MentorReport = Pick<
  Tables<"mentor_reports">,
  "id" | "semester_id" | "file_name" | "file_size" | "submitted_at" | "updated_at"
>;

/** 보고서를 낼 수 있는 학기: 시작일이 오늘(한국 날짜) 이전인 학기, 최근 순 */
export async function listStartedSemesters(): Promise<StartedSemester[]> {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const supabase = await createClient();
  const { data } = await supabase
    .from("semesters")
    .select("id, name, is_current, closed_at")
    .lte("starts_on", today)
    .order("starts_on", { ascending: false });
  return data ?? [];
}

/** 내 보고서 (RLS가 본인 것만 돌려줌) */
export async function listMyReports(mentorId: string): Promise<MentorReport[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mentor_reports")
    .select("id, semester_id, file_name, file_size, submitted_at, updated_at")
    .eq("mentor_id", mentorId);
  return data ?? [];
}
