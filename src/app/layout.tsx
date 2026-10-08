import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { ProfileGate } from "@/components/profile-gate";
import { Providers } from "@/components/providers";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#083F92",
};

export const metadata: Metadata = {
  title: "TalktheTalk | אימון שיחות עם רופאים | מכבי",
  description:
    "סימולטור שיחות בעברית למנהלים רפואיים במכבי שמנהלים רופאים ומתרגלים שיחות על בעיות במרפאה.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TalktheTalk",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning className={`${heebo.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col bg-background">
        <Providers>
          <AppHeader />
          <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col px-4 py-5 sm:px-8 sm:py-10">
            <ProfileGate>{children}</ProfileGate>
          </main>
        </Providers>
      </body>
    </html>
  );
}
