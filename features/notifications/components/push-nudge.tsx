"use client";

import { Bell, Share, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePush } from "@/features/notifications/components/use-push";

// 톡방에서 질문·답변을 보낸 직후 알림을 켜라고 권합니다 (docs/architecture.md 6.9, 11장 23번).
// 알림이 꺼져 있을 때만 보이고, "괜찮아요"를 누르면 이 브라우저에서는 2주 동안 다시 묻지 않습니다.
// 알림 허용 창은 사용자가 버튼을 직접 눌러야 뜨므로(브라우저 규칙) 자동으로 켜지는 않습니다.

const DISMISS_KEY = "push-nudge-dismissed-until";
const DISMISS_DAYS = 14;

function dismissedNow(): boolean {
  try {
    return Number(localStorage.getItem(DISMISS_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

export function PushNudge({ role }: { role: "mentor" | "mentee" }) {
  const { state, busy, error, publicKey, turnOn } = usePush();
  const [dismissed, setDismissed] = useState(dismissedNow);
  const [justTurnedOn, setJustTurnedOn] = useState(false);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000));
    } catch {
      // 저장소를 못 쓰는 브라우저(사생활 보호 모드 등)는 이번만 닫습니다.
    }
    setDismissed(true);
  }

  if (justTurnedOn && state === "on") {
    return (
      <p role="status" className="flex items-center gap-2 rounded-md border p-3 text-sm text-green-700 dark:text-green-400">
        <Bell className="size-4" aria-hidden />
        알림을 켰습니다. {role === "mentee" ? "답변이 오면" : "새 질문이 오면"} 이 기기로 알려 드립니다.
      </p>
    );
  }
  if (dismissed || (state !== "off" && state !== "ios-needs-install")) return null;

  const question = role === "mentee" ? "답변이 오면 알려 드릴까요?" : "새 질문이 오면 알려 드릴까요?";

  return (
    <section aria-label="알림 켜기 권유" className="relative flex flex-col gap-2 rounded-md border bg-accent p-3 pr-10">
      <button
        type="button"
        onClick={dismiss}
        aria-label="닫기"
        className="absolute right-2 top-2 grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-accent"
      >
        <X className="size-4" aria-hidden />
      </button>
      <p className="flex items-center gap-2 text-sm font-medium">
        <Bell className="size-4 text-brand" aria-hidden />
        {question}
      </p>
      {state === "ios-needs-install" ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          아이폰은 사파리 아래의 공유 버튼(<Share className="inline size-4 align-text-bottom" aria-hidden />) →{" "}
          <strong className="text-foreground">홈 화면에 추가</strong>로 설치한 뒤, 홈 화면 아이콘으로 열면 알림을 켤 수 있습니다.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy || !publicKey}
            onClick={async () => {
              await turnOn();
              setJustTurnedOn(true);
            }}
          >
            {busy ? "켜는 중…" : "알림 켜기"}
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss}>
            괜찮아요
          </Button>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error.message}</p>}
    </section>
  );
}
