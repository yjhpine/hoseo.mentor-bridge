import type { NextConfig } from "next";

// Cache Components(cacheComponents)는 끕니다. Cloudflare Workers(OpenNext)에서 setTimeout 구현 차이로
// 렌더링이 멈추는 문제가 있었고, 이 앱은 'use cache' 캐시를 쓰지 않아 잃는 것이 없습니다.
const nextConfig: NextConfig = {};

export default nextConfig;
