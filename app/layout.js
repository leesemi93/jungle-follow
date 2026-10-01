import "./globals.css";

export const metadata = {
  title: "정글맞팔웹",
  description: "정글룸 맞팔데이",

  applicationName: "정글맞팔웹",

  manifest: "/manifest.webmanifest",

  appleWebApp: {
    capable: true,
    title: "정글맞팔웹",
    statusBarStyle: "default",
  },

  icons: {
    icon: "/jungle-follow-hero.png",
    apple: "/jungle-follow-hero.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#A9D95D",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
