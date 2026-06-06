# Handoff: Pinpoint — Ops Console

## Overview
Pinpoint is a multi-agent system that resolves a low-confidence delivery location instead of cancelling the order. When the typed address is right but the map pin is far away, an **orchestrator** wakes on the case, calls the **sender** (to confirm the address and any forced order edit), then the **recipient** (to confirm the exact route to the door), carrying state across both calls — and escalates to a human if it can't reach certainty.

This deliverable is the **operations console** for the product: a generic, reusable dashboard shell (sidebar nav, KPI strip, a case **queue**, and a **selected-case detail** panel). The structure is templated — it could show any case — and is currently populated by one real demo case: a gift order for a sister in Jaipur where the pin landed ~2 km from the real address. An operator triages the queue, opens a case, and runs the agent calls from the detail panel.

## About the Design Files
The file in this bundle (`Pinpoint Dashboard.html`) is a **design reference created in HTML/CSS/vanilla JS** — a working prototype that shows the intended look, layout, copy, and interaction model. **It is not production code to ship directly.**

The task is to **recreate this design in the target codebase's existing environment** (React, Vue, Svelte, etc.), using that codebase's established component library, styling system, and conventions. If no front-end environment exists yet, choose the most appropriate framework for the project and implement the design there. The HTML is the source of truth for *appearance and behavior*; the *implementation* should follow the host app's patterns.

In production, the KPIs, the queue list, the live status, and the agent outcomes would be driven by real backend/telephony events. In this prototype the KPIs are placeholders (em-dashes), the queue is one real row plus skeleton placeholders, and the case progression is simulated by a small client-side state machine (documented under **State Management**) so the demo can be driven from the operator-action buttons.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, radii, shadows, and interaction states are all specified here and in the HTML. Recreate the UI faithfully (pixel-level intent), substituting the codebase's equivalent primitives (e.g. its `Card`, `Badge`, `Button`, `Avatar` components) where they exist. Exact values are listed under **Design Tokens**.

---

## Global Layout

A standard **app shell**: a fixed left sidebar + a main column.

- **`.app`** = `display: flex; min-height: 100vh`.
- **Sidebar** (`.sidebar`): fixed 238px, `position: sticky; top: 0; height: 100vh`, white surface, right border. Vertical: logo (top) → nav → user (pinned to bottom with `margin-top: auto`).
- **Main** (`.main`): `flex: 1`, column. Contains a sticky topbar (60px) and a scrolling `.content` (padding `24px 28px 40px`, 20px gap between regions).
- The `.content` stacks two regions: the **KPI strip** and the **workspace** (a master–detail grid).

**Responsive:**
- `≤1180px`: workspace collapses to a single column (queue above detail); the queue loses its sticky; KPI grid → 2 columns.
- `≤920px`: sidebar hides; the detail body (map | case) stacks; the two agents stack.

---

## Regions

### 1 — Sidebar
- **Logo** (`.side-logo`): a 34×34 dark rounded square (`--ink-2`) with a map-pin SVG, the wordmark "Pinpoint" (Space Grotesk 600, 19px), and a small "OPS" environment tag (mono, bordered pill) pushed right.
- **Nav** (`.side-nav`): icon + label rows (`.nav-item`, 13.5px 500). Primary group: **Cases** (active — `--surface-3` bg, `--ink` text, a count pill "1" on the right), **Agents**, **Analytics**. A muted section label "WORKSPACE", then **Fulfilment**, **Settings**. Icons are inline stroke SVGs (1.8 width). Hover → `--surface-2`. *Only Cases is wired; the rest are structural/non-functional.*
- **User** (`.side-user`, pinned bottom, top border): a 32px circular `--blue` avatar "PK" + name "P. Kapoor" + role "Ops Console".

### 2 — Topbar (sticky)
- Height 60px, translucent app-bg with `backdrop-filter: blur(12px)`, bottom border.
- **Breadcrumb** (`.crumbs`): "Cases / **#0D77101685145**" — the leaf is mono 600.
- **Right** (`.top-right`): a non-functional search field (`.search`, 220px, magnifier icon, "Search cases", a "⌘K" kbd hint) and a **live indicator** (`.live`): a pulsing green dot + "Connected".

