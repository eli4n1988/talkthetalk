import { pcm16ToWav, sampleRateFromMime } from "@/lib/ai/wav";
import {
  geminiKey,
  geminiVoiceFor,
  openaiKey,
  openaiVoiceFor,
  preferredTtsProvider,
  voiceStyleInstructions,
  type TtsProviderId,
} from "@/lib/ai/providers";
import type { Persona } from "@/lib/types";

export type SpokenAudio = {
  bytes: Buffer;
  mime: string;
  provider: TtsProviderId;
};

export async function synthesizeDoctorVoice(args: {
  text: string;
  persona: Persona;
}): Promise<SpokenAudio | null> {
  const order: TtsProviderId[] = [];
  const preferred = preferredTtsProvider();
  if (preferred) order.push(preferred);
  (["gemini", "openai"] as TtsProviderId[]).forEach((id) => {
    if (!order.includes(id) && hasTtsKey(id)) order.push(id);
  });

  for (const provider of order) {
    try {
      const spoken =
        provider === "gemini"
          ? await geminiSpeak(args.text, args.persona)
          : await openaiSpeak(args.text, args.persona);
      if (spoken) return spoken;
    } catch {
      continue;
    }
  }
  return null;
}

function hasTtsKey(id: TtsProviderId): boolean {
  return id === "gemini" ? Boolean(geminiKey()) : Boolean(openaiKey());
}

async function geminiSpeak(
  text: string,
  persona: Persona,
): Promise<SpokenAudio | null> {
  const key = geminiKey();
  if (!key) return null;
  const voiceName = geminiVoiceFor(persona);
  const prompt = `${voiceStyleInstructions(persona)}\n\nקרא בדיוק את הטקסט הבא, בעברית מדוברת:\n${text}`;

  const models = [
    "gemini-2.5-flash-preview-tts",
    "gemini-2.5-pro-preview-tts",
  ];

  for (const model of models) {
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              languageCode: "he-IL",
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        }),
      },
      18000,
    );
    if (!response?.ok) continue;
    const data = (await response.json()) as {
      candidates?: {
        content?: {
          parts?: { inlineData?: { data?: string; mimeType?: string } }[];
        };
      }[];
    };
    const inline = data.candidates?.[0]?.content?.parts?.find(
      (part) => part.inlineData?.data,
    )?.inlineData;
    if (!inline?.data) continue;
    const raw = Buffer.from(inline.data, "base64");
    const mime = inline.mimeType ?? "";
    if (mime.includes("wav") || mime.includes("mpeg") || mime.includes("mp3")) {
      return {
        bytes: raw,
        mime: mime.includes("mp3") || mime.includes("mpeg") ? "audio/mpeg" : "audio/wav",
        provider: "gemini",
      };
    }
    const wav = pcm16ToWav(raw, sampleRateFromMime(mime));
    return { bytes: wav, mime: "audio/wav", provider: "gemini" };
  }
  return null;
}

async function openaiSpeak(
  text: string,
  persona: Persona,
): Promise<SpokenAudio | null> {
  const key = openaiKey();
  if (!key) return null;
  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/audio/speech",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: openaiVoiceFor(persona),
        input: text,
        instructions: voiceStyleInstructions(persona),
        response_format: "mp3",
      }),
    },
    18000,
  );
  if (!response?.ok) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 100) return null;
  return { bytes, mime: "audio/mpeg", provider: "openai" };
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
