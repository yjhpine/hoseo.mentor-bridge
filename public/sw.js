// 서비스 워커: 새 메시지 웹 푸시를 받아 알림으로 보여 주고, 누르면 그 톡방을 엽니다 (docs/architecture.md 6.9).
// 페이지 캐시는 하지 않습니다 (오프라인 기능 없음).

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "호서대학교 멘토링", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "새 메시지가 도착했습니다", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url: data.url || "/chats" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/chats", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      const same = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (same && "navigate" in same) return same.navigate(url).then((c) => c && c.focus());
      return self.clients.openWindow(url);
    }),
  );
});
