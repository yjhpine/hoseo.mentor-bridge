import { ArrowRight, MessageCircle, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";
import { listOpenCourses } from "@/features/courses/api/courses";
import { CourseList } from "@/features/courses/components/course-list";
import { getCollegeCards, getRecentMentors } from "@/features/mentors/api/mentors";
import { listPendingSurveys } from "@/features/surveys/api/surveys";
import { MentorGrid } from "@/features/mentors/components/mentor-card";
import { PushIntro } from "@/features/notifications/components/push-intro";
import { displayName, getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

// 홈: 단과대학 구역 카드, 새로 개설된 멘토, 모집 중인 강의 (4.1)
export default function Home() {
  return (
    <div className="flex flex-col gap-10 py-6">
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
        <Welcome />
      </Suspense>
      <Suspense fallback={null}>
        <CollegeSection />
      </Suspense>
      <Suspense fallback={null}>
        <RecentMentorSection />
      </Suspense>
      <Suspense fallback={null}>
        <OpenCourseSection />
      </Suspense>
    </div>
  );
}

async function Welcome() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  let notice: React.ReactNode = "단과대학 구역에서 멘토를 찾아보세요.";
  if (user.role === "mentor") {
    const supabase = await createClient();
    const { data: mentor } = await supabase
      .from("mentor_profiles")
      .select("status")
      .eq("id", user.id)
      .maybeSingle();
    notice =
      mentor?.status === "published" ? (
        <>
          멘토 페이지가 공개되어 있습니다.{" "}
          <Link href="/mentor" className="underline underline-offset-4">
            내 멘토 페이지 편집
          </Link>
        </>
      ) : (
        <>
          관리자가 단과대학 구역에 배치하고 멘토 페이지를 개설하면 멘티에게 공개됩니다. 그동안{" "}
          <Link href="/mentor" className="underline underline-offset-4">
            소개와 경력
          </Link>
          을 미리 써 둘 수 있습니다.
        </>
      );
  } else if (user.role === "mentee") {
    const surveys = await listPendingSurveys();
    if (surveys.length > 0) {
      notice = (
        <>
          지난 학기 멘토 만족도 조사가 {surveys.length}건 있습니다.{" "}
          <Link href="/mypage" className="underline underline-offset-4">
            마이페이지에서 응답하기
          </Link>
        </>
      );
    }
  } else if (user.role === "admin") {
    notice = (
      <>
        개설을 기다리는 멘토는{" "}
        <Link href="/admin/mentors" className="underline underline-offset-4">
          관리자 화면
        </Link>
        에서 구역에 배치합니다.
      </>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-accent px-5 py-6 sm:px-8 sm:py-8">
      {(user.role === "mentor" || user.role === "mentee") && <PushIntro role={user.role} />}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-brand">호서대학교 멘토링</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground [text-wrap:balance] sm:text-3xl">
          {displayName(user)}님, 반갑습니다.
        </h1>
        <p className="max-w-prose text-foreground/80">{notice}</p>
      </div>
      {user.role === "mentee" && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/mentors">
              <Search aria-hidden />
              멘토 찾기
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/chats">
              <MessageCircle aria-hidden />
              내 톡방
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}

async function CollegeSection() {
  const colleges = await getCollegeCards();
  if (colleges.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">단과대학 구역</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {colleges.map((college) => (
          <li key={college.id}>
            <Link
              href={`/colleges/${college.id}`}
              className="group flex h-full flex-col gap-1 rounded-xl border p-4 transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-center justify-between gap-2 font-semibold">
                {college.name}
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
              </span>
              {college.description && (
                <span className="line-clamp-2 text-sm text-muted-foreground">
                  {college.description}
                </span>
              )}
              <span className="mt-auto pt-2 text-sm">
                {college.mentorCount > 0 ? (
                  <span className="font-semibold text-brand">멘토 {college.mentorCount}명</span>
                ) : (
                  <span className="text-muted-foreground">멘토 준비 중</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function RecentMentorSection() {
  const mentors = await getRecentMentors(6);
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">새로 개설된 멘토</h2>
        <Link href="/mentors" className="flex h-10 items-center gap-1 text-sm font-medium text-brand underline-offset-4 hover:underline">
          전체 보기
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      {mentors.length > 0 ? (
        <MentorGrid mentors={mentors} />
      ) : (
        <p className="rounded-lg border p-8 text-center text-muted-foreground">
          아직 개설된 멘토가 없습니다.
        </p>
      )}
    </section>
  );
}

async function OpenCourseSection() {
  const courses = await listOpenCourses(6);
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">모집 중인 강의</h2>
      <CourseList courses={courses} empty="아직 열린 강의가 없습니다." />
    </section>
  );
}
