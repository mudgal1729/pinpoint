# Pinpoint, Product Plan (V0)
*(working name; the agent that resolves a delivery location instead of cancelling the order. Rename freely.)*

## One line
When a Blinkit order has a low confidence delivery location (the typed address is right but the map pin is far away, or the address cannot land an exact door), Pinpoint is a multi agent system that calls the right person, resolves the exact drop, handles any order edit the corrected location forces, and gets the order delivered instead of cancelled.

## The problem
- About 1.5% of orders are cancelled purely because the location is wrong. The typed address is usually right, but the pin was placed badly, or the address is incomplete.
- The real friction is about 3x that. Most get delivered, but only after rounds of calls between the delivery partner and the customer.
- Delivery partners do not see the incentive to travel past the original drop, so they refuse, and the customer is left frustrated.
- Many of these are gifts, where the sender may not know the exact spot and the recipient is not expecting a call.

## The insight
This is ambiguity resolution, not a maps problem. The fix is an agent that resolves where exactly under uncertainty, the way a good ops person would: call, narrow the area, lock the landmark, get the route from the landmark, and hand the delivery partner something usable. If it cannot reach certainty, it fails safely (promises a callback and routes to a human) rather than guessing.

## The system
An orchestrator owns the order and routes between two specialised voice agents.
- **Orchestrator.** Wakes on a low confidence order, holds the case and its status, decides whether to hold or re-pin, calls the sender, then the recipient, handles the order edit the corrected location forces, and falls back to a human when stuck.
- **Sender Agent.** Calls the payer. Confirms the address (the pin is far from the landmark), then confirms the order edit (the corrected location is served by a second store, so an item is substituted and the difference refunded).
- **Receiver Agent.** A separate agent, called to confirm the precise route to the door from the person who is actually there.
- **Human fallback.** If either agent cannot conclude, the customer is told someone will call shortly, and the case goes to a human with everything gathered so far.

## How a location gets resolved
Narrow in stages: broad area, then landmark (cross checked against nearby landmarks), then the route from the landmark to the door, then how to identify the house. Resolve to a precise pin if possible; otherwise pass the verbatim route to the delivery partner, flagged as approximate. The goal is the least time from the partner to the door.

## Two people, two jobs
The recipient knows the door, so the precise route is confirmed with them. The sender pays, so any store change or order edit is confirmed with them. On a gift, the recipient is told a gift is coming (so they help with the address), but the sender's identity is protected; only if they insist is the last 5 digits of the sender's number shared.

## The demo
One hardcoded case, both calls in Hindi: a man in his 50s sends rasmalai to his brother in Jaipur; the address has Pannadhay Circle and a house number, but the pin sits about 2 km away in Pratapnagar.

The frame is an operations console, not a single hero screen. On the left, a case queue with one real case selected and a few placeholder rows behind it, so the case obviously belongs to a stream the orchestrator watches. On the right, the open case: the order id and a state badge at the top, a one line concept ("the orchestrator owns the case and carries context across both calls, escalates if it cannot reach certainty"), an inline row of operator actions (Call sender, Call recipient, Escalate, Reset), a four step progress stepper (Triggered, Sender call, Recipient call, Resolved), a status banner, the order meta strip, a schematic map of the pin gap, the substitution ladder, and the two agents with their goals.

Agent 1 confirms the address and the order edit (Haldiram substitute with a 20 rupee refund, or two 500 g packs if asked); the stepper advances, the recipient row of the agents section unlocks, and Agent 2 is called. Agent 2 confirms the route and protects the sender identity. The recorded run uses only the operator buttons; everything else (detection, geocoding, real fulfillment, telephony, the four KPI tiles you would expect in a real console) is described, not built. The time goes into making the two Hindi conversations feel real.

## Why it wins
- **Innovation:** an orchestrated two agent control flow with restraint and real world nuance (two people for two jobs, the gift identity guardrail), not a new model.
- **Technical complexity:** orchestrator state, the state carrying handoff to a second agent, confidence based fallback, two coordinated Hindi voice agents.
- **Impact:** a real, quantified problem with real money, and a clear path to scale across the order stream.
- **Presentation and usability:** a smooth, natural live voice call in Hindi, with the orchestrator's state legible on screen, an operator console framing it, and a graceful failure path.
