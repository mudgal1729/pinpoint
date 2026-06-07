import type { AgentTone } from "@/lib/status";

type Goal = {
  title: string;
  detail: string;
  outcome: React.ReactNode;
};

type Props = {
  agent: "a1" | "a2";
  name: string;
  role: string;
  language: string;
  statusText: string;
  statusTone: AgentTone;
  goals: Goal[];
  outcomesShown: boolean;
  locked: boolean;
  inheritNote?: React.ReactNode;
};

export function AgentCard({
  agent,
  name,
  role,
  language,
  statusText,
  statusTone,
  goals,
  outcomesShown,
  locked,
  inheritNote,
}: Props) {
  const avatarBg = agent === "a1" ? "bg-[var(--amber)]" : "bg-[var(--ink-2)]";
  return (
    <section
      className={`relative p-[16px_18px] transition-opacity ${locked ? "opacity-55" : ""}`}
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-[32px] w-[32px] flex-none items-center justify-center rounded-[9px] font-display text-[14px] font-semibold text-white ${avatarBg}`}
          >
            {agent === "a1" ? "1" : "2"}
          </div>
          <div>
            <div className="font-display text-[14px] font-semibold leading-tight text-[var(--ink)]">
              {name}
            </div>
            <div className="text-[11.5px] text-[var(--muted)]">{role}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-[5px]">
          <span className="rounded-full border border-[var(--line-2)] px-[8px] py-[2px] font-mono text-[9.5px] text-[var(--muted)] whitespace-nowrap">
            हिन्दी · {language}
          </span>
          <StatusPill text={statusText} tone={statusTone} />
        </div>
      </header>

      {inheritNote && (
        <div className="mb-3 flex items-center gap-2 rounded-[9px] border border-[var(--line)] bg-[var(--surface-2)] px-[10px] py-[8px] text-[11.5px] text-[var(--muted)]">
          <ArrowRightIcon />
          {inheritNote}
        </div>
      )}

      <ol className="flex flex-col gap-3">
        {goals.map((g, i) => (
          <li key={g.title} className="flex gap-3">
            <span className="flex h-[21px] w-[21px] flex-none items-center justify-center rounded-[6px] border border-[var(--line-2)] bg-[var(--surface-3)] font-mono text-[10.5px] text-[var(--muted)]">
              {i + 1}
            </span>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-[var(--ink)]">
                {g.title}
              </div>
              <div className="mt-[2px] text-[12px] leading-[1.4] text-[var(--muted)]">
                {g.detail}
              </div>
              <div
                className={`mt-2 flex items-start gap-2 rounded-[8px] border px-[10px] py-[8px] text-[12px] leading-[1.4] transition-opacity duration-[250ms] ${
                  outcomesShown
                    ? "border-[oklch(0.85_0.05_155)] bg-[var(--green-bg)] text-[var(--ink)] opacity-100"
                    : "pointer-events-none border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)] opacity-0"
                }`}
                aria-hidden={!outcomesShown}
              >
                <span
                  className={`mt-[1px] flex h-[15px] w-[15px] flex-none items-center justify-center rounded-full transition-colors ${outcomesShown ? "bg-[var(--green)]" : "bg-[var(--line-2)]"}`}
                >
                  {outcomesShown && <CheckIcon />}
                </span>
                <span>{g.outcome}</span>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {locked && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="rounded-full border border-[var(--line-2)] bg-[var(--surface)] px-[13px] py-[6px] font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--muted)] shadow-[var(--shadow-sm)]">
            Unlocks after Agent 1
          </span>
        </div>
      )}
    </section>
  );
}

function StatusPill({ text, tone }: { text: string; tone: AgentTone }) {
  const palette = {
    faint: { text: "text-[var(--faint)]", dot: "bg-[var(--line-2)]" },
    amber: { text: "text-[var(--amber)]", dot: "bg-[var(--amber)]" },
    green: { text: "text-[var(--green)]", dot: "bg-[var(--green)]" },
  } as const;
  const p = palette[tone];
  const pulse = tone === "amber" ? "pinpoint-pulse-amber" : "";
  return (
    <span
      className={`inline-flex items-center gap-[6px] text-[11px] ${p.text}`}
    >
      <span className={`h-[6px] w-[6px] rounded-full ${p.dot} ${pulse}`} />
      {text}
    </span>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[13px] w-[13px] flex-none text-[var(--faint)]"
      aria-hidden
    >
      <path d="M4 12h13m0 0l-5-5m5 5l-5 5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      className="h-[9px] w-[9px]"
      aria-hidden
    >
      <path
        d="M2.5 6.2l2.2 2.2 4.8-5"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
