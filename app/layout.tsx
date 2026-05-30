import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { AppProvider } from "@/lib/store";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const viewport: Viewport = {
  themeColor: "#0c0c10",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Dompet Pintar v3",
  description: "Manajemen keuangan keluarga cerdas",
  manifest: "/manifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Dompet Pintar",
  },
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var cached = localStorage.getItem('theme');
                  if (cached === 'light' || cached === 'dark') {
                    document.documentElement.setAttribute('data-theme', cached);
                  } else {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={dmSans.variable + " " + fraunces.variable}>
        <AppProvider>
          <div className="shell">
            {children}
            <BottomNav />
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
