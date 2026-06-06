// Single source of truth for the Pinpoint V0 demo case. Read by the
// dashboard to render panels, and by the agent-session bootstrapper to
// pass as ElevenLabs dynamic variables. Do not duplicate any of these
// values elsewhere. Editing the nearby landmarks, the product, or any
// orderEdit field requires re-running
// `node --env-file=.env.local scripts/setup-elevenlabs.mjs --create`
// so the agent prompts pick up the new values.

export const caseContext = {
  language: "Hindi",
  order: {
    items: ["Amul rasmalai 1 kg"],
    amount: 450, // INR
  },
  sender: {
    name: "Ramesh Sharma",
    // For the identity-protection rule in Agent 2.
    phoneLast5: "37289", // shared only if recipient insists twice
  },
  recipient: {
    name: "Suresh Sharma",
  },
  address: {
    houseNo: "142",
    landmark: "Pannadhay Circle",
    area: "Pratapnagar",
    city: "Jaipur",
  },
  issue:
    "The customer typed the right address (House 142 near Pannadhay Circle, Pratapnagar) but dropped the map pin about 2 km away in Pratapnagar Sector 6. If we go by the pin, the delivery lands at the wrong location.",
  // Sanity-check these against a Jaipur map before the recorded run.
  nearbyLandmarks: [
    "Pratapnagar Stadium",
    "Sector 7 Market",
    "B2 Bypass",
  ],
  orderEdit: {
    unavailable: "Amul rasmalai 1 kg",
    reason:
      "Correct location is served by a second store where the Amul rasmalai is unavailable.",
    // The agent walks these in order: offer fallbacks[0]; if he hesitates,
    // offer fallbacks[1]; then fallbacks[2]; if he still hesitates, failure
    // path. The dashboard shows all three at once so the operator can see
    // the full ladder.
    fallbacks: [
      {
        label: "Haldiram rasmalai 1 kg",
        detail: "20 rupees cheaper, difference refunded",
      },
      {
        label: "Amul rasmalai, 2 x 500 g packs",
        detail: "Same item, split into 2 packs",
      },
      {
        label: "Amul rasmalai 500 g",
        detail: "Half size, half price, partial refund",
      },
    ],
  },
  // Pre-dispatch decisions the orchestrator makes BEFORE Agent 1 is called.
  // These shape Agent 1's role and the context it inherits; surfacing them
  // on the dashboard is how the demo communicates that there is real
  // orchestrator reasoning, not just two voice agents. In V0 these are
  // display-only and hardcoded; in production each would be computed.
  orchestratorDecisions: [
    {
      key: "addressConfidence",
      label: "Address confidence",
      value: "Confirm role",
      tone: "amber",
      detail: "Text high, pin low; Agent 1 confirms, not gathers",
    },
    {
      key: "ofse",
      label: "Same-store fulfilment",
      value: "No",
      tone: "amber",
      detail: "Corrected pin outside current store's catchment",
    },
    {
      key: "storeReassignment",
      label: "Store reassignment",
      value: "Yes",
      tone: "green",
      detail: "Second store serves the corrected location",
    },
    {
      key: "inventoryMatch",
      label: "Inventory match",
      value: "Substitute",
      tone: "amber",
      detail: "Amul rasmalai unavailable at the new store",
    },
    {
      key: "callLanguage",
      label: "Call language",
      value: "Hindi",
      tone: "neutral",
      detail: "Customer profile: Hindi-first",
    },
  ],
} as const;

export type CaseContext = typeof caseContext;
export type OrchestratorDecision =
  (typeof caseContext.orchestratorDecisions)[number];
export type DecisionTone = OrchestratorDecision["tone"];
