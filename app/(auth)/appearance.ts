import type { SignIn } from "@clerk/nextjs";
import type { ComponentProps } from "react";

type Appearance = NonNullable<ComponentProps<typeof SignIn>["appearance"]>;

export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: "#3730a3",
    colorText: "#1c1814",
    colorTextSecondary: "#57514a",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    colorInputText: "#1c1814",
    colorDanger: "#be123c",
    colorSuccess: "#15803d",
    colorWarning: "#b45309",
    colorNeutral: "#1c1814",
    borderRadius: "8px",
    fontFamily: "var(--font-sans), -apple-system, system-ui, sans-serif",
    fontSize: "14px",
  },
  elements: {
    rootBox: "w-full",
    card: "bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-sm)] rounded-xl",
    headerTitle: "text-[var(--fg)] text-xl font-semibold tracking-tight",
    headerSubtitle: "text-[var(--fg-secondary)] text-sm",
    socialButtonsBlockButton:
      "border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] hover:bg-[var(--surface-hover)] transition-colors rounded-md",
    socialButtonsBlockButtonText: "font-medium",
    dividerLine: "bg-[var(--border)]",
    dividerText: "text-[var(--fg-muted)] text-xs",
    formFieldLabel: "text-[var(--fg)] text-xs font-medium",
    formFieldInput:
      "border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] rounded-md focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15",
    formButtonPrimary:
      "bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] rounded-md font-medium shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-colors normal-case",
    footerActionText: "text-[var(--fg-secondary)] text-sm",
    footerActionLink:
      "text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium",
    identityPreviewText: "text-[var(--fg)]",
    identityPreviewEditButton: "text-[var(--accent)]",
    formResendCodeLink: "text-[var(--accent)]",
    otpCodeFieldInput:
      "border-[var(--border)] focus:border-[var(--accent)] rounded-md",
    alertText: "text-[var(--danger)]",
    formFieldErrorText: "text-[var(--danger)] text-xs",
    footer: "bg-transparent",
  },
};
