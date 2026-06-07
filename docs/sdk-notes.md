# ElevenLabs Conversational AI SDK notes (Pinpoint V0)

> This file is the canonical reference for the exact ElevenLabs field
> names, endpoint paths, and SDK call shapes that Pinpoint V0 depends on.
> If the SDK or the docs change in a way that breaks our integration,
> update this file in the same PR and log the change in
> `docs/build-log.md` section 15.
>
> All sources are linked at the bottom. Pulled from the live docs on
> 2026-06-06. The product was rebranded "Conversational AI" -> "ElevenAgents"
> in early 2026; the REST path prefix is still `/v1/convai/...` and the SDK
> still exports a class called `Conversation`.

## 0. Naming and packages

| Concept                | Use this (current)               | Legacy alias (deprecated)   |
| ---------------------- | -------------------------------- | --------------------------- |
| npm, vanilla JS/TS     | `@elevenlabs/client`             | `@11labs/client`            |
| npm, React             | `@elevenlabs/react`              | `@11labs/react`             |
| Server SDK, TypeScript | `@elevenlabs/elevenlabs-js`      | `elevenlabs`                |
| REST path prefix       | `/v1/convai/...` (unchanged)     | (same)                      |

For Pinpoint V0 we use **`@elevenlabs/client`** (vanilla, not the React
wrapper). The whole app is one page; we do not need a context provider.

Casing convention:
- **Raw REST + WebSocket protocol:** `snake_case`
  (`conversation_config`, `voice_id`, `signed_url`, `dynamic_variables`).
- **Browser SDK options:** `camelCase`
  (`dynamicVariables`, `signedUrl`, `voiceId`). The SDK does the
  translation. Get this wrong and the field is silently ignored.

## 1. Browser-side session-start call

Vanilla JS, what we will use in `lib/elevenlabs.ts`:

```ts
import { Conversation } from "@elevenlabs/client";

const conversation = await Conversation.startSession({
  signedUrl,                         // from our /api/signed-url route
  dynamicVariables: { /* ... */ },   // see section 2
  onConnect: ({ conversationId }) => { /* status -> IN_CALL */ },
  onDisconnect: (details) => { /* status -> DONE or CALLBACK */ },
  onError: (msg, ctx) => { /* log */ },
});

// Returned instance:
await conversation.endSession();      // we call this on Force Callback
conversation.getId();                  // conversation_id string
```

Auth: pass **exactly one** of these three at the top level:
- `signedUrl: string`           -- WebSocket transport (what we use).
- `conversationToken: string`   -- WebRTC transport.
- `agentId: string`             -- public agents only; ours are private.

Other options we may use:
- `dynamicVariables: Record<string, string | number | boolean>`
- `clientTools` (not needed in V0)
- `overrides` (not needed in V0; see 2c)

Important methods on the returned `conversation`:
- `endSession()`     -- we call this when the operator clicks Force
                        Callback to cut the call.
- `getId()`          -- handy for logging which call ended.

We do not need `setVolume`, mic device switching, text-only mode, or
feedback in V0.

## 2. Dynamic variables (filling `{{double_curly}}` placeholders)

The prompts in `scripts/setup-elevenlabs.mjs` already use
`{{sender_name}}`, `{{address_landmark}}`, `{{nearby_landmarks}}`, etc.
These are filled at session start.

Pass them as the **`dynamicVariables`** option (camelCase in JS, the SDK
translates to `dynamic_variables` on the wire):

```ts
await Conversation.startSession({
  signedUrl,
  dynamicVariables: {
    sender_name: caseContext.sender.name,
    recipient_name: caseContext.recipient.name,
    recipient_relation: caseContext.recipient.relation,
    items: caseContext.order.items.join(", "),
    amount: caseContext.order.amount,
    address_house_no: caseContext.address.houseNo,
    address_landmark: caseContext.address.landmark,
    address_area: caseContext.address.area,
    address_city: caseContext.address.city,
    issue_summary: caseContext.issue,
    nearby_landmarks: caseContext.nearbyLandmarks.join(", "),
    substitute_text: caseContext.orderEdit.substitute,
    alt_if_asked_text: caseContext.orderEdit.altIfAsked,
    order_edit_reason: caseContext.orderEdit.reason,
    // Agent 2 only -- harmless to pass on Agent 1 too:
    sender_phone_last5: caseContext.sender.phoneLast5,
  },
});
```

