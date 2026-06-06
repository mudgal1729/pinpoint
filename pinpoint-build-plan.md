# Pinpoint, Build Plan (V0)

> **This file is the single source of truth for the Pinpoint V0 build.** A
> new session opening this repo with zero prior context should be able to
> read this file end to end and continue work. Sibling files:
> `pinpoint-product-plan.md` (the product narrative; do not edit) and
> `pinpoint-demo-presentation.md` (the deck talking points; do not edit). All
> implementation decisions live here.

---

## Standard session-start prompt

Paste this into a fresh session, no edits, regardless of which slice is
next. The plan plus the implementation log tell the session everything it
needs.

```
Read pinpoint-build-plan.md in full, then read the implementation log
(section 15) to find the next slice that is not fully done. Execute
that slice per its spec in section 12. Before ending, append a new
entry to the implementation log per the template at the top of
section 15.
```

If you want to override the auto-selection (for example, polish work in an
already-done slice), say so explicitly after the paste.

---

## 0. How to use this document

1. **Read sections 1 through 11 first.** They define what we are building,
   the single hardcoded case, the dashboard, the two voice agents, the
   stack, the repo layout, and the environment. They do not change often.
2. **Then read section 12** (vertical slices). That is the execution plan,
   ordered. Find the next slice that is not yet checked off in the
   implementation log (section 15) and start there.
3. **Then read section 15** (implementation log). It tells you what
   previous sessions actually did, any deviations from this plan, and any
   gotchas. Trust the log over your assumptions about repo state, but
   verify with `ls` or `git status` before acting on it.
4. **Before ending your session,** append a new entry to section 15. The
   format is specified at the top of that section. This is mandatory;
   without it the next session has no idea what you changed.
5. **If you change the plan itself** (a slice splits, a decision reverses,
   the case context is edited), update the relevant section in place and
   log the change in section 15 with a short "Plan changes" line. Do not
   leave the document inconsistent with the code.

---

## 1. What we are building (and not)

**Building (V0, demo only):** a single Next.js page deployed on Vercel that
acts as a window into a delivery-location resolution orchestrator. The page
shows one hardcoded case (a Jaipur gift order with a wrong map pin),
exposes two buttons that trigger two ElevenLabs voice calls in Hindi, and
advances a visible status as the calls progress. State lives in memory.

**Not building (talking points only in the deck):** real low-confidence
detection, automated hold-vs-repin decision, geocoding, real fulfillment
integration (serviceability check, store reassignment, inventory, real
repricing), real telephony (Twilio is not used), idempotent retries,
confidence calibration, and the full human-handoff workflow. In the demo,
the Sender agent verbally conveys the order edit; the failure path simply
says "a team member will call shortly".

The point of V0 is to make the two Hindi conversations feel smooth on a
live recording. Everything else exists to frame those two calls.

---

## 2. The demo case

A man in his late fifties (Ramesh Sharma) in another city sends a 1 kg box
of Amul laddoo to his sister (Sunita Sharma) in Jaipur as a gift. The
typed address is correct: House No. 142, near Pannadhay Circle,
Pratapnagar, Jaipur. The dropped map pin, however, sits about 2 km away in
Pratapnagar Sector 6.

The orchestrator notices, holds the order, and triggers Agent 1, which
calls Ramesh. Agent 1 (a) confirms that the typed address (Pannadhay
Circle) is the real intended destination by cross-checking against nearby
landmarks, and (b) confirms an order edit, because the corrected location
is served by a different store where the Amul laddoo is unavailable. The
substitute is Haldiram laddoo 1 kg, 20 rupees cheaper, refund issued; the
fallback if Ramesh asks for another option is two 500 g packs of the same
Amul item. If Ramesh cannot be convinced or the line is poor, the status
moves to `CALLBACK_SCHEDULED`.

Once Agent 1 finishes successfully, Agent 2 calls Sunita to confirm the
route from Pannadhay Circle to her exact door. Agent 2 protects Ramesh's
identity: it tells Sunita a gift is on its way but does not say who sent
it; only if Sunita insists a second time does the agent share the last 5
digits of Ramesh's phone number, nothing more. Same failure path applies.

Both calls are in Hindi. Both agent voices are male (a young-to-middle-aged
Blinkit customer-support persona); the customer (Ramesh) and the recipient
(Sunita) are the two real people on the other end of the calls.

---

## 3. caseContext: single source of truth

