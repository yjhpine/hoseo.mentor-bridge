import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";
import { COURSE_FILE_TYPES, courseFileContentType, fileExtension } from "@/lib/files/course-file-types";

// 보안 검수(docs/security-review.md) 후속 조치가 빠지지 않았는지 확인합니다.

describe("강의 자료 파일 형식 (11장 25번)", () => {
  it("허용한 형식은 저장할 MIME을 돌려줌 (확장자 대소문자 무관)", () => {
    expect(courseFileContentType("강의자료.PDF")).toBe("application/pdf");
    expect(courseFileContentType("과제.hwp")).toBe("application/x-hwp");
    expect(courseFileContentType("발표.pptx")).toBe(COURSE_FILE_TYPES.pptx);
    expect(courseFileContentType("사진.JPEG")).toBe("image/jpeg");
  });

  it("허용하지 않은 형식은 거부", () => {
    for (const name of ["설치.exe", "page.html", "script.js", "image.svg", "확장자없음", "run.sh", "a.pdf.exe"]) {
      expect(courseFileContentType(name)).toBeNull();
    }
  });

  it("확장자는 마지막 점 뒤", () => {
    expect(fileExtension("a.b.ZIP")).toBe("zip");
    expect(fileExtension("noext")).toBe("");
  });

  it("앱의 허용 목록과 Storage 버킷 허용 목록(마이그레이션)이 같음", () => {
    const dir = "supabase/migrations";
    const file = readdirSync(dir).filter((f) => f.endsWith("_security_hardening.sql"))[0];
    const sql = readFileSync(`${dir}/${file}`, "utf8");
    const block = sql.slice(sql.indexOf("allowed_mime_types = array["), sql.indexOf("]", sql.indexOf("allowed_mime_types")));
    const inMigration = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
    const inApp = [...new Set(Object.values(COURSE_FILE_TYPES))].sort();
    expect(inMigration).toEqual(inApp);
  });
});

describe("보안 헤더 (M1)", () => {
  it("모든 경로에 클릭재킹 방지 등 헤더를 붙이고 x-powered-by를 끔", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    const rules = await nextConfig.headers!();
    const all = rules.find((r) => r.source === "/:path*");
    const headers = Object.fromEntries(all!.headers.map((h) => [h.key.toLowerCase(), h.value]));
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
  });
});
