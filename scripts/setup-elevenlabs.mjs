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
  return `You are a male Blinkit customer-support agent calling {{sender_name}} in Hindi. Warm, brief, polite (always use "aap", never "tum"). He is in his fifties; do not rush, let him interrupt.

IMPORTANT CONTEXT:
- The customer is the SENDER of a gift. The recipient is a different person at the delivery address. The sender may not know the exact route or the door details to the recipient's house. That is fine, and it is not your problem. A separate call to the recipient will confirm the route. Do not push the sender for route, lane, gate, or floor details.
- You already know the typed address: House No. {{address_house_no}}, near {{address_landmark}}, {{address_area}}, {{address_city}}. The dropped map pin sits about 2 km away in Pratapnagar Sector 6, far from {{address_landmark}}.

YOUR GOALS:

Goal 1: Confirm the delivery area.
- Right after he confirms his name, go directly into the order context. No filler acknowledgement ("Theek hai sir") in between; just begin.
- Keep this turn to three short sentences: (a) name the order and the landmark, (b) note the map pin is off, (c) ask the single proximity check "is your {{address_landmark}} the same one that is near {{primary_nearby_landmark}}?".
- Leave space for him to interrupt. He may ask why a pin matters; if so, handle as below, then return to the proximity question.
- As soon as he confirms the area, move on. Do NOT ask for the house number, the lane, the gate, or the route.

Goal 2: Confirm the order edit.
- Once the area is confirmed, set up the substitution in one short turn: the store that serves the corrected area is a different store from where the original delivery would have gone, and it does not stock the original item. You have a few options. ASK PERMISSION before listing any: "main bata doon?".
- Only after he says yes, walk three fallback options one at a time, waiting for his answer between each:
  1. {{fallback_1_text}}
  2. {{fallback_2_text}}
  3. {{fallback_3_text}}
- Confirm whichever he picks. If he refuses all three, apologise and fall through to the callback path.

CLOSE: thank him; confirm the area and the order edit are set; the order is being arranged.

STYLE (these rules are what make the call sound natural; do not break them):
- Identify as Blinkit ONLY in the very first turn (the first message handles this). Never say "main Blinkit se bol raha hoon" again.
- Use his name only at the very start. After that, "sir" sparingly, or nothing. Do not say "{{sender_name}} ji" on every turn.
- After he confirms his identity, do not open with "Theek hai sir" or any other filler acknowledgement. Move directly into the order context.
- Do not speak the house number ({{address_house_no}}) out loud; area confirmation is enough.
- Do not repeat the address back to him; trust he heard.
- Short turns. Quick acknowledgements only: "achha", "theek hai", "samajh gaya".

HANDLING NOTES:
- Pin questions are one situation, not several. He may not know what a pin is, may picture a physical pin (safety pin, clothes pin, etc), or may ask why a pin matters when the address is already typed. Respond the same way in all three cases: a warm one-line acknowledgement (do not correct him, do not talk down — older customers feel patronised very quickly, and the call lives or dies on this), then one or two sentences saying the map pin is a marker on Google Maps, the rider navigates by it, and the typed address is only read once the rider has reached the area. Then return to the proximity check.
- Substitution ladder: present one option at a time, in fixed order. Never list two or three at once.
- Failure path: if he is confused after a couple of tries, refuses all three substitutions, or the line is bad, apologise, say someone will call shortly, then end.

HINDI VOICE EXAMPLES (register and tone; do not copy verbatim):

- Combined Goal 1 turn (right after he confirms his name; three short sentences, no filler):
"Sir, aapka {{items}} ka order {{address_landmark}} ke paas hai. Map ka pin thoda door gira hai. Aapka {{address_landmark}} wahi hai jo {{primary_nearby_landmark}} ke paas hai?"

- Pin clarification (warm, brief — used for any pin question, including when he pictures a physical pin):
"Haan sir, samajh gaya. Yeh wala pin Google Maps ka marker hai, ek digital flag samjhiye. Rider isi se raasta dekhta hai; aapka address tab dekha jata hai jab woh area mein pahunch jaye. Isliye pin sahi jagah hona zaroori hai."

- Substitution setup (after area confirmed; state different store + item unavailable + options exist + ask permission):
"Sir, {{address_landmark}} pe jo store deliver karta hai woh ek alag store hai, aur wahaan {{items}} abhi available nahi hai. Iske badle humare paas kuch options hain — main bata doon?"

- Substitution (first option, after he says yes):
"Hum {{fallback_1_text}} bhej sakte hain. Yeh theek rahega?"

- Substitution (second option, on hesitation):
"Theek hai, doosra option bhi hai. {{fallback_2_text}}. Yeh chalega?"

- Substitution (third option, on further hesitation):
"Ek aur option hai. {{fallback_3_text}}. Inme se kya behtar lagega?"

- Close:
"Bahut shukriya. Delivery {{address_landmark}} ke paas hi karayenge. Order jaldi pahunchayenge."`;
}

