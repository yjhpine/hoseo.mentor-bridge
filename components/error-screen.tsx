"use client";

import { Home, MessageSquareWarning, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/errors/report";

/**
 * 화면을 그리다 오류가 났을 때 보이는 안내 (11장 34번). 오류는 자동으로 기록하고,
 * 다시 시도·홈으로·문제 알리기를 고를 수 있게 합니다. 문제 알리기는 로그인해야 쓸 수 있습니다(로그인 화면을 거쳐 돌아옴).
 */
export function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // digest가 있으면 서버에서 난 오류이고 instrumentation.ts가 이미 기록했습니다(브라우저에는 가려진 문구만 옴).
  useEffect(() => {
    if (!error.digest) reportClientError(error);
  }, [error]);

  const from = typeof window === "undefined" ? "/" : window.location.pathname;

  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <MessageSquareWarning className="size-12 text-brand" aria-hidden />
      <h1 className="text-2xl font-bold">문제가 생겼습니다</h1>
      <p className="text-muted-foreground">
        잠시 후 다시 시도해 주세요. 오류 내용은 관리자에게 자동으로 전달됐습니다.
        {error.digest && <span className="mt-1 block text-xs">오류 번호: {error.digest}</span>}
      </p>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button onClick={reset} size="lg">
          <RotateCcw aria-hidden />
          다시 시도
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/">
            <Home aria-hidden />
            홈으로
          </Link>
        </Button>
      </div>
      <Link
        href={`/report?from=${encodeURIComponent(from)}`}
        className="flex h-10 items-center text-sm font-medium text-brand underline underline-offset-4"
      >
        무엇을 하다가 생겼는지 알려 주기
      </Link>
    </div>
  );
}
