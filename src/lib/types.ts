export type DoctorType = "family" | "pediatrician";
export type PersonaStyle = "stubborn-veteran" | "defensive-overwhelmed";
export type VoiceGender = "male" | "female";
export type DialoguePhase = "resist" | "deflect" | "challenge" | "soften";
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
  clinic: string;
  portraitInitials: string;
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
  turnCount: number;
  signals: SignalCounts;
  usedReplyIndexes: Partial<Record<DialoguePhase, number[]>>;
};

export type DoctorTurnResult = {
  reply: string;
  state: DialogueState;
  signalsThisTurn: CoachingSignal[];
  source: "local" | "openai";
};

export type DebriefNotes = {
  wentWell: string[];
  tryNext: string[];
  reachedSoftening: boolean;
  tooShort: boolean;
};
