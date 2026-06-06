# Pinpoint

**The agent that resolves a delivery location instead of cancelling the order.**

When a quick commerce order has a bad delivery location, today the system either cancels or burns a delivery partner's time on guesswork. Pinpoint does what a good ops person would do instead: it calls, it figures out exactly where, and it gets the order delivered.

**Live dashboard:** https://pinpoint-one-gamma.vercel.app - click on "Call sender"

## The problem

- About 1.5% of quick commerce orders are cancelled purely because the location is wrong. The typed address is usually right; the customer just placed the pin badly, or the address cannot land an exact door.
- The real friction is about 3x that. Most of these orders do get delivered, but only after rounds of phone calls between the delivery partner and the customer.
- Delivery partners do not see the incentive to go past the original drop, so they refuse, and the customer is left frustrated.
- Many of these are gift orders, where the sender does not know the exact spot and the recipient is not expecting a call.

This is not a maps problem you fix with a better pin picker. It is an ambiguity problem. The easy agent confirms an address on a clean, scripted call; it breaks the moment the customer gives a landmark instead of coordinates, switches language, or does not know the spot. The hard part of the last mile is resolving where exactly under uncertainty, and failing safely when you cannot.

## Impact

- Recovers orders that are cancelled today purely for location reasons (the 1.5% baseline), and removes the partner to customer back and forth on the roughly 3x larger friction set.
- Protects the relationship on gift orders, which are high intent and high lifetime value.
- Scales across every low confidence order on the live stream, with humans reserved for the hard tail (the cases the agents cannot conclude on their own).
- Frees delivery partners to focus on delivering, not on negotiating addresses over the phone.

## How it works (the real, production design)

One orchestrator coordinating two specialised voice agents, with a human fallback.

- **Orchestrator.** Wakes off the live order stream whenever an order is flagged low confidence. Holds the case and its status. Decides whether to hold the order or re-pin. Calls the sender, then the recipient. Handles the order edit the corrected location forces (different store, item substitution, refund). Falls back to a human when stuck.
- **Sender Agent.** Calls the payer. Confirms the address (flags the pin vs landmark gap) and confirms any order edit that the corrected location requires.
- **Receiver Agent.** A separate agent, called to confirm the precise route to the door from the person who is actually there.
- **Human fallback.** If either agent cannot reach certainty, the customer is told someone will call back, and the case is routed to a human with everything gathered so far.

**How it pins down a location.** It narrows in stages: broad area, then landmark (cross checked against nearby landmarks), then the route from the landmark to the door, then how to identify the house. If it resolves to a precise pin, great. If it cannot, it hands the delivery partner the verbatim route, flagged as approximate, so the partner still reaches the door fast. The goal is the least time from the partner to the door.

**Two people, two jobs, handled with care.** The recipient knows the door, so the precise route is confirmed with them. The sender pays, so any order edit is confirmed with them. On a gift, the recipient is told a gift is coming (enough to be receptive and help), but the sender's identity is protected; only if the recipient insists is the last 5 digits of the sender's number shared, and nothing more.

**Why this is production grade, not demo zone.** State that carries (the second agent resumes with everything the first learned, nothing starts cold). Restraint and routing (it calls only the person who can answer). Safe failure (if it cannot reach certainty, it does not guess). Built for the stream (wakes off the live order stream on low confidence orders, around the clock).

## What is built for the demo

One hardcoded case, both calls in Hindi. A man in his 50s sends rasmalai to his brother in Jaipur. The address has Pannadhay Circle and a house number, but the dropped pin sits about 2 km away in Pratapnagar.

**Built and live in the demo:**

- The orchestrator dashboard (the operator console you see at the link above), with the case queue, the open case, a four step progress stepper, the order meta, a schematic map of the pin gap, the substitution ladder, and the two agents with their goals.
- Both voice agents in Hindi (ElevenLabs Conversational AI), with Agent 1 confirming the address and the order edit, and Agent 2 confirming the route and protecting the sender's identity.
- The state carrying handoff (Agent 2 opens already knowing what Agent 1 learned).
- The order edit handled on the call (Haldiram substitute with a 20 rupee refund, or two 500 g packs if asked).
- The graceful callback on failure.

**Designed, not built (faked or described in the demo):**

- Upstream low confidence detection on the live order stream.
- The hold vs re-pin decision.
- Real geocoding.
- The full fulfillment branch (serviceability, store reassignment, inventory, repricing). In the demo, the store reroute and the refund are conveyed by the Sender Agent; in production the orchestrator would compute them.
- Real order system integration, real telephony, idempotent retries, the fully loaded human handoff, and confidence thresholds calibrated on delivery outcomes.

Everything you see run on the dashboard is real. The pieces behind that line are scoped and designed, not faked.

## Stack

Next.js 14 (App Router) on Vercel, Tailwind, ElevenLabs Conversational AI for the two Hindi voice agents.
