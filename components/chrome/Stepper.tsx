import type { DerivedState, StepState } from "@/lib/status";

type Props = { derived: DerivedState };

type Node = {
  title: string;
  state: StepState;
  red?: boolean;
  // The orchestrator node carries a subtle ink-2 tint to mark it as the
  // brain that owns the case, even when settled.
  brain?: boolean;
  sublabel?: string;
};

export function Stepper({ derived }: Props) {
  const nodes: Node[] = [
    {
      title: "Low-confidence order",
      state: derived.stepper.triggered,
    },
    {
      title: "Orchestrator",
      state: derived.stepper.orchestrator,
      brain: true,
    },
    {
      title: "Sender call",
      state: derived.stepper.sender,
    },
    {
      title: "Recipient call",
      state: derived.stepper.receiver,
      sublabel: "if gift order",
    },
    {
      title: derived.stepper.endLabel,
      state: derived.stepper.end,
      red: derived.stepper.endRed,
    },
  ];

  const items = nodes.flatMap((node, i) => {
    const cells = [
      <li key={`node-${i}`} className="flex">
        <Node node={node} />
      </li>,
    ];
    if (i < nodes.length - 1) {
      cells.push(
        <li key={`gap-${i}`} aria-hidden className="mx-2 flex items-center">
          <Arrow />
        </li>,
      );
    }
    return cells;
  });

  return (
    <ol className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] items-center gap-0">
      {items}
    </ol>
  );
}

function Arrow() {
  return (
    <svg
      viewBox="0 0 32 8"
      className="h-2 w-8 text-[var(--line-2)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M0 4 H30" />
      <path d="M26 1 L30 4 L26 7" />
    </svg>
  );
}

function Node({ node }: { node: Node }) {
  const ring =
    node.state === "active"
      ? node.red
        ? "shadow-[inset_0_0_0_1.5px_var(--red)]"
        : node.brain
          ? "shadow-[inset_0_0_0_1.5px_var(--ink-2)]"
          : "shadow-[inset_0_0_0_1.5px_var(--amber)]"
      : "";
  const opacity = node.state === "locked" ? "opacity-40" : "";
  const bg =
    node.state === "active"
      ? "bg-[var(--surface)]"
      : node.brain
        ? "bg-[var(--surface-2)]"
        : "";

  return (
    <div
      className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-[10px] transition-[background,box-shadow,opacity] duration-300 ${ring} ${opacity} ${bg}`}
    >
      <Dot state={node.state} red={node.red} brain={node.brain} />
      <div className="min-w-0 flex flex-col gap-[1px]">
        <span className="truncate font-display text-[13px] font-semibold leading-tight text-[var(--ink)]">
          {node.title}
        </span>
        {node.sublabel && (
          <span className="truncate font-mono text-[9.5px] uppercase tracking-[0.07em] text-[var(--faint)]">
            {node.sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

function Dot({
  state,
  red,
  brain,
}: {
  state: StepState;
  red?: boolean;
  brain?: boolean;
}) {
  if (state === "active") {
    const color = red
      ? "bg-[var(--red)]"
      : brain
        ? "bg-[var(--ink-2)]"
        : "bg-[var(--amber)]";
    const pulse = red || brain ? "" : "pinpoint-pulse-amber rounded-full";
    return <span className={`h-2.5 w-2.5 rounded-full ${color} ${pulse}`} />;
  }
  if (state === "done") {
    const color = brain ? "bg-[var(--ink-2)]" : "bg-[var(--green)]";
    return <span className={`h-2.5 w-2.5 rounded-full ${color}`} />;
  }
  return <span className="h-2.5 w-2.5 rounded-full bg-[var(--line-2)]" />;
}
