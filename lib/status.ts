// Status state machine. Transitions are driven by operator-action clicks
// and the ElevenLabs SDK conversation-end callback. No persistence;
// status lives in React state.
//
// The enum names below are kept from the original V0 scaffold for slice 4
// coexistence; the new operator-console UI maps them to the design
// vocabulary (idle / running1 / handoff / running2 / resolved / callback)
// via the derive() helper at the bottom of this file. See
// docs/architecture.md section 5 for the full state table.

export type Status =
  | "NEW"
  | "AGENT1_IN_CALL"
  | "AGENT1_DONE"
  | "AGENT2_IN_CALL"
  | "RESOLVED"
  | "CALLBACK_SCHEDULED";

export type StepState = "idle" | "active" | "done" | "locked";
export type AgentTone = "faint" | "amber" | "green";

export type DerivedState = {
  stepper: {
    triggered: StepState;
    orchestrator: StepState;
    sender: StepState;
    receiver: StepState;
    end: StepState;
    endLabel: string;
    // When true, the end node renders with a red ring (callback path).
    endRed: boolean;
  };
  agent1: { statusText: string; statusTone: AgentTone };
  agent2: {
    statusText: string;
    statusTone: AgentTone;
    // When true, the Agent 2 card dims and shows the lock pill.
    locked: boolean;
  };
  agent1OutcomesShown: boolean;
  agent2OutcomesShown: boolean;
  option1Chosen: boolean;
  canCallSender: boolean;
  canCallRecipient: boolean;
  canEscalate: boolean;
  // True while a real SDK call is in flight; controls the End-Call button
  // visibility in the detail header.
  inCall: boolean;
};

export function derive(status: Status): DerivedState {
  switch (status) {
    case "NEW":
      return {
        stepper: {
          triggered: "done",
          orchestrator: "done",
          sender: "idle",
          receiver: "locked",
          end: "idle",
          endLabel: "Resolved",
          endRed: false,
        },
        agent1: { statusText: "Ready", statusTone: "faint" },
        agent2: { statusText: "Waiting", statusTone: "faint", locked: true },
        agent1OutcomesShown: false,
        agent2OutcomesShown: false,
        option1Chosen: false,
        canCallSender: true,
        canCallRecipient: false,
        canEscalate: true,
        inCall: false,
      };
    case "AGENT1_IN_CALL":
      return {
        stepper: {
          triggered: "done",
          orchestrator: "done",
          sender: "active",
          receiver: "locked",
          end: "idle",
          endLabel: "Resolved",
          endRed: false,
        },
        agent1: { statusText: "Calling Ramesh…", statusTone: "amber" },
        agent2: { statusText: "Waiting", statusTone: "faint", locked: true },
        agent1OutcomesShown: false,
        agent2OutcomesShown: false,
        option1Chosen: false,
        canCallSender: false,
        canCallRecipient: false,
        canEscalate: true,
        inCall: true,
      };
    case "AGENT1_DONE":
      return {
        stepper: {
          triggered: "done",
          orchestrator: "done",
          sender: "done",
          receiver: "idle",
          end: "idle",
          endLabel: "Resolved",
          endRed: false,
        },
        agent1: { statusText: "Call complete", statusTone: "green" },
        agent2: { statusText: "Ready", statusTone: "faint", locked: false },
        agent1OutcomesShown: true,
        agent2OutcomesShown: false,
        option1Chosen: true,
        canCallSender: false,
        canCallRecipient: true,
        canEscalate: true,
        inCall: false,
      };
    case "AGENT2_IN_CALL":
      return {
        stepper: {
          triggered: "done",
          orchestrator: "done",
          sender: "done",
          receiver: "active",
          end: "idle",
          endLabel: "Resolved",
          endRed: false,
        },
        agent1: { statusText: "Call complete", statusTone: "green" },
        agent2: {
          statusText: "Calling Suresh…",
          statusTone: "amber",
          locked: false,
        },
        agent1OutcomesShown: true,
        agent2OutcomesShown: false,
        option1Chosen: true,
        canCallSender: false,
        canCallRecipient: false,
        canEscalate: true,
        inCall: true,
      };
    case "RESOLVED":
      return {
        stepper: {
          triggered: "done",
          orchestrator: "done",
          sender: "done",
          receiver: "done",
          end: "done",
          endLabel: "Delivered",
          endRed: false,
        },
        agent1: { statusText: "Call complete", statusTone: "green" },
        agent2: {
          statusText: "Call complete",
          statusTone: "green",
          locked: false,
        },
        agent1OutcomesShown: true,
        agent2OutcomesShown: true,
        option1Chosen: true,
        canCallSender: false,
        canCallRecipient: false,
        canEscalate: false,
        inCall: false,
      };
    case "CALLBACK_SCHEDULED":
      return {
        stepper: {
          triggered: "done",
          orchestrator: "done",
          sender: "done",
          receiver: "idle",
          end: "active",
          endLabel: "Human handoff",
          endRed: true,
        },
        agent1: { statusText: "Call complete", statusTone: "green" },
        agent2: { statusText: "Waiting", statusTone: "faint", locked: true },
        agent1OutcomesShown: true,
        agent2OutcomesShown: false,
        option1Chosen: true,
        canCallSender: false,
        canCallRecipient: false,
        canEscalate: false,
        inCall: false,
      };
  }
}
