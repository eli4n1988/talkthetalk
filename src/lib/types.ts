export type DoctorType = "family" | "pediatrician";
export type PersonaStyle = "stubborn-veteran" | "defensive-overwhelmed";
export type VoiceGender = "male" | "female";
export type AgeBand = "veteran" | "early-career";
export type DialoguePhase = "resist" | "deflect" | "challenge" | "soften";
export type SocialBeat = "greeting" | "intro" | "issue";
export type AiProvider = "gemini" | "openai" | "claude" | "local";
export type VoiceProvider = "gemini" | "openai" | "browser";
export type CoachingSignal =
  | "empathy"
  | "data"
  | "partnership"
  | "command"
  | "criticism";

export type Persona = {
  id: string;
  name: string;
  yearsInClinic: number;
  doctorType: DoctorType;
  style: PersonaStyle;
  gender: VoiceGender;
  ageBand: AgeBand;
  clinic: string;
  portraitInitials: string;
  portraitSrc: string;
  stance: string;
  voice: {
    rate: number;
    pitch: number;
  };
};

export type Scenario = {
  id: string;
  title: string;
  tension: string;
  clinicNote: string;
  doctorType: DoctorType;
  personaId: string;
  firstMeeting: boolean;
  openingLine: string;
  managerGoals: string[];
  sampleLines: string[];
  keywords: Record<CoachingSignal, string[]>;
  replies: Record<DialoguePhase, string[]>;
};

export type TranscriptTurn = {
  id: string;
  role: "manager" | "doctor";
  text: string;
  phase?: DialoguePhase;
};

export type SignalCounts = Record<CoachingSignal, number>;

export type DialogueState = {
  phase: DialoguePhase;
  beat: SocialBeat;
  turnCount: number;
  signals: SignalCounts;
  usedReplyIndexes: Partial<Record<DialoguePhase, number[]>>;
};

export type DoctorTurnResult = {
  reply: string;
  state: DialogueState;
  signalsThisTurn: CoachingSignal[];
  source: AiProvider;
};

export type DebriefNotes = {
  wentWell: string[];
  tryNext: string[];
  reachedSoftening: boolean;
  tooShort: boolean;
};
