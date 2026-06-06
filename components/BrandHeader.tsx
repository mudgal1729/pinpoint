import type { DerivedState, Tone } from "@/lib/status";

type Props = { orderId: string; derived: DerivedState };

// The single heading for the page: brand mark + wordmark, the live order
// id and state badge, and the orchestrator's introduction paragraph. Sits
// OUTSIDE the case-detail card so it reads as the page heading, not as a
// section inside the card.
export function BrandHeader({ orderId, derived }: Props) {
  return (
    <header className="mb-6 flex items-start gap-[14px]">
      <div className="mt-[3px] grid h-[42px] w-[42px] flex-none place-items-center rounded-[12px] bg-[var(--ink-2)]">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
          <path
            d="M12 2C7.9 2 4.5 5.3 4.5 9.4c0 5.3 6.4 11.6 7 12.2.3.3.7.3 1 0 .6-.6 7-6.9 7-12.2C19.5 5.3 16.1 2 12 2z"
            fill="var(--bg)"
          />
          <circle cx="12" cy="9.4" r="2.7" fill="var(--ink-2)" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h1 className="font-display text-[27px] font-semibold leading-none tracking-[-0.02em] text-[var(--ink)]">
            Pinpoint
          </h1>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[13.5px] font-medium text-[var(--ink)]">
              #{orderId}
            </span>
            <StateBadge text={derived.badge.text} tone={derived.badge.tone} />
          </div>
        </div>
        <p className="mt-[10px] max-w-[820px] text-[13.5px] leading-[1.55] text-[var(--muted)]">
          Orchestrator owns the case and its state. It{" "}
          <strong className="font-semibold text-[var(--ink)]">
            calls the sender, then the recipient, carrying context across
          </strong>
          , and escalates to a human if it can&apos;t reach certainty.
        </p>
      </div>
    </header>
  );
}

function StateBadge({ text, tone }: { text: string; tone: Tone }) {
  const palette: Record<Tone, string> = {
    grey: "bg-[var(--surface-3)] text-[var(--muted)] border-[var(--line-2)]",
    amber:
      "bg-[var(--amber-bg)] text-[oklch(0.5_0.1_60)] border-[oklch(0.88_0.06_80)]",
    green:
      "bg-[var(--green-bg)] text-[var(--green)] border-[oklch(0.82_0.06_152)]",
    red: "bg-[var(--red-bg)] text-[var(--red)] border-[oklch(0.85_0.05_32)]",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-[12px] py-[4px] font-mono text-[10.5px] uppercase tracking-[0.07em] ${palette[tone]}`}
    >
      {text}
    </span>
  );
}
