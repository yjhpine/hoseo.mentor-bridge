import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { avatarOwner, centerSquare } from "@/features/mentors/lib/avatar";

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

describe("가운데 정사각형 자르기", () => {
  it("가로 사진은 가운데", () => {
    expect(centerSquare(1200, 800)).toEqual({ sx: 200, sy: 0, side: 800 });
  });
  it("세로 사진은 가운데", () => {
    expect(centerSquare(600, 1000)).toEqual({ sx: 0, sy: 200, side: 600 });
  });
  it("정사각형은 그대로", () => {
    expect(centerSquare(512, 512)).toEqual({ sx: 0, sy: 0, side: 512 });
  });
});
