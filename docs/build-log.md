# Pinpoint, Build Log (V0)

> **This file is the execution-state companion to `docs/architecture.md`.**
> Architecture.md describes the system; this file records how the system
> got built and what's still in flight. A new session opening this repo
> should read `docs/architecture.md` first for the durable spec, then read
> this file's "Built so far" subsection at the top of section 15 plus any
> per-session entries below it for current state. Before ending a session,
> append a new entry per the template inside section 15. Do not edit prior
> log entries.

---

## Standard session-start prompt

Paste this into a fresh session, no edits, regardless of which slice is
next.

```
Read docs/architecture.md in full. Then read docs/build-log.md: section
15 has a "Built so far" summary and the running implementation log; use
them to find the next slice that is not fully done. Execute that slice
per its spec in section 12 of this file. Before ending, append a new
entry to the implementation log per the template at the top of section
15.
```

If you want to override the auto-selection (for example, polish work in
an already-done slice), say so explicitly after the paste.

---

## Reading order inside this file

1. **Section 12** (vertical slices, ordered): find the next slice that
   is not yet checked off in the implementation log and start there.
2. **Section 13** (out of scope): items deliberately not built.
3. **Section 14** (decisions log): planning decisions with reasoning.
   Reverse with care.
4. **Section 15** (implementation log): "Built so far" first, then the
   append-only per-session entries. Trust the log over your assumptions
   about repo state, but verify with `ls` or `git status` before acting
   on it.

If you change `docs/architecture.md` (a section in it edits, the case
context changes, a contract shifts), record the change with a one-line
"Architecture changes" note in your section-15 entry. Update
architecture.md in place; the log entry just records that you did.

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

### Slice 5: Redesign, minimal coherent ship (~35 min)

This slice rewrites the UI to a **trimmed** subset of the operator
console in `docs/design-handoff/`, plus one addition the design
handoff does not contain: an **Orchestrator decisions strip** between
the case body and the agents section, surfacing five pre-dispatch
decisions the orchestrator makes before Agent 1 is called (see
`docs/architecture.md` section 3 `caseContext.orchestratorDecisions`
and section 4.4 item 5). This strip is the demo's clearest evidence
that there is real orchestrator reasoning, not just two voice
agents; it is the hackathon-objective surface and must look
production-ready.

The full design adds a sidebar, topbar, KPI strip, and case queue
around a case-detail card; we ship the case-detail card only (plus
the new decisions strip), but with the new palette, typography,
structure, and state-driven surfaces, so it reads as a coherent
product even without the surrounding shell. Optimised for a single
~35-minute session before the recorded run.

**Coherence floor, what makes the trim still look like one product:**
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
   - `app/globals.css`: define the design tokens from
     architecture.md section 4.7 as CSS custom properties on
     `:root`. Set `body` to `background: var(--bg); color:
     var(--ink); font-family: "Helvetica Neue", Helvetica, Arial,
     sans-serif;`. Add three utility CSS variables for fonts:
     `--font-display`, `--font-mono`. Skip extending
     `tailwind.config.ts`; reference tokens with arbitrary values
     (`bg-[var(--surface)]`, etc.).

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
   See architecture.md section 5 table for values. The existing
   `Status` union and `STATUS_META` stay; `derive` lives alongside
   them.

