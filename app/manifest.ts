import type { MetadataRoute } from "next";

// 웹 앱 매니페스트. 아이폰은 홈 화면에 추가한 웹 앱에서만 웹 푸시를 받을 수 있어서 필요합니다 (6.9).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "호서대학교 멘토링",
    short_name: "호서 멘토링",
    description: "호서대학교 단과대학별 멘토·멘티 매칭 서비스",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#89171A",
    lang: "ko",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
