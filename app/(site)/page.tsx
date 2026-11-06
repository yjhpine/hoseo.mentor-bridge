import { ArrowRight, BellRing, LogIn, MessageCircle, Search, UserRoundPlus } from "lucide-react";
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

// 메인: 누구나 보는 첫 화면 (4.1, 11장 32번).
// 빨간 대문, (로그인했으면) 환영 안내, 단과대학 구역 카드, 새로 개설된 멘토, 모집 중인 강의, 이용 순서
export default function Home() {
  return (
    <div className="flex flex-col gap-12 pb-6">
      <Suspense fallback={<Hero loggedIn={false} />}>
        <HeroWithSession />
      </Suspense>
      <Suspense fallback={null}>
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
      <StepsSection />
    </div>
  );
}

async function HeroWithSession() {
  const user = await getCurrentUser();
  return <Hero loggedIn={Boolean(user)} />;
}

/**
 * 대문: 호서대학교 교정 사진(학교 홈페이지 캠퍼스갤러리, 강석규교육관) 위에 상징색 빨강 반투명 덮개.
 * 글자가 있는 왼쪽은 진하게 덮어 사진 위에서도 흰 글자 대비(4.5:1 이상)를 지킵니다. 화면 폭 전체를 씁니다.
 */
function Hero({ loggedIn }: { loggedIn: boolean }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative -mt-5 mx-[calc(50%-50vw)] w-screen overflow-hidden bg-[#7d1016] text-white"
    >
      <picture>
        <source media="(min-width: 640px)" srcSet="/brand/campus-1920.webp" />
        {/* 휴대폰과 PC에 크기가 다른 사진을 주려고 picture를 씁니다 (next/image는 화면 폭별 다른 파일을 못 고름). */}
        <img
          src="/brand/campus-960.webp"
          alt=""
          fetchPriority="high"
          className="absolute inset-0 size-full object-cover object-[50%_40%]"
        />
      </picture>
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(100deg,rgba(125,16,22,0.94)_0%,rgba(125,16,22,0.86)_40%,rgba(80,10,14,0.5)_70%,rgba(30,4,6,0.2)_100%)] max-sm:bg-[linear-gradient(180deg,rgba(125,16,22,0.88)_0%,rgba(110,14,20,0.82)_100%)]"
      />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-5 px-4 py-14 sm:px-5 sm:py-20">
        <p className="w-fit rounded-full border border-white/40 px-3 py-1 text-sm font-medium">
          호서대학교 취업팀 · 현직 멘토 1:1 멘토링
        </p>
        <h1 id="hero-title" className="max-w-2xl text-3xl font-bold leading-tight tracking-tight [text-wrap:balance] sm:text-5xl">
          현직 선배에게 묻고,
          <br />
          나의 진로를 설계하세요
        </h1>
        <p className="max-w-xl text-base text-white/85 sm:text-lg">
          단과대학별로 배치된 현직 멘토에게 궁금한 점을 1:1로 묻고, 성의 있는 답변을 받아 보세요.
        </p>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button asChild size="lg" className="bg-white text-[#8f141a] hover:bg-white/90">
            <Link href="/mentors">
              <Search aria-hidden />
              멘토 찾기
            </Link>
          </Button>
          {loggedIn ? (
            <Button asChild size="lg" variant="outline" className="border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <Link href="/guide">
                이용 안내
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg" variant="outline" className="border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <Link href="/auth/login">
                <LogIn aria-hidden />
                로그인
              </Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function SectionTitle({ title, href, linkLabel = "전체 보기" }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-end justify-between gap-3 border-b-2 border-foreground pb-2">
      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
      {href && (
        <Link href={href} className="flex h-10 items-center gap-1 text-sm font-medium text-brand underline-offset-4 hover:underline">
          {linkLabel}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

const STEPS = [
  {
    icon: UserRoundPlus,
    title: "회원가입·로그인",
    body: "소속 학과와 이름, 숫자 6자리 PIN으로 가입합니다. 이메일은 받지 않습니다.",
  },
  {
    icon: MessageCircle,
    title: "멘토 찾고 질문하기",
    body: "단과대학 구역에서 멘토를 골라 1:1 톡방에서 질문합니다.",
  },
  {
    icon: BellRing,
    title: "답변 받기",
    body: "멘토는 공백을 뺀 50자 이상으로 답합니다. 알림을 켜 두면 답변이 오면 바로 알려 드립니다.",
  },
];

function StepsSection() {
  return (
    <section className="flex flex-col gap-4">
      <SectionTitle title="이용 순서" href="/guide" linkLabel="이용 안내" />
      <ol className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3 rounded-xl border bg-card p-4 sm:flex-col">
            <span className="flex items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {index + 1}
              </span>
              <step.icon className="hidden size-5 text-brand sm:block" aria-hidden />
            </span>
            <span className="flex flex-col gap-1">
              <span className="font-semibold">{step.title}</span>
              <span className="text-sm text-muted-foreground">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
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
        <h2 className="text-2xl font-bold tracking-tight text-foreground [text-wrap:balance] sm:text-3xl">
          {displayName(user)}님, 반갑습니다.
        </h2>
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
    <section className="flex flex-col gap-4">
      <SectionTitle title="단과대학 구역" href="/mentors" linkLabel="전체 멘토" />
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {colleges.map((college) => (
          <li key={college.id}>
            <Link
              href={`/colleges/${college.id}`}
              className="group flex h-full flex-col gap-1 rounded-xl border border-t-4 border-t-primary bg-card p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
  const [mentors, user] = await Promise.all([getRecentMentors(8), getCurrentUser()]);
  return (
    <section className="flex flex-col gap-4">
      <SectionTitle title="새로 개설된 멘토" href="/mentors" />
      {mentors.length > 0 ? (
        <MentorGrid mentors={mentors} locked={!user} />
      ) : (
        <p className="rounded-lg border p-8 text-center text-muted-foreground">
          아직 개설된 멘토가 없습니다.
        </p>
      )}
    </section>
  );
}

async function OpenCourseSection() {
  const [courses, user] = await Promise.all([listOpenCourses(6), getCurrentUser()]);
  return (
    <section className="flex flex-col gap-4">
      <SectionTitle title="모집 중인 강의" href="/courses" />
      <CourseList courses={courses} locked={!user} empty="아직 열린 강의가 없습니다." />
    </section>
  );
}
