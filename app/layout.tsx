import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { headers } from "next/headers";
import { ThemeProvider } from "next-themes";
import { ErrorReporter } from "@/components/error-reporter";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "호서대학교 멘토링",
    template: "%s | 호서대학교 멘토링",
  },
  description: "호서대학교 단과대학별 멘토·멘티 매칭 서비스",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "호서 멘토링", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#89171A" };

// 한글 글꼴 (UI/UX Pro Max 추천 "Korean Modern"). next/font가 빌드할 때 받아 우리 사이트에서 제공합니다.
// 한글 글자 파일이 커서 미리 불러오지 않고(preload: false), 브라우저가 필요한 글자 조각만 받습니다.
const notoSansKr = Noto_Sans_KR({
  variable: "--font-sans",
  display: "swap",
  subsets: ["latin"],
  preload: false,
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // proxy가 요청마다 만든 CSP nonce. 다크 모드 깜빡임을 막는 next-themes의 인라인 스크립트에 붙입니다.
  // 요청 헤더를 읽으므로 모든 화면이 요청마다 렌더링됩니다 (nonce는 미리 만들어 둘 수 없음).
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${notoSansKr.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          nonce={nonce}
        >
          {children}
        </ThemeProvider>
        {/* 화면 오류를 관리자에게 자동으로 남깁니다 (11장 34번) */}
        <ErrorReporter />
      </body>
    </html>
  );
}