This object is hardcoded once, in `lib/case.ts`, and is read by both the
dashboard (to render panels) and the agent-session bootstrapper (to pass
as ElevenLabs dynamic variables). Do not duplicate any of these values
elsewhere.

```ts
export const caseContext = {
  language: "Hindi",
  order: {
    items: ["Amul laddoo 1 kg"],
    amount: 450, // INR
  },
  sender: {
    name: "Ramesh Sharma",
    ageBand: "50s",
    // For the identity-protection rule in Agent 2.
    phoneLast5: "37289", // shared only if recipient insists twice
  },
  recipient: {
    name: "Sunita Sharma",
    relation: "sister",
  },
  address: {
    houseNo: "142",
    landmark: "Pannadhay Circle",
    area: "Pratapnagar",
    city: "Jaipur",
  },
  issue:
    "Dropped pin is in Pratapnagar Sector 6, about 2 km from Pannadhay Circle.",
  // 2 to 3 landmarks close to Pannadhay Circle, used by Agent 1 to confirm
  // it is the right Pannadhay Circle. SANITY-CHECK these against a Jaipur
  // map before the recorded run; if any are wrong, edit here and re-run
  // `node --env-file=.env.local scripts/setup-elevenlabs.mjs --create` so
  // the agent prompts pick up the new values.
  nearbyLandmarks: [
    "Pratapnagar Stadium",
    "Sector 7 Market",
    "B2 Bypass",
  ],
  orderEdit: {
    reason:
      "Correct location is served by a second store where the Amul laddoo is unavailable.",
    unavailable: "Amul laddoo 1 kg",
    substitute:
      "Haldiram laddoo 1 kg, 20 rupees cheaper, difference refunded",
    altIfAsked: "Same item as two 500 g packs (2 x 500 g) of Amul instead",
  },
} as const;
```

Notes:
- `phoneLast5` is dummy data, used only inside the Agent 2 identity rule.
- The three `nearbyLandmarks` are best-effort picks. Verify before
  recording.
- If any field changes, re-run the setup script so the agents' prompts (which
  embed these values literally for natural Hindi phrasing) refresh in place.
  See section 12, slice 2.

---

## 4. Dashboard spec

One scrollable screen, top to bottom. All content is rendered from
`caseContext` (no inline strings). Stack: Next.js App Router, React,
Tailwind.

1. **Header**: "Pinpoint, V0" on the left; small "Demo case: Jaipur" pill
   on the right. No nav.
2. **Order panel**: items, amount in rupees, sender name and age band,
   recipient name and relation, the full typed address as one line, and a
   "Language: Hindi" tag.
3. **Issue panel**: a short sentence describing the pin vs landmark
   mismatch, plus a static SVG mockup showing two markers labeled "Typed
   address (Pannadhay Circle)" and "Dropped pin (Pratapnagar Sector 6)"
   with a "~2 km" label between them. The SVG lives at
   `components/IssueMap.tsx`. It is stylised, not a real map; a real map
   is not needed for the demo.
4. **Agent 1 goals panel** (must be visible; this is required by the
   demo):
   - Goal 1: Confirm the delivery address. The pin is far from the
     address landmark.
   - Goal 2: Confirm the order edit. The correct location is served by a
     second store, so the item is substituted (Haldiram, refund) with a
     2 x 500 g option if asked.
5. **Agent 2 goals panel** (shown only once status is at AGENT1_DONE or
   later, to keep the screen calm at the top of the demo):
   - Goal 1: Confirm the route from Pannadhay Circle to the house.
   - Goal 2: Protect the sender's identity unless the recipient insists.
6. **Status line**: the current orchestrator status, rendered as a
   labeled chip plus a sentence (copy in section 5).
7. **Controls**:
   - `Trigger Agent 1` button. Enabled when status is NEW. Disabled
     otherwise.
   - `Trigger Agent 2` button. Enabled when status is AGENT1_DONE.
     Disabled otherwise.
   - `Force Callback` button (small, secondary). Always enabled while
     not RESOLVED. Moves status to CALLBACK_SCHEDULED. Used as a demo
     escape hatch and to demonstrate the failure path.
   - `Reset` button (small, secondary). Returns status to NEW. Used
     between rehearsals.

Visual style: clean, neutral, slightly Blinkit-adjacent (yellow accent is
fine), readable from across a room since the demo is recorded. No
animation beyond a subtle pulse on the active status chip while a call is
in progress.

