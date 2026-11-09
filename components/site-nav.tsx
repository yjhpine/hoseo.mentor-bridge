"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isActive } from "@/components/main-nav";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 상단 메뉴 (docs/architecture.md 9장, 11장 32번).
// 서비스 소개 · 단과대학(구역 목록) · 멘토 찾기 · 강의 · 이용 안내, 로그인하면 톡방·마이페이지 등을 더합니다.
// PC(lg 이상)는 가로 메뉴, 그보다 좁으면 ☰ 버튼으로 여는 패널입니다.

export type SiteLink = { href: string; label: string; match?: string[]; badge?: number };
export type CollegeLink = { id: number; name: string };

function badgeLabel(count: number) {
  return count > 99 ? "99+" : String(count);
}

function Badge({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span className="rounded-full bg-primary px-1.5 text-xs font-semibold leading-5 text-primary-foreground">
      {badgeLabel(count)}
      <span className="sr-only">개 안 읽음</span>
    </span>
  );
}

const itemClass = (active: boolean) =>
  cn(
    "relative flex h-16 items-center gap-1 px-3 text-[15px] font-medium transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
    active ? "text-brand" : "text-foreground",
  );

function ActiveBar() {
  return <span aria-hidden className="absolute inset-x-3 bottom-0 h-[3px] bg-primary" />;
}

export function SiteNav({
  before,
  after,
  colleges,
}: {
  /** 단과대학 메뉴 앞 */
  before: SiteLink[];
  /** 단과대학 메뉴 뒤 */
  after: SiteLink[];
  colleges: CollegeLink[];
}) {
  const pathname = usePathname();
  const collegeActive = pathname.startsWith("/colleges/");

  const renderLink = (item: SiteLink) => {
    const active = isActive(pathname, item);
    return (
      <li key={item.href}>
        <Link href={item.href} aria-current={active ? "page" : undefined} className={itemClass(active)}>
          {item.label}
          <Badge count={item.badge} />
          {active && <ActiveBar />}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label="주 메뉴" className="hidden lg:block">
      <ul className="flex items-center">
        {before.map(renderLink)}
        {colleges.length > 0 && (
          <li>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger className={itemClass(collegeActive)}>
                단과대학
                <ChevronDown className="size-4" aria-hidden />
                {collegeActive && <ActiveBar />}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {colleges.map((college) => (
                  <DropdownMenuItem key={college.id} asChild>
                    <Link href={`/colleges/${college.id}`} className="h-10">
                      {college.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/mentors" className="h-10 font-medium">
                    전체 멘토 보기
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        )}
        {after.map(renderLink)}
      </ul>
    </nav>
  );
}

/** 휴대폰·태블릿: ☰ 버튼으로 여는 메뉴 패널 */
export function MobileSiteMenu({
  before,
  after,
  colleges,
}: {
  before: SiteLink[];
  after: SiteLink[];
  colleges: CollegeLink[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // 다른 화면으로 가면 닫습니다.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const linkClass = (active: boolean) =>
    cn(
      "flex h-12 items-center gap-2 rounded-md px-3 text-base transition-colors hover:bg-accent",
      active ? "font-semibold text-brand" : "text-foreground",
    );

  const renderLink = (item: SiteLink) => {
    const active = isActive(pathname, item);
    return (
      <li key={item.href}>
        <Link href={item.href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
          {item.label}
          <Badge count={item.badge} />
        </Link>
      </li>
    );
  };

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-expanded={open}
        aria-controls="mobile-site-menu"
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
      </Button>
      {open && (
        <nav
          id="mobile-site-menu"
          aria-label="주 메뉴"
          className="absolute inset-x-0 top-full max-h-[calc(100svh-4rem)] overflow-y-auto border-b bg-background shadow-lg"
        >
          <ul className="mx-auto flex max-w-6xl flex-col gap-0.5 px-4 py-3">
            {before.map(renderLink)}
            {colleges.length > 0 && (
              <li className="py-1">
                <p className="px-3 pb-1 pt-2 text-xs font-semibold text-muted-foreground">단과대학</p>
                <ul className="grid grid-cols-2 gap-0.5">
                  {colleges.map((college) => {
                    const href = `/colleges/${college.id}`;
                    const active = pathname === href;
                    return (
                      <li key={college.id}>
                        <Link href={href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
                          {college.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            )}
            {after.map(renderLink)}
            <li className="flex h-12 items-center justify-between px-3 sm:hidden">
              <span className="text-base">화면 밝기</span>
              <ThemeSwitcher />
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
