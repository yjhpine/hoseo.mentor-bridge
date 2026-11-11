import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { listMyRooms } from "@/features/chats/api/chats";
import { listMentorCourses } from "@/features/courses/api/courses";
import { NewCourseForm } from "@/features/courses/components/course-editor";
import { CourseList } from "@/features/courses/components/course-list";
import { RoomList } from "@/features/chats/components/room-list";
import { getMentor } from "@/features/mentors/api/mentors";
import { MentorPageForm } from "@/features/mentors/components/mentor-page-form";
import { PhotoUpload } from "@/features/mentors/components/photo-upload";
import { InstallApp } from "@/features/notifications/components/install-app";
import { PushToggle } from "@/features/notifications/components/push-toggle";
import { listMyReports, listStartedSemesters } from "@/features/reports/api/reports";
import { ReportUpload } from "@/features/reports/components/report-upload";
import { requireRole } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "내 멘토 페이지" };

const STATUS = {
  pending: { label: "개설 대기", note: "관리자가 단과대학 구역에 배치하고 개설하면 멘티에게 공개됩니다." },
  published: { label: "공개", note: "멘티가 멘토 찾기에서 이 페이지를 볼 수 있습니다." },
  hidden: { label: "비공개", note: "관리자가 비공개로 돌려 멘티에게 보이지 않습니다." },
} as const;

// 멘토 대시보드: 받은 질문, 강의 관리, 내 페이지 편집 (4.1 /mentor)
export default function Page() {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-muted-foreground">불러오는 중…</p>}>
      <MentorDashboard />
    </Suspense>
  );
}

async function MentorDashboard() {
  const me = await requireRole("mentor");
  const [mentor, rooms, courses, semesters, reports] = await Promise.all([
    getMentor(me.id),
    listMyRooms(me.id),
    listMentorCourses(me.id),
    listStartedSemesters(),
    listMyReports(me.id),
  ]);
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
      <div id="notifications" className="flex scroll-mt-20 flex-col gap-3">
        <PushToggle role="mentor" />
        <InstallApp />
      </div>
      <PhotoUpload mentorId={mentor.id} name={mentor.displayName} photoUrl={mentor.photoUrl} hasPhoto={mentor.hasPhoto} />
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">받은 질문</h2>
        <RoomList rooms={rooms} viewer="mentor" />
      </section>

      <section id="report" className="flex scroll-mt-20 flex-col gap-2">
        <h2 className="text-lg font-semibold">학기 보고서</h2>
        {(() => {
          const current = semesters.find((s) => s.is_current);
          return current && !reports.some((r) => r.semester_id === current.id) ? (
            <p className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">
              {current.name} 학기 보고서를 아직 내지 않았습니다. 학기가 끝나기 전에 올려 주세요.
            </p>
          ) : null;
        })()}
        <ReportUpload mentorId={me.id} semesters={semesters} reports={reports} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">내 강의</h2>
        <NewCourseForm />
        <CourseList courses={courses} showMentor={false} empty="아직 등록한 강의가 없습니다." />
      </section>

      <h2 className="text-lg font-semibold">내 페이지 편집</h2>
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
