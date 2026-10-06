"use client";

import { PHASE_LABELS, SIGNAL_LABELS } from "@/lib/content";
import { detectSignals } from "@/lib/dialogue";
import type {
  CoachingSignal,
  DialoguePhase,
  Scenario,
  SignalCounts,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const ORDER: CoachingSignal[] = [
  "empathy",
  "data",
  "partnership",
  "command",
  "criticism",
];

export function VoiceAnalysis({
  scenario,
  liveText,
  totals,
  phase,
  listening,
  wordCount,
}: {
  scenario: Scenario;
  liveText: string;
  totals: SignalCounts;
  phase: DialoguePhase;
  listening: boolean;
  wordCount: number;
}) {
  const liveSignals = detectSignals(liveText, scenario);
  const max = Math.max(1, ...ORDER.map((signal) => totals[signal]));

  return (
    <section
      className="lift-card rounded-xl border border-border bg-white p-4 shadow-none"
      aria-label="ניתוח דיבור"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-primary">ניתוח הדיבור שלכם</h2>
          <p className="text-xs text-muted-foreground">
            {listening
              ? "מקשיבים עכשיו — הסימנים מתעדכנים בזמן אמת"
              : "אמפתיה, נתון ושותפות מזיזים את הרופא. הוראה וביקורת מחזירות אחורה."}
          </p>
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
          שלב הרופא: {PHASE_LABELS[phase]}
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {ORDER.map((signal) => {
          const live = liveSignals.includes(signal);
          const count = totals[signal];
          const width = `${Math.max(live ? 18 : 8, (count / max) * 100)}%`;
          const hostile = signal === "command" || signal === "criticism";
          return (
            <div key={signal} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{SIGNAL_LABELS[signal]}</span>
                <span className="text-muted-foreground">
                  {count}
                  {live ? " · נשמע עכשיו" : ""}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "signal-bar h-full rounded-full transition-all duration-500",
                    hostile ? "bg-destructive/80" : "bg-primary",
                    live && "signal-bar-live",
                  )}
                  style={{ width }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {wordCount > 0
          ? `${wordCount} מילים בתור האחרון`
          : "דברו בעברית — ננתח את הניסוח בזמן שאתם מדברים."}
      </p>
    </section>
  );
}
