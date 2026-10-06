import { getPersona, getScenario } from "@/lib/content";
import type {
  CoachingSignal,
  DialoguePhase,
  DialogueState,
  DoctorTurnResult,
  Persona,
  Scenario,
  SignalCounts,
  SocialBeat,
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

export function createDialogueState(firstMeeting = false): DialogueState {
  return {
    phase: "resist",
    beat: firstMeeting ? "intro" : "greeting",
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

export function generateOpening(scenario: Scenario): DoctorTurnResult {
  const persona = getPersona(scenario.personaId);
  return {
    reply: persona
      ? scenario.firstMeeting
        ? introOpening(persona)
        : nicetyOpening(persona)
      : scenario.openingLine,
    signalsThisTurn: [],
    source: "local",
    state: createDialogueState(scenario.firstMeeting),
  };
}

export function generateDoctorReply(
  scenario: Scenario,
  state: DialogueState,
  userText: string,
): DoctorTurnResult {
  const persona = getPersona(scenario.personaId);
  const signalsThisTurn = detectSignals(userText, scenario);
  const nextSignals: SignalCounts = { ...state.signals };
  signalsThisTurn.forEach((signal) => {
    nextSignals[signal] += 1;
  });

  const nextTurnCount = state.turnCount + 1;
  const nextBeat = nextBeatFromTurn({
    scenario,
    current: state.beat,
    turnCount: nextTurnCount,
    userText,
    signalsThisTurn,
  });

  const issueTurnCount =
    nextBeat === "issue"
      ? nextTurnCount - (scenario.firstMeeting ? 2 : 1)
      : 0;

  const nextPhase =
    nextBeat === "issue"
      ? nextPhaseFromSignals({
          current: state.beat === "issue" ? state.phase : "resist",
          turnCount: Math.max(1, issueTurnCount),
          signalsThisTurn,
          totals: nextSignals,
          latinOnly: isMostlyLatin(userText),
        })
      : "resist";

  const reply = buildLocalReply({
    scenario,
    persona,
    userText,
    beat: nextBeat,
    previousBeat: state.beat,
    phase: nextPhase,
    usedIndexes: state.usedReplyIndexes[nextPhase] ?? [],
  });

  const used = [...(state.usedReplyIndexes[nextPhase] ?? [])];
  const replyIndex = scenario.replies[nextPhase]?.indexOf(reply) ?? -1;
  if (replyIndex >= 0) used.push(replyIndex);

  return {
    reply,
    signalsThisTurn,
    source: "local",
    state: {
      phase: nextPhase,
      beat: nextBeat,
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

function nextBeatFromTurn(args: {
  scenario: Scenario;
  current: SocialBeat;
  turnCount: number;
  userText: string;
  signalsThisTurn: CoachingSignal[];
}): SocialBeat {
  if (args.current === "issue") return "issue";
  if (jumpedToIssue(args.userText, args.signalsThisTurn)) return "issue";

  if (args.scenario.firstMeeting) {
    const introduced = /אני |קוראים לי|מנהל|מנהלת|נעים/.test(args.userText);
    if (introduced || args.turnCount >= 2) return "issue";
    return "intro";
  }

  if (args.turnCount >= 1) return "issue";
  return "greeting";
}

function jumpedToIssue(text: string, signals: CoachingSignal[]): boolean {
  if (signals.includes("data") || signals.includes("command")) return true;
  return /תור|המתנה|מדד|תיעוד|תלונ|אנטיביו/.test(text);
}

function buildLocalReply(args: {
  scenario: Scenario;
  persona: Persona | undefined;
  userText: string;
  beat: SocialBeat;
  previousBeat: SocialBeat;
  phase: DialoguePhase;
  usedIndexes: number[];
}): string {
  if (isMostlyLatin(args.userText) && !containsHebrew(args.userText)) {
    return latinPushback(args.scenario);
  }

  const echo = quoteSnippet(args.userText);
  if (args.beat === "intro") {
    return joinEcho(
      echo,
      args.persona
        ? introOpening(args.persona)
        : "נעים להכיר. מי עומד מולי, ומה התפקיד במרפאה?",
    );
  }
  if (args.beat === "greeting") {
    return joinEcho(
      echo,
      args.persona
        ? nicetyOpening(args.persona)
        : "שלום, מה נשמע? נדבר על העניין עוד רגע.",
    );
  }

  if (args.previousBeat !== "issue") {
    const bridge = echo
      ? `שמעתי אותך על ${echo}. בוא נעבור למה שביקשת לראות אותי.`
      : "טוב. בוא נדבר על מה שביקשת.";
    return `${bridge} ${args.scenario.openingLine}`;
  }

  const canned = pickReply(args.scenario, args.phase, args.usedIndexes);
  return echo ? `אמרת ${echo}. ${canned}` : canned;
}

function nicetyOpening(persona: Persona): string {
  if (persona.gender === "female" && persona.ageBand === "veteran") {
    return "שלום, מה נשמע? רגע נדיר בלי ילד בוכה מאחורי הדלת. איך אתה?";
  }
  if (persona.gender === "female") {
    return "היי, מה שלומך? בוקר ארוך אצלי. נשב רגע לפני שנצלול?";
  }
  if (persona.ageBand === "veteran") {
    return "שלום. מה נשמע? היה בוקר ארוך. תגיד לי קודם איך אתה, אחר כך נראה למה ביקשת שנשב.";
  }
  return "שלום, מה קורה? יום לחוץ. קודם מה נשמע אצלך?";
}

function introOpening(persona: Persona): string {
  const role =
    persona.doctorType === "pediatrician" ? "רופאת ילדים" : "רופא משפחה";
  const female = persona.gender === "female";
  const roleText = female
    ? persona.doctorType === "pediatrician"
      ? "רופאת ילדים"
      : "רופאת משפחה"
    : role;
  return `שלום, אני ${persona.name}. ${roleText} ב${persona.clinic}, ${persona.yearsInClinic} שנים. נעים להכיר — עוד לא ישבנו ככה באמת. מי עומד מולי, ומה התפקיד שלך אצלנו?`;
}

function quoteSnippet(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned || isMostlyLatin(cleaned)) return "";
  const words = cleaned.split(" ").slice(0, 8).join(" ");
  return words.length > 2 ? `״${words}״` : "";
}

function joinEcho(echo: string, line: string): string {
  if (!echo) return line;
  return `שמעתי, ${echo}. ${line}`;
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
  const pool = scenario.replies[phase] ?? [];
  if (pool.length === 0) {
    return "אני צריך רגע. תמשיכו — אני מקשיב.";
  }
  const unused = pool
    .map((line, index) => ({ line, index }))
    .filter((entry) => !usedIndexes.includes(entry.index));
  const choice = unused.length > 0 ? unused[0] : { line: pool[0], index: 0 };
  return choice.line;
}

function latinPushback(scenario: Scenario): string {
  const female = getPersona(scenario.personaId)?.gender === "female";
  return female
    ? "דברי אליי בעברית. זו המרפאה שלי, וכך מתנהלת כאן שיחה."
    : "דבר אליי בעברית. זו המרפאה שלי, וכך מתנהלת כאן שיחה.";
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
