# Pinpoint, Build Plan (V0)

> **This file is the single source of truth for the Pinpoint V0 build.** A
> new session opening this repo with zero prior context should be able to
> read this file end to end and continue work. Sibling files:
> `pinpoint-product-plan.md` (the product narrative; do not edit),
> `pinpoint-demo-presentation.md` (the deck talking points; do not edit),
> and `design_handoff_pinpoint_dashboard/` (the operator-console design
> reference; do not edit). All implementation decisions live here.

---

## Standard session-start prompt

Paste this into a fresh session, no edits, regardless of which slice is
next.

```
Read pinpoint-build-plan.md in full. Section 15 has a "Built so far"
summary and the running implementation log; use them to find the next
slice that is not fully done. Execute that slice per its spec in
section 12. Before ending, append a new entry to the implementation log
per the template at the top of section 15.
```

If you want to override the auto-selection (for example, polish work in
an already-done slice), say so explicitly after the paste.

---

## 0. How to use this document

1. **Read sections 1 through 11 first.** They define what we are
   building, the single hardcoded case, the operator console, the two
   voice agents, the stack, the repo layout, and the environment. They
   do not change often.
2. **Then read section 12** (vertical slices). That is the execution
   plan, ordered. Find the next slice that is not yet checked off in the
   implementation log (section 15) and start there.
3. **Then read section 15** (implementation log). The top "Built so far"
   subsection summarises what previous sessions produced; the entries
   below it record per-session deviations and gotchas. Trust the log
   over your assumptions about repo state, but verify with `ls` or
   `git status` before acting on it.
4. **Before ending your session,** append a new entry to section 15.
   The format is specified at the top of that section. This is
   mandatory; without it the next session has no idea what you
   changed.
5. **If you change the plan itself** (a slice splits, a decision
   reverses, the case context is edited), update the relevant section
   in place and log the change in section 15 with a short
   "Plan changes" line. Do not leave the document inconsistent with the
   code.

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
      detail: "Text high, pin low — Agent 1 confirms, not gathers",
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
  refresh in place. See section 12, slice 6.

---

## 4. Dashboard spec (operator console)

The dashboard is the operator-console design in
`design_handoff_pinpoint_dashboard/`. The HTML in that folder is the
source of truth for appearance and behaviour; this section captures the
V0-relevant subset (the design handoff also has a sidebar nav and a
4-tile KPI strip that we deliberately drop in V0 — see section 14).

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

- **Breadcrumb** (`.crumbs`): `Cases / #ORDERID` — leaf is mono 600,
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
   - **Concept one-liner**: "Orchestrator owns the case and its state
     — it **calls the sender, then the recipient, carrying context
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
   - **Stepper** (`.stepper`): four nodes connected by lines —
     Triggered (always `done`), Sender call, Recipient call,
     Resolved. The last node's label changes to **"Delivered"** in
     `resolved` and **"Human handoff"** in `callback`. Node states
     per the table in section 5; the `active` ring is amber with a
     1.5s pulse (the `end` node in `callback` is red, no pulse).

2. **Status banner** (`.banner`): full-width tinted strip with a dot
   + live status text. Tone and text per the table in section 5.
   Lead clause is bold.

3. **Meta strip** (`.meta`): four labelled facts —
   - **Item**: `caseContext.order.items[0]` (e.g. "Amul rasmalai · 1 kg")
   - **Amount**: ₹ + `caseContext.order.amount.toLocaleString("en-IN")`
   - **Gift**: `{sender.name} → {recipient.name}` + a "SENDER PAYS"
     mono pill
   - **Address — typed**: "House {houseNo}, near
     **{landmark}**, {area}" — landmark gets a 2px amber underline.
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
     - Overlays: an "Expand" button (top-right, **inert** — placeholder
       for a real map provider), a "~2 km gap" badge centered, and a
       legend (bottom-left) with the three marker meanings.
   - **Case column** (`.case-col`, right): two blocks.
     - **The problem** (red dot tag): "The address is right — but the
       pin was dropped <span class="neg">~2 km away</span> in
       Pratapnagar Sector 6. Go by the pin and delivery lands at the
       wrong door, so today the order is <span class="neg">cancelled
       </span>." (`.neg` = red 600.)
     - **The twist** (amber dot tag): sub line "The corrected spot is
       served by a **different store** without Amul rasmalai — so
       fixing the location forces an order edit. Agent 1 walks these
       live until one is accepted." Then the substitution options
       (`.opts`, three `.opt` rows):
       - 1 · "Haldiram rasmalai · 1 kg" — note "₹20 cheaper, refunded"
       - 2 · "Amul rasmalai · 2 × 500 g" — note "same item, split"
       - 3 · "Amul rasmalai · 500 g" — note "half size, partial
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
     right: "Computed before Agent 1 — drives the agent's role and
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
     pointing at the agents section). Out of scope for slice 5.

6. **Agents section** (`.agents-sec`, border-top, inside the detail
   card):
   - Head: "Agents on this case" + muted note "2 voice agents · Hindi".
   - Two agent cards in a 1:1 grid with a vertical divider:
     - **Agent 1** (`.agent.a1`): avatar = 32px rounded amber chip
       "1", name "Sender Agent", role "Calls Ramesh — the payer", a
       Hindi pill (`.lang`: "हिन्दी · Hindi"), and a live status
       (`.astat`). Status text: `Ready` (faint) → `Calling Ramesh…`
       (amber, dot pulsing) → `Call complete` (green).
     - **Agent 2** (`.agent.a2`): avatar = 32px rounded ink-2 chip
       "2", name "Receiver Agent", role "Calls Suresh — at the door",
       Hindi pill, live status. Status text: `Waiting` (faint) →
       `Ready` once handoff is reached → `Calling Suresh…` (amber
       pulsing) → `Call complete` (green).
   - **Agent 2 only — inherit note** (`.inherit`, between header and
     goals): arrow icon + "Resumes with **everything Agent 1
     learned** — never starts cold." This is the visible proof of
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
         "**House 142, Pannadhay Circle** confirmed — pin corrected
         by ~2 km."
       - Agent 1 / Goal 2 "Confirm the order edit" / desc "A second
         store fulfils it; offer substitution + refund." → outcome
         "**Haldiram substitute** accepted — ₹20 refunded."
       - Agent 2 / Goal 1 "Confirm the route to the door" / desc
         "Lane, gate colour, floor — for the partner." → outcome
         "**2nd lane, blue gate, 2nd floor** — handed to the
         partner."
       - Agent 2 / Goal 2 "Protect the sender's identity" / desc
         "Announce a gift; decline who sent it unless pressed." →
         outcome "**Identity protected** — shared only the last 5
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
    sender** — confirming the address…".
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
    Context carried — ready to call the recipient."
  - Call sender disabled, Call recipient enabled.