3. **New components** (~17 min). Small, layout-focused, no logic:
   - `DetailHeader.tsx`: title row (order id mono + state badge from
     `derive`) + concept one-liner + actions row (Call sender / Call
     recipient / Escalate / Reset buttons; disabled flags from
     `derive`) + `<Stepper />`.
   - `Stepper.tsx`: four nodes connected by three lines. Per-node
     `data-state` from `derive.stepper`. Amber inset ring + amber dot
     pulse on `active` (one `@keyframes pulse` in `globals.css`,
     gated by `@media (prefers-reduced-motion: reduce)`); end node
     red ring in `callback`; end node label from
     `derive.stepper.endLabel`.
   - `StatusBanner.tsx`: full-width tinted strip; tone from
     `derive.banner.tone`; renders
     `<strong>{leadBold}</strong> {rest}`.
   - `MetaStrip.tsx`: four labelled facts (Item / Amount / Gift /
     Address, typed). Reads `caseContext`. "SENDER PAYS" pill.
     Pannadhay Circle gets a 2px amber bottom-border `<span>`.
   - `AgentCard.tsx`: takes `agent: "a1" | "a2"` (drives avatar bg
     + avatar number + name + role), Hindi pill, derived status,
     goals + outcome copy, `outcomesShown`, `locked`. Agent 2
     renders the inherit-note `<div>` between header and goals
     list. Outcomes toggle on `outcomesShown` with a 200ms opacity
     transition; no slide. Locked state = `opacity-55` + one
     centred absolutely-positioned "UNLOCKS AFTER AGENT 1" pill.
   - `Problem.tsx`: red dot + 2 sentences with
     `<span class="text-[var(--red)] font-semibold">` on `~2 km
     away` and `cancelled`.
   - `Twist.tsx`: amber dot + sub paragraph + three option rows.
     First row's right-side note text swaps to `"Accepted"`
     (green-600) when `option1Chosen` is true.
   - `OrchestratorDecisions.tsx` (the hackathon-objective surface;
     ~5 min): renders the strip described in architecture.md
     section 4.4 item 5. Reads
     `caseContext.orchestratorDecisions` (a 5-entry array) and
     maps each to a tile. No props besides the array itself; the
     component is purely presentational and inert.
     - Strip container: `<section>` with `border-top: 1px
       var(--line)`, `bg-[var(--surface-2)]`, padding
       `14px 22px 16px`.
     - Head row: mono uppercase "Orchestrator decisions" label
       left, muted "Computed before Agent 1; drives the agent's
       role and context." right.
     - Grid: `grid grid-cols-5 gap-[10px]`. Each tile is a `<div>`
       with `bg-[var(--surface)] border border-[var(--line-2)]
       rounded-[10px] p-[9px_11px] flex flex-col gap-[3px]`.
     - Tile contents: header row (6px tone dot + mono uppercase
       label in `var(--faint)`), then the value (Space Grotesk
       600 14px `var(--ink)`), then the detail (12px
       `var(--muted)` line-height 1.35). Tone dot colour switches
       on `decision.tone` (`amber`, `green`, `red`, `neutral`).
     - Skip any hover, click, or transition. The component is a
       static presentation.

4. **`components/IssueMap.tsx`** (~2 min): in place, swap any warm-
   beige fills to the new cool tokens (`var(--surface-2)` for the
   map base, `var(--line)` for grid strokes). Strip any panel
   wrapper / collapse toggle; render the SVG inline so it can fill
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
   all flip per the architecture.md section 5 table. Verify the
   Orchestrator decisions strip renders all five tiles with correct
   labels, values, details, and tone dots, sitting between the body
   and the agents section.

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

- Iterate on the two prompts in `agents/sender.md` and
  `agents/receiver.md`. After each edit, re-run
  `scripts/setup-elevenlabs.mjs --create` (idempotent PATCH).
  Rehearse the affected call on the deployed Vercel URL. Repeat
  until both calls flow naturally. The bar is: no robotic
  repetition, no awkward Hindi phrasing, the older customer (Agent
  1) is given space to interrupt, the recipient (Agent 2) is
  reassured before being asked anything.
- Verify the identity-protection rule fires correctly in Agent 2:
  do a take where the operator (as Suresh) asks "kisne bheja hai?"
  once (agent should decline) and again (agent should share only
  the last 5 digits).
- Verify the order-edit ladder in Agent 1: do a take where the
  operator refuses Haldiram, the agent offers the 2 x 500 g
  option, the operator refuses that too, and the agent offers the
  500 g half pack without prompting. Walk all three rungs.
- Record the final clean run on the Vercel URL: full happy path
  (`idle` → Call sender → wait for `handoff` → Call recipient →
  wait for `resolved`). Save the video file outside this repo.
- **Exit criterion:** recorded video exists; both prompts in
  `agents/*.md` reflect the final polished versions; the
  implementation log lists the prompt-iteration notes that worked.

---

