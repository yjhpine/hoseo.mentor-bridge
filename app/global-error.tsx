"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/errors/report";
import "./globals.css";

// 맨 바깥 레이아웃까지 깨졌을 때의 마지막 안내 (11장 34번). 레이아웃 없이 html·body부터 그립니다.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // digest가 있으면 서버에서 난 오류이고 instrumentation.ts가 이미 기록했습니다(브라우저에는 가려진 문구만 옴).
  useEffect(() => {
    if (!error.digest) reportClientError(error);
  }, [error]);

  return (
    <html lang="ko">
      <body className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center font-sans text-foreground">
        <h1 className="text-2xl font-bold">문제가 생겼습니다</h1>
        <p className="text-muted-foreground">잠시 후 다시 시도해 주세요. 오류 내용은 관리자에게 자동으로 전달됐습니다.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="h-11 rounded-md bg-primary px-5 font-medium text-primary-foreground"
          >
            다시 시도
          </button>
          {/* 레이아웃이 깨진 상태라 클라이언트 이동 대신 새로 불러옵니다. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="flex h-11 items-center rounded-md border px-5 font-medium">
            홈으로
          </a>
        </div>
      </body>
    </html>
  );
}