Rules:
- Values must be **string, number, or boolean only**. Objects and arrays
  are not allowed -- join arrays into a comma-separated string first
  (we already do this for `nearby_landmarks` and `items` above).
- The variable names here must match the `{{...}}` names in the prompts
  exactly. If you rename one place, rename the other.
- `system__*` variables (`system__conversation_id`, `system__time_utc`,
  etc.) are provided by the platform and cannot be set or overridden by
  us.

### 2a. Overrides (not used in V0, but documented in case)

`overrides` is a **different** option from `dynamicVariables`. It
replaces parts of the static config (prompt, voice id, language, first
message) for a single session. Overrides require the agent's dashboard
Security tab to whitelist each overrideable field; otherwise the
override is silently ignored. We do not need overrides; our two agents
are pre-built per role, and per-case values flow through dynamic
variables.

### 2b. Wire format (for debugging if a variable does not land)

The SDK's first WebSocket message is:

```json
{
  "type": "conversation_initiation_client_data",
  "dynamic_variables": { "sender_name": "Ramesh Sharma", "amount": 450 }
}
```

If a `{{placeholder}}` shows up literally in the agent's speech, check
the browser DevTools WS frame for this exact message and confirm the
snake_case key is present.

## 3. Conversation-end callback

The callback is named **`onDisconnect`**. There is no `onEnd`, no
`onClose`, no event-emitter style. It fires on any termination cause:
operator called `endSession()`, network drop, server close, signed-URL
expiry mid-stream.

```ts
onDisconnect: (details?: { reason?: string; code?: number }) => {
  // V0: just advance status. We do not branch on `details`.
}
```

Type the arg defensively as optional. The docs sometimes describe a
`{ reason, code }` shape but the official sample calls it with no arg.

Pinpoint V0 wiring:
- Agent 1 in call -- `onDisconnect` fires -- status -> AGENT1_DONE.
- Agent 2 in call -- `onDisconnect` fires -- status -> RESOLVED.
- Force Callback clicked at any time -- we call `endSession()`
  ourselves and set status -> CALLBACK_SCHEDULED **before** the
  resulting `onDisconnect` fires. Guard against the callback then
  re-overwriting the status (e.g. set a `forcedCallback` ref and skip
  the status update in that branch).

Related signals (we do not need them in V0 but worth knowing):
- `onConnect({ conversationId })` -- fired once on successful open.
- `onStatusChange({ status })` -- `connecting | connected |
  disconnecting | disconnected`.
- `onError(message, context?)` -- not mutually exclusive with
  `onDisconnect`; if an error fires we should also expect a disconnect.
- `onMessage({ message, source })` -- streaming transcripts; not
  rendered in V0.

## 4. Signed-URL HTTP endpoint

Used server-side by `app/api/signed-url/route.ts` to mint a per-session
URL that the browser opens directly. The API key never reaches the
browser.

- **Method + URL:**
  `GET https://api.elevenlabs.io/v1/convai/conversation/get-signed-url`
- **Auth header:** `xi-api-key: <ELEVENLABS_API_KEY>` (server only).
- **Query params:**
  - `agent_id` (required) -- the `agent_...` id from `.env.local`.
  - `include_conversation_id` (optional, default `false`).
  - `branch_id`, `environment` (optional; not used in V0).
- **Response 200 JSON:** `{ "signed_url": "wss://..." }`.
  The field name is exactly **`signed_url`** (snake_case), not
  `signedUrl`, not `url`.
