import "./globals.css";

export const metadata = {
  title: "정글맞팔웹",
  description: "정글룸 맞팔데이",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}