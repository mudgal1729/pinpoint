// Browser-side ElevenLabs Conversational AI helpers. Each helper fetches a
// fresh signed URL from `/api/signed-url`, opens a session via the SDK,
// passes `caseContext` as dynamic variables (snake_case keys matching the
// {{placeholders}} in the agent prompts), and registers `onEnd` for the
// SDK's `onDisconnect` callback. The returned `Conversation` instance
// exposes `endSession()` for the Force Callback path. See
// `docs/sdk-notes.md` for the canonical SDK contract.

import { Conversation } from "@elevenlabs/client";
import type { CaseContext } from "@/lib/case";

type SignedUrlResponse = { signedUrl?: string; error?: string };

async function fetchSignedUrl(agent: "sender" | "receiver"): Promise<string> {
  const res = await fetch(`/api/signed-url?agent=${agent}`, {
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as SignedUrlResponse;
  if (!res.ok || !body.signedUrl) {
    throw new Error(
      body.error ?? `signed-url fetch failed (HTTP ${res.status})`,
    );
  }
  return body.signedUrl;
}

function fallbackText(f: { label: string; detail: string }): string {
  return `${f.label} (${f.detail})`;
}

function buildDynamicVariables(
  c: CaseContext,
): Record<string, string | number | boolean> {
  const [f1, f2, f3] = c.orderEdit.fallbacks;
  return {
    sender_name: c.sender.name,
    recipient_name: c.recipient.name,
    items: c.order.items.join(", "),
    amount: c.order.amount,
    address_house_no: c.address.houseNo,
    address_landmark: c.address.landmark,
    address_area: c.address.area,
    address_city: c.address.city,
    issue_summary: c.issue,
    nearby_landmarks: c.nearbyLandmarks.join(", "),
    // The agent uses just the first nearby landmark as a single
    // proximity-check question instead of listing all three.
    primary_nearby_landmark: c.nearbyLandmarks[0],
    order_edit_reason: c.orderEdit.reason,
    fallback_1_text: fallbackText(f1),
    fallback_2_text: fallbackText(f2),
    fallback_3_text: fallbackText(f3),
    // Agent 2 reads this; harmless to pass on Agent 1 too.
    sender_phone_last5: c.sender.phoneLast5,
  };
}

async function startSession(
  agent: "sender" | "receiver",
  caseContext: CaseContext,
  onEnd: () => void,
) {
  const signedUrl = await fetchSignedUrl(agent);
  return Conversation.startSession({
    signedUrl,
    dynamicVariables: buildDynamicVariables(caseContext),
    onDisconnect: () => {
      onEnd();
    },
    onError: (message, context) => {
      console.error("[elevenlabs] error", message, context);
    },
  });
}

export function startSenderSession(
  caseContext: CaseContext,
  onEnd: () => void,
) {
  return startSession("sender", caseContext, onEnd);
}

export function startReceiverSession(
  caseContext: CaseContext,
  onEnd: () => void,
) {
  return startSession("receiver", caseContext, onEnd);
}

export type ActiveConversation = Awaited<ReturnType<typeof startSession>>;
