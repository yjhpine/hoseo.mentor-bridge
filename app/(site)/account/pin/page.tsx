import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PinChangeForm } from "@/features/auth/components/pin-change-form";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "PIN 변경" };

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-sm py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">PIN 변경</CardTitle>
          <CardDescription>
            <Suspense fallback="현재 PIN을 확인한 뒤 새 PIN으로 바꿉니다.">
              <PinNotice />
            </Suspense>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PinChangeForm />
        </CardContent>
      </Card>
    </div>
  );
}

async function PinNotice() {
  const user = await getCurrentUser();
  return user?.mustChangePin
    ? "관리자가 정해 준 임시 PIN으로 로그인했습니다. 계속하려면 새 PIN으로 바꿔 주세요."
    : "현재 PIN을 확인한 뒤 새 PIN으로 바꿉니다.";
}
