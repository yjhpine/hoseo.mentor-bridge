import type { Metadata } from "next";
import { Suspense } from "react";
import { listMyEnrollments } from "@/features/courses/api/courses";
import { CourseList } from "@/features/courses/components/course-list";
import { displayName, requireRole } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "마이페이지" };

// 마이페이지 (4.1 /mypage, 멘티): 내 정보, 수강 중인 강의. 만족도 조사는 5단계에서 붙입니다.
export default function Page() {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-muted-foreground">불러오는 중…</p>}>
      <MyPage />
    </Suspense>
  );
}

async function MyPage() {
  const me = await requireRole("mentee");
  const courses = await listMyEnrollments(me.id);
  return (
    <div className="flex flex-col gap-6 py-6">
      <h1 className="text-2xl font-semibold">{displayName(me)}님의 마이페이지</h1>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">수강 중인 강의</h2>
        <CourseList courses={courses} empty="아직 수강 신청한 강의가 없습니다. 홈의 '모집 중인 강의'나 멘토 상세에서 신청하세요." />
      </section>
    </div>
  );
}
