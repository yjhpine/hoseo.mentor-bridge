"use client";

import { Download, EllipsisVertical, Share, Smartphone, SquarePlus } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { IosInstallGuide, iosGuideTarget, type IosTarget } from "@/features/notifications/components/ios-install-guide";
import { installState, listenForInstallPrompt, promptInstall, subscribeInstall, type InstallState } from "@/lib/pwa/install";

/** 레이아웃에 붙여 설치 이벤트를 페이지가 열릴 때부터 받아 둡니다. 화면에는 아무것도 그리지 않습니다. */
export function InstallPromptListener() {
  useEffect(() => listenForInstallPrompt(), []);
  return null;
}

// 앱으로 설치 (홈 화면에 추가). 마이페이지·멘토 페이지에 둡니다.
// 아이폰은 홈 화면에 추가해야 알림을 받을 수 있어서 특히 필요합니다. 이미 앱으로 열었으면 보이지 않습니다.
export function InstallApp() {
  const state = useSyncExternalStore<InstallState | null>(subscribeInstall, installState, () => null);
  const [message, setMessage] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [guide, setGuide] = useState<IosTarget | null>(null);

  if (state === null || state === "installed") return null;

  async function install() {
    const result = await promptInstall();
    if (result === "accepted") setMessage("설치했습니다. 홈 화면의 '호서 멘토링' 아이콘으로 열 수 있습니다.");
    else if (result === "dismissed") setMessage("설치를 취소했습니다. 언제든 다시 누를 수 있습니다.");
    else setShowSteps(true);
  }

  return (
    <section aria-labelledby="install-title" className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-brand">
          <Smartphone className="size-5" />
        </span>
        <div className="flex flex-1 flex-col gap-1">
          <h2 id="install-title" className="font-semibold">앱으로 설치</h2>
          <p className="text-sm text-muted-foreground">
            홈 화면에 &apos;호서 멘토링&apos; 아이콘을 만들어 앱처럼 바로 엽니다.
            {state === "ios" && " 아이폰은 설치해야 새 메시지 알림을 받을 수 있습니다."}
          </p>
        </div>
      </div>

      {state === "prompt" && !showSteps && (
        <Button onClick={install} className="w-full sm:w-fit">
          <Download aria-hidden />
          앱으로 설치
        </Button>
      )}

      {state === "ios" && (
        <Button
          onClick={() =>
            setGuide(
              iosGuideTarget(
                navigator.userAgent,
                /iPad/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
              ),
            )
          }
          className="w-full sm:w-fit"
        >
          <Download aria-hidden />
          앱으로 설치
        </Button>
      )}
      {guide && <IosInstallGuide target={guide} onClose={() => setGuide(null)} />}

      {state === "ios" && (
        <ol className="flex flex-col gap-2 text-sm">
          {[
            <>
              사파리 아래쪽(아이패드는 위쪽)의 공유 버튼{" "}
              <Share className="inline size-4 align-text-bottom text-brand" aria-label="공유" /> 누르기
            </>,
            <>
              목록을 내려 <strong>홈 화면에 추가</strong>{" "}
              <SquarePlus className="inline size-4 align-text-bottom text-brand" aria-hidden /> 누르기
            </>,
            <>
              오른쪽 위 <strong>추가</strong>를 누르고, 홈 화면의 &apos;호서 멘토링&apos; 아이콘으로 열기
            </>,
          ].map((step, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span>
              <span className="pt-0.5 leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      )}

      {(state === "manual" || showSteps) && (
        <p className="text-sm leading-relaxed">
          브라우저 메뉴(<EllipsisVertical className="inline size-4 align-text-bottom" aria-label="더보기" />)에서{" "}
          <strong>홈 화면에 추가</strong> 또는 <strong>앱 설치</strong>를 누르세요. PC는 주소창 오른쪽의 설치 아이콘을 누르면 됩니다.
          카카오톡 등 앱 안의 브라우저라면 크롬·사파리로 열어 주세요.
        </p>
      )}

      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    </section>
  );
}
