import Link from "next/link";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur-md">
      <div className="h-1.5 w-full bg-header-bar" />
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-primary text-sm font-bold tracking-tight text-primary-foreground transition-transform duration-300 group-hover:scale-105 group-hover:shadow-lg">
            מכ
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="font-heading text-[15px] font-semibold text-foreground">
              TalktheTalk
            </span>
            <span className="text-xs text-muted-foreground">
              מכבי שירותי בריאות · אימון מנהלי מרפאות
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/" className="nav-pill">
            תרחישים
          </Link>
          <Link href="/admin" className="nav-pill">
            ניהול
          </Link>
        </nav>
      </div>
    </header>
  );
}
