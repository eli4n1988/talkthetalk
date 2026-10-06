import type { Metadata } from "next";
import { PracticeLoader } from "@/components/practice-loader";
import { getScenario, SCENARIOS } from "@/lib/content";

export const dynamicParams = true;

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
  return <PracticeLoader scenarioId={scenarioId} />;
}
