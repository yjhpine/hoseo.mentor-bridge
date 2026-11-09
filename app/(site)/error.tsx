"use client";

import { ErrorScreen } from "@/components/error-screen";

// 사이트 화면의 오류 안내 (11장 34번). 위쪽 메뉴와 바닥글은 그대로 두고 본문만 바꿉니다.
export default function SiteError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorScreen {...props} />;
}
