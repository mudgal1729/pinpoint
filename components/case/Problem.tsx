export function Problem() {
  return (
    <section>
      <header className="mb-2 flex items-center gap-2.5">
        <span className="h-2 w-2 rounded-full bg-[var(--red)]" />
        <h3 className="font-display text-[14px] font-semibold text-[var(--ink)]">
          The problem
        </h3>
      </header>
      <p className="text-[13.5px] leading-[1.5] text-[var(--ink)] [text-wrap:pretty]">
        The address is right, but the pin was dropped{" "}
        <span className="font-semibold text-[var(--red)]">~2 km away</span>{" "}
        in Pratapnagar Sector 6. Go by the pin and delivery lands at the
        wrong door, so today the order is{" "}
        <span className="font-semibold text-[var(--red)]">cancelled</span>.
      </p>
    </section>
  );
}
