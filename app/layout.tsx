import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "호서대학교 멘토링",
    template: "%s | 호서대학교 멘토링",
  },
  description: "호서대학교 단과대학별 멘토·멘티 매칭 서비스",
};

// 한글 글꼴 (UI/UX Pro Max 추천 "Korean Modern"). next/font가 빌드할 때 받아 우리 사이트에서 제공합니다.
// 한글 글자 파일이 커서 미리 불러오지 않고(preload: false), 브라우저가 필요한 글자 조각만 받습니다.
const notoSansKr = Noto_Sans_KR({
  variable: "--font-sans",
  display: "swap",
  subsets: ["latin"],
  preload: false,
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${notoSansKr.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
