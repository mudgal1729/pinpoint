# Pinpoint, Demo Presentation (V0)
Slide content plus a speaker script for each. Doubles as the script for the submission video. Aim for 5 to 7 minutes. Keep the live demo (slide 7) the longest beat.

---

## Slide 1, Title
**Pinpoint**
The agent that resolves a delivery location instead of cancelling the order.
*(One line under the title: "When the address and the map pin disagree, we call, we figure out where, and we deliver.")*

**Script:** When a quick commerce order has a bad location today, the system gives up and cancels, or burns a delivery partner's time on guesswork. We built an agent that does what a good ops person would do instead. It calls, it figures out exactly where, and it gets the order delivered.

---

## Slide 2, The problem
- About 1.5% of orders are cancelled purely because the location is wrong. The typed address is usually right; the customer just placed the pin badly, or the address cannot land an exact door.
- The real friction is about 3x that. Most get delivered, but only after rounds of calls between the partner and the customer.
- Delivery partners do not see the incentive to go past the original drop, so they refuse, and the customer is left frustrated.
- Many of these are gifts, where the sender does not know the exact spot and the recipient is not expecting a call.

**Script:** A small percentage that hides a large cost: cancelled orders, wasted partner time, frustrated customers. And it is not a maps problem you fix with a better pin picker. It is an ambiguity problem.

---

## Slide 3, Why this is the hard part of agentic AI
- The easy agent confirms an address on a clean, scripted call. It breaks the moment the customer gives a landmark instead of coordinates, switches language, or does not know the spot.
- The hard part, the real last mile, is resolving where exactly under uncertainty, and failing safely when you cannot.

**Script:** This is exactly the gap in today's brief, between an agent that works on the golden path and one that survives the real world. Pinpoint assumes the call will be messy, and it still resolves the order, or hands off cleanly.

---

## Slide 4, The solution, one system, three roles
*(Diagram: Order stream to Orchestrator in the middle, branching to Agent A Sender and Agent B Receiver, with a Human fallback off to the side.)*
- **Orchestrator:** wakes only on low confidence orders, holds the case and its status, decides whether to hold or re-pin, calls the sender then the recipient, handles the order edit the new location forces, and falls back to a human when stuck.
- **Sender Agent:** calls the payer to confirm the address and the order edit.
- **Receiver Agent:** a separate agent, called to confirm the precise door from the person who is actually there.

**Script:** It is not one chatbot. It is an orchestrator coordinating specialised agents, and the orchestrator is what makes this a system rather than a demo. It carries state across every step, so nothing is lost between calls.

---

## Slide 5, How it pins down a location
- Narrow in stages: broad area, then landmark (cross checked against nearby landmarks), then the route from the landmark to the door, then how to identify the house.
- Resolve to a precise pin. If it cannot, hand the partner the exact verbatim route, flagged as approximate, so they still reach the door fast.
- Goal: least time from the partner to the door.

**Script:** It does not interrogate. It already knows the order and the address; it confirms what it can and asks only for the missing piece, the way you would give directions to a friend.

---

## Slide 6, Two people, two jobs, handled with care
- The recipient knows the door, so the precise route is confirmed with them. The sender pays, so any order edit is confirmed with them.
- On a gift, the recipient is told a gift is coming, enough to be receptive and help, but the sender's identity is protected.
- Only if the recipient insists, the agent shares the last 5 digits of the sender's number, and nothing more.

**Script:** This is the kind of real world nuance that separates a usable agent from a demo. We tell the recipient just enough to help, and we keep the sender's identity behind a guardrail.

---

## Slide 7, Live demo (the hero)
*(Run it on the dashboard, in Hindi, with English subtitles on the video. The dashboard is a preview of the orchestrator: the order, the issue, the agent's goals, and the status, with a button to trigger each call.)*
1. The dashboard shows a gift order for a sister in Jaipur. The address has Pannadhay Circle and a house number, but the dropped pin is about 2 km away in Pratapnagar. It lists Agent 1's two goals: confirm the address, and confirm the order edit.
2. Press the button. Agent 1 calls the sender (a man in his 50s, in Hindi). It flags the pin vs landmark gap, confirms the house number and Pannadhay Circle (cross checking a nearby landmark), and asks about the route. Then it explains a different store will fulfil the order, the Amul laddoo is unavailable but Haldiram is, 20 rupees cheaper and refunded; if he wants another option, it offers the same item as two 500 g packs. He agrees.
3. The status updates: address and order edit confirmed, now calling the recipient to confirm the route.
4. Press the second button. Agent 2 calls the sister, already knowing the area and landmark. It tells her a gift is on the way and confirms the route from the landmark and how to identify the house. She asks who sent it; the agent says it is private; she insists; it shares the last 5 digits.
5. Final status: location resolved, route confirmed, sender identity protected. Order on the way.

**Script:** Watch the status. The second agent opens already knowing what the first one learned. That continuity, and the fact that the whole thing reads like two real, calm phone calls, is the point.

---

## Slide 8, Why this is production grade, not demo zone
- **State that carries:** the second agent resumes with everything the first learned; nothing starts cold.
- **Restraint and routing:** it calls only the person who can answer, the payer for the order edit, the recipient for the door.
- **Safe failure:** if it cannot reach certainty, it does not guess; it promises the customer a callback and routes the case to a human with everything gathered so far.
- **Built for the stream:** in production it wakes off the live order stream on low confidence orders, around the clock, with humans only on the hard tail.

**Script:** These are the things the brief asked for: long term context, safe action on behalf of users, graceful handling of the unexpected, and operating without constant supervision.

---

## Slide 9, Impact and scale
- Recovers orders that are cancelled today, and removes the partner to customer back and forth on the 3x larger friction set.
- Protects the relationship on gift orders, which are high intent and high lifetime value.
- Scales across every low confidence order on the stream, with humans reserved for the hard cases.

**Script:** The demo is one order. The design is a system that sits on the order stream and resolves these continuously, calling a human only when it should.

---

## Slide 10, What we built today vs what is designed
- **Built and live:** the orchestrator dashboard, both voice agents in Hindi, the state carrying handoff, the order edit handled on the call, and the graceful callback on failure.
- **Designed, not built:** upstream low confidence detection, the hold vs re-pin decision, geocoding, and the full fulfillment branch (serviceability, store reassignment, inventory, repricing). In the demo, the store reroute and the refund are conveyed by the Sender Agent; in production the orchestrator computes them.
- Also designed: real order system integration, real telephony, idempotent retries, the fully loaded human handoff, and confidence thresholds calibrated on delivery outcomes.

**Script:** We are honest about the line. Everything you saw run is real; the things behind that line are scoped and designed, not faked.

---

## Slide 11, Close
**Pinpoint: when the location is unclear, resolve it, do not cancel it.**
*(Team names. One line: built at [event name], [date].)*

**Script:** Thanks. Happy to take questions, and happy to walk through the failure path and the production design if you want to see the edges.
