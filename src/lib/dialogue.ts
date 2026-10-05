import { getScenario } from "@/lib/content";
import type {
  CoachingSignal,
  DialoguePhase,
  DialogueState,
  DoctorTurnResult,
  Scenario,
  SignalCounts,
} from "@/lib/types";

const EMPTY_SIGNALS: SignalCounts = {
  empathy: 0,
  data: 0,
  partnership: 0,
  command: 0,
  criticism: 0,
};

const PHASE_ORDER: DialoguePhase[] = [
  "resist",
  "deflect",
  "challenge",
  "soften",
];

export function createDialogueState(): DialogueState {
  return {
    phase: "resist",
    turnCount: 0,
    signals: { ...EMPTY_SIGNALS },
    usedReplyIndexes: {},
  };
}

export function detectSignals(
  text: string,
  scenario: Scenario,
): CoachingSignal[] {
  const normalized = normalizeHebrew(text);
  if (!normalized) return [];

  if (isMostlyLatin(normalized)) {
    return [];
  }

  const found: CoachingSignal[] = [];
  (Object.keys(scenario.keywords) as CoachingSignal[]).forEach((signal) => {
    const hit = scenario.keywords[signal].some((keyword) =>
      normalized.includes(normalizeHebrew(keyword)),
    );
    if (hit) found.push(signal);
  });
  return found;
}

export function generateDoctorReply(
  scenario: Scenario,
  state: DialogueState,
  userText: string,
): DoctorTurnResult {
  const signalsThisTurn = detectSignals(userText, scenario);
  const nextSignals: SignalCounts = { ...state.signals };
  signalsThisTurn.forEach((signal) => {
    nextSignals[signal] += 1;
  });

  const nextTurnCount = state.turnCount + 1;
  const nextPhase = nextPhaseFromSignals({
    current: state.phase,
    turnCount: nextTurnCount,
    signalsThisTurn,
    totals: nextSignals,
    latinOnly: isMostlyLatin(userText),
  });

  const reply =
    isMostlyLatin(userText) && !containsHebrew(userText)
      ? latinPushback(scenario)
      : pickReply(scenario, nextPhase, state.usedReplyIndexes[nextPhase] ?? []);

  const used = [...(state.usedReplyIndexes[nextPhase] ?? [])];
  const replyIndex = scenario.replies[nextPhase].indexOf(reply);
  if (replyIndex >= 0) used.push(replyIndex);

  return {
    reply,
    signalsThisTurn,
    source: "local",
    state: {
      phase: nextPhase,
      turnCount: nextTurnCount,
      signals: nextSignals,
      usedReplyIndexes: {
        ...state.usedReplyIndexes,
        [nextPhase]: used,
      },
    },
  };
}

export function generateDoctorReplyByScenarioId(
  scenarioId: string,
  state: DialogueState,
  userText: string,
): DoctorTurnResult | null {
  const scenario = getScenario(scenarioId);
  if (!scenario) return null;
  return generateDoctorReply(scenario, state, userText);
}

function nextPhaseFromSignals(args: {
  current: DialoguePhase;
  turnCount: number;
  signalsThisTurn: CoachingSignal[];
  totals: SignalCounts;
  latinOnly: boolean;
}): DialoguePhase {
  const { current, turnCount, signalsThisTurn, totals, latinOnly } = args;
  const hostile =
    signalsThisTurn.includes("command") ||
    signalsThisTurn.includes("criticism");
  const constructive =
    signalsThisTurn.includes("empathy") ||
    signalsThisTurn.includes("partnership") ||
    signalsThisTurn.includes("data");

  if (latinOnly) return "resist";
  if (hostile && !signalsThisTurn.includes("empathy")) {
    return regressPhase(current);
  }

  let phase = current;
  if (turnCount >= 1 && totals.empathy >= 1 && phase === "resist") {
    phase = "deflect";
  }
  if (
    turnCount >= 2 &&
    (totals.data >= 1 || totals.partnership >= 1) &&
    (phase === "resist" || phase === "deflect") &&
    constructive
  ) {
    phase = "challenge";
  }
  if (
    turnCount >= 3 &&
    totals.empathy >= 1 &&
    totals.partnership >= 1 &&
    totals.criticism === 0 &&
    phase !== "soften"
  ) {
    phase = "soften";
  }
  if (
    turnCount >= 4 &&
    totals.empathy + totals.partnership + totals.data >= 4 &&
    totals.command + totals.criticism <= 1
  ) {
    phase = "soften";
  }

  return phase;
}

function regressPhase(phase: DialoguePhase): DialoguePhase {
  const index = PHASE_ORDER.indexOf(phase);
  return PHASE_ORDER[Math.max(0, index - 1)] ?? "resist";
}

function pickReply(
  scenario: Scenario,
  phase: DialoguePhase,
  usedIndexes: number[],
): string {
  const pool = scenario.replies[phase];
  const unused = pool
    .map((line, index) => ({ line, index }))
    .filter((entry) => !usedIndexes.includes(entry.index));
  const choice = unused.length > 0 ? unused[0] : { line: pool[0], index: 0 };
  return choice.line;
}

function latinPushback(scenario: Scenario): string {
  if (scenario.personaId === "shapira" || scenario.personaId === "ben-david") {
    return "דברי אליי בעברית. זו המרפאה שלי, וכך מתנהלת כאן שיחה.";
  }
  return "דבר אליי בעברית. זו המרפאה שלי, וכך מתנהלת כאן שיחה.";
}

export function normalizeHebrew(text: string): string {
  return text
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/[״"׳']/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isMostlyLatin(text: string): boolean {
  const letters = text.replace(/[^A-Za-z\u0590-\u05FF]/g, "");
  if (!letters) return false;
  const latin = (letters.match(/[A-Za-z]/g) ?? []).length;
  return latin / letters.length > 0.6;
}

function containsHebrew(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text);
}

export function emptySignalCounts(): SignalCounts {
  return { ...EMPTY_SIGNALS };
}
