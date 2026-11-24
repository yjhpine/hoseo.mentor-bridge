import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConsentForm } from "@/features/auth/components/consent-form";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "개인정보 수집·이용 동의" };

// 첫 로그인 동의 (docs/architecture.md 6.1, 6.7, 11장 36번). 동의 기록이 없는 멘토·멘티는 proxy가 이 화면으로 보냅니다.
export default function Page() {
  return (
    <div className="mx-auto w-full max-w-md py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">처음 오셨네요</CardTitle>
          <CardDescription>
            학교 담당자가 계정을 미리 만들어 두었습니다. 이용하려면 아래 개인정보 수집·이용에 동의해 주세요. 동의한 뒤에는
            임시 PIN을 새 PIN으로 바꾸게 됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
            <Form />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function Form() {
  const user = await getCurrentUser();
  return <ConsentForm isMentor={user?.role === "mentor"} />;
}
