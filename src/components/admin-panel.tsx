"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Copy,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Volume2,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createBlankScenario,
  duplicateScenario,
  isSeedScenario,
  sanitizeScenario,
} from "@/lib/catalog";
import {
  SIGNAL_LABELS,
  ageBandLabel,
  doctorTypeLabel,
  genderLabel,
  styleLabel,
} from "@/lib/content";
import { generateOpening } from "@/lib/dialogue";
import { speakHebrew, stopSpeaking } from "@/lib/speech";
import type {
  CoachingSignal,
  DialoguePhase,
  DoctorType,
  Persona,
  Scenario,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const SIGNAL_ORDER: CoachingSignal[] = [
  "empathy",
  "data",
  "partnership",
  "command",
  "criticism",
];

const PHASE_FIELDS: { id: DialoguePhase; label: string }[] = [
  { id: "resist", label: "התנגדות — שורות הרופא בהתחלה" },
  { id: "deflect", label: "הטיה — כשיש שיקוף אבל עוד אין ברית" },
  { id: "challenge", label: "אתגר — הרופא בודק אם תעמדו מאחוריו" },
  { id: "soften", label: "ריכוך — כשהשיחה עובדת" },
];

export function AdminPanel() {
  const {
    scenarios,
    personas,
    upsertScenario,
    removeScenario,
    resetCatalog,
    getPersona,
  } = useCatalog();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Scenario | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editingId) return;
    window.scrollTo({ top: 0, behavior: "auto" });
    editorRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
  }, [editingId]);

  const startCreate = () => {
    const next = createBlankScenario(personas[0]);
    setDraft(next);
    setEditingId(next.id);
  };

  const startEdit = (scenario: Scenario) => {
    setDraft(structuredClone(scenario));
    setEditingId(scenario.id);
  };

  const startDuplicate = (scenario: Scenario) => {
    const copy = duplicateScenario(scenario);
    setDraft(copy);
    setEditingId(copy.id);
  };

  const saveDraft = () => {
    if (!draft) return;
    if (!draft.title.trim() || !draft.openingLine.trim()) {
      toast.error("חסרים כותרת או משפט פתיחה של הרופא.");
      return;
    }
    const clean = sanitizeScenario(draft);
    upsertScenario(clean);
    setDraft(clean);
    setEditingId(clean.id);
    toast.success("התרחיש נשמר במכשיר זה.");
  };

  const handleDelete = (id: string) => {
    const ok = window.confirm(
      isSeedScenario(id)
        ? "להסתיר את התרחיש המובנה מהרשימה במכשיר זה?"
        : "למחוק את התרחיש המותאם מהמכשיר?",
    );
    if (!ok) return;
    removeScenario(id);
    if (editingId === id) {
      setEditingId(null);
      setDraft(null);
    }
    toast.success("התרחיש הוסר מהמכשיר.");
  };

  const handleReset = () => {
    const ok = window.confirm("לאפס את כל התרחישים לברירת המחדל של מכבי?");
    if (!ok) return;
    resetCatalog();
    setEditingId(null);
    setDraft(null);
    toast.success("הקטלוג אופס.");
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3 border-b border-border pb-8">
        <p className="text-sm font-medium text-primary">ניהול תרחישים</p>
        <h1 className="text-3xl font-semibold">התאימו את חדר האימון למרפאה שלכם</h1>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
          כאן עורכים כל תרחיש, מחליפים רופא (גבר/אישה, ותיק/צעיר), ומוסיפים
          שיחות חדשות. השינויים נשמרים בדפדפן זה בלבד — בלי שרת ובלי סיסמה.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="admin-new-scenario"
            onClick={startCreate}
            className={cn(buttonVariants(), "hover-lift")}
          >
            <Plus className="size-4" />
            תרחיש חדש
          </button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="hover-lift"
          >
            <RotateCcw className="size-4" />
            איפוס לברירת מחדל
          </Button>
        </div>
      </section>

      {draft ? (
        <div ref={editorRef} id="scenario-editor" className="scroll-mt-24">
          <ScenarioEditor
            draft={draft}
            personas={personas}
            onChange={setDraft}
            onSave={saveDraft}
            onCancel={() => {
              setDraft(null);
              setEditingId(null);
              stopSpeaking();
            }}
          />
        </div>
      ) : null}

      <div className="grid gap-4">
        {scenarios.map((scenario, index) => {
          const persona = getPersona(scenario.personaId);
          if (!persona) return null;
          const selected = editingId === scenario.id;
          return (
            <Card
              key={scenario.id}
              className={cn(
                "lift-card stagger-in bg-white ring-border shadow-none",
                selected && "ring-2 ring-primary/40",
              )}
              style={{ animationDelay: `${index * 50}ms` }}
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
                    {isSeedScenario(scenario.id) ? "מובנה" : "מותאם"}
                  </Badge>
                  <Badge variant="outline">
                    {scenario.firstMeeting ? "פגישה ראשונה" : "נימוסין"}
                  </Badge>
                </div>
                <CardTitle>{scenario.title}</CardTitle>
                <CardDescription className="text-start leading-6">
                  {persona.name} · {scenario.tension}
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-wrap gap-2 bg-secondary/40">
                <button
                  type="button"
                  data-testid="admin-edit-scenario"
                  onClick={() => startEdit(scenario)}
                  className={cn(buttonVariants({ size: "sm" }), "hover-lift")}
                >
                  <Pencil className="size-3.5" />
                  עריכה
                </button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => startDuplicate(scenario)}
                  className="hover-lift"
                >
                  <Copy className="size-3.5" />
                  שכפול
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="hover-lift"
                  onClick={() =>
                    void speakHebrew({
                      text: generateOpening(scenario).reply,
                      rate: persona.voice.rate,
                      pitch: persona.voice.pitch,
                      gender: persona.gender,
                      ageBand: persona.ageBand,
                    })
                  }
                >
                  <Volume2 className="size-3.5" />
                  שמעו פתיחה
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(scenario.id)}
                >
                  <Trash2 className="size-3.5" />
                  {isSeedScenario(scenario.id) ? "הסתרה" : "מחיקה"}
                </Button>
                <Link
                  href={`/practice/${scenario.id}`}
                  className="ms-auto text-sm text-primary underline-offset-4 hover:underline"
                >
                  לאימון
                </Link>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ScenarioEditor({
  draft,
  personas,
  onChange,
  onSave,
  onCancel,
}: {
  draft: Scenario;
  personas: Persona[];
  onChange: (scenario: Scenario) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const persona =
    personas.find((item) => item.id === draft.personaId) ?? personas[0];
  const compatible = personas.filter(
    (item) => item.doctorType === draft.doctorType,
  );

  const update = (patch: Partial<Scenario>) => {
    onChange({ ...draft, ...patch });
  };

  const setDoctorType = (doctorType: DoctorType) => {
    const nextPersona =
      personas.find(
        (item) => item.doctorType === doctorType && item.id === draft.personaId,
      ) ?? personas.find((item) => item.doctorType === doctorType) ?? personas[0];
    update({ doctorType, personaId: nextPersona.id });
  };

  return (
    <Card className="bg-white shadow-none ring-2 ring-primary/40">
      <CardHeader className="border-b border-border">
        <CardTitle>טופס עריכה</CardTitle>
        <CardDescription className="text-start">
          הטופס נפתח כאן למעלה. שורות מופרדות בפסיקים בשדות המילים; תשובות הרופא —
          שורה לכל משפט.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-2">
        <Field label="כותרת">
          <Input
            value={draft.title}
            onChange={(event) => update({ title: event.target.value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="סוג רופא">
            <select
              className="select-field"
              value={draft.doctorType}
              onChange={(event) =>
                setDoctorType(event.target.value as DoctorType)
              }
            >
              <option value="family">רופא משפחה</option>
              <option value="pediatrician">רופא/ת ילדים</option>
            </select>
          </Field>
          <Field label="דמות וקול">
            <select
              className="select-field"
              value={draft.personaId}
              onChange={(event) => update({ personaId: event.target.value })}
            >
              {(compatible.length ? compatible : personas).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {genderLabel(item.gender)} ·{" "}
                  {ageBandLabel(item.ageBand)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
          {persona.name} · {styleLabel(persona.style)} · הקול: קצב {persona.voice.rate}, גובה{" "}
          {persona.voice.pitch}
        </p>
        <label className="flex items-start gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-3 text-sm leading-6">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-primary"
            checked={Boolean(draft.firstMeeting)}
            onChange={(event) => update({ firstMeeting: event.target.checked })}
          />
          <span>
            <span className="font-medium">פגישה ראשונה</span>
            <span className="block text-muted-foreground">
              מסומן: היכרות (שם, תפקיד) לפני הנושא. לא מסומן: נימוסין קצרים ואז הנושא.
            </span>
          </span>
        </label>
        <Field label="המתח בחדר">
          <Textarea
            value={draft.tension}
            onChange={(event) => update({ tension: event.target.value })}
            className="min-h-20"
          />
        </Field>
        <Field label="הערת מרפאה / נתון">
          <Textarea
            value={draft.clinicNote}
            onChange={(event) => update({ clinicNote: event.target.value })}
            className="min-h-16"
          />
        </Field>
        <Field label="כיוון לנושא המרכזי (אחרי נימוסין או היכרות)">
          <Textarea
            value={draft.openingLine}
            onChange={(event) => update({ openingLine: event.target.value })}
            className="min-h-24"
          />
        </Field>
        <Field label="מטרות למנהל — שורה לכל מטרה">
          <Textarea
            value={draft.managerGoals.join("\n")}
            onChange={(event) =>
              update({ managerGoals: event.target.value.split("\n") })
            }
            className="min-h-24"
          />
        </Field>
        <Field label="משפטי אימון מוכנים — שורה לכל משפט">
          <Textarea
            value={draft.sampleLines.join("\n")}
            onChange={(event) =>
              update({ sampleLines: event.target.value.split("\n") })
            }
            className="min-h-24"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {SIGNAL_ORDER.map((signal) => (
            <Field key={signal} label={`מילות מפתח · ${SIGNAL_LABELS[signal]}`}>
              <Input
                value={draft.keywords[signal].join(", ")}
                onChange={(event) =>
                  update({
                    keywords: {
                      ...draft.keywords,
                      [signal]: event.target.value
                        .split(/[,\n]/)
                        .map((item) => item.trim())
                        .filter(Boolean),
                    },
                  })
                }
              />
            </Field>
          ))}
        </div>
        {PHASE_FIELDS.map((phase) => (
          <Field key={phase.id} label={phase.label}>
            <Textarea
              value={draft.replies[phase.id].join("\n")}
              onChange={(event) =>
                update({
                  replies: {
                    ...draft.replies,
                    [phase.id]: event.target.value.split("\n"),
                  },
                })
              }
              className="min-h-24"
            />
          </Field>
        ))}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 bg-secondary/40">
        <button
          type="button"
          data-testid="admin-save-scenario"
          onClick={onSave}
          className={cn(buttonVariants(), "hover-lift")}
        >
          שמירת תרחיש
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={cn(buttonVariants({ variant: "outline" }), "hover-lift")}
        >
          סגירה
        </button>
      </CardFooter>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
