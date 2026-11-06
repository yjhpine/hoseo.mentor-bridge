import { LockKeyhole } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { MentorSummary } from "@/features/mentors/api/mentors";
import { loginHref } from "@/lib/auth/public-paths";
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

/**
 * 멘토 카드: 큰 사진 · 이름 · 기업명 · 직무 분야 · 대표 멘토링 분야 · 단과대학 구역 · 질문 가능 여부 (4.2, 11장 33번)
 * 사진은 카드 위쪽을 정사각형으로 채워 한눈에 보이게 합니다.
 * locked: 로그인하지 않은 방문자. 누르면 로그인 화면으로 가고, 로그인한 뒤 이 멘토 상세로 돌아옵니다.
 */
export function MentorCard({ mentor, locked = false }: { mentor: MentorSummary; locked?: boolean }) {
  const href = `/mentors/${mentor.id}`;
  return (
    <Link
      href={locked ? loginHref(href) : href}
      className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        <Image
          src={mentor.photoUrl}
          alt={`${mentor.displayName} 프로필 사진`}
          fill
          unoptimized
          sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        <span className="absolute left-2 top-2">
          <QuestionBadge accepting={mentor.acceptingQuestions} />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <div className="min-w-0">
          <p className="line-clamp-2 break-keep font-semibold sm:text-lg">{mentor.displayName}</p>
          <p className="truncate text-sm text-muted-foreground">{mentor.company}</p>
          <p className="truncate text-sm text-muted-foreground">{mentor.jobFieldName}</p>
        </div>
        <p className="line-clamp-2 min-h-10 text-sm">
          {mentor.headline || "대표 멘토링 분야를 준비 중입니다."}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          {mentor.collegeName && <Badge variant="outline">{mentor.collegeName}</Badge>}
        </div>
        {locked && (
          <span className="flex items-center gap-1 pt-1 text-sm font-medium text-brand">
            <LockKeyhole className="size-3.5" aria-hidden />
            로그인하고 보기
          </span>
        )}
      </div>
    </Link>
  );
}

/** 멘토 목록: 휴대폰 2열, 태블릿 3열, PC 4열 */
export function MentorGrid({ mentors, locked = false }: { mentors: MentorSummary[]; locked?: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {mentors.map((mentor) => (
        <li key={mentor.id}>
          <MentorCard mentor={mentor} locked={locked} />
        </li>
      ))}
    </ul>
  );
}
