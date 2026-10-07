import { isAppleTouchDevice } from "@/lib/browser";

export type MicErrorCode =
  | "permission-denied"
  | "no-recognition"
  | "no-hebrew-voice"
  | "no-speech"
  | "audio-capture"
  | "not-supported"
  | "transcribe-failed";

export type SpeechSupport = {
  recognition: boolean;
  synthesis: boolean;
  hebrewVoice: boolean;
};

export type SpeakArgs = {
  text: string;
  rate: number;
  pitch: number;
  gender: "male" | "female";
  ageBand?: "veteran" | "early-career";
};

const HEBREW_LANG = "he-IL";
const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
let speakGeneration = 0;
let currentAudio: HTMLAudioElement | null = null;
let sharedAudio: HTMLAudioElement | null = null;
let audioUnlocked = false;
let audioContext: AudioContext | null = null;

type LiveRecording = {
  stream: MediaStream;
  recorder: MediaRecorder;
  chunks: BlobPart[];
  mime: string;
};

let liveRecording: LiveRecording | null = null;

export function getSpeechRecognitionConstructor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function getSpeechSupport(): SpeechSupport {
  if (typeof window === "undefined") {
    return { recognition: false, synthesis: false, hebrewVoice: false };
  }
  const recognition =
    Boolean(getSpeechRecognitionConstructor()) || canRecordAudio();
  const synthesis = "speechSynthesis" in window;
  const hebrewVoice = synthesis && Boolean(findHebrewVoice());
  return { recognition, synthesis, hebrewVoice };
}

export function shouldUseServerTranscription(): boolean {
  if (typeof window === "undefined") return false;
  if (isAppleTouchDevice()) return canRecordAudio();
  return !getSpeechRecognitionConstructor() && canRecordAudio();
}

export function canRecordAudio(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/mp4",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/aac",
    "audio/mpeg",
    "audio/webm;codecs=opus",
    "audio/webm",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function ensureSharedAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (sharedAudio) return sharedAudio;
  const audio = new Audio();
  audio.preload = "auto";
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("webkit-playsinline", "true");
  sharedAudio = audio;
  return audio;
}

export async function unlockAudioPlayback(): Promise<void> {
  if (typeof window === "undefined" || audioUnlocked) return;
  const Ctx = window.AudioContext ?? window.webkitAudioContext;
  if (Ctx) {
    try {
      audioContext = audioContext ?? new Ctx();
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
    } catch {
      /* ignore */
    }
  }

  const audio = ensureSharedAudio();
  if (audio) {
    try {
      audio.src = SILENT_WAV;
      await audio.play();
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    } catch {
      /* first tap still counts as an unlock attempt */
    }
  }
  audioUnlocked = true;
}

export function findHebrewVoice(
  preferredGender?: "male" | "female",
  ageBand?: "veteran" | "early-career",
): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const ranked = [...voices].sort(
    (a, b) =>
      scoreVoice(b, preferredGender, ageBand) -
      scoreVoice(a, preferredGender, ageBand),
  );
  const best = ranked[0];
  if (!best) return null;
  if (scoreVoice(best, preferredGender, ageBand) <= 0) {
    return voices.find(isHebrewVoice) ?? null;
  }
  return best;
}

function isHebrewVoice(voice: SpeechSynthesisVoice): boolean {
  const hay = `${voice.lang} ${voice.name} ${voice.voiceURI}`.toLowerCase();
  return /he(-|_)?il|iw(-|_)?il|hebrew|carmit|ivrit/.test(hay);
}

function scoreVoice(
  voice: SpeechSynthesisVoice,
  preferredGender?: "male" | "female",
  ageBand?: "veteran" | "early-career",
): number {
  const hay = `${voice.name} ${voice.lang} ${voice.voiceURI}`.toLowerCase();
  let score = 0;
  if (isHebrewVoice(voice)) score += 20;
  else if (hay.startsWith("he") || hay.includes("israel")) score += 8;

  if (preferredGender === "female") {
    if (/female|woman|girl|carmit|zira|samantha|heera|hila|tamar|noa/.test(hay)) {
      score += 8;
    }
    if (/male|david|daniel|guy|mark|moshe|yosef/.test(hay)) score -= 4;
  }
  if (preferredGender === "male") {
    if (/male|man|david|daniel|guy|mark|moshe|asaf|yosef|avri/.test(hay)) {
      score += 8;
    }
    if (/female|carmit|zira|samantha/.test(hay)) score -= 4;
  }
  if (ageBand === "veteran" && /senior|grand|low|deep/.test(hay)) score += 2;
  if (ageBand === "early-career" && /young|child|bright/.test(hay)) score += 2;
  return score;
}

export async function waitForVoices(): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const synth = window.speechSynthesis;
  if (synth.getVoices().length > 0) return;

  await new Promise<void>((resolve) => {
    const finish = () => {
      synth.removeEventListener("voiceschanged", finish);
      window.clearTimeout(timeout);
      resolve();
    };
    const timeout = window.setTimeout(finish, 800);
    synth.addEventListener("voiceschanged", finish);
  });
}