---

## 5. Status flow

State machine with six states. Transitions are driven by button clicks
and the ElevenLabs SDK conversation-end callback (exact name locked in
`docs/sdk-notes.md`). No persistence is needed; status is React state.

| State                | Trigger to enter                                          | Status sentence shown                                                                |
| -------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `NEW`                | Initial; or Reset button                                  | "New case detected. Ready to call the sender."                                       |
| `AGENT1_IN_CALL`     | Trigger Agent 1 button click                              | "Calling the sender to confirm address and order edit."                              |
| `AGENT1_DONE`        | Sender call ends successfully                             | "Address confirmed and order edit confirmed. Calling the recipient to confirm the route." |
| `AGENT2_IN_CALL`     | Trigger Agent 2 button click                              | "Calling the recipient to confirm the route to the door."                            |
| `RESOLVED`           | Receiver call ends successfully                           | "Location resolved, route confirmed, sender identity protected. Order on the way."   |
| `CALLBACK_SCHEDULED` | Force Callback button; or early disconnect of either call | "Could not confirm on the call; a team member will call shortly."                    |

"Ends successfully" in V0 means: the SDK fires the conversation-end
callback and the user did not click Force Callback during the call. We
are not parsing transcript content; the operator running the demo
decides whether the call went well by either letting it conclude
naturally or by clicking Force Callback.

---

## 6. Agent 1 (Sender, Hindi, male)

The system prompt is written in English with sample Hindi turns embedded
so the model has voice. The prompt is owned by
`scripts/setup-elevenlabs.mjs` and is the canonical source. The text
below specifies what that prompt must contain.

**Role:** a male Blinkit customer-support assistant calling the customer
who placed the order, in Hindi, because the delivery location is unclear.
Warm, brief, clear. Natural conversational Hindi, polite register
suitable for an older customer (use `aap`, not `tum`). Pace is measured;
the customer is in his fifties, so allow him to interrupt and do not
rush. The agent already knows the order and the address; it confirms, it
does not interrogate.

**Dynamic variables passed at session start** (from `caseContext`):

- `sender_name`, `recipient_name`, `recipient_relation`
- `items`, `amount`
- `address_house_no`, `address_landmark`, `address_area`, `address_city`
- `issue_summary`
- `nearby_landmarks` (joined as a comma-separated string for the prompt)
- `substitute_text`, `alt_if_asked_text`, `order_edit_reason`

**Goals, in order:**

1. **Confirm the delivery address.** Greet politely, introduce as
   Blinkit, explain gently that the typed address looks correct but the
   map pin sits about 2 km away near Pratapnagar Sector 6, far from
   Pannadhay Circle. Confirm the house number (142) and Pannadhay
   Circle. To be sure it is the right Pannadhay Circle, mention one or
   two of the `nearby_landmarks` and ask him to confirm. Then ask if he
   knows the route from Pannadhay Circle to the house.
2. **Confirm the order edit.** Explain that the corrected location is
   served by a different store, and there the Amul laddoo is not
   available; Haldiram laddoo is, and it is 20 rupees cheaper, so the
   difference will be refunded. Ask if that is okay. If he asks for
   another option, offer the same item as two 500 g packs instead.
   Confirm whichever he picks.

**Close:** thank him; confirm the address and the order edit are set;
let him know the order is being arranged.

**Case-specific handling notes** (must be in the prompt so the turns are
smooth):

- If he says the pin is wrong or does not understand what a pin is:
  reassure him; the typed address is right; you just need the landmark
  and the route confirmed.
- Nearby-landmark cross-check: keep the landmarks ready; if he confirms
  one, treat Pannadhay Circle as correct and move on.
- Substitution objection: if he hesitates on Haldiram, offer the
  2 x 500 g packs of the same item; if he still hesitates, keep it
  simple and move to the callback path.
- Failure path: if he is confused after a couple of tries or the line
  is bad, say politely that someone from the team will call him
  shortly, and end. The dashboard will register CALLBACK_SCHEDULED on
  disconnect if the operator clicked Force Callback first; otherwise
  the operator can click it after.

**Voice:** a calm, clear, confident, professional yet approachable
middle-aged male Hindi voice. Picked: NJ
(`iVOyIHSsWJ9SEmfuJOud` in our account; pulled from the ElevenLabs
shared library). Stored as `PINPOINT_SENDER_VOICE_ID` in `.env.local`.
Swap by replacing the env var and re-running the setup script.

