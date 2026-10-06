"use client";

import { PracticeSession } from "@/components/practice-session";
import { useCatalog } from "@/components/catalog-provider";
import { useProfile } from "@/components/profile-provider";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { partnerNoun } from "@/lib/profile";
import { cn } from "@/lib/utils";

export function PracticeLoader({ scenarioId }: { scenarioId: string }) {
  const { ready, getScenario, getPersona } = useCatalog();
  const { profile, ready: profileReady } = useProfile();

  if (!ready || !profileReady) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <span className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p>טוען את חדר השיחה…</p>
      </div>
    );
  }

  const scenario = getScenario(scenarioId);
  const persona = scenario ? getPersona(scenario.personaId) : undefined;

  if (!scenario || !persona) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">התרחיש לא נמצא</h1>
        <p className="max-w-md text-muted-foreground">
          ייתכן שנמחק במכשיר זה, או שהקישור ישן. חזרו לרשימה או צרו תרחיש חדש
          בניהול.
        </p>
        <div className="flex gap-2">
          <Link href="/" className={cn(buttonVariants())}>
            לכל התרחישים
          </Link>
          <Link
            href="/admin"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            לניהול תרחישים
          </Link>
        </div>
      </div>
    );
  }

  if (profile && persona.gender !== profile.gender) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center"
        data-testid="gender-mismatch"
      >
        <h1 className="text-2xl font-semibold">השיחה לא תואמת למין שנבחר</h1>
        <p className="max-w-md text-muted-foreground">
          בכניסה נבחר מין {profile.gender === "female" ? "אישה" : "גבר"}, ולכן
          האימון מתנהל רק מול {partnerNoun(profile.gender)}. חזרו לרשימת
          התרחישים, או שנו את המין בכניסה.
        </p>
        <Link href="/" className={cn(buttonVariants())}>
          לכל התרחישים
        </Link>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <p>חסרים פרטי כניסה. חזרו למסך הבית.</p>
        <Link href="/" className={cn(buttonVariants())}>
          למסך הבית
        </Link>
      </div>
    );
  }

  return (
    <PracticeSession
      key={`${scenario.id}-${scenario.openingLine.slice(0, 24)}`}
      scenario={scenario}
      persona={persona}
      manager={profile}
    />
  );
}
