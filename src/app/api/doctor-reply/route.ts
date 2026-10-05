import { generateDoctorReplyByScenarioId } from "@/lib/dialogue";
import type { DialogueState } from "@/lib/types";

export const dynamic = "force-dynamic";

type RequestBody = {
  scenarioId: string;
  userText: string;
  state: DialogueState;
};

export async function POST(request: Request) {
  const body = (await request.json()) as RequestBody;
  const local = generateDoctorReplyByScenarioId(
    body.scenarioId,
    body.state,
    body.userText,
  );

  if (!local) {
    return Response.json({ error: "תרחיש לא נמצא" }, { status: 404 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(local);
  }

  try {
    const enhanced = await enhanceWithOpenAI({
      apiKey,
      userText: body.userText,
      draft: local.reply,
      scenarioId: body.scenarioId,
      phase: local.state.phase,
    });
    if (enhanced) {
      return Response.json({ ...local, reply: enhanced, source: "openai" });
    }
  } catch {
    // Local path always wins if the optional model fails.
  }

  return Response.json(local);
}

async function enhanceWithOpenAI(args: {
  apiKey: string;
  userText: string;
  draft: string;
  scenarioId: string;
  phase: string;
}): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.6,
        max_tokens: 180,
        messages: [
          {
            role: "system",
            content:
              "אתה רופא במרפאת מכבי בסימולטור אימון למנהלים. דבר בעברית מדוברת, משפט-שניים, בקול של הרופא. הישאר בדמות: התנגד, הטה, ורק אחר כך רכך אם המנהל טיפל יפה. אל תשבור אופי. אל תסביר שאתה מודל.",
          },
          {
            role: "user",
            content: `תרחיש: ${args.scenarioId}. שלב: ${args.phase}. דברי המנהל: ${args.userText}. טיוטת תשובה מקומית: ${args.draft}. כתוב תשובה קולית קצרה באותו אופי.`,
          },
        ],
      }),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || null;
  } finally {
    clearTimeout(timeout);
  }
}
