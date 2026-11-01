import Link from "next/link";
import { PRIVACY_OPERATOR, PRIVACY_PATH } from "@/lib/privacy/policy";

// 모든 화면 아래에 개인정보 처리방침 링크를 둡니다 (docs/architecture.md 6.7).
export function SiteFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 p-5 text-xs text-muted-foreground">
      <span>{PRIVACY_OPERATOR}</span>
      <Link href={PRIVACY_PATH} className="font-medium text-foreground underline-offset-4 hover:underline">
        개인정보 처리방침
      </Link>
    </footer>
  );
}