- **Expiry:** **15 minutes from issuance.** The session, once
  initiated, can run longer; only the URL itself expires. Mint a fresh
  URL per click.
- **Security:** the URL embeds a `conversation_signature` query param;
  treat it as a bearer credential. Do not log it.

Reference handler for `app/api/signed-url/route.ts`:

```ts
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get("agent");
  const agentId =
    role === "sender"
      ? process.env.PINPOINT_SENDER_AGENT_ID
      : role === "receiver"
        ? process.env.PINPOINT_RECEIVER_AGENT_ID
        : null;
  if (!agentId) {
    return new Response(
      JSON.stringify({ error: "agent must be sender or receiver" }),
      { status: 400 },
    );
  }

  const url = new URL(
    "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url",
  );
  url.searchParams.set("agent_id", agentId);

  const r = await fetch(url, {
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
    cache: "no-store",
  });
  if (!r.ok) {
    return new Response(
      JSON.stringify({ error: "upstream signed-url failed" }),
      { status: 502 },
    );
  }
  const { signed_url } = (await r.json()) as { signed_url: string };
  return Response.json({ signedUrl: signed_url });
}
```

Note we normalise the response to camelCase on the way out
(`signedUrl`) so the browser code stays JS-idiomatic.

### 4a. WebRTC token endpoint (not used in V0)

For reference only -- if we ever switch to WebRTC:
- `GET /v1/convai/conversation/token?agent_id=...`
- Response: `{ "token": "..." }` -- pass to the SDK as
  `conversationToken`, not `signedUrl`.

## 5. Agent-creation HTTP endpoint

Used by `scripts/setup-elevenlabs.mjs --bootstrap` to create both
agents the first time. The body shape below is what the script already
sends; this section is the spec we are matching against.

- **Method + URL:** `POST https://api.elevenlabs.io/v1/convai/agents/create`
- **Auth:** `xi-api-key`.
- **Content-Type:** `application/json`.

### Request body (only fields Pinpoint uses)

```json
{
  "name": "Pinpoint Sender (Hindi)",
  "conversation_config": {
    "agent": {
      "language": "hi",
      "first_message": "Namaste, main Blinkit se bol raha hoon. Aap {{sender_name}} ji?",
      "prompt": {
        "prompt": "<full English-with-Hindi-examples system prompt>"
      }
    },
    "tts": {
      "voice_id": "iVOyIHSsWJ9SEmfuJOud",
      "model_id": "eleven_turbo_v2_5"
    },
    "asr": { "quality": "high" },
    "turn": { "turn_timeout": 8 }
  }
}
```

Field-by-field, the exact JSON paths (these are the ones to grep for if
field-name churn ever breaks the script):

| What                | JSON path                                    |
| ------------------- | -------------------------------------------- |
| Agent name          | `name`                                       |
| Language (ISO 639-1)| `conversation_config.agent.language`         |
| First message       | `conversation_config.agent.first_message`    |
| System prompt       | `conversation_config.agent.prompt.prompt`    |
| LLM (optional)      | `conversation_config.agent.prompt.llm`       |
| Voice ID            | `conversation_config.tts.voice_id`           |
| TTS model           | `conversation_config.tts.model_id`           |
| ASR quality         | `conversation_config.asr.quality`            |
| Turn timeout (sec)  | `conversation_config.turn.turn_timeout`      |

Schema gotcha to ignore: the OpenAPI schema names a model
`AgentConfigAPIModel`, which makes it look like the top-level key is
`agent_config`. It is **not**. The actual JSON path is
`conversation_config.agent`. Trust working curl examples, not the
internal Pydantic class names.

### Response 200

```json
{ "agent_id": "agent_xxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
```

The id always starts with `agent_`. Our script writes it into
`.env.local` as `PINPOINT_SENDER_AGENT_ID` or
`PINPOINT_RECEIVER_AGENT_ID`.

### TTS model choice

