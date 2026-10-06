import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { ProfileGate } from "@/components/profile-gate";
import { Providers } from "@/components/providers";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
});

export const metadata: Metadata = {
  title: "TalktheTalk | אימון שיחות עם רופאים | מכבי",
  description:
    "סימולטור שיחות בעברית למנהלים רפואיים במכבי שמנהלים רופאים ומתרגלים שיחות על בעיות במרפאה.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning className={`${heebo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background">
        <Providers>
          <AppHeader />
          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-8 sm:px-8 sm:py-10">
            <ProfileGate>{children}</ProfileGate>
          </main>
        </Providers>
      </body>
    </html>
  );
}
