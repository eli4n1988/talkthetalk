import {
  anthropicKey,
  geminiKey,
  openaiKey,
  preferredChatProvider,
  type ChatProviderId,
} from "@/lib/ai/providers";
import {
  buildDoctorSystemPrompt,
  historyToChat,
  parseModelReply,
  type ModelReply,
} from "@/lib/ai/prompt";
import type { Persona, Scenario, SocialBeat, TranscriptTurn } from "@/lib/types";
import type { ManagerProfile } from "@/lib/profile";

export async function generateAiDoctorReply(args: {
  scenario: Scenario;
  persona: Persona;
  beat: SocialBeat;
  history: TranscriptTurn[];
  kind: "opening" | "turn";
  manager?: ManagerProfile | null;
}): Promise<{ reply: ModelReply; source: ChatProviderId } | null> {
  const order: ChatProviderId[] = [];
  const preferred = preferredChatProvider();
  if (preferred) order.push(preferred);
  (["gemini", "openai", "claude"] as ChatProviderId[]).forEach((id) => {
    if (!order.includes(id) && hasKey(id)) order.push(id);
  });

  const system = buildDoctorSystemPrompt({
    scenario: args.scenario,
    persona: args.persona,
    beat: args.beat,
    manager: args.manager,
  });
  const userKickoff =
    args.kind === "opening"
      ? args.scenario.firstMeeting
        ? "הרופא נכנס לחדר לפגישה ראשונה. אמור רק משפט פתיחה של היכרות."
        : "הרופא נכנס לחדר לפגישה מוכרת. אמור רק נימוסין קצרים, בלי הנושא הקליני."
      : "הגב עכשיו לדברי המנהל האחרונים, לפי הכללים.";

  for (const provider of order) {
    try {
      const raw =
        provider === "gemini"
          ? await completeGemini({ system, history: args.history, userKickoff })
          : provider === "openai"
            ? await completeOpenAI({ system, history: args.history, userKickoff })
            : await completeClaude({ system, history: args.history, userKickoff });
      if (!raw) continue;
      const parsed = parseModelReply(raw);
      if (parsed) return { reply: parsed, source: provider };
    } catch {
      continue;
    }
  }
  return null;
}

function hasKey(id: ChatProviderId): boolean {
  if (id === "gemini") return Boolean(geminiKey());
  if (id === "openai") return Boolean(openaiKey());
  return Boolean(anthropicKey());
}

async function completeGemini(args: {
  system: string;
  history: TranscriptTurn[];
  userKickoff: string;
}): Promise<string | null> {
  const key = geminiKey();
  if (!key) return null;
  const contents = historyToChat(args.history).map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
  if (contents.length === 0 || contents[contents.length - 1]?.role !== "user") {
    contents.push({ role: "user", parts: [{ text: args.userKickoff }] });
  }

  const models = [
    "gemini-3.8-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash",
  ];
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: args.system }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 512,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  for (const model of models) {
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      },
      12000,
    );
    if (!response?.ok) continue;
    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join("\n")
      .trim();
    if (text) return text;
  }
  return null;
}

async function completeOpenAI(args: {
  system: string;
  history: TranscriptTurn[];
  userKickoff: string;
}): Promise<string | null> {
  const key = openaiKey();
  if (!key) return null;
  const messages = [
    { role: "system", content: args.system },
    ...historyToChat(args.history),
  ];
  if (messages[messages.length - 1]?.role !== "user") {
    messages.push({ role: "user", content: args.userKickoff });
  }
  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.7,
        max_tokens: 280,
        response_format: { type: "json_object" },
        messages,
      }),
    },
    12000,
  );
  if (!response?.ok) return null;
  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

async function completeClaude(args: {
  system: string;
  history: TranscriptTurn[];
  userKickoff: string;
}): Promise<string | null> {
  const key = anthropicKey();
  if (!key) return null;
  const mapped = historyToChat(args.history);
  const messages =
    mapped.length > 0
      ? mapped
      : [{ role: "user" as const, content: args.userKickoff }];
  if (messages[messages.length - 1]?.role !== "user") {
    messages.push({ role: "user", content: args.userKickoff });
  }
  const response = await fetchWithTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 280,
        temperature: 0.7,
        system: args.system,
        messages,
      }),
    },
    12000,
  );
  if (!response?.ok) return null;
  const data = (await response.json()) as {
    content?: { type?: string; text?: string }[];
  };
  const text = data.content?.find((part) => part.type === "text")?.text;
  return text?.trim() ?? null;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms: number,
): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
