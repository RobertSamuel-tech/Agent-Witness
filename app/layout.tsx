import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const dmSans = localFont({
  src: [
    { path: "../public/fonts/dm-sans-latin-ext.woff2", weight: "400 700", style: "normal" },
    { path: "../public/fonts/dm-sans-latin.woff2", weight: "400 700", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const jetbrainsMono = localFont({
  src: [
    { path: "../public/fonts/jetbrains-mono-latin-ext.woff2", weight: "100 800", style: "normal" },
    { path: "../public/fonts/jetbrains-mono-latin.woff2", weight: "100 800", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
  fallback: ["monospace"],
});

export const metadata: Metadata = {
  title: "AgentWitness",
  description: "Semantic audit trail for AI agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${dmSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster theme="dark" position="top-right" />
      </body>
    </html>
  );
}
