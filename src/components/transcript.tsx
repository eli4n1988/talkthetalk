"use client";

import { useEffect, useRef } from "react";
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
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "auto",
    });
  }, [turns, interim]);

  if (turns.length === 0 && !interim) {
    return (
      <div className="flex min-h-40 flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-white px-6 py-8 text-center sm:min-h-56 sm:py-12">
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          התמליל יופיע כאן. לחצו «לחצו כדי לדבר» כשמוכנים, או כתבו תור בעברית.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={viewportRef}
      className="h-[min(28rem,calc(100dvh-18rem))] overflow-y-auto overscroll-contain rounded-lg border border-border bg-white lg:h-[min(22rem,42vh)]"
      style={{ overflowAnchor: "none" }}
    >
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
                "bubble-in max-w-[92%] rounded-lg px-3.5 py-2.5 text-sm leading-6 sm:max-w-[80%]",
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
      </div>
    </div>
  );
}
