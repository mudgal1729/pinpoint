import type { DerivedState } from "@/lib/status";
import { Stepper } from "./Stepper";

type Props = { derived: DerivedState };

// Part 1 of the dashboard: brand mark + wordmark, the subtitle
// paragraph, and the live flow stepper. The stepper sits as part of the
// subtitle group (left-aligned with the wordmark, below the paragraph)
// so the whole heading reads as one block.
export function BrandHeader({ derived }: Props) {
  return (
    <header className="mb-7 flex items-start gap-[14px]">
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
        <h1 className="font-display text-[27px] font-semibold leading-none tracking-[-0.02em] text-[var(--ink)]">
          Pinpoint
        </h1>
        <p className="mt-[10px] max-w-[820px] text-[13.5px] leading-[1.55] text-[var(--muted)]">
          Orchestrator owns the case and its state. It{" "}
          <strong className="font-semibold text-[var(--ink)]">
            calls the sender, then the recipient, carrying context across
          </strong>
          , and escalates to a human if it can&apos;t reach certainty.
        </p>
        <div className="mt-3">
          <Stepper derived={derived} />
        </div>
      </div>
    </header>
  );
}
