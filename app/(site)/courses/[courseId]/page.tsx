import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { hasOpenSemester } from "@/features/chats/api/chats";
import { getCourseDetail } from "@/features/courses/api/courses";
import { CancelEnrollmentButton, EnrollButton } from "@/features/courses/components/enroll-buttons";
import { LessonMaterials, LessonOutline } from "@/features/courses/components/lesson-materials";
import { getCurrentUser } from "@/lib/auth/current-user";

type Params = Promise<{ courseId: string }>;

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-muted-foreground">불러오는 중…</p>}>
      <CourseDetail params={params} />
    </Suspense>
  );
}

// 강의 상세 (4.1): 소개, 차시 목록, 수강 신청. 자료는 수강 멘티·작성 멘토·관리자만 봅니다.
async function CourseDetail({ params }: { params: Params }) {
  const { courseId } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();
  const [detail, semesterOpen] = await Promise.all([
    getCourseDetail(Number(courseId), user.id),
    hasOpenSemester(),
  ]);
  if (!detail) notFound();
  const { course, outline, enrollmentCount, enrolled, lessons } = detail;
  const isOwner = user.id === course.mentorId;
  const canSeeMaterials = enrolled || isOwner || user.role === "admin";

  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{course.title}</h1>
          {course.status === "draft" && <Badge variant="secondary">비공개</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {course.mentorId ? (
            <Link href={`/mentors/${course.mentorId}`} className="underline-offset-4 hover:underline">
              {course.mentorName}
            </Link>
          ) : (
            course.mentorName
          )}{" "}
          · {course.company} · 수강생 {enrollmentCount}명
        </p>
        {isOwner && (
          <Link href={`/mentor/courses/${course.id}`} className="w-fit text-sm underline underline-offset-4">
            강의 편집
          </Link>
        )}
      </header>

      {course.summary && <p className="whitespace-pre-line leading-relaxed">{course.summary}</p>}

      {user.role === "mentee" &&
        (enrolled ? (
          <div className="flex flex-wrap items-center gap-3">
            <Badge>수강 중</Badge>
            <CancelEnrollmentButton courseId={course.id} />
          </div>
        ) : course.status === "published" && semesterOpen ? (
          <EnrollButton courseId={course.id} />
        ) : (
          <p className="text-sm text-muted-foreground">지금은 수강 신청을 받는 학기가 아닙니다.</p>
        ))}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{canSeeMaterials ? "강의 자료" : "차시 목록"}</h2>
        {canSeeMaterials ? (
          <LessonMaterials lessons={lessons} />
        ) : (
          <>
            <LessonOutline items={outline} />
            <p className="text-xs text-muted-foreground">수강 신청하면 영상·자료·실시간 수업 링크를 볼 수 있습니다.</p>
          </>
        )}
      </section>
    </article>
  );
}
