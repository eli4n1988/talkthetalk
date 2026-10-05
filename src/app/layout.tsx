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
      <body className="flex min-h-full flex-col">
        <AppHeader />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
