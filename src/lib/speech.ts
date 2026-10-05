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

const HEBREW_LANG = "he-IL";

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
): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const hebrew = voices.filter(
    (voice) =>
      voice.lang.toLowerCase().startsWith("he") ||
      voice.lang.toLowerCase().startsWith("iw"),
  );
  if (hebrew.length === 0) return null;
  if (preferredGender) {
    const matched = hebrew.find((voice) =>
      preferredGender === "female"
        ? /female|woman|girl|zira|siri|he-il-female/i.test(`${voice.name} ${voice.voiceURI}`)
        : /male|man|david|guy/i.test(`${voice.name} ${voice.voiceURI}`),
    );
    if (matched) return matched;
  }
  return hebrew[0] ?? null;
}

export function speakHebrew(args: {
  text: string;
  rate: number;
  pitch: number;
  gender: "male" | "female";
}): Promise<{ spoke: boolean; hebrewVoice: boolean }> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: { spoke: boolean; hebrewVoice: boolean }) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(watchdog);
      resolve(result);
    };

    const watchdog = window.setTimeout(() => {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* ignore */
      }
      finish({
        spoke: false,
        hebrewVoice: Boolean(findHebrewVoice(args.gender)),
      });
    }, 4000);

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

    const run = () => {
      const voice = findHebrewVoice(args.gender);
      const utterance = new SpeechSynthesisUtterance(args.text);
      utterance.lang = HEBREW_LANG;
      utterance.rate = args.rate;
      utterance.pitch = args.pitch;
      if (voice) utterance.voice = voice;
      utterance.onend = () =>
        finish({ spoke: true, hebrewVoice: Boolean(voice) });
      utterance.onerror = () =>
        finish({ spoke: false, hebrewVoice: Boolean(voice) });
      try {
        synth.speak(utterance);
        if (synth.paused) synth.resume();
      } catch {
        finish({ spoke: false, hebrewVoice: Boolean(voice) });
      }
    };

    if (synth.getVoices().length === 0) {
      const handle = () => {
        synth.removeEventListener("voiceschanged", handle);
        run();
      };
      synth.addEventListener("voiceschanged", handle);
      window.setTimeout(() => {
        synth.removeEventListener("voiceschanged", handle);
        if (!settled) run();
      }, 400);
      return;
    }

    run();
  });
}

export function stopSpeaking() {
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