## 13. Out of scope (deck talking points only)

The following are intentionally not in V0. They are mentioned in
`docs/product-plan.md` (and in the deck) to convey the full product
vision; they are not built and should not be attempted in this repo.

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
  dropped for V0; they would be inert or em-dash placeholders, and
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
| 2026-06-06 | Dashboard reshaped from a single-screen "mission control" into an operator console (topbar + case queue + case-detail card with inline actions, stepper, banner, agents section). New design tokens in `docs/design-handoff/`. | Operator-console framing reads as a real product on the recording, not a one-off demo screen. The queue (1 real row + 4 skeletons) implies the multi-case stream without delivering it. |
| 2026-06-06 | Dropped the sidebar nav (Cases / Agents / Analytics / Fulfilment / Settings) and the 4-tile KPI strip from the design handoff. | User decision after reviewing the handoff. KPIs would be em-dash placeholders only; sidebar is structural noise on a single-case demo. Skipping both keeps slice 5 small enough to finish before the recording. |
| 2026-06-06 | Operator actions (Call sender / Call recipient / Escalate / Reset) live inline in the detail header. No fixed bottom control bar. | New design's pattern. Reads as an open-case workflow rather than a global control surface. |
| 2026-06-06 | Status enum renamed to `idle / running1 / handoff / running2 / resolved / callback`. | Aligns the code 1:1 with the design handoff's state vocabulary; `running1`/`running2` explicitly model the transient in-call state that maps to the SDK call lifecycle. State-machine shape is unchanged from the previous `NEW/AGENT1_IN_CALL/AGENT1_DONE/AGENT2_IN_CALL/RESOLVED/CALLBACK_SCHEDULED` enum. |
| 2026-06-06 | Settle-only behaviour during live calls: no timer-driven mid-call animations. | New design has rich mid-call animations (timed outcome reveals at +1.2s, +2.7s; banner flips). The SDK only exposes start + `onDisconnect`, so the honest mapping is: stepper pulses + Agent X "Calling…" during call, outcomes + Option 1 + banner all settle at once on disconnect. Avoids an uncanny mismatch between the scripted timeline and the real call length on the recording. |
| 2026-06-06 | Palette switched from warm beige to cool SaaS-console grey-blue (new design tokens, OKLCH). | New handoff is an operator console, not a Blinkit-themed mission control; the cool palette matches the framing. |
| 2026-06-06 | Slice 4 keeps the old shell; redesign is its own slice 5; conversation polish + recorded run becomes slice 6. | User decision. Keeps each slice focused; the slice 5 redesign session can `/clear` cleanly and slice 6 can use the operator console for the recorded take. Slice 4's Agent-2 wiring carries into slice 5 unchanged. |
| 2026-06-06 | No `localStorage` persistence in V0 (HTML prototype uses `pinpoint_state_v3`; we don't). | Demo flow always starts from Reset; a refresh resetting the demo is fine, and avoiding `localStorage` keeps `app/page.tsx` simpler. |
| 2026-06-06 | Slice 5 trimmed to a ~30-minute "minimal coherent ship": case-detail card only, no topbar/queue/KPIs/sidebar; status enum NOT renamed; existing `IssueMap.tsx` reused with palette swap; outcome reveal is an opacity toggle (no slide); Agent 2 locked state is `opacity-55` + a centred pill (no veil layer); no responsive breakpoints. Supersedes the previous slice 5 spec. | User decision: recording is imminent and slice 4 is running in parallel. Coherence floor is preserved by the palette + fonts + card structure + stepper + toned badge/banner + inline operator actions + the two agent cards. The cut items can be added in a future polish session without changing the recorded demo. |
| 2026-06-06 | Add an "Orchestrator decisions" strip (5 pre-dispatch decisions: same-store fulfilment, address confidence, store reassignment, inventory match, call language) between the case body and the agents section. Lives in `caseContext.orchestratorDecisions`; renders via a new `OrchestratorDecisions.tsx`. Adds ~5 min to slice 5 (new budget ~35 min). | This is the hackathon-objective surface: it makes the orchestrator's reasoning visible and is what separates the demo from "two voice agents in a row". Reuses the surface-2 + tile language already in the meta strip and option rows so it stays within the theme. Production-shaped: the data is structured (label / value / tone / detail) and would be computed by the real orchestrator in V1; V0 hardcodes the values. |
| 2026-06-07 | Split `pinpoint-build-plan.md` into `docs/architecture.md` (sections 1-11) and `docs/build-log.md` (sections 12-15). Extract agent prompts from `scripts/setup-elevenlabs.mjs` into `agents/sender.md` and `agents/receiver.md`. Regroup `components/` into `chrome/`, `orchestrator/`, `case/` subfolders. Move `pinpoint-product-plan.md` and `design_handoff_pinpoint_dashboard/` under `docs/`. | Repo restructure after slice 5 to separate durable system spec (architecture) from execution log (build-log), pull prompts out of JS heredocs into reviewable markdown, and group components by feature so the architecture doc's "Part 1 / Part 2 / Part 3" boxes map cleanly to folders. Supersedes the prior single-standalone-plan-doc decision for Pinpoint specifically; the architecture/log split was the right call once the build was mature enough that the spec stopped drifting. |

When a decision changes, add a new row with the new date, the new
decision, and a brief "supersedes" note. Do not delete old rows;
they are useful history.

---

## 15. Implementation log (APPEND-ONLY)

The top of this section ("Built so far") is a single summary of what
previous sessions produced. It is updated in place when work
materially changes the repo. Below it is the running per-session log
that future sessions append to.

### Built so far (as of 2026-06-07, slice 5 complete + repo restructure)

**Slices that are done:**
- **Slice 0** — plan + SDK notes. The standalone plan now lives split
  across `docs/architecture.md` and `docs/build-log.md`;
  `docs/sdk-notes.md` captures the ElevenLabs Conv AI SDK call shapes
  (browser-side `Conversation.startSession` from `@elevenlabs/client`,
  the `dynamicVariables` option, `onDisconnect` callback, signed-URL
  endpoint, agent-create body shape, prompt-iteration PATCH
  semantics).
- **Slice 1** — Next.js scaffold + dashboard shell (no voice).
  Next 15.5 + React 19 + Tailwind 3.4 + TypeScript 5.6.
  `lib/case.ts` matches architecture.md section 3; `lib/status.ts`
  defines the six-state `Status` union (`NEW / AGENT1_IN_CALL /
  AGENT1_DONE / AGENT2_IN_CALL / RESOLVED / CALLBACK_SCHEDULED`).
  The original slice-1 components (`OrderPanel`, `IssuePanel`,
  `IssueMap`, `AgentGoalsPanel`, `StatusLine`, `Controls`) were
  deleted in slice 5.
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
- **Slice 4** — Agent 2 wired live and deployed to Vercel. Project:
  `mudgal1729s-projects/pinpoint`. Production alias:
  `https://pinpoint-one-gamma.vercel.app`. Three production env vars
  set: `ELEVENLABS_API_KEY`, `PINPOINT_SENDER_AGENT_ID`,
  `PINPOINT_RECEIVER_AGENT_ID`.
- **Slice 5** — operator-console redesign shipped. Centred
  case-detail card with the new OKLCH palette + Space Grotesk /
  JetBrains Mono / Helvetica Neue typography. Composition top to
  bottom: DetailHeader → StatusBanner → MetaStrip → (IssueMap |
  Problem+Twist) → OrchestratorDecisions → AgentsSection. State
  machine, SDK wiring, and Agent 2's live path are all in place.
  Components live in `components/chrome/`, `components/orchestrator/`,
  and `components/case/` (regrouped 2026-06-07).

**Currently working (verified live):** Agent 1 call. User confirmed
"Looks good".

**Not yet done:**
- **Slice 4 tail** — full rehearsal end-to-end on the Vercel URL
  (happy path + Force Callback path) and Hindi-phrasing notes for
  slice 6. User is running these themselves.
- **Slice 6** — conversation polish iteration loop + the final
  recorded run. Prompts now live in `agents/sender.md` and
  `agents/receiver.md`; edit those files and re-run
  `scripts/setup-elevenlabs.mjs --create`.

**Key gotchas the next session needs to remember:**
- npm package is `@elevenlabs/client` (the new namespace), not
  `@11labs/client` (the legacy one).
- Signed URLs expire 15 minutes after issuance; fetch a fresh one
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
- The `Buildathon keys.rtf` is kept outside the repo and shared
  with another buildathon demo. Only `ELEVENLABS_API_KEY` is used
  for Pinpoint. The pre-existing `ELEVENLABS_AGENT_ID` in that
  file belongs to that other demo and must not be reused.
- Vercel project name is `pinpoint` (lowercase). `.vercel/` is
  gitignored so a future session may need
  `vercel link --yes --project pinpoint` again if the link
  metadata is gone.
- The map "Expand" button from the design is intentionally not
  rendered (would be inert; defer to a Mapbox/Google Maps
  follow-up).

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

**Architecture changes (if any):**
- Reference the section number in `docs/architecture.md` that changed
  and a one-line summary. Update architecture.md in place; the log
  entry just records that you did.

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
  at creation time, per architecture.md section 11).
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
  hackathon-objective surface. Renders the strip from
  architecture.md section 4.4 item 5 — surface-2 strip, 5-tile
  grid, per-decision tone dot.
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
in `agents/sender.md` + `agents/receiver.md` with `--create`
between takes; record the final clean run.

