import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChatWebx",
  description: "A new generation chatting platform to stay connected with the world",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}
      >
        <div className="mx-auto w-full max-w-sm h-screen flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 rounded-3xl shadow-xl md:max-w-full md:border-none md:rounded-none md:shadow-none">
          {children}
        </div>
      </body>
    </html>
  );
}
