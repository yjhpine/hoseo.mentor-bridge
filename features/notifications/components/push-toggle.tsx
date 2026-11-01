"use client";

import { Bell, BellOff, Share } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getPushPublicKey } from "@/features/notifications/api/actions";
import { currentSubscription, pushSupport, subscribePush, unsubscribePush } from "@/lib/push/client";
import { createClient } from "@/lib/supabase/client";

type State = "loading" | "unsupported" | "ios-needs-install" | "denied" | "off" | "on";

// 새 메시지 알림 켜기·끄기 (docs/architecture.md 6.9). 켠 브라우저에만 알림이 갑니다.
export function PushToggle({ role }: { role: "mentor" | "mentee" }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);
  // 버튼을 누른 순간 곧바로 권한 요청·구독을 해야 해서(사파리·파이어폭스) 공개 키는 미리 받아 둡니다.
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const support = pushSupport();
      if (support !== "supported") return setStateSafe(support);
      if (Notification.permission === "denied") return setStateSafe("denied");
      getPushPublicKey().then((key) => {
        if (!cancelled) setPublicKey(key);
      }, () => undefined);
      const subscription = await currentSubscription().catch(() => null);
      if (!subscription) return setStateSafe("off");
      // 이 브라우저의 구독이 지금 로그인한 계정 것인지 확인합니다 (다른 계정으로 바꿔 로그인한 경우).
      const { data } = await createClient()
        .from("push_subscriptions")
        .select("id")
        .eq("endpoint", subscription.endpoint)
        .maybeSingle();
      setStateSafe(data ? "on" : "off");
    })();
    function setStateSafe(next: State) {
      if (!cancelled) setState(next);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  async function turnOn() {
    setError(null);
    if (!publicKey) {
      setError({ message: "알림 준비가 아직 끝나지 않았습니다. 잠시 후 다시 눌러 주세요." });
      getPushPublicKey().then(setPublicKey, () => undefined);
      return;
    }
    setBusy(true);
    try {
      const result = await subscribePush(publicKey);
      if (result.ok) setState("on");
      else if (result.reason === "denied") setState("denied");
      else if (result.reason === "default")
        setError({ message: "알림 허용 창이 닫혔습니다. 다시 누르고 \"허용\"을 골라 주세요." });
      else if (result.reason === "subscribe-failed")
        setError({
          message:
            "이 브라우저에서 알림 등록에 실패했습니다. 카카오톡 등 앱 안의 브라우저라면 크롬·사파리로 열어 주세요. 브레이브 브라우저는 설정에서 \"푸시 메시지에 Google 서비스 사용\"을 켜야 합니다.",
          detail: result.detail,
        });
      else setError({ message: "알림 정보를 저장하지 못했습니다. 다시 로그인한 뒤 시도해 주세요.", detail: result.detail });
    } catch (e) {
      setError({ message: "알림을 켜지 못했습니다. 잠시 후 다시 시도해 주세요.", detail: String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    await unsubscribePush();
    setBusy(false);
    setState("off");
  }

  const what = role === "mentor" ? "멘티의 새 질문" : "멘토의 답변";

  return (
    <section aria-labelledby="push-title" className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-brand">
          {state === "on" ? <Bell className="size-5" /> : <BellOff className="size-5" />}
        </span>
        <div className="flex flex-1 flex-col gap-1">
          <h2 id="push-title" className="font-semibold">
            새 메시지 알림 {state === "on" && <span className="text-sm font-medium text-brand">켜짐</span>}
          </h2>
          <p className="text-sm text-muted-foreground">
            {what}이 오면 이 기기로 알림을 보냅니다. 알림에는 보낸 사람 이름과 메시지 앞부분이 보입니다.
          </p>
        </div>
      </div>

      {state === "loading" && <p className="text-sm text-muted-foreground">확인하는 중…</p>}
      {state === "unsupported" && (
        <p className="text-sm text-muted-foreground">이 브라우저는 알림을 지원하지 않습니다. 크롬, 엣지, 사파리 최신 버전에서 열어 주세요.</p>
      )}
      {state === "ios-needs-install" && (
        <p className="text-sm leading-relaxed">
          아이폰에서는 사파리 아래의 공유 버튼(<Share className="inline size-4 align-text-bottom" aria-hidden />) →{" "}
          <strong>홈 화면에 추가</strong>로 앱처럼 설치한 뒤, 홈 화면 아이콘으로 열어서 알림을 켤 수 있습니다.
        </p>
      )}
      {state === "denied" && (
        <p className="text-sm">
          이 사이트의 알림이 차단되어 있습니다. 브라우저 주소창 왼쪽의 사이트 설정(또는 휴대폰 설정 → 알림)에서 허용으로 바꾼 뒤
          이 페이지를 새로 고쳐 주세요.
        </p>
      )}
      {state === "off" && (
        <div className="flex flex-col gap-2">
          <Button onClick={turnOn} disabled={busy || !publicKey} className="w-full sm:w-fit">
            <Bell aria-hidden />
            {busy ? "켜는 중…" : publicKey ? "알림 받기" : "준비하는 중…"}
          </Button>
          <p className="text-xs text-muted-foreground">
            켜면 알림을 보내는 데 필요한 이 브라우저의 수신 정보가 저장됩니다. 끄거나 로그아웃하면 지웁니다.
          </p>
        </div>
      )}
      {state === "on" && (
        <Button variant="outline" onClick={turnOff} disabled={busy} className="w-full sm:w-fit">
          <BellOff aria-hidden />
          {busy ? "끄는 중…" : "알림 끄기"}
        </Button>
      )}
      {error && (
        <div role="alert" className="flex flex-col gap-1 text-sm text-red-600 dark:text-red-400">
          <p>{error.message}</p>
          {error.detail && <p className="break-all text-xs text-muted-foreground">원인: {error.detail}</p>}
        </div>
      )}
    </section>
  );
}
