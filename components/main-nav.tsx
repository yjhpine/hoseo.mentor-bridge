"use client";

import { Home, LayoutDashboard, MessageCircle, Search, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// 주 메뉴 (docs/architecture.md 9장). UI/UX Pro Max의 내비게이션 규칙을 따릅니다.
// - PC: 상단 메뉴에 지금 있는 곳을 색과 밑줄로 표시 (nav-state-active)
// - 휴대폰: 화면 아래 탭 막대, 아이콘과 이름을 함께, 4개 이하 (bottom-nav-limit, nav-label-icon)
// 아이콘 컴포넌트는 서버에서 넘길 수 없어 이름(icon)으로 받습니다.

const ICONS: Record<NavIcon, LucideIcon> = {
  home: Home,
  search: Search,
  chat: MessageCircle,
  me: UserRound,
  admin: LayoutDashboard,
};

export type NavIcon = "home" | "search" | "chat" | "me" | "admin";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  /** 이 경로들로 시작하는 화면에서도 이 메뉴를 선택된 것으로 봅니다 */
  match?: string[];
  /** 안 읽은 메시지 수 */
  badge?: number;
};

export function isActive(pathname: string, item: Pick<NavItem, "href" | "match">) {
  if (item.href === "/") return pathname === "/";
  return [item.href, ...(item.match ?? [])].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function badgeLabel(count: number) {
  return count > 99 ? "99+" : String(count);
}

/** PC 상단 메뉴 (sm 이상) */
export function DesktopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="주 메뉴" className="hidden items-center gap-1 sm:flex">
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-10 items-center gap-1.5 rounded-md px-3 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
              active ? "font-semibold text-brand" : "text-muted-foreground",
            )}
          >
            {item.label}
            {!!item.badge && (
              <span className="rounded-full bg-primary px-1.5 text-xs font-semibold leading-5 text-primary-foreground">
                {badgeLabel(item.badge)}
                <span className="sr-only">개 안 읽음</span>
              </span>
            )}
            {active && <span aria-hidden className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-primary" />}
          </Link>
        );
      })}
    </nav>
  );
}

/** 휴대폰 아래쪽 탭 막대 (sm 미만). 본문은 layout에서 아래 여백을 둡니다. */
export function MobileTabBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="아래 탭 메뉴"
      data-tab-bar
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = ICONS[item.icon];
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs transition-colors active:bg-accent",
                  active ? "font-semibold text-brand" : "text-muted-foreground",
                )}
              >
                <span className="relative">
                  <Icon className="size-6" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                  {!!item.badge && (
                    <span className="absolute -right-2.5 -top-1.5 min-w-5 rounded-full bg-primary px-1 text-center text-[11px] font-semibold leading-5 text-primary-foreground">
                      {badgeLabel(item.badge)}
                    </span>
                  )}
                </span>
                <span>
                  {item.label}
                  {!!item.badge && <span className="sr-only">, 안 읽은 메시지 {item.badge}개</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
