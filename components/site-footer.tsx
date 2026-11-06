import Image from "next/image";
import Link from "next/link";
import { PRIVACY_OPERATOR, PRIVACY_PATH } from "@/lib/privacy/policy";

// 모든 화면 아래: 학교 로고, 운영 주체, 개인정보 처리방침 링크 (docs/architecture.md 6.7).
// 호서대학교 홈페이지처럼 짙은 회색 띠로 둡니다. 밝은·어두운 모드 모두 같은 색입니다.
export function SiteFooter() {
  return (
    <footer className="w-full bg-neutral-900 text-neutral-300">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-col gap-3">
          <Image
            src="/brand/hoseo-logo-white.png"
            alt="호서대학교"
            width={222}
            height={60}
            unoptimized
            className="h-10 w-auto"
          />
          <p className="text-sm">{PRIVACY_OPERATOR} 멘토링 · 단과대학별 현직 멘토 1:1 질문</p>
        </div>
        <nav aria-label="바닥글 메뉴" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <Link href="/about" className="flex h-10 items-center underline-offset-4 hover:text-white hover:underline">
            서비스 소개
          </Link>
          <Link href="/guide" className="flex h-10 items-center underline-offset-4 hover:text-white hover:underline">
            이용 안내
          </Link>
          <Link
            href={PRIVACY_PATH}
            className="flex h-10 items-center font-semibold text-white underline-offset-4 hover:underline"
          >
            개인정보 처리방침
          </Link>
        </nav>
      </div>
    </footer>
  );
}
