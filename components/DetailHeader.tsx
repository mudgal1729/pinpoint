// Shared section primitives for the case-detail card. The page heading
// (pin + wordmark + order id + state badge + introduction paragraph)
// lives in BrandHeader.tsx; this file only holds the small label
// primitive that every internal section reuses for parallel chrome.

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.13em] text-[var(--faint)]">
      {children}
    </span>
  );
}
