"use client";

import { createClient } from "@/lib/supabase/client";

// 브라우저의 웹 푸시 구독 (docs/architecture.md 6.9).

export type PushSupport = "supported" | "unsupported" | "ios-needs-install";

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) return "supported";
  // 아이폰·아이패드는 홈 화면에 추가한 웹 앱(iOS 16.4 이상)에서만 웹 푸시가 됩니다.
  if (ios && !standalone) return "ios-needs-install";
  return "unsupported";
}

function toUint8Array(base64url: string) {
  const b64 = base64url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((base64url.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function registerServiceWorker() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return registration ? registration.pushManager.getSubscription() : null;
}

export type SubscribeResult =
  | { ok: true }
  | { ok: false; reason: "denied" | "default" | "subscribe-failed" | "save-failed"; detail?: string };

function describe(error: unknown) {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/**
 * 알림 권한을 묻고 구독해 서버에 저장합니다.
 * 사파리·파이어폭스는 권한 요청과 구독을 버튼을 누른 바로 그때만 허용하므로, 이 함수는 버튼 클릭에서 곧바로 부르고
 * 그 전에 서버를 다녀오면 안 됩니다. 공개 키는 화면이 열릴 때 미리 받아 둡니다.
 */
export async function subscribePush(publicKey: string): Promise<SubscribeResult> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: permission };

  let subscription: PushSubscription;
  try {
    const registration = await registerServiceWorker();
    await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    subscription =
      existing ??
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8Array(publicKey) }));
  } catch (error) {
    console.error("push subscribe failed", error);
    return { ok: false, reason: "subscribe-failed", detail: describe(error) };
  }

  const json = subscription.toJSON();
  const { error } = await createClient().rpc("save_push_subscription", {
    endpoint: subscription.endpoint,
    p256dh: json.keys?.p256dh ?? "",
    auth: json.keys?.auth ?? "",
    user_agent: navigator.userAgent,
  });
  if (error) {
    console.error("push save failed", error);
    return { ok: false, reason: "save-failed", detail: error.message };
  }
  return { ok: true };
}

/** 이 브라우저의 구독을 끊고 서버에서도 지웁니다. 로그아웃할 때도 부릅니다 (공용 PC에서 다른 사람 알림이 뜨지 않게). */
export async function unsubscribePush() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const subscription = await currentSubscription().catch(() => null);
  if (!subscription) return;
  await createClient().rpc("delete_push_subscription", { endpoint: subscription.endpoint }).then(() => undefined, () => undefined);
  await subscription.unsubscribe().catch(() => false);
}
