import { describe, expect, it } from "vitest";
import { stamp, toCsv } from "@/features/admin/lib/backup-files";

describe("백업 CSV", () => {
  it("엑셀에서 한글이 깨지지 않도록 BOM으로 시작", () => {
    expect(toCsv([{ a: 1 }]).startsWith("﻿")).toBe(true);
  });

  it("쉼표·따옴표·줄바꿈이 있는 값은 따옴표로 감쌈", () => {
    const csv = toCsv([{ name: '홍"길동', memo: "a,b\nc" }]);
    expect(csv).toBe('﻿name,memo\r\n"홍""길동","a,b\nc"');
  });

  it("엑셀 수식으로 실행되지 않도록 =, +, -, @ 앞에 '를 붙임", () => {
    const csv = toCsv([{ v: "=HYPERLINK(\"x\")" }, { v: "+1" }, { v: "-1" }, { v: "@a" }]);
    const rows = csv.replace("﻿", "").split("\r\n").slice(1);
    expect(rows).toEqual(['"\'=HYPERLINK(""x"")"', "'+1", "'-1", "'@a"]);
  });

  it("행마다 열이 달라도 모든 열을 머리글에 넣음", () => {
    const csv = toCsv([{ a: 1 }, { b: 2 }]);
    expect(csv).toBe("﻿a,b\r\n1,\r\n,2");
  });

  it("객체 값은 JSON으로, null은 빈칸으로", () => {
    expect(toCsv([{ o: { x: 1 }, n: null }])).toBe('﻿o,n\r\n"{""x"":1}",');
  });

  it("파일 이름용 날짜", () => {
    expect(stamp(new Date(2026, 10, 2, 9, 5))).toBe("20261102-0905");
  });
});
