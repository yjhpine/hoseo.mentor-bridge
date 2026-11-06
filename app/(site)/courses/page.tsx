import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBanner } from "@/components/page-banner";
import { listOpenCourses } from "@/features/courses/api/courses";
import { CourseList } from "@/features/courses/components/course-list";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "강의" };

// 모집 중인 강의 목록 (누구나 봄, 11장 32번). 강의 상세·차시·수강 신청은 로그인한 뒤에 봅니다.
export default function CoursesPage() {
  return (
    <div className="flex flex-col gap-6 py-6">
      <PageBanner
        eyebrow="강의"
        title="모집 중인 강의"
        description="멘토가 여는 온라인 강의입니다. 강의를 누르면 차시와 수강 신청을 볼 수 있습니다."
      />
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
        <OpenCourses />
      </Suspense>
    </div>
  );
}

async function OpenCourses() {
  const [courses, user] = await Promise.all([listOpenCourses(50), getCurrentUser()]);
  return <CourseList courses={courses} locked={!user} empty="아직 열린 강의가 없습니다." />;
}
