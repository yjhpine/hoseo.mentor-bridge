"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/errors/report";

/** 화면 어디서든 잡히지 않은 오류와 처리되지 않은 Promise 거부를 기록합니다 (11장 34번). 화면에는 아무것도 그리지 않습니다. */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const where = event.filename ? `at ${event.filename}:${event.lineno}:${event.colno}` : "";
      reportClientError(event.error ?? event.message, { detail: where });
    };
    const onRejection = (event: PromiseRejectionEvent) => reportClientError(event.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
