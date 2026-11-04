"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePush } from "@/features/notifications/components/use-push";

// 로그인 뒤 홈에서 한 번만 띄우는 알림 안내 (docs/architecture.md 6.9).
// 이 브라우저의 알림이 꺼져 있을 때만 보이고, 닫거나 이동하면 이 브라우저에서는 다시 띄우지 않습니다.
// 알림 켜기는 멘티는 마이페이지, 멘토는 내 멘토 페이지에 있습니다.

const SEEN_KEY = "push-intro-seen";

function seenBefore(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true; // 저장소를 못 쓰면 매번 뜨지 않게 아예 띄우지 않습니다.
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // 무시
  }
}

export function PushIntro({ role }: { role: "mentor" | "mentee" }) {
  const { state } = usePush();
  const [open, setOpen] = useState(false);
  const laterRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if ((state === "off" || state === "ios-needs-install") && !seenBefore()) {
      markSeen();
      setOpen(true);
    }
  }, [state]);

  useEffect(() => {
    if (!open) return;
    laterRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const page = role === "mentee" ? { href: "/mypage#notifications", label: "마이페이지" } : { href: "/mentor#notifications", label: "내 멘토 페이지" };
  const what = role === "mentee" ? "멘토의 답변" : "멘티의 새 질문";

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 p-4 sm:place-items-center" onClick={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="push-intro-title"
        className="w-full max-w-sm rounded-xl border bg-background p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <span aria-hidden className="mb-3 grid size-11 place-items-center rounded-full bg-accent text-brand">
          <Bell className="size-5" />
        </span>
        <h2 id="push-intro-title" className="text-lg font-semibold">새 메시지 알림을 받아 보세요</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {what}이 오면 휴대폰이나 PC로 바로 알려 드립니다. <strong className="text-foreground">{page.label}</strong>에서
          켤 수 있고, 아이폰은 앱으로 설치하는 방법도 거기서 안내합니다.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <Button asChild className="w-full sm:w-auto">
            <Link href={page.href} onClick={() => setOpen(false)}>
              {page.label}에서 켜기
            </Link>
          </Button>
          <Button ref={laterRef} variant="ghost" className="w-full sm:w-auto" onClick={() => setOpen(false)}>
            나중에
          </Button>
        </div>
      </div>
    </div>
  );
}
