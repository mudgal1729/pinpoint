"use client";

import type { DerivedState, Tone } from "@/lib/status";
import { Stepper } from "./Stepper";

type Props = {
  orderId: string;
  derived: DerivedState;
  onCallSender: () => void;
  onCallRecipient: () => void;
  onEndCall: () => void;
  onEscalate: () => void;
  onReset: () => void;
};

export function DetailHeader({
  orderId,
  derived,
  onCallSender,
  onCallRecipient,
  onEndCall,
  onEscalate,
  onReset,
}: Props) {
  return (
    <div className="border-b border-[var(--line)] p-[20px_22px_18px]">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[19px] font-semibold tracking-tight text-[var(--ink)]">
              #{orderId}
            </h1>
            <StateBadge text={derived.badge.text} tone={derived.badge.tone} />
          </div>
          <p className="mt-2 max-w-[640px] text-[13px] leading-[1.5] text-[var(--muted)]">
            Orchestrator owns the case and its state. It{" "}
            <strong className="font-semibold text-[var(--ink)]">
              calls the sender, then the recipient, carrying context across
            </strong>
            , and escalates to a human if it can&apos;t reach certainty.
          </p>
        </div>

        <div className="flex flex-none flex-wrap items-center justify-end gap-2">
          <PrimaryButton
            onClick={onCallSender}
            disabled={!derived.canCallSender}
          >
            <PhoneIcon /> Call sender
          </PrimaryButton>
          <GhostButton
            onClick={onCallRecipient}
            disabled={!derived.canCallRecipient}
          >
            Call recipient
          </GhostButton>
          {derived.inCall && <DangerButton onClick={onEndCall}>End call</DangerButton>}
          <DangerButton
            onClick={onEscalate}
            disabled={!derived.canEscalate}
            outline
          >
            Escalate
          </DangerButton>
          <IconButton onClick={onReset} ariaLabel="Reset case">
            <ResetIcon />
          </IconButton>
        </div>
      </div>

      <div className="mt-5">
        <Stepper derived={derived} />
      </div>
    </div>
  );
}

function StateBadge({ text, tone }: { text: string; tone: Tone }) {
  const palette: Record<Tone, string> = {
    grey:
      "bg-[var(--surface-3)] text-[var(--muted)] border-[var(--line-2)]",
    amber:
      "bg-[var(--amber-bg)] text-[oklch(0.5_0.1_60)] border-[oklch(0.88_0.06_80)]",
    green:
      "bg-[var(--green-bg)] text-[var(--green)] border-[oklch(0.82_0.06_152)]",
    red:
      "bg-[var(--red-bg)] text-[var(--red)] border-[oklch(0.85_0.05_32)]",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-[11px] py-[4px] font-mono text-[10px] uppercase tracking-[0.06em] ${palette[tone]}`}
    >
      {text}
    </span>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--ink-2)] px-4 py-[9px] text-[13px] font-medium text-[var(--bg)] shadow-[var(--shadow-sm)] transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:active:translate-y-0 enabled:hover:bg-[var(--ink)]"
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--line-2)] bg-[var(--surface)] px-4 py-[9px] text-[13px] font-medium text-[var(--ink)] shadow-[var(--shadow-sm)] transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:active:translate-y-0 enabled:hover:bg-[var(--surface-2)]"
    >
      {children}
    </button>
  );
}

function DangerButton({
  children,
  onClick,
  disabled,
  outline,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  outline?: boolean;
}) {
  const base = outline
    ? "border border-[oklch(0.85_0.05_32)] bg-[var(--surface)] text-[var(--red)] enabled:hover:bg-[var(--red-bg)]"
    : "border border-[var(--red)] bg-[var(--red)] text-white enabled:hover:opacity-90";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-[10px] px-4 py-[9px] text-[13px] font-medium shadow-[var(--shadow-sm)] transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:active:translate-y-0 ${base}`}
    >
      {children}
    </button>
  );
}

function IconButton({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-[var(--line-2)] bg-[var(--surface)] text-[var(--muted)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--surface-2)] hover:text-[var(--ink)] active:translate-y-px"
    >
      {children}
    </button>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M6.5 4.5l3 1 1 3-2 1.5a11 11 0 0 0 5 5l1.5-2 3 1 1 3a2 2 0 0 1-2 2.2C12 23 4 15 4 6.5A2 2 0 0 1 6.5 4.5z" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M4 12a8 8 0 1 1 2.5 5.8" />
      <path d="M4 20v-4h4" />
    </svg>
  );
}