### 3 — KPI strip
- `grid`, `repeat(4, 1fr)`, gap 16px. Each `.kpi` card: a top row with a mono uppercase label + a 28px rounded icon tile (`.k-ico`, `--surface-3`); then a large value (`.k-val`, Space Grotesk 600, 27px) and a caption (`.k-lab`).
- **All four values are placeholder em-dashes** (`.k-val.dash`, rendered in `--line-2` so they read as "empty slot", not data). The four metrics: **In queue** ("Cases awaiting action"), **Resolved today** ("Delivered, not cancelled"), **Recovery rate** ("Orders saved from cancellation"), **Avg. resolution** ("From trigger to delivery"). In production these bind to real aggregates.

### 4 — Workspace (master–detail)
`grid`, `grid-template-columns: 340px 1fr`, gap 20px, `align-items: start`.

#### 4a — Case queue (master, left)
- A `.card`, `position: sticky; top: 76px` (so it stays as the detail scrolls).
- **Head**: "Case queue" + a mono "live" tag.
- **Filters** (`.q-filters`): three pill chips — "Needs action" (on: `--ink-2` bg/white), "In progress", "Resolved". *Structural; not wired.*
- **List** (`.q-list`):
  - **One real, selected row** (`.q-row.sel`, id `qActive`): a status dot (`.q-dot`, amber, → green when resolved), order id "#0D77101685145" (mono), meta "Pratapnagar, Jaipur · pin 2 km off", and a right column with a status pill (`.q-stat`, reflects case state) + age "2m". Selected = `--surface-3` bg + border.
  - **Four skeleton placeholder rows** (`.q-row.ph`): grey dot + grey bars (`.sk`) standing in for id/meta/status. They imply a stream of other cases without inventing fake data; inert (not clickable).

#### 4b — Case detail (right)
A `.card`, column. Top-to-bottom:

