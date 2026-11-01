"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/features/auth/api/actions";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

// 강의 쓰기 (4.1, 7장). 권한은 RLS와 트리거가 최종 확인하고, 여기서는 입력 모양만 검사합니다.

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function courseIdOf(formData: FormData) {
  const id = Number(formData.get("courseId"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function dbError(message: string | undefined, fallback: string) {
  if (!message) return fallback;
  if (/check constraint|violates check/i.test(message)) return "입력값이 규칙에 맞지 않습니다. 길이와 링크 주소를 확인해 주세요.";
  if (/row-level security|permission/i.test(message)) return "권한이 없습니다.";
  return message;
}

/** 멘티 수강 신청. 신청 시점의 현재 학기로 기록됩니다(트리거). */
export async function enroll(_prev: FormState, formData: FormData): Promise<FormState> {
  const courseId = courseIdOf(formData);
  if (!courseId) return { error: "강의를 찾지 못했습니다." };
  const supabase = await createClient();
  const { error } = await supabase.from("enrollments").insert({ course_id: courseId });
  if (error && !/duplicate key/i.test(error.message)) {
    return { error: dbError(error.message, "수강 신청하지 못했습니다.") };
  }
  revalidatePath(`/courses/${courseId}`);
  return { success: "수강 신청했습니다. 아래에서 강의 자료를 볼 수 있습니다." };
}

export async function cancelEnrollment(_prev: FormState, formData: FormData): Promise<FormState> {
  const courseId = courseIdOf(formData);
  const user = await getCurrentUser();
  if (!courseId || !user) return { error: "강의를 찾지 못했습니다." };
  const supabase = await createClient();
  const { error } = await supabase.from("enrollments").delete().eq("course_id", courseId).eq("mentee_id", user.id);
  if (error) return { error: dbError(error.message, "취소하지 못했습니다.") };
  revalidatePath(`/courses/${courseId}`);
  return { success: "수강 신청을 취소했습니다." };
}

/** 멘토가 새 강의를 만들면 편집 화면으로 갑니다. 처음에는 비공개(draft)입니다. */
export async function createCourse(_prev: FormState, formData: FormData): Promise<FormState> {
  const title = text(formData, "title");
  if (!title || title.length > 100) return { error: "강의 제목을 100자까지 입력해 주세요.", values: { title } };
  const supabase = await createClient();
  const { data, error } = await supabase.from("courses").insert({ title }).select("id").single();
  if (error) return { error: dbError(error.message, "강의를 만들지 못했습니다."), values: { title } };
  redirect(`/mentor/courses/${data.id}`);
}

export async function updateCourse(_prev: FormState, formData: FormData): Promise<FormState> {
  const courseId = courseIdOf(formData);
  const title = text(formData, "title");
  const summary = text(formData, "summary");
  const status = formData.get("status") === "published" ? "published" : "draft";
  if (!courseId) return { error: "강의를 찾지 못했습니다." };
  if (!title || title.length > 100) return { error: "강의 제목을 100자까지 입력해 주세요." };
  if (summary.length > 5000) return { error: "강의 소개는 5000자까지입니다." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({ title, summary: summary || null, status })
    .eq("id", courseId);
  if (error) return { error: dbError(error.message, "저장하지 못했습니다.") };
  revalidatePath(`/courses/${courseId}`);
  return { success: status === "published" ? "저장했습니다. 강의가 공개되어 있습니다." : "저장했습니다. 아직 비공개입니다." };
}

export async function deleteCourse(formData: FormData) {
  const courseId = courseIdOf(formData);
  if (!courseId) return;
  const supabase = await createClient();
  const { data: files } = await supabase.from("lessons").select("file_path").eq("course_id", courseId).not("file_path", "is", null);
  const paths = (files ?? []).map((f) => f.file_path!).filter(Boolean);
  if (paths.length) await supabase.storage.from("course-files").remove(paths);
  await supabase.from("courses").delete().eq("id", courseId);
  redirect("/mentor");
}

/** 영상 링크·실시간 링크 차시 추가. 파일 차시는 브라우저에서 올린 뒤 addFileLesson으로 기록합니다. */
export async function addLinkLesson(_prev: FormState, formData: FormData): Promise<FormState> {
  const courseId = courseIdOf(formData);
  const title = text(formData, "title");
  const kind = formData.get("kind") === "live_link" ? "live_link" : "video_link";
  const url = text(formData, "url");
  const startsAt = text(formData, "startsAt");
  const values = { title, url, startsAt, kind };
  if (!courseId) return { error: "강의를 찾지 못했습니다." };
  if (!title || title.length > 100) return { error: "차시 제목을 100자까지 입력해 주세요.", values };
  if (!/^https?:\/\//.test(url)) return { error: "링크는 http:// 또는 https://로 시작해야 합니다.", values };
  if (kind === "live_link" && !startsAt) return { error: "실시간 수업 시각을 입력해 주세요.", values };

  const supabase = await createClient();
  const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).eq("course_id", courseId);
  const { error } = await supabase.from("lessons").insert({
    course_id: courseId,
    title,
    kind,
    url,
    // datetime-local 값은 한국 시간으로 받습니다.
    starts_at: kind === "live_link" ? new Date(`${startsAt}:00+09:00`).toISOString() : null,
    position: ((count ?? 0) + 1) * 10,
  });
  if (error) return { error: dbError(error.message, "차시를 추가하지 못했습니다."), values };
  revalidatePath(`/mentor/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
  return { success: "차시를 추가했습니다." };
}

export async function addFileLesson(input: {
  courseId: number;
  title: string;
  filePath: string;
  fileName: string;
}): Promise<FormState> {
  const title = input.title.trim();
  if (!title || title.length > 100) return { error: "차시 제목을 100자까지 입력해 주세요." };
  const supabase = await createClient();
  const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).eq("course_id", input.courseId);
  const { error } = await supabase.from("lessons").insert({
    course_id: input.courseId,
    title,
    kind: "file",
    file_path: input.filePath,
    file_name: input.fileName.slice(0, 200),
    position: ((count ?? 0) + 1) * 10,
  });
  if (error) {
    // 기록에 실패하면 올린 파일을 지웁니다.
    await supabase.storage.from("course-files").remove([input.filePath]);
    return { error: dbError(error.message, "차시를 추가하지 못했습니다.") };
  }
  revalidatePath(`/mentor/courses/${input.courseId}`);
  revalidatePath(`/courses/${input.courseId}`);
  return { success: "자료 파일을 올렸습니다." };
}

export async function deleteLesson(formData: FormData) {
  const lessonId = Number(formData.get("lessonId"));
  const courseId = courseIdOf(formData);
  if (!Number.isInteger(lessonId) || !courseId) return;
  const supabase = await createClient();
  const { data } = await supabase.from("lessons").select("file_path").eq("id", lessonId).maybeSingle();
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (!error && data?.file_path) await supabase.storage.from("course-files").remove([data.file_path]);
  revalidatePath(`/mentor/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
}

/** 차시 순서를 한 칸 올리거나 내립니다. */
export async function moveLesson(formData: FormData) {
  const lessonId = Number(formData.get("lessonId"));
  const courseId = courseIdOf(formData);
  const direction = formData.get("direction") === "up" ? -1 : 1;
  if (!Number.isInteger(lessonId) || !courseId) return;
  const supabase = await createClient();
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, position")
    .eq("course_id", courseId)
    .order("position")
    .order("id");
  const list = lessons ?? [];
  const index = list.findIndex((l) => l.id === lessonId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
  await Promise.all(
    list.map((lesson, i) => supabase.from("lessons").update({ position: (i + 1) * 10 }).eq("id", lesson.id)),
  );
  revalidatePath(`/mentor/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
}
