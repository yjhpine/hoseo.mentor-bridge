import { Suspense } from "react";
import { SiteHeader, SiteHeaderFallback } from "@/components/site-header";

// 로그인한 사용자만 들어옵니다 (proxy.ts). 세션을 읽는 부분은 Suspense 안에 둡니다.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <Suspense fallback={<SiteHeaderFallback />}>
        <SiteHeader />
      </Suspense>
      <main className="mx-auto w-full max-w-5xl flex-1 p-5">{children}</main>
    </div>
  );
}
