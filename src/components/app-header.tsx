"use client";

import Link from "next/link";
import { useProfile } from "@/components/profile-provider";

export function AppHeader() {
  const { ready, profile } = useProfile();
  const showNav = ready && Boolean(profile);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur-md">
      <div className="h-1 w-full bg-header-bar" />
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center justify-items-center gap-2 px-5 py-3.5 sm:grid-cols-[1fr_auto_1fr] sm:gap-4 sm:px-8 sm:py-4">
        <Link
          href="/"
          className="flex min-w-0 flex-col items-center text-center sm:col-start-2"
        >
          <span className="font-heading text-lg font-semibold tracking-tight text-primary sm:text-xl">
            TalktheTalk
          </span>
          <span
            className="mt-1 h-px w-8 bg-primary/35"
            aria-hidden
          />
          <span className="mt-1.5 text-[11px] font-medium leading-snug text-muted-foreground sm:text-xs">
            סימולצית שיחה למנהלים רפואיים
          </span>
        </Link>
        {showNav ? (
          <nav className="flex items-center gap-0.5 text-sm sm:col-start-3 sm:justify-self-end">
            <Link href="/" className="nav-pill">
              תרחישים
            </Link>
            <Link href="/admin" className="nav-pill">
              ניהול
            </Link>
          </nav>
        ) : (
          <span className="sm:col-start-3" aria-hidden />
        )}
      </div>
    </header>
  );
}
