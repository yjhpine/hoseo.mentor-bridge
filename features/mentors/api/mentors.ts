import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

// 멘토 탐색 조회 (docs/architecture.md 4.1, 4.2). mentor_directory 뷰는 RLS를 따르므로
// 로그인 사용자에게는 공개 멘토만, 멘토 본인과 관리자에게는 더 많은 행이 돌아옵니다.
// 목록은 공개 멘토만 보이도록 status를 한 번 더 거릅니다.

export const DEFAULT_AVATAR = "/avatar-default.svg";
export const MENTORS_PAGE_SIZE = 12;

type DirectoryRow = Tables<"mentor_directory">;

export type MentorSummary = {
  id: string;
  displayName: string;
  company: string;
  jobFieldName: string;
  collegeId: number | null;
  collegeName: string | null;
  headline: string | null;
  photoUrl: string;
  acceptingQuestions: boolean;
  status: NonNullable<DirectoryRow["status"]>;
};

export type MentorDetail = MentorSummary & {
  intro: string | null;
  career: string | null;
};

const SUMMARY_COLUMNS =
  "id, name, name_tag, company, job_field_name, college_id, college_name, headline, photo_path, accepting_questions, status";

function toSummary(row: Partial<DirectoryRow>): MentorSummary {
  return {
    id: row.id!,
    displayName: (row.name ?? "") + (row.name_tag ?? ""),
    company: row.company ?? "",
    jobFieldName: row.job_field_name ?? "",
    collegeId: row.college_id ?? null,
    collegeName: row.college_name ?? null,
    headline: row.headline ?? null,
    // 사진 업로드는 보류라 모두 기본 이미지를 씁니다 (11장 18번).
    photoUrl: DEFAULT_AVATAR,
    acceptingQuestions: row.accepting_questions ?? false,
    status: row.status ?? "pending",
  };
}

/** 검색어에서 PostgREST 필터 문법에 쓰이는 글자를 뺍니다. */
function cleanQuery(raw: string | undefined): string {
  return (raw ?? "").replace(/[,()*%\\:."']/g, " ").trim().slice(0, 50);
}

export type MentorSearch = {
  collegeId?: number;
  jobFieldId?: number;
  q?: string;
  page?: number;
};

export async function searchMentors(search: MentorSearch) {
  const supabase = await createClient();
  const page = Math.max(1, search.page ?? 1);
  const from = (page - 1) * MENTORS_PAGE_SIZE;

  let query = supabase
    .from("mentor_directory")
    .select(SUMMARY_COLUMNS, { count: "exact" })
    .eq("status", "published");
  if (search.collegeId) query = query.eq("college_id", search.collegeId);
  if (search.jobFieldId) query = query.eq("job_field_id", search.jobFieldId);
  const q = cleanQuery(search.q);
  if (q) {
    query = query.or(
      `name.ilike.*${q}*,company.ilike.*${q}*,headline.ilike.*${q}*,job_field_name.ilike.*${q}*`,
    );
  }

  const { data, count } = await query
    .order("published_at", { ascending: false })
    .range(from, from + MENTORS_PAGE_SIZE - 1);

  const total = count ?? 0;
  return {
    mentors: (data ?? []).map(toSummary),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / MENTORS_PAGE_SIZE)),
  };
}

export async function getRecentMentors(limit: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mentor_directory")
    .select(SUMMARY_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(toSummary);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 공개 멘토, 또는 본인·관리자가 보는 비공개 멘토. 볼 수 없으면 null. */
export async function getMentor(id: string): Promise<MentorDetail | null> {
  if (!UUID_PATTERN.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("mentor_directory")
    .select(`${SUMMARY_COLUMNS}, intro, career`)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return { ...toSummary(data), intro: data.intro, career: data.career };
}

export type CollegeCard = {
  id: number;
  name: string;
  description: string | null;
  mentorCount: number;
};

/** 쓰고 있는 단과대학 구역과 공개 멘토 수 */
export async function getCollegeCards(): Promise<CollegeCard[]> {
  const supabase = await createClient();
  const [colleges, mentors] = await Promise.all([
    supabase
      .from("colleges")
      .select("id, name, description")
      .eq("is_active", true)
      .order("position")
      .order("name"),
    supabase.from("mentor_directory").select("college_id").eq("status", "published"),
  ]);
  const counts = new Map<number, number>();
  for (const row of mentors.data ?? []) {
    if (row.college_id) counts.set(row.college_id, (counts.get(row.college_id) ?? 0) + 1);
  }
  return (colleges.data ?? []).map((college) => ({
    ...college,
    mentorCount: counts.get(college.id) ?? 0,
  }));
}

export async function getCollege(id: number) {
  if (!Number.isInteger(id) || id < 1) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("colleges")
    .select("id, name, description")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  return data;
}

export async function getJobFields() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_fields")
    .select("id, name")
    .order("position")
    .order("name");
  return data ?? [];
}
