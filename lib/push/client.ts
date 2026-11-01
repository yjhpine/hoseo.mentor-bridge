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

/** 알림 권한을 묻고 구독해 서버에 저장합니다. */
export async function subscribePush(publicKey: string) {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false as const, reason: permission };

  const registration = await registerServiceWorker();
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8Array(publicKey) }));

  const json = subscription.toJSON();
  const { error } = await createClient().rpc("save_push_subscription", {
    endpoint: subscription.endpoint,
    p256dh: json.keys?.p256dh ?? "",
    auth: json.keys?.auth ?? "",
    user_agent: navigator.userAgent,
  });
  if (error) return { ok: false as const, reason: "save-failed" };
  return { ok: true as const };
}

/** 이 브라우저의 구독을 끊고 서버에서도 지웁니다. 로그아웃할 때도 부릅니다 (공용 PC에서 다른 사람 알림이 뜨지 않게). */
export async function unsubscribePush() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const subscription = await currentSubscription().catch(() => null);
  if (!subscription) return;
  await createClient().rpc("delete_push_subscription", { endpoint: subscription.endpoint }).then(() => undefined, () => undefined);
  await subscription.unsubscribe().catch(() => false);
}
