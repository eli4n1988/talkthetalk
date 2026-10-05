import type { DebriefNotes, DialogueState, Scenario } from "@/lib/types";

export function buildDebrief(
  scenario: Scenario,
  state: DialogueState,
): DebriefNotes {
  const tooShort = state.turnCount < 2;
  const reachedSoftening = state.phase === "soften";
  const wentWell: string[] = [];
  const tryNext: string[] = [];

  if (tooShort) {
    tryNext.push(
      "השיחה הייתה קצרה מדי כדי לראות דפוס. נסו לפחות שלושה תורים — ותיקים נפתחים לאט.",
    );
  }

  if (state.signals.empathy > 0) {
    wentWell.push(
      "שיקפתם עומס, ותק או לחץ — הרופא שמע שאתם מכירים את החדר, לא רק את הדוח.",
    );
  } else {
    tryNext.push(
      "התחילו בשיקוף קצר: ״אני שומע את העומס״. בלי זה, כל מדד נשמע כהתקפה.",
    );
  }

  if (state.signals.data > 0) {
    wentWell.push(
      "הבאתם פרט קונקרטי מהמרפאה (המתנה, חריגה, תיעוד, פנייה) במקום סיסמה כללית.",
    );
  } else {
    tryNext.push(
      `עגנו את השיחה בנתון אחד מתוך התרחיש: ${scenario.clinicNote}`,
    );
  }

  if (state.signals.partnership > 0) {
    wentWell.push(
      "הזמנתם שותפות — ניסוי, משפט משותף, תבנית — במקום הוראה מלמעלה.",
    );
  } else {
    tryNext.push(
      "סגרו בבקשה קטנה אחת לזמן מוגבל (שבוע או שבועיים), בניסוח ״מה דעתך שננסה״.",
    );
  }

  if (state.signals.command > 0 || state.signals.criticism > 0) {
    tryNext.push(
      "״חייב״, ״תעשה״ או האשמה אישית מחזירים ותיקים לעמדה. החליפו בצורך ובניסוי.",
    );
  }

  if (reachedSoftening) {
    wentWell.push(
      "הרופא ריכך עמדה. זה סימן שהשיחה עברה מניהול לברית — שמרו על בקשה קטנה אחת.",
    );
  } else if (!tooShort) {
    tryNext.push(
      "עוד לא הגעתם לריכוך. חזרו על צמד: שיקוף רגש, ואז הצעה קטנה ששומרת על הסמכות הקלינית.",
    );
  }

  const uniqueWentWell = unique(wentWell).slice(0, 3);
  const uniqueTryNext = unique(tryNext).slice(0, 3);

  if (uniqueWentWell.length === 0 && !tooShort) {
    uniqueWentWell.push(
      "נשארתם בשיחה גם כשהרופא דחה. עצם ההתמדה חשובה עם דמויות ותיקות.",
    );
  }

  return {
    wentWell: uniqueWentWell,
    tryNext: uniqueTryNext,
    reachedSoftening,
    tooShort,
  };
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}
