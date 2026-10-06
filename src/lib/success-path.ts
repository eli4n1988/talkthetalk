import {
  detectSignals,
  generateDoctorReply,
  generateOpening,
} from "@/lib/dialogue";
import type { DialoguePhase, Scenario } from "@/lib/types";

/**
 * Product rule: every scenario, seed or future, must have a reachable win.
 * Win = the physician reaches `soften` after constructive Hebrew turns
 * (empathy + partnership), without requiring command/criticism.
 */
export const SUCCESS_PATH_RULE =
  "בכל תרחיש חייבת להיות דרך להצליח: מילות אמפתיה ושותפות, שורת ריכוך, ומשפטי אימון שמובילים לריכוך.";

const DEFAULT_EMPATHY = ["מבין", "מבינה", "עומס", "כבוד", "ניסיון", "לא קל"];
const DEFAULT_DATA = ["נתון", "מדד", "תלונ", "ממוצע"];
const DEFAULT_PARTNERSHIP = ["ביחד", "ננסה", "מה דעתך", "איתך", "ניסוי"];
const DEFAULT_SOFTEN = [
  "אם זה ניסוי קטן, לזמן מוגבל — אני מוכן לשמוע.",
  "שמעתי שלא באת להאשים. בוא נסגור צעד אחד ונראה.",
];
const CANONICAL_WIN_LINES = [
  "אני מבין את העומס. זה לא קל, ויש כאן כבוד לניסיון שלך.",
  "יש נתון מהמרפאה שצריך לטפל בו, לא סיסמה כללית.",
  "מה דעתך שננסה ביחד ניסוי קטן לשבוע? אני איתך.",
];

export type SuccessPathGap =
  | "empathy-keywords"
  | "partnership-keywords"
  | "data-keywords"
  | "soften-replies"
  | "winning-samples";

export function successPathGaps(scenario: Scenario): SuccessPathGap[] {
  const gaps: SuccessPathGap[] = [];
  if (clean(scenario.keywords.empathy).length === 0) gaps.push("empathy-keywords");
  if (clean(scenario.keywords.partnership).length === 0) {
    gaps.push("partnership-keywords");
  }
  if (clean(scenario.keywords.data).length === 0) gaps.push("data-keywords");
  if (!hasRealLines(scenario.replies.soften)) gaps.push("soften-replies");
  if (!sampleLinesCanWin(scenario)) gaps.push("winning-samples");
  return gaps;
}

export function scenarioIsWinnable(scenario: Scenario): boolean {
  return successPathGaps(scenario).length === 0;
}

export function ensureSuccessPath(scenario: Scenario): Scenario {
  const keywords = {
    ...scenario.keywords,
    empathy: prefer(scenario.keywords.empathy, DEFAULT_EMPATHY),
    data: prefer(scenario.keywords.data, DEFAULT_DATA),
    partnership: prefer(scenario.keywords.partnership, DEFAULT_PARTNERSHIP),
  };
  const replies = {
    ...scenario.replies,
    soften: hasRealLines(scenario.replies.soften)
      ? scenario.replies.soften
      : DEFAULT_SOFTEN,
  };
  const next: Scenario = {
    ...scenario,
    keywords,
    replies,
    sampleLines: withWinningSamples({ ...scenario, keywords, replies }),
  };
  return next;
}

export function playWinningScript(scenario: Scenario): {
  reachedSoftening: boolean;
  phase: DialoguePhase;
  turnsPlayed: number;
} {
  let result = generateOpening(scenario);
  const lines = [
    ...(scenario.firstMeeting
      ? ["שלום, נעים מאוד. אני מנהל המרפאה — עוד לא הספקנו להכיר."]
      : []),
    ...scenario.sampleLines,
    ...CANONICAL_WIN_LINES,
  ].filter(Boolean);

  for (const line of lines) {
    result = generateDoctorReply(scenario, result.state, line);
    if (result.state.phase === "soften") {
      return {
        reachedSoftening: true,
        phase: result.state.phase,
        turnsPlayed: result.state.turnCount,
      };
    }
  }

  return {
    reachedSoftening: false,
    phase: result.state.phase,
    turnsPlayed: result.state.turnCount,
  };
}

export function assertScenarioWinnable(scenario: Scenario): void {
  const ensured = ensureSuccessPath(scenario);
  const gaps = successPathGaps(ensured);
  if (gaps.length > 0) {
    throw new Error(
      `תרחיש «${ensured.title}» (${ensured.id}) חסר דרך להצליח: ${gaps.join(", ")}`,
    );
  }
  const played = playWinningScript(ensured);
  if (!played.reachedSoftening) {
    throw new Error(
      `תרחיש «${ensured.title}» (${ensured.id}) לא מגיע לריכוך אחרי ${played.turnsPlayed} תורים (phase=${played.phase}).`,
    );
  }
}

function sampleLinesCanWin(scenario: Scenario): boolean {
  const lines = [...scenario.sampleLines, ...CANONICAL_WIN_LINES];
  let empathy = false;
  let partnership = false;
  for (const line of lines) {
    const signals = detectSignals(line, scenario);
    if (signals.includes("empathy")) empathy = true;
    if (signals.includes("partnership")) partnership = true;
  }
  return empathy && partnership;
}

function withWinningSamples(scenario: Scenario): string[] {
  const existing = clean(scenario.sampleLines);
  if (sampleLinesCanWin({ ...scenario, sampleLines: existing })) {
    return existing.length > 0 ? existing : CANONICAL_WIN_LINES;
  }
  return [...existing, ...CANONICAL_WIN_LINES];
}

function prefer(value: string[] | undefined, fallback: string[]): string[] {
  const cleaned = clean(value);
  return cleaned.length > 0 ? cleaned : fallback;
}

function clean(items: string[] | undefined): string[] {
  return (items ?? []).map((item) => item.trim()).filter(Boolean);
}

function hasRealLines(items: string[] | undefined): boolean {
  return clean(items).some((line) => line !== "…");
}
