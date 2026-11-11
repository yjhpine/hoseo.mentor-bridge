"use client";

import { Download, FileText, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/native-select";
import { FormMessage } from "@/features/auth/components/fields";
import { deleteReport, saveReport, type ReportResult } from "@/features/reports/api/actions";
import type { MentorReport, StartedSemester } from "@/features/reports/api/reports";
import { formatTime } from "@/lib/chat/answer-length";
import {
  REPORT_FILE_ACCEPT,
  REPORT_FILE_LABEL,
  REPORT_MAX_BYTES,
  formatFileSize,
  reportFileContentType,
  reportFilePath,
} from "@/lib/files/report-file-types";
import { createClient } from "@/lib/supabase/client";

/**
 * 학기 보고서 내기 (11장 35번). 학기마다 1건, 학기 중에도 언제든 내고 바꾸거나 지울 수 있습니다.
 * 강의 자료처럼 브라우저가 Storage에 바로 올린 뒤 서버 액션으로 보고서를 저장합니다.
 */
export function ReportUpload({
  mentorId,
  semesters,
  reports,
}: {
  mentorId: string;
  semesters: StartedSemester[];
  reports: MentorReport[];
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [semesterId, setSemesterId] = useState<number | null>(
    semesters.find((s) => s.is_current)?.id ?? semesters[0]?.id ?? null,
  );
  const [state, setState] = useState<ReportResult>({});
  const [uploading, setUploading] = useState(false);
  const [deleting, startDelete] = useTransition();

  if (semesters.length === 0) {
    return <p className="text-sm text-muted-foreground">아직 시작된 학기가 없습니다. 학기가 시작되면 보고서를 낼 수 있습니다.</p>;
  }

  const report = reports.find((r) => r.semester_id === semesterId) ?? null;

  async function upload(file: File) {
    if (!semesterId) return;
    const contentType = reportFileContentType(file.name);
    if (!contentType) {
      setState({ error: `올릴 수 없는 파일 형식입니다. ${REPORT_FILE_LABEL} 파일만 올릴 수 있습니다.` });
      return;
    }
    if (file.size > REPORT_MAX_BYTES) {
      setState({ error: "보고서 파일은 20MB까지 올릴 수 있습니다." });
      return;
    }
    setUploading(true);
    setState({});
    const path = reportFilePath(mentorId, semesterId, file.name, crypto.randomUUID());
    const { error } = await createClient().storage.from("mentor-reports").upload(path, file, { contentType });
    if (error) {
      setUploading(false);
      setState({ error: `파일을 올리지 못했습니다: ${error.message}` });
      return;
    }
    const result = await saveReport({ semesterId, filePath: path, fileName: file.name, fileSize: file.size });
    setUploading(false);
    setState(result);
    if (fileInput.current) fileInput.current.value = "";
    if (result.success) router.refresh();
  }

  function remove() {
    if (!report || !confirm(`"${report.file_name}" 보고서를 지울까요?`)) return;
    startDelete(async () => {
      const result = await deleteReport(report.id);
      setState(result);
      if (result.success) router.refresh();
    });
  }

  const busy = uploading || deleting;

  return (
    <div className="flex flex-col gap-3 rounded-md border p-4">
      <div className="grid gap-2 sm:w-64">
        <Label htmlFor="report-semester">학기</Label>
        <Select
          id="report-semester"
          value={semesterId ?? ""}
          onChange={(e) => {
            setSemesterId(Number(e.target.value));
            setState({});
          }}
        >
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.is_current ? " (현재)" : s.closed_at ? " (종료)" : ""}
            </option>
          ))}
        </Select>
      </div>

      {report ? (
        <div className="flex flex-col gap-2 rounded-md bg-muted p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>제출함</Badge>
            <FileText className="size-4 text-muted-foreground" aria-hidden />
            <span className="break-all font-medium">{report.file_name}</span>
            <span className="text-muted-foreground">{formatFileSize(report.file_size)}</span>
          </div>
          <p className="text-muted-foreground">
            낸 때 {formatTime(report.submitted_at)}
            {report.updated_at !== report.submitted_at && ` · 바꾼 때 ${formatTime(report.updated_at)}`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={`/files/reports/${report.id}`}>
                <Download aria-hidden />
                내려받기
              </a>
            </Button>
            <Button size="sm" variant="ghost" onClick={remove} disabled={busy}>
              <Trash2 aria-hidden />
              {deleting ? "지우는 중…" : "지우기"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary">미제출</Badge>
          <span className="text-muted-foreground">이 학기 보고서를 아직 내지 않았습니다.</span>
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="report-file">{report ? "다른 파일로 바꾸기" : "보고서 파일"}</Label>
        <input
          ref={fileInput}
          id="report-file"
          type="file"
          accept={REPORT_FILE_ACCEPT}
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
          className="text-sm file:mr-3 file:h-10 file:cursor-pointer file:rounded-md file:border file:border-input file:bg-background file:px-3 file:text-sm file:font-medium"
        />
        <p className="text-xs text-muted-foreground">
          {REPORT_FILE_LABEL}, 20MB까지. 파일을 고르면 바로 올라갑니다.
          {uploading && (
            <span className="ml-1 inline-flex items-center gap-1 font-medium text-foreground">
              <Upload className="size-3" aria-hidden />
              올리는 중…
            </span>
          )}
        </p>
      </div>
      <FormMessage state={state} />
    </div>
  );
}
