"use client";

import { ArrowDown, ArrowUp, Ellipsis, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

// 아이폰·아이패드 "홈 화면에 추가" 화살표 안내 (docs/architecture.md 6.9)
// 애플은 사이트가 홈 화면 추가를 대신 실행하는 기능을 열어 주지 않아서, 눌러야 할 브라우저 버튼을 화살표로 가리킵니다.
// 브라우저 버튼 위치는 기기·버전마다 달라서 사용자 에이전트로 짐작합니다.

export type IosTarget = "bottom-center" | "bottom-right" | "top-right";

export function iosGuideTarget(userAgent: string, isIpad: boolean): IosTarget {
  if (isIpad) return "top-right"; // 아이패드 사파리: 주소창 오른쪽 공유 버튼
  if (/CriOS|FxiOS|EdgiOS/.test(userAgent)) return "top-right"; // 크롬·파이어폭스·엣지: 주소창 오른쪽
  const version = Number(/Version\/(\d+)/.exec(userAgent)?.[1] ?? 0);
  return version >= 26 ? "bottom-right" : "bottom-center"; // 사파리 26부터 공유가 ⋯ 메뉴 안으로 들어감
}

const POSITION: Record<IosTarget, string> = {
  "bottom-center": "bottom-[max(0.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 items-center",
  "bottom-right": "bottom-[max(0.5rem,env(safe-area-inset-bottom))] right-4 items-end",
  "top-right": "top-[max(0.5rem,env(safe-area-inset-top))] right-4 items-end",
};

export function IosInstallGuide({ target, onClose }: { target: IosTarget; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const atTop = target === "top-right";
  const first =
    target === "bottom-right" ? (
      <>
        오른쪽 아래 <Ellipsis className="inline size-4 align-text-bottom" aria-label="더보기" /> 버튼을 누른 뒤{" "}
        <strong>공유</strong> <Share className="inline size-4 align-text-bottom" aria-hidden />
      </>
    ) : (
      <>
        {atTop ? "오른쪽 위" : "아래쪽 가운데"}의 공유 버튼{" "}
        <Share className="inline size-4 align-text-bottom" aria-label="공유" />
      </>
    );

  const arrow = (
    <span className="flex flex-col items-center text-white motion-safe:animate-bounce">
      {atTop ? <ArrowUp className="size-12" strokeWidth={2.5} aria-hidden /> : <ArrowDown className="size-12" strokeWidth={2.5} aria-hidden />}
    </span>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70" role="dialog" aria-modal="true" aria-labelledby="ios-guide-title" onClick={onClose}>
      <div
        className="absolute inset-x-4 top-1/2 mx-auto flex max-w-sm -translate-y-1/2 flex-col gap-3 rounded-xl bg-background p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 id="ios-guide-title" className="text-lg font-semibold">홈 화면에 추가하기</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="닫기" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <ol className="flex flex-col gap-2 text-sm">
          {[
            <>화살표가 가리키는 {first} 누르기</>,
            <>
              목록을 내려 <strong>홈 화면에 추가</strong> <SquarePlus className="inline size-4 align-text-bottom text-brand" aria-hidden /> 누르기
            </>,
            <>
              오른쪽 위 <strong>추가</strong>를 누르면 끝. 홈 화면의 &apos;호서 멘토링&apos; 아이콘으로 열어 주세요
            </>,
          ].map((step, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{index + 1}</span>
              <span className="pt-0.5 leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
        <Button variant="outline" onClick={onClose}>알겠어요</Button>
      </div>

      <div className={`pointer-events-none absolute flex flex-col gap-1 ${POSITION[target]}`}>
        {atTop && arrow}
        <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-black shadow">
          {target === "bottom-right" ? "여기 ⋯ → 공유" : "여기 공유 버튼"}
        </span>
        {!atTop && arrow}
      </div>
    </div>
  );
}
