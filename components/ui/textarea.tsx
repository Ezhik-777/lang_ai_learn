import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[140px] w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3",
      "text-base leading-[1.6] text-[var(--fg)] placeholder:text-[var(--fg-muted)]",
      "shadow-[inset_0_1px_2px_rgba(15,23,42,0.02)]",
      "focus-visible:outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/15",
      "transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