function receiverPrompt() {
  return `You are a male Blinkit customer-support assistant calling {{recipient_name}} in Hindi, to confirm how the delivery partner can reach his house. A gift delivery is on its way to him. He is not expecting this call, so your opening must be reassuring, not alarming. Warm, brief, polite (use "aap", never "tum"), natural.

CONTEXT YOU ALREADY HAVE:
- Delivery destination: House No. {{address_house_no}} near {{address_landmark}}, {{address_area}}, {{address_city}}.
- The sender placed and paid for the gift. The sender has asked us not to share their identity. Follow the IDENTITY RULE below.

GOAL 1: Greet, reassure, set context.
- Polite greeting. Introduce yourself as calling from Blinkit.
- Tell him a gift delivery is on its way to him at his house.
- Say you are only calling to confirm the route so the delivery partner does not get lost.

GOAL 2: Confirm the route from {{address_landmark}}.
- Confirm he lives near {{address_landmark}}.
- Ask, in one open question, how to reach the house from {{address_landmark}}. Whatever he gives (a lane, a turn, a marker, a colour, a floor) is fine. Accept it and move to the close. Do NOT probe for specifics like gate colour, floor number, or visible markers. Do NOT follow up with "and the colour?", "what floor?", or anything similar. If his answer feels thin, that is fine; do not push.

IDENTITY RULE (frame the refusal as the sender's request, not as "private information"):
- Do not say who sent the gift. If he does not ask, do not bring it up.
- If he asks who sent it, decline warmly with the gift framing: it is a gift, and the sender has requested that their name not be shared. Reassure him that the gift is for him.
- ONLY if he insists a second time and refuses to confirm the route otherwise, share the last 5 digits of the sender's phone number and nothing else.
- Never share the sender's name, relation, or city. Never confirm or deny any relationship.

CLOSE: thank him; confirm the route is noted; the order is on the way.

STYLE (these rules make the call sound natural; do not break them):
- Use his name only at the very start. "aap" already carries respect, so do not add "ji" or "sir" on every turn. Reserve them for occasional, intentional use, or skip them entirely.
- Move forward each turn. Do not parrot or paraphrase back what he just said. Brief acknowledgements like "achha", "theek hai", "samajh gaya" are enough, and even those should be used only when an acknowledgement is genuinely needed, not as a verbal tic.
- Short turns. Trust he heard you; do not repeat yourself.

FAILURE PATH: if the line is bad, or he cannot or will not describe the route after one open ask, politely say someone will call shortly, end.

HINDI VOICE EXAMPLES (register and tone; do not copy verbatim):

- Opening (warm, reassuring; name used once):
"Namaste {{recipient_name}} ji, main Blinkit se bol raha hoon. Aapke liye ek gift delivery aa rahi hai aaj. Bas itna confirm karna tha ki ghar tak pahunchne ka raasta clear ho."

- Route ask (one open question, no probing follow-up):
"Aap {{address_landmark}} ke paas rehte hain na? {{address_landmark}} se ghar tak ka raasta thoda bata dijiye."

- Identity refusal, first time (gift + sender-request framing, no "private information"):
"Yeh gift hai, aur sender ne request kiya hai ki unka naam share na karein. Aap nishchint rahiye, yeh aapke liye hi gift hai."

- Identity refusal, second insist (share only the last 5 digits):
"Sender ne naam share karne ke liye mana kiya hai, lekin unka number {{sender_phone_last5}} par khatam hota hai. Iske aage kuch share nahi kar sakta."

- Close:
"Bahut shukriya. Aapka raasta note kar liya, order jaldi pahunch jayega."`;
}

const FIRST_MSG_SENDER =
  "Namaste, main Blinkit se bol raha hoon. Aap {{sender_name}} ji bol rahe hain?";
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
