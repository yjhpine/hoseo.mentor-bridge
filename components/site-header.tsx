import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { MobileTabBar, type NavItem } from "@/components/main-nav";
import { MobileSiteMenu, SiteNav, type CollegeLink, type SiteLink } from "@/components/site-nav";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { getUnreadTotal } from "@/features/chats/api/chats";
import { ROLE_LABELS, displayName, getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

// 상단: 얇은 빨간 띠(학교 이름, 회원가입·이용 안내) + 흰 메뉴 줄(로고, 주 메뉴, 오른쪽 위 로그인 버튼).
// 호서대학교 홈페이지처럼 상징색 빨강을 맨 위 띠와 선택 표시에 씁니다 (11장 22번, 32번).

function TopBar({ loggedIn }: { loggedIn: boolean }) {
  const linkClass = "flex h-9 items-center px-2 underline-offset-4 hover:underline";
  return (
    <div className="bg-primary text-primary-foreground">
      <div className="mx-auto flex h-9 w-full max-w-6xl items-center justify-between gap-3 px-4 text-xs sm:px-5 sm:text-sm">
        <span className="truncate font-medium">Venture 1st 호서대학교 · 현직 멘토 1:1 멘토링</span>
        <div className="flex shrink-0 items-center">
          <Link href="/guide" className={linkClass}>
            이용 안내
          </Link>
          {!loggedIn && (
            <>
              <span aria-hidden className="opacity-60">|</span>
              <Link href="/auth/sign-up" className={linkClass}>
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function HeaderFrame({ children, nav }: { children?: React.ReactNode; nav?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 whitespace-nowrap px-4 sm:px-5">
        <BrandMark />
        {/* 학교 홈페이지처럼 로고와 오른쪽 버튼 사이에 메뉴를 같은 간격으로 펼칩니다 (PC). */}
        <div className="hidden min-w-0 flex-1 px-4 lg:block xl:px-8">{nav}</div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">{children}</div>
      </div>
    </header>
  );
}

/** 세션을 읽기 전 먼저 보이는 껍데기 */
export function SiteHeaderFallback() {
  return (
    <>
      <TopBar loggedIn={false} />
      <HeaderFrame />
    </>
  );
}

async function getCollegeLinks(): Promise<CollegeLink[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("colleges")
    .select("id, name")
    .eq("is_active", true)
    .order("position")
    .order("name");
  return data ?? [];
}

export async function SiteHeader() {
  const [user, colleges] = await Promise.all([getCurrentUser(), getCollegeLinks()]);
  const unread = user && user.role !== "admin" ? await getUnreadTotal() : 0;

  const before: SiteLink[] = [{ href: "/about", label: "서비스 소개" }];
  const after: SiteLink[] = [
    { href: "/mentors", label: "멘토 찾기" },
    { href: "/courses", label: "강의" },
    { href: "/guide", label: "이용 안내" },
  ];
  if (user?.role === "mentee" || user?.role === "mentor") {
    after.push({ href: "/chats", label: "톡방", badge: unread });
  }
  if (user?.role === "mentor") after.push({ href: "/mentor", label: "내 멘토 페이지" });
  if (user?.role === "mentee") after.push({ href: "/mypage", label: "마이페이지" });
  if (user?.role === "admin") after.push({ href: "/admin", label: "관리자" });

  // 휴대폰에서 로그인한 사용자는 아래 탭 막대도 씁니다 (자주 쓰는 4개).
  const tabs: NavItem[] = user
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
      <TopBar loggedIn={Boolean(user)} />
      <HeaderFrame nav={<SiteNav before={before} after={after} colleges={colleges} />}>
        {/* 휴대폰은 폭이 좁아 밝기 설정을 ☰ 메뉴 안에 둡니다. */}
        <span className="hidden sm:inline-flex">
          <ThemeSwitcher />
        </span>
        {user ? (
          <UserMenu
            name={displayName(user)}
            roleLabel={ROLE_LABELS[user.role]}
            isMentee={user.role === "mentee"}
          />
        ) : (
          <Button asChild>
            <Link href="/auth/login">로그인</Link>
          </Button>
        )}
        <MobileSiteMenu before={before} after={after} colleges={colleges} />
      </HeaderFrame>
      {user && <MobileTabBar items={tabs} />}
    </>
  );
}
