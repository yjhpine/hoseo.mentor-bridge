import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";
import { buildContentSecurityPolicy, createNonce } from "@/lib/security/headers";
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

describe("강의 자료 경로·이름 DB 검사 (2차 C6)", () => {
  it("마이그레이션의 확장자 목록이 앱의 허용 목록과 같음", () => {
    const dir = "supabase/migrations";
    const file = readdirSync(dir).filter((f) => f.endsWith("_security_review_2.sql"))[0];
    const sql = readFileSync(`${dir}/${file}`, "utf8");
    const lists = [...sql.matchAll(/\\\.\(([a-z|]+)\)\$/g)].map((m) => m[1].split("|").sort());
    expect(lists.length).toBe(3);
    for (const list of lists) expect(list).toEqual(Object.keys(COURSE_FILE_TYPES).sort());
  });
});

describe("보안 헤더 (M1)", () => {
  it("정적 파일 등 모든 경로에 클릭재킹 방지 등 기본 헤더를 붙이고 x-powered-by를 끔", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    const rules = await nextConfig.headers!();
    const all = rules.find((r) => r.source === "/:path*");
    const headers = Object.fromEntries(all!.headers.map((h) => [h.key.toLowerCase(), h.value]));
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
    // CSP는 proxy만 붙입니다 (두 번 붙으면 nonce CSP와 겹침)
    expect(headers["content-security-policy"]).toBeUndefined();
  });
});

describe("전체 CSP (2차 C1)", () => {
  const supabaseUrl = "https://gxcnjcqfykcpbtikhixs.supabase.co";
  const directives = (csp: string) =>
    Object.fromEntries(
      csp.split(";").map((d) => d.trim().split(/\s+/)).map(([name, ...values]) => [name, values]),
    );

  it("nonce는 요청마다 다름", () => {
    expect(createNonce()).not.toBe(createNonce());
    expect(createNonce()).toMatch(/^[A-Za-z0-9+/]{22}==$/);
  });

  it("운영: nonce 스크립트만 실행, eval·인라인 스크립트 불가, 틀 넣기 금지", () => {
    const d = directives(buildContentSecurityPolicy({ nonce: "abc", supabaseUrl }));
    expect(d["script-src"]).toEqual(expect.arrayContaining(["'nonce-abc'", "'strict-dynamic'"]));
    expect(d["script-src"]).not.toContain("'unsafe-inline'");
    expect(d["script-src"]).not.toContain("'unsafe-eval'");
    expect(d["frame-ancestors"]).toEqual(["'none'"]);
    expect(d["object-src"]).toEqual(["'none'"]);
    expect(d["base-uri"]).toEqual(["'self'"]);
    expect(d["form-action"]).toEqual(["'self'"]);
    expect(d["upgrade-insecure-requests"]).toEqual([]);
  });

  it("Supabase(데이터·실시간)와 Turnstile만 외부로 허용", () => {
    const d = directives(buildContentSecurityPolicy({ nonce: "abc", supabaseUrl }));
    expect(d["connect-src"]).toEqual(["'self'", supabaseUrl, "wss://gxcnjcqfykcpbtikhixs.supabase.co"]);
    expect(d["frame-src"]).toEqual(["https://challenges.cloudflare.com"]);
    expect(d["default-src"]).toEqual(["'self'"]);
  });

  it("개발 서버에서만 unsafe-eval", () => {
    const d = directives(buildContentSecurityPolicy({ nonce: "abc", supabaseUrl, isDev: true }));
    expect(d["script-src"]).toContain("'unsafe-eval'");
  });
});
