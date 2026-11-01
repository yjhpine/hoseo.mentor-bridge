import Link from "next/link";

/** 서비스 이름 표시. 학교 교표·로고는 쓰지 않고 상징색(Passion RED)만 씁니다. */
/** full: 휴대폰에서도 "호서대학교 멘토링" 전체를 보여 줍니다 (로그인·처리방침 화면). */
export function BrandMark({ full = false }: { full?: boolean }) {
  return (
    <Link href="/" className="flex h-10 items-center gap-2 rounded-md font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        호서
      </span>
      {full ? (
        <span>호서대학교 멘토링</span>
      ) : (
        <span>
          <span className="sm:hidden">멘토링</span>
          <span className="hidden sm:inline">호서대학교 멘토링</span>
        </span>
      )}
    </Link>
  );
}
