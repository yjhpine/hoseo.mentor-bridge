import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader, SiteHeaderFallback } from "@/components/site-header";
import { InstallPromptListener } from "@/features/notifications/components/install-app";

// 공개 화면(메인·소개·멘토 목록 등)은 로그인하지 않아도 들어옵니다 (proxy.ts). 세션을 읽는 부분은 Suspense 안에 둡니다.
// 휴대폰에서는 로그인하면 아래 탭 막대(64px)가 생기므로 그만큼 아래 여백을 둡니다(:has로 탭 막대가 있을 때만).
// 메인 대문처럼 화면 폭 전체를 쓰는 띠가 가로 스크롤을 만들지 않도록 overflow-x-clip을 둡니다.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col overflow-x-clip has-[[data-tab-bar]]:pb-[calc(4rem+env(safe-area-inset-bottom))] sm:has-[[data-tab-bar]]:pb-0">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        본문으로 건너뛰기
      </a>
      <Suspense fallback={<SiteHeaderFallback />}>
        <SiteHeader />
      </Suspense>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-5">
        {children}
      </main>
      <SiteFooter />
      <InstallPromptListener />
    </div>
  );
}
