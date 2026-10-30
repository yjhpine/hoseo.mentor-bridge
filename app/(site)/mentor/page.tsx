import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { getMentor } from "@/features/mentors/api/mentors";
import { MentorPageForm } from "@/features/mentors/components/mentor-page-form";
import { requireRole } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "내 멘토 페이지" };

const STATUS = {
  pending: { label: "개설 대기", note: "관리자가 단과대학 구역에 배치하고 개설하면 멘티에게 공개됩니다." },
  published: { label: "공개", note: "멘티가 멘토 찾기에서 이 페이지를 볼 수 있습니다." },
  hidden: { label: "비공개", note: "관리자가 비공개로 돌려 멘티에게 보이지 않습니다." },
} as const;

// 멘토 대시보드. 받은 질문은 3단계, 강의 관리는 4단계에서 붙입니다.
export default function Page() {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-muted-foreground">불러오는 중…</p>}>
      <MentorDashboard />
    </Suspense>
  );
}

async function MentorDashboard() {
  const me = await requireRole("mentor");
  const mentor = await getMentor(me.id);
  if (!mentor) {
    return <p className="py-6">멘토 정보를 찾지 못했습니다. 관리자에게 문의하세요.</p>;
  }
  const status = STATUS[mentor.status];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">내 멘토 페이지</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={mentor.status === "published" ? "default" : "secondary"}>
            {status.label}
          </Badge>
          {mentor.collegeName && <Badge variant="outline">{mentor.collegeName}</Badge>}
          <span className="text-muted-foreground">
            {mentor.company} · {mentor.jobFieldName}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {status.note} 기업명과 직무 분야를 바꾸려면 관리자에게 요청하세요.{" "}
          <Link href={`/mentors/${mentor.id}`} className="underline underline-offset-4">
            내 페이지 미리 보기
          </Link>
        </p>
      </div>
      <MentorPageForm
        initial={{
          headline: mentor.headline,
          intro: mentor.intro,
          career: mentor.career,
          acceptingQuestions: mentor.acceptingQuestions,
        }}
      />
    </div>
  );
}
