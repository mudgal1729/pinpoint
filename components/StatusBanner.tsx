import type { DerivedState, Tone } from "@/lib/status";

type Props = { derived: DerivedState };

const palette: Record<
  Tone,
  { bg: string; border: string; dot: string; text: string }
> = {
  grey: {
    bg: "bg-[var(--surface-2)]",
    border: "border-[var(--line)]",
    dot: "bg-[var(--line-2)]",
    text: "text-[var(--ink)]",
  },
  amber: {
    bg: "bg-[var(--amber-bg)]",
    border: "border-[oklch(0.88_0.06_80)]",
    dot: "bg-[var(--amber)]",
    text: "text-[var(--ink)]",
  },
  green: {
    bg: "bg-[var(--green-bg)]",
    border: "border-[oklch(0.82_0.06_152)]",
    dot: "bg-[var(--green)]",
    text: "text-[var(--ink)]",
  },
  red: {
    bg: "bg-[var(--red-bg)]",
    border: "border-[oklch(0.85_0.05_32)]",
    dot: "bg-[var(--red)]",
    text: "text-[var(--ink)]",
  },
};

export function StatusBanner({ derived }: Props) {
  const p = palette[derived.banner.tone];
  return (
    <div
      className={`flex items-center gap-3 border-b ${p.border} ${p.bg} ${p.text} px-[22px] py-[12px] text-[13px]`}
    >
      <span className={`h-2 w-2 flex-none rounded-full ${p.dot}`} />
      <span>
        <strong className="font-semibold">{derived.banner.leadBold}</strong>
        {derived.banner.rest}
      </span>
    </div>
  );
}
