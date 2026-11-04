// 목록 순서 바꾸기 (관리자 화면의 ↑↓ 버튼)
// 한 칸 옮긴 뒤 전체를 10, 20, 30 …으로 다시 매깁니다. 같은 순서 값이 겹쳐 있어도 화면에 보이는 대로 정리됩니다.
// 값이 바뀌는 줄만 돌려줍니다.

export type Ordered = { id: number; position: number };

export function moveItem(items: Ordered[], index: number, direction: -1 | 1): Ordered[] {
  const target = index + direction;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return [];
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next
    .map((item, i) => ({ id: item.id, position: (i + 1) * 10 }))
    .filter((item) => items.find((old) => old.id === item.id)!.position !== item.position);
}
