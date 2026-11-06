import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCollegeOptions } from "@/features/auth/api/affiliations";
import { LoginForm } from "@/features/auth/components/login-form";
import { safeNextPath } from "@/lib/auth/public-paths";

export const metadata: Metadata = { title: "로그인" };

type SearchParams = Promise<{ next?: string | string[] }>;

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">로그인</CardTitle>
        <CardDescription>
          소속, 이름, PIN을 입력하세요. 로그인하면 멘토 상세·질문·수강을 이용할 수 있어요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
          <LoginFormWithOptions searchParams={searchParams} />
        </Suspense>
      </CardContent>
    </Card>
  );
}

async function LoginFormWithOptions({ searchParams }: { searchParams: SearchParams }) {
  const [colleges, params] = await Promise.all([getCollegeOptions(), searchParams]);
  // 로그인한 뒤 돌아갈 화면 (proxy가 붙여 줌). 사이트 안의 경로만 받습니다.
  const next = safeNextPath(Array.isArray(params.next) ? params.next[0] : params.next);
  return (
    <LoginForm
      colleges={colleges}
      next={next ?? undefined}
      turnstileSiteKey={process.env.TURNSTILE_SITE_KEY || undefined}
    />
  );
}
