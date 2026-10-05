import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PracticeSession } from "@/components/practice-session";
import { getPersona, getScenario, SCENARIOS } from "@/lib/content";

export function generateStaticParams() {
  return SCENARIOS.map((scenario) => ({ scenarioId: scenario.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}): Promise<Metadata> {
  const { scenarioId } = await params;
  const scenario = getScenario(scenarioId);
  if (!scenario) return { title: "תרחיש לא נמצא | TalktheTalk" };
  return {
    title: `${scenario.title} | TalktheTalk`,
    description: scenario.tension,
  };
}

export default async function PracticePage({
  params,
}: {
  params: Promise<{ scenarioId: string }>;
}) {
  const { scenarioId } = await params;
  const scenario = getScenario(scenarioId);
  if (!scenario) notFound();
  const persona = getPersona(scenario.personaId);
  if (!persona) notFound();

  return <PracticeSession scenario={scenario} persona={persona} />;
}
