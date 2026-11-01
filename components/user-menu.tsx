"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/features/auth/api/actions";
import { unsubscribePush } from "@/lib/push/client";

/** 상단 메뉴 오른쪽의 내 계정 메뉴: 이름·역할, PIN 변경, 로그아웃 */
export function UserMenu({
  name,
  roleLabel,
  isMentee,
}: {
  name: string;
  roleLabel: string;
  isMentee: boolean;
}) {
  const [pending, startTransition] = useTransition();
  // 로그아웃하면 이 브라우저의 알림 구독도 지웁니다. 공용 PC에서 다음 사람에게 내 알림이 가지 않게 합니다 (6.9).
  const signOut = () =>
    startTransition(async () => {
      await unsubscribePush().catch(() => undefined);
      await logout();
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-1 px-2" aria-label={`${name} 계정 메뉴`}>
          <span className="max-w-24 truncate">{name}</span>
          <ChevronDown className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="flex items-center gap-2 font-normal">
          <span className="truncate">{name}</span>
          <Badge variant="secondary">{roleLabel}</Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isMentee && (
          <DropdownMenuItem asChild>
            <Link href="/mypage">마이페이지 (내 강의)</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/account/pin">PIN 변경</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={pending}
          onSelect={(event) => {
            event.preventDefault();
            signOut();
          }}
        >
          {pending ? "로그아웃하는 중…" : "로그아웃"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
