import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader, SiteHeaderFallback } from "@/components/site-header";

// 로그인한 사용자만 들어옵니다 (proxy.ts). 세션을 읽는 부분은 Suspense 안에 둡니다.
// 휴대폰에서는 아래 탭 막대(64px)가 본문을 가리지 않도록 그만큼 아래 여백을 둡니다.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        본문으로 건너뛰기
      </a>
      <Suspense fallback={<SiteHeaderFallback />}>
        <SiteHeader />
      </Suspense>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-5">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
