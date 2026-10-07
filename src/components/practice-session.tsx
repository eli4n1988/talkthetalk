"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  Keyboard,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { DebriefPanel } from "@/components/debrief-panel";
import { DoctorPortrait } from "@/components/doctor-portrait";
import { Transcript } from "@/components/transcript";
import { VoiceAnalysis } from "@/components/voice-analysis";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  ageBandLabel,
  BEAT_LABELS,
  doctorTypeLabel,
  genderLabel,
  rapportSamples,
  styleLabel,
} from "@/lib/content";
import { buildDebrief } from "@/lib/debrief";
import {
  createDialogueState,
  generateDoctorReply,
  generateOpening,
} from "@/lib/dialogue";
import { needsPlaybackGesture } from "@/lib/browser";
import {
  getSpeechRecognitionConstructor,
  getSpeechSupport,
  HEBREW_SPEECH_LANG,
  mapRecognitionError,
  requestMicAccess,
  shouldUseServerTranscription,
  speakDoctorLine,
  startAudioRecording,
  stopAudioRecording,
  stopSpeaking,
  transcribeRecording,
  unlockAudioPlayback,
  type MicErrorCode,
} from "@/lib/speech";
import type {
  DebriefNotes,
  DialogueState,
  DoctorTurnResult,
  Persona,
  Scenario,
  TranscriptTurn,
  VoiceProvider,
} from "@/lib/types";
import type { ManagerProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";

type SessionStatus = "ready" | "listening" | "thinking" | "speaking" | "ended";

const ERROR_COPY: Record<MicErrorCode, { title: string; body: string }> = {
  "permission-denied": {
    title: "הגישה למיקרופון נחסמה",
    body: "אפשרו מיקרופון בהגדרות הדפדפן, או המשיכו באימון באמצעות הקלדה בעברית.",
  },
  "no-recognition": {
    title: "אין זיהוי דיבור בדפדפן זה",
    body: "בספארי באייפון מדברים בלחיצה — ההקלטה מתומללת בשרת. אם זה נכשל, אפשר להקליד בעברית.",
  },
  "no-hebrew-voice": {
    title: "לא נמצא קול עברי להקראה",
    body: "התמליל ימשיך לעבוד. בדפדפן עם קול he-IL תשמעו גם את הרופא.",
  },
  "no-speech": {
    title: "לא זוהה דיבור",
    body: "נסו שוב קרוב למיקרופון, או כתבו את המשפט בעברית אם הסביבה שקטה מדי.",
  },
  "audio-capture": {
    title: "לא נמצא מיקרופון",
    body: "חברו מיקרופון או השתמשו בתיבת ההקלדה כדי לדמות תור.",
  },
  "not-supported": {
    title: "הדפדפן לא תומך בדיבור",
    body: "אפשר להשלים את האימון בהקלדה. ספארי באייפון נתמך בהקלטה; Chrome ו-Edge תומכים גם בזיהוי חי.",
  },
  "transcribe-failed": {
    title: "לא הצלחנו לתמלל את מה שנאמר",
    body: "נסו לדבר שוב קרוב למיקרופון, או כתבו את המשפט בעברית בתיבה למטה.",
  },
};

export function PracticeSession({
  scenario,
  persona,
  manager,
}: {
  scenario: Scenario;
  persona: Persona;
  manager: ManagerProfile;
}) {
  const [status, setStatus] = useState<SessionStatus>("thinking");
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [interim, setInterim] = useState("");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<MicErrorCode | null>(null);
  const [support, setSupport] = useState({
    recognition: false,
    synthesis: false,
    hebrewVoice: false,
  });
  const [debrief, setDebrief] = useState<DebriefNotes | null>(null);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [lastManagerText, setLastManagerText] = useState("");
  const [signals, setSignals] = useState(() =>
    createDialogueState(scenario.firstMeeting).signals,
  );
  const [phase, setPhase] = useState(
    () => createDialogueState(scenario.firstMeeting).phase,
  );
  const [beat, setBeat] = useState(
    () => createDialogueState(scenario.firstMeeting).beat,
  );
  const [voiceSource, setVoiceSource] = useState<VoiceProvider>("browser");
  const [awaitingStart, setAwaitingStart] = useState(false);

  const stateRef = useRef<DialogueState>(
    createDialogueState(scenario.firstMeeting),
  );
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listeningRef = useRef(false);
  const endedRef = useRef(false);
  const pendingFinalRef = useRef("");
  const interimRef = useRef("");
  const turnCounter = useRef(0);
  const statusRef = useRef<SessionStatus>("thinking");
  const turnsRef = useRef<TranscriptTurn[]>([]);
  const pendingOpeningRef = useRef<string | null>(null);
  const usingRecorderRef = useRef(false);

  const nextId = useCallback((role: TranscriptTurn["role"]) => {
    turnCounter.current += 1;
    return `${role}-${turnCounter.current}`;
  }, []);

  const speakDoctor = useCallback(
    async (text: string) => {
      setStatus((current) => (current === "ended" ? current : "speaking"));
      await unlockAudioPlayback();
      const result = await speakDoctorLine({
        text,
        rate: persona.voice.rate,
        pitch: persona.voice.pitch,
        gender: persona.gender,
        ageBand: persona.ageBand,
        personaId: persona.id,
      });
      if (endedRef.current) return;
      if (result.neural) {
        setVoiceSource(result.provider === "openai" ? "openai" : "gemini");
        setSupport((current) => ({ ...current, hebrewVoice: true }));
        setError((current) =>
          current === "no-hebrew-voice" ? null : current,
        );
      } else if (!result.hebrewVoice) {
        setSupport((current) => ({ ...current, hebrewVoice: false }));
        setError((current) =>
          current && current !== "no-hebrew-voice" ? current : "no-hebrew-voice",
        );
      }
      setStatus((current) =>
        current === "ended" || current === "listening" || current === "thinking"
          ? current
          : "ready",
      );
    },
    [persona],
  );

  const submitManagerText = useCallback(
    async (text: string) => {
      if (endedRef.current) return;
      const trimmed = text.trim();
      if (!trimmed) {
        setError("no-speech");
        return;
      }
      await unlockAudioPlayback();
      stopSpeaking();
      setError(null);
      setInterim("");
      setTyped("");
      setLastManagerText(trimmed);
      setTurns((current) => [
        ...current,
        { id: nextId("manager"), role: "manager", text: trimmed },
      ]);
      setStatus("thinking");

      const snapshot = stateRef.current;
      const local = generateDoctorReply(scenario, snapshot, trimmed, manager);
      let result: DoctorTurnResult = local;
      const history: TranscriptTurn[] = [
        ...turnsRef.current,
        { id: "pending-manager", role: "manager", text: trimmed },
      ];

      try {
        const response = await fetch("/api/doctor-reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenarioId: scenario.id,
            userText: trimmed,
            state: snapshot,
            scenario,
            persona,
            history,
            kind: "turn",
            manager,
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
      setSignals(result.state.signals);
      setPhase(result.state.phase);
      setBeat(result.state.beat);
      const spoken = speakDoctor(result.reply);
      setTurns((current) => [
        ...current,
        {
          id: nextId("doctor"),
          role: "doctor",
          text: result.reply,
          phase: result.state.phase,
        },
      ]);
      await spoken;
    },
    [nextId, persona, manager, scenario, speakDoctor],
  );

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    if (usingRecorderRef.current) {
      usingRecorderRef.current = false;
      setInterim("");
      void (async () => {
        setStatus("thinking");
        const blob = await stopAudioRecording();
        if (endedRef.current) return;
        if (!blob) {
          setError("no-speech");
          setStatus("ready");
          return;
        }
        const text = await transcribeRecording(blob);
        if (endedRef.current) return;
        if (!text) {
          setError("transcribe-failed");
          setShowKeyboard(true);
          setStatus("ready");
          return;
        }
        void submitManagerText(text);
      })();
      return;
    }
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setInterim("");
    if (statusRef.current === "listening") setStatus("ready");
  }, [submitManagerText]);

  const startListening = useCallback(async () => {
    if (endedRef.current || statusRef.current === "thinking") return;
    await unlockAudioPlayback();
    if (pendingOpeningRef.current) {
      const opening = pendingOpeningRef.current;
      pendingOpeningRef.current = null;
      setAwaitingStart(false);
      await speakDoctor(opening);
      if (endedRef.current) return;
    }
    if (shouldUseServerTranscription()) {
      stopSpeaking();
      const recordError = await startAudioRecording();
      if (recordError) {
        setError(recordError);
        setShowKeyboard(true);
        setStatus("ready");
        return;
      }
      usingRecorderRef.current = true;
      listeningRef.current = true;
      setStatus("listening");
      setError(null);
      setInterim("מקליטים… לחצו «סיימתי לדבר» כשתסיימו.");
      return;
    }
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setError("no-recognition");
      setShowKeyboard(true);
      setStatus("ready");
      return;
    }
    const permissionError = await requestMicAccess();
    if (permissionError) {
      setError(permissionError);
      setShowKeyboard(true);
      setStatus("ready");
      return;
    }

    stopSpeaking();
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    pendingFinalRef.current = "";
    interimRef.current = "";
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
      interimRef.current = interimText;
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
      const finalText =
        `${pendingFinalRef.current} ${interimRef.current}`.trim();
      pendingFinalRef.current = "";
      interimRef.current = "";
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
      setStatus("ready");
    }
  }, [speakDoctor, submitManagerText]);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const endSession = useCallback(() => {
    endedRef.current = true;
    listeningRef.current = false;
    usingRecorderRef.current = false;
    pendingOpeningRef.current = null;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    void stopAudioRecording();
    stopSpeaking();
    setStatus("ended");
    setDebrief(buildDebrief(scenario, stateRef.current));
  }, [scenario]);

  const beginConversation = useCallback(async () => {
    if (endedRef.current) return;
    await unlockAudioPlayback();
    const opening = pendingOpeningRef.current;
    pendingOpeningRef.current = null;
    setAwaitingStart(false);
    if (opening) await speakDoctor(opening);
  }, [speakDoctor]);

  useEffect(() => {
    const onVoices = () => {
      const detected = getSpeechSupport();
      setSupport(detected);
      if (!detected.recognition) {
        setError("no-recognition");
        setShowKeyboard(true);
      }
    };

    void (async () => {
      onVoices();
      const local = generateOpening(scenario, manager);
      let result = local;
      try {
        const response = await fetch("/api/doctor-reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenarioId: scenario.id,
            scenario,
            persona,
            history: [],
            kind: "opening",
            manager,
          }),
        });
        if (response.ok) {
          const payload = (await response.json()) as DoctorTurnResult;
          if (payload?.reply) result = payload;
        }
      } catch {
        result = local;
      }
      if (endedRef.current) return;
      stateRef.current = result.state;
      setSignals(result.state.signals);
      setPhase(result.state.phase);
      setBeat(result.state.beat);
      setTurns([
        {
          id: nextId("doctor"),
          role: "doctor",
          text: result.reply,
          phase: result.state.phase,
        },
      ]);
      if (needsPlaybackGesture()) {
        pendingOpeningRef.current = result.reply;
        setAwaitingStart(true);
        setStatus("ready");
        return;
      }
      await speakDoctor(result.reply);
    })();

    window.speechSynthesis?.addEventListener("voiceschanged", onVoices);

    return () => {
      recognitionRef.current?.abort();
      usingRecorderRef.current = false;
      void stopAudioRecording();
      stopSpeaking();
      window.speechSynthesis?.removeEventListener("voiceschanged", onVoices);
    };
    // Opening line should run once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusLabel = useMemo(() => {
    switch (status) {
      case "listening":
        return "תורכם — המיקרופון פתוח";
      case "thinking":
        return "הרופא חושב…";
      case "speaking":
        return "הרופא מדבר אליכם";
      case "ended":
        return "השיחה הסתיימה";
      default:
        return "המיקרופון סגור — לחצו כדי לדבר";
    }
  }, [status]);

  const busy = status === "thinking";
  const talkDisabled = busy || status === "ended" || awaitingStart;
  const wordCount = lastManagerText.trim()
    ? lastManagerText.trim().split(/\s+/).length
    : 0;

  const handleStopSpeech = useCallback(() => {
    stopSpeaking();
    setStatus((current) =>
      current === "ended" || current === "listening" || current === "thinking"
        ? current
        : "ready",
    );
  }, []);

  return (
    <div className="flex min-w-0 flex-col gap-5 pb-40 lg:pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="nav-link w-fit text-sm text-muted-foreground"
          >
            חזרה לכל התרחישים
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{scenario.title}</h1>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{doctorTypeLabel(scenario.doctorType)}</Badge>
            <Badge variant="outline">{styleLabel(persona.style)}</Badge>
            <Badge variant="outline">
              {genderLabel(persona.gender)} · {ageBandLabel(persona.ageBand)}
            </Badge>
            <Badge variant="outline">
              {scenario.firstMeeting ? "פגישה ראשונה" : "כבר עובדים יחד"}
            </Badge>
            <Badge variant="outline">{BEAT_LABELS[beat]}</Badge>
            <Badge className="animate-status-glow">{statusLabel}</Badge>
          </div>
        </div>
        {status !== "ended" ? (
          <Button
            type="button"
            variant="outline"
            onClick={endSession}
            className="hover-lift self-start"
          >
            <PhoneOff className="size-3.5" />
            סיום שיחה
          </Button>
        ) : (
          <Link href="/" className={cn(buttonVariants(), "hover-lift self-start")}>
            תרחיש אחר
          </Link>
        )}
      </div>

      <VoiceStage
        persona={persona}
        status={status}
        talkDisabled={talkDisabled}
        awaitingStart={awaitingStart}
        onBeginConversation={() => void beginConversation()}
        onStartListening={() => void startListening()}
        onStopListening={stopListening}
      />

      <Card className="mx-auto w-full bg-white ring-border shadow-none">
        <CardContent className="px-4 py-5 text-center sm:px-10">
          <p className="text-base leading-7">{scenario.tension}</p>
          {scenario.clinicNote ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {scenario.clinicNote}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
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
              {turns.length === 0
                ? "הרופא נכנס לחדר ומתחיל בנימוסין או בהיכרות…"
                : "הרופא מנסח תשובה בעברית…"}
            </div>
          ) : null}

          {status !== "ended" ? (
            <div className="flex flex-col gap-3">
              <div className="hidden rounded-xl border border-border bg-white p-4 lg:block">
                <Controls
                  status={status}
                  busy={busy}
                  support={support}
                  showKeyboard={showKeyboard}
                  typed={typed}
                  neuralVoice={voiceSource !== "browser"}
                  talkDisabled={talkDisabled}
                  onStartListening={() => void startListening()}
                  onStopListening={stopListening}
                  onToggleKeyboard={() => setShowKeyboard((value) => !value)}
                  onTypedChange={setTyped}
                  onSubmitTyped={() => void submitManagerText(typed)}
                  onStopSpeech={handleStopSpeech}
                />
              </div>
              {showKeyboard ? (
                <SampleLines
                  lines={
                    beat === "issue"
                      ? scenario.sampleLines
                      : rapportSamples(scenario.firstMeeting, manager.gender)
                  }
                  disabled={busy || awaitingStart}
                  onSample={(line) => void submitManagerText(line)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowKeyboard(true)}
                  className="text-start text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                >
                  אין מיקרופון? פתחו הקלדה או משפט אימון מוכן
                </button>
              )}
            </div>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          <VoiceAnalysis
            scenario={scenario}
            liveText={status === "listening" ? interim : lastManagerText}
            totals={signals}
            phase={phase}
            beat={beat}
            listening={status === "listening"}
            wordCount={wordCount}
          />
          <Card className="lift-card bg-white ring-border shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-semibold">מה לנסות בשיחה</CardTitle>
            </CardHeader>
            <CardContent>
              {beat !== "issue" ? (
                <p className="mb-3 rounded-md border border-primary/20 bg-secondary px-3 py-2 text-sm leading-6">
                  {scenario.firstMeeting
                    ? "עכשיו היכרות: הציגו שם ותפקיד. הנושא הקליני יבוא אחרי שהרופא הכיר אתכם."
                    : "עכשיו נימוסין קצרים. אל תפתחו במדד — שאלו לשלום, ואז עברו לנושא."}
                </p>
              ) : null}
              <ul className="flex flex-col gap-2 text-sm leading-6">
                {scenario.managerGoals.map((goal) => (
                  <li
                    key={goal}
                    className="rounded-md border border-border bg-secondary/50 px-3 py-2 transition-colors hover:border-primary/30 hover:bg-secondary"
                  >
                    {goal}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>

      {status === "ended" && debrief ? <DebriefPanel notes={debrief} /> : null}

      {status !== "ended" && !awaitingStart ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm lg:hidden">
          <Controls
            status={status}
            busy={busy}
            support={support}
            showKeyboard={showKeyboard}
            typed={typed}
            neuralVoice={voiceSource !== "browser"}
            talkDisabled={talkDisabled}
            onStartListening={() => void startListening()}
            onStopListening={stopListening}
            onToggleKeyboard={() => setShowKeyboard((value) => !value)}
            onTypedChange={setTyped}
            onSubmitTyped={() => void submitManagerText(typed)}
            onStopSpeech={handleStopSpeech}
          />
        </div>
      ) : null}
    </div>
  );
}

function VoiceStage({
  persona,
  status,
  talkDisabled,
  awaitingStart,
  onBeginConversation,
  onStartListening,
  onStopListening,
}: {
  persona: Persona;
  status: SessionStatus;
  talkDisabled: boolean;
  awaitingStart: boolean;
  onBeginConversation: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
}) {
  const speaking = status === "speaking";
  const listening = status === "listening";

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-hero-panel p-4 text-white shadow-sm sm:p-5">
      {awaitingStart ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <DoctorPortrait persona={persona} sizeClass="size-24" />
          <p className="text-lg font-semibold">{persona.name}</p>
          <p className="max-w-md text-sm leading-6 text-white/80">
            בספארי ובאייפון צריך הקשה אחת כדי לשמוע את הרופא. אחר כך מדברים
            בלחיצה — ההקלטה מתומללת אוטומטית.
          </p>
          <Button
            type="button"
            size="lg"
            onClick={onBeginConversation}
            className="min-h-12 bg-white px-6 text-base font-semibold text-primary hover:bg-white/90"
          >
            <Volume2 className="size-4" />
            היכנסו לשיחה
          </Button>
        </div>
      ) : (
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full min-w-0 items-center gap-4 sm:w-auto">
          <div
            className={cn(
              "relative size-24 shrink-0 rounded-full",
              speaking && "avatar-speaking",
              listening && "avatar-listening",
            )}
          >
            <DoctorPortrait persona={persona} sizeClass="size-24" />
            {speaking || listening ? (
              <span className="pulse-ring" aria-hidden />
            ) : null}
          </div>
          <div>
            <p className="text-sm text-white/70">
              {speaking
                ? "שומעים את הרופא"
                : listening
                  ? "תורכם לדבר"
                  : "המיקרופון סגור"}
            </p>
            <p className="text-lg font-semibold">{persona.name}</p>
          </div>
        </div>
        <Waveform active={speaking || listening} listening={listening} />
        <div className="flex w-full max-w-xs flex-col items-center gap-2 sm:w-auto sm:items-end">
          <TalkButton
            listening={listening}
            disabled={talkDisabled}
            onStart={onStartListening}
            onStop={onStopListening}
            prominent
          />
          <p className="text-center text-xs leading-5 text-white/75 sm:text-end">
            {listening
              ? "המיקרופון פתוח. לחצו «סיימתי לדבר» כשתסיימו."
              : "המיקרופון סגור עד שתלחצו, כדי שלא ייכנסו רעשי רקע."}
          </p>
        </div>
      </div>
      )}
    </div>
  );
}

