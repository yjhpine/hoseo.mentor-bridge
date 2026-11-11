"use client";

import { useList, type HttpError } from "@refinedev/core";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SemesterSelect } from "@/features/admin/components/semester-select";
import { useSemesterPicker, type MentorRow } from "@/features/admin/components/semester-stats";
import { formatTime } from "@/lib/chat/answer-length";
import { formatFileSize } from "@/lib/files/report-file-types";
import type { Tables } from "@/types/database.types";

type Report = Tables<"mentor_reports">;

// 학기별 멘토 보고서 (docs/architecture.md 11장 35번). 공개 멘토와 보고서를 낸 멘토를 한 줄씩 보여 주고,
// 낸 보고서는 서명 URL(/files/reports/[id])로 내려받습니다. 관리자는 보고서를 고치거나 지우지 않습니다.
export default function AdminReportsPage() {
  const { semesters, semesterId, setSemesterId } = useSemesterPicker();
  const reports = useList<Report, HttpError>({
    resource: "mentor_reports",
    pagination: { mode: "off" },
    filters: semesterId ? [{ field: "semester_id", operator: "eq", value: semesterId }] : [],
    queryOptions: { enabled: Boolean(semesterId) },
  });
  const mentors = useList<MentorRow, HttpError>({
    resource: "mentor_directory",
    pagination: { mode: "off" },
    sorters: [{ field: "name", order: "asc" }],
  });

  const reportByMentor = new Map(reports.result.data.map((r) => [r.mentor_id, r]));
  const rows = mentors.result.data
    .filter((m) => m.status === "published" || reportByMentor.has(m.id))
    .map((m) => ({ mentor: m, report: reportByMentor.get(m.id) ?? null }))
    .sort((a, b) => Number(Boolean(b.report)) - Number(Boolean(a.report)));
  const submitted = rows.filter((r) => r.report).length;

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">멘토 보고서</h1>
      <p className="text-sm text-muted-foreground">
        멘토가 학기마다 낸 보고서(PDF·한글·워드)입니다. 멘토는 학기 중에도 언제든 내고 바꿀 수 있어, 내려받을 때마다 가장
        최근 파일이 열립니다.
      </p>
      <SemesterSelect semesters={semesters} value={semesterId} onChange={setSemesterId} />
      {semesterId && (
        <p className="text-sm">
          제출 <span className="font-semibold">{submitted}</span> / 전체 {rows.length}명
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {!mentors.query.isLoading && rows.length === 0 && (
          <li className="rounded-md border p-6 text-center text-muted-foreground">공개된 멘토가 없습니다.</li>
        )}
        {rows.map(({ mentor, report }) => (
          <li key={mentor.id} className="flex flex-col gap-2 rounded-md border p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{(mentor.name ?? "") + (mentor.name_tag ?? "")}</span>
                <span className="text-sm text-muted-foreground">{mentor.company}</span>
                {mentor.college_name && <Badge variant="outline">{mentor.college_name}</Badge>}
              </p>
              {report ? (
                <p className="mt-1 break-all text-sm text-muted-foreground">
                  {report.file_name} · {formatFileSize(report.file_size)} · 낸 때 {formatTime(report.submitted_at)}
                  {report.updated_at !== report.submitted_at && ` · 바꾼 때 ${formatTime(report.updated_at)}`}
                </p>
              ) : null}
            </div>
            {report ? (
              <Button asChild size="sm" variant="outline" className="w-fit">
                <a href={`/files/reports/${report.id}`}>
                  <Download aria-hidden />
                  내려받기
                </a>
              </Button>
            ) : (
              <Badge variant="secondary" className="w-fit">
                미제출
              </Badge>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
