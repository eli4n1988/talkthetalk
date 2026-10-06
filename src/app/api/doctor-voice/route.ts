import { synthesizeDoctorVoice } from "@/lib/ai/tts";
import { getPersona } from "@/lib/content";
import type { Persona } from "@/lib/types";

export const dynamic = "force-dynamic";

type RequestBody = {
  text: string;
  persona?: Persona;
  personaId?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as RequestBody;
  const text = body.text?.trim();
  if (!text) {
    return Response.json({ error: "חסר טקסט" }, { status: 400 });
  }
  const persona =
    body.persona ??
    (body.personaId ? getPersona(body.personaId) : undefined);
  if (!persona) {
    return Response.json({ error: "חסרה דמות" }, { status: 400 });
  }

  const spoken = await synthesizeDoctorVoice({ text, persona });
  if (!spoken) {
    return new Response(null, { status: 204 });
  }

  return new Response(new Uint8Array(spoken.bytes), {
    status: 200,
    headers: {
      "Content-Type": spoken.mime,
      "Cache-Control": "no-store",
      "X-Voice-Provider": spoken.provider,
    },
  });
}
