import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCollege, searchMentors } from "@/features/mentors/api/mentors";
import { MentorGrid } from "@/features/mentors/components/mentor-card";

type Params = Promise<{ collegeId: string }>;

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-muted-foreground">불러오는 중…</p>}>
      <CollegeZone params={params} />
    </Suspense>
  );
}

async function CollegeZone({ params }: { params: Params }) {
  const { collegeId } = await params;
  const id = Number(collegeId);
  const college = await getCollege(id);
  if (!college) {
    notFound();
  }
  const { mentors, total } = await searchMentors({ collegeId: id });

  return (
    <div className="flex flex-col gap-6 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{college.name}</h1>
        {college.description && (
          <p className="whitespace-pre-line text-muted-foreground">{college.description}</p>
        )}
      </header>
      <div className="flex items-center justify-between">
        <h2 className="font-medium">소속 멘토 {total}명</h2>
        {total > mentors.length && (
          <Link
            href={`/mentors?college=${college.id}`}
            className="text-sm underline-offset-4 hover:underline"
          >
            모두 보기
          </Link>
        )}
      </div>
      {mentors.length > 0 ? (
        <MentorGrid mentors={mentors} />
      ) : (
        <p className="rounded-lg border p-8 text-center text-muted-foreground">
          아직 이 구역에 개설된 멘토가 없습니다.
        </p>
      )}
    </div>
  );
}