---

## 7. Agent 2 (Receiver, Hindi, male)

**Role:** a male Blinkit customer-support assistant calling the recipient
of a scheduled gift delivery, in Hindi, to confirm exactly how to reach
the door. Warm, brief, natural Hindi, polite register (use `aap`). The
agent already knows the area and the landmark from the first call; it
builds on them, it does not start from scratch.

**Dynamic variables passed at session start:** same as Agent 1, plus
`sender_phone_last5`.

**Goals, in order:**

1. Greet warmly. Let her know a gift delivery is on its way to her.
   Mention that you are calling to confirm how to reach the house.
   Reassure her, since she is not expecting the call.
2. Confirm the route from Pannadhay Circle to the house. Ask her to
   describe the area near the house and how to identify it: which lane
   off the circle, gate colour, floor number, any visible marker.

**Identity rule:** do not say who sent the gift. If she asks, say that
information is kept private. Only if she insists a second time, share
the last 5 digits of `sender_phone_last5`, and nothing more (no name,
no relation, no city).

**Close:** thank her; confirm the route is noted; the order is on the
way.

**Case-specific handling notes:**

- Opening must be reassuring, not alarming. She is not expecting a
  call.
- House identification: prompt for concrete physical markers so the
  route is usable by a delivery partner who has never been there.
- Failure path: if she cannot describe it or the line is bad, say
  someone will call shortly, end. Operator clicks Force Callback to
  register CALLBACK_SCHEDULED.

**Voice:** a young, natural, human-like male Hindi voice that sounds
like a real caller rather than a script. Picked: Krishna
(`iB2rIwm9cQCRGWoKDRtX` in our account; pulled from the ElevenLabs
shared library). Stored as `PINPOINT_RECEIVER_VOICE_ID` in `.env.local`.
Distinct in age and timbre from the Sender voice so the listener can
tell them apart on the recording.

---

## 8. Conversation polish principles

The plan deliberately spends most build time here, in slice 5. These
principles guide that work.

- Write system prompts as **role + goals + handling notes + Hindi
  example turns**, not as line-by-line scripts. The agent should sound
  natural and recover gracefully when the operator improvises.
- Tune Hindi phrasing for register: polite (`aap`, not `tum`); short
  turns; quick acknowledgements (`achha`, `theek hai`, `samajh gaya`);
  no robotic repetition of the full address.
- Allow barge-in so the operator can interrupt mid-turn.
- Pre-load all context as ElevenLabs dynamic variables at session
  start, so the model is doing only light reasoning mid-call. This
  keeps per-turn latency low.
- Iteration loop: run a full call, note the awkward beats, edit the
  prompt in `scripts/setup-elevenlabs.mjs`, re-run the script with
  `--create` (it is idempotent and PATCHes the existing agents in
  place), call again. Repeat until both calls flow.
- Final recorded run is on a clean cold start, on the deployed Vercel
  URL, not on localhost.

---

## 9. Stack and architecture

- **Framework:** Next.js (App Router), React, TypeScript, Tailwind.
- **State:** React in-memory (`useState`, no Redux, no Zustand).
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
  database, no queue, no telephony. The two API routes are server-only:
  one for signed URLs, one optional for health.
- **Auth model:** the ElevenLabs API key never enters the browser. The
  signed-URL route fetches the key from `process.env`, requests a
  signed URL from ElevenLabs, and returns only the signed URL to the
  client. The client uses that URL to open the WebSocket session.
- **Deploy:** Vercel for the recorded run. Localhost for rehearsal.
- **SDK shape warning:** the build plan was written before locking
  down the exact ElevenLabs Conv AI SDK field names (session start,
  dynamic-variables field, conversation-end callback, signed-URL
  endpoint). Slice 0 fetches the current docs and writes
  `docs/sdk-notes.md` as the canonical reference. If a future SDK
  change breaks the integration, update `docs/sdk-notes.md` and
  section 9 here, then log it in section 15.

---

## 10. Repo layout

