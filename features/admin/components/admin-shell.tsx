"use client";

import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/nextjs-router/app";
import { dataProvider } from "@refinedev/supabase";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/mentors", label: "멘토 개설" },
  { href: "/admin/colleges", label: "구역·학과" },
  { href: "/admin/job-fields", label: "직무 분야" },
  { href: "/admin/users", label: "사용자" },
];

// 관리자 화면 (docs/architecture.md 9장). refine이 브라우저 Supabase 클라이언트로 읽고 쓰며,
// 권한은 로그인한 관리자의 세션으로 RLS가 판단합니다.
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [provider] = useState(() => dataProvider(createClient()));
  const pathname = usePathname();

  return (
    <Refine
      dataProvider={provider}
      routerProvider={routerProvider}
      options={{ disableTelemetry: true, mutationMode: "pessimistic" }}
    >
      <div className="flex flex-col gap-6 py-6">
        <nav className="flex gap-1 overflow-x-auto border-b text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "-mb-px whitespace-nowrap border-b-2 px-3 py-2",
                pathname.startsWith(item.href)
                  ? "border-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </Refine>
  );
}
