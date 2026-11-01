"use client";

import { useList, type HttpError } from "@refinedev/core";
import { SemesterSelect } from "@/features/admin/components/semester-select";
import { useSemesterPicker, type MentorRow } from "@/features/admin/components/semester-stats";
import { formatTime } from "@/lib/chat/answer-length";
import type { Tables } from "@/types/database.types";

type Response = Tables<"survey_responses">;

// 만족도 조사 결과 (4.1 /admin/surveys, 11장 9번: 관리자만). 응답자 이름은 보여 주지 않습니다.
export default function AdminSurveysPage() {
  const { semesters, semesterId, setSemesterId, semester } = useSemesterPicker();
  const responses = useList<Response, HttpError>({
    resource: "survey_responses",
    pagination: { mode: "off" },
    filters: semesterId ? [{ field: "semester_id", operator: "eq", value: semesterId }] : [],
    sorters: [{ field: "created_at", order: "desc" }],
    queryOptions: { enabled: Boolean(semesterId) },
  });
  const mentors = useList<MentorRow, HttpError>({ resource: "mentor_directory", pagination: { mode: "off" } });
  const mentorById = new Map(mentors.result.data.map((m) => [m.id, m]));

  const byMentor = new Map<string, Response[]>();
  for (const r of responses.result.data) {
    byMentor.set(r.mentor_id, [...(byMentor.get(r.mentor_id) ?? []), r]);
  }
  const groups = [...byMentor.entries()]
    .map(([mentorId, list]) => ({
      mentorId,
      list,
      average: list.reduce((s, r) => s + r.rating, 0) / list.length,
      mentor: mentorById.get(mentorId),
    }))
    .sort((a, b) => b.average - a.average);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">만족도 조사</h1>
      <SemesterSelect semesters={semesters} value={semesterId} onChange={setSemesterId} />
      {semester && (
        <p className="text-sm text-muted-foreground">
          {semester.survey_opens_at && semester.survey_closes_at
            ? `조사 기간 ${formatTime(semester.survey_opens_at)} ~ ${formatTime(semester.survey_closes_at)} · 응답 ${responses.result.data.length}건`
            : "학기를 종료하면 만족도 조사가 열립니다."}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {groups.length === 0 && (
          <li className="rounded-md border p-6 text-center text-muted-foreground">아직 응답이 없습니다.</li>
        )}
        {groups.map(({ mentorId, list, average, mentor }) => (
          <li key={mentorId} className="flex flex-col gap-2 rounded-md border p-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-medium">{mentor ? (mentor.name ?? "") + (mentor.name_tag ?? "") : "멘토"}</span>
              <span className="text-sm text-muted-foreground">{mentor?.company}</span>
              <span className="ml-auto text-lg font-semibold">
                ★ {average.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">/ 5 · {list.length}명</span>
              </span>
            </div>
            <ul className="flex flex-col gap-1 text-sm">
              {list.filter((r) => r.comment).map((r) => (
                <li key={r.id} className="rounded bg-muted px-3 py-2">
                  <span className="mr-2 text-xs text-muted-foreground">★{r.rating}</span>
                  {r.comment}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
