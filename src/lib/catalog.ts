import { PERSONAS, SCENARIOS, SEED_SCENARIO_IDS } from "@/lib/content";
import type {
  CoachingSignal,
  DialoguePhase,
  Persona,
  Scenario,
} from "@/lib/types";

export const CATALOG_STORAGE_KEY = "talkthetalk.catalog.v1";

export type CatalogPayload = {
  version: 1;
  overrides: Record<string, Scenario>;
  extras: Scenario[];
  hiddenIds: string[];
};

const SIGNALS: CoachingSignal[] = [
  "empathy",
  "data",
  "partnership",
  "command",
  "criticism",
];

const PHASES: DialoguePhase[] = ["resist", "deflect", "challenge", "soften"];

export function emptyCatalogPayload(): CatalogPayload {
  return { version: 1, overrides: {}, extras: [], hiddenIds: [] };
}

export function isSeedScenario(id: string): boolean {
  return SEED_SCENARIO_IDS.has(id);
}

export function mergeCatalog(payload: CatalogPayload | null): Scenario[] {
  const data = payload ?? emptyCatalogPayload();
  const hidden = new Set(data.hiddenIds);
  const seeds = SCENARIOS.filter((scenario) => !hidden.has(scenario.id)).map(
    (scenario) => sanitizeScenario(data.overrides[scenario.id] ?? scenario),
  );
  const extras = data.extras
    .filter((scenario) => !hidden.has(scenario.id) && !isSeedScenario(scenario.id))
    .map(sanitizeScenario)
    .filter((scenario): scenario is Scenario => Boolean(scenario));
  return [...seeds, ...extras];
}

export function parseCatalogPayload(raw: string | null): CatalogPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CatalogPayload;
    if (parsed?.version !== 1 || !parsed.overrides || !Array.isArray(parsed.extras)) {
      return null;
    }
    return {
      version: 1,
      overrides: parsed.overrides,
      extras: parsed.extras.filter(isScenarioShape),
      hiddenIds: Array.isArray(parsed.hiddenIds) ? parsed.hiddenIds : [],
    };
  } catch {
    return null;
  }
}

export function upsertScenarioInPayload(
  payload: CatalogPayload,
  scenario: Scenario,
): CatalogPayload {
  const clean = sanitizeScenario(scenario);
  if (isSeedScenario(clean.id)) {
    return {
      ...payload,
      hiddenIds: payload.hiddenIds.filter((id) => id !== clean.id),
      overrides: { ...payload.overrides, [clean.id]: clean },
    };
  }
  const extras = payload.extras.filter((item) => item.id !== clean.id);
  extras.push(clean);
  return {
    ...payload,
    extras,
    hiddenIds: payload.hiddenIds.filter((id) => id !== clean.id),
  };
}

export function removeScenarioFromPayload(
  payload: CatalogPayload,
  id: string,
): CatalogPayload {
    if (isSeedScenario(id)) {
      const overrides = { ...payload.overrides };
      delete overrides[id];
      return {
      ...payload,
      overrides,
      hiddenIds: payload.hiddenIds.includes(id)
        ? payload.hiddenIds
        : [...payload.hiddenIds, id],
    };
  }
  return {
    ...payload,
    extras: payload.extras.filter((scenario) => scenario.id !== id),
    hiddenIds: payload.hiddenIds.filter((hiddenId) => hiddenId !== id),
  };
}

