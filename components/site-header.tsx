import { BrandMark } from "@/components/brand-mark";
import { DesktopNav, MobileTabBar, type NavItem } from "@/components/main-nav";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { UserMenu } from "@/components/user-menu";
import { getUnreadTotal } from "@/features/chats/api/chats";
import { ROLE_LABELS, displayName, getCurrentUser } from "@/lib/auth/current-user";

function HeaderFrame({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 whitespace-nowrap px-4 sm:px-5">
        <BrandMark />
        <div className="flex items-center gap-1 sm:gap-2">{children}</div>
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
  const unread = user && user.role !== "admin" ? await getUnreadTotal() : 0;

  const items: NavItem[] = user
    ? [
        { href: "/", label: "홈", icon: "home" },
        { href: "/mentors", label: "멘토 찾기", icon: "search", match: ["/colleges", "/courses"] },
        ...(user.role !== "admin"
          ? [{ href: "/chats", label: "톡방", icon: "chat" as const, badge: unread }]
          : []),
        ...(user.role === "mentor"
          ? [{ href: "/mentor", label: "내 페이지", icon: "me" as const }]
          : user.role === "mentee"
            ? [{ href: "/mypage", label: "마이페이지", icon: "me" as const }]
            : [{ href: "/admin", label: "관리자", icon: "admin" as const }]),
      ]
    : [];

  return (
    <>
      <HeaderFrame>
        {user && (
          <>
            <DesktopNav items={items} />
            <UserMenu
              name={displayName(user)}
              roleLabel={ROLE_LABELS[user.role]}
              isMentee={user.role === "mentee"}
            />
          </>
        )}
        <ThemeSwitcher />
      </HeaderFrame>
      {user && <MobileTabBar items={items} />}
    </>
  );
}
