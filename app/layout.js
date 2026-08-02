import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "한컷 AI | 누구나 쉽게 만드는 AI 영상",
    template: "%s | 한컷 AI",
  },
  description: "어려운 기능 없이 대사만 고치면 영상 준비 끝! 누구나 쉽게 따라 하는 AI 영상 프롬프트 도구입니다.",
  applicationName: "한컷 AI",
  keywords: ["AI 영상", "AI 영상 만들기", "영상 프롬프트", "대사 수정", "시니어 AI 교육"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "한컷 AI",
    title: "대사만 고치면 영상 준비 끝! | 한컷 AI",
    description: "누구나 약 5분 만에 따라 할 수 있는 쉬운 AI 영상 만들기 도구입니다.",
    images: [
      {
        url: "/og-share.png",
        width: 1200,
        height: 630,
        alt: "한컷 AI — 대사만 고치면 영상 준비 끝!",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "대사만 고치면 영상 준비 끝! | 한컷 AI",
    description: "누구나 약 5분 만에 따라 할 수 있는 쉬운 AI 영상 만들기 도구입니다.",
    images: ["/og-share.png"],
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  themeColor: "#173150",
  colorScheme: "light",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
