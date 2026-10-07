import { filenameForMime, transcribeHebrewAudio } from "@/lib/ai/transcribe";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 6 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("audio");
  if (!(file instanceof File) || file.size < 80) {
    return Response.json({ error: "חסרה הקלטה" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "ההקלטה ארוכה מדי" }, { status: 413 });
  }

  const mime =
    (typeof form.get("mime") === "string" && form.get("mime")) ||
    file.type ||
    "audio/mp4";
  const bytes = Buffer.from(await file.arrayBuffer());
  const text = await transcribeHebrewAudio({ bytes, mime: String(mime) });
  if (!text) {
    return Response.json({ error: "לא הצלחנו לתמלל" }, { status: 422 });
  }
  return Response.json({
    text,
    filename: filenameForMime(String(mime)),
  });
}
