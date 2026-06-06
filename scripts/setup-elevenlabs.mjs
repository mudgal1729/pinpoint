// Probes the ElevenLabs account and lists premade voices.
// Step 1 of two: confirm API key works, see what voices are available, pick
// two male Hindi-capable voices, then run with --create to build the agents.
//
// Usage:
//   node --env-file=.env.local scripts/setup-elevenlabs.mjs
//   node --env-file=.env.local scripts/setup-elevenlabs.mjs --create
//
// On --create:
//   - reads PINPOINT_SENDER_VOICE_ID and PINPOINT_RECEIVER_VOICE_ID from env
//   - creates two agents via /v1/convai/agents/create
//   - writes their IDs back into .env.local in place (idempotent)

import { readFile, writeFile } from "node:fs/promises";

const API = "https://api.elevenlabs.io/v1";
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error("ELEVENLABS_API_KEY not set. Run with --env-file=.env.local");
  process.exit(1);
}

const H = { "xi-api-key": KEY, "Content-Type": "application/json" };

async function get(path) {
  const r = await fetch(API + path, { headers: H });
  if (!r.ok) throw new Error(`GET ${path} -> ${r.status} ${await r.text()}`);
  return r.json();
}

async function post(path, body) {
  const r = await fetch(API + path, {
    method: "POST",
    headers: H,
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`POST ${path} -> ${r.status} ${await r.text()}`);
  return r.json();
}

async function patch(path, body) {
  const r = await fetch(API + path, {
    method: "PATCH",
    headers: H,
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`PATCH ${path} -> ${r.status} ${await r.text()}`);
  return r.json();
}

function senderPrompt() {
  // English instructions with Hindi sample turns so the model has voice.
  // Dynamic variables in {{double_curly}} are filled in by the SDK at session
  // start with values from caseContext (lib/case.ts).
  return `You are a male Blinkit customer-support assistant calling {{sender_name}} on the phone, in Hindi, because the delivery location for his order is unclear. He is in his 50s, so be warm, brief, clear, polite (use "aap", never "tum"), and measured in pace. Let him interrupt; do not rush.

You already know his order and his typed address. You are confirming, not interrogating.

THE SITUATION YOU MUST EXPLAIN, GENTLY:
The typed address ({{address_house_no}}, near {{address_landmark}}, {{address_area}}, {{address_city}}) is correct, but the dropped map pin sits about 2 km away near Pratapnagar Sector 6, far from {{address_landmark}}.

YOUR GOALS, IN ORDER:

Goal 1: Confirm the delivery address.
- Greet politely, introduce yourself as calling from Blinkit about his order of {{items}}.
- Explain the pin-versus-landmark issue gently. Do not blame him.
- Confirm the house number ({{address_house_no}}) and the landmark ({{address_landmark}}).
- To be sure it is the right {{address_landmark}}, mention one or two of these nearby landmarks and ask him to confirm any of them: {{nearby_landmarks}}.
- Then ask if he knows the route from {{address_landmark}} to the house.

Goal 2: Confirm the order edit.
- Explain that the corrected location is served by a different store, and there the {{items}} is not available.
- Offer the substitute: {{substitute_text}}.
- Ask if that is okay.
- If he hesitates or asks for another option, offer: {{alt_if_asked_text}}.
- Confirm whichever he picks.

CLOSE: thank him; confirm the address and the order edit are set; let him know the order is being arranged.

HANDLING NOTES:
- If he says the pin is wrong or does not understand what a pin is: reassure him; the typed address is right; you just need the landmark and the route confirmed.
- Nearby-landmark cross-check: if he confirms any one of {{nearby_landmarks}}, treat {{address_landmark}} as correct and move on.
- Substitution objection: if he hesitates on Haldiram, offer the 2 x 500 g packs of the same Amul item; if he still hesitates after that, keep it simple, apologise, say someone from the team will call him shortly, and end.
- Failure path: if he is confused after a couple of tries or the line is bad, politely say someone from the team will call him shortly, then end.

HINDI VOICE EXAMPLES (use this register; do not copy verbatim):
- Opening: "Namaste {{sender_name}} ji, main Blinkit se bol raha hoon. Aapka order place hua tha {{items}} ka, uske baare mein ek chhoti si baat confirm karni thi."
- Pin explanation: "Aapne address bilkul sahi diya hai, lekin map par pin thoda door gir gaya hai, lagbhag 2 kilometre door {{address_landmark}} se. Toh main bas yeh confirm karna chahta hoon ki delivery {{address_landmark}} ke paas hi karni hai, theek?"
- Landmark cross-check: "Aas-paas {{nearby_landmarks}} mein se kuch dikhta hai aapko? Bas confirm karne ke liye ki yeh wahi {{address_landmark}} hai."
- Substitution: "Ek choti si baat aur. Aapke area mein jo store deliver karega, wahaan {{items}} abhi available nahi hai. Iske badle {{substitute_text}}, kya yeh theek rahega aapke liye?"
- Close: "Bahut shukriya. Aapka address aur order edit dono confirm ho gaya. Order jaldi pahunchayenge."

Keep turns short. Acknowledge with quick words ("achha", "theek hai", "samajh gaya"). Never robotically repeat the full address back; trust that he heard it.`;
}

function receiverPrompt() {
  return `You are a male Blinkit customer-support assistant calling {{recipient_name}} on the phone, in Hindi, to confirm exactly how to reach her house. A gift delivery is on its way to her. She is not expecting this call, so your opening must be reassuring, not alarming. Be warm, brief, polite (use "aap", never "tum"), and natural.

You already know that the delivery is going to House No. {{address_house_no}}, near {{address_landmark}}, {{address_area}}, {{address_city}}. The sender is the one who placed and paid for the order; the sender's identity must be protected per the rule below.

YOUR GOALS, IN ORDER:

Goal 1: Greet, reassure, set context.
- Polite greeting. Introduce yourself as calling from Blinkit.
- Let her know a gift delivery is on its way to her at her house.
- Say you are calling only to confirm exactly how to reach the house, so the delivery partner does not get lost.

Goal 2: Confirm the route and the door.
- Confirm she lives near {{address_landmark}}.
- Ask her to describe the route from {{address_landmark}} to her house: which lane to take off the circle, how far, any turns.
- Then ask her to describe how to identify the house itself: gate colour, floor number, any visible marker, name on the door, anything that helps a delivery partner who has never been there.

IDENTITY-PROTECTION RULE (very important, follow exactly):
- Do NOT say who sent the gift. If she does not ask, do not bring it up.
- If she asks who sent it, decline politely: "Yeh information private hai, main share nahi kar sakta. Bas yeh confirm kar lijiye ki gift aapke liye hi hai." Continue with the route confirmation.
- ONLY if she insists a second time and explicitly says she will not confirm the route without knowing who, share the last 5 digits of the sender's phone number, and nothing else: "Main aapko sender ka naam to nahi bata sakta, lekin unka phone number {{sender_phone_last5}} pe khatam hota hai. Iske aage main kuch share nahi kar sakta."
- Never share the sender's name, relation, or city. Never confirm or deny relationships.

CLOSE: thank her; confirm the route is noted; tell her the order is on the way.

HANDLING NOTES:
- Opening must be reassuring. She did not expect this call; she might be suspicious. Make it clear quickly that it is just a delivery confirmation.
- House identification: keep pushing politely for concrete physical markers. "Achha, gate ka colour kya hai? Aas-paas koi shop hai jo dikhta hai?"
- Failure path: if she cannot describe it or the line is bad after a couple of tries, politely say someone will call her shortly, and end.

HINDI VOICE EXAMPLES (register and tone; do not copy verbatim):
- Opening: "Namaste {{recipient_name}} ji, main Blinkit se bol raha hoon. Aapke liye ek gift delivery aa rahi hai aaj. Main bas yeh confirm karna chahta hoon ki ghar tak pahunchne ka raasta clear ho, koi confusion na ho."
- Route ask: "Aap {{address_landmark}} ke paas rehti hain na? Wahaan se ghar tak ka raasta thoda bata dijiye, kaunsi gali leni hai?"
- House marker ask: "Aapke ghar ko pehchanne ke liye koi marker hai? Gate ka colour, ya kaunse floor par hai aapka ghar?"
- Identity refusal (first time): "Maaf kijiye, yeh information main share nahi kar sakta. Yeh aapke liye hi gift hai, bas itna confirm kar dijiye."
- Identity refusal (insists, second time): "Main sender ka naam to share nahi kar sakta. Bas itna bata sakta hoon ki unka number {{sender_phone_last5}} pe khatam hota hai. Iske aage kuch share nahi kar sakta."
- Close: "Bahut shukriya. Aapka raasta note kar liya, order jaldi pahunch jayega."

Keep turns short. Trust she heard you the first time; do not repeat.`;
}

const FIRST_MSG_SENDER =
  "Namaste, main Blinkit se bol raha hoon. Aap {{sender_name}} ji?";
const FIRST_MSG_RECEIVER =
  "Namaste, main Blinkit se bol raha hoon. Aap {{recipient_name}} ji?";

function agentBody(role) {
  const voiceId =
    role === "sender"
      ? process.env.PINPOINT_SENDER_VOICE_ID
      : process.env.PINPOINT_RECEIVER_VOICE_ID;
  if (!voiceId) throw new Error(`Voice ID for ${role} not set in .env.local`);

  const name =
    role === "sender" ? "Pinpoint Sender (Hindi)" : "Pinpoint Receiver (Hindi)";
  const prompt = role === "sender" ? senderPrompt() : receiverPrompt();
  const firstMessage =
    role === "sender" ? FIRST_MSG_SENDER : FIRST_MSG_RECEIVER;

  return {
    name,
    conversation_config: {
      agent: {
        language: "hi",
        first_message: firstMessage,
        prompt: {
          prompt,
        },
      },
      tts: {
        voice_id: voiceId,
        model_id: "eleven_turbo_v2_5",
      },
      asr: {
        quality: "high",
      },
      turn: {
        turn_timeout: 8,
      },
    },
  };
}

async function listPremadeVoices() {
  const data = await get("/voices");
  const voices = data.voices || [];
  return voices.map((v) => ({
    voice_id: v.voice_id,
    name: v.name,
    category: v.category,
    labels: v.labels || {},
    description: v.description,
  }));
}

function fmtVoice(v) {
  const gender = v.labels?.gender || "?";
  const accent = v.labels?.accent || "?";
  const desc = (v.labels?.description || v.description || "").slice(0, 60);
  return `  ${v.voice_id}  ${v.name.padEnd(20)}  gender=${gender.padEnd(7)} accent=${accent.padEnd(15)}  ${desc}`;
}

async function writeAgentIdsToEnv(senderId, receiverId) {
  const path = ".env.local";
  let content = await readFile(path, "utf8");
  content = content.replace(
    /^PINPOINT_SENDER_AGENT_ID=.*/m,
    `PINPOINT_SENDER_AGENT_ID=${senderId}`,
  );
  content = content.replace(
    /^PINPOINT_RECEIVER_AGENT_ID=.*/m,
    `PINPOINT_RECEIVER_AGENT_ID=${receiverId}`,
  );
  await writeFile(path, content, "utf8");
}

async function probe() {
  console.log("--- ElevenLabs probe ---");

  let sub;
  try {
    sub = await get("/user/subscription");
  } catch (e) {
    console.error("Subscription fetch failed:", e.message);
    process.exit(1);
  }
  console.log(`Account tier:           ${sub.tier}`);
  console.log(`Characters used / cap:  ${sub.character_count} / ${sub.character_limit}`);
  console.log(`Voices used / cap:      ${sub.voice_slots_used ?? "?"} / ${sub.voice_limit ?? "?"}`);
  console.log(`Pro voice limit:        ${sub.professional_voice_limit ?? "?"}`);
  console.log();

  const voices = await listPremadeVoices();
  const male = voices.filter(
    (v) => (v.labels?.gender || "").toLowerCase() === "male",
  );
  console.log(`Voices in account: ${voices.length} total, ${male.length} male`);
  console.log("Male voices:");
  male.forEach((v) => console.log(fmtVoice(v)));
  console.log();

  // Surface anything tagged Indian / Hindi for easy spotting.
  const indianish = voices.filter((v) => {
    const blob = JSON.stringify(v.labels || {}).toLowerCase() + " " + (v.description || "").toLowerCase();
    return blob.includes("indian") || blob.includes("hindi") || blob.includes("india");
  });
  if (indianish.length) {
    console.log("Voices tagged Indian/Hindi/India:");
    indianish.forEach((v) => console.log(fmtVoice(v)));
    console.log();
  }

  console.log("Pick two MALE voice IDs, paste into .env.local as");
  console.log("  PINPOINT_SENDER_VOICE_ID=<id>");
  console.log("  PINPOINT_RECEIVER_VOICE_ID=<id>");
  console.log("Then re-run with --create.");
}

async function create() {
  const senderVoice = process.env.PINPOINT_SENDER_VOICE_ID;
  const receiverVoice = process.env.PINPOINT_RECEIVER_VOICE_ID;
  if (!senderVoice || !receiverVoice) {
    console.error("Voice IDs not set in .env.local. Run probe first.");
    process.exit(1);
  }

  const existingSender = process.env.PINPOINT_SENDER_AGENT_ID;
  const existingReceiver = process.env.PINPOINT_RECEIVER_AGENT_ID;

  let senderId = existingSender;
  let receiverId = existingReceiver;

  if (senderId) {
    console.log(`Updating existing sender agent ${senderId}...`);
    await patch(`/convai/agents/${senderId}`, agentBody("sender"));
  } else {
    console.log("Creating sender agent...");
    const r = await post("/convai/agents/create", agentBody("sender"));
    senderId = r.agent_id;
    console.log(`  -> ${senderId}`);
  }

  if (receiverId) {
    console.log(`Updating existing receiver agent ${receiverId}...`);
    await patch(`/convai/agents/${receiverId}`, agentBody("receiver"));
  } else {
    console.log("Creating receiver agent...");
    const r = await post("/convai/agents/create", agentBody("receiver"));
    receiverId = r.agent_id;
    console.log(`  -> ${receiverId}`);
  }

  await writeAgentIdsToEnv(senderId, receiverId);
  console.log("\n.env.local updated. Agents ready.");
}

async function searchShared() {
  const params = new URLSearchParams({
    gender: "male",
    language: "hi",
    page_size: "30",
  });
  const data = await get(`/shared-voices?${params}`);
  const voices = data.voices || [];
  console.log(`Shared voices matching gender=male language=hi: ${voices.length}`);
  voices.forEach((v) => {
    const accent = v.accent || v.labels?.accent || "?";
    const age = v.age || v.labels?.age || "?";
    const desc = (v.description || "").slice(0, 80);
    console.log(
      `  ${v.voice_id}  ${(v.name || "").padEnd(22)} accent=${accent.padEnd(12)} age=${age.padEnd(10)} liked=${v.cloned_by_count ?? "?"}  ${desc}`,
    );
  });
}

async function addShared(publicOwnerId, voiceId, newName) {
  const r = await post(`/voices/add/${publicOwnerId}/${voiceId}`, {
    new_name: newName,
  });
  console.log(`Added shared voice ${voiceId} -> account voice ${r.voice_id}`);
  return r.voice_id;
}

async function lookupSharedOwner(voiceId) {
  // Filter same way searchShared does (filters are sticky on this endpoint).
  const params = new URLSearchParams({
    gender: "male",
    language: "hi",
    page_size: "100",
  });
  const data = await get(`/shared-voices?${params}`);
  const hit = (data.voices || []).find((v) => v.voice_id === voiceId);
  if (!hit) {
    const sample = (data.voices || [])
      .slice(0, 3)
      .map((v) => `${v.voice_id} (keys: ${Object.keys(v).join(",")})`)
      .join("\n  ");
    throw new Error(
      `Could not find shared voice ${voiceId}. Sample voices returned:\n  ${sample}`,
    );
  }
  return hit.public_owner_id;
}

async function writeVoiceIdsToEnv(senderVoiceId, receiverVoiceId) {
  const path = ".env.local";
  let content = await readFile(path, "utf8");
  content = content.replace(
    /^PINPOINT_SENDER_VOICE_ID=.*/m,
    `PINPOINT_SENDER_VOICE_ID=${senderVoiceId}`,
  );
  content = content.replace(
    /^PINPOINT_RECEIVER_VOICE_ID=.*/m,
    `PINPOINT_RECEIVER_VOICE_ID=${receiverVoiceId}`,
  );
  await writeFile(path, content, "utf8");
}

// Hardcoded picks: chosen after auditing the shared-voices library for Hindi
// male voices with the right register. Swap the IDs here to re-pick.
const PICKS = {
  sender: {
    shared_voice_id: "iVOyIHSsWJ9SEmfuJOud", // NJ: calm, clear, confident, middle-aged
    new_name: "Pinpoint Sender (NJ)",
  },
  receiver: {
    shared_voice_id: "iB2rIwm9cQCRGWoKDRtX", // Krishna: natural human-like sales-agent, young
    new_name: "Pinpoint Receiver (Krishna)",
  },
};

async function bootstrap() {
  console.log("--- Bootstrap: add shared voices + create agents ---");

  // Skip add if env already has account voice IDs (idempotent).
  let senderVoiceId = process.env.PINPOINT_SENDER_VOICE_ID;
  let receiverVoiceId = process.env.PINPOINT_RECEIVER_VOICE_ID;

  if (!senderVoiceId) {
    console.log(`Looking up owner for ${PICKS.sender.shared_voice_id}...`);
    const owner = await lookupSharedOwner(PICKS.sender.shared_voice_id);
    senderVoiceId = await addShared(
      owner,
      PICKS.sender.shared_voice_id,
      PICKS.sender.new_name,
    );
  } else {
    console.log(`Sender voice already in env: ${senderVoiceId}`);
  }

  if (!receiverVoiceId) {
    console.log(`Looking up owner for ${PICKS.receiver.shared_voice_id}...`);
    const owner = await lookupSharedOwner(PICKS.receiver.shared_voice_id);
    receiverVoiceId = await addShared(
      owner,
      PICKS.receiver.shared_voice_id,
      PICKS.receiver.new_name,
    );
  } else {
    console.log(`Receiver voice already in env: ${receiverVoiceId}`);
  }

  await writeVoiceIdsToEnv(senderVoiceId, receiverVoiceId);
  console.log("Voice IDs written to .env.local");

  // Mutate process.env so create() picks up the new IDs in this same run.
  process.env.PINPOINT_SENDER_VOICE_ID = senderVoiceId;
  process.env.PINPOINT_RECEIVER_VOICE_ID = receiverVoiceId;

  await create();
}

const mode = process.argv.includes("--bootstrap")
  ? "bootstrap"
  : process.argv.includes("--create")
    ? "create"
    : process.argv.includes("--shared")
      ? "shared"
      : "probe";

if (mode === "bootstrap") {
  await bootstrap();
} else if (mode === "create") {
  await create();
} else if (mode === "shared") {
  await searchShared();
} else {
  await probe();
}
