import { createClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/types/database.types";

// 강의 조회 (docs/architecture.md 4.1 /courses/[courseId], 2.2).
// 강의 소개와 차시 목록은 로그인 사용자 모두, 차시의 링크·파일은 수강 멘티·작성 멘토·관리자만 봅니다(RLS).

export type CourseStatus = Enums<"course_status">;
export type LessonKind = Enums<"lesson_kind">;

export const LESSON_KIND_LABELS: Record<LessonKind, string> = {
  video_link: "영상",
  file: "자료 파일",
  live_link: "실시간",
};

type CourseRow = {
  id: number;
  title: string;
  summary: string | null;
  status: CourseStatus;
  published_at: string | null;
  mentor: {
    id: string;
    company: string;
    profile: { name: string; name_tag: string | null } | null;
  } | null;
};

const COURSE_SELECT =
  "id, title, summary, status, published_at, mentor:mentor_profiles(id, company, profile:profiles(name, name_tag))";

export type CourseSummary = {
  id: number;
  title: string;
  summary: string | null;
  status: CourseStatus;
  mentorId: string | null;
  mentorName: string;
  company: string;
};

function toSummary(row: CourseRow): CourseSummary {
  const profile = row.mentor?.profile;
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    status: row.status,
    mentorId: row.mentor?.id ?? null,
    mentorName: profile ? profile.name + (profile.name_tag ?? "") : "",
    company: row.mentor?.company ?? "",
  };
}

/** 모집 중인 강의 (홈) */
export async function listOpenCourses(limit: number): Promise<CourseSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select(COURSE_SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit)
    .returns<CourseRow[]>();
  return (data ?? []).map(toSummary);
}

/** 멘토의 강의. 본인이 보면 비공개(draft)도 함께 나옵니다. */
export async function listMentorCourses(mentorId: string): Promise<CourseSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select(COURSE_SELECT)
    .eq("mentor_id", mentorId)
    .order("created_at", { ascending: false })
    .returns<CourseRow[]>();
  return (data ?? []).map(toSummary);
}

/** 내가 수강 중인 강의 (/mypage) */
export async function listMyEnrollments(menteeId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments")
    .select(`created_at, semester:semesters(name), course:courses(${COURSE_SELECT})`)
    .eq("mentee_id", menteeId)
    .order("created_at", { ascending: false })
    .returns<{ created_at: string; semester: { name: string } | null; course: CourseRow | null }[]>();
  return (data ?? [])
    .filter((row) => row.course)
    .map((row) => ({ ...toSummary(row.course!), semesterName: row.semester?.name ?? "" }));
}

export type Lesson = Pick<
  Tables<"lessons">,
  "id" | "title" | "kind" | "url" | "file_path" | "file_name" | "starts_at" | "position"
>;

export type OutlineItem = { id: number; title: string; kind: LessonKind; starts_at: string | null };

/** 강의 상세: 소개, 차시 목록, 수강생 수, 내가 수강 중인지, (볼 수 있으면) 자료 */
export async function getCourseDetail(id: number, viewerId: string) {
  if (!Number.isInteger(id) || id < 1) return null;
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select(COURSE_SELECT)
    .eq("id", id)
    .returns<CourseRow[]>()
    .maybeSingle();
  if (!course) return null;

  const [outline, count, enrollment, lessons] = await Promise.all([
    supabase.rpc("course_outline", { course_id: id }),
    supabase.rpc("course_enrollment_count", { course_id: id }),
    supabase.from("enrollments").select("course_id").eq("course_id", id).eq("mentee_id", viewerId).maybeSingle(),
    // RLS가 수강 멘티·작성 멘토·관리자에게만 행을 돌려줍니다.
    supabase
      .from("lessons")
      .select("id, title, kind, url, file_path, file_name, starts_at, position")
      .eq("course_id", id)
      .order("position")
      .order("id"),
  ]);

  return {
    course: toSummary(course),
    outline: (outline.data ?? []) as OutlineItem[],
    enrollmentCount: count.data ?? 0,
    enrolled: Boolean(enrollment.data),
    lessons: (lessons.data ?? []) as Lesson[],
  };
}

/** 멘토가 고칠 자기 강의. 남의 강의면 null. */
export async function getCourseForEdit(id: number, mentorId: string) {
  if (!Number.isInteger(id) || id < 1) return null;
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, summary, status, mentor_id")
    .eq("id", id)
    .eq("mentor_id", mentorId)
    .maybeSingle();
  if (!course) return null;
  const [{ data: lessons }, { data: count }] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, title, kind, url, file_path, file_name, starts_at, position")
      .eq("course_id", id)
      .order("position")
      .order("id"),
    supabase.rpc("course_enrollment_count", { course_id: id }),
  ]);
  return { course, lessons: (lessons ?? []) as Lesson[], enrollmentCount: count ?? 0 };
}

export async function getMentorStudentCount(mentorId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("mentor_student_count", { mentor_id: mentorId });
  return data ?? 0;
}