export function createScenarioId(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createBlankScenario(persona: Persona): Scenario {
  return {
    id: createScenarioId(),
    title: "תרחיש חדש",
    tension: "תארו את המתח בחדר — מה הרופא שומע כהתקפה, ומה המנהל צריך להשיג.",
    clinicNote: "פרט קליני אחד מהמרפאה שישמש עוגן בשיחה.",
    doctorType: persona.doctorType,
    personaId: persona.id,
    openingLine:
      "למה הזמנת אותי? אם זו עוד שיחת מדדים, אני מעדיף/ה לחזור למטופלים.",
    managerGoals: [
      "שקפו עומס או ותק לפני הבקשה.",
      "הביאו נתון אחד מהמרפאה, לא סיסמה.",
      "סגרו בניסוי קטן לזמן מוגבל.",
    ],
    sampleLines: [
      "אני שומע/ת את העומס, וגם יש לנו נתון שצריך לטפל בו ביחד.",
      "אני לא מבקש/ת מהפכה. מה דעתך על ניסוי לשבועיים?",
      "אני איתך בחדר. בוא נבחר צעד אחד קטן.",
    ],
    keywords: {
      empathy: ["מבין", "מבינה", "עומס", "כבוד", "ניסיון"],
      data: ["נתון", "מדד", "תלונ", "ממוצע"],
      partnership: ["ביחד", "ננסה", "מה דעתך", "איתך"],
      command: ["חייב", "מיד", "הוראה", "אין ברירה"],
      criticism: ["רשלנ", "אתה הבעיה", "גרוע", "כישלון"],
    },
    replies: {
      resist: [
        "אל תבואו אליי עם סיסמאות מהמטה. אני בחדר עם מטופלים.",
        "אם זו האשמה, השיחה הזאת נגמרה לפני שהתחילה.",
      ],
      deflect: [
        "אוקיי, יש בעיה. יש גם בעיות אחרות שאתם לא מטפלים בהן.",
        "תדברו עם המוקד / המזכירה. לא הכל עובר דרכי.",
      ],
      challenge: [
        "נניח שאני מסכים. מי יעמוד מאחוריי כשזה ייכשל?",
        "תני לי צעד אחד קונקרטי, לא מצגת.",
      ],
      soften: [
        "אם זה ניסוי קטן, לזמן מוגבל — אני מוכן לשמוע.",
        "אל תכתבו עליי בדוח. תכתבו שדיברנו. זה אני יכול לחיות איתו.",
      ],
    },
  };
}

export function duplicateScenario(scenario: Scenario): Scenario {
  return {
    ...structuredClone(scenario),
    id: createScenarioId(),
    title: scenario.title.includes("(העתק)")
      ? scenario.title
      : `${scenario.title} (העתק)`,
  };
}

export function getPersonaById(id: string): Persona | undefined {
  return PERSONAS.find((persona) => persona.id === id);
}

export function sanitizeScenario(input: Scenario): Scenario {
  const persona =
    getPersonaById(input.personaId) ??
    PERSONAS.find((item) => item.doctorType === input.doctorType) ??
    PERSONAS[0];

  return {
    id: input.id || createScenarioId(),
    title: input.title.trim() || "תרחיש ללא כותרת",
    tension: input.tension.trim(),
    clinicNote: input.clinicNote.trim(),
    doctorType: persona.doctorType,
    personaId: persona.id,
    openingLine: input.openingLine.trim() || persona.stance,
    managerGoals: cleanList(input.managerGoals, 1),
    sampleLines: cleanList(input.sampleLines, 1),
    keywords: {
      empathy: cleanList(input.keywords?.empathy ?? [], 0),
      data: cleanList(input.keywords?.data ?? [], 0),
      partnership: cleanList(input.keywords?.partnership ?? [], 0),
      command: cleanList(input.keywords?.command ?? [], 0),
      criticism: cleanList(input.keywords?.criticism ?? [], 0),
    },
    replies: {
      resist: cleanList(input.replies?.resist ?? [], 1),
      deflect: cleanList(input.replies?.deflect ?? [], 1),
      challenge: cleanList(input.replies?.challenge ?? [], 1),
      soften: cleanList(input.replies?.soften ?? [], 1),
    },
  };
}

function cleanList(items: string[] | undefined, min: number): string[] {
  const cleaned = (items ?? []).map((item) => item.trim()).filter(Boolean);
  if (cleaned.length >= min) return cleaned;
  return min === 0 ? cleaned : ["…"];
}

function isScenarioShape(value: unknown): value is Scenario {
  if (!value || typeof value !== "object") return false;
  const scenario = value as Scenario;
  return (
    typeof scenario.id === "string" &&
    typeof scenario.title === "string" &&
    typeof scenario.personaId === "string" &&
    typeof scenario.openingLine === "string" &&
    Boolean(scenario.keywords) &&
    Boolean(scenario.replies) &&
    SIGNALS.every((signal) => Array.isArray(scenario.keywords?.[signal])) &&
    PHASES.every((phase) => Array.isArray(scenario.replies?.[phase]))
  );
}
