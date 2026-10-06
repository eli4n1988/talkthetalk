"use client";

import { useState } from "react";
import { OnboardingScreen } from "@/components/onboarding-screen";
import { useProfile } from "@/components/profile-provider";
import { ScenarioPicker } from "@/components/scenario-picker";
import {
  districtLabel,
  managerRoleLabel,
  partnerNounPlural,
} from "@/lib/profile";

export function HomeScreen() {
  const { profile } = useProfile();
  const [editing, setEditing] = useState(false);

  if (!profile) return <OnboardingScreen />;
  if (editing) {
    return (
      <OnboardingScreen initial={profile} onCancel={() => setEditing(false)} />
    );
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-10">
      <section className="hero-banner relative overflow-hidden rounded-2xl border border-border px-4 py-6 sm:rounded-3xl sm:px-10 sm:py-12">
        <p className="stagger-in text-sm font-medium text-primary">
          {managerRoleLabel(profile.gender)} · מחוז {districtLabel(profile.district)}
        </p>
        <h1
          className="stagger-in mt-3 max-w-3xl text-2xl font-semibold leading-snug text-balance sm:text-[2.15rem]"
          style={{ animationDelay: "80ms" }}
        >
          שלום {profile.name}, בחרו תרחיש לשיחת אימון.
        </h1>
        <p
          className="stagger-in mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground sm:text-base"
          style={{ animationDelay: "140ms" }}
        >
          האפליקציה מיועדת למנהלים רפואיים במכבי שמנהלים רופאים וצריכים לנהל
          איתם שיחות על בעיות במרפאה. כאן יש מגוון תרחישים — לא תרחיש אחד
          קבוע. השיחות יוצגו מול {partnerNounPlural(profile.gender)} בלבד, לפי
          המין שנבחר בכניסה.
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          data-testid="edit-profile"
          className="stagger-in mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline"
          style={{ animationDelay: "200ms" }}
        >
          שינוי פרטים
        </button>
      </section>
      <ScenarioPicker />
    </div>
  );
}