```
PinPoint/
  pinpoint-product-plan.md           # narrative; do not edit
  pinpoint-build-plan.md             # this file
  pinpoint-demo-presentation.md      # deck talking points; do not edit
  Buildathon keys.rtf                # raw keys file; do not commit
  .env.local                         # derived from the rtf, see section 11
  .env.example                       # committed; documents required vars
  .gitignore
  package.json
  next.config.mjs
  tsconfig.json
  tailwind.config.ts
  postcss.config.mjs
  app/
    layout.tsx
    page.tsx                         # the single dashboard page
    api/
      signed-url/route.ts            # GET ?agent=sender|receiver
  components/
    OrderPanel.tsx
    IssuePanel.tsx
    IssueMap.tsx                     # the stylised SVG
    AgentGoalsPanel.tsx              # reused for both agents
    StatusLine.tsx
    Controls.tsx
  lib/
    case.ts                          # the caseContext object
    elevenlabs.ts                    # client-side SDK helpers
    status.ts                        # state machine types and copy
  scripts/
    setup-elevenlabs.mjs             # voice + agent creation, idempotent
  docs/
    sdk-notes.md                     # written in slice 0
```

This layout is a starting point; deviations are fine if they are logged
in section 15 and updated here.

---

## 11. Environment and keys

The provided `Buildathon keys.rtf` is reused across multiple buildathon
demos. Most of its keys are for a different project (a patient-discharge
follow-up demo). For Pinpoint V0 we use exactly **one** key from it:

| Variable                       | Source                                   | Used for                       |
| ------------------------------ | ---------------------------------------- | ------------------------------ |
| `ELEVENLABS_API_KEY`           | from the rtf, server-side                | agent creation, signed URLs    |
| `PINPOINT_SENDER_VOICE_ID`     | written by `setup-elevenlabs.mjs`        | passed to agent at creation    |
| `PINPOINT_RECEIVER_VOICE_ID`   | written by `setup-elevenlabs.mjs`        | passed to agent at creation    |
| `PINPOINT_SENDER_AGENT_ID`     | written by `setup-elevenlabs.mjs`        | session start (Agent 1)        |
| `PINPOINT_RECEIVER_AGENT_ID`   | written by `setup-elevenlabs.mjs`        | session start (Agent 2)        |

The four `PINPOINT_*` IDs are populated automatically by the bootstrap
script the first time it runs. Subsequent runs PATCH the existing agents
in place. Voice IDs can be swapped by hand in `.env.local`; agent IDs
should not be edited by hand.

**Explicitly ignored** (do not read or pass through, even though they are
in the rtf): `CONVEX_*`, `NEXT_PUBLIC_CONVEX_URL`, `ELEVENLABS_AGENT_ID`
(this belongs to the other demo, not ours), `ELEVENLABS_PHONE_NUMBER_ID`,
all `TWILIO_*`, `RESEND_*`, `SLACK_*`, all `PATIENT_*`. The Pinpoint V0
demo is browser-side voice only; there is no SMS, no phone-call
telephony, no email, no Slack notification, no DB.

`.env.example` is committed and lists the five Pinpoint variables.
`.env.local` is gitignored. The `ELEVENLABS_API_KEY` is filled in by hand
once (copy from `Buildathon keys.rtf`); the other four are filled in by
the bootstrap script.

---

## 12. Vertical slices (execution plan)

Each slice is a self-contained chunk that can be done in a single
session, ends in a working, demoable state, and has an explicit exit
criterion. After each slice, the working session should `/clear` and the
next slice should start fresh using the Standard session-start prompt at
the top of this document.

### Slice 0: Plan and SDK notes
- Rewrite this build plan to be standalone (this file).
- Fetch the current ElevenLabs Conversational AI SDK docs and write
  `docs/sdk-notes.md` capturing: (a) the browser-side session-start call
  shape, (b) how dynamic variables are passed, (c) the
  conversation-end callback name, (d) the signed-URL HTTP endpoint and
  its query parameters, (e) the agent-creation HTTP endpoint and its
  request body shape, (f) anything else that field-name churn could
  break.
- **Exit criterion:** `pinpoint-build-plan.md` and `docs/sdk-notes.md`
  exist and are committed. No application code yet.

### Slice 1: Dashboard shell, no voice
- Scaffold Next.js with App Router, TypeScript, Tailwind.
- Create `lib/case.ts` exactly as specified in section 3.
- Create `lib/status.ts` with the state-machine type and the copy from
  section 5.
- Build the dashboard page and all components per section 4.
- Build the SVG mockup in `components/IssueMap.tsx`. Stylised, not a
  real map; two labeled markers and a "~2 km" label between them is
  enough.
