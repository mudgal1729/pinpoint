// Probes the ElevenLabs account and lists premade voices.
// Step 1 of two: confirm API key works, see what voices are available, pick
// two male Hindi-capable voices, then run with --create to build the agents.
//
// Usage:
//   node --env-file=.env.local scripts/setup-elevenlabs.mjs
//   node --env-file=.env.local scripts/setup-elevenlabs.mjs --create
//   node --env-file=.env.local scripts/setup-elevenlabs.mjs --bootstrap
//
// On --create / --bootstrap:
//   - reads PINPOINT_SENDER_VOICE_ID and PINPOINT_RECEIVER_VOICE_ID from env
//   - reads the two system prompts from agents/sender.md and agents/receiver.md
//   - creates or PATCHes two agents via /v1/convai/agents
//   - writes their IDs back into .env.local in place (idempotent)

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, "..", "agents");

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

// Prompt bodies live in agents/sender.md and agents/receiver.md. The {{...}}
// dynamic variables are filled in at session start by the SDK with values
// from caseContext (lib/case.ts).
async function loadPrompt(role) {
  const file = role === "sender" ? "sender.md" : "receiver.md";
  return (await readFile(join(PROMPTS_DIR, file), "utf8")).trimEnd();
}

const FIRST_MSG_SENDER =
  "Namaste, main Blinkit se bol raha hoon. Aap {{sender_name}} ji bol rahe hain?";
const FIRST_MSG_RECEIVER =
  "Namaste, main Blinkit se bol raha hoon. Aap {{recipient_name}} ji?";

async function agentBody(role) {
  // One voice for both agents. The sender voice ID is the canonical
  // value; the receiver var is kept in .env.local for compatibility but
  // is no longer used at agent-create time. To change the demo voice,
  // edit PINPOINT_SENDER_VOICE_ID and re-run `--create`.
  const voiceId = process.env.PINPOINT_SENDER_VOICE_ID;
  if (!voiceId)
    throw new Error("PINPOINT_SENDER_VOICE_ID not set in .env.local");

  const name =
    role === "sender" ? "Pinpoint Sender (Hindi)" : "Pinpoint Receiver (Hindi)";
  const prompt = await loadPrompt(role);
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
    await patch(`/convai/agents/${senderId}`, await agentBody("sender"));
  } else {
    console.log("Creating sender agent...");
    const r = await post("/convai/agents/create", await agentBody("sender"));
    senderId = r.agent_id;
    console.log(`  -> ${senderId}`);
  }

  if (receiverId) {
    console.log(`Updating existing receiver agent ${receiverId}...`);
    await patch(`/convai/agents/${receiverId}`, await agentBody("receiver"));
  } else {
    console.log("Creating receiver agent...");
    const r = await post("/convai/agents/create", await agentBody("receiver"));
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
