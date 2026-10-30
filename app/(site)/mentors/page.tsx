import type { Metadata } from "next";
import { Suspense } from "react";
import {
  getCollegeCards,
  getJobFields,
  searchMentors,
} from "@/features/mentors/api/mentors";
import { MentorGrid } from "@/features/mentors/components/mentor-card";
import { MentorFilter, Pagination } from "@/features/mentors/components/mentor-filter";

export const metadata: Metadata = { title: "멘토 찾기" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInt(value: string | undefined) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-6 py-6">
      <h1 className="text-2xl font-semibold">멘토 찾기</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
        <MentorSearch searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function MentorSearch({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const value = {
    college: positiveInt(single(params.college)),
    field: positiveInt(single(params.field)),
    q: single(params.q)?.trim() || undefined,
  };
  const page = positiveInt(single(params.page)) ?? 1;

  const [colleges, jobFields, result] = await Promise.all([
    getCollegeCards(),
    getJobFields(),
    searchMentors({ collegeId: value.college, jobFieldId: value.field, q: value.q, page }),
  ]);

  const hrefFor = (target: number) => {
    const query = new URLSearchParams();
    if (value.college) query.set("college", String(value.college));
    if (value.field) query.set("field", String(value.field));
    if (value.q) query.set("q", value.q);
    if (target > 1) query.set("page", String(target));
    const text = query.toString();
    return text ? `/mentors?${text}` : "/mentors";
  };

  return (
    <>
      <MentorFilter colleges={colleges} jobFields={jobFields} value={value} />
      <p className="text-sm text-muted-foreground">멘토 {result.total}명</p>
      {result.mentors.length > 0 ? (
        <MentorGrid mentors={result.mentors} />
      ) : (
        <p className="rounded-lg border p-8 text-center text-muted-foreground">
          조건에 맞는 멘토가 없습니다.
        </p>
      )}
      <Pagination page={result.page} pageCount={result.pageCount} hrefFor={hrefFor} />
    </>
  );
}
