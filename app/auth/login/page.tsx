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

export const metadata: Metadata = { title: "로그인" };

export default function Page() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">로그인</CardTitle>
        <CardDescription>소속, 이름, PIN을 입력하세요.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
          <LoginFormWithOptions />
        </Suspense>
      </CardContent>
    </Card>
  );
}

async function LoginFormWithOptions() {
  const colleges = await getCollegeOptions();
  return <LoginForm colleges={colleges} />;
}
