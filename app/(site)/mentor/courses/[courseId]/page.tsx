import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { deleteCourse, deleteLesson, moveLesson } from "@/features/courses/api/actions";
import { getCourseForEdit, LESSON_KIND_LABELS } from "@/features/courses/api/courses";
import { AddLessonForm, CourseInfoForm, DeleteCourseButton } from "@/features/courses/components/course-editor";
import { formatTime } from "@/lib/chat/answer-length";
import { requireRole } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "강의 편집" };

type Params = Promise<{ courseId: string }>;

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-muted-foreground">불러오는 중…</p>}>
      <CourseEditPage params={params} />
    </Suspense>
  );
}

// 멘토 강의 관리 (4.1 /mentor): 소개·공개 여부, 차시 추가·순서·삭제
async function CourseEditPage({ params }: { params: Params }) {
  const { courseId } = await params;
  const me = await requireRole("mentor");
  const supabase = await createClient();
  const [data, { data: mentor }] = await Promise.all([
    getCourseForEdit(Number(courseId), me.id),
    supabase.from("mentor_profiles").select("status").eq("id", me.id).maybeSingle(),
  ]);
  if (!data) notFound();
  const { course, lessons, enrollmentCount } = data;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-6">
      <div className="flex flex-col gap-1">
        <Link href="/mentor" className="text-sm text-muted-foreground underline-offset-4 hover:underline">← 내 멘토 페이지</Link>
        <h1 className="text-2xl font-semibold">강의 편집</h1>
        <p className="text-sm text-muted-foreground">
          수강생 {enrollmentCount}명 ·{" "}
          <Link href={`/courses/${course.id}`} className="underline underline-offset-4">멘티에게 보이는 화면</Link>
        </p>
      </div>

      <CourseInfoForm course={course} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">차시</h2>
        {lessons.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 차시가 없습니다. 아래에서 추가하세요.</p>
        ) : (
          <ol className="divide-y rounded-md border">
            {lessons.map((lesson, index) => (
              <li key={lesson.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
                <span className="w-6 text-muted-foreground">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  {lesson.title}
                  <span className="block truncate text-xs text-muted-foreground">
                    {LESSON_KIND_LABELS[lesson.kind]}
                    {lesson.starts_at && ` · ${formatTime(lesson.starts_at)}`}
                    {lesson.file_name ? ` · ${lesson.file_name}` : lesson.url ? ` · ${lesson.url}` : ""}
                  </span>
                </span>
                <form action={moveLesson} className="flex gap-1">
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="lessonId" value={lesson.id} />
                  <Button type="submit" name="direction" value="up" size="sm" variant="ghost" disabled={index === 0} aria-label="위로">↑</Button>
                  <Button type="submit" name="direction" value="down" size="sm" variant="ghost" disabled={index === lessons.length - 1} aria-label="아래로">↓</Button>
                </form>
                <form action={deleteLesson}>
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="lessonId" value={lesson.id} />
                  <Button type="submit" size="sm" variant="outline">삭제</Button>
                </form>
              </li>
            ))}
          </ol>
        )}
        <AddLessonForm courseId={course.id} canUploadFiles={mentor?.status === "published"} />
      </section>

      <DeleteCourseButton courseId={course.id} action={deleteCourse} />
    </div>
  );
}
