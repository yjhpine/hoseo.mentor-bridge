"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/native-select";
import type { FormState } from "@/features/auth/api/actions";
import { FormMessage, submitWithoutReset } from "@/features/auth/components/fields";
import { addFileLesson, addLinkLesson, createCourse, updateCourse } from "@/features/courses/api/actions";
import type { CourseStatus } from "@/features/courses/api/courses";
import { createClient } from "@/lib/supabase/client";
import { COURSE_FILE_ACCEPT, COURSE_FILE_LABEL, courseFileContentType, fileExtension } from "@/lib/files/course-file-types";

const textareaClassName =
  "flex min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm";

// 자료 파일 한도: course-files 버킷과 같은 20MB (10장 저장 용량)
const MAX_FILE_BYTES = 20 * 1024 * 1024;

export function NewCourseForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createCourse, {});
  return (
    <form action={action} onSubmit={submitWithoutReset(action)} className="flex flex-col gap-2 sm:flex-row">
      <Input name="title" placeholder="새 강의 제목" maxLength={100} required defaultValue={state.values?.title} aria-label="새 강의 제목" />
      <Button type="submit" disabled={pending}>{pending ? "만드는 중…" : "강의 만들기"}</Button>
      <FormMessage state={state} />
    </form>
  );
}

export function CourseInfoForm({
  course,
}: {
  course: { id: number; title: string; summary: string | null; status: CourseStatus };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateCourse, {});
  return (
    <form action={action} onSubmit={submitWithoutReset(action)} className="flex flex-col gap-4">
      <input type="hidden" name="courseId" value={course.id} />
      <div className="grid gap-2">
        <Label htmlFor="course-title">강의 제목</Label>
        <Input id="course-title" name="title" maxLength={100} required defaultValue={course.title} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="course-summary">강의 소개 (5000자까지)</Label>
        <textarea id="course-summary" name="summary" maxLength={5000} defaultValue={course.summary ?? ""} className={textareaClassName} />
      </div>
      <div className="grid gap-2 sm:w-64">
        <Label htmlFor="course-status">공개 여부</Label>
        <Select id="course-status" name="status" defaultValue={course.status}>
          <option value="draft">비공개 (준비 중)</option>
          <option value="published">공개 (수강 신청 받기)</option>
        </Select>
      </div>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="sm:w-fit">{pending ? "저장하는 중…" : "저장"}</Button>
    </form>
  );
}

/** 차시 추가: 영상 링크·실시간 링크는 서버 액션으로, 자료 파일은 브라우저에서 Storage에 올린 뒤 기록합니다. */
/** canUploadFiles: 개설(공개)된 멘토만 자료 파일을 올릴 수 있습니다 (11장 27번). Storage 정책도 같은 기준으로 막습니다. */
export function AddLessonForm({ courseId, canUploadFiles }: { courseId: number; canUploadFiles: boolean }) {
  const [kind, setKind] = useState<"video_link" | "live_link" | "file">("video_link");
  const [linkState, linkAction, linkPending] = useActionState<FormState, FormData>(addLinkLesson, {});
  const [fileState, setFileState] = useState<FormState>({});
  const [uploading, setUploading] = useState(false);

  async function uploadFile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    const title = String(data.get("title") ?? "");
    if (!(file instanceof File) || file.size === 0) {
      setFileState({ error: "올릴 파일을 골라 주세요." });
      return;
    }
    const contentType = courseFileContentType(file.name);
    if (!contentType) {
      setFileState({ error: `올릴 수 없는 파일 형식입니다. ${COURSE_FILE_LABEL} 파일만 올릴 수 있습니다.` });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileState({ error: "파일은 20MB까지 올릴 수 있습니다. 영상은 유튜브 등 외부 링크로 등록해 주세요." });
      return;
    }
    setUploading(true);
    setFileState({});
    // 경로: "{강의 id}/{무작위}.{확장자}". 원래 파일 이름은 file_name에 따로 둡니다.
    // 허용 목록을 통과한 확장자라 영문 소문자·숫자만 들어갑니다.
    const path = `${courseId}/${crypto.randomUUID()}.${fileExtension(file.name)}`;
    const { error } = await createClient()
      .storage.from("course-files")
      .upload(path, file, { contentType });
    if (error) {
      setUploading(false);
      setFileState({ error: `파일을 올리지 못했습니다: ${error.message}` });
      return;
    }
    const result = await addFileLesson({ courseId, title, filePath: path, fileName: file.name });
    setUploading(false);
    setFileState(result);
    if (result.success) form.reset();
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border p-4">
      <div className="grid gap-2 sm:w-64">
        <Label htmlFor="lesson-kind">차시 종류</Label>
        <Select id="lesson-kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="video_link">영상 링크 (유튜브 등)</option>
          <option value="file">자료 파일 (20MB까지)</option>
          <option value="live_link">실시간 수업 링크 (줌 등)</option>
        </Select>
      </div>

      {kind === "file" && !canUploadFiles ? (
        <p className="text-sm text-muted-foreground">
          자료 파일은 관리자가 멘토 페이지를 개설한 뒤에 올릴 수 있습니다. 그전에는 영상 링크나 실시간 수업 링크 차시를 만들 수 있습니다.
        </p>
      ) : kind === "file" ? (
        <form onSubmit={uploadFile} className="flex flex-col gap-3">
          <div className="grid gap-2">
            <Label htmlFor="lesson-title-file">차시 제목</Label>
            <Input id="lesson-title-file" name="title" maxLength={100} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lesson-file">파일</Label>
            <Input id="lesson-file" name="file" type="file" accept={COURSE_FILE_ACCEPT} required aria-describedby="lesson-file-help" />
            <p id="lesson-file-help" className="text-xs text-muted-foreground">{COURSE_FILE_LABEL} 파일을 20MB까지 올릴 수 있습니다.</p>
          </div>
          <FormMessage state={fileState} />
          <Button type="submit" disabled={uploading} className="sm:w-fit">{uploading ? "올리는 중…" : "파일 올리기"}</Button>
        </form>
      ) : (
        <form action={linkAction} className="flex flex-col gap-3">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="kind" value={kind} />
          <div className="grid gap-2">
            <Label htmlFor="lesson-title">차시 제목</Label>
            <Input id="lesson-title" name="title" maxLength={100} required defaultValue={linkState.values?.title} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lesson-url">{kind === "live_link" ? "수업 링크" : "영상 링크"}</Label>
            <Input id="lesson-url" name="url" type="url" placeholder="https://" required defaultValue={linkState.values?.url} />
          </div>
          {kind === "live_link" && (
            <div className="grid gap-2 sm:w-64">
              <Label htmlFor="lesson-starts">수업 시각 (한국 시간)</Label>
              <Input id="lesson-starts" name="startsAt" type="datetime-local" required defaultValue={linkState.values?.startsAt} />
            </div>
          )}
          <FormMessage state={linkState} />
          <Button type="submit" disabled={linkPending} className="sm:w-fit">{linkPending ? "추가하는 중…" : "차시 추가"}</Button>
        </form>
      )}
    </div>
  );
}

export function DeleteCourseButton({ courseId, action }: { courseId: number; action: (formData: FormData) => void }) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm("강의를 삭제할까요? 차시, 자료 파일, 수강 신청이 모두 지워지고 되돌릴 수 없습니다.")) {
          event.preventDefault();
        }
      }}
      className="border-t pt-4"
    >
      <input type="hidden" name="courseId" value={courseId} />
      <Button type="submit" variant="outline" size="sm" className="text-red-600">
        강의 삭제
      </Button>
    </form>
  );
}
