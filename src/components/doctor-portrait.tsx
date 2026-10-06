import { cn } from "@/lib/utils";
import type { Persona } from "@/lib/types";

export function DoctorPortrait({
  persona,
  className,
  sizeClass = "size-20",
}: {
  persona: Persona;
  className?: string;
  sizeClass?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-full bg-white/20",
        sizeClass,
        className,
      )}
    >
      {persona.portraitSrc ? (
        // Native img so circular crop works without next/image config.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={persona.portraitSrc}
          alt={persona.name}
          className="size-full object-cover object-top"
        />
      ) : (
        <span className="flex size-full items-center justify-center text-sm font-semibold">
          {persona.portraitInitials}
        </span>
      )}
    </span>
  );
}
