"use client";

import { caseContext } from "@/lib/case";
import type { DerivedState } from "@/lib/status";
import { SectionLabel } from "./DetailHeader";

type Props = {
  derived: DerivedState;
  onCallSender: () => void;
  onCallRecipient: () => void;
  onEndCall: () => void;
  onEscalate: () => void;
  onReset: () => void;
};

export function DemoCase({
  derived,
  onCallSender,
  onCallRecipient,
  onEndCall,
  onEscalate,
  onReset,
}: Props) {
  const { order, sender, recipient, address } = caseContext;
  const amount = `₹${order.amount.toLocaleString("en-IN")}`;

  return (
    <div className="px-[28px] py-[22px]">
      {/* Top row: section label + operator actions */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <SectionLabel>Demo case</SectionLabel>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Primary onClick={onCallSender} disabled={!derived.canCallSender}>
            <PhoneIcon /> Call sender
          </Primary>
          <Ghost
            onClick={onCallRecipient}
            disabled={!derived.canCallRecipient}
          >
            Call recipient
          </Ghost>
          {derived.inCall && <Danger onClick={onEndCall}>End call</Danger>}
          <Danger onClick={onEscalate} disabled={!derived.canEscalate} outline>
            Escalate
          </Danger>
          <IconButton onClick={onReset} ariaLabel="Reset case">
            <ResetIcon />
          </IconButton>
        </div>
      </div>

      {/* Order facts row */}
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
        <Item
          label="Item"
          value={order.items[0].replace(" 1 kg", " · 1 kg")}
        />
        <Item label="Amount" value={amount} />
        <Item
          label="Gift"
          value={
            <>
              {sender.name} → {recipient.name}
              <span className="ml-2 inline-flex items-center rounded-full border border-[var(--line-2)] px-[7px] py-[1px] font-mono text-[8.5px] uppercase tracking-[0.08em] text-[var(--muted)]">
                sender pays
              </span>
            </>
          }
        />
        <div className="ml-auto text-[13px] text-[var(--muted)]">
          <span className="mr-2 font-mono text-[10.5px] uppercase tracking-[0.07em] text-[var(--faint)]">
            Address, typed
          </span>
          House {address.houseNo}, near{" "}
          <span className="font-medium text-[var(--ink)] [border-bottom:2px_solid_var(--amber)] [padding-bottom:1px]">
            {address.landmark}
          </span>
          , {address.area}
        </div>
      </div>
    </div>
  );
}

function Item({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2 text-[13.5px]">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.07em] text-[var(--faint)]">
        {label}
      </span>
      <span className="font-medium text-[var(--ink)]">{value}</span>
    </div>
  );
}

function Primary({
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

function Ghost({
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
      className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--line-2)] bg-[var(--surface)] px-4 py-[9px] text-[13px] font-medium text-[var(--ink)] shadow-[var(--shadow-sm)] transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:active:translate-y-0 enabled:hover:bg-[var(--surface-3)]"
    >
      {children}
    </button>
  );
}

function Danger({
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
      className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-[var(--line-2)] bg-[var(--surface)] text-[var(--muted)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--surface-3)] hover:text-[var(--ink)] active:translate-y-px"
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