function chunkSpeechText(text: string, maxLen = 220): string[] {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return [];
  const sentences = trimmed
    .split(/(?<=[.!?…])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const source = sentences.length > 0 ? sentences : [trimmed];
  const chunks: string[] = [];
  for (const piece of source) {
    if (piece.length <= maxLen) {
      chunks.push(piece);
      continue;
    }
    const parts = piece.split(/(?<=[,;،])\s+/);
    let buffer = "";
    for (const part of parts) {
      if (`${buffer} ${part}`.trim().length > maxLen && buffer) {
        chunks.push(buffer.trim());
        buffer = part;
      } else {
        buffer = `${buffer} ${part}`.trim();
      }
    }
    if (buffer) chunks.push(buffer);
  }
  return chunks;
}

function estimatedMs(text: string, rate: number): number {
  const safeRate = Math.max(0.5, rate);
  return Math.max(1800, (text.length / 10) * (1000 / safeRate) + 900);
}

export function speakHebrew(
  args: SpeakArgs,
): Promise<{ spoke: boolean; hebrewVoice: boolean }> {
  const myGen = ++speakGeneration;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: { spoke: boolean; hebrewVoice: boolean }) => {
      if (settled) return;
      settled = true;
      window.clearInterval(keepAlive);
      resolve(result);
    };

    if (typeof window === "undefined" || !window.speechSynthesis) {
      finish({ spoke: false, hebrewVoice: false });
      return;
    }

    const synth = window.speechSynthesis;
    try {
      synth.cancel();
    } catch {
      finish({ spoke: false, hebrewVoice: false });
      return;
    }

    const chunks = chunkSpeechText(args.text);
    if (chunks.length === 0) {
      finish({ spoke: false, hebrewVoice: Boolean(findHebrewVoice(args.gender, args.ageBand)) });
      return;
    }

    // Chrome can pause mid-utterance; resume() on iOS Safari restarts/kills speech.
    const keepAlive = isAppleTouchDevice()
      ? 0
      : window.setInterval(() => {
          if (speakGeneration !== myGen) return;
          if (synth.speaking) {
            try {
              synth.resume();
            } catch {
              /* Chrome sometimes pauses mid-utterance. */
            }
          }
        }, 4000);

    const run = async () => {
      await waitForVoices();
      if (speakGeneration !== myGen) {
        finish({ spoke: false, hebrewVoice: false });
        return;
      }
      const voice = findHebrewVoice(args.gender, args.ageBand);
      let spokeAny = false;

      for (const chunk of chunks) {
        if (speakGeneration !== myGen) break;
        const chunkResult = await speakChunk({
          text: chunk,
          voice,
          rate: args.rate,
          pitch: args.pitch,
          generation: myGen,
        });
        if (chunkResult) spokeAny = true;
      }

      finish({
        spoke: spokeAny,
        hebrewVoice: Boolean(voice),
      });
    };

    void run();
  });
}

function speakChunk(args: {
  text: string;
  voice: SpeechSynthesisVoice | null;
  rate: number;
  pitch: number;
  generation: number;
}): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve(false);
      return;
    }
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(args.text);
    const voiceLang = args.voice?.lang ?? "";
    utterance.lang = /^(he|iw)/i.test(voiceLang) ? voiceLang : HEBREW_LANG;
    utterance.rate = args.rate;
    utterance.pitch = args.pitch;
    utterance.volume = 1;
    if (args.voice) utterance.voice = args.voice;

    let started = false;
    let settled = false;
    const done = (value: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(watchdog);
      resolve(value);
    };

    const watchdog = window.setTimeout(
      () => done(started || synth.speaking),
      estimatedMs(args.text, args.rate) * 2.2,
    );

    utterance.onstart = () => {
      started = true;
    };
    utterance.onend = () => done(true);
    utterance.onerror = () => done(started);

    try {
      synth.speak(utterance);
      if (synth.paused) synth.resume();
    } catch {
      done(false);
    }

    if (speakGeneration !== args.generation) {
      done(false);
    }
  });
}

export function stopSpeaking() {
  speakGeneration += 1;
  if (typeof window === "undefined") return;
  try {
    currentAudio?.pause();
  } catch {
    /* ignore */
  }
  currentAudio = null;
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

export function playNeuralAudio(blob: Blob, generation?: number): Promise<boolean> {
  const myGen = generation ?? ++speakGeneration;
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    try {
      currentAudio?.pause();
    } catch {
      /* ignore */
    }
    const url = URL.createObjectURL(blob);
    const audio = ensureSharedAudio() ?? new Audio();
    audio.setAttribute("playsinline", "true");
    audio.setAttribute("webkit-playsinline", "true");
    audio.src = url;
    currentAudio = audio;
    if (audioContext?.state === "suspended") {
      void audioContext.resume();
    }
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
      resolve(value);
    };
    audio.onended = () => finish(myGen === speakGeneration);
    audio.onerror = () => finish(false);
    const playResult = audio.play();
    if (playResult && typeof playResult.then === "function") {
      playResult.catch(() => finish(false));
    }
  });
}

