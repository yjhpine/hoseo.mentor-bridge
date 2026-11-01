import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// 캐시 저장소(R2)는 쓰지 않습니다. 이 앱은 세션별 화면이라 Next.js 캐시를 거의 쓰지 않습니다.
export default defineCloudflareConfig({});
