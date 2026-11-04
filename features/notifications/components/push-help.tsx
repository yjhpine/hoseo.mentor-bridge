"use client";

import { useSyncExternalStore } from "react";

// 알림 켜기 칸 아래의 "알림이 오지 않나요?" 확인 목록 (docs/architecture.md 6.9).
// 서버가 보낸 알림이 기기에 도착해도, 운영체제·브라우저 설정 때문에 화면에 안 뜨는 경우가 대부분입니다.
// 지금 쓰는 기기의 항목을 먼저 펼쳐 둡니다.

type Platform = "windows" | "mac" | "android" | "ios" | "other";

function detect(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Windows/.test(ua)) return "windows";
  if (/Macintosh|Mac OS X/.test(ua)) return "mac";
  return "other";
}

const noop = () => () => {};

const SECTIONS: { platform: Platform; title: string; items: React.ReactNode[] }[] = [
  {
    platform: "windows",
    title: "윈도우 PC",
    items: [
      <>설정 → 시스템 → <strong>알림</strong>에서 알림이 켜져 있고, 목록의 <strong>Google Chrome</strong>(또는 Microsoft Edge)과 앱으로 설치했다면 <strong>호서 멘토링</strong>도 켜져 있는지 확인</>,
      <>작업 표시줄 시계를 눌러 <strong>방해 금지·집중 모드</strong>가 꺼져 있는지 확인 (켜져 있으면 화면에 안 뜨고 알림 센터에만 쌓임)</>,
      <>크롬 창을 모두 닫아 두면 알림을 못 받습니다. 크롬 설정 → 시스템 → <strong>&quot;Chrome을 닫았을 때 백그라운드 앱 계속 실행&quot;</strong> 켜기</>,
    ],
  },
  {
    platform: "mac",
    title: "맥",
    items: [
      <>시스템 설정 → <strong>알림</strong>에서 Google Chrome(또는 Safari)과 호서 멘토링의 알림 허용 확인</>,
      <>제어 센터의 <strong>집중 모드</strong>가 꺼져 있는지 확인</>,
    ],
  },
  {
    platform: "android",
    title: "안드로이드",
    items: [
      <>휴대폰 설정 → 애플리케이션 → <strong>Chrome</strong>(또는 설치한 호서 멘토링) → 알림이 켜져 있는지 확인</>,
      <><strong>방해 금지 모드</strong>와 절전 모드에서 크롬의 백그라운드 사용 제한이 없는지 확인</>,
      <>카카오톡 등 앱 안의 브라우저가 아니라 크롬·삼성 인터넷에서 알림을 켰는지 확인</>,
    ],
  },
  {
    platform: "ios",
    title: "아이폰",
    items: [
      <>사파리에서 <strong>홈 화면에 추가</strong>한 호서 멘토링 아이콘으로 열어서 알림을 켰는지 확인 (사파리 탭에서는 알림이 안 됨)</>,
      <>설정 → 알림 → <strong>호서 멘토링</strong>에서 알림 허용 확인, 집중 모드가 꺼져 있는지 확인</>,
    ],
  },
];

export function PushHelp() {
  const platform = useSyncExternalStore<Platform | null>(noop, detect, () => null);
  const ordered = platform ? [...SECTIONS].sort((a, b) => Number(b.platform === platform) - Number(a.platform === platform)) : SECTIONS;

  return (
    <details className="group rounded-md bg-muted px-3 py-2 text-sm">
      <summary className="cursor-pointer font-medium text-muted-foreground group-open:text-foreground">알림이 오지 않나요?</summary>
      <div className="mt-2 flex flex-col gap-3 leading-relaxed">
        <p className="text-muted-foreground">
          알림은 서버에서 정상으로 보내도 기기 설정 때문에 화면에 안 뜨는 경우가 많습니다. 아래를 차례로 확인해 주세요.
        </p>
        <ul className="list-disc pl-5">
          <li>
            이 사이트의 알림이 <strong>허용</strong>인지 확인: 주소창 왼쪽의 사이트 정보 아이콘 → 알림 (크롬은{" "}
            <code className="rounded bg-background px-1 text-xs">chrome://settings/content/notifications</code>)
          </li>
          <li>알림은 <strong>켠 기기에만</strong> 갑니다. 다른 기기나 다른 브라우저에서도 받으려면 거기서도 켜 주세요.</li>
          <li>같은 톡방 알림은 하나로 묶여 최신 것으로 바뀝니다.</li>
        </ul>
        {ordered.map((section) => (
          <div key={section.platform}>
            <p className="font-medium">
              {section.title}
              {section.platform === platform && <span className="ml-1 text-xs font-normal text-brand">(지금 쓰는 기기)</span>}
            </p>
            <ul className="list-disc pl-5">
              {section.items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
        <p className="text-muted-foreground">그래도 안 되면 알림을 끄고 다시 켜 보거나, 알림이 오지 않은 시각을 관리자에게 알려 주세요.</p>
      </div>
    </details>
  );
}
