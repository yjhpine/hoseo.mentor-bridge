import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/native-select";

type Option = { id: number; name: string };

/**
 * 구역·직무 분야·검색어 필터. 일반 GET 폼이라 값이 주소에 담겨 공유와 뒤로 가기가 됩니다.
 * 예: /mentors?college=3&field=7&q=백엔드
 */
export function MentorFilter({
  colleges,
  jobFields,
  value,
}: {
  colleges: Option[];
  jobFields: Option[];
  value: { college?: number; field?: number; q?: string };
}) {
  return (
    <form
      action="/mentors"
      method="get"
      className="grid gap-2 sm:grid-cols-[1fr_1fr_2fr_auto_auto]"
    >
      <Select name="college" defaultValue={value.college ?? ""} aria-label="단과대학 구역">
        <option value="">모든 구역</option>
        {colleges.map((college) => (
          <option key={college.id} value={college.id}>
            {college.name}
          </option>
        ))}
      </Select>
      <Select name="field" defaultValue={value.field ?? ""} aria-label="직무 분야">
        <option value="">모든 직무 분야</option>
        {jobFields.map((field) => (
          <option key={field.id} value={field.id}>
            {field.name}
          </option>
        ))}
      </Select>
      <Input
        name="q"
        type="search"
        placeholder="이름, 기업, 멘토링 분야 검색"
        maxLength={50}
        defaultValue={value.q}
        aria-label="검색어"
      />
      <Button type="submit">찾기</Button>
      <Button asChild variant="ghost">
        <Link href="/mentors">초기화</Link>
      </Button>
    </form>
  );
}

export function Pagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="페이지" className="flex items-center justify-center gap-3 text-sm">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className="underline-offset-4 hover:underline">
          이전
        </Link>
      ) : (
        <span className="text-muted-foreground">이전</span>
      )}
      <span>
        {page} / {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className="underline-offset-4 hover:underline">
          다음
        </Link>
      ) : (
        <span className="text-muted-foreground">다음</span>
      )}
    </nav>
  );
}
