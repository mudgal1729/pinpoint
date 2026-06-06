import type { DerivedState, Tone } from "@/lib/status";
import { Stepper } from "./Stepper";

type Props = {
  orderId: string;
  derived: DerivedState;
};

// Top of the case-detail card: the case identity (id + state badge) and
// the flow stepper. The Introduction and the Orchestrator decisions are
// rendered as their own sections in app/page.tsx so they sit visually
// adjacent (the user's requirement: decisions immediately below
// introduction, with subtle visual differentiation).
export function DetailHeader({ orderId, derived }: Props) {
  return (
    <>
      {/* Case identity strip */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-[28px] py-[18px]">
        <div className="flex items-baseline gap-3">
          <SectionLabel>Case</SectionLabel>
          <span className="font-mono text-[14px] font-medium text-[var(--ink)]">
            #{orderId}
          </span>
        </div>
        <StateBadge text={derived.badge.text} tone={derived.badge.tone} />
      </div>

      {/* Flow stepper */}
      <section className="border-t border-[var(--line)] px-[28px] py-[20px]">
        <Stepper derived={derived} />
      </section>
    </>
  );
}

export function Introduction() {
  return (
    <section className="border-t border-[var(--line)] px-[28px] py-[18px]">
      <SectionLabel>Introduction</SectionLabel>
      <p className="mt-2 max-w-[820px] text-[14px] leading-[1.55] text-[var(--ink)]">
        Orchestrator owns the case and its state. It{" "}
        <strong className="font-semibold">
          calls the sender, then the recipient, carrying context across
        </strong>
        , and escalates to a human if it can&apos;t reach certainty.
      </p>
    </section>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.13em] text-[var(--faint)]">
      {children}
    </span>
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
      className={`inline-flex items-center rounded-full border px-[12px] py-[4px] font-mono text-[10.5px] uppercase tracking-[0.07em] ${palette[tone]}`}
    >
      {text}
    </span>
  );
}
