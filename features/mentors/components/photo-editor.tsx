"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AVATAR_MAX_ZOOM,
  clampCrop,
  cropScale,
  initialCrop,
  zoomCrop,
  type CropState,
} from "@/features/mentors/lib/avatar";

// 프로필 사진 위치 편집 (11장 18번)
// 사진을 끌어서 옮기고, 막대나 마우스 휠로 확대·축소합니다. 둥근 안쪽이 실제로 보이는 부분입니다.
// 키보드: 화살표로 옮기기, +/-로 확대·축소. 오른쪽에 실제 크기 미리보기가 나옵니다.

const VIEW = 280;
const PREVIEW_SIZES = [96, 56, 40] as const;

export type ImageSize = { width: number; height: number };

function Photo({ src, size, image, crop, view }: { src: string; size: number; image: ImageSize; crop: CropState; view: number }) {
  const ratio = size / view;
  const scale = cropScale(image.width, image.height, view, crop.zoom) * ratio;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 사용자가 고른 사진(blob:)을 편집 중에만 그립니다
    <img
      src={src}
      alt=""
      draggable={false}
      className="pointer-events-none absolute left-0 top-0 max-w-none select-none"
      style={{
        width: image.width * scale,
        height: image.height * scale,
        transform: `translate(${crop.x * ratio}px, ${crop.y * ratio}px)`,
      }}
    />
  );
}

export function PhotoEditor({
  src,
  image,
  busy,
  onSave,
  onCancel,
}: {
  src: string;
  image: ImageSize;
  busy: boolean;
  onSave: (crop: CropState, view: number) => void;
  onCancel: () => void;
}) {
  const [crop, setCrop] = useState<CropState>(() => initialCrop(image.width, image.height, VIEW));
  const drag = useRef<{ id: number; startX: number; startY: number; from: CropState } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  const move = (dx: number, dy: number, from = crop) =>
    setCrop(clampCrop(image.width, image.height, VIEW, { ...from, x: from.x + dx, y: from.y + dy }));
  const zoomTo = (zoom: number) => setCrop((c) => zoomCrop(image.width, image.height, VIEW, c, zoom));

  // 휠 확대·축소는 페이지 스크롤을 막아야 해서 passive가 아닌 이벤트로 붙입니다.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setCrop((c) => zoomCrop(image.width, image.height, VIEW, c, c.zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1)));
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, [image.width, image.height]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex flex-col items-center gap-3">
          <div
            ref={frameRef}
            role="application"
            tabIndex={0}
            aria-label="사진 위치 편집. 화살표 키로 옮기고 + - 키로 확대 축소합니다."
            className="relative touch-none cursor-grab overflow-hidden rounded-md bg-muted outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
            style={{ width: VIEW, height: VIEW }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, from: crop };
            }}
            onPointerMove={(event) => {
              const d = drag.current;
              if (!d || d.id !== event.pointerId) return;
              move(event.clientX - d.startX, event.clientY - d.startY, d.from);
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onKeyDown={(event) => {
              const step = event.shiftKey ? 20 : 5;
              const keys: Record<string, () => void> = {
                ArrowLeft: () => move(step, 0),
                ArrowRight: () => move(-step, 0),
                ArrowUp: () => move(0, step),
                ArrowDown: () => move(0, -step),
                "+": () => zoomTo(crop.zoom + 0.1),
                "=": () => zoomTo(crop.zoom + 0.1),
                "-": () => zoomTo(crop.zoom - 0.1),
              };
              const action = keys[event.key];
              if (action) {
                event.preventDefault();
                action();
              }
            }}
          >
            <Photo src={src} size={VIEW} image={image} crop={crop} view={VIEW} />
            {/* 둥근 바깥은 어둡게: 프로필 사진은 원으로 보입니다 */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{ boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.55)" }}
            />
            <div aria-hidden className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/80" />
          </div>
          <label className="flex w-full items-center gap-2 text-sm" style={{ maxWidth: VIEW }}>
            <span className="shrink-0 text-muted-foreground">축소</span>
            <input
              type="range"
              min={1}
              max={AVATAR_MAX_ZOOM}
              step={0.01}
              value={crop.zoom}
              onChange={(event) => zoomTo(Number(event.target.value))}
              className="w-full accent-[hsl(var(--brand))]"
              aria-label="확대·축소"
            />
            <span className="shrink-0 text-muted-foreground">확대</span>
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">미리보기</p>
          <div className="flex items-end gap-4">
            {PREVIEW_SIZES.map((size) => (
              <div key={size} className="flex flex-col items-center gap-1">
                <div className="relative overflow-hidden rounded-full bg-muted" style={{ width: size, height: size }}>
                  <Photo src={src} size={size} image={image} crop={crop} view={VIEW} />
                </div>
                <span className="text-xs text-muted-foreground">
                  {size === 96 ? "멘토 상세" : size === 56 ? "멘토 목록" : "작게"}
                </span>
              </div>
            ))}
          </div>
          <p className="max-w-56 text-xs text-muted-foreground">
            사진을 끌어서 위치를 맞추고, 막대나 마우스 휠로 크기를 조절하세요. 둥근 안쪽이 보입니다.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={() => onSave(crop, VIEW)}>
          {busy ? "올리는 중…" : "이대로 저장"}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => setCrop(initialCrop(image.width, image.height, VIEW))}>
          처음 위치로
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
          취소
        </Button>
      </div>
    </div>
  );
}
