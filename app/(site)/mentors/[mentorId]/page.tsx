import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { hasOpenSemester } from "@/features/chats/api/chats";
import { AskButton } from "@/features/chats/components/ask-button";
import { getMentorStudentCount, listMentorCourses } from "@/features/courses/api/courses";
import { CourseList } from "@/features/courses/components/course-list";
import { getMentor, getMentorActivity } from "@/features/mentors/api/mentors";
import { MentorAvatar, QuestionBadge } from "@/features/mentors/components/mentor-card";
import { getCurrentUser } from "@/lib/auth/current-user";

type Params = Promise<{ mentorId: string }>;

const STATUS_NOTICE = {
  pending: "아직 개설되지 않은 멘토 페이지입니다. 관리자가 구역에 배치하고 개설하면 멘티에게 보입니다.",
  hidden: "비공개 상태라 멘티에게 보이지 않습니다.",
} as const;

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-muted-foreground">불러오는 중…</p>}>
      <MentorProfile params={params} />
    </Suspense>
  );
}

async function MentorProfile({ params }: { params: Params }) {
  const { mentorId } = await params;
  const [mentor, user, activity, semesterOpen] = await Promise.all([
    getMentor(mentorId),
    getCurrentUser(),
    getMentorActivity(mentorId),
    hasOpenSemester(),
  ]);
  const [courses, studentCount] = mentor
    ? await Promise.all([listMentorCourses(mentor.id), getMentorStudentCount(mentor.id)])
    : [[], 0];
  if (!mentor) {
    notFound();
  }
  const canAsk = user?.role === "mentee" && mentor.status === "published" && mentor.acceptingQuestions;

  return (
    <article className="flex flex-col gap-8 py-6">
      {mentor.status !== "published" && (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          {STATUS_NOTICE[mentor.status]}
        </p>
      )}

      <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <MentorAvatar src={mentor.photoUrl} name={mentor.displayName} size={96} />
        <div className="flex flex-col gap-1">
          {mentor.collegeName && mentor.collegeId && (
            <Link href={`/colleges/${mentor.collegeId}`} className="w-fit">
              <Badge variant="outline">{mentor.collegeName}</Badge>
            </Link>
          )}
          <h1 className="text-2xl font-semibold">{mentor.displayName}</h1>
          <p className="text-muted-foreground">
            {mentor.company} · {mentor.jobFieldName}
          </p>
          <div>
            <QuestionBadge accepting={mentor.acceptingQuestions} />
          </div>
        </div>
      </header>

      <dl className="grid grid-cols-3 gap-3 sm:w-fit">
        <Stat label="답변 수" value={`${activity.answerCount}개`} />
        <Stat
          label="답변율"
          value={activity.roomCount > 0 ? `${Math.round((activity.answeredRoomCount / activity.roomCount) * 100)}%` : "-"}
          hint="질문 받은 톡방 중 답변한 비율"
        />
        <Stat label="수강생 수" value={`${studentCount}명`} />
      </dl>

      {canAsk &&
        (semesterOpen ? (
          <AskButton mentorId={mentor.id} />
        ) : (
          <p className="text-sm text-muted-foreground">지금은 질문을 받는 학기가 아닙니다.</p>
        ))}

      <Section title="대표 멘토링 분야">{mentor.headline}</Section>
      <Section title="멘토 소개">{mentor.intro}</Section>
      <Section title="주요 경력">{mentor.career}</Section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">등록한 강의</h2>
        <CourseList courses={courses} showMentor={false} empty="아직 등록한 강의가 없습니다." />
      </section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: string | null }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children ? (
        // 한 줄이 너무 길면 읽기 어려워 PC에서도 65자 안팎으로 줄을 바꿉니다 (line-length-control)
        <p className="max-w-prose whitespace-pre-line leading-relaxed">{children}</p>
      ) : (
        <p className="text-muted-foreground">아직 작성하지 않았습니다.</p>
      )}
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border px-4 py-3" title={hint}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
