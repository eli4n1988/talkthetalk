import {
  preferredChatProvider,
  preferredTtsProvider,
} from "@/lib/ai/providers";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    chat: preferredChatProvider() ?? "local",
    tts: preferredTtsProvider() ?? "browser",
    modelNote:
      "ברירת המחדל לקול עברי טבעי היא Gemini TTS. בלי מפתח — קול הדפדפן.",
  });
}
