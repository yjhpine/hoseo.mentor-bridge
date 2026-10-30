import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { UserMenu } from "@/components/user-menu";
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

const NAV_LINK =
  "text-muted-foreground underline-offset-4 hover:text-foreground hover:underline";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <HeaderFrame>
      {user && (
        <>
          <Link href="/mentors" className={NAV_LINK}>
            멘토 찾기
          </Link>
          {user.role === "mentor" && (
            <Link href="/mentor" className={NAV_LINK}>
              <span className="sm:hidden">내 페이지</span>
              <span className="hidden sm:inline">내 멘토 페이지</span>
            </Link>
          )}
          {user.role === "admin" && (
            <Link href="/admin" className={NAV_LINK}>
              관리자
            </Link>
          )}
          <UserMenu name={displayName(user)} roleLabel={ROLE_LABELS[user.role]} />
        </>
      )}
      <div className="hidden sm:block">
        <ThemeSwitcher />
      </div>
    </HeaderFrame>
  );
}
