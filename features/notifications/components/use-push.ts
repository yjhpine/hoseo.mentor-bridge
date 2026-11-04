"use client";

import { useEffect, useState } from "react";
import { getPushPublicKey } from "@/features/notifications/api/actions";
import { currentSubscription, pushSupport, subscribePush, unsubscribePush } from "@/lib/push/client";
import { createClient } from "@/lib/supabase/client";

export type PushState = "loading" | "unsupported" | "ios-needs-install" | "denied" | "off" | "on";

// 이 브라우저의 새 메시지 알림 상태와 켜기·끄기 (docs/architecture.md 6.9).
// 알림 켜기 버튼(PushToggle)과 톡방의 알림 권유(PushNudge)가 함께 씁니다.
export function usePush() {
  const [state, setState] = useState<PushState>("loading");
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
    function setStateSafe(next: PushState) {
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


  return { state, busy, error, publicKey, turnOn, turnOff };
}
