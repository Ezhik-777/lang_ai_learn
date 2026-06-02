import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral:
    "bg-[var(--surface-hover)] text-[var(--fg-secondary)] border-[var(--border)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent-soft)]",
  success: "bg-[var(--success-soft)] text-[var(--success)] border-[var(--success-soft)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning-soft)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger-soft)]",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}

export function ScorePill({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const tone: Tone = score >= 80 ? "success" : score >= 50 ? "warning" : "danger";
  return (
    <Badge tone={tone} className={cn("tabular-nums", className)}>
      {Math.round(score)}
    </Badge>
  );
}
