# Re-plan for 2026-09-16: Shuttle van out of service: 24 seats on the 8:00 and 15:30 runs

DRAFT - PENDING OWNER REVIEW. A person approves every change and every message. Nothing has been sent.

FICTIONAL TEACHING DATA: Channel Light Excursions, Kestrel Shuttle and every ship, booking and number here are invented.

Alert known at 6:45. Rules used: back at the meeting point 60 minutes before all-aboard (policy choice); no move onto a departure leaving before 7:15 (30 minutes' notice, policy choice); seats per departure are the smaller of boat and shuttle seats.

## What the plan does

| | Parties | Guests | Net revenue |
|---|---:|---:|---:|
| Touched by the event | 16 | 57 | $8,309 |
| Stay on their booked departure | 13 | 46 | $7,250 |
| Move to another departure today (needs the guests' yes) | 1 | 4 | $394 |
| No workable seat today (call: another day or refund) | 2 | 7 | $665 |

If every move is accepted, the day keeps **$7,644 of $8,309** net revenue at stake (92%). Guests may say no: treat this as the most the plan can keep, not a forecast.

## Departures after the re-plan

| Departure | Seats now | Booked before | Booked after | Open seats |
|---|---:|---:|---:|---:|
| 8:00 | 24 (was 30) | 27 | 23 | 1 |
| 10:30 | 30 | 18 | 22 | 8 |
| 13:00 | 30 | 13 | 13 | 17 |
| 15:30 | 24 (was 30) | 30 | 23 | 1 |

Open seats on departures still ahead: 27. Offer them to your waitlist (tool 2b) after the moves above are confirmed.

## Calls to make, in this order

1. CL-26-04577 · 4 guests · $394.32 · move 8:00 to 10:30 · Cruise line shore-excursion desk (Contractual: check your cruise line agreement on who contacts guests)
2. CL-26-04580 · 5 guests · $492.90 · no seat today from 15:30: offer another day or a refund · Cruise line shore-excursion desk (Contractual: check your cruise line agreement on who contacts guests)
3. CL-26-04576 · 2 guests · $172.36 · no seat today from 15:30: offer another day or a refund · Cruise line shore-excursion desk (Contractual: check your cruise line agreement on who contacts guests)

Heads-up messages (booked departure still works): CL-26-04582, CL-26-04585, CL-26-04589, CL-26-04581, CL-26-04574, CL-26-04569, CL-26-04575, CL-26-04583, CL-26-04570, CL-26-04591, CL-26-04590, CL-26-04587, CL-26-04571.

Every message is a draft in approval_queue.csv with status PENDING.

## How the plan was chosen

Goal, in order: keep the most net revenue on the day; then the fewest moves; then earlier departures for moved guests. Parties stay together.
A booking whose own departure still works keeps its seat (policy choice: protect_workable_bookings).

- 16 parties needed a new seat or a call ($8,309). Greedy with repair seated $7,644 of it with 1 move.
- The exact search (branch and bound, 10,808 nodes) proved that no plan keeps more and the greedy plan is also best on moves and times.
- Protecting bookings that still work cost nothing today.

## Check before acting

- 1 booking(s) were already inside your 60-minute buffer before this event (sold that way, not caused by it): CL-26-04573 (30 min). The plan does not move them. Check them, and check the sales rule that allowed it.
- Confirm extra or changed shuttle runs with your transport partner (Contractual: check your agreement).
- Weather and safety calls belong to the captain. The plan only re-seats guests.
- The plan does not know guests' wishes, mobility needs or other plans. Ask before moving anyone.

