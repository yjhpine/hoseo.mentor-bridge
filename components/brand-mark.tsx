import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * 서비스 이름 표시: 호서대학교 공식 시그니처(한글+영어 타입, 2026 대학 UI 가이드)와 "멘토링" (11장 22번).
 * 가이드라인은 로고를 임의로 바꾸거나 비율을 조정하지 말라고 하므로 원본 파일을 원본 비율(약 4.3:1) 그대로 씁니다.
 * 밝은 화면은 컬러판, 어두운 화면은 학교가 내놓은 화이트판입니다. "멘토링"은 로고 밖에 구분선을 두고 따로 씁니다.
 * 크기는 너비·높이를 함께 고정합니다(flex 안에서 이미지가 늘어나지 않게).
 */
export function BrandMark({ className }: { className?: string }) {
  const size = "h-[30px] w-[129px] sm:h-9 sm:w-[155px]";
  return (
    <Link
      href="/"
      aria-label="호서대학교 멘토링 홈"
      className={cn(
        "flex h-12 shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-3",
        className,
      )}
    >
      <Image src="/brand/hoseo-signature.png" alt="" width={155} height={36} unoptimized className={cn(size, "dark:hidden")} />
      <Image
        src="/brand/hoseo-signature-white.png"
        alt=""
        width={155}
        height={36}
        unoptimized
        className={cn(size, "hidden dark:block")}
      />
      <span aria-hidden className="h-6 w-px bg-border sm:h-7" />
      <span className="text-base font-bold tracking-tight sm:text-lg">멘토링</span>
    </Link>
  );
}
