import Link from "next/link";
import { Stethoscope } from "lucide-react";

export function AppHeader() {
  return (
    <header className="border-b border-border/80 bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Stethoscope className="size-4" />
          </span>
          <span className="flex flex-col">
            <span className="font-heading text-base font-semibold tracking-tight">
              TalktheTalk
            </span>
            <span className="text-xs text-muted-foreground">
              מכבי שירותי בריאות · אימון שיחות
            </span>
          </span>
        </Link>
        <p className="hidden max-w-xs text-start text-xs leading-5 text-muted-foreground sm:block">
          סימולטור בעברית למנהלות ומנהלי מרפאות שמדריכים רופאי משפחה ורופאי ילדים.
        </p>
      </div>
    </header>
  );
}
