"use client";

import { useState } from "react";
import { useProfile } from "@/components/profile-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MACCABI_DISTRICTS,
  managerRoleLabel,
  type MaccabiDistrictId,
  type ManagerProfile,
} from "@/lib/profile";
import type { VoiceGender } from "@/lib/types";
import { cn } from "@/lib/utils";

export function OnboardingScreen({
  initial,
  onCancel,
}: {
  initial?: ManagerProfile | null;
  onCancel?: () => void;
}) {
  const { saveProfile } = useProfile();
  const [name, setName] = useState(initial?.name ?? "");
  const [gender, setGender] = useState<VoiceGender | null>(
    initial?.gender ?? null,
  );
  const [district, setDistrict] = useState<MaccabiDistrictId | null>(
    initial?.district ?? null,
  );
  const [submitted, setSubmitted] = useState(false);

  const trimmed = name.trim();
  const nameError = submitted && trimmed.length < 2;
  const genderError = submitted && !gender;
  const districtError = submitted && !district;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (trimmed.length < 2 || !gender || !district) return;
    saveProfile({ name: trimmed, gender, district });
    onCancel?.();
  }

  const editing = Boolean(initial);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-4">
      <Card className="bg-white shadow-none ring-border">
        <CardHeader className="border-b border-border">
          <p className="text-sm font-medium text-primary">
            {editing ? "עדכון פרטים" : "כניסה לאימון"}
          </p>
          <CardTitle className="text-2xl font-semibold leading-snug">
            {editing ? "שינוי שם, מין או מחוז" : "לפני שנכנסים לחדר"}
          </CardTitle>
          <CardDescription className="text-start text-[15px] leading-7">
            TalktheTalk מיועד למנהלים רפואיים במכבי שמנהלים רופאים וצריכים לנהל
            איתם שיחות על בעיות במרפאה. אחרי השמירה תעברו לרשימת תרחישים לבחירה —
            השיחה תמיד תתנהל מול{" "}
            {gender === "female"
              ? "רופאה"
              : gender === "male"
                ? "רופא"
                : "הרופא או הרופאה"}{" "}
            לפי המין שנבחר כאן.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} data-testid="onboarding-form">
          <CardContent className="flex flex-col gap-7 pt-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="manager-name">שם</Label>
              <Input
                id="manager-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="למשל ד״ר יעל לוי"
                autoComplete="name"
                className="h-11 text-base"
                aria-invalid={nameError}
              />
              {nameError ? (
                <p className="text-sm text-destructive">כתבו שם מלא, לפחות שתי אותיות.</p>
              ) : null}
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">מין</legend>
              <p className="text-sm text-muted-foreground">
                כך נפנה אליכם בשיחה, וכך נבחר את הרופאים מולכם.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <ChoiceButton
                  active={gender === "male"}
                  invalid={genderError}
                  onClick={() => setGender("male")}
                  label="גבר"
                  hint={managerRoleLabel("male")}
                  testId="gender-male"
                />
                <ChoiceButton
                  active={gender === "female"}
                  invalid={genderError}
                  onClick={() => setGender("female")}
                  label="אישה"
                  hint={managerRoleLabel("female")}
                  testId="gender-female"
                />
              </div>
              {genderError ? (
                <p className="text-sm text-destructive">בחרו מין כדי להמשיך.</p>
              ) : null}
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">מחוז במכבי</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {MACCABI_DISTRICTS.map((item) => (
                  <ChoiceButton
                    key={item.id}
                    active={district === item.id}
                    invalid={districtError}
                    onClick={() => setDistrict(item.id)}
                    label={item.label}
                    testId={`district-${item.id}`}
                  />
                ))}
              </div>
              {districtError ? (
                <p className="text-sm text-destructive">בחרו מחוז.</p>
              ) : null}
            </fieldset>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 border-border bg-secondary/40 sm:flex-row sm:justify-end">
            {onCancel ? (
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={onCancel}
              >
                ביטול
              </Button>
            ) : null}
            <Button
              type="submit"
              size="lg"
              className="hover-lift w-full sm:w-auto"
              data-testid="onboarding-submit"
            >
              {editing ? "שמירת פרטים" : "המשך לתרחישים"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

function ChoiceButton({
  active,
  invalid,
  onClick,
  label,
  hint,
  testId,
}: {
  active: boolean;
  invalid?: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={testId}
      className={cn(
        "rounded-xl border px-3 py-3 text-start transition-all",
        active
          ? "border-primary bg-secondary text-primary shadow-sm"
          : "border-border bg-white hover:-translate-y-0.5 hover:border-primary/40",
        invalid && !active ? "border-destructive/40" : null,
      )}
    >
      <span className="block text-sm font-medium">{label}</span>
      {hint ? (
        <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </button>
  );
}
