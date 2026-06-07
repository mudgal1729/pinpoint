import { caseContext } from "@/lib/case";

type Props = { option1Chosen: boolean };

export function Twist({ option1Chosen }: Props) {
  const fallbacks = caseContext.orderEdit.fallbacks;
  const noteFor = (i: number, fallback: { detail: string }) => {
    if (i === 0 && option1Chosen) return "Accepted";
    if (i === 0) return "₹20 cheaper, refunded";
    if (i === 1) return "same item, split";
    return "half size, partial refund";
  };
  const noteTone = (i: number) =>
    i === 0 && option1Chosen
      ? "text-[var(--green)] font-semibold"
      : "text-[var(--faint)]";

  return (
    <section className="mt-5">
      <header className="mb-2 flex items-center gap-2.5">
        <span className="h-2 w-2 rounded-full bg-[var(--amber)]" />
        <h3 className="font-display text-[14px] font-semibold text-[var(--ink)]">
          The twist
        </h3>
      </header>
      <p className="mb-3 text-[12.5px] leading-[1.5] text-[var(--muted)] [text-wrap:pretty]">
        The corrected spot is served by a{" "}
        <span className="font-semibold text-[var(--ink)]">different store</span>{" "}
        without Amul rasmalai, so fixing the location forces an order edit.
        Agent 1 walks these live until one is accepted.
      </p>
      <ol className="flex flex-col gap-[6px]">
        {fallbacks.map((f, i) => (
          <li
            key={f.label}
            className={`flex items-center gap-3 rounded-[8px] border px-[12px] py-[9px] transition ${
              i === 0 && option1Chosen
                ? "border-[var(--green)] bg-[var(--green-bg)]"
                : "border-[var(--line)] bg-[var(--surface)]"
            }`}
          >
            <span
              className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[5px] border font-mono text-[10px] ${
                i === 0 && option1Chosen
                  ? "border-[var(--green)] bg-[var(--green)] text-white"
                  : "border-[var(--line-2)] bg-[var(--surface-3)] text-[var(--muted)]"
              }`}
            >
              {i + 1}
            </span>
            <span className="text-[13px] font-medium text-[var(--ink)]">
              {f.label}
            </span>
            <span
              className={`ml-auto whitespace-nowrap text-[11px] ${noteTone(i)}`}
            >
              {noteFor(i, f)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