- Wire all button transitions in pure React state. No SDK calls yet.
  The Trigger Agent 1 button immediately advances to AGENT1_IN_CALL on
  click and a small "End call (simulated)" button advances to
  AGENT1_DONE. Same for Agent 2. The Force Callback and Reset buttons
  work as specified.
- **Exit criterion:** `npm run dev` shows the dashboard; clicking
  through the buttons walks the state machine through NEW to RESOLVED
  and back; the Force Callback path also works. Mobile is not
  required; design for a laptop screen, since the demo is recorded on
  one.

### Slice 2: Agents created and signed-URL route

This slice has two halves. The first half (voice picks + agent creation)
was done in the same session that wrote the plan, before slice 1. The
second half (signed-URL route) is still open and waits for slice 1 to
finish.

Half A (already done in the planning session, do not redo):
- Audition Hindi-capable multilingual male voices in the ElevenLabs
  shared library, pick two distinct ones.
- Run `node --env-file=.env.local scripts/setup-elevenlabs.mjs
  --bootstrap`. The script adds both shared voices to the account,
  writes their IDs into `.env.local`, then creates both agents via
  `/v1/convai/agents/create`, writing those IDs into `.env.local` too.
- Confirm both agents are visible in the ElevenLabs dashboard.

Half B (still open):
- Build `app/api/signed-url/route.ts`. It accepts a
  `?agent=sender|receiver` query param, reads the right agent ID from
  env, calls the ElevenLabs signed-URL endpoint server-side with the
  API key, and returns the signed URL as JSON. On error, returns a
  5xx with a sanitised message.
- If Half B requires prompt changes, run
  `node --env-file=.env.local scripts/setup-elevenlabs.mjs --create`
  (no `--bootstrap`) to PATCH the existing agents in place.

**Exit criterion:** `curl http://localhost:3000/api/signed-url?agent=sender`
returns a signed URL JSON; same for `agent=receiver`. Front-end is
unchanged from slice 1. Both agents still visible in the ElevenLabs
dashboard. Re-running the bootstrap script is a no-op (voice IDs and
agent IDs in `.env.local` are detected and reused).

### Slice 3: Agent 1 live
- Add `lib/elevenlabs.ts` with two helpers:
  `startSenderSession(caseContext, onEnd)` and
  `startReceiverSession(caseContext, onEnd)`. Each fetches the signed
  URL, opens the SDK session, passes the dynamic variables, and
  registers the conversation-end callback.
- Wire Trigger Agent 1 to call `startSenderSession`. On click, status
  moves to AGENT1_IN_CALL. On conversation-end callback fire, status
  moves to AGENT1_DONE.
- If the operator clicks Force Callback during the call, immediately
  end the session and move status to CALLBACK_SCHEDULED.
- Remove the simulated "End call" button for Agent 1 added in slice 1.
- **Exit criterion:** clicking Trigger Agent 1 on localhost starts a
  real Hindi ElevenLabs call in the browser; the agent introduces
  itself with the correct sender name and address from `caseContext`;
  ending the call advances the dashboard to AGENT1_DONE.

### Slice 4: Agent 2 live, Vercel deploy, first rehearsal
- Wire Trigger Agent 2 identically using `startReceiverSession`. Move
  status to AGENT2_IN_CALL on click and RESOLVED on call end. Remove
  the simulated end button for Agent 2 too.
- Force Callback during Agent 2 also moves to CALLBACK_SCHEDULED.
- Deploy to Vercel. Add `ELEVENLABS_API_KEY`,
  `PINPOINT_SENDER_AGENT_ID`, and `PINPOINT_RECEIVER_AGENT_ID` to
  Vercel project env. Confirm the microphone permissions prompt works
  on the Vercel domain and that both calls connect from the deployed
  page.
- Do a single full rehearsal on the Vercel URL. Note any awkward
  beats; do not fix them in this slice (that is slice 5).
- **Exit criterion:** end-to-end happy path runs on the Vercel URL;
  failure path runs by clicking Force Callback during either call; a
  list of awkward Hindi phrasing beats has been written into the
  implementation log for slice 5 to pick up.

### Slice 5: Conversation polish and recorded run
- Iterate on the two prompts in `scripts/setup-elevenlabs.mjs`. After
  each edit, re-run the script with `--create` (idempotent PATCH).
  Rehearse the affected call. Repeat until both calls flow naturally.
  The bar is: no robotic repetition, no awkward Hindi phrasing, the
  older customer (Agent 1) is given space to interrupt, the recipient
  (Agent 2) is reassured before being asked anything.
