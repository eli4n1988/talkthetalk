import { generateAiDoctorReply } from "@/lib/ai/chat";
import {
  generateDoctorReply,
  generateDoctorReplyByScenarioId,
  generateOpening,
} from "@/lib/dialogue";
import { getPersona, getScenario } from "@/lib/content";
import type {
  DialogueState,
  DoctorTurnResult,
  Persona,
  Scenario,
  TranscriptTurn,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type RequestBody = {
  scenarioId: string;
  userText?: string;
  state?: DialogueState;
  scenario?: Scenario;
  persona?: Persona;
  history?: TranscriptTurn[];
  kind?: "opening" | "turn";
};

export async function POST(request: Request) {
  const body = (await request.json()) as RequestBody;
  const scenario = body.scenario ?? getScenario(body.scenarioId);
  const kind = body.kind === "opening" ? "opening" : "turn";
  const history = body.history ?? [];
  const persona =
    body.persona ??
    (scenario ? getPersona(scenario.personaId) : undefined);

  let local: DoctorTurnResult | null = null;
  if (kind === "opening" && scenario) {
    local = generateOpening(scenario);
  } else if (scenario && body.state && body.userText != null) {
    local = generateDoctorReply(scenario, body.state, body.userText);
  } else if (body.state && body.userText != null) {
    local = generateDoctorReplyByScenarioId(
      body.scenarioId,
      body.state,
      body.userText,
    );
  }

  if (!local) {
    return Response.json({ error: "תרחיש לא נמצא" }, { status: 404 });
  }

  if (!scenario || !persona) {
    return Response.json(local);
  }

  try {
    const ai = await generateAiDoctorReply({
      scenario,
      persona,
      beat:
        kind === "opening"
          ? local.state.beat
          : (body.state?.beat ?? local.state.beat),
      history,
      kind,
    });
    if (ai) {
      const merged: DoctorTurnResult = {
        ...local,
        reply: ai.reply.reply,
        source: ai.source,
        state: {
          ...local.state,
          beat: ai.reply.beat,
          phase: ai.reply.beat === "issue" ? ai.reply.phase : local.state.phase,
        },
      };
      return Response.json(merged);
    }
  } catch {
    // Local path always wins if the model fails.
  }

  return Response.json(local);
}
