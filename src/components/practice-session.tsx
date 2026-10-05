"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Loader2,
  Mic,
  MicOff,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import { DebriefPanel } from "@/components/debrief-panel";
import { Transcript } from "@/components/transcript";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { doctorTypeLabel, styleLabel } from "@/lib/content";
import { buildDebrief } from "@/lib/debrief";
import { createDialogueState, generateDoctorReply } from "@/lib/dialogue";
import {
  getSpeechRecognitionConstructor,
  getSpeechSupport,
  HEBREW_SPEECH_LANG,
  mapRecognitionError,
  requestMicAccess,
  speakHebrew,
  stopSpeaking,
  type MicErrorCode,
} from "@/lib/speech";
import type {
  DebriefNotes,
  DialogueState,
  DoctorTurnResult,
  Persona,
  Scenario,
  TranscriptTurn,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type SessionStatus =
  | "booting"
  | "ready"
  | "listening"
  | "thinking"
  | "speaking"
  | "ended";

const ERROR_COPY: Record<MicErrorCode, { title: string; body: string }> = {
  "permission-denied": {
    title: "הגישה למיקרופון נחסמה",
    body: "אפשרו מיקרופון בהגדרות הדפדפן, או המשיכו באימון באמצעות הקלדה בעברית.",
  },
  "no-recognition": {
    title: "אין זיהוי דיבור בעברית בדפדפן זה",
    body: "Chrome או Edge תומכים בדרך כלל. בינתיים אפשר להקליד תור בעברית בתיבה למטה.",
  },
  "no-hebrew-voice": {
    title: "לא נמצא קול עברי להקראה",
    body: "התמליל ימשיך לעבוד. בדפדפן עם קול he-IL תשמעו גם את הרופא.",
  },
  "no-speech": {
    title: "לא זוהה דיבור",
    body: "נסו שוב קרוב למיקרופון, או כתבו את המשפט בעברית אם הסביבה שקטה מדי — או בלי מיקרופון.",
  },
  "audio-capture": {
    title: "לא נמצא מיקרופון",
    body: "חברו מיקרופון או השתמשו בתיבת ההקלדה כדי לדמות תור.",
  },
  "not-supported": {
    title: "הדפדפן לא תומך בדיבור",
    body: "אפשר להשלים את האימון בהקלדה. לחוויית קול מלאה השתמשו ב-Chrome.",
  },
};

export function PracticeSession({
  scenario,
  persona,
}: {
  scenario: Scenario;
  persona: Persona;
}) {
  const [status, setStatus] = useState<SessionStatus>("booting");
  const [turns, setTurns] = useState<TranscriptTurn[]>(() => [
    {
      id: "doctor-opening",
      role: "doctor",
      text: scenario.openingLine,
      phase: "resist",
    },
  ]);
  const [interim, setInterim] = useState("");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<MicErrorCode | null>(null);
  const [support, setSupport] = useState(() =>
    typeof window === "undefined"
      ? { recognition: false, synthesis: false, hebrewVoice: false }
      : getSpeechSupport(),
  );
  const [debrief, setDebrief] = useState<DebriefNotes | null>(null);
  const [showKeyboard, setShowKeyboard] = useState(true);

  const stateRef = useRef<DialogueState>(createDialogueState());
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listeningRef = useRef(false);
  const endedRef = useRef(false);
  const pendingFinalRef = useRef("");
  const turnCounter = useRef(0);

  const nextId = useCallback((role: TranscriptTurn["role"]) => {
    turnCounter.current += 1;
    return `${role}-${turnCounter.current}`;
  }, []);

  const speakDoctor = useCallback(
    async (text: string) => {
      setStatus("speaking");
      const result = await speakHebrew({
        text,
        rate: persona.voice.rate,
        pitch: persona.voice.pitch,
        gender: persona.gender,
      });
      if (!result.hebrewVoice) {
        setSupport((current) => ({ ...current, hebrewVoice: false }));
        setError((current) => current ?? "no-hebrew-voice");
      }
      setStatus("ready");
    },
    [persona.gender, persona.voice.pitch, persona.voice.rate],
  );

  const submitManagerText = useCallback(
    async (text: string) => {
      if (endedRef.current) return;
      const trimmed = text.trim();
      if (!trimmed) {
        setError("no-speech");
        return;
      }
      stopSpeaking();
      setError(null);
      setInterim("");
      setTyped("");
      setTurns((current) => [
        ...current,
        { id: nextId("manager"), role: "manager", text: trimmed },
      ]);
      setStatus("thinking");

      const snapshot = stateRef.current;
      const local = generateDoctorReply(scenario, snapshot, trimmed);
      let result: DoctorTurnResult = local;

      try {
        const response = await fetch("/api/doctor-reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenarioId: scenario.id,
            userText: trimmed,
            state: snapshot,
          }),
        });
        if (response.ok) {
          const payload = (await response.json()) as DoctorTurnResult;
          if (payload?.reply) {
            result = {
              ...payload,
              state: payload.state ?? local.state,
              reply: payload.reply,
            };
          }
        }
      } catch {
        result = local;
      }

      stateRef.current = result.state;
      setTurns((current) => [
        ...current,
        {
          id: nextId("doctor"),
          role: "doctor",
          text: result.reply,
          phase: result.state.phase,
        },
      ]);
      await speakDoctor(result.reply);
    },
    [nextId, scenario, speakDoctor],
  );

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setInterim("");
    if (status === "listening") setStatus("ready");
  }, [status]);

  const startListening = useCallback(async () => {
    if (status === "thinking" || status === "speaking" || status === "ended") {
      return;
    }
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setError("no-recognition");
      setShowKeyboard(true);
      return;
    }
    const permissionError = await requestMicAccess();
    if (permissionError) {
      setError(permissionError);
      setShowKeyboard(true);
      return;
    }

    stopSpeaking();
    stopListening();
    pendingFinalRef.current = "";
    const recognition = new Recognition();
    recognition.lang = HEBREW_SPEECH_LANG;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      listeningRef.current = true;
      setStatus("listening");
      setError(null);
    };
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) finalText += piece;
        else interimText += piece;
      }
      if (finalText) {
        pendingFinalRef.current = `${pendingFinalRef.current} ${finalText}`.trim();
      }
      setInterim(interimText || pendingFinalRef.current);
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const mapped = mapRecognitionError(event.error);
      setError(mapped);
      if (mapped === "permission-denied" || mapped === "no-recognition") {
        setShowKeyboard(true);
      }
    };
    recognition.onend = () => {
      const finalText = pendingFinalRef.current.trim();
      listeningRef.current = false;
      recognitionRef.current = null;
      setInterim("");
      if (endedRef.current) return;
      if (finalText) {
        void submitManagerText(finalText);
      } else {
        setStatus("ready");
        setError((current) => current ?? "no-speech");
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setError("no-recognition");
    }
  }, [status, stopListening, submitManagerText]);

  const endSession = useCallback(() => {
    endedRef.current = true;
    listeningRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    stopSpeaking();
    setStatus("ended");
    setDebrief(buildDebrief(scenario, stateRef.current));
  }, [scenario]);

  useEffect(() => {
    let cancelled = false;

    const onVoices = () => {
      const detected = getSpeechSupport();
      setSupport(detected);
      if (!detected.recognition) setError("no-recognition");
      else if (!detected.synthesis) setError("not-supported");
    };

    void (async () => {
      onVoices();
      await speakDoctor(scenario.openingLine);
      if (!cancelled) setStatus("ready");
    })();

    window.speechSynthesis?.addEventListener("voiceschanged", onVoices);

    return () => {
      cancelled = true;
      recognitionRef.current?.abort();
      stopSpeaking();
      window.speechSynthesis?.removeEventListener("voiceschanged", onVoices);
    };
    // Opening line should run once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusLabel = useMemo(() => {
    switch (status) {
      case "booting":
        return "טוען את הרופא…";
      case "listening":
        return "מאזינים לכם";
      case "thinking":
        return "הרופא חושב…";
      case "speaking":
        return "הרופא מדבר";
      case "ended":
        return "השיחה הסתיימה";
      default:
        return "מוכנים לתור הבא";
    }
  }, [status]);

  const busy = status === "thinking" || status === "speaking" || status === "booting";

  return (
    <div className="flex flex-col gap-5 pb-28 lg:pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            חזרה לכל התרחישים
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{scenario.title}</h1>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{doctorTypeLabel(scenario.doctorType)}</Badge>
            <Badge variant="outline">{styleLabel(persona.style)}</Badge>
            <Badge variant="outline">{statusLabel}</Badge>
          </div>
        </div>
        {status !== "ended" ? (
          <Button variant="outline" onClick={endSession} className="self-start">
            <Square className="size-3.5" />
            סיום שיחה
          </Button>
        ) : (
          <Link href="/" className={cn(buttonVariants(), "self-start")}>
            תרחיש אחר
          </Link>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex flex-col gap-4">
          {error ? (
            <Alert
              className="text-start"
              variant={error === "no-hebrew-voice" ? "default" : "destructive"}
            >
              {error === "no-hebrew-voice" ? (
                <VolumeX className="size-4" />
              ) : (
                <MicOff className="size-4" />
              )}
              <AlertTitle>{ERROR_COPY[error].title}</AlertTitle>
              <AlertDescription>{ERROR_COPY[error].body}</AlertDescription>
            </Alert>
          ) : null}

          <Transcript
            turns={turns}
            interim={status === "listening" ? interim : undefined}
            doctorName={persona.name}
          />

          {status === "thinking" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              הרופא מנסח תשובה בעברית…
            </div>
          ) : null}

          {status !== "ended" ? (
            <div className="hidden gap-3 rounded-xl border bg-card p-3 lg:flex lg:flex-col">
              <Controls
                status={status}
                busy={busy}
                support={support}
                showKeyboard={showKeyboard}
                typed={typed}
                sampleLines={scenario.sampleLines}
                onStartListening={() => void startListening()}
                onStopListening={stopListening}
                onToggleKeyboard={() => setShowKeyboard((value) => !value)}
                onTypedChange={setTyped}
                onSubmitTyped={() => void submitManagerText(typed)}
                onSample={(line) => void submitManagerText(line)}
                onStopSpeech={stopSpeaking}
              />
            </div>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                  {persona.portraitInitials}
                </span>
                <div>
                  <CardTitle className="text-base">{persona.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {persona.clinic} · {persona.yearsInClinic} שנות ותק
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm leading-6">
              <p>{persona.stance}</p>
              <p className="text-muted-foreground">{scenario.tension}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">מה לנסות בשיחה</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2 text-sm leading-6">
                {scenario.managerGoals.map((goal) => (
                  <li key={goal} className="rounded-lg bg-muted/60 px-3 py-2">
                    {goal}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>

      {status === "ended" && debrief ? <DebriefPanel notes={debrief} /> : null}

      {status !== "ended" ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 p-3 backdrop-blur lg:hidden">
          <Controls
            status={status}
            busy={busy}
            support={support}
            showKeyboard={showKeyboard}
            typed={typed}
            sampleLines={scenario.sampleLines}
            onStartListening={() => void startListening()}
            onStopListening={stopListening}
            onToggleKeyboard={() => setShowKeyboard((value) => !value)}
            onTypedChange={setTyped}
            onSubmitTyped={() => void submitManagerText(typed)}
            onSample={(line) => void submitManagerText(line)}
            onStopSpeech={stopSpeaking}
          />
        </div>
      ) : null}
    </div>
  );
}

function Controls({
  status,
  busy,
  support,
  showKeyboard,
  typed,
  sampleLines,
  onStartListening,
  onStopListening,
  onToggleKeyboard,
  onTypedChange,
  onSubmitTyped,
  onSample,
  onStopSpeech,
}: {
  status: SessionStatus;
  busy: boolean;
  support: { recognition: boolean; synthesis: boolean; hebrewVoice: boolean };
  showKeyboard: boolean;
  typed: string;
  sampleLines: string[];
  onStartListening: () => void;
  onStopListening: () => void;
  onToggleKeyboard: () => void;
  onTypedChange: (value: string) => void;
  onSubmitTyped: () => void;
  onSample: (line: string) => void;
  onStopSpeech: () => void;
}) {
  const listening = status === "listening";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {listening ? (
          <Button
            size="lg"
            variant="destructive"
            onClick={onStopListening}
            className="min-h-11 flex-1 sm:flex-none"
          >
            <MicOff className="size-4" />
            עצירת הקלטה
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={onStartListening}
            disabled={busy || !support.recognition}
            className="min-h-11 flex-1 sm:flex-none"
          >
            <Mic className="size-4" />
            דיבור בעברית
          </Button>
        )}
        <Button
          size="lg"
          variant="outline"
          onClick={onToggleKeyboard}
          className="min-h-11"
        >
          <Keyboard className="size-4" />
          הקלדה
        </Button>
        {status === "speaking" ? (
          <Button size="lg" variant="ghost" onClick={onStopSpeech} className="min-h-11">
            <VolumeX className="size-4" />
            השתקת קול
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Volume2 className="size-3.5" />
            {support.hebrewVoice ? "קול עברי זמין" : "בלי קול עברי — התמליל פעיל"}
          </span>
        )}
      </div>

      {showKeyboard ? (
        <div className="flex flex-col gap-2">
          <Textarea
            value={typed}
            onChange={(event) => onTypedChange(event.target.value)}
            placeholder="כתבו כאן תור בעברית — שימושי כשאין מיקרופון"
            disabled={busy}
            className="min-h-20"
            dir="rtl"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={onSubmitTyped}
              disabled={busy || typed.trim().length === 0}
            >
              שליחת תור
            </Button>
            {sampleLines.map((line) => (
              <Button
                key={line}
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => onSample(line)}
                className="max-w-full whitespace-normal text-start leading-5"
              >
                {line}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
