import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { CourseSummary } from "@/features/courses/api/courses";
import { loginHref } from "@/lib/auth/public-paths";

export function CourseList({
  courses,
  showMentor = true,
  empty,
  locked = false,
}: {
  courses: CourseSummary[];
  showMentor?: boolean;
  empty: string;
  /** 로그인하지 않은 방문자: 누르면 로그인 화면으로 안내합니다 */
  locked?: boolean;
}) {
  if (courses.length === 0) {
    return <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {courses.map((course) => (
        <li key={course.id}>
          <Link
            href={locked ? loginHref(`/courses/${course.id}`) : `/courses/${course.id}`}
            className="flex h-full flex-col gap-1 rounded-xl border p-4 transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex items-center gap-2 font-semibold">
              {course.title}
              {course.status === "draft" && <Badge variant="secondary">비공개</Badge>}
            </span>
            {showMentor && (
              <span className="text-sm text-muted-foreground">
                {course.mentorName} · {course.company}
              </span>
            )}
            {course.summary && <span className="line-clamp-2 text-sm">{course.summary}</span>}
            {locked && <span className="mt-auto pt-1 text-sm font-medium text-brand">로그인하고 보기 →</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