- **Call recipient click** → `running2`:
  - Recipient stepper node → `active` (amber, pulses).
  - Agent 2 `.astat` → "Calling Suresh…" amber, dot pulses.
  - State badge → "On call" (amber).
  - Banner tone → amber, text → "**Agent 2 resumes with Agent 1's
    context** — confirming the route to the door…".
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
`tailwind.config.ts` to register them as named tokens — whichever is
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
| `running1` | Call sender click | "**Agent 1 on the line with the sender** — confirming the address…" |
| `handoff` | SDK onDisconnect from running1 (forcedCallback false) | "**Address & order edit confirmed.** Context carried — ready to call the recipient." |
| `running2` | Call recipient click | "**Agent 2 resumes with Agent 1's context** — confirming the route to the door…" |
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

The system prompt is written in English with sample Hindi turns
embedded so the model has voice. The prompt is owned by
`scripts/setup-elevenlabs.mjs` and is the canonical source. The text
below specifies what that prompt must contain.

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

The plan deliberately spends most build time here, in slice 6. These
principles guide that work.

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
  prompt in `scripts/setup-elevenlabs.mjs`, re-run the script with
  `--create` (it is idempotent and PATCHes the existing agents in
  place), call again. Repeat until both calls flow.
- Final recorded run is on a clean cold start, on the deployed
  Vercel URL, not on localhost.

---

## 9. Stack and architecture