export async function speakDoctorLine(args: SpeakArgs & { personaId: string }): Promise<{
  spoke: boolean;
  hebrewVoice: boolean;
  neural: boolean;
  provider?: "gemini" | "openai";
}> {
  const chunks = chunkSpeechText(args.text, 110);
  if (chunks.length === 0) {
    return { spoke: false, hebrewVoice: false, neural: false };
  }

  const startedAt = ++speakGeneration;
  let neural = false;
  let provider: "gemini" | "openai" | undefined;
  let pending: Promise<{ blob: Blob; provider: "gemini" | "openai" } | null> | null =
    fetchDoctorVoiceChunk(chunks[0], args.personaId);

  for (let index = 0; index < chunks.length; index += 1) {
    if (speakGeneration !== startedAt) {
      return { spoke: neural, hebrewVoice: neural, neural, provider };
    }
    const next =
      index + 1 < chunks.length
        ? fetchDoctorVoiceChunk(chunks[index + 1], args.personaId)
        : null;
    const clip = pending ? await pending : null;
    pending = next;
    if (speakGeneration !== startedAt) {
      return { spoke: neural, hebrewVoice: neural, neural, provider };
    }
    if (clip) {
      neural = true;
      provider = clip.provider;
      const played = await playNeuralAudio(clip.blob, startedAt);
      if (!played) {
        return { spoke: true, hebrewVoice: true, neural: true, provider };
      }
      continue;
    }
    const rest = chunks.slice(index).join(" ");
    const browser = await speakHebrew({ ...args, text: rest });
    return {
      spoke: neural || browser.spoke,
      hebrewVoice: neural || browser.hebrewVoice,
      neural,
      provider,
    };
  }

  return { spoke: true, hebrewVoice: true, neural, provider };
}

async function fetchDoctorVoiceChunk(
  text: string,
  personaId: string,
): Promise<{ blob: Blob; provider: "gemini" | "openai" } | null> {
  try {
    const response = await fetch("/api/doctor-voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, personaId }),
    });
    if (!response.ok || response.status === 204) return null;
    const blob = await response.blob();
    if (blob.size <= 80) return null;
    const header = response.headers.get("X-Voice-Provider");
    const provider = header === "openai" || header === "gemini" ? header : "gemini";
    return { blob, provider };
  } catch {
    return null;
  }
}

export async function requestMicAccess(): Promise<MicErrorCode | null> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return "not-supported";
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return null;
  } catch (error) {
    return mapGetUserMediaError(error);
  }
}

function mapGetUserMediaError(error: unknown): MicErrorCode {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "permission-denied";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "audio-capture";
  }
  return "not-supported";
}

export async function startAudioRecording(): Promise<MicErrorCode | null> {
  if (!canRecordAudio()) return "not-supported";
  await stopAudioRecording();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = pickRecorderMimeType();
    const recorder = mime
      ? new MediaRecorder(stream, { mimeType: mime })
      : new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };
    liveRecording = {
      stream,
      recorder,
      chunks,
      mime: recorder.mimeType || mime || "audio/mp4",
    };
    recorder.start();
    return null;
  } catch (error) {
    return mapGetUserMediaError(error);
  }
}

export function stopAudioRecording(): Promise<Blob | null> {
  return new Promise((resolve) => {
    const session = liveRecording;
    liveRecording = null;
    if (!session) {
      resolve(null);
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      session.stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(session.chunks, {
        type: session.mime || "audio/mp4",
      });
      resolve(blob.size > 80 ? blob : null);
    };
    session.recorder.onstop = finish;
    if (session.recorder.state === "inactive") {
      finish();
      return;
    }
    try {
      session.recorder.stop();
    } catch {
      finish();
    }
    window.setTimeout(finish, 1500);
  });
}

export async function transcribeRecording(blob: Blob): Promise<string | null> {
  const mime = blob.type || "audio/mp4";
  const form = new FormData();
  form.append("audio", blob, filenameForMime(mime));
  form.append("mime", mime);
  try {
    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: form,
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { text?: string };
    return data.text?.trim() || null;
  } catch {
    return null;
  }
}

function filenameForMime(mime: string): string {
  if (mime.includes("webm")) return "speech.webm";
  if (mime.includes("wav")) return "speech.wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "speech.mp3";
  if (mime.includes("ogg")) return "speech.ogg";
  return "speech.m4a";
}

export function mapRecognitionError(error: string): MicErrorCode {
  if (error === "not-allowed") return "permission-denied";
  if (error === "no-speech") return "no-speech";
  if (error === "audio-capture") return "audio-capture";
  if (error === "service-not-allowed") return "permission-denied";
  return "no-recognition";
}

export const HEBREW_SPEECH_LANG = HEBREW_LANG;