- Verify the identity-protection rule fires correctly in Agent 2: do
  a take where the operator (as Sunita) asks "kisne bheja hai?" once
  (agent should decline) and again (agent should share only the last
  5 digits).
- Verify the order-edit fallback in Agent 1: do a take where the
  operator refuses Haldiram and the agent offers the 2 x 500 g option
  without prompting.
- Record the final clean run on the Vercel URL: full happy path. Save
  the video file outside this repo.
- **Exit criterion:** recorded video exists; both prompts in
  `scripts/setup-elevenlabs.mjs` reflect the final polished versions;
  the implementation log lists the prompt-iteration notes that worked.

---

## 13. Out of scope (deck talking points only)

The following are intentionally not in V0. They are mentioned in
`pinpoint-demo-presentation.md` to convey the full product vision; they
are not built and should not be attempted in this repo.

- Real low-confidence detection of bad pins.
- The hold-vs-repin decision logic.
- Real geocoding or Google Maps API integration.
- Real store reassignment, serviceability, inventory, repricing.
- Real telephony (no Twilio, no PSTN; both calls are browser-side over
  the ElevenLabs WebSocket).
- Idempotent retries, confidence calibration.
- The full human-handoff workflow (the demo failure path just shows a
  status string).
- Multi-case support, real order ingestion, persistence.

---

## 14. Decisions log

Decisions made during planning, with the reasoning. Reverse with care;
each of these has downstream implications.

| Date       | Decision                                                                                                                              | Reason                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-06 | Single Next.js page on Vercel, in-memory state, no DB.                                                                                | V0 is one demo, one case; persistence adds work without changing the recording.                                                              |
| 2026-06-06 | Both calls in Hindi; older male sender, female recipient; both agents male.                                                            | Matches the case. Both agents male keeps voice casting tight and authentic for an Indian customer-support persona; Hindi quality is the hardest, most demo-able part of the build. |
| 2026-06-06 | Agents created via API in `scripts/setup-elevenlabs.mjs`, not in the ElevenLabs dashboard UI.                                          | Reproducible across rebuilds; prompts live in version control alongside the rest of the app.                                                 |
| 2026-06-06 | Browser uses signed URLs minted by a Next.js API route; API key stays server-side.                                                     | Safe to deploy publicly; key never reaches the client.                                                                                       |
| 2026-06-06 | Static SVG mockup for the pin vs landmark mismatch; no real maps API.                                                                  | Avoids a maps API dependency; visually intentional; faster to ship.                                                                          |
| 2026-06-06 | Sender voice = NJ (`iVOyIHSsWJ9SEmfuJOud`); Receiver voice = Krishna (`iB2rIwm9cQCRGWoKDRtX`). Both from the ElevenLabs shared library. | NJ reads as calm, clear, professional middle-aged male; Krishna reads as natural, human-like young male. Both standard-Hindi accent, distinct in age and timbre. |
| 2026-06-06 | Demo failure path is a button (`Force Callback`), not auto-detected.                                                                   | V0 has no automated confidence detection; the operator controls failure live, which is more reliable for the recorded take.                  |
| 2026-06-06 | Hardcoded case values: Ramesh Sharma (sender), Sunita Sharma (recipient), House 142, ₹450 for Amul 1 kg, Haldiram substitute at ₹430.   | Specific enough to sound real; verified for narrative consistency with the build plan and product plan.                                      |
| 2026-06-06 | Three landmarks near Pannadhay Circle picked as best effort; flagged for sanity check before recording.                                | Demo agent says them on the call; wrong landmarks would break credibility but blocking the build on this is unnecessary.                     |
| 2026-06-06 | Single generic Standard session-start prompt at the top of this file replaces per-slice prompts.                                       | The plan plus the implementation log carry all per-slice context; one prompt is enough to drive any slice.                                   |
| 2026-06-06 | Slice 2 Half A (voice add + agent creation) done in the planning session, before slice 1.                                              | User asked to provision the ElevenLabs project up front, in parallel with slice 1's frontend work; agents now exist regardless of slice order. |

When a decision changes, add a new row with the new date, the new
decision, and a brief "supersedes row N" note. Do not delete old rows;
they are useful history.

---

## 15. Implementation log (APPEND-ONLY)

This section is the running record of what each session actually did.
Every session that touches the repo must append one entry here before
ending. Do not edit prior entries.

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

