# Pinpoint, Architecture (V0)

> **This file is the durable system description for the Pinpoint V0 demo.**
> A new session opening this repo with zero prior context should be able to
> read this file end to end and understand what the product is, how the
> pieces fit together, and where the contracts live. Sibling files:
> `docs/build-log.md` (vertical slices, decisions log, and append-only
> per-session implementation log; read it for "what is done" and "what is
> next"), `docs/product-plan.md` (the product narrative; do not edit),
> `docs/design-handoff/` (the operator-console design reference; do not
> edit). The build log records execution state; this file records the
> system itself.

---

## 0. Reading order

1. **Sections 1-2:** what we are building and the single hardcoded case.
2. **Section 3:** `caseContext`, the single source of truth for case data.
3. **Section 4:** the dashboard spec (operator console).
4. **Section 5:** the status flow.
5. **Sections 6-8:** the two voice agents and conversation polish principles.
6. **Section 9:** the stack.
7. **Section 10:** the repo layout.
8. **Section 11:** environment and keys.

For execution state (what slice is in flight, what has shipped, what's next),
read `docs/build-log.md` after this file. If you change anything in this
file, leave a note in `docs/build-log.md` so future sessions can trace the
edit.

---

## 1. What we are building (and not)

**Building (V0, demo only):** a single Next.js page deployed on Vercel
that acts as an **operations console** for a delivery-location
resolution orchestrator. The page shows a small case queue with one
hardcoded case selected, opens that case in a detail panel (order meta,
the problem and twist, a schematic map of the pin gap, and two voice
agents with their goals), exposes inline operator actions to trigger
two ElevenLabs voice calls in Hindi, and advances a visible status as
the calls progress. State lives in memory.

**Not building (talking points only in the deck):** real low-confidence
detection, automated hold-vs-repin decision, geocoding, real fulfillment
integration (serviceability check, store reassignment, inventory, real
repricing), real telephony (Twilio is not used), idempotent retries,
confidence calibration, the full human-handoff workflow, multi-case
queue (the queue is one real row plus four inert skeleton placeholders
that imply a stream), and the four KPI tiles you would expect in a real
console.

The point of V0 is to make the two Hindi conversations feel smooth on a
live recording, inside a frame that reads as a real operator console.
Everything else exists to frame those two calls.

---

## 2. The demo case

A man in his late fifties (Ramesh Sharma) in another city sends a 1 kg
box of Amul rasmalai to his brother (Suresh Sharma) in Jaipur as a gift.
The typed address is correct: House No. 142, near Pannadhay Circle,
Pratapnagar, Jaipur. The dropped map pin, however, sits about 2 km away
in Pratapnagar Sector 6.

The orchestrator notices, holds the order, and triggers Agent 1, which
calls Ramesh. Agent 1 (a) confirms that the typed address (Pannadhay
Circle) is the real intended destination by cross-checking against
nearby landmarks, and (b) confirms an order edit, because the corrected
location is served by a different store where the Amul rasmalai is
unavailable. The agent walks three fallback options in order: first
Haldiram rasmalai 1 kg (20 rupees cheaper, refund issued); if Ramesh
hesitates, Amul rasmalai as two 500 g packs instead; if he still
hesitates, Amul rasmalai 500 g (half size, half price, partial refund).
If Ramesh refuses all three or the line is poor, the case is escalated.

Once Agent 1 finishes successfully, Agent 2 calls Suresh to confirm the
route from Pannadhay Circle to his exact door. Agent 2 protects
Ramesh's identity: it tells Suresh a gift is on its way but does not
say who sent it; only if Suresh insists a second time does the agent
share the last 5 digits of Ramesh's phone number, nothing more. Same
escalation path applies. The dashboard surfaces no relation between
sender and recipient (the orchestrator does not know it); the sibling
framing is narrative context only.

Both calls are in Hindi. Both agent voices are male (a young-to-middle-
aged Blinkit customer-support persona); the customer (Ramesh) and the
recipient (Suresh) are the two real people on the other end of the
calls.

---

## 3. caseContext: single source of truth

This object is hardcoded once, in `lib/case.ts`, and is read by both
the dashboard (to render panels) and the agent-session bootstrapper
(to pass as ElevenLabs dynamic variables). Do not duplicate any of
these values elsewhere.

```ts
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
  // 2 to 3 landmarks close to Pannadhay Circle, used by Agent 1 to
  // confirm it is the right Pannadhay Circle. SANITY-CHECK these
  // against a Jaipur map before the recorded run; if any are wrong,
  // edit here and re-run `node --env-file=.env.local
  // scripts/setup-elevenlabs.mjs --create` so the agent prompts pick
  // up the new values.
  nearbyLandmarks: [
    "Pratapnagar Stadium",
    "Sector 7 Market",
    "B2 Bypass",
  ],
  orderEdit: {
    unavailable: "Amul rasmalai 1 kg",
    reason:
      "Correct location is served by a second store where the Amul rasmalai is unavailable.",
    // The agent walks these in order: offer fallbacks[0]; if he
    // hesitates, offer fallbacks[1]; then fallbacks[2]; if he still
    // hesitates, escalation path. The dashboard shows all three at
    // once so the operator can see the full ladder.
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
  // Pre-dispatch decisions the orchestrator makes BEFORE Agent 1 is
  // called. These shape Agent 1's role and the context it inherits;
  // surfacing them on the dashboard is how the demo communicates that
  // there is real orchestrator reasoning, not just two voice agents.
  // In V0 these are display-only and hardcoded; in production each
  // would be computed (OFSE from a serviceability check, address
  // confidence from a text+pin model, store and inventory from
  // fulfilment lookups, language from the customer profile). See
  // section 4.4 item 5 for the render spec.
  orchestratorDecisions: [
    {
      key: "ofse",
      label: "Same-store fulfilment",
      value: "No",
      tone: "amber",
      detail: "Corrected pin outside current store's catchment",
    },
    {
      key: "addressConfidence",
      label: "Address confidence",
      value: "Confirm role",
      tone: "amber",
      detail: "Text high, pin low; Agent 1 confirms, not gathers",
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
```

Notes:
- `phoneLast5` is dummy data, used only inside the Agent 2 identity rule.
- The three `nearbyLandmarks` are best-effort picks. Verify before
  recording.
- The order ID shown on the dashboard is generated client-side per
  page mount (and on Reset), so it is not in `caseContext`. See
  section 4.
- Sender age band and recipient relation are deliberately absent. The
  orchestrator does not know the relation; age is not surfaced upfront
  in the demo. Both can be inferred from voice if needed.
- If any field changes, re-run the setup script so the agents' prompts
  (which embed these values literally for natural Hindi phrasing)
  refresh in place. The setup script reads the prompt bodies from
  `agents/sender.md` and `agents/receiver.md`; edit those files (or
  the dynamic-variable values in `lib/case.ts`) before re-running.

---

## 4. Dashboard spec (operator console)

The dashboard is the operator-console design in `docs/design-handoff/`.
The HTML in that folder is the source of truth for appearance and
behaviour; this section captures the V0-relevant subset (the design
handoff also has a sidebar nav and a 4-tile KPI strip that we
deliberately drop in V0; see `docs/build-log.md` Decisions log).

### 4.1 Global layout

App shell, two-column. No sidebar.

- **Topbar** (sticky): 60px, translucent app background with
  `backdrop-filter: blur(12px)`, bottom border.
- **Main column**: scrolls under the topbar; padding `24px 28px 40px`;
  20px gap between regions.
- **Workspace** (inside main, master-detail):
  `grid-template-columns: 340px 1fr`, gap 20px, `align-items: start`.

Responsive:
- `<=1180px`: workspace collapses to single column (queue above
  detail); queue loses its sticky.
- `<=920px`: detail body stacks (map above case); the two agents
  stack. Mobile is not a target.

### 4.2 Topbar

- **Breadcrumb** (`.crumbs`): `Cases / #ORDERID`; leaf is mono 600,
  reads the live `orderId` state value.
- **Right side**: an inert search field (`Search cases`, magnifier
  icon, `kbd` "⌘K" hint, 220px) and a live indicator (`.live`):
  pulsing green dot + "Connected". The search field is decorative; do
  not wire focus.

### 4.3 Case queue (left, 340px sticky)

- Card. `position: sticky; top: 76px`.
- Head: "Case queue" + a small mono `live` tag.
- Filter chips: three pills ("Needs action" on, "In progress",
  "Resolved"). **Inert** in V0; the click handler is a no-op.
- List:
  - **One real row** (selected): a status dot (amber while non-
    resolved/non-escalated, green when resolved, red when escalated),
    the live `orderId` value (mono), meta line
    "Pratapnagar, Jaipur · pin 2 km off", a right-side status pill
    that mirrors the detail-header state badge, and an age "2m"
    (static).
  - **Four skeleton placeholder rows**: grey dot + grey skeleton bars
    (`.sk`). Static, inert (no click handler).

### 4.4 Case detail (right)

A single card, vertical stack. Top to bottom:

1. **Detail header**:
   - **Title row**: order id (Space Grotesk 600, 19px) + state badge
     (toned per state per the table in section 5; the badge text is
     "Needs action" / "On call" / "In progress" / "Resolved" /
     "Escalated").
   - **Concept one-liner**: "Orchestrator owns the case and its state;
     it **calls the sender, then the recipient, carrying context
     across**, and escalates to a human if it can't reach certainty."
     (bold span is the concept-in-brief).
   - **Operator actions** (right-aligned row):
     - **Call sender** (`.btn.primary`, dark ink-2 bg, paper text,
       phone icon). Enabled in `idle` only. On click: kicks
       `startSenderSession` and transitions status to `running1`.
     - **Call recipient** (`.btn.ghost`). Enabled in `handoff` only.
       On click: kicks `startReceiverSession` and transitions to
       `running2`.
     - **Escalate** (`.btn.danger`, surface bg, red text, red border).
       Enabled unless `resolved`. On click: transitions to
       `callback`, ends any live conversation, sets
       `forcedCallback.current = true` so onDisconnect does not
       overwrite.
     - **Reset** (icon-only `.btn.ghost.icon`, circular-arrow icon).
       Always enabled. On click: ends any live conversation,
       regenerates `orderId`, transitions to `idle`.
   - **Stepper** (`.stepper`): four nodes connected by lines:
     Triggered (always `done`), Sender call, Recipient call,
     Resolved. The last node's label changes to **"Delivered"** in
     `resolved` and **"Human handoff"** in `callback`. Node states
     per the table in section 5; the `active` ring is amber with a
     1.5s pulse (the `end` node in `callback` is red, no pulse).

2. **Status banner** (`.banner`): full-width tinted strip with a dot
   + live status text. Tone and text per the table in section 5.
   Lead clause is bold.

3. **Meta strip** (`.meta`): four labelled facts:
   - **Item**: `caseContext.order.items[0]` (e.g. "Amul rasmalai · 1 kg")
   - **Amount**: ₹ + `caseContext.order.amount.toLocaleString("en-IN")`
   - **Gift**: `{sender.name} → {recipient.name}` + a "SENDER PAYS"
     mono pill
   - **Address, typed**: "House {houseNo}, near
     **{landmark}**, {area}"; landmark gets a 2px amber underline.
   Labels are mono uppercase (`.mk`).

4. **Detail body** (`.dbody`, 2-column grid):
   - **Map column** (`.map-col`, left, right border, min-height
     280px): an absolutely-filled schematic SVG map (NOT a real
     tile). Warm-grey/cool-grey fill, 56px grid pattern (`<pattern>`),
     four road strokes, a red dashed quadratic curve from the typed
     address to the dropped pin. Three markers:
     - **Typed address** (correct) at SVG (152, 158): green halo +
       solid green dot + 3px white stroke.
     - **Fulfilling store** at (98, 206): 14x14 ink-2 rounded square
       with white stroke.
     - **Dropped pin** (wrong) at (432, 258): red halo + teardrop pin
       in red with white stroke and a white center dot.
     - Overlays: an "Expand" button (top-right, **inert**, placeholder
       for a real map provider), a "~2 km gap" badge centered, and a
       legend (bottom-left) with the three marker meanings.
   - **Case column** (`.case-col`, right): two blocks.
     - **The problem** (red dot tag): "The address is right, but the
       pin was dropped <span class="neg">~2 km away</span> in
       Pratapnagar Sector 6. Go by the pin and delivery lands at the
       wrong door, so today the order is <span class="neg">cancelled
       </span>." (`.neg` = red 600.)
     - **The twist** (amber dot tag): sub line "The corrected spot is
       served by a **different store** without Amul rasmalai, so
       fixing the location forces an order edit. Agent 1 walks these
       live until one is accepted." Then the substitution options
       (`.opts`, three `.opt` rows):
       - 1 · "Haldiram rasmalai · 1 kg"; note "₹20 cheaper, refunded"
       - 2 · "Amul rasmalai · 2 × 500 g"; note "same item, split"
       - 3 · "Amul rasmalai · 500 g"; note "half size, partial
         refund"
       - **Chosen state** (`data-chosen="true"`, applied to option 1
         on transition into `handoff` and held through `resolved`):
         green border + green-bg row + green number chip (white
         text); the note text becomes "Accepted" in green 600.

5. **Orchestrator decisions strip** (`.orch`, border-top, inside the
   detail card, sits BETWEEN the case body and the agents section):
   - **Purpose:** make the orchestrator's reasoning visible. These
     five decisions are the orchestrator's read of the case and the
     things it has pre-computed before dispatching Agent 1. Showing
     them is how the demo communicates that there is real
     orchestrator thinking, not just two voice agents. They render
     above the agents section so the cause-effect flow reads
     top-to-bottom: case body (what happened) → orchestrator
     decisions (what the orchestrator decided) → agents on this case
     (what gets dispatched as a result).
   - **Strip head**: a row with a mono uppercase label "Orchestrator
     decisions" (`.label`) on the left and a muted sub note on the
     right: "Computed before Agent 1; drives the agent's role and
     context."
   - **Container**: padding `14px 22px 16px`, `--surface-2`
     background (same inset shade as the case-meta strip), top
     border `1px var(--line)` (matches the agents section's
     top-border treatment so the two sections sit visually as a
     pair).
   - **Tiles** (`.orch-grid`): CSS grid, `grid-template-columns:
     repeat(5, 1fr)`, gap 10px. One tile per item in
     `caseContext.orchestratorDecisions` (5 entries; if a future
     edit drops or adds entries the grid column count adjusts).
   - **Each tile** (`.orch-tile`): `--surface` background (so the
     tile stands out from the surface-2 strip), border `1px
     var(--line-2)`, radius `var(--r-md)` (10px), padding `9px 11px`,
     `display: flex; flex-direction: column; gap: 3px`. Contents,
     top to bottom:
     - **Header row** (`flex align-items: center gap: 7px`):
       - A 6px tone dot (`.dot`) coloured by `tone`: `amber` →
         `var(--amber)`, `green` → `var(--green)`, `red` →
         `var(--red)`, `neutral` → `var(--line-2)`.
       - The decision **label** (mono 9px uppercase 0.07em tracking
         `var(--faint)`), from `decision.label`.
     - The decision **value** (Space Grotesk 600, 14px,
       `var(--ink)`), from `decision.value`. Single line; if it
       overflows the tile width on narrow viewports, allow ellipsis.
     - The decision **detail** (12px `var(--muted)`, line-height
       1.35, max two lines), from `decision.detail`.
   - **Inert.** Static display; no hover, no click, no transition.
     The values do not change as the case progresses (they are the
     orchestrator's pre-dispatch read; the agents act on them).
     **Exception:** the OFSE tile may be visually anchored as the
     keystone decision if a future iteration wants to highlight it
     (e.g. slightly wider amber dot, or a "drives →" arrow icon
     pointing at the agents section).

6. **Agents section** (`.agents-sec`, border-top, inside the detail
   card):
   - Head: "Agents on this case" + muted note "2 voice agents · Hindi".
   - Two agent cards in a 1:1 grid with a vertical divider:
     - **Agent 1** (`.agent.a1`): avatar = 32px rounded amber chip
       "1", name "Sender Agent", role "Calls Ramesh, the payer", a
       Hindi pill (`.lang`: "हिन्दी · Hindi"), and a live status
       (`.astat`). Status text: `Ready` (faint) → `Calling Ramesh…`
       (amber, dot pulsing) → `Call complete` (green).
     - **Agent 2** (`.agent.a2`): avatar = 32px rounded ink-2 chip
       "2", name "Receiver Agent", role "Calls Suresh, at the door",
       Hindi pill, live status. Status text: `Waiting` (faint) →
       `Ready` once handoff is reached → `Calling Suresh…` (amber
       pulsing) → `Call complete` (green).
   - **Agent 2 only, inherit note** (`.inherit`, between header and
     goals): arrow icon + "Resumes with **everything Agent 1
     learned**; never starts cold." This is the visible proof of
     state carrying.
   - **Goals** (each agent has two):
     - Each `.goal` row: number chip (`.gn`, 21x21 mono, surface-3
       bg), title (`.gt`, 13px 600), description (`.gd`, 12px muted).
     - **Outcome** (`.outcome`): hidden by default (opacity 0,
       translateY 3px). On reveal (`.show`): fades/slides in, bg →
       green-bg, border → green-ish, check circle → green with white
       checkmark. Transitions 0.4s. Bold spans are ink 600.
       - Agent 1 / Goal 1 "Confirm the delivery address" / desc
         "Cross-check the landmark and correct the pin." → outcome
         "**House 142, Pannadhay Circle** confirmed; pin corrected
         by ~2 km."
       - Agent 1 / Goal 2 "Confirm the order edit" / desc "A second
         store fulfils it; offer substitution + refund." → outcome
         "**Haldiram substitute** accepted; ₹20 refunded."
       - Agent 2 / Goal 1 "Confirm the route to the door" / desc
         "Lane, gate colour, floor; for the partner." → outcome
         "**2nd lane, blue gate, 2nd floor**; handed to the
         partner."
       - Agent 2 / Goal 2 "Protect the sender's identity" / desc
         "Announce a gift; decline who sent it unless pressed." →
         outcome "**Identity protected**; shared only the last 5
         digits, on a second insist."
   - **Agent 2 locked state** (in `idle` and `running1`): card
     opacity 0.55 + a centered veil pill "UNLOCKS AFTER AGENT 1"
     (`.lock-pill`, mono 10px uppercase).

### 4.5 Settle-only behaviour during live calls

The SDK only surfaces two events per call: the click that starts the
session, and the `onDisconnect` callback when the call ends. We do
**not** drive timer-based mid-call animations (no scripted outcome
reveals at +1.2s, +2.7s like the HTML prototype). Instead:

- **Call sender click** → `running1`:
  - Sender stepper node → `active` (amber, pulses).
  - Agent 1 `.astat` → "Calling Ramesh…" amber, dot pulses.
  - State badge → "On call" (amber).
  - Banner tone → amber, text → "**Agent 1 on the line with the
    sender**; confirming the address…".
  - No outcome reveal, no Option 1 chosen state, no banner change
    until disconnect.
- **SDK `onDisconnect` fires** (and `forcedCallback.current === false`)
  → `handoff`:
  - Sender stepper node → `done` (green).
  - Recipient stepper node + Agent 2 → unlock to `idle`/`Ready`.
  - Agent 1 `.astat` → "Call complete" (green).
  - Both Agent 1 outcomes reveal (with check, green-bg, slide).
  - Option 1 row → chosen ("Accepted").
  - State badge → "In progress" (amber).
  - Banner tone → amber, text → "**Address & order edit confirmed.**
    Context carried; ready to call the recipient."
  - Call sender disabled, Call recipient enabled.
- **Call recipient click** → `running2`:
  - Recipient stepper node → `active` (amber, pulses).
  - Agent 2 `.astat` → "Calling Suresh…" amber, dot pulses.
  - State badge → "On call" (amber).
  - Banner tone → amber, text → "**Agent 2 resumes with Agent 1's
    context**; confirming the route to the door…".
- **SDK `onDisconnect` fires** (and `forcedCallback.current === false`)
  → `resolved`:
  - Recipient stepper node → `done` (green).
  - End stepper node → `done` (green), label "Delivered".
  - Agent 2 `.astat` → "Call complete" (green).
  - Both Agent 2 outcomes reveal.
  - State badge → "Resolved" (green); queue row dot + status pill →
    green.
  - Banner tone → green, text → "**Location resolved, route
    confirmed, identity protected.** Order on the way."
  - All operator actions disabled (Reset still enabled).
- **Escalate** (anytime non-resolved) → `callback`:
  - `forcedCallback.current = true`; any live conversation ends.
  - End stepper node → `active`, with the red ring + red dot (no
    pulse); label "Human handoff".
  - State badge → "Escalated" (red).
  - Banner tone → red, text → "**Couldn't reach certainty.**
    Callback promised; routed to a human with all context so far."
  - All operator actions disabled (Reset still enabled).
- **Reset** (any state) → `idle`:
  - Any live conversation ends.
  - Refs cleared (`activeConversation = null`,
    `forcedCallback = false`).
  - `orderId` regenerated (Blinkit-style `OD` + 11 random digits).
  - All UI returns to the `idle` baseline.

### 4.6 Animation specifics

- Stepper / agent / banner state transitions: 0.35-0.4s.
- Outcome reveal: opacity + `translateY(3px) -> 0` + color/background,
  0.4s; checkmark opacity 0.3s.
- Pulses: amber ring on active stepper nodes and the
  `Calling…` agent dot (1.5s loop); green ring on the topbar live
  dot (slower).
- Respect `prefers-reduced-motion`: gate the looping amber and green
  pulses behind the media query in component code.

### 4.7 Design tokens

All colours are OKLCH (cool-neutral SaaS-console palette). Source of
truth is the design handoff README; this section is a paste for
reference.

| Token | OKLCH | ~Hex | Use |
|---|---|---|---|
| `--bg` | `oklch(0.967 0.003 255)` | `#F2F3F5` | App background |
| `--surface` | `oklch(0.998 0.001 255)` | `#FCFDFE` | Cards, topbar |
| `--surface-2` | `oklch(0.978 0.003 255)` | `#F4F6F8` | Insets, hovers, banners |
| `--surface-3` | `oklch(0.962 0.004 255)` | `#ECEFF2` | Chips, skeletons, selected row |
| `--ink` | `oklch(0.275 0.018 264)` | `#383D48` | Primary text |
| `--ink-2` | `oklch(0.235 0.020 264)` | `#2E323C` | Primary buttons, Agent 2 avatar |
| `--muted` | `oklch(0.520 0.015 262)` | `#71788A` | Secondary text |
| `--faint` | `oklch(0.630 0.013 262)` | `#8D93A3` | Labels, tertiary text |
| `--line` | `oklch(0.912 0.006 262)` | `#E3E6EB` | Borders/dividers |
| `--line-2` | `oklch(0.875 0.008 262)` | `#D6DAE1` | Stronger borders, connectors |
| `--amber` | `oklch(0.72 0.125 66)` | `#CC9038` | In-progress · Agent 1 · address highlight |
| `--amber-bg` | `oklch(0.952 0.034 78)` | `#F6EEDC` | Amber badge/banner background |
| `--green` | `oklch(0.595 0.108 155)` | `#43946A` | Confirmed / resolved · live dot |
| `--green-bg` | `oklch(0.955 0.034 158)` | `#E5F3EA` | Outcome success background |
| `--red` | `oklch(0.575 0.170 26)` | `#C8492F` | Problem / wrong pin / escalate |
| `--red-bg` | `oklch(0.953 0.034 30)` | `#FAE8E2` | Red badge/banner background |

Implementation: define these as CSS custom properties on `:root` in
`app/globals.css`. Reference them from Tailwind via arbitrary values
(`bg-[var(--surface)]`, `text-[var(--ink)]`) or extend
`tailwind.config.ts` to register them as named tokens; whichever is
faster to ship. The handoff CSS uses raw OKLCH so the values
themselves don't need to be re-derived.

### 4.8 Typography

- **Display / titles / numbers**: Space Grotesk, 500/600/700.
  (Google Fonts.)
- **Body / UI**: Helvetica Neue, Helvetica, Arial, sans-serif.
- **Mono (labels, ids, pills, kbd, status tags)**: JetBrains Mono,
  400/500. (Google Fonts.)
- Sizes: order-id title 19px/600; card titles 14-15px/600; body
  13-13.5px; descriptions 12-12.5px; labels/pills 8.5-11px (mono,
  uppercase, letter-spacing ~0.06-0.13em).
- `text-wrap: pretty` on multi-line paragraphs.

Load both Google Fonts in `app/layout.tsx`.

---

## 5. Status flow

Single state enum: `idle | running1 | handoff | running2 | resolved |
callback`. Transitions are driven by operator-action clicks and the
ElevenLabs SDK `onDisconnect` callback (exact name locked in
`docs/sdk-notes.md`).

| State | Trigger to enter | Banner sentence shown (lead-bold) |
|---|---|---|
| `idle` | Initial; Reset | "**Low-confidence order detected.** Ready to call the sender." |
| `running1` | Call sender click | "**Agent 1 on the line with the sender**; confirming the address…" |
| `handoff` | SDK onDisconnect from running1 (forcedCallback false) | "**Address & order edit confirmed.** Context carried; ready to call the recipient." |
| `running2` | Call recipient click | "**Agent 2 resumes with Agent 1's context**; confirming the route to the door…" |
| `resolved` | SDK onDisconnect from running2 (forcedCallback false) | "**Location resolved, route confirmed, identity protected.** Order on the way." |
| `callback` | Escalate (or onDisconnect with forcedCallback true) | "**Couldn't reach certainty.** Callback promised; routed to a human with all context so far." |

Derived per-state UI (use a single `derive(state)` helper in
`lib/status.ts` that returns flags + copy; render components consume
the helper rather than switching on the enum locally):

| Element | idle | running1 | handoff | running2 | resolved | callback |
|---|---|---|---|---|---|---|
| Sender step | idle | active | done | done | done | done\* |
| Recipient step | locked | locked | idle | active | done | unchanged\* |
| End step | idle | idle | idle | idle | done | active (red) |
| End step label | Resolved | Resolved | Resolved | Resolved | Delivered | Human handoff |
| State badge | Needs action (grey) | On call (amber) | In progress (amber) | On call (amber) | Resolved (green) | Escalated (red) |
| Banner tone | grey | amber | amber | amber | green | red |
| Agent 1 status | Ready | Calling Ramesh… | Call complete | Call complete | Call complete | \* |
| Agent 2 status | Waiting | Waiting | Ready | Calling Suresh… | Call complete | \* |
| Agent 1 outcomes | hidden | hidden | shown | shown | shown | \* |
| Agent 2 outcomes | hidden | hidden | hidden | hidden | shown | \* |
| Option 1 chosen | no | no | yes | yes | yes | \* |
| Agent 2 locked veil | shown | shown | hidden | hidden | hidden | hidden |
| Call sender btn | enabled | disabled | disabled | disabled | disabled | disabled |
| Call recipient btn | disabled | disabled | enabled | disabled | disabled | disabled |
| Escalate btn | enabled | enabled | enabled | enabled | disabled | disabled |
| Reset btn | enabled | enabled | enabled | enabled | enabled | enabled |

\* `callback` preserves whatever was gathered before escalation. The
key requirement: Escalate is reachable from any non-`resolved` state
and ends the run safely.

"Ends successfully" in V0 means: the SDK fires `onDisconnect` and the
operator did not click Escalate during the call. We are not parsing
transcript content; the operator decides whether the call went well
by either letting it conclude naturally or by clicking Escalate.

---

## 6. Agent 1 (Sender, Hindi, male)

The system prompt is owned by `agents/sender.md`. The setup script
(`scripts/setup-elevenlabs.mjs`) reads that file at runtime and PATCHes
it into the live ElevenLabs agent. This section specifies what that
prompt must contain.

**Role:** a male Blinkit customer-support assistant calling the
customer who placed the order, in Hindi, because the delivery
location is unclear. Warm, brief, clear. Natural conversational
Hindi, polite register suitable for an older customer (use `aap`, not
`tum`). Pace is measured; the customer is in his fifties, so allow
him to interrupt and do not rush. The agent already knows the order
and the address; it confirms, it does not interrogate.

**Dynamic variables passed at session start** (from `caseContext`):

- `sender_name`, `recipient_name`
- `items`, `amount`
- `address_house_no`, `address_landmark`, `address_area`,
  `address_city`
- `issue_summary`
- `nearby_landmarks` (joined as a comma-separated string for the
  prompt)
- `order_edit_reason`
- `fallback_1_text`, `fallback_2_text`, `fallback_3_text` (each is
  the label and the detail joined as `"Label (detail)"`, ready to be
  spoken inline by the agent)
- `sender_phone_last5` (used by Agent 2; passed to Agent 1 too,
  harmless)

**Goals, in order:**

1. **Confirm the delivery address.** Greet politely, introduce as
   Blinkit, explain gently that the typed address looks correct but
   the map pin sits about 2 km away near Pratapnagar Sector 6, far
   from Pannadhay Circle. Confirm the house number (142) and Pannadhay
   Circle. To be sure it is the right Pannadhay Circle, mention one
   or two of the `nearby_landmarks` and ask him to confirm. Then ask
   if he knows the route from Pannadhay Circle to the house.
2. **Confirm the order edit.** Explain that the corrected location
   is served by a different store, and there Amul rasmalai is not
   available. Walk three fallback options in order, one at a time,
   and wait for an answer between each: first `fallback_1_text`
   (Haldiram rasmalai 1 kg, 20 rupees cheaper, refund), then on
   hesitation `fallback_2_text` (Amul rasmalai as 2 x 500 g packs),
   then on further hesitation `fallback_3_text` (Amul rasmalai
   500 g, half size, partial refund). Confirm whichever he picks. If
   he refuses all three, fall through to the escalation path.

**Close:** thank him; confirm the address and the order edit are
set; let him know the order is being arranged.

**Case-specific handling notes** (must be in the prompt so the turns
are smooth):

- If he says the pin is wrong or does not understand what a pin is:
  reassure him; the typed address is right; you just need the
  landmark and the route confirmed.
- Nearby-landmark cross-check: keep the landmarks ready; if he
  confirms one, treat Pannadhay Circle as correct and move on.
- Substitution ladder: always present one fallback at a time; do not
  list them upfront. Wait for his answer between each. Order is
  fixed: Haldiram rasmalai -> 2 x 500 g packs of Amul rasmalai ->
  Amul rasmalai 500 g (half pack). If he refuses all three, move to
  the escalation path.
- Escalation path: if he is confused after a couple of tries or the
  line is bad, say politely that someone from the team will call him
  shortly, and end. The dashboard will register `callback` on
  disconnect if the operator clicked Escalate first; otherwise the
  operator can click Escalate after.

**Voice:** a calm, clear, confident, professional yet approachable
middle-aged male Hindi voice. Picked: NJ (`iVOyIHSsWJ9SEmfuJOud` in
our account; pulled from the ElevenLabs shared library). Stored as
`PINPOINT_SENDER_VOICE_ID` in `.env.local`. Swap by replacing the env
var and re-running the setup script.

---

## 7. Agent 2 (Receiver, Hindi, male)

The system prompt is owned by `agents/receiver.md`. Same loading
mechanism as Agent 1.

**Role:** a male Blinkit customer-support assistant calling the
recipient of a scheduled gift delivery, in Hindi, to confirm exactly
how to reach the door. Warm, brief, natural Hindi, polite register
(use `aap`). The agent already knows the area and the landmark from
the first call; it builds on them, it does not start from scratch.
The recipient is male (Suresh Sharma); Hindi verb agreement matters
here: use `rehte hain` (masculine respectful) not `rehti hain`
(feminine respectful).

**Dynamic variables passed at session start:** same as Agent 1
(`fallback_*_text` are harmless to pass even though Agent 2 does not
read them).

**Goals, in order:**

1. Greet warmly. Let him know a gift delivery is on its way to him.
   Mention that you are calling to confirm how to reach the house.
   Reassure him, since he is not expecting the call.
2. Confirm the route from Pannadhay Circle to the house, with a
   single open question. Accept whatever he gives (a lane, a turn, a
   marker, a colour, a floor) and move on. Do not probe for
   specifics, do not follow up asking for gate colour, floor number,
   or visible markers, do not push if his answer feels thin. The
   dashboard outcome ("2nd lane, blue gate, 2nd floor") is staged
   demo copy, not a list the agent must extract.

**Identity rule:** do not say who sent the gift. If he asks, decline
with the gift framing: it is a gift, and the sender has requested
that their name not be shared. Do not phrase the refusal as "this
information is private", since that reads as cold or institutional.
Only if he insists a second time, share the last 5 digits of
`sender_phone_last5`, and nothing more (no name, no relation, no
city).

**Close:** thank him; confirm the route is noted; the order is on
the way.

**Case-specific handling notes:**

- Opening must be reassuring, not alarming. He is not expecting a
  call.
- Route confirmation: one open ask, then accept what he gives. Do
  not probe for gate colour, floor number, or visible markers.
- Escalation path: if he cannot or will not describe the route after
  one ask, or the line is bad, say someone will call shortly, end.
  Operator clicks Escalate to register `callback`.

**Voice:** a young, natural, human-like male Hindi voice that sounds
like a real caller rather than a script. Picked: Krishna
(`iB2rIwm9cQCRGWoKDRtX` in our account; pulled from the ElevenLabs
shared library). Stored as `PINPOINT_RECEIVER_VOICE_ID` in
`.env.local`. Distinct in age and timbre from the Sender voice so
the listener can tell them apart on the recording.

---

## 8. Conversation polish principles

The build deliberately spends most time here. These principles guide
prompt tuning.

- Write system prompts as **role + goals + handling notes + Hindi
  example turns**, not as line-by-line scripts. The agent should
  sound natural and recover gracefully when the operator improvises.
- Tune Hindi phrasing for register: polite (`aap`, not `tum`); short
  turns; quick acknowledgements (`achha`, `theek hai`,
  `samajh gaya`); no robotic repetition of the full address.
- Allow barge-in so the operator can interrupt mid-turn.
- Pre-load all context as ElevenLabs dynamic variables at session
  start, so the model is doing only light reasoning mid-call. This
  keeps per-turn latency low.
- Iteration loop: run a full call, note the awkward beats, edit the
  prompt in `agents/sender.md` or `agents/receiver.md`, re-run
  `scripts/setup-elevenlabs.mjs --create` (idempotent PATCH on the
  existing agents), call again. Repeat until both calls flow.
- Final recorded run is on a clean cold start, on the deployed
  Vercel URL, not on localhost.

---

## 9. Stack and architecture

- **Framework:** Next.js (App Router), React, TypeScript, Tailwind.
- **State:** React in-memory (`useState`, no Redux, no Zustand). No
  `localStorage` persistence in V0 (the HTML prototype uses it; we
  deliberately don't; a refresh resets, which matches the operator
  flow of always hitting Reset before recording).
- **Voice:** ElevenLabs Conversational AI. Two agents are created in
  the ElevenLabs account via the API
  (`scripts/setup-elevenlabs.mjs --bootstrap`) at build time, not in
  the dashboard UI. The browser starts each session using the
  ElevenLabs Web SDK with a signed URL fetched from a Next.js API
  route.
- **Dynamic variables** are passed at session start so the prompt is
  hydrated with the case values.
- **Conversation-end event** from the SDK advances the status.
- **Backend:** only what a Next.js app on Vercel gives you. No
  database, no queue, no telephony. The two API routes are
  server-only: one for signed URLs, one optional for health.
- **Auth model:** the ElevenLabs API key never enters the browser.
  The signed-URL route fetches the key from `process.env`, requests
  a signed URL from ElevenLabs, and returns only the signed URL to
  the client. The client uses that URL to open the WebSocket
  session.
- **Deploy:** Vercel for the recorded run. Localhost for rehearsal.
- **SDK shape reference:** `docs/sdk-notes.md` is the canonical
  reference for ElevenLabs Conv AI SDK field names (session start,
  dynamic-variables field, conversation-end callback, signed-URL
  endpoint, agent-creation HTTP endpoint). If a future SDK change
  breaks the integration, update `docs/sdk-notes.md` and section 9
  here, then log it in `docs/build-log.md`.

---

## 10. Repo layout

```
PinPoint/
  README.md
  package.json
  next.config.mjs
  tsconfig.json
  tailwind.config.ts
  postcss.config.mjs
  .env.example                         # committed; .env.local is gitignored
  .gitignore
  agents/
    sender.md                          # Agent 1 system prompt (read by setup-elevenlabs.mjs)
    receiver.md                        # Agent 2 system prompt
  app/
    layout.tsx                         # loads Space Grotesk + JetBrains Mono
    globals.css                        # CSS vars for design tokens
    page.tsx                           # operator-console composition
    api/
      signed-url/route.ts              # GET ?agent=sender|receiver
  components/
    chrome/
      BrandHeader.tsx                  # top heading block + stepper container
      Stepper.tsx                      # 4-node pipeline
    orchestrator/
      OrchestratorDecisions.tsx        # the 5 pre-dispatch decisions strip
    case/
      DemoCase.tsx                     # CTAs + status + order facts row
      DetailHeader.tsx                 # detail card header
      IssueMap.tsx                     # schematic SVG of the pin gap
      Problem.tsx                      # red dot + 2 sentences
      Twist.tsx                        # amber dot + sub + 3 substitution options
      AgentCard.tsx                    # one agent surface (avatar + goals)
      AgentsSection.tsx                # head + 2 AgentCard children
  lib/
    case.ts                            # caseContext
    elevenlabs.ts                      # client-side SDK helpers
    status.ts                          # state machine + derive(state)
  scripts/
    setup-elevenlabs.mjs               # voice + agent creation, idempotent;
                                       # reads agents/sender.md + agents/receiver.md
  docs/
    architecture.md                    # this file
    build-log.md                       # slices, decisions log, append-only session log
    product-plan.md                    # product narrative; do not edit
    sdk-notes.md                       # ElevenLabs Conv AI SDK reference
    design-handoff/                    # design source of truth; do not edit
```

---

## 11. Environment and keys

The provided `Buildathon keys.rtf` (kept outside the repo) is reused
across multiple buildathon demos. Most of its keys are for a different
project (a patient-discharge follow-up demo). For Pinpoint V0 we use
exactly **one** key from it:

| Variable | Source | Used for |
|---|---|---|
| `ELEVENLABS_API_KEY` | from the rtf, server-side | agent creation, signed URLs |
| `PINPOINT_SENDER_VOICE_ID` | written by `setup-elevenlabs.mjs` | passed to agent at creation |
| `PINPOINT_RECEIVER_VOICE_ID` | written by `setup-elevenlabs.mjs` | passed to agent at creation |
| `PINPOINT_SENDER_AGENT_ID` | written by `setup-elevenlabs.mjs` | session start (Agent 1) |
| `PINPOINT_RECEIVER_AGENT_ID` | written by `setup-elevenlabs.mjs` | session start (Agent 2) |

The four `PINPOINT_*` IDs are populated automatically by the
bootstrap script the first time it runs. Subsequent runs PATCH the
existing agents in place. Voice IDs can be swapped by hand in
`.env.local`; agent IDs should not be edited by hand.

**Explicitly ignored** (do not read or pass through, even though they
are in the rtf): `CONVEX_*`, `NEXT_PUBLIC_CONVEX_URL`,
`ELEVENLABS_AGENT_ID` (this belongs to the other demo, not ours),
`ELEVENLABS_PHONE_NUMBER_ID`, all `TWILIO_*`, `RESEND_*`, `SLACK_*`,
all `PATIENT_*`. The Pinpoint V0 demo is browser-side voice only;
there is no SMS, no phone-call telephony, no email, no Slack
notification, no DB.

`.env.example` is committed and lists the five Pinpoint variables.
`.env.local` is gitignored. The `ELEVENLABS_API_KEY` is filled in by
hand once (copy from `Buildathon keys.rtf`); the other four are
filled in by the bootstrap script.

For the Vercel deploy, add three vars in the Vercel project's
Environment Variables panel: `ELEVENLABS_API_KEY`,
`PINPOINT_SENDER_AGENT_ID`, `PINPOINT_RECEIVER_AGENT_ID`. (Voice IDs
are baked into the agents at creation time, so they don't need to be
in Vercel env.)
