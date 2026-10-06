"use client";

import { useEffect, useState } from "react";
import type { AiProvider, VoiceProvider } from "@/lib/types";

export function AiStatusBadge() {
  const [status, setStatus] = useState<{
    chat: AiProvider;
    tts: VoiceProvider;
  } | null>(null);

  useEffect(() => {
    void fetch("/api/ai-status")
      .then((response) => response.json())
      .then((payload: { chat?: AiProvider; tts?: VoiceProvider }) => {
        setStatus({
          chat: payload.chat ?? "local",
          tts: payload.tts ?? "browser",
        });
      })
      .catch(() => {
        setStatus({ chat: "local", tts: "browser" });
      });
  }, []);

  if (!status) return null;

  const chatLabel =
    status.chat === "gemini"
      ? "Gemini Flash"
      : status.chat === "openai"
        ? "ChatGPT (GPT-4o)"
        : status.chat === "claude"
          ? "Claude Sonnet"
          : "מנוע מקומי";
  const voiceLabel =
    status.tts === "gemini"
      ? "קול Gemini העברי"
      : status.tts === "openai"
        ? "קול GPT-4o mini TTS"
        : "קול דפדפן";

  return (
    <p className="text-xs leading-5 text-muted-foreground">
      השיחה: {chatLabel}. השמע: {voiceLabel}
      {status.tts === "browser"
        ? " — להשמעה טבעית הוסיפו GEMINI_API_KEY (מומלץ לעברית) או OPENAI_API_KEY."
        : "."}
    </p>
  );
}
