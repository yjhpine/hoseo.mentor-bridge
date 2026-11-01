import { FileText, PlayCircle, Video } from "lucide-react";
import { LESSON_KIND_LABELS, type Lesson, type LessonKind, type OutlineItem } from "@/features/courses/api/courses";
import { formatTime } from "@/lib/chat/answer-length";

const ICONS: Record<LessonKind, typeof Video> = {
  video_link: PlayCircle,
  file: FileText,
  live_link: Video,
};

/** 수강 전: 차시 제목과 종류만 보여 줍니다. */
export function LessonOutline({ items }: { items: OutlineItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">아직 등록된 차시가 없습니다.</p>;
  }
  return (
    <ol className="divide-y rounded-md border">
      {items.map((item, index) => {
        const Icon = ICONS[item.kind];
        return (
          <li key={item.id} className="flex items-center gap-3 p-3 text-sm">
            <span className="w-6 text-muted-foreground">{index + 1}</span>
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="flex-1">{item.title}</span>
            <span className="text-xs text-muted-foreground">
              {LESSON_KIND_LABELS[item.kind]}
              {item.starts_at && ` · ${formatTime(item.starts_at)}`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** 수강 멘티·작성 멘토·관리자: 영상 링크, 자료 파일, 실시간 수업 링크를 엽니다. */
export function LessonMaterials({ lessons }: { lessons: Lesson[] }) {
  if (lessons.length === 0) {
    return <p className="text-sm text-muted-foreground">아직 등록된 차시가 없습니다.</p>;
  }
  return (
    <ol className="divide-y rounded-md border">
      {lessons.map((lesson, index) => {
        const Icon = ICONS[lesson.kind];
        const href = lesson.kind === "file" ? `/files/lessons/${lesson.id}` : lesson.url!;
        const action =
          lesson.kind === "file" ? "내려받기" : lesson.kind === "live_link" ? "수업 들어가기" : "영상 보기";
        return (
          <li key={lesson.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
            <span className="w-6 text-muted-foreground">{index + 1}</span>
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0 flex-1">
              {lesson.title}
              <span className="block text-xs text-muted-foreground">
                {LESSON_KIND_LABELS[lesson.kind]}
                {lesson.starts_at && ` · ${formatTime(lesson.starts_at)}`}
                {lesson.file_name && ` · ${lesson.file_name}`}
              </span>
            </span>
            <a
              href={href}
              target={lesson.kind === "file" ? undefined : "_blank"}
              rel="noopener noreferrer"
              className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-accent"
            >
              {action}
            </a>
          </li>
        );
      })}
    </ol>
  );
}