function Waveform({ active, listening }: { active: boolean; listening: boolean }) {
  return (
    <div
      className="flex h-12 items-end gap-1"
      aria-hidden
      data-active={active}
    >
      {Array.from({ length: 9 }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "wave-bar w-1.5 rounded-full",
            listening ? "bg-sky-200" : "bg-white",
            active ? "wave-bar-on" : "h-2 opacity-50",
          )}
          style={{ animationDelay: `${index * 90}ms` }}
        />
      ))}
    </div>
  );
}

function SampleLines({
  lines,
  disabled,
  onSample,
}: {
  lines: string[];
  disabled: boolean;
  onSample: (line: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-white p-4">
      <p className="text-sm font-medium text-primary">משפטי אימון מוכנים</p>
      <div className="flex flex-col gap-2">
        {lines.map((line) => (
          <button
            key={line}
            type="button"
            data-testid="sample-line"
            disabled={disabled}
            onClick={() => onSample(line)}
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "hover-lift h-auto min-h-11 w-full scroll-mb-40 justify-start whitespace-normal py-2 text-start leading-6",
            )}
          >
            {line}
          </button>
        ))}
      </div>
    </div>
  );
}

function TalkButton({
  listening,
  disabled,
  onStart,
  onStop,
  prominent = false,
}: {
  listening: boolean;
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
  prominent?: boolean;
}) {
  if (listening) {
    return (
      <Button
        type="button"
        size="lg"
        variant="destructive"
        onClick={onStop}
        data-testid="talk-button"
        className={cn(
          "min-h-11 w-full sm:w-auto sm:flex-none",
          prominent &&
            "min-h-12 flex-none bg-white px-5 text-base font-semibold text-destructive hover:bg-white/90",
        )}
      >
        <MicOff className="size-4" />
        סיימתי לדבר
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="lg"
      onClick={onStart}
      disabled={disabled}
      data-testid="talk-button"
      className={cn(
        "mic-cta min-h-11 w-full sm:w-auto sm:flex-none",
        prominent &&
          "min-h-12 flex-none bg-white px-5 text-base font-semibold text-primary shadow-lg hover:bg-white/90",
      )}
    >
      <Mic className="size-4" />
      לחצו כדי לדבר
    </Button>
  );
}

function Controls({
  status,
  busy,
  support,
  showKeyboard,
  typed,
  neuralVoice,
  talkDisabled,
  onStartListening,
  onStopListening,
  onToggleKeyboard,
  onTypedChange,
  onSubmitTyped,
  onStopSpeech,
}: {
  status: SessionStatus;
  busy: boolean;
  support: { recognition: boolean; synthesis: boolean; hebrewVoice: boolean };
  showKeyboard: boolean;
  typed: string;
  neuralVoice: boolean;
  talkDisabled: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  onToggleKeyboard: () => void;
  onTypedChange: (value: string) => void;
  onSubmitTyped: () => void;
  onStopSpeech: () => void;
}) {
  const listening = status === "listening";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <TalkButton
          listening={listening}
          disabled={talkDisabled}
          onStart={onStartListening}
          onStop={onStopListening}
        />
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={onToggleKeyboard}
          className="hover-lift min-h-11"
        >
          <Keyboard className="size-4" />
          הקלדה
        </Button>
        {status === "speaking" ? (
          <Button
            type="button"
            size="lg"
            variant="ghost"
            onClick={onStopSpeech}
            className="min-h-11"
          >
            <VolumeX className="size-4" />
            השתקת קול
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            {support.hebrewVoice ? (
              <>
                <Volume2 className="size-3.5" />
                קול הרופא פעיל
                {neuralVoice ? " · טבעי" : ""}
              </>
            ) : (
              <>
                <AudioLines className="size-3.5" />
                בלי קול עברי — התמליל פעיל
              </>
            )}
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
          <Button
            type="button"
            onClick={onSubmitTyped}
            disabled={busy || typed.trim().length === 0}
            className="hover-lift min-h-11 self-start"
          >
            שליחת תור
          </Button>
        </div>
      ) : null}
    </div>
  );
}
