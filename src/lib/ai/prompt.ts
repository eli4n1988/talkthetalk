import type {
  DialoguePhase,
  Persona,
  Scenario,
  SocialBeat,
  TranscriptTurn,
} from "@/lib/types";
import {
  districtLabel,
  managerRoleLabel,
  managerStanding,
  managerYou,
  type ManagerProfile,
} from "@/lib/profile";

export type ModelReply = {
  reply: string;
  beat: SocialBeat;
  phase: DialoguePhase;
};

const BEATS: SocialBeat[] = ["greeting", "intro", "issue"];
const PHASES: DialoguePhase[] = ["resist", "deflect", "challenge", "soften"];

export function buildDoctorSystemPrompt(args: {
  scenario: Scenario;
  persona: Persona;
  beat: SocialBeat;
  manager?: ManagerProfile | null;
}): string {
  const { scenario, persona, beat, manager } = args;
  const meeting = scenario.firstMeeting
    ? `זו פגישה ראשונה. אתם עדיין לא מכירים. חובה להציג את עצמך (שם, תפקיד, ותק קצר) ולשאול מי ${manager ? managerStanding(manager.gender) : "עומד/ת"} מולי, לפני הנושא הקליני.`
    : "אתם כבר עובדים יחד במרפאה. התחל בנימוסין קצרים (שלום, מה נשמע, איך היום) — בלי לפרוק את התלונה מיד.";
  const you = manager ? managerYou(manager.gender) : "אתה/את";
  const managerLine = manager
    ? `מולך ${manager.gender === "female" ? "יושבת" : "יושב"} ${manager.name}, ${managerRoleLabel(manager.gender)} במכבי מחוז ${districtLabel(manager.district)}. פנה רק ב-${you}.`
    : "מולך מנהל או מנהלת רפואית במכבי.";

  return [
    `אתה ${persona.name}, ${persona.gender === "male" ? "רופא" : "רופאה"} ב${persona.clinic}, ${persona.yearsInClinic} שנות ותק.`,
    persona.stance,
    "זה סימולטור אימון למנהלים רפואיים במכבי שמנהלים רופאים. דבר/י עברית מדוברת, 1–3 משפטים, כמו בחדר אמיתי. אל תסביר שאתה מודל.",
    managerLine,
    manager
      ? `חובה לפנות למנהל/ת ב-${you} לאורך כל השיחה. אסור להחליף ל-${manager.gender === "female" ? "אתה" : "את"}.`
      : "שמור על לשון פנייה עקבית לאורך השיחה.",
    meeting,
    `הנושא האמיתי של השיחה (רק אחרי נימוסין/היכרות): ${scenario.title}. ${scenario.tension}`,
    `נתון מהמרפאה: ${scenario.clinicNote}`,
    `כשתגיע לנושא, העמדה שלך בפתיחה: ${scenario.openingLine}`,
    `שלב חברתי נוכחי: ${beat}.`,
    beat === "intro"
      ? "עכשיו רק היכרות. אל תעלה מדדים, תלונות או בקשות לשינוי."
      : beat === "greeting"
        ? "עכשיו רק נימוסין קצרים. אפשר לרמוז שביקשו לראות אותך, בלי לפרט את הבעיה."
        : "עכשיו הנושא. הישאר בדמות: התנגד, הטה, אתגר. אם המנהל שיקף רגש או עומס וגם הציע שותפות או ניסוי קטן — חובה לרכך. אסור לנעול את השיחה בלי מוצא להצלחה.",
    "חובה להגיב לפרט ספציפי שהמנהל אמר עכשיו — מספר, הצעה, שם, תחושה. אסור משפט גנרי שאפשר היה להגיד בלי לשמוע אותו.",
    "אם דיברו אנגלית, בקש עברית בטון של הרופא.",
    'החזר JSON בלבד: {"reply":"טקסט בעברית","beat":"greeting|intro|issue","phase":"resist|deflect|challenge|soften"}',
    "beat: עבור ל-issue רק אחרי היכרות אמיתית (פגישה ראשונה) או אחרי נימוסין קצרים (פגישה חוזרת), או אם המנהל כבר צלל לנושא.",
    "phase רלוונטי בעיקר ב-issue. בנימוסין/היכרות השאר resist. אחרי שיקוף + שותפות ב-issue — phase חייב להיות soften.",
  ].join("\n");
}

export function parseModelReply(raw: string): ModelReply | null {
  const json = extractJson(raw);
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as {
      reply?: string;
      beat?: string;
      phase?: string;
    };
    const reply = parsed.reply?.trim();
    if (!reply) return null;
    const beat = BEATS.includes(parsed.beat as SocialBeat)
      ? (parsed.beat as SocialBeat)
      : null;
    const phase = PHASES.includes(parsed.phase as DialoguePhase)
      ? (parsed.phase as DialoguePhase)
      : null;
    if (!beat || !phase) return null;
    return { reply, beat, phase };
  } catch {
    return null;
  }
}

export function historyToChat(history: TranscriptTurn[]): {
  role: "user" | "assistant";
  content: string;
}[] {
  return history.map((turn) => ({
    role: turn.role === "manager" ? "user" : "assistant",
    content: turn.text,
  }));
}

function extractJson(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return null;
}
