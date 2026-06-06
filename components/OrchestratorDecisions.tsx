import { caseContext, type DecisionTone } from "@/lib/case";

const dotColor: Record<DecisionTone, string> = {
  amber: "bg-[var(--amber)]",
  green: "bg-[var(--green)]",
  neutral: "bg-[var(--line-2)]",
};

export function OrchestratorDecisions() {
  const decisions = caseContext.orchestratorDecisions;
  return (
    <section className="border-t border-[var(--line)] bg-[var(--surface-2)] px-[22px] py-[16px]">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.13em] text-[var(--faint)]">
          Orchestrator decisions
        </span>
        <span className="text-[11.5px] text-[var(--muted)]">
          Computed before Agent 1; drives the agent&apos;s role and context.
        </span>
      </div>
      <div className="grid grid-cols-5 gap-[10px]">
        {decisions.map((d) => (
          <div
            key={d.key}
            className="flex flex-col gap-[3px] rounded-[10px] border border-[var(--line-2)] bg-[var(--surface)] px-[11px] py-[9px]"
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-[6px] w-[6px] flex-none rounded-full ${dotColor[d.tone]}`}
              />
              <span className="font-mono text-[9px] uppercase tracking-[0.07em] text-[var(--faint)]">
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
    </section>
  );
}
