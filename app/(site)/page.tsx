import Link from "next/link";
import { Suspense } from "react";
import { getCollegeCards, getRecentMentors } from "@/features/mentors/api/mentors";
import { MentorGrid } from "@/features/mentors/components/mentor-card";
import { displayName, getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

// 홈: 단과대학 구역 카드, 추천 멘토 (4.1). 모집 중인 강의는 4단계에서 붙입니다.
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
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">{displayName(user)}님, 반갑습니다.</h1>
      <p className="text-muted-foreground">{notice}</p>
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
              className="flex h-full flex-col gap-1 rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <span className="font-semibold">{college.name}</span>
              {college.description && (
                <span className="line-clamp-2 text-sm text-muted-foreground">
                  {college.description}
                </span>
              )}
              <span className="mt-auto pt-2 text-sm text-muted-foreground">
                멘토 {college.mentorCount}명
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
        <Link href="/mentors" className="text-sm underline-offset-4 hover:underline">
          멘토 찾기
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
