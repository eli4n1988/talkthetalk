"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TranscriptTurn } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Transcript({
  turns,
  interim,
  doctorName,
}: {
  turns: TranscriptTurn[];
  interim?: string;
  doctorName: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, interim]);

  if (turns.length === 0 && !interim) {
    return (
      <div className="flex min-h-56 flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-white px-6 py-12 text-center">
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          התמליל יופיע כאן. התחילו במיקרופון, או כתבו תור בעברית אם אין מיקרופון
          במכשיר.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[min(20rem,42vh)] rounded-lg border border-border bg-white">
      <div
        className="flex flex-col gap-3 p-5"
        aria-live="polite"
        aria-relevant="additions"
      >
        {turns.map((turn) => {
          const isDoctor = turn.role === "doctor";
          return (
            <div
              key={turn.id}
              className={cn(
                "max-w-[92%] rounded-lg px-3.5 py-2.5 text-sm leading-6 sm:max-w-[80%]",
                isDoctor
                  ? "self-start bg-primary text-primary-foreground"
                  : "self-end bg-secondary text-secondary-foreground",
              )}
            >
              <p className="mb-1 text-[11px] font-medium opacity-80">
                {isDoctor ? doctorName : "אתם"}
              </p>
              <p>{turn.text}</p>
            </div>
          );
        })}
        {interim ? (
          <div className="max-w-[92%] self-end rounded-lg bg-secondary/70 px-3.5 py-2.5 text-sm leading-6 text-secondary-foreground sm:max-w-[80%]">
            <p className="mb-1 text-[11px] font-medium opacity-80">אתם · טיוטה</p>
            <p>{interim}</p>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>
    </ScrollArea>
  );
}
