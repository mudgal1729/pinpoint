import { caseContext, type DecisionTone } from "@/lib/case";
import { SectionLabel } from "./DetailHeader";

const dotColor: Record<DecisionTone, string> = {
  amber: "bg-[var(--amber)]",
  green: "bg-[var(--green)]",
  neutral: "bg-[var(--line-2)]",
};

// Renders Part 2's content. The outer box (border / shadow / rounded /
// surface) is provided by app/page.tsx; this component owns its
// internal padding and layout only.
export function OrchestratorDecisions() {
  const decisions = caseContext.orchestratorDecisions;
  return (
    <div className="px-[28px] py-[22px]">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <SectionLabel>Orchestrator decisions</SectionLabel>
        <span className="text-[11.5px] text-[var(--muted)]">
          Computed before Agent 1; drives the agent&apos;s role and context.
        </span>
      </div>
      <div className="grid grid-cols-5 gap-[10px]">
        {decisions.map((d) => (
          <div
            key={d.key}
            className="flex flex-col gap-[3px] rounded-[10px] border border-[var(--line-2)] bg-[var(--surface-2)] px-[12px] py-[10px]"
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-[6px] w-[6px] flex-none rounded-full ${dotColor[d.tone]}`}
              />
              <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-[var(--faint)]">
                {d.label}
              </span>
            </div>
            <div className="font-display text-[14px] font-semibold text-[var(--ink)]">
              {d.value}
            </div>
            <div className="text-[11.5px] leading-[1.35] text-[var(--muted)]">
              {d.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
