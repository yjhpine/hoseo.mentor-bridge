import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { MentorSummary } from "@/features/mentors/api/mentors";
import { cn } from "@/lib/utils";

export function MentorAvatar({
  src,
  name,
  size,
  className,
}: {
  src: string;
  name: string;
  size: number;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={`${name} 프로필 사진`}
      width={size}
      height={size}
      unoptimized
      className={cn("shrink-0 rounded-full bg-muted object-cover", className)}
    />
  );
}

export function QuestionBadge({ accepting }: { accepting: boolean }) {
  return accepting ? (
    <Badge>질문 가능</Badge>
  ) : (
    <Badge variant="secondary">질문 마감</Badge>
  );
}

/** 멘토 카드: 사진 · 이름 · 기업명 · 직무 분야 · 대표 멘토링 분야 · 단과대학 구역 · 질문 가능 여부 (4.2) */
export function MentorCard({ mentor }: { mentor: MentorSummary }) {
  return (
    <Link
      href={`/mentors/${mentor.id}`}
      className="flex h-full flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-3">
        <MentorAvatar src={mentor.photoUrl} name={mentor.displayName} size={56} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{mentor.displayName}</p>
          <p className="truncate text-sm text-muted-foreground">{mentor.company}</p>
          <p className="truncate text-sm text-muted-foreground">{mentor.jobFieldName}</p>
        </div>
      </div>
      <p className="line-clamp-2 min-h-10 text-sm">
        {mentor.headline || "대표 멘토링 분야를 준비 중입니다."}
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-2">
        {mentor.collegeName && <Badge variant="outline">{mentor.collegeName}</Badge>}
        <QuestionBadge accepting={mentor.acceptingQuestions} />
      </div>
    </Link>
  );
}

export function MentorGrid({ mentors }: { mentors: MentorSummary[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {mentors.map((mentor) => (
        <li key={mentor.id}>
          <MentorCard mentor={mentor} />
        </li>
      ))}
    </ul>
  );
}
