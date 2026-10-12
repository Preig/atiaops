# Re-plan for 2026-09-16: Ship F 90 minutes late (first guests ashore 9:00, not 7:30)

DRAFT - PENDING OWNER REVIEW. A person approves every change and every message. Nothing has been sent.

FICTIONAL TEACHING DATA: Channel Light Excursions, Kestrel Shuttle and every ship, booking and number here are invented.

Alert known at 6:30. Rules used: back at the meeting point 60 minutes before all-aboard (policy choice); no move onto a departure leaving before 7:00 (30 minutes' notice, policy choice); seats per departure are the smaller of boat and shuttle seats.

## What the plan does

| | Parties | Guests | Net revenue |
|---|---:|---:|---:|
| Touched by the event | 9 | 27 | $3,455 |
| Stay on their booked departure | 4 | 9 | $1,191 |
| Move to another departure today (needs the guests' yes) | 4 | 16 | $1,993 |
| No workable seat today (call: another day or refund) | 1 | 2 | $272 |

If every move is accepted, the day keeps **$3,184 of $3,455** net revenue at stake (92%). Guests may say no: treat this as the most the plan can keep, not a forecast.

## Departures after the re-plan

| Departure | Seats now | Booked before | Booked after | Open seats |
|---|---:|---:|---:|---:|
| 8:00 | 30 | 27 | 9 | 21 |
| 10:30 | 30 | 18 | 30 | 0 |
| 13:00 | 30 | 13 | 17 | 13 |
| 15:30 | 30 | 30 | 30 | 0 |

Open seats on departures still ahead: 34. Offer them to your waitlist (tool 2b) after the moves above are confirmed.

## Calls to make, in this order

1. CL-26-04575 · 4 guests · $543.12 · move 8:00 to 10:30 · Cruise line shore-excursion desk (Contractual: check your cruise line agreement on who contacts guests)
2. CL-26-04583 · 4 guests · $543.12 · move 8:00 to 10:30 · Cruise line shore-excursion desk (Contractual: check your cruise line agreement on who contacts guests)
3. CL-26-04591 · 4 guests · $512.12 · move 8:00 to 10:30 · Cruise line shore-excursion desk (Contractual: check your cruise line agreement on who contacts guests)
4. CL-26-04577 · 4 guests · $394.32 · move 8:00 to 13:00 · Cruise line shore-excursion desk (Contractual: check your cruise line agreement on who contacts guests)
5. CL-26-04590 · 2 guests · $271.56 · no seat today from 8:00: offer another day or a refund · Cruise line shore-excursion desk (Contractual: check your cruise line agreement on who contacts guests)

Heads-up messages (booked departure still works): CL-26-04566, CL-26-04567, CL-26-04586, CL-26-04588.

Every message is a draft in approval_queue.csv with status PENDING.

## How the plan was chosen

Goal, in order: keep the most net revenue on the day; then the fewest moves; then earlier departures for moved guests. Parties stay together.
A booking whose own departure still works keeps its seat (policy choice: protect_workable_bookings).

- 5 parties needed a new seat or a call ($2,264). Greedy with repair seated $1,993 of it with 4 moves.
- The exact search (branch and bound, 10 nodes) proved that no plan keeps more and the greedy plan is also best on moves and times.
- A plan allowed to take seats from bookings that still work would keep $31 more today. Keeping those bookings is a policy choice, not a rule of this tool.

## Check before acting

- 1 booking(s) were already inside your 60-minute buffer before this event (sold that way, not caused by it): CL-26-04573 (30 min). The plan does not move them. Check them, and check the sales rule that allowed it.
- Confirm extra or changed shuttle runs with your transport partner (Contractual: check your agreement).
- Weather and safety calls belong to the captain. The plan only re-seats guests.
- The plan does not know guests' wishes, mobility needs or other plans. Ask before moving anyone.

