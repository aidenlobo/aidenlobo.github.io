import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aiden's Coog Jeopardy Championship",
  description:
    "A real-time graduation Jeopardy game built for Aiden's Coog Graduation — University of Houston.",
  openGraph: {
    title: "Aiden's Coog Jeopardy Championship",
    description: "Join the live trivia game at Aiden's UH Graduation party!",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#121212] text-zinc-50">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
