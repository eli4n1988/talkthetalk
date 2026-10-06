"use client";

import type { ReactNode } from "react";
import { OnboardingScreen } from "@/components/onboarding-screen";
import { useProfile } from "@/components/profile-provider";

export function ProfileGate({ children }: { children: ReactNode }) {
  const { ready, profile } = useProfile();

  if (!ready) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <span className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p>טוען את פרטי הכניסה…</p>
      </div>
    );
  }

  if (!profile) {
    return <OnboardingScreen />;
  }

  return children;
}