The script currently uses `eleven_turbo_v2_5`. Valid alternatives,
roughly in order of lower latency first:

- `eleven_flash_v2_5` -- lowest latency; ElevenLabs recommends this
  for live voice agents now. Worth A/B-testing against turbo in
  slice 5 if Hindi quality is comparable.
- `eleven_flash_v2`
- `eleven_turbo_v2_5` -- what we use today.
- `eleven_turbo_v2`
- `eleven_multilingual_v2` -- slower; better expressive range.
- `eleven_v3_conversational` -- newest, more expressive, higher
  latency.

If we change this, edit `scripts/setup-elevenlabs.mjs`, re-run
`--create`, and re-rehearse.

### Language

`"hi"` is the two-letter ISO 639-1 code for Hindi. Fully supported.

## 6. Agent-update (PATCH) endpoint

Used by `scripts/setup-elevenlabs.mjs --create` when an agent already
exists, so slice 5's prompt iteration loop does not create duplicates.

- **Method + URL:** `PATCH https://api.elevenlabs.io/v1/convai/agents/{agent_id}`
- **Path param:** `agent_id` (required).
- **Auth:** `xi-api-key`.
- **Body shape:** identical structure to the create body, but every
  field is optional and PATCH semantics apply -- only send the fields
  you want to change. We currently send the full body for simplicity
  (overwriting prompt + first_message + voice + tts model in one go);
  that is fine.
- **Response 200:** the full updated agent config (`GetAgentResponseModel`).
  Convenient -- no follow-up GET needed.

Query-param gotcha: `enable_versioning_if_not_enabled` is deprecated
and ignored. All agents are versioned automatically as of early 2026.
Every PATCH internally creates a new version; the new `branch_id`
query param can target a specific branch but we do not use it.

## 7. Things to update here if they change

This section lists what to grep for if a future SDK or API change
breaks Pinpoint. Edit this file in place when any of them change.

- npm package name: `@elevenlabs/client` (search for it in
  `package.json` and `lib/elevenlabs.ts`).
- Import path: `import { Conversation } from "@elevenlabs/client"`.
- SDK entry point: `Conversation.startSession({ ... })`.
- Auth field on `startSession`: `signedUrl` (string).
- Dynamic-variable option: `dynamicVariables` (camelCase) -- the
  agent prompts use `{{snake_case}}` keys inside.
- End callback name: `onDisconnect`.
- Signed-URL REST path:
  `/v1/convai/conversation/get-signed-url?agent_id=...`.
- Signed-URL response field: `signed_url`.
- Agent-create REST path: `/v1/convai/agents/create`.
- Agent-update REST path: `PATCH /v1/convai/agents/{agent_id}`.
- Prompt JSON path: `conversation_config.agent.prompt.prompt`.
- Voice JSON path: `conversation_config.tts.voice_id`.
- TTS model JSON path: `conversation_config.tts.model_id`.

## Sources (pulled 2026-06-06)

- https://elevenlabs.io/docs/eleven-agents/overview
- https://elevenlabs.io/docs/eleven-agents/libraries/java-script
- https://elevenlabs.io/docs/eleven-agents/libraries/react
- https://elevenlabs.io/docs/agents-platform/customization/personalization/dynamic-variables
- https://elevenlabs.io/docs/agents-platform/customization/personalization/overrides
- https://elevenlabs.io/docs/api-reference/conversations/get-signed-url
- https://elevenlabs.io/docs/api-reference/conversations/get-webrtc-token
- https://elevenlabs.io/docs/api-reference/agents/create
- https://elevenlabs.io/docs/api-reference/agents/update
- https://elevenlabs.io/docs/agents-platform/api-reference/agents-platform/websocket
- https://github.com/elevenlabs/packages/blob/main/packages/client/README.md
- https://github.com/elevenlabs/packages/blob/main/packages/react/README.md
- https://www.npmjs.com/package/@elevenlabs/client
- https://www.npmjs.com/package/@elevenlabs/react
