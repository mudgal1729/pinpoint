import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get("agent");

  const agentId =
    role === "sender"
      ? process.env.PINPOINT_SENDER_AGENT_ID
      : role === "receiver"
        ? process.env.PINPOINT_RECEIVER_AGENT_ID
        : null;

  if (!agentId) {
    return Response.json(
      { error: "agent must be sender or receiver" },
      { status: 400 },
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "server is missing ELEVENLABS_API_KEY" },
      { status: 500 },
    );
  }

  const url = new URL(
    "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url",
  );
  url.searchParams.set("agent_id", agentId);

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      headers: { "xi-api-key": apiKey },
      cache: "no-store",
    });
  } catch {
    return Response.json(
      { error: "upstream signed-url request failed" },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    return Response.json(
      { error: "upstream signed-url failed" },
      { status: 502 },
    );
  }

  const body = (await upstream.json()) as { signed_url?: string };
  if (!body.signed_url) {
    return Response.json(
      { error: "upstream signed-url response missing signed_url" },
      { status: 502 },
    );
  }

  return Response.json({ signedUrl: body.signed_url });
}
