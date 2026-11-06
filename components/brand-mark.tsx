import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * 서비스 이름 표시: 호서대학교 공식 로고(Venture 1st 상자)와 "취업팀 멘토링" (11장 22번).
 * 로고 파일은 학교 홈페이지의 공식 로고에서 빨간 상자 부분만 잘라 썼습니다(public/brand/hoseo-emblem.png).
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="호서대학교 멘토링 홈"
      className={cn(
        "flex h-12 shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Image src="/brand/hoseo-emblem.png" alt="" width={44} height={44} unoptimized className="size-11" />
      <span className="flex flex-col leading-tight">
        <span className="text-xs font-medium text-muted-foreground">호서대학교 취업팀</span>
        <span className="text-lg font-bold tracking-tight">멘토링</span>
      </span>
    </Link>
  );
}
