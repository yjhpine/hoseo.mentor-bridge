"use client";

import { ErrorScreen } from "@/components/error-screen";

// 로그인·가입 화면의 오류 안내 (11장 34번)
export default function AuthError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorScreen {...props} />;
}
