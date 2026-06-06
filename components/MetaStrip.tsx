import { caseContext } from "@/lib/case";

export function MetaStrip() {
  const { order, sender, recipient, address } = caseContext;
  const amount = `₹${order.amount.toLocaleString("en-IN")}`;
  return (
    <div className="flex flex-wrap items-baseline gap-x-7 gap-y-2 border-b border-[var(--line)] bg-[var(--surface-2)] px-[22px] py-[14px]">
      <Item label="Item" value={order.items[0].replace(" 1 kg", " · 1 kg")} />
      <Item label="Amount" value={amount} />
      <Item
        label="Gift"
        value={
          <>
            {sender.name} → {recipient.name}
            <span className="ml-2 inline-flex items-center rounded-full border border-[var(--line-2)] px-[7px] py-[1px] font-mono text-[8.5px] uppercase tracking-[0.08em] text-[var(--muted)]">
              sender pays
            </span>
          </>
        }
      />
      <div className="ml-auto text-[13px] text-[var(--muted)]">
        <span className="mr-2 font-mono text-[10.5px] uppercase tracking-[0.07em] text-[var(--faint)]">
          Address — typed
        </span>
        House {address.houseNo}, near{" "}
        <span className="font-medium text-[var(--ink)] [border-bottom:2px_solid_var(--amber)] [padding-bottom:1px]">
          {address.landmark}
        </span>
        , {address.area}
      </div>
    </div>
  );
}

function Item({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2 text-[13px]">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.07em] text-[var(--faint)]">
        {label}
      </span>
      <span className="font-medium text-[var(--ink)]">{value}</span>
    </div>
  );
}
