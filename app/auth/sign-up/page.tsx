import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getCollegeOptions,
  getJobFieldOptions,
} from "@/features/auth/api/affiliations";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

export const metadata: Metadata = { title: "회원가입" };

export default function Page() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">회원가입</CardTitle>
        <CardDescription>
          학과를 고르면 멘티로, &quot;멘토&quot;를 고르면 멘토로 가입합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
          <SignUpFormWithOptions />
        </Suspense>
      </CardContent>
    </Card>
  );
}

async function SignUpFormWithOptions() {
  const [colleges, jobFields] = await Promise.all([
    getCollegeOptions(),
    getJobFieldOptions(),
  ]);
  return <SignUpForm colleges={colleges} jobFields={jobFields} />;
}
