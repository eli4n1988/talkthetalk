"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Baby, Stethoscope, Search } from "lucide-react";
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
import { SCENARIOS, doctorTypeLabel, getPersona, styleLabel } from "@/lib/content";
import type { DoctorType } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | DoctorType;

export function ScenarioPicker() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const scenarios = useMemo(() => {
    const needle = query.trim();
    return SCENARIOS.filter((scenario) => {
      const persona = getPersona(scenario.personaId);
      if (filter !== "all" && scenario.doctorType !== filter) return false;
      if (!needle) return true;
      const haystack = [
        scenario.title,
        scenario.tension,
        persona?.name,
        persona?.clinic,
      ]
        .filter(Boolean)
        .join(" ");
      return haystack.includes(needle);
    });
  }, [filter, query]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
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
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="חיפוש לפי מתח, רופא או מרפאה"
            className="h-9 pr-9"
            aria-label="חיפוש תרחישים"
          />
        </div>
      </div>

      {scenarios.length === 0 ? (
        <Card className="border-dashed bg-card/70 py-12 text-center">
          <CardHeader>
            <CardTitle>אין תרחישים מתאימים</CardTitle>
            <CardDescription>
              נסו מילה אחרת, או אפסו את הסינון כדי לראות את כל שיחות האימון.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center border-t-0 bg-transparent">
            <Button
              variant="outline"
              onClick={() => {
                setFilter("all");
                setQuery("");
              }}
            >
              איפוס סינון
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {scenarios.map((scenario) => {
            const persona = getPersona(scenario.personaId);
            if (!persona) return null;
            return (
              <Card
                key={scenario.id}
                className="bg-card/90 transition-shadow hover:shadow-md"
              >
                <CardHeader className="border-b">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">
                      {doctorTypeLabel(scenario.doctorType)}
                    </Badge>
                    <Badge variant="outline">{styleLabel(persona.style)}</Badge>
                  </div>
                  <CardTitle className="text-lg">{scenario.title}</CardTitle>
                  <CardDescription className="text-start leading-6">
                    {scenario.tension}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {persona.portraitInitials}
                    </span>
                    <div>
                      <p className="font-medium">{persona.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {persona.clinic} · {persona.yearsInClinic} שנות ותק
                      </p>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {scenario.clinicNote}
                  </p>
                </CardContent>
                <CardFooter>
                  <Link
                    href={`/practice/${scenario.id}`}
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "w-full sm:w-auto",
                    )}
                  >
                    התחלת אימון קולי
                  </Link>
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
      className="rounded-full"
    >
      {icon}
      {label}
    </Button>
  );
}
