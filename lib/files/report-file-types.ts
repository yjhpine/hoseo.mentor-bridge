// 멘토 학기 보고서로 올릴 수 있는 파일 형식 (docs/architecture.md 11장 35번).
// Storage 버킷 mentor-reports의 allowed_mime_types(마이그레이션 mentor_reports)와 같은 목록이어야 합니다.
import { COURSE_FILE_TYPES, fileExtension } from "./course-file-types";

export const REPORT_FILE_TYPES: Record<string, string> = {
  pdf: COURSE_FILE_TYPES.pdf,
  hwp: COURSE_FILE_TYPES.hwp,
  hwpx: COURSE_FILE_TYPES.hwpx,
  doc: COURSE_FILE_TYPES.doc,
  docx: COURSE_FILE_TYPES.docx,
};

/** 보고서 파일 한도: mentor-reports 버킷과 같은 20MB */
export const REPORT_MAX_BYTES = 20 * 1024 * 1024;

export const REPORT_FILE_ACCEPT = Object.keys(REPORT_FILE_TYPES).map((ext) => `.${ext}`).join(",");

export const REPORT_FILE_LABEL = "PDF, 한글(HWP·HWPX), 워드(DOC·DOCX)";

/** 올릴 수 있는 보고서 파일이면 저장할 형식(MIME)을, 아니면 null */
export function reportFileContentType(fileName: string): string | null {
  return REPORT_FILE_TYPES[fileExtension(fileName)] ?? null;
}

/** 보고서 경로: "{멘토 id}/{학기 id}/{무작위}.{확장자}" (DB check 제약·Storage 정책과 같은 모양) */
export function reportFilePath(mentorId: string, semesterId: number, fileName: string, id: string): string {
  return `${mentorId}/${semesterId}/${id}.${fileExtension(fileName)}`;
}

export function isReportPathFor(path: string, mentorId: string, semesterId: number): boolean {
  const pattern = new RegExp(`^${mentorId}/${semesterId}/[0-9a-f-]{36}\\.(pdf|hwp|hwpx|doc|docx)$`);
  return pattern.test(path);
}

/** 1234567 → "1.2MB" */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
