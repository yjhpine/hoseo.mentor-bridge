import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { avatarOwner, clampCrop, cropSource, initialCrop, zoomCrop } from "@/features/mentors/lib/avatar";

// 멘토 프로필 사진 (11장 18번)

const MENTOR = "06eee420-9a2e-40fe-97cb-12349c481cd9";
const FILE = "0f3b2c1d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

describe("사진 경로", () => {
  it("멘토 폴더 안 WEBP·JPG만 주인을 돌려줌", () => {
    expect(avatarOwner(`${MENTOR}/${FILE}.webp`)).toBe(MENTOR);
    expect(avatarOwner(`${MENTOR}/${FILE}.jpg`)).toBe(MENTOR);
  });

  it("모양이 다르면 null", () => {
    for (const path of [
      `${MENTOR}/${FILE}.png`,
      `${MENTOR}/../${FILE}.webp`,
      `${MENTOR}/sub/${FILE}.webp`,
      `${FILE}.webp`,
      `x${MENTOR}/${FILE}.webp`,
    ]) {
      expect(avatarOwner(path)).toBeNull();
    }
  });

  it("DB avatar_owner()와 같은 정규식", () => {
    const dir = "supabase/migrations";
    const file = readdirSync(dir).filter((f) => f.endsWith("_mentor_photos.sql"))[0];
    const sql = readFileSync(`${dir}/${file}`, "utf8");
    expect(sql).toContain(
      "'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f-]{36}\\.(webp|jpg)$'",
    );
  });
});

describe("사진 위치 편집", () => {
  const view = 300;

  it("처음에는 가운데, 잘라 낼 영역은 가운데 정사각형과 같음", () => {
    const state = initialCrop(1200, 800, view);
    expect(cropSource(1200, 800, view, state)).toEqual({ sx: 200, sy: 0, side: 800 });
  });

  it("틀 밖으로 끌어도 빈틈이 생기지 않게 막음", () => {
    const state = clampCrop(1200, 800, view, { x: 50, y: -999, zoom: 1 });
    expect(state.x).toBe(0);
    expect(state.y).toBe(0); // 세로는 꼭 맞아서 움직일 수 없음
    const right = clampCrop(1200, 800, view, { x: -9999, y: 0, zoom: 1 });
    expect(cropSource(1200, 800, view, right)).toEqual({ sx: 400, sy: 0, side: 800 });
  });

  it("2배 확대하면 가운데 기준으로 절반 크기 영역", () => {
    const state = zoomCrop(1200, 800, view, initialCrop(1200, 800, view), 2);
    const src = cropSource(1200, 800, view, state);
    expect(src.side).toBeCloseTo(400);
    expect(src.sx).toBeCloseTo(400);
    expect(src.sy).toBeCloseTo(200);
  });

  it("확대 범위는 1~3배", () => {
    expect(zoomCrop(800, 800, view, initialCrop(800, 800, view), 10).zoom).toBe(3);
    expect(zoomCrop(800, 800, view, initialCrop(800, 800, view), 0.2).zoom).toBe(1);
  });
});
