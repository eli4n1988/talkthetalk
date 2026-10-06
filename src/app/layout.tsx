import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
});

export const metadata: Metadata = {
  title: "TalktheTalk | אימון שיחות עם רופאים | מכבי",
  description:
    "סימולטור שיחות בעברית למנהלות ומנהלי מרפאות במכבי שירותי בריאות. תרגול קולי מול רופאי משפחה ורופאי ילדים.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background">
        <AppHeader />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-8 sm:px-8 sm:py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
