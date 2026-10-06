"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Baby,
  Search,
  Stethoscope,
  Volume2,
  WandSparkles,
} from "lucide-react";
import { useCatalog } from "@/components/catalog-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ageBandLabel,
  doctorTypeLabel,
  genderLabel,
  styleLabel,
  voicePortrait,
} from "@/lib/content";
import { isSeedScenario } from "@/lib/catalog";
import { generateOpening } from "@/lib/dialogue";
import { speakHebrew, stopSpeaking } from "@/lib/speech";
import type { AgeBand, DoctorType, VoiceGender } from "@/lib/types";
import { cn } from "@/lib/utils";

type TypeFilter = "all" | DoctorType;
type GenderFilter = "all" | VoiceGender;
type AgeFilter = "all" | AgeBand;

export function ScenarioPicker() {
  const { scenarios, getPersona, ready } = useCatalog();
  const [filter, setFilter] = useState<TypeFilter>("all");
  const [gender, setGender] = useState<GenderFilter>("all");
  const [age, setAge] = useState<AgeFilter>("all");
  const [query, setQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim();
    return scenarios.filter((scenario) => {
      const persona = getPersona(scenario.personaId);
      if (!persona) return false;
      if (filter !== "all" && scenario.doctorType !== filter) return false;
      if (gender !== "all" && persona.gender !== gender) return false;
      if (age !== "all" && persona.ageBand !== age) return false;
      if (!needle) return true;
      const haystack = [
        scenario.title,
        scenario.tension,
        persona.name,
        persona.clinic,
      ].join(" ");
      return haystack.includes(needle);
    });
  }, [age, filter, gender, getPersona, query, scenarios]);

  const playOpening = async (scenarioId: string) => {
    const scenario = scenarios.find((item) => item.id === scenarioId);
    const persona = scenario ? getPersona(scenario.personaId) : undefined;
    if (!scenario || !persona) return;
    stopSpeaking();
    setPreviewId(scenarioId);
    await speakHebrew({
      text: generateOpening(scenario).reply,
      rate: persona.voice.rate,
      pitch: persona.voice.pitch,
      gender: persona.gender,
      ageBand: persona.ageBand,
    });
    setPreviewId((current) => (current === scenarioId ? null : current));
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="כל התרחישים"
          />
          <FilterChip
            active={filter === "family"}
            onClick={() => setFilter("family")}
            label="רופאי משפחה"
            icon={<Stethoscope className="size-3.5" />}
          />
          <FilterChip
            active={filter === "pediatrician"}
            onClick={() => setFilter("pediatrician")}
            label="רופאי ילדים"
            icon={<Baby className="size-3.5" />}
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={gender === "all"}
              onClick={() => setGender("all")}
              label="כל הקולות"
            />
            <FilterChip
              active={gender === "male"}
              onClick={() => setGender("male")}
              label="גברים"
            />
            <FilterChip
              active={gender === "female"}
              onClick={() => setGender("female")}
              label="נשים"
            />
            <FilterChip
              active={age === "all"}
              onClick={() => setAge("all")}
              label="כל הגילאים"
            />
            <FilterChip
              active={age === "veteran"}
              onClick={() => setAge("veteran")}
              label="ותיקים"
            />
            <FilterChip
              active={age === "early-career"}
              onClick={() => setAge("early-career")}
              label="צעירים בקריירה"
            />
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="חיפוש לפי מתח, רופא או מרפאה"
              className="h-9 pr-9 transition-shadow focus-visible:shadow-md"
              aria-label="חיפוש תרחישים"
            />
          </div>
        </div>
      </div>

      {!ready ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-72 animate-pulse rounded-xl border border-border bg-white"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card className="border-dashed bg-white py-12 text-center ring-border shadow-none">
          <CardHeader>
            <CardTitle>אין תרחישים מתאימים</CardTitle>
            <CardDescription>
              נסו מילה אחרת, או אפסו את הסינון כדי לראות את כל שיחות האימון.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center border-t-0 bg-transparent">
            <Button
              variant="outline"
              className="hover-lift"
              onClick={() => {
                setFilter("all");
                setGender("all");
                setAge("all");
                setQuery("");
              }}
            >
              איפוס סינון
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((scenario, index) => {
            const persona = getPersona(scenario.personaId);
            if (!persona) return null;
            const custom = !isSeedScenario(scenario.id);
            return (
              <Card
                key={scenario.id}
                className="lift-card stagger-in bg-white ring-border shadow-none"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <CardHeader className="border-b border-border">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">
                      {doctorTypeLabel(scenario.doctorType)}
                    </Badge>
                    <Badge variant="outline">{styleLabel(persona.style)}</Badge>
                    <Badge variant="outline">
                      {genderLabel(persona.gender)} · {ageBandLabel(persona.ageBand)}
                    </Badge>
                    <Badge variant="outline">
                      {scenario.firstMeeting ? "פגישה ראשונה" : "נימוסין ואז הנושא"}
                    </Badge>
                    {custom ? (
                      <Badge variant="outline">
                        <WandSparkles className="size-3" />
                        מותאם
                      </Badge>
                    ) : null}
                  </div>
                  <CardTitle className="text-lg font-semibold">
                    {scenario.title}
                  </CardTitle>
                  <CardDescription className="text-start text-[13.5px] leading-6">
                    {scenario.tension}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 pt-1">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary transition-transform group-hover/card:scale-105">
                      {persona.portraitInitials}
                    </span>
                    <div>
                      <p className="font-medium">{persona.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {persona.clinic} · {persona.yearsInClinic} שנות ותק
                      </p>
                      <p className="text-xs text-primary">{voicePortrait(persona)}</p>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {scenario.clinicNote}
                  </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 border-border bg-secondary/40 sm:flex-row sm:items-center">
                  <Link
                    href={`/practice/${scenario.id}`}
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "hover-lift w-full sm:w-auto",
                    )}
                  >
                    שיחה קולית עם {persona.name.split(" ").slice(-1)}
                  </Link>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="hover-lift w-full sm:w-auto"
                    onClick={() => void playOpening(scenario.id)}
                  >
                    <Volume2 className="size-4" />
                    {previewId === scenario.id ? "הרופא מדבר…" : "שמעו את הרופא"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      onClick={onClick}
      className={cn(
        "rounded-full transition-all",
        active ? "shadow-sm" : "hover:-translate-y-0.5 hover:border-primary/40",
      )}
    >
      {icon}
      {label}
    </Button>
  );
}
