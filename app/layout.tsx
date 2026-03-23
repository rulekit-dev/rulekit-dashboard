"use client";

import { Nunito, DM_Mono } from "next/font/google";
import "./globals.css";
import { ConfigProvider } from "@/lib/contexts/ConfigContext";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${nunito.variable} ${dmMono.variable}`}>
      <head>
        <title>Rulekit Dashboard</title>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.png" type="image/png" />
      </head>
      <body style={{ fontFamily: "var(--font-nunito), sans-serif" }}>
        <ConfigProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
