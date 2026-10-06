import Link from "next/link";

export function AppHeader() {
  return (
    <header className="border-b border-border bg-white">
      <div className="h-1.5 w-full bg-primary" />
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-primary text-sm font-bold tracking-tight text-primary-foreground">
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
        <p className="hidden max-w-sm text-start text-xs leading-5 text-muted-foreground md:block">
          סימולטור שיחות בעברית לאימון מול רופאי משפחה ורופאי ילדים.
        </p>
      </div>
    </header>
  );
}
