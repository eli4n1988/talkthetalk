"use client";

import type { ReactNode } from "react";
import { OnboardingScreen } from "@/components/onboarding-screen";
import { useProfile } from "@/components/profile-provider";

export function ProfileGate({ children }: { children: ReactNode }) {
  const { profile } = useProfile();

  // First paint must be the onboarding form — not a spinner. If JS is slow
  // or blocked on a phone, the HTML still shows a usable screen.
  if (!profile) {
    return <OnboardingScreen />;
  }

  return children;
}
