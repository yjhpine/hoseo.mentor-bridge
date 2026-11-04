"use client";

import { Button } from "@/components/ui/button";

/** 관리자 목록의 순서 바꾸기 버튼. 첫 줄의 위로, 마지막 줄의 아래로는 누를 수 없습니다. */
export function MoveButtons({
  index,
  count,
  label,
  disabled,
  onMove,
  horizontal = false,
}: {
  index: number;
  count: number;
  /** 화면 읽기 프로그램용 이름 (예: "인사/총무/노무") */
  label: string;
  disabled?: boolean;
  onMove: (direction: -1 | 1) => void;
  /** 가로로 늘어선 목록이면 ← → */
  horizontal?: boolean;
}) {
  const [back, forward] = horizontal ? ["←", "→"] : ["↑", "↓"];
  const [backLabel, forwardLabel] = horizontal ? ["앞으로", "뒤로"] : ["위로", "아래로"];
  return (
    <div className="flex shrink-0 gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || index === 0}
        onClick={() => onMove(-1)}
        aria-label={`${label} ${backLabel}`}
        title={backLabel}
      >
        {back}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || index === count - 1}
        onClick={() => onMove(1)}
        aria-label={`${label} ${forwardLabel}`}
        title={forwardLabel}
      >
        {forward}
      </Button>
    </div>
  );
}
