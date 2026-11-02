// 강의 자료로 올릴 수 있는 파일 형식 (docs/architecture.md 11장 25번).
// Storage 버킷 course-files의 allowed_mime_types(마이그레이션 course_file_types)와 같은 목록이어야 합니다.
// 브라우저가 알려 주는 형식(file.type)은 한글(HWP) 등에서 비어 있거나 제각각이라, 확장자로 형식을 정해 올립니다.

export const COURSE_FILE_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  hwp: "application/x-hwp",
  hwpx: "application/hwp+zip",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  zip: "application/zip",
  txt: "text/plain",
};

/** 파일 선택 창에 걸 accept 값 (".pdf,.hwp,...") */
export const COURSE_FILE_ACCEPT = Object.keys(COURSE_FILE_TYPES).map((ext) => `.${ext}`).join(",");

/** 화면 안내용 (PDF, HWP, ...) */
export const COURSE_FILE_LABEL = "PDF, 한글(HWP·HWPX), 워드, 엑셀, 파워포인트, 이미지(PNG·JPG), ZIP, TXT";

export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot < 0 ? "" : fileName.slice(dot + 1).toLowerCase();
}

/** 올릴 수 있는 파일이면 저장할 형식(MIME)을, 아니면 null을 돌려줍니다. */
export function courseFileContentType(fileName: string): string | null {
  return COURSE_FILE_TYPES[fileExtension(fileName)] ?? null;
}
