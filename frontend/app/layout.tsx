import type { Metadata } from "next";

import { AppHeader } from "@/components/app-header";
import { Toaster } from "@/components/ui/toaster";

import "./globals.css";

export const metadata: Metadata = {
  title: "ECG Arrhythmia Detector",
  description: "Clinical ECG arrhythmia detection dashboard for Normal, APC, and VTach classification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <div className="relative min-h-screen overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),radial-gradient(circle_at_85%_10%,_rgba(16,185,129,0.12),_transparent_22%),linear-gradient(180deg,_rgba(15,23,42,0.4),_transparent_35%)]" />
          <AppHeader />
          <main className="relative z-10 mx-auto w-full max-w-7xl px-6 py-8 lg:px-10 lg:py-10">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