### Session 2026-06-07, repo restructure (post-slice-5)

**Operator:** Claude Opus 4.7 (1M context)

**Slice exit criterion met?** N/A — not a slice. Repo restructure
between slice 5 and slice 6.

**Files added or changed:**
- `docs/architecture.md` (added): sections 1-11 of the original
  `pinpoint-build-plan.md` lifted out as the durable system spec.
- `docs/build-log.md` (added): sections 12-15 of the original
  `pinpoint-build-plan.md`, plus this entry. Cross-links to
  architecture.md at the top.
- `pinpoint-build-plan.md` (deleted): replaced by the architecture
  + build-log split.
- `agents/sender.md` (added): Agent 1 system prompt body, extracted
  from the heredoc in `scripts/setup-elevenlabs.mjs`.
- `agents/receiver.md` (added): Agent 2 system prompt body.
- `scripts/setup-elevenlabs.mjs` (modified): reads the prompt
  bodies from `agents/sender.md` and `agents/receiver.md` via
  `fs.readFileSync` instead of inlining them.
- `components/chrome/`, `components/orchestrator/`,
  `components/case/` (added): three subdirs that house the
  regrouped components.
- All ten component files (moved): from flat `components/*.tsx`
  into the three subdirs. Imports in `app/page.tsx` and any
  inter-component imports updated.
