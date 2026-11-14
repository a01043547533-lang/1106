import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "@/legacy/styles.css";
import Providers from "@/legacy/Providers.jsx";
import Shell from "@/legacy/Shell.jsx";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://www.ipdae.net";
const g = process.env.GOOGLE_SITE_VERIFICATION;
const n = process.env.NAVER_SITE_VERIFICATION;
const ads = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || process.env.VITE_ADSENSE_CLIENT;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "입대타이밍 · 모집병 지원률부터 전역일 계산까지",
  description:
    "병무청 공공데이터로 모집병 접수현황, 지원률, 특기별 지원 조건, 모집 일정을 확인하세요. 입대 후에는 전역일 계산기로 진급일·군인 월급·적금·수료식 날짜까지 볼 수 있어요.",
  robots: "index, follow",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    siteName: "입대타이밍",
    title: "입대타이밍 · 모집병 지원률부터 전역일 계산까지",
    description: "병무청 공공데이터로 모집병 접수현황, 지원률, 특기별 지원 조건, 모집 일정을 확인하세요.",
    images: ["/preparation-mate.png"],
    locale: "ko_KR",
  },
  twitter: { card: "summary" },
  verification: {
    ...(g && /^[\w-]+$/.test(g) ? { google: g } : {}),
    ...(n && /^[\w-]+$/.test(n) ? { other: { "naver-site-verification": n } } : {}),
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preload" href="/fonts/PretendardVariable.woff2" as="font" type="font/woff2" crossOrigin="" />
        {ads && /^ca-pub-\d+$/.test(ads) && (
          <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads}`} crossOrigin="anonymous" />
        )}
      </head>
      <body>
        <Providers>
          <Suspense fallback={null}>
            <Shell>{children}</Shell>
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
