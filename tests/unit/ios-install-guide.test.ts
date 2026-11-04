import { describe, expect, it } from "vitest";
import { iosGuideTarget } from "@/features/notifications/components/ios-install-guide";

// 아이폰 홈 화면 추가 화살표 위치 (브라우저 버튼 위치는 기기·버전마다 다름)

const iphone = (tail: string) => `Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ${tail}`;

describe("화살표가 가리킬 곳", () => {
  it("아이폰 사파리 18 이하: 아래 가운데 공유 버튼", () => {
    expect(iosGuideTarget(iphone("Version/18.6 Mobile/15E148 Safari/604.1"), false)).toBe("bottom-center");
  });
  it("아이폰 사파리 26: 오른쪽 아래 ⋯ 버튼", () => {
    expect(iosGuideTarget(iphone("Version/26.0 Mobile/15E148 Safari/604.1"), false)).toBe("bottom-right");
  });
  it("아이폰 크롬: 주소창 오른쪽", () => {
    expect(iosGuideTarget(iphone("CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1"), false)).toBe("top-right");
  });
  it("아이패드: 오른쪽 위", () => {
    expect(iosGuideTarget(iphone("Version/18.6 Safari/604.1"), true)).toBe("top-right");
  });
});
