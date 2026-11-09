import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBanner } from "@/components/page-banner";
import { ReportForm } from "@/features/issues/components/report-form";
import { safeNextPath } from "@/lib/auth/public-paths";

export const metadata: Metadata = { title: "문제 알리기" };

type SearchParams = Promise<{ from?: string | string[] }>;

// 문제 알리기 (11장 34번). 로그인한 사람만 들어옵니다(proxy가 로그인 화면으로 보냈다가 돌려보냄).
export default function ReportPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-6">
      <PageBanner
        eyebrow="문제 알리기"
        title="이용 중 문제가 있었나요?"
        description="오류가 났거나 화면이 이상하면 알려 주세요. 관리자가 확인하고 고칩니다."
      />
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
        <Form searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Form({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const from = safeNextPath(Array.isArray(params.from) ? params.from[0] : params.from);
  return <ReportForm from={from && from !== "/report" ? from.split("?")[0] : null} />;
}
