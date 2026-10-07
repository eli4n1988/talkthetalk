import { geminiKey, openaiKey } from "@/lib/ai/providers";

export async function transcribeHebrewAudio(args: {
  bytes: Buffer;
  mime: string;
}): Promise<string | null> {
  const mime = normalizeAudioMime(args.mime);
  if (geminiKey()) {
    const gemini = await transcribeGemini(args.bytes, mime);
    if (gemini) return gemini;
  }
  if (openaiKey()) {
    const whisper = await transcribeWhisper(args.bytes, mime);
    if (whisper) return whisper;
  }
  return null;
}

function normalizeAudioMime(mime: string): string {
  const raw = mime.split(";")[0]?.trim().toLowerCase() || "audio/mp4";
  if (raw === "audio/m4a" || raw === "audio/x-m4a") return "audio/mp4";
  if (raw === "audio/mp3") return "audio/mpeg";
  return raw;
}

async function transcribeGemini(
  bytes: Buffer,
  mime: string,
): Promise<string | null> {
  const key = geminiKey();
  if (!key) return null;
  const models = [
    "gemini-3.8-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash",
  ];
  const body = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: mime, data: bytes.toString("base64") } },
          {
            text: "תמלל את ההקלטה בעברית מדויקת. החזר רק את הטקסט שדובר, בלי הסבר, בלי מירכאות ובלי תרגום.",
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 512,
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
      20000,
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
    const cleaned = cleanTranscript(text);
    if (cleaned) return cleaned;
  }
  return null;
}

async function transcribeWhisper(
  bytes: Buffer,
  mime: string,
): Promise<string | null> {
  const key = openaiKey();
  if (!key) return null;
  const form = new FormData();
  const filename = filenameForMime(mime);
  form.append("file", new Blob([new Uint8Array(bytes)], { type: mime }), filename);
  form.append("model", "whisper-1");
  form.append("language", "he");
  form.append("response_format", "json");

  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    },
    20000,
  );
  if (!response?.ok) return null;
  const data = (await response.json()) as { text?: string };
  return cleanTranscript(data.text);
}

function cleanTranscript(text: string | undefined): string {
  if (!text) return "";
  return text
    .replace(/^["'«»]+|["'«»]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function filenameForMime(mime: string): string {
  if (mime.includes("webm")) return "speech.webm";
  if (mime.includes("wav")) return "speech.wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "speech.mp3";
  if (mime.includes("ogg")) return "speech.ogg";
  return "speech.m4a";
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
