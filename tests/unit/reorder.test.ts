import { describe, expect, it } from "vitest";
import { moveItem } from "@/features/admin/lib/reorder";

// 관리자 화면 ↑↓ 순서 바꾸기

const list = [
  { id: 1, position: 10 },
  { id: 2, position: 20 },
  { id: 3, position: 30 },
];

describe("순서 바꾸기", () => {
  it("한 칸 위로: 두 줄만 바뀜", () => {
    expect(moveItem(list, 1, -1)).toEqual([
      { id: 2, position: 10 },
      { id: 1, position: 20 },
    ]);
  });

  it("한 칸 아래로", () => {
    expect(moveItem(list, 0, 1)).toEqual([
      { id: 2, position: 10 },
      { id: 1, position: 20 },
    ]);
  });

  it("맨 위에서 위로, 맨 아래에서 아래로는 아무것도 안 바뀜", () => {
    expect(moveItem(list, 0, -1)).toEqual([]);
    expect(moveItem(list, 2, 1)).toEqual([]);
  });

  it("순서 값이 겹치거나 띄엄띄엄이어도 10 간격으로 정리", () => {
    const messy = [
      { id: 1, position: 0 },
      { id: 2, position: 0 },
      { id: 3, position: 75 },
    ];
    expect(moveItem(messy, 2, -1)).toEqual([
      { id: 1, position: 10 },
      { id: 3, position: 20 },
      { id: 2, position: 30 },
    ]);
  });
});
