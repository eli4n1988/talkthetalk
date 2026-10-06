export type MicErrorCode =
  | "permission-denied"
  | "no-recognition"
  | "no-hebrew-voice"
  | "no-speech"
  | "audio-capture"
  | "not-supported";

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
let speakGeneration = 0;

export function getSpeechRecognitionConstructor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function getSpeechSupport(): SpeechSupport {
  if (typeof window === "undefined") {
    return { recognition: false, synthesis: false, hebrewVoice: false };
  }
  const recognition = Boolean(getSpeechRecognitionConstructor());
  const synthesis = "speechSynthesis" in window;
  const hebrewVoice = synthesis && Boolean(findHebrewVoice());
  return { recognition, synthesis, hebrewVoice };
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

function chunkSpeechText(text: string): string[] {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return [];
  const sentences = trimmed
    .split(/(?<=[.!?…])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const source = sentences.length > 0 ? sentences : [trimmed];
  const chunks: string[] = [];
  for (const piece of source) {
    if (piece.length <= 220) {
      chunks.push(piece);
      continue;
    }
    const parts = piece.split(/(?<=[,;،])\s+/);
    let buffer = "";
    for (const part of parts) {
      if (`${buffer} ${part}`.trim().length > 220 && buffer) {
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

    const keepAlive = window.setInterval(() => {
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
    utterance.lang = HEBREW_LANG;
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
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
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
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "permission-denied";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return "audio-capture";
    }
    return "not-supported";
  }
}

export function mapRecognitionError(error: string): MicErrorCode {
  if (error === "not-allowed") return "permission-denied";
  if (error === "no-speech") return "no-speech";
  if (error === "audio-capture") return "audio-capture";
  if (error === "service-not-allowed") return "permission-denied";
  return "no-recognition";
}

export const HEBREW_SPEECH_LANG = HEBREW_LANG;
