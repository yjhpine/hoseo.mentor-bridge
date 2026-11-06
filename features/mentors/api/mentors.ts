import { createClient } from "@/lib/supabase/server";
import type { Database, Tables } from "@/types/database.types";

// 멘토 탐색 조회 (docs/architecture.md 4.1, 4.2).
// 목록은 공개 DB 함수로, 상세(getMentor)는 로그인한 사람만 mentor_directory 뷰로 읽습니다.
// mentor_directory 뷰는 RLS를 따르므로 멘토 본인과 관리자에게는 비공개 멘토도 돌아옵니다.

import { avatarUrls } from "@/features/mentors/api/avatar-urls";
import { DEFAULT_AVATAR } from "@/features/mentors/lib/avatar";

export { DEFAULT_AVATAR };
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
  /** 기본 이미지가 아닌 직접 올린 사진이 있는지 */
  hasPhoto: boolean;
  intro: string | null;
  career: string | null;
};

const SUMMARY_COLUMNS =
  "id, name, name_tag, company, job_field_name, college_id, college_name, headline, photo_path, accepting_questions, status";

function toSummary(row: Partial<DirectoryRow>, photoUrl: string = DEFAULT_AVATAR): MentorSummary {
  return {
    id: row.id!,
    displayName: (row.name ?? "") + (row.name_tag ?? ""),
    company: row.company ?? "",
    jobFieldName: row.job_field_name ?? "",
    collegeId: row.college_id ?? null,
    collegeName: row.college_name ?? null,
    headline: row.headline ?? null,
    // 사진이 있으면 서명 URL, 없으면 기본 이미지 (11장 18번)
    photoUrl,
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

type PublicMentorRow = Database["public"]["Functions"]["public_mentors"]["Returns"][number];

function publicToSummary(row: PublicMentorRow, photoUrl: string): MentorSummary {
  return toSummary({ ...row, status: "published" }, photoUrl);
}

// 목록·최근 멘토·구역별 수는 로그인하지 않은 방문자도 봅니다 (11장 8번, 32번).
// 멘토 표는 잠가 두고, 공개 멘토의 공개 필드만 돌려주는 DB 함수(public_mentors)를 씁니다.
// 관리자가 공개 설정(public_browsing)을 끄면 비로그인 방문자에게는 빈 목록이 돌아옵니다.
export async function searchMentors(search: MentorSearch) {
  const supabase = await createClient();
  const page = Math.max(1, search.page ?? 1);
  const q = cleanQuery(search.q);
  const { data } = await supabase.rpc("public_mentors", {
    college_id: search.collegeId,
    job_field_id: search.jobFieldId,
    q: q || undefined,
    lim: MENTORS_PAGE_SIZE,
    off: (page - 1) * MENTORS_PAGE_SIZE,
  });

  const rows = data ?? [];
  const total = rows[0]?.total ?? 0;
  const photo = await avatarUrls(supabase, rows.map((r) => r.photo_path));
  return {
    mentors: rows.map((row) => publicToSummary(row, photo(row.photo_path))),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / MENTORS_PAGE_SIZE)),
  };
}

export async function getRecentMentors(limit: number) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_mentors", { lim: limit });
  const rows = data ?? [];
  const photo = await avatarUrls(supabase, rows.map((r) => r.photo_path));
  return rows.map((row) => publicToSummary(row, photo(row.photo_path)));
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
  const photo = await avatarUrls(supabase, [data.photo_path]);
  return {
    ...toSummary(data, photo(data.photo_path)),
    hasPhoto: Boolean(data.photo_path),
    intro: data.intro,
    career: data.career,
  };
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
    supabase.rpc("public_college_mentor_counts"),
  ]);
  const counts = new Map<number, number>();
  for (const row of mentors.data ?? []) {
    if (row.college_id) counts.set(row.college_id, Number(row.mentor_count));
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

/** 멘토 상세의 활동 지표 (4.2): 답변 수, 질문 받은 톡방 수, 답변한 톡방 수 */
export async function getMentorActivity(id: string) {
  const empty = { answerCount: 0, roomCount: 0, answeredRoomCount: 0 };
  if (!UUID_PATTERN.test(id)) return empty;
  const supabase = await createClient();
  const { data } = await supabase.rpc("mentor_activity", { mentor_id: id });
  const row = data?.[0];
  return row
    ? { answerCount: row.answer_count, roomCount: row.room_count, answeredRoomCount: row.answered_room_count }
    : empty;
}
