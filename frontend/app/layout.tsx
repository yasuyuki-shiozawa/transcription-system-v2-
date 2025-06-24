import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// DEBUG: Console log at app start
console.log('🚀🚀🚀 TRANSCRIPTION SYSTEM APP STARTING 🚀🚀🚀');
console.log('Time:', new Date().toISOString());
console.log('Environment:', process.env.NODE_ENV);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "議会議事録作成システム",
  description: "NOTTAとManusのデータを統合して議事録を作成",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-side console log
  console.log('🌟 RootLayout rendering on server');
  
  return (
    <html lang="ja">
      <head>
        <script src="/debug.js" defer></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            console.log('%c⚡ INLINE SCRIPT EXECUTED ⚡', 'color: blue; font-size: 16px; font-weight: bold;');
            console.log('Page loaded at:', new Date().toISOString());
          `
        }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
