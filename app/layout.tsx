import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Dompet Pintar v3",
  description: "Manajemen keuangan keluarga cerdas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${dmSans.variable} ${fraunces.variable} font-sans antialiased`}
    >
      <body className="flex justify-center min-h-screen bg-[#08080d] text-[var(--text)]">
        <div className="w-full max-w-[430px] min-h-screen bg-[var(--bg)] flex flex-col relative overflow-x-hidden pb-[84px] shadow-2xl">
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