- **Framework:** Next.js (App Router), React, TypeScript, Tailwind.
- **State:** React in-memory (`useState`, no Redux, no Zustand). No
  `localStorage` persistence in V0 (the HTML prototype uses it; we
  deliberately don't — a refresh resets, which matches the operator
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
  here, then log it in section 15.

---

## 10. Repo layout

```
PinPoint/
  pinpoint-product-plan.md             # narrative; do not edit
  pinpoint-build-plan.md               # this file
  pinpoint-demo-presentation.md        # deck talking points; do not edit
  design_handoff_pinpoint_dashboard/   # design source of truth; do not edit
  Buildathon keys.rtf                  # raw keys file; do not commit
  .env.local                           # derived from the rtf
  .env.example                         # committed
  .gitignore
  package.json
  next.config.mjs
  tsconfig.json
  tailwind.config.ts                   # extended with design tokens in slice 5
  postcss.config.mjs
  app/
    layout.tsx                         # loads Space Grotesk + JetBrains Mono
    globals.css                        # CSS vars for design tokens
    page.tsx                           # app shell: topbar + workspace
    api/
      signed-url/route.ts              # GET ?agent=sender|receiver
  components/
    Topbar.tsx                         # breadcrumb + inert search + live dot (deferred — not in slice 5)
    CaseQueue.tsx                      # filter chips + 1 real row + 4 skeletons (deferred — not in slice 5)
    DetailHeader.tsx                   # id + badge + concept + actions + stepper
    Stepper.tsx                        # 4-step pipeline
    StatusBanner.tsx                   # full-width tinted strip
    MetaStrip.tsx                      # item / amount / gift / address
    IssueMap.tsx                       # schematic SVG (kept from slice 1; palette-swapped in slice 5)
    Problem.tsx                        # red dot + 2 sentences
    Twist.tsx                          # amber dot + sub + 3 substitution options
    OrchestratorDecisions.tsx          # the 5 pre-dispatch decisions strip (hackathon-objective surface)
    AgentsSection.tsx                  # head + 2 AgentCard children
    AgentCard.tsx                      # avatar + header + goals (+ inherit note for Agent 2)
  lib/
    case.ts                            # caseContext
    elevenlabs.ts                      # client-side SDK helpers
    status.ts                          # state machine + derive(state) helper
  scripts/
    setup-elevenlabs.mjs               # voice + agent creation, idempotent
  docs/
    sdk-notes.md                       # SDK reference
```

Components from earlier slices that **slice 5 deletes wholesale**
(replaced by the components above): `OrderPanel.tsx`, `IssuePanel.tsx`,
`IssueMap.tsx`, `AgentGoalsPanel.tsx`, `StatusLine.tsx`, `Controls.tsx`.
The operator actions (which lived in `Controls.tsx` as a separate
fixed bar) move into `DetailHeader.tsx` as an inline row.

---

## 11. Environment and keys

The provided `Buildathon keys.rtf` is reused across multiple
buildathon demos. Most of its keys are for a different project (a
patient-discharge follow-up demo). For Pinpoint V0 we use exactly
**one** key from it:

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

For the Vercel deploy (slice 4), add three vars in the Vercel
project's Environment Variables panel:
`ELEVENLABS_API_KEY`, `PINPOINT_SENDER_AGENT_ID`,
`PINPOINT_RECEIVER_AGENT_ID`. (Voice IDs are baked into the agents
at creation time, so they don't need to be in Vercel env.)

---

## 12. Vertical slices (execution plan)

Each slice is a self-contained chunk that can be done in a single
session, ends in a working, demoable state, and has an explicit exit
criterion. After each slice, the working session should `/clear` and
the next slice should start fresh using the Standard session-start
prompt at the top of this document.

Slices 0-3 are done. See section 15 "Built so far" for the summary.
Slices 4, 5, 6 are pending; specs below.

### Slice 4: Agent 2 live + Vercel deploy + first rehearsal

This slice closes out the original V0 wiring on the current ("old")
dashboard. Slice 5 then rebuilds the UI; the SDK wiring carries over
unchanged.

- Wire `Trigger Agent 2` in `app/page.tsx` to `startReceiverSession`
  (already exported from `lib/elevenlabs.ts`), same pattern as the
  existing `handleTriggerAgent1`. On click: status moves to
  `AGENT2_IN_CALL`; on `onDisconnect` (with `forcedCallback` false):
  status moves to `RESOLVED`.
- Remove the simulated end-call button for Agent 2 in
  `components/Controls.tsx` and drop the `onEndAgent2Simulated` prop.
  `End Call` and `Force Callback` already cover Agent 2 because they
  operate on whatever conversation is in `activeConversation.current`.
- Deploy to Vercel. Add `ELEVENLABS_API_KEY`,
  `PINPOINT_SENDER_AGENT_ID`, and `PINPOINT_RECEIVER_AGENT_ID` to
  Vercel project env. Confirm the microphone permissions prompt works
  on the Vercel domain and that both calls connect from the deployed
  page.
- Do a single full rehearsal on the Vercel URL: trigger Agent 1, let
  the call complete, then trigger Agent 2, let that one complete.
  Then do a second take where Force Callback is clicked mid-call.
  Note any awkward Hindi phrasing beats; do not fix them in this
  slice (that is slice 6).
- **Exit criterion:** end-to-end happy path runs on the Vercel URL;
  failure path runs by clicking Force Callback during either call;
  a list of awkward Hindi phrasing beats has been written into the
  implementation log for slice 6 to pick up.

### Slice 5: Redesign — minimal coherent ship (~35 min)

This slice rewrites the UI to a **trimmed** subset of the operator
console in `design_handoff_pinpoint_dashboard/`, plus one addition
the design handoff does not contain: an **Orchestrator decisions
strip** between the case body and the agents section, surfacing
five pre-dispatch decisions the orchestrator makes before Agent 1
is called (see section 3 `caseContext.orchestratorDecisions` and
section 4.4 item 5). This strip is the demo's clearest evidence
that there is real orchestrator reasoning, not just two voice
agents — it is the hackathon-objective surface and must look
production-ready.

The full design adds a sidebar, topbar, KPI strip, and case queue
around a case-detail card; we ship the case-detail card only (plus
the new decisions strip), but with the new palette, typography,
structure, and state-driven surfaces, so it reads as a coherent
product even without the surrounding shell. Optimised for a single
~35-minute session before the recorded run.

**Coherence floor — what makes the trim still look like one product:**
the new OKLCH palette + Space Grotesk / JetBrains Mono / Helvetica
Neue typography applied to every surface; a single centred
case-detail card; the four-step stepper; toned state badge + status
banner; inline operator actions (no fixed bottom bar); the
orchestrator decisions strip in the same surface-2 + tile language
as the meta strip and the substitution rows; two agent cards with
the amber / ink-2 avatars and the inherit-note + locked treatment
on Agent 2.

**Slice 4 coexistence:** slice 4 also edits `app/page.tsx` (wires
Agent 2 to `startReceiverSession`, drops the simulated end button)
and `components/Controls.tsx`. Slice 5 rewrites `app/page.tsx` and
deletes `Controls.tsx`. Strategy: **let slice 4 commit and push
first; pull onto a clean tree before starting slice 5.** Slice 5's
new `handleCallRecipient` then calls `startReceiverSession` (slice
4's wiring) without re-deriving it.

**Cut list (do NOT build in slice 5):**
- No sidebar, no topbar, no breadcrumb, no inert search, no
  "Connected" live indicator.
- No KPI strip.
- No case queue, no skeleton placeholder rows, no filter chips.
- No status-enum rename. Keep the existing `Status` union
  (`NEW | AGENT1_IN_CALL | AGENT1_DONE | AGENT2_IN_CALL | RESOLVED |
  CALLBACK_SCHEDULED`). The state-machine shape already matches the
  design; renaming is a chore that adds no demo value and would
  conflict with slice 4.
- No new map SVG. Keep `components/IssueMap.tsx` and swap its 2-3
  fill colours to the new tokens; drop its panel chrome
  (collapse/expand toggle) and render it directly inside the new
  body grid.
- No outcome reveal animation (slide + bg swap). Use a single
  opacity transition for visible / hidden, or just `hidden` /
  shown.
- No `.lock-veil` overlay layer for Agent 2's locked state. Use
  `opacity-55` on the card and one centred absolutely-positioned
  pill "UNLOCKS AFTER AGENT 1".
- No responsive breakpoints; target 1280-1440px laptop only.
- No row-wide green-bg "chosen" treatment on Option 1. Just change
  the right-side note text from "₹20 cheaper, refunded" → "Accepted"
  in green-600.

**Build list (in order, single session):**

1. **Tokens + fonts** (~4 min):
   - `app/layout.tsx`: load Google Fonts for Space Grotesk
     (400/500/600/700) and JetBrains Mono (400/500).
   - `app/globals.css`: define the design tokens from section 4.7 as
     CSS custom properties on `:root`. Set `body` to
     `background: var(--bg); color: var(--ink); font-family:
     "Helvetica Neue", Helvetica, Arial, sans-serif;`. Add three
     utility CSS variables for fonts: `--font-display`, `--font-mono`.
     Skip extending `tailwind.config.ts` — reference tokens with
     arbitrary values (`bg-[var(--surface)]`, etc.).

2. **`lib/status.ts`** (~4 min): add a `derive(status)` helper that
   returns:
   - `badge: { text, tone: "grey" | "amber" | "green" | "red" }`
   - `banner: { tone, leadBold, rest }`
   - `stepper: { sender, receiver, end, endLabel }` (each is
     `"idle" | "active" | "done" | "locked"`; end node is `"active"`
     with red ring only in `CALLBACK_SCHEDULED`)
   - `agent1: { statusText, statusTone }`,
     `agent2: { statusText, statusTone, locked }`
   - `agent1OutcomesShown`, `agent2OutcomesShown`,
     `option1Chosen`
   - `canCallSender`, `canCallRecipient`, `canEscalate`
   See section 5 table for values. The existing `Status` union and
   `STATUS_META` stay; `derive` lives alongside them.

3. **New components** (~17 min). Small, layout-focused, no logic:
   - `DetailHeader.tsx`: title row (order id mono + state badge from
     `derive`) + concept one-liner + actions row (Call sender / Call
     recipient / Escalate / Reset buttons; disabled flags from
     `derive`) + `<Stepper />`.
   - `Stepper.tsx`: four nodes connected by three lines. Per-node
     `data-state` from `derive.stepper`. Amber inset ring + amber dot
     pulse on `active` (one `@keyframes pulse` in `globals.css`,
     gated by `@media (prefers-reduced-motion: reduce)`); end node
     red ring in `callback`; end node label from `derive.stepper.endLabel`.
   - `StatusBanner.tsx`: full-width tinted strip; tone from
     `derive.banner.tone`; renders `<strong>{leadBold}</strong> {rest}`.
   - `MetaStrip.tsx`: four labelled facts (Item / Amount / Gift /
     Address — typed). Reads `caseContext`. "SENDER PAYS" pill.
     Pannadhay Circle gets a 2px amber bottom-border `<span>`.
   - `AgentCard.tsx`: takes `agent: "a1" | "a2"` (drives avatar bg
     + avatar number + name + role), Hindi pill, derived status,
     goals + outcome copy, `outcomesShown`, `locked`. Agent 2
     renders the inherit-note `<div>` between header and goals
     list. Outcomes toggle on `outcomesShown` with a 200ms opacity
     transition; no slide. Locked state = `opacity-55` + one
     centred absolutely-positioned "UNLOCKS AFTER AGENT 1" pill.
   - `Problem.tsx`: red dot + 2 sentences with `<span class="text-[var(--red)] font-semibold">` on `~2 km away` and `cancelled`.
   - `Twist.tsx`: amber dot + sub paragraph + three option rows.
     First row's right-side note text swaps to `"Accepted"`
     (green-600) when `option1Chosen` is true.
   - `OrchestratorDecisions.tsx` (the hackathon-objective surface;
     ~5 min): renders the strip described in section 4.4 item 5.
     Reads `caseContext.orchestratorDecisions` (a 5-entry array) and
     maps each to a tile. No props besides the array itself; the
     component is purely presentational and inert.
     - Strip container: `<section>` with `border-top: 1px var(--line)`,
       `bg-[var(--surface-2)]`, padding `14px 22px 16px`.
     - Head row: mono uppercase "Orchestrator decisions" label left,
       muted "Computed before Agent 1 — drives the agent's role and
       context." right.
     - Grid: `grid grid-cols-5 gap-[10px]`. Each tile is a `<div>`
       with `bg-[var(--surface)] border border-[var(--line-2)]
       rounded-[10px] p-[9px_11px] flex flex-col gap-[3px]`.
     - Tile contents: header row (6px tone dot + mono uppercase label
       in `var(--faint)`), then the value (Space Grotesk 600 14px
       `var(--ink)`), then the detail (12px `var(--muted)` line-
       height 1.35). Tone dot colour switches on `decision.tone`
       (`amber`, `green`, `red`, `neutral`).
     - Skip any hover, click, or transition. The component is a
       static presentation.

4. **`components/IssueMap.tsx`** (~2 min): in place, swap any warm-
   beige fills to the new cool tokens (`var(--surface-2)` for the
   map base, `var(--line)` for grid strokes). Strip any panel
   wrapper / collapse toggle — render the SVG inline so it can fill
   a body-grid column directly.

5. **Rewrite `app/page.tsx`** (~6 min):
   - Layout: a centred `<main>` wrapping a single
     `<section class="card detail">` containing, top to bottom:
     `<DetailHeader />`, `<StatusBanner />`, `<MetaStrip />`, a
     `<div class="dbody grid grid-cols-2">` holding `<IssueMap />`
     and a `<div>` with `<Problem />` + `<Twist />`,
     `<OrchestratorDecisions />`, and finally `<AgentsSection />`
     (head + two `<AgentCard />` children with a vertical divider).
     Order matters: the decisions strip sits between the case body
     and the agents section so the reading flow is case → decisions
     → agents.
   - State: keep `useState<Status>("NEW")` from current. Keep refs
     `activeConversation`, `forcedCallback`, and `orderId` regen on
     mount + Reset.
   - Handlers: rename `handleTriggerAgent1` → `handleCallSender`,
     `handleTriggerAgent2` → `handleCallRecipient`,
     `handleForceCallback` → `handleEscalate`. Logic is unchanged.
     `handleCallRecipient` calls `startReceiverSession` (already
     wired in slice 4).
   - Pass the result of `derive(status)` down to each child as
     props (or destructure once at the top of `page.tsx`).

6. **Delete the old components** (~1 min): `OrderPanel.tsx`,
   `IssuePanel.tsx`, `AgentGoalsPanel.tsx`, `StatusLine.tsx`,
   `Controls.tsx`. **Keep** `IssueMap.tsx` (palette-swapped).

7. **Smoke test** (~2 min): `npx tsc --noEmit` clean; `npm run dev`;
   walk Call sender → handoff → Call recipient → resolved → Reset →
   Escalate → callback → Reset. Verify the state badge, banner,
   stepper, agent statuses, outcomes, and Option 1 "Accepted" text
   all flip per the section 5 table. Verify the Orchestrator
   decisions strip renders all five tiles with correct labels,
   values, details, and tone dots, sitting between the body and
   the agents section.

**Exit criterion:** `npm run dev` shows a centred case-detail card
on a 1280-1440px laptop screen using the new palette + fonts. The
Orchestrator decisions strip is visible above the agents section
with all five tiles (Same-store fulfilment / Address confidence /
Store reassignment / Inventory match / Call language), each with
its tone dot, label, value, and detail. Real Hindi Agent 1 +
Agent 2 calls run and settle into `AGENT1_DONE` (stepper Sender
green, Agent 1 outcomes visible, Option 1 note "Accepted" green,
banner amber "Address & order edit confirmed…") and `RESOLVED`
(stepper end green "Delivered", Agent 2 outcomes visible, banner
green "Location resolved…") respectively. Escalate from any
non-resolved state lands in `CALLBACK_SCHEDULED` (end step red
"Human handoff", banner red). Reset returns to `NEW`.
`npx tsc --noEmit` is clean. The case-detail card reads as one
coherent surface, even without the surrounding shell, and the
decisions strip clearly highlights the orchestrator's role.

**Deferred to a future polish session (not slice 6):** topbar,
queue, KPI strip, status enum rename, full map SVG, outcome slide
animation, full lock-veil layer, responsive breakpoints,
substitution row-wide chosen treatment. None of these change the
recorded demo if added later.

### Slice 6: Conversation polish + recorded run

- Iterate on the two prompts in `scripts/setup-elevenlabs.mjs`. After
  each edit, re-run the script with `--create` (idempotent PATCH).
  Rehearse the affected call on the deployed Vercel URL. Repeat until
  both calls flow naturally. The bar is: no robotic repetition, no
  awkward Hindi phrasing, the older customer (Agent 1) is given
  space to interrupt, the recipient (Agent 2) is reassured before
  being asked anything.
- Verify the identity-protection rule fires correctly in Agent 2: do
  a take where the operator (as Suresh) asks "kisne bheja hai?" once
  (agent should decline) and again (agent should share only the
  last 5 digits).
- Verify the order-edit ladder in Agent 1: do a take where the
  operator refuses Haldiram, the agent offers the 2 x 500 g option,
  the operator refuses that too, and the agent offers the 500 g half
  pack without prompting. Walk all three rungs.
- Record the final clean run on the Vercel URL: full happy path
  (`idle` → Call sender → wait for `handoff` → Call recipient →
  wait for `resolved`). Save the video file outside this repo.
- **Exit criterion:** recorded video exists; both prompts in
  `scripts/setup-elevenlabs.mjs` reflect the final polished
  versions; the implementation log lists the prompt-iteration notes
  that worked.

---

## 13. Out of scope (deck talking points only)

The following are intentionally not in V0. They are mentioned in
`pinpoint-demo-presentation.md` to convey the full product vision;
they are not built and should not be attempted in this repo.

- Real low-confidence detection of bad pins.
- The hold-vs-repin decision logic.
- Real geocoding or Google Maps API integration (Map.tsx is a
  schematic SVG).
- Real store reassignment, serviceability, inventory, repricing.
- Real telephony (no Twilio, no PSTN; both calls are browser-side
  over the ElevenLabs WebSocket).
- Idempotent retries, confidence calibration.
- The full human-handoff workflow (the demo escalation path just
  shows a status banner).
- Multi-case support, real order ingestion, persistence. The case
  queue's four skeleton rows imply the multi-case framing but do
  not deliver it.
- Sidebar nav (Cases / Agents / Analytics / Fulfilment / Settings),
  user-profile footer, and the four KPI tiles (In queue, Resolved
  today, Recovery rate, Avg. resolution). These appear in the
  design handoff and the production design but are deliberately
  dropped for V0 — they would be inert or em-dash placeholders, and
  the recording does not need them.
- A real "Expand map" modal with a Mapbox/Google Maps provider.
  The button is rendered `disabled`.

---

## 14. Decisions log

Decisions made during planning, with the reasoning. Reverse with
care; each of these has downstream implications.

| Date | Decision | Reason |
|---|---|---|
| 2026-06-06 | Single Next.js page on Vercel, in-memory state, no DB. | V0 is one demo, one case; persistence adds work without changing the recording. |
| 2026-06-06 | Both calls in Hindi; older male sender, female recipient; both agents male. | Matches the case. Both agents male keeps voice casting tight and authentic for an Indian customer-support persona; Hindi quality is the hardest, most demo-able part of the build. |
| 2026-06-06 | Agents created via API in `scripts/setup-elevenlabs.mjs`, not in the ElevenLabs dashboard UI. | Reproducible across rebuilds; prompts live in version control alongside the rest of the app. |
| 2026-06-06 | Browser uses signed URLs minted by a Next.js API route; API key stays server-side. | Safe to deploy publicly; key never reaches the client. |
| 2026-06-06 | Static SVG mockup for the pin vs landmark mismatch; no real maps API. | Avoids a maps API dependency; visually intentional; faster to ship. |
| 2026-06-06 | Sender voice = NJ (`iVOyIHSsWJ9SEmfuJOud`); Receiver voice = Krishna (`iB2rIwm9cQCRGWoKDRtX`). Both from the ElevenLabs shared library. | NJ reads as calm, clear, professional middle-aged male; Krishna reads as natural, human-like young male. Both standard-Hindi accent, distinct in age and timbre. |
| 2026-06-06 | Demo failure path is a button (`Escalate` / formerly `Force Callback`), not auto-detected. | V0 has no automated confidence detection; the operator controls failure live, which is more reliable for the recorded take. |
| 2026-06-06 | Hardcoded case values: Ramesh Sharma (sender), Suresh Sharma (recipient), House 142, ₹450 for Amul rasmalai 1 kg, Haldiram substitute at ₹430. | Specific enough to sound real; verified for narrative consistency with the build plan and product plan. |
| 2026-06-06 | Three landmarks near Pannadhay Circle picked as best effort; flagged for sanity check before recording. | Demo agent says them on the call; wrong landmarks would break credibility but blocking the build on this is unnecessary. |
| 2026-06-06 | Product is Amul rasmalai (not laddoo); substitute Haldiram rasmalai; price unchanged at INR 450. | First-rehearsal feedback after slice 3's live test. Rasmalai reads as a more natural Jaipur gift item and gives the agent a richer Hindi register on the call. |
| 2026-06-06 | Order edit ladder is three fallbacks walked one at a time, not substitute + altIfAsked. | First-rehearsal feedback. Three options gives the agent more room to recover before the escalation path; walking them one at a time keeps the older customer from being overwhelmed. Dashboard shows all three so the operator can see the full ladder. |
| 2026-06-06 | Recipient is male (Suresh Sharma); relation removed from `caseContext` entirely. | First-rehearsal feedback. Operator pool for the recorded run is all male; relation is something the orchestrator should not know in the product narrative. Receiver prompt updated for masculine pronouns + `rehte hain` Hindi verb agreement. |
| 2026-06-06 | Dashboard reshaped from a single-screen "mission control" into an operator console (topbar + case queue + case-detail card with inline actions, stepper, banner, agents section). New design tokens in `design_handoff_pinpoint_dashboard/`. | Operator-console framing reads as a real product on the recording, not a one-off demo screen. The queue (1 real row + 4 skeletons) implies the multi-case stream without delivering it. |
| 2026-06-06 | Dropped the sidebar nav (Cases / Agents / Analytics / Fulfilment / Settings) and the 4-tile KPI strip from the design handoff. | User decision after reviewing the handoff. KPIs would be em-dash placeholders only; sidebar is structural noise on a single-case demo. Skipping both keeps slice 5 small enough to finish before the recording. |
| 2026-06-06 | Operator actions (Call sender / Call recipient / Escalate / Reset) live inline in the detail header. No fixed bottom control bar. | New design's pattern. Reads as an open-case workflow rather than a global control surface. |
| 2026-06-06 | Status enum renamed to `idle / running1 / handoff / running2 / resolved / callback`. | Aligns the code 1:1 with the design handoff's state vocabulary; `running1`/`running2` explicitly model the transient in-call state that maps to the SDK call lifecycle. State-machine shape is unchanged from the previous `NEW/AGENT1_IN_CALL/AGENT1_DONE/AGENT2_IN_CALL/RESOLVED/CALLBACK_SCHEDULED` enum. |
| 2026-06-06 | Settle-only behaviour during live calls: no timer-driven mid-call animations. | New design has rich mid-call animations (timed outcome reveals at +1.2s, +2.7s; banner flips). The SDK only exposes start + `onDisconnect`, so the honest mapping is: stepper pulses + Agent X "Calling…" during call, outcomes + Option 1 + banner all settle at once on disconnect. Avoids an uncanny mismatch between the scripted timeline and the real call length on the recording. |
| 2026-06-06 | Palette switched from warm beige to cool SaaS-console grey-blue (new design tokens, OKLCH). | New handoff is an operator console, not a Blinkit-themed mission control; the cool palette matches the framing. |
| 2026-06-06 | Slice 4 keeps the old shell; redesign is its own slice 5; conversation polish + recorded run becomes slice 6. | User decision. Keeps each slice focused; the slice 5 redesign session can `/clear` cleanly and slice 6 can use the operator console for the recorded take. Slice 4's Agent-2 wiring carries into slice 5 unchanged. |
| 2026-06-06 | No `localStorage` persistence in V0 (HTML prototype uses `pinpoint_state_v3`; we don't). | Demo flow always starts from Reset; a refresh resetting the demo is fine, and avoiding `localStorage` keeps `app/page.tsx` simpler. |
| 2026-06-06 | Slice 5 trimmed to a ~30-minute "minimal coherent ship": case-detail card only, no topbar/queue/KPIs/sidebar; status enum NOT renamed; existing `IssueMap.tsx` reused with palette swap; outcome reveal is an opacity toggle (no slide); Agent 2 locked state is `opacity-55` + a centred pill (no veil layer); no responsive breakpoints. Supersedes the previous slice 5 spec. | User decision: recording is imminent and slice 4 is running in parallel. Coherence floor is preserved by the palette + fonts + card structure + stepper + toned badge/banner + inline operator actions + the two agent cards. The cut items can be added in a future polish session without changing the recorded demo. |
| 2026-06-06 | Add an "Orchestrator decisions" strip (5 pre-dispatch decisions: same-store fulfilment, address confidence, store reassignment, inventory match, call language) between the case body and the agents section. Lives in `caseContext.orchestratorDecisions`; renders via a new `OrchestratorDecisions.tsx`. Adds ~5 min to slice 5 (new budget ~35 min). | This is the hackathon-objective surface: it makes the orchestrator's reasoning visible and is what separates the demo from "two voice agents in a row". Reuses the surface-2 + tile language already in the meta strip and option rows so it stays within the theme. Production-shaped: the data is structured (label / value / tone / detail) and would be computed by the real orchestrator in V1; V0 hardcodes the values. |

When a decision changes, add a new row with the new date, the new
decision, and a brief "supersedes" note. Do not delete old rows;
they are useful history.

---

## 15. Implementation log (APPEND-ONLY)

The top of this section ("Built so far") is a single summary of what
previous sessions produced. It is updated in place when work
materially changes the repo. Below it is the running per-session log
that future sessions append to.

### Built so far (as of 2026-06-06, slice 3 + polish complete)

**Slices that are done:**
- **Slice 0** — plan + SDK notes. `pinpoint-build-plan.md` was
  rewritten standalone; `docs/sdk-notes.md` captures the ElevenLabs
  Conv AI SDK call shapes (browser-side `Conversation.startSession`
  from `@elevenlabs/client`, the `dynamicVariables` option,
  `onDisconnect` callback, signed-URL endpoint, agent-create body
  shape, prompt-iteration PATCH semantics).
- **Slice 1** — Next.js scaffold + dashboard shell (no voice).
  Next 15.5 + React 19 + Tailwind 3.4 + TypeScript 5.6.
  `lib/case.ts` matches section 3; `lib/status.ts` defines the
  current six-state enum (`NEW / AGENT1_IN_CALL / AGENT1_DONE /
  AGENT2_IN_CALL / RESOLVED / CALLBACK_SCHEDULED`) — **slice 5
  renames this to the new enum.** Components in `components/`:
  `OrderPanel`, `IssuePanel`, `IssueMap`, `AgentGoalsPanel`,
  `StatusLine`, `Controls`. **All six are deleted in slice 5.**
- **Slice 2 Half A** — voices added to the ElevenLabs account and
  both agents created via API. `scripts/setup-elevenlabs.mjs` is
  idempotent (`--bootstrap` skips already-added voices and PATCHes
  existing agents; `--create` is the prompt-iteration loop entry
  point). Voice slots used: 2/30 on Creator tier.
  `.env.local` is populated with `ELEVENLABS_API_KEY` and all four
  `PINPOINT_*` IDs.
- **Slice 2 Half B** — `app/api/signed-url/route.ts` exists. GET
  `?agent=sender|receiver` returns `{ signedUrl: ... }`. Normalises
  the upstream snake_case `signed_url` to camelCase on the way out;
  `export const dynamic = "force-dynamic"` is set so Next.js does
  not cache. 400 on bad/missing agent param, 500 on missing API
  key, 502 on upstream fetch failure.
- **Slice 3** — Agent 1 wired live via `@elevenlabs/client`.
  `lib/elevenlabs.ts` exports `startSenderSession(caseContext, onEnd)`
  and `startReceiverSession(caseContext, onEnd)`. Each fetches the
  signed URL, opens the SDK session with snake_case
  `dynamicVariables` (matching the prompt placeholders), registers
  `onDisconnect`. `app/page.tsx` holds the live `Conversation` in a
  ref so Force Callback and Reset can end it; `forcedCallback` ref
  guards against `onDisconnect` overwriting `CALLBACK_SCHEDULED`.
- **Slice 3 polish** — first-rehearsal feedback iteration. Live
  test confirmed Agent 1 sounds natural in Hindi; dynamic variables
  land verbatim from `caseContext`. After that: product changed to
  Amul rasmalai; recipient changed to male Suresh Sharma; orderEdit
  restructured to a three-fallback ladder; orderId generated
  client-side and regenerated on Reset; End Call button added as
  distinct from Force Callback; layout switched to 2x2 grid with
  `max-w-6xl`; language pill moved to agent panels; IssueMap
  defaults to small-and-visible with Expand toggle.

**Currently working (verified live):** Agent 1 call. User confirmed
"Looks good".

**Slice 4 status (code + deploy done, rehearsal pending):** Agent 2
is now wired live in `app/page.tsx` via `handleTriggerAgent2` →
`startReceiverSession`, mirroring the Agent 1 pattern (`onDisconnect`
promotes `AGENT2_IN_CALL` → `RESOLVED` unless
`forcedCallback.current === true`). The simulated branch in
`handleEndCall` (which set `RESOLVED` directly when
`activeConversation.current` was null) is removed; End Call is now a
pure no-op when there is no live conversation. `components/Controls.tsx`
is unchanged — the slice spec referenced an `onEndAgent2Simulated`
prop that never existed in this repo's actual implementation; the
simulation lived inline in `app/page.tsx` and was removed there.
Deployed to Vercel as project `mudgal1729s-projects/pinpoint`, alias
`https://pinpoint-one-gamma.vercel.app`. Three env vars set in
production: `ELEVENLABS_API_KEY`, `PINPOINT_SENDER_AGENT_ID`,
`PINPOINT_RECEIVER_AGENT_ID`. The signed-url endpoint returns 200 on
the deployed alias, confirming the API key is wired correctly.
Rehearsal and Hindi-phrasing beats are pending — user is doing the
testing themselves and will log notes when they have them.

**Not yet done:**
- **Slice 4 tail** — full rehearsal end-to-end on the Vercel URL
  (happy path + Force Callback path) and Hindi-phrasing notes for
  slice 6. User is running these themselves.
- **Slice 5** — redesign the whole UI to the operator console in
  `design_handoff_pinpoint_dashboard/`. Rename the status enum.
  Delete all old components. See section 12 for the spec.
- **Slice 6** — conversation polish iteration loop + the final
  recorded run.

**Key gotchas the next session needs to remember:**
- npm package is `@elevenlabs/client` (the new namespace), not
  `@11labs/client` (the legacy one).
- Signed URLs expire 15 minutes after issuance — fetch a fresh one
  per Call sender / Call recipient click; do not cache.
- The SDK options bag uses camelCase (`signedUrl`,
  `dynamicVariables`), but the prompt placeholders and the wire
  protocol use snake_case (`{{sender_name}}`,
  `dynamic_variables`). The values inside `dynamicVariables` must
  be the snake_case keys our prompts reference.
- `onDisconnect` fires on ANY end (operator clicked end, server
  closed, network drop, URL expired). Use `forcedCallback.current`
  to distinguish a true end-of-call from an Escalate-triggered end,
  and skip the status promotion in the callback when the ref is
  set.
- Agent-create JSON path is
  `conversation_config.agent.prompt.prompt` (nested twice). Our
  setup script is correct on this.
- The `Buildathon keys.rtf` is shared with another buildathon demo.
  Only `ELEVENLABS_API_KEY` is used for Pinpoint. The pre-existing
  `ELEVENLABS_AGENT_ID` in that file belongs to that other demo
  and must not be reused.
- Two pre-existing `npm install` advisories from slice 1 and
  another two from the `@elevenlabs/client` install in slice 3 —
  not investigated. Worth `npm audit`ing before the Vercel deploy
  in slice 4.

### How to write an entry

Use this exact structure. Keep entries terse but complete.

```markdown
### Session YYYY-MM-DD, slice N (one-line label)

**Operator:** (your name or "Claude" plus the model id if relevant)

**Slice exit criterion met?** Yes / No / Partial. If partial, list what
is left.

**Files added or changed:**
- `path/to/file.ts` (added | modified | deleted): one-line summary of
  the change.

**Plan changes (if any):**
- Reference the section number that changed in this file and a
  one-line summary. Update the section in place; the log entry just
  records that you did.

**Gotchas for the next session:**
- Anything non-obvious that would bite the next session: an SDK quirk,
  a Vercel env-var that needs setting, a voice ID that broke, a Hindi
  phrase that worked or did not.

**Next slice to start:** N+1, or "slice N continued, finishing X".
```

### Entries

### Session 2026-06-06, slice 4 (Agent 2 wiring + Vercel deploy)

**Operator:** Claude Opus 4.7 (1M context)

**Slice exit criterion met?** Partial. Code changes and Vercel deploy
are done; the in-browser rehearsal (happy path + Force Callback path)
and the Hindi-phrasing notes for slice 6 are deferred — the user
opted to run the testing themselves.

**Files added or changed:**
- `app/page.tsx` (modified): added `handleTriggerAgent2` that calls
  `startReceiverSession(caseContext, onEnd)`, mirroring
  `handleTriggerAgent1`; promotes status to `RESOLVED` in the
  `onDisconnect` callback unless `forcedCallback.current === true`,
  in which case `Reset`/Force Callback already cleared the ref.
  Imported `startReceiverSession` alongside the existing
  `startSenderSession`. Replaced
  `onTriggerAgent2={() => setStatus("AGENT2_IN_CALL")}` with
  `onTriggerAgent2={handleTriggerAgent2}`. Simplified `handleEndCall`
  to a pure no-op when `activeConversation.current` is null (dropped
  the manual status-advance fallback that used to compensate for the
  simulated Agent 2).
- `pinpoint-build-plan.md` (modified): updated section 15 "Built so
  far" subsection to reflect slice 4 code + deploy state; appended
  this entry.

**Plan changes (if any):** None — slice 4 spec is followed as
written. Note that section 12's "Remove the simulated end-call button
for Agent 2 in `components/Controls.tsx` and drop the
`onEndAgent2Simulated` prop" was a mismatch with actual repo state:
`Controls.tsx` does not have (and did not have) such a prop. The
simulation lived inline in `app/page.tsx` and was removed there. Not
worth a section-12 edit — the intent (drop the Agent 2 simulation)
was met.

**Vercel deploy details (so the next session does not relink by
mistake):**
- Project: `mudgal1729s-projects/pinpoint`. Linked via
  `vercel link --yes --project pinpoint` (the lowercase project name
  was required because the folder is `PinPoint` with capitals, which
  Vercel rejects).
- Production alias: `https://pinpoint-one-gamma.vercel.app`. This is
  the URL to open for rehearsals and the recorded run.
- Three production env vars set: `ELEVENLABS_API_KEY`,
  `PINPOINT_SENDER_AGENT_ID`, `PINPOINT_RECEIVER_AGENT_ID`. Voice IDs
  are deliberately not in Vercel env (they are baked into the agents
  at creation time, per section 11).
- Smoke checks from CLI: `GET /` → 200; `GET
  /api/signed-url?agent=sender` → 200. The signed-url 200 confirms
  the API key is reaching ElevenLabs and a signed WSS URL is being
  minted.

**Gotchas for the next session:**
- The Vercel project name is `pinpoint` (lowercase). `.vercel/` is
  gitignored so the next session may need `vercel link --yes
  --project pinpoint` again if the link metadata is gone.
- `npm audit` was flagged in the previous "Built so far" as worth
  checking before deploy. It was not run this session — the build and
  deploy both completed cleanly, but if the next session hits a
  Vercel build failure, `npm audit` is a sensible first check.
- The page is on the **old shell** (the four-panel grid in
  `app/page.tsx` reading `OrderPanel / IssuePanel /
  AgentGoalsPanel / Controls`). Slice 5 rewrites this whole surface.
  The `handleTriggerAgent1` / `handleTriggerAgent2` /
  `handleEndCall` / `handleForceCallback` / `handleReset` logic is
  the bit that carries over unchanged — copy it across when rebuilding
  `app/page.tsx` for the operator-console redesign.
- Receiver-session error recovery in `handleTriggerAgent2`: if
  `startReceiverSession` throws and `forcedCallback.current` is
  false, status falls back to `AGENT1_DONE` (not `NEW`), because by
  that point in the flow Agent 1 has already completed. This is
  intentional but easy to miss if someone reads it in isolation.

**Next slice to start:** slice 4 tail (user-driven rehearsal +
Hindi-phrasing notes), then slice 5 (operator-console redesign).

### Session 2026-06-06, slice 5 (operator-console redesign)

**Operator:** Claude (claude-opus-4-7)

**Slice exit criterion met?** Yes (code), pending live mic test.
`npx tsc --noEmit` clean, `npm run dev` boots in ~1.4s, `curl /`
returns HTTP 200, and the SSR HTML contains all the key strings the
exit criterion calls for (Orchestrator decisions, Same-store
fulfilment, Address confidence, Sender Agent, Receiver Agent,
Pannadhay Circle, Call sender, Escalate, Resumes with, Unlocks
after Agent, Haldiram rasmalai). The state machine, SDK wiring,
and Agent 2's live path are all in place but were not exercised
against a real microphone in this session — the user should walk
Call sender → Call recipient on `http://localhost:3000` (or on
`https://pinpoint-one-gamma.vercel.app` after redeploy) to confirm
the recorded-demo flow works end-to-end before slice 6.

**Coexistence with parallel slice 4:** at the start of this session
slice 4 had not yet committed its `app/page.tsx` wiring; by the end
slice 4's session had appended an entry to this log saying it had
landed the wiring. Slice 5 rewrote `app/page.tsx` wholesale (the
whole UI surface changed), so slice 4's textual edit to that file
was superseded — but the *behaviour* slice 4 wired (Agent 2 calls
`startReceiverSession`, `handleEndCall` is a no-op when there is
no live conversation) is identical in the new `app/page.tsx` here.
Net effect: no functional regression; both slices ship.

**Files added or changed:**
- `lib/case.ts` (modified): added `orchestratorDecisions` (5-entry
  readonly array with `key / label / value / tone / detail`), plus
  exported `OrchestratorDecision` and `DecisionTone` types.
- `lib/status.ts` (modified): kept the original `Status` union for
  slice-4 coexistence; added `Tone`, `StepState`, `AgentTone`, and
  `DerivedState` types plus a `derive(status)` switch that returns
  the full per-state UI flag bundle (badge, banner, stepper, agent
  statuses, outcome-shown flags, option-1-chosen, button-disabled,
  inCall).
- `app/globals.css` (rewritten): OKLCH design tokens on `:root`,
  body styling, `@keyframes pinpoint-pulse-amber` (gated by
  `prefers-reduced-motion`).
- `app/layout.tsx` (modified): loads Space Grotesk and JetBrains
  Mono via `next/font/google` as `--font-display` and `--font-mono`
  CSS variables.
- `tailwind.config.ts` (rewritten): dropped the old accent +
  soft-pulse config; extends `theme.fontFamily` with sans/display/
  mono families pointing at the CSS variables. Colour tokens are
  referenced via arbitrary values (`bg-[var(--surface)]`) instead
  of enumerated in the theme.
- `components/IssueMap.tsx` (rewritten): new cool-grey schematic
  SVG (grid pattern + four road strokes + dashed red curve + three
  markers).
- `components/Stepper.tsx` (added): 4-node horizontal pipeline.
- `components/DetailHeader.tsx` (added): id + state badge + concept
  one-liner + inline operator-actions row + Stepper. End-call
  button conditionally rendered when `derive.inCall` is true.
- `components/StatusBanner.tsx` (added): full-width tinted strip.
- `components/MetaStrip.tsx` (added): Item / Amount / Gift /
  Address row.
- `components/Problem.tsx` (added): red dot + 2-sentence problem.
- `components/Twist.tsx` (added): amber dot + sub line + 3
  substitution rows; option 1's right-side note swaps to "Accepted"
  in green when `option1Chosen`.
- `components/OrchestratorDecisions.tsx` (added): the
  hackathon-objective surface. Renders the strip from section 4.4
  item 5 — surface-2 strip, 5-tile grid, per-decision tone dot.
- `components/AgentCard.tsx` (added): single agent surface with
  avatar (a1 amber, a2 ink-2), Hindi pill, status pill (faint /
  amber-pulse / green), goals + outcome blocks, inherit-note slot
  (used by Agent 2 only), locked state (`opacity-55` + centred
  "Unlocks after Agent 1" pill).
- `components/AgentsSection.tsx` (added): section head + 2-column
  grid of AgentCard children with a vertical divider.
- `app/page.tsx` (rewritten): single centred case-detail card.
  Composition top-to-bottom: DetailHeader → StatusBanner →
  MetaStrip → (IssueMap | Problem+Twist) → OrchestratorDecisions →
  AgentsSection. Map column has absolute overlays for the
  "~2 km gap" badge and the 3-row legend.
- `components/OrderPanel.tsx`, `components/IssuePanel.tsx`,
  `components/AgentGoalsPanel.tsx`, `components/StatusLine.tsx`,
  `components/Controls.tsx` (deleted): replaced by the new
  components above.

**Plan changes (if any):**
- None. Slice 5 followed section 12 spec; the orchestrator
  decisions strip renders per section 4.4 item 5.

**Gotchas for the next session (slice 6 — polish + recorded run):**
- The "End call" button is rendered as a solid-red button while a
  call is in flight, distinct from "Escalate" (outline red). End
  call drops the active conversation cleanly and lets the SDK's
  `onDisconnect` callback promote status to AGENT1_DONE or
  RESOLVED naturally. Escalate sets `forcedCallback.current` so the
  callback skips the promotion and lands in CALLBACK_SCHEDULED.
- Tailwind compiles arbitrary-value classes inline; tokens live in
  `app/globals.css` `:root`. If a future slice bumps to Tailwind 4
  the keyframe declaration may need migration.
- Fonts load via `next/font/google` with `variable:
  "--font-display"` and `variable: "--font-mono"`. Tailwind
  config maps `font-display` / `font-mono` to those variables.
  Helvetica Neue is the default sans (no Google fetch).
- `components/Stepper.tsx` uses a 7-column grid (4 nodes + 3 gaps)
  via `.flatMap`. React requires keys on each list child; an
  earlier `<>` fragment attempt was rejected.
- Map "Expand" button from the design is intentionally not rendered
  (would be inert; defer to a Mapbox/Google Maps follow-up).
- Topbar + queue + KPI strip + status enum rename + outcome slide
  + full lock-veil + responsive breakpoints are deferred per
  section 12 slice 5. None of them are needed for the recorded
  demo.
- Dev server is left running at `localhost:3000` for the user's
  live mic walkthrough. If a fresh session starts cold, run
  `npm run dev` again.
- The Vercel deploy already happened in slice 4
  (`pinpoint-one-gamma.vercel.app`). Slice 6 needs to **redeploy**
  with the new operator-console UI: `vercel --prod` (or push to
  main if a Git integration is configured). The three production
  env vars are already set.

**Next slice to start:** slice 6 (conversation polish + recorded
run). Open the deployed Vercel URL after redeploy; iterate prompts
in `scripts/setup-elevenlabs.mjs` with `--create` between takes;
record the final clean run.
