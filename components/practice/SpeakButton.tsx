"use client";
import { useRef, useState } from "react";
import type { Language } from "@/lib/cefr";

export function SpeakButton({
  text,
  language,
  className = "",
  size = "md",
}: {
  text: string;
  language: Language;
  className?: string;
  size?: "sm" | "md";
}) {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const play = async (rate: "slow" | "normal") => {
    setError(false);
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/tts/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language, rate }),
      });
      if (!res.ok) throw new Error("TTS error");
      const blob = await res.blob();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(blob);
      const audio = new Audio(urlRef.current);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      audio.onerror = () => {
        setPlaying(false);
        setError(true);
      };
      setPlaying(true);
      await audio.play();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const sizeCls = size === "sm" ? "size-7 text-xs" : "size-9 text-sm";

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => play("normal")}
        disabled={loading}
        title="Прослушать"
        aria-label="Прослушать произношение"
        className={`${sizeCls} inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] transition-colors hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] disabled:opacity-50`}
      >
        {loading ? "…" : playing ? "❚❚" : "▶"}
      </button>
      <button
        type="button"
        onClick={() => play("slow")}
        disabled={loading}
        title="Прослушать медленно"
        aria-label="Прослушать медленно"
        className={`${sizeCls} inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] disabled:opacity-50`}
      >
        ½
      </button>
      {error && (
        <span className="text-xs text-[var(--danger)]" role="alert">
          ошибка
        </span>
      )}
    </span>
  );
}
