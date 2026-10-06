import type { Persona } from "@/lib/types";

export function geminiKey(): string {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    ""
  );
}

export function openaiKey(): string {
  return process.env.OPENAI_API_KEY || "";
}

export function anthropicKey(): string {
  return process.env.ANTHROPIC_API_KEY || "";
}

export type ChatProviderId = "gemini" | "openai" | "claude";
export type TtsProviderId = "gemini" | "openai";

export function preferredChatProvider(): ChatProviderId | null {
  const forced = process.env.TALKTHETALK_CHAT_PROVIDER?.trim().toLowerCase();
  if (forced === "gemini" && geminiKey()) return "gemini";
  if (forced === "openai" && openaiKey()) return "openai";
  if ((forced === "claude" || forced === "anthropic") && anthropicKey()) {
    return "claude";
  }
  if (geminiKey()) return "gemini";
  if (openaiKey()) return "openai";
  if (anthropicKey()) return "claude";
  return null;
}

export function preferredTtsProvider(): TtsProviderId | null {
  const forced = process.env.TALKTHETALK_TTS_PROVIDER?.trim().toLowerCase();
  if (forced === "gemini" && geminiKey()) return "gemini";
  if (forced === "openai" && openaiKey()) return "openai";
  // Gemini TTS is the most native Hebrew voice among the three APIs.
  if (geminiKey()) return "gemini";
  if (openaiKey()) return "openai";
  return null;
}

export function geminiVoiceFor(persona: Persona): string {
  if (persona.gender === "male") {
    return persona.ageBand === "veteran" ? "Charon" : "Puck";
  }
  return persona.ageBand === "veteran" ? "Kore" : "Aoede";
}

export function openaiVoiceFor(persona: Persona): string {
  if (persona.gender === "male") {
    return persona.ageBand === "veteran" ? "onyx" : "ash";
  }
  return persona.ageBand === "veteran" ? "nova" : "coral";
}

export function voiceStyleInstructions(persona: Persona): string {
  const age =
    persona.ageBand === "veteran"
      ? "רופא/ה ותיק/ה, קול בשל, איטי מעט, בלי הקראה"
      : "רופא/ה צעיר/ה בקריירה, קול חי ומהיר יותר, עדיין טבעי";
  const gender = persona.gender === "male" ? "גבר ישראלי" : "אישה ישראלית";
  return [
    `דבר/י עברית ישראלית מדוברת, מבטא ישראלי טבעי, לא רובוטי ולא קריינות רדיו.`,
    `את/ה ${persona.name}, ${gender}, ${age}, ${persona.yearsInClinic} שנות ותק ב${persona.clinic}.`,
    persona.style === "stubborn-veteran"
      ? "טון בטוח, קצת חריף, לא מתנצל."
      : "טון עייף-הגנתי, מהיר, לא שבור לגמרי.",
    "הפסקות קצרות בין משפטים, כמו שיחה בחדר רופאים, לא סטודיו.",
  ].join(" ");
}
