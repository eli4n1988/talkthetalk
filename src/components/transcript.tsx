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
      <div className="flex min-h-56 flex-1 items-center justify-center rounded-xl border border-dashed bg-muted/40 px-6 py-10 text-center">
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          התמליל יופיע כאן. התחילו במיקרופון, או כתבו תור בעברית אם אין מיקרופון
          במכשיר.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[min(28rem,58vh)] rounded-xl border bg-card">
      <div
        className="flex flex-col gap-3 p-4"
        aria-live="polite"
        aria-relevant="additions"
      >
        {turns.map((turn) => {
          const isDoctor = turn.role === "doctor";
          return (
            <div
              key={turn.id}
              className={cn(
                "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm sm:max-w-[80%]",
                isDoctor
                  ? "self-start bg-primary text-primary-foreground"
                  : "self-end bg-accent text-accent-foreground",
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
          <div className="max-w-[92%] self-end rounded-2xl bg-accent/60 px-3.5 py-2.5 text-sm leading-6 text-accent-foreground sm:max-w-[80%]">
            <p className="mb-1 text-[11px] font-medium opacity-80">אתם · טיוטה</p>
            <p>{interim}</p>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>
    </ScrollArea>
  );
}