### Session 2026-06-06, slice 0 + slice 2 Half A (plan + ElevenLabs provisioning)

**Operator:** Claude (claude-opus-4-7)

**Slice exit criterion met?**
- Slice 0: Partial. Plan is rewritten (this file). `docs/sdk-notes.md`
  is not yet written; that is the remaining piece of slice 0 and
  should be done before slice 3 wires the SDK.
- Slice 2 Half A: Yes. Both voices added to the account; both agents
  created via API; `.env.local` populated with all four IDs.
- Slice 2 Half B: Not started. Signed-URL API route is still pending
  and is gated on slice 1 (Next.js scaffold).

**Files added or changed:**
- `pinpoint-build-plan.md` (rewritten from scratch): both agents are
  now male; added Standard session-start prompt at the top; added
  generic-prompt convention; updated Section 6 voice = NJ; updated
  Section 7 voice = Krishna; updated `scripts/` filename to
  `setup-elevenlabs.mjs`; updated Section 12 slice 2 to reflect that
  Half A is done; added rows to the decisions log.
- `.env.local` (added): contains `ELEVENLABS_API_KEY` (from
  `Buildathon keys.rtf`) plus auto-populated voice and agent IDs.
- `scripts/setup-elevenlabs.mjs` (added): probes the account, lists
  premade and shared voices, adds the two chosen shared voices, and
  creates or updates the two agents. Modes: `--probe` (default,
  shows premade voices + account info), `--shared` (lists shared
  Hindi male voices), `--bootstrap` (adds picks + creates agents in
  one go), `--create` (idempotent PATCH or POST of agents only;
  used when re-running after prompt edits).

**Plan changes (if any):**
- Section 6: voice changed from female to NJ (male, middle-aged,
  calm/clear/confident).
- Section 7: voice changed from female to Krishna (male, young,
  natural human-like).
- Section 10: script renamed `scripts/create-agents.ts` ->
  `scripts/setup-elevenlabs.mjs` (ESM, runs with Node's
  `--env-file`).
- Section 11: voice IDs are now also auto-populated by the script,
  not manually picked.
- Section 12 slice 2: split into Half A (done in this session) and
  Half B (pending, gated on slice 1).
- Section 14: new rows for both-male decision, the voice picks, the
  generic prompt convention, and the early Half A execution.
- Added a "Standard session-start prompt" box at the top of the
  document, replacing the per-slice prompts that previously lived in
  chat.

**Gotchas for the next session:**
- The setup script is fully idempotent: `--bootstrap` skips the
  voice-add step if voice IDs are already in `.env.local`, and
  `--create` PATCHes existing agents instead of creating duplicates.
  So slice 5's prompt iteration loop is: edit the prompt in
  `scripts/setup-elevenlabs.mjs`, run `--create`, rehearse.
- The script uses `tts.model_id: "eleven_turbo_v2_5"`,
  `conversation_config.agent.language: "hi"`, and
  `conversation_config.agent.first_message`. These are the field
  names that worked as of this session. If a future change breaks
  agent creation or updates, re-read the ElevenLabs Conv AI docs and
  update `scripts/setup-elevenlabs.mjs` plus `docs/sdk-notes.md`
  (when it exists).
- The three values in `caseContext.nearbyLandmarks` (Pratapnagar
  Stadium, Sector 7 Market, B2 Bypass) are best-effort picks for
  Jaipur's Pannadhay Circle. Before the recorded run in slice 5,
  sanity-check them on a real Jaipur map; if any are wrong, edit
  `lib/case.ts` (created in slice 1) and re-run
  `scripts/setup-elevenlabs.mjs --create`.
- The `Buildathon keys.rtf` is shared with another buildathon demo (a
  patient-discharge follow-up). Only `ELEVENLABS_API_KEY` is used for
  Pinpoint. The pre-existing `ELEVENLABS_AGENT_ID` in that file
  belongs to that other demo and must not be reused; the two new
  Pinpoint agents are in `.env.local`.
- Account tier is Creator. Voice slots used: 2 of 30. Character cap:
  126,000 (15,299 used at the start of this session, before any
  agent calls). Conversational AI minutes are billed separately;
  budget for ~30 to 60 minutes of rehearsal calls across slices 3
  through 5.

**Next slice to start:** slice 0 continued (write `docs/sdk-notes.md`)
in parallel with slice 1 (Next.js scaffold + dashboard shell). They do
not block each other.
