import type { DerivedState, Tone } from "@/lib/status";

type Props = { derived: DerivedState };

const palette: Record<
  Tone,
  { bg: string; dot: string; text: string }
> = {
  grey: {
    bg: "bg-[var(--surface-2)]",
    dot: "bg-[var(--line-2)]",
    text: "text-[var(--ink)]",
  },
  amber: {
    bg: "bg-[var(--amber-bg)]",
    dot: "bg-[var(--amber)]",
    text: "text-[var(--ink)]",
  },
  green: {
    bg: "bg-[var(--green-bg)]",
    dot: "bg-[var(--green)]",
    text: "text-[var(--ink)]",
  },
  red: {
    bg: "bg-[var(--red-bg)]",
    dot: "bg-[var(--red)]",
    text: "text-[var(--ink)]",
  },
};

export function StatusBanner({ derived }: Props) {
  const p = palette[derived.banner.tone];
  return (
    <div
      className={`flex items-center gap-3 border-t border-[var(--line)] ${p.bg} ${p.text} px-[28px] py-[12px] text-[13px]`}
    >
      <span className={`h-2 w-2 flex-none rounded-full ${p.dot}`} />
      <span>
        <strong className="font-semibold">{derived.banner.leadBold}</strong>
        {derived.banner.rest}
      </span>
    </div>
  );
}
