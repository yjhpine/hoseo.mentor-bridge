"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { REPORT_MAX_BYTES, isReportPathFor, reportFileContentType } from "@/lib/files/report-file-types";
import { createClient } from "@/lib/supabase/server";

export type ReportResult = { error?: string; success?: string };

const BUCKET = "mentor-reports";

/**
 * 브라우저가 Storage에 올린 보고서 파일을 학기 보고서로 저장합니다 (11장 35번).
 * 그 학기에 이미 낸 보고서가 있으면 새 파일로 바꾸고 옛 파일을 지웁니다.
 * 권한(본인·시작된 학기)과 경로 모양은 DB(RLS·check 제약)가 다시 확인합니다.
 */
export async function saveReport(input: {
  semesterId: number;
  filePath: string;
  fileName: string;
  fileSize: number;
}): Promise<ReportResult> {
  const me = await getCurrentUser();
  if (me?.role !== "mentor") return { error: "멘토만 보고서를 낼 수 있습니다." };
  const supabase = await createClient();
  const discard = () => supabase.storage.from(BUCKET).remove([input.filePath]);

  const fileName = input.fileName.trim().slice(0, 200);
  if (
    !Number.isInteger(input.semesterId) ||
    !isReportPathFor(input.filePath, me.id, input.semesterId) ||
    !reportFileContentType(fileName) ||
    !(input.fileSize > 0 && input.fileSize <= REPORT_MAX_BYTES)
  ) {
    await discard();
    return { error: "보고서 파일 정보가 올바르지 않습니다. 다시 올려 주세요." };
  }

  const { data: old } = await supabase
    .from("mentor_reports")
    .select("id, file_path")
    .eq("mentor_id", me.id)
    .eq("semester_id", input.semesterId)
    .maybeSingle();

  const values = { file_path: input.filePath, file_name: fileName, file_size: input.fileSize };
  const { error } = old
    ? await supabase.from("mentor_reports").update(values).eq("id", old.id)
    : await supabase.from("mentor_reports").insert({ ...values, semester_id: input.semesterId, mentor_id: me.id });
  if (error) {
    await discard();
    return { error: "보고서를 저장하지 못했습니다. 아직 시작하지 않은 학기인지 확인해 주세요." };
  }
  if (old && old.file_path !== input.filePath) {
    await supabase.storage.from(BUCKET).remove([old.file_path]);
  }
  revalidatePath("/mentor");
  return { success: old ? "보고서를 새 파일로 바꿨습니다." : "보고서를 냈습니다." };
}

/** 내 보고서 지우기 (행과 파일) */
export async function deleteReport(reportId: number): Promise<ReportResult> {
  const me = await getCurrentUser();
  if (me?.role !== "mentor") return { error: "멘토만 보고서를 지울 수 있습니다." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mentor_reports")
    .delete()
    .eq("id", reportId)
    .eq("mentor_id", me.id)
    .select("file_path")
    .maybeSingle();
  if (error || !data) return { error: "보고서를 지우지 못했습니다." };
  await supabase.storage.from(BUCKET).remove([data.file_path]);
  revalidatePath("/mentor");
  return { success: "보고서를 지웠습니다." };
}
