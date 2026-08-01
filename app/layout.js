import "./globals.css";

export const metadata = {
  title: "AI 영상기초 다지기",
  description: "AI 인플루언서 영상 프롬프트의 대사를 누구나 쉽게 수정하는 도구",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
