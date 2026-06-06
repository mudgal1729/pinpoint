import type { DerivedState, StepState } from "@/lib/status";

type Props = { derived: DerivedState };

type Node = {
  title: string;
  role: string;
  state: StepState;
  red?: boolean;
};

export function Stepper({ derived }: Props) {
  const nodes: Node[] = [
    {
      title: "Low-confidence order",
      role: "pin ~2 km off",
      state: derived.stepper.triggered,
    },
    {
      title: "Sender call",
      role: "Agent 1",
      state: derived.stepper.sender,
    },
    {
      title: "Recipient call",
      role: "Agent 2",
      state: derived.stepper.receiver,
    },
    {
      title: derived.stepper.endLabel,
      role: derived.stepper.endRed
        ? "callback promised"
        : derived.stepper.end === "done"
          ? "order on the way"
          : "or human handoff",
      state: derived.stepper.end,
      red: derived.stepper.endRed,
    },
  ];

  const items = nodes.flatMap((node, i) => {
    const cells = [
      <li key={`node-${i}`}>
        <Node node={node} />
      </li>,
    ];
    if (i < nodes.length - 1) {
      cells.push(
        <li
          key={`gap-${i}`}
          aria-hidden
          className="mx-2 h-px w-6 bg-[var(--line-2)]"
        />,
      );
    }
    return cells;
  });

  return (
    <ol className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center gap-0">
      {items}
    </ol>
  );
}

function Node({ node }: { node: Node }) {
  const ring =
    node.state === "active"
      ? node.red
        ? "shadow-[inset_0_0_0_1.5px_var(--red)]"
        : "shadow-[inset_0_0_0_1.5px_var(--amber)]"
      : "";
  const opacity = node.state === "locked" ? "opacity-40" : "";
  const bg = node.state === "active" ? "bg-[var(--surface)]" : "";

  return (
    <div
      className={`flex items-center gap-3 rounded-[10px] px-3 py-2 transition-[background,box-shadow,opacity] duration-300 ${ring} ${opacity} ${bg}`}
    >
      <Dot state={node.state} red={node.red} />
      <div className="min-w-0">
        <div className="truncate font-display text-[13px] font-semibold leading-tight text-[var(--ink)]">
          {node.title}
        </div>
        <div className="truncate text-[10.5px] text-[var(--faint)]">
          {node.role}
        </div>
      </div>
    </div>
  );
}

function Dot({ state, red }: { state: StepState; red?: boolean }) {
  if (state === "active") {
    const color = red ? "bg-[var(--red)]" : "bg-[var(--amber)]";
    const pulse = red ? "" : "pinpoint-pulse-amber rounded-full";
    return <span className={`h-2.5 w-2.5 rounded-full ${color} ${pulse}`} />;
  }
  if (state === "done") {
    return <span className="h-2.5 w-2.5 rounded-full bg-[var(--green)]" />;
  }
  return <span className="h-2.5 w-2.5 rounded-full bg-[var(--line-2)]" />;
}