1. **Detail header** (`.detail-head`):
   - **Title row** (`.dh-top`): the order id "#0D77101685145" (Space Grotesk 600, 19px) + a state badge (`.dbadge`, tone-colored: grey "Needs action" → amber "On call"/"In progress" → green "Resolved" → red "Escalated").
   - **Concept one-liner** (`.dh-sub`): "Orchestrator owns the case and its state — it **calls the sender, then the recipient, carrying context across**, and escalates to a human if it can't reach certainty." (the bold clause is the concept-in-brief).
   - **Operator actions** (`.dh-actions`, right): **Call sender** (primary, dark, phone icon), **Call recipient** (ghost, disabled until handoff), **Escalate** (danger/ghost-red), and a small **Reset** icon button (circular-arrow; resets the demo case). These are the real operator controls — there is no separate fixed control bar.
   - **Progress stepper** (`.stepper`): four steps connected by lines — **Triggered** (starts done) · **Sender call** · **Recipient call** · **Resolved** (the last step's label changes to "Delivered" on resolve or "Human handoff" on escalate). Step states: `idle` (grey dot) → `active` (amber pulsing) → `done` (green); the fallback step turns red when escalated. This is both the concept's flow and the live progress indicator.
2. **Status banner** (`.banner`): a full-width tinted strip (tone grey/amber/green/red) with a dot + live status text (bold lead clause). Mirrors the current state in prose.
3. **Meta strip** (`.meta`): compact labelled facts — **Item** "Amul rasmalai · 1 kg", **Amount** "₹450", **Gift** "Ramesh → Suresh" + a "SENDER PAYS" pill, **Address — typed** "House 142, near *Pannadhay Circle*, Pratapnagar" (the landmark gets a 2px amber underline). Labels are mono uppercase (`.mk`).
4. **Detail body** (`.dbody`, `grid 1fr 1fr`):
   - **Map column** (`.map-col`, left, right border, min-height 280px): an absolutely-filled schematic SVG map (NOT a real tile) — warm-grey fill, 56px grid `<pattern>`, four road strokes, a red dashed curve between two markers. Markers: **typed address** (green halo + solid green dot, at SVG 152,158), **fulfilling store** (dark rounded square, 98,206), **dropped pin** (red teardrop, 432,258). Overlays: an "Expand" button (top-right, inert placeholder for a real map modal/provider), a "~2 km gap" badge (centered, `white-space: nowrap`), and a legend (bottom-left) with the three marker meanings.
   - **Case column** (`.case-col`, right): two blocks.
     - **The problem** (red dot tag): "The address is right — but the pin was dropped <span `.neg`>~2 km away</span> in Pratapnagar Sector 6. Go by the pin and delivery lands at the wrong door, so today the order is <span `.neg`>cancelled</span>." (`.neg` = red 600.)
     - **The twist** (amber dot tag): a sub line "The corrected spot is served by a **different store** without Amul rasmalai — so fixing the location forces an order edit. Agent 1 walks these live until one is accepted." Then the substitution options (`.opts`): three `.opt` rows (number chip + name + right-aligned note):
       - 1 · "Haldiram rasmalai · 1 kg" — "₹20 cheaper, refunded"
       - 2 · "Amul rasmalai · 2 × 500 g" — "same item, split"
       - 3 · "Amul rasmalai · 500 g" — "half size, partial refund"
       - **Chosen** (`data-chosen="true"`, applied to option 1 when Agent 1 completes): green border + green number chip (white text) + green-bg row; note → green 600 "Accepted".
5. **Agents section** (`.agents-sec`, top border):
   - **Head**: "Agents on this case" + a muted note "2 voice agents · Hindi".
   - **Two agents** (`.agents`, `grid 1fr 1fr`, vertical divider between):
     - Each `.agent`: a header (`.agent-h`) with a 32px avatar (`.av` — **Agent 1 = amber, Agent 2 = `--ink-2`**, distinguished by number + shade, no extra hue), name + role, a "हिन्दी · Hindi" language pill, and a live status (`.astat`: `--faint` Ready/Waiting → amber "Calling…" pulsing → green "Call complete").
     - **Agent 2 only — inherit note** (`.inherit`): an arrow icon + "Resumes with **everything Agent 1 learned** — never starts cold." This is the visible proof of *state carrying*.
     - **Goals** (`.goals`): each goal = a number chip + title (`.gt`) + description (`.gd`) + an **outcome** line (`.outcome`) hidden until that agent's call completes; on reveal it fades/slides in, turns green-bg with a check, and shows the result (bold key facts).
       - Agent 1 — G1 "Confirm the delivery address" → "**House 142, Pannadhay Circle** confirmed — pin corrected by ~2 km." · G2 "Confirm the order edit" → "**Haldiram substitute** accepted — ₹20 refunded."
       - Agent 2 — G1 "Confirm the route to the door" → "**2nd lane, blue gate, 2nd floor** — handed to the partner." · G2 "Protect the sender's identity" → "**Identity protected** — shared only the last 5 digits, on a second insist."
     - **Agent 2 locked state** (before Agent 1 finishes): the card dims to opacity 0.55 and a centered pill "UNLOCKS AFTER AGENT 1" overlays it.

---

## Interactions & Behavior

A deterministic, operator-driven **state machine** with four settled states (plus two transient `running` states). Each action animates a short "call in progress" sequence, then settles.

- **Call sender** (enabled in `idle`/Needs action): sender step → active (amber); Agent 1 status "Calling…"; badge "On call"; banner amber "Agent 1 on the line with the sender — confirming the address…". Then, on a timeline: reveal Agent-1 Goal-1 outcome (+1200ms) → option 1 flips to "Accepted" + banner "Address locked. Confirming the order edit…" (+1900ms) → reveal Goal-2 outcome (+2700ms) → settle to **handoff** (+3500ms): sender step done, Agent 1 "Call complete", recipient step + Agent 2 unlock, "Call recipient" enabled, "Call sender" disabled, badge "In progress", banner amber "Address & order edit confirmed. Context carried — ready to call the recipient."
- **Call recipient** (enabled in `handoff`): recipient step → active; Agent 2 "Calling…"; banner "Agent 2 resumes with Agent 1's context — confirming the route…". Timeline: reveal Agent-2 Goal-1 (+1300ms) → banner "Route confirmed. She asks who sent it — applying the identity guardrail…" (+2000ms) → reveal Goal-2 (+2800ms) → settle to **resolved** (+3600ms): recipient step done, end step done ("Delivered"), all action buttons disabled, badge green "Resolved", banner green "Location resolved, route confirmed, identity protected. Order on the way." The selected queue row's dot + status also flip to green/Resolved.
- **Escalate** (enabled unless resolved): jumps to **callback** — end step turns red ("Human handoff"); buttons disabled; badge red "Escalated"; banner red "Couldn't reach certainty. Callback promised; routed to a human with all context so far." This is the **safe-failure path** — always reachable from any non-resolved state.
- **Reset** (always): returns to **idle** (clears outcomes, option choice, steps; re-enables Call sender; queue badge → "Needs action").

**Animation specifics:** step/agent state transitions ~0.35–0.4s; outcome reveal = opacity + `translateY(3px)→0` + color, 0.4s (checkmark 0.3s); pulsing dots via `@keyframes pulse-a` (amber, used on active steps + "Calling" status) and `@keyframes pulse-g` (green, on the topbar live dot). Respect `prefers-reduced-motion` in the real build (gate the looping pulses).

**Persistence:** the prototype stores the settled state in `localStorage` key `pinpoint_state_v3` and restores on load (a refresh resumes the demo; `running` states resolve to their prior settled state on boot). Irrelevant in production (state comes from backend events) — but keep a "reset case" affordance for demos.

---

## State Management
State enum: `caseState ∈ { idle, handoff, resolved, callback }` (+ transient `running1`/`running2`). A single `render(state)` function derives all UI declaratively — recommend the same pattern (derive in render, don't imperatively mutate scattered DOM).

| Element | idle | running1 | handoff | running2 | resolved | callback |
|---|---|---|---|---|---|---|
| Sender step | idle | active | done | done | done | done* |
| Recipient step | locked | locked | idle | active | done | (unchanged)* |
| End step | idle | idle | idle | idle | done | active (red) |
| Detail badge / queue status | Needs action (grey) | On call | In progress | On call | Resolved (green) | Escalated (red) |
| Agent 1 status | Ready | Calling | Complete | Complete | Complete | * |
| Agent 2 status | Waiting | Waiting | Ready | Calling | Complete | * |
| Agent 1 outcomes | hidden | reveal 1→2 | shown | shown | shown | * |
| Agent 2 outcomes | hidden | hidden | hidden | reveal 1→2 | shown | * |
| Option 1 chosen | no | mid-seq | yes | yes | yes | * |
| Call sender btn | enabled | disabled | disabled | disabled | disabled | disabled |
| Call recipient btn | disabled | disabled | enabled | disabled | disabled | disabled |
| Escalate btn | enabled | (disabled mid-run) | enabled | (disabled mid-run) | disabled | disabled |
| Status banner tone | grey | amber | amber | amber | green | red |

\* `callback` preserves whatever was gathered. Key requirement: escalate is reachable from any non-resolved state and ends the run safely.

**Data fetching (production):** none in the prototype. In a real build, fetch the case (order, sender/recipient, address, pin coordinates, fallback options, agent goals) by case id; populate the queue from a cases endpoint; bind KPIs to aggregates; stream live status/outcomes via websocket/SSE/polling from the orchestrator. The action buttons become "start call" commands; outcomes render from real call results, not timers.

---

## Design Tokens

Cool-neutral **SaaS console** palette authored in **OKLCH**, with three functional accents. Hex approximations given for convenience; prefer the host system's tokens if it has near-equivalents.

### Colors
| Token | OKLCH | ~Hex | Use |
|---|---|---|---|
| `--bg` | `oklch(0.967 0.003 255)` | `#F2F3F5` | App background |
| `--surface` | `oklch(0.998 0.001 255)` | `#FCFDFE` | Cards, sidebar, topbar |
| `--surface-2` | `oklch(0.978 0.003 255)` | `#F4F6F8` | Insets, hovers, banners |
| `--surface-3` | `oklch(0.962 0.004 255)` | `#ECEFF2` | Active nav, icon tiles, chips, skeletons |
| `--ink` | `oklch(0.275 0.018 264)` | `#383D48` | Primary text |
| `--ink-2` | `oklch(0.235 0.020 264)` | `#2E323C` | Logo, primary buttons, Agent 2 avatar |
| `--muted` | `oklch(0.520 0.015 262)` | `#71788A` | Secondary text |
| `--faint` | `oklch(0.630 0.013 262)` | `#8D93A3` | Labels, tertiary text, dash placeholders' label |
| `--line` | `oklch(0.912 0.006 262)` | `#E3E6EB` | Borders/dividers |
| `--line-2` | `oklch(0.875 0.008 262)` | `#D6DAE1` | Stronger borders, connectors, dash values |
| `--amber` | `oklch(0.72 0.125 66)` | `#CC9038` | In-progress / active call · Agent 1 · address highlight |
| `--amber-bg` | `oklch(0.952 0.034 78)` | `#F6EEDC` | Amber badge/banner background |
| `--green` | `oklch(0.595 0.108 155)` | `#43946A` | Confirmed / correct / resolved · live dot |
| `--green-bg` | `oklch(0.955 0.034 158)` | `#E5F3EA` | Outcome/option success background |
| `--red` | `oklch(0.575 0.170 26)` | `#C8492F` | Problem / wrong pin / escalate |
| `--red-bg` | `oklch(0.953 0.034 30)` | `#FAE8E2` | Red badge/banner background |
| `--blue` | `oklch(0.56 0.115 256)` | `#5577C8` | User avatar accent |

> Palette discipline: cool neutrals carry ~90% of the UI. **amber** = in-progress, **green** = success/resolved, **red** = problem/failure. Primary buttons are neutral-dark (`--ink-2`), not a brand hue. The two agents differ by number + avatar shade, not color.

### Typography
- **Display / titles / numbers:** "Space Grotesk", 500/600/700.
- **Body / UI:** "Helvetica Neue", Helvetica, Arial, sans-serif.
- **Mono (labels, ids, pills, kbd, status tags):** "JetBrains Mono", 400/500.
- Sizes: detail/case-id title 19px/600; card titles 14–15px/600; KPI value 27px/600; body 13–13.5px; descriptions 12–12.5px; labels/pills 8.5–11px (mono, uppercase, letter-spacing ~0.06–0.13em).
- `text-wrap: pretty` on multi-line paragraphs.

### Spacing / radii / shadow
- Content padding `24px 28px`; region gap 20px; card paddings 14–22px.
- Radii: `--r-lg` 14px (cards), `--r-md` 10px, `--r-sm` 8px (options/outcomes), 999px (pills/badges/dots), 9–10px (avatars, buttons, nav items).
- Shadows: `--shadow-sm = 0 1px 2px oklch(0.4 0.03 264 / 0.05)`; `--shadow` adds `0 8px 24px -14px oklch(0.4 0.03 264 / 0.20)`.
- Pulses: `@keyframes pulse-a` (amber ring) and `pulse-g` (green ring), expanding box-shadow 0→6px, ~1.5–2.4s infinite.

---

## Assets
- **No external image assets.** The wordmark pin, all nav/KPI/action icons, the checkmark, and the map are inline SVG. Icons are stroke-style (1.8–1.9 width) — swap to the host app's icon set (Lucide/Heroicons/etc.) if it has one.
- The **map is intentionally schematic/abstract**, not a real map tile. In production the "Expand" affordance implies a real map provider (Mapbox/Google Maps) plotting the two real coordinates and the gap — design that as a follow-up.
- **Fonts** load from Google Fonts (Space Grotesk, JetBrains Mono); Helvetica Neue is a system font. Swap to the host font stack/CDN if it has one.

## Files
- `Pinpoint Dashboard.html` — the complete hi-fi prototype (HTML + CSS in a `<style>` block + a vanilla-JS state machine in a trailing `<script>`). Self-contained; open directly in a browser. Section markers in the HTML (`<!-- ===== SIDEBAR ===== -->`, etc.) map to the regions above. The state machine is `render(state)`, `runAgent1()`, `runAgent2()`, and the button handlers.
