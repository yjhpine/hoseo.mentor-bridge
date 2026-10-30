import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { logout } from "@/features/auth/api/actions";
import { ROLE_LABELS, displayName, getCurrentUser } from "@/lib/auth/current-user";

function HeaderFrame({ children }: { children?: React.ReactNode }) {
  return (
    <header className="w-full border-b border-b-foreground/10">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 whitespace-nowrap px-4 text-sm sm:px-5">
        <Link href="/" className="font-semibold">
          <span className="sm:hidden">호서 멘토링</span>
          <span className="hidden sm:inline">호서대학교 멘토링</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">{children}</div>
      </div>
    </header>
  );
}

/** 세션을 읽기 전 먼저 보이는 껍데기 */
export function SiteHeaderFallback() {
  return <HeaderFrame />;
}

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <HeaderFrame>
      {user && (
        <>
          <span className="hidden items-center gap-2 sm:flex">
            {displayName(user)}
            <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
          </span>
          {user.role === "admin" && (
            <Link
              href="/admin/users"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              사용자 관리
            </Link>
          )}
          <Link
            href="/account/pin"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            PIN 변경
          </Link>
          <form action={logout}>
            <Button type="submit" size="sm" variant="outline">
              로그아웃
            </Button>
          </form>
        </>
      )}
      <div className="hidden sm:block">
        <ThemeSwitcher />
      </div>
    </HeaderFrame>
  );
}
