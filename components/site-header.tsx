import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { logout } from "@/features/auth/api/actions";
import { ROLE_LABELS, displayName, getCurrentUser } from "@/lib/auth/current-user";

function HeaderFrame({ children }: { children?: React.ReactNode }) {
  return (
    <header className="w-full border-b border-b-foreground/10">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-5 text-sm">
        <Link href="/" className="font-semibold">
          호서대학교 멘토링
        </Link>
        <div className="flex items-center gap-3">{children}</div>
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
      <ThemeSwitcher />
    </HeaderFrame>
  );
}
