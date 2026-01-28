import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.scss";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GlobalLoading } from "@/components/GlobalLoading";

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "REショッピング",
  description: "RentEase 公式ECサイト",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <div className="app-shell">
          <Header />
          <main className="main-container">{children}</main>
          <Footer />
        </div>
        <GlobalLoading />
      </body>
    </html>
  );
}
