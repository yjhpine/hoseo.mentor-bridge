import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { getMentor } from "@/features/mentors/api/mentors";
import { MentorAvatar, QuestionBadge } from "@/features/mentors/components/mentor-card";

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

// 활동 지표와 질문하기는 3단계(톡방), 등록한 강의는 4단계에서 붙입니다.
async function MentorProfile({ params }: { params: Params }) {
  const { mentorId } = await params;
  const mentor = await getMentor(mentorId);
  if (!mentor) {
    notFound();
  }

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

      <Section title="대표 멘토링 분야">{mentor.headline}</Section>
      <Section title="멘토 소개">{mentor.intro}</Section>
      <Section title="주요 경력">{mentor.career}</Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: string | null }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children ? (
        <p className="whitespace-pre-line leading-relaxed">{children}</p>
      ) : (
        <p className="text-muted-foreground">아직 작성하지 않았습니다.</p>
      )}
    </section>
  );
}
