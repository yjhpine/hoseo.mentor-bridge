"use client";

import { useEffect, useRef, useState } from "react";

// Cloudflare Turnstile 위젯 (docs/architecture.md 6.1 무작위 대입 대책).
// 받은 토큰은 숨은 입력칸 captchaToken에 담겨 서버 액션으로 가고, 서버 액션이 Supabase Auth에 넘깁니다.
// 토큰은 한 번만 쓸 수 있어서 서버 응답(resetKey)이 바뀔 때마다 위젯을 새로 고칩니다.
// site key가 없으면(아직 설정 전) 아무것도 그리지 않습니다.

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile")));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function Turnstile({
  siteKey,
  resetKey,
  onTokenChange,
}: {
  siteKey: string | undefined;
  /** 서버 응답이 올 때마다 바뀌는 값. 바뀌면 위젯을 새로 고칩니다. */
  resetKey: unknown;
  onTokenChange: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 숨은 입력칸은 value 속성이 곧 값이라, DOM에 직접 쓰면 React가 다시 그릴 때 지워집니다. 상태로 들고 있습니다.
  const [token, setTokenState] = useState("");
  const widgetIdRef = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);
  const onTokenRef = useRef(onTokenChange);
  useEffect(() => {
    onTokenRef.current = onTokenChange;
  });

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    const setToken = (token: string) => {
      setTokenState(token);
      if (token) setFailed(false);
      onTokenRef.current(token);
    };
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          language: "ko",
          size: "flexible",
          callback: setToken,
          "expired-callback": () => setToken(""),
          "error-callback": () => {
            setToken("");
            setFailed(true);
          },
        });
      })
      .catch(() => {
        setToken("");
        setFailed(true);
      });
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [siteKey]);

  // 서버가 응답했다면 지난 토큰은 이미 쓰였으므로 새 토큰을 받습니다.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setTokenState("");
    onTokenRef.current("");
    if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
  }, [resetKey]);

  if (!siteKey) return null;
  return (
    <div className="grid gap-1">
      <div ref={containerRef} className="min-h-[65px]" />
      <input type="hidden" name="captchaToken" value={token} />
      {failed && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          자동 입력 방지 확인을 불러오지 못했습니다. 인터넷 연결을 확인하고 페이지를 새로 고쳐 주세요.
        </p>
      )}
    </div>
  );
}