- `docs/product-plan.md` (moved): was `pinpoint-product-plan.md`.
- `docs/design-handoff/` (moved): was
  `design_handoff_pinpoint_dashboard/`.
- `.gitignore` (modified): added `tsconfig.tsbuildinfo`.
- `README.md` (modified): updated paths to point at the new doc
  locations.

**Architecture changes:**
- `docs/architecture.md` section 6 and 7 now point Agent 1/2
  prompts at `agents/sender.md` and `agents/receiver.md` instead
  of "owned by `scripts/setup-elevenlabs.mjs`".
- `docs/architecture.md` section 10 (Repo layout) rewritten to
  match the new structure.

**Gotchas for the next session:**
- The standalone-plan-doc preference (saved as a memory) was
  superseded for Pinpoint by this split; the new convention is
  architecture.md + build-log.md. For other projects, the
  standalone form may still be preferred.
- The setup script now depends on the `agents/*.md` files being
  present at run time. If you ever bundle the script for a CI run,
  include those files.
- Prompt iteration loop is now: edit `agents/sender.md` or
  `agents/receiver.md`, run `node --env-file=.env.local
  scripts/setup-elevenlabs.mjs --create`, rehearse on Vercel.
- The old flat `components/*.tsx` paths no longer exist. Any deep
  link in a comment, doc, or commit message that references the
  old path needs updating.

**Next slice to start:** slice 6 (conversation polish + recorded
run).
