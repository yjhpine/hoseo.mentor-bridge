"use client";

// 앱으로 설치 (홈 화면에 추가). docs/architecture.md 6.9
// 안드로이드·PC의 크롬·엣지·삼성 인터넷은 beforeinstallprompt 이벤트를 주고, 그 이벤트로 설치 창을 띄울 수 있습니다.
// 이벤트는 페이지가 열리자마자 한 번 오므로, 레이아웃에 붙인 InstallPromptListener가 미리 받아 둡니다.
// 아이폰은 이 이벤트가 없어 사파리 공유 버튼 → "홈 화면에 추가"를 안내합니다.

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

let listening = false;
/** 한 번만 붙입니다. 레이아웃의 InstallPromptListener가 부릅니다. */
export function listenForInstallPrompt() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // 브라우저 자체 안내 대신 우리 버튼으로 띄웁니다.
    deferred = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    notify();
  });
}

export function subscribeInstall(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type InstallState = "installed" | "prompt" | "ios" | "manual";

export function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** 지금 이 브라우저에서 앱 설치를 어떻게 안내할지 */
export function installState(): InstallState {
  if (installed || isStandalone()) return "installed";
  if (deferred) return "prompt";
  if (isIos()) return "ios";
  return "manual";
}

/** 브라우저의 설치 창을 띄웁니다. 버튼을 누른 그때 불러야 합니다. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = deferred;
  if (!event) return "unavailable";
  deferred = null; // 이벤트는 한 번만 쓸 수 있습니다.
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === "accepted") installed = true;
  notify();
  return outcome;
}
