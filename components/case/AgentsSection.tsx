import { caseContext } from "@/lib/case";
import type { DerivedState } from "@/lib/status";
import { AgentCard } from "./AgentCard";
import { SectionLabel } from "@/components/SectionLabel";

const AGENT_1_GOALS = [
  {
    title: "Confirm the delivery address",
    detail: "Cross-check the landmark and correct the pin.",
    outcome: (
      <>
        <strong className="font-semibold text-[var(--ink)]">
          House 142, Pannadhay Circle
        </strong>{" "}
        confirmed; pin corrected by ~2 km.
      </>
    ),
  },
  {
    title: "Confirm the order edit",
    detail: "A second store fulfils it; offer substitution and refund.",
    outcome: (
      <>
        <strong className="font-semibold text-[var(--ink)]">
          Haldiram substitute
        </strong>{" "}
        accepted; ₹20 refunded.
      </>
    ),
  },
];

const AGENT_2_GOALS = [
  {
    title: "Confirm the route to the door",
    detail: "Lane, gate colour, floor; for the delivery partner.",
    outcome: (
      <>
        <strong className="font-semibold text-[var(--ink)]">
          2nd lane, blue gate, 2nd floor
        </strong>
        ; handed to the partner.
      </>
    ),
  },
  {
    title: "Protect the sender's identity",
    detail: "Announce a gift; decline who sent it unless pressed.",
    outcome: (
      <>
        <strong className="font-semibold text-[var(--ink)]">
          Identity protected
        </strong>
        ; shared only the last 5 digits, on a second insist.
      </>
    ),
  },
];

type Props = { derived: DerivedState };

export function AgentsSection({ derived }: Props) {
  return (
    <section className="border-t border-[var(--line)]">
      <header className="flex items-center justify-between px-[28px] pt-[18px] pb-[10px]">
        <SectionLabel>Agents on this case</SectionLabel>
        <span className="text-[11.5px] text-[var(--muted)]">
          2 voice agents, Hindi
        </span>
      </header>
      <div className="grid grid-cols-2">
        <div className="border-r border-[var(--line)]">
          <AgentCard
            agent="a1"
            name="Sender Agent"
            role="Calls Ramesh, the payer"
            language={caseContext.language}
            statusText={derived.agent1.statusText}
            statusTone={derived.agent1.statusTone}
            goals={AGENT_1_GOALS}
            outcomesShown={derived.agent1OutcomesShown}
            locked={false}
          />
        </div>
        <AgentCard
          agent="a2"
          name="Receiver Agent"
          role="Calls Suresh, at the door"
          language={caseContext.language}
          statusText={derived.agent2.statusText}
          statusTone={derived.agent2.statusTone}
          goals={AGENT_2_GOALS}
          outcomesShown={derived.agent2OutcomesShown}
          locked={derived.agent2.locked}
          inheritNote={
            <span>
              Resumes with{" "}
              <strong className="font-semibold text-[var(--ink)]">
                everything Agent 1 learned
              </strong>
              ; never starts cold.
            </span>
          }
        />
      </div>
    </section>
  );
}
