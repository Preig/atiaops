# Re-plan for 2026-09-16: Road work adds 40 minutes to tours on the road between 12:00 and 18:00

DRAFT - PENDING OWNER REVIEW. A person approves every change and every message. Nothing has been sent.

FICTIONAL TEACHING DATA: Channel Light Excursions, Kestrel Shuttle and every ship, booking and number here are invented.

Alert known at 9:00. Rules used: back at the meeting point 60 minutes before all-aboard (policy choice); no move onto a departure leaving before 9:30 (30 minutes' notice, policy choice); seats per departure are the smaller of boat and shuttle seats.

## What the plan does

| | Parties | Guests | Net revenue |
|---|---:|---:|---:|
| Touched by the event | 16 | 48 | $5,959 |
| Stay on their booked departure | 15 | 46 | $5,719 |
| Move to another departure today (needs the guests' yes) | 1 | 2 | $241 |
| No workable seat today (call: another day or refund) | 0 | 0 | $0 |

If every move is accepted, the day keeps **$5,959 of $5,959** net revenue at stake (100%). Guests may say no: treat this as the most the plan can keep, not a forecast.

## Departures after the re-plan

| Departure | Seats now | Booked before | Booked after | Open seats |
|---|---:|---:|---:|---:|
| 8:00 | 30 | 27 | 27 | 3 |
| 10:30 | 30 | 18 | 20 | 10 |
| 13:00 | 30 | 13 | 11 | 19 |
| 15:30 | 30 | 30 | 30 | 0 |

Open seats on departures still ahead: 29. Offer them to your waitlist (tool 2b) after the moves above are confirmed.

## Calls to make, in this order

1. CL-26-04573 · 2 guests · $240.56 · move 13:00 to 10:30 · Cruise line shore-excursion desk (Contractual: check your cruise line agreement on who contacts guests)

Heads-up messages (booked departure still works): CL-26-04566, CL-26-04568, CL-26-04569, CL-26-04575, CL-26-04583, CL-26-04570, CL-26-04591, CL-26-04580, CL-26-04567, CL-26-04590, CL-26-04586, CL-26-04571, CL-26-04592, CL-26-04576, CL-26-04588.

Every message is a draft in approval_queue.csv with status PENDING.

## How the plan was chosen

Goal, in order: keep the most net revenue on the day; then the fewest moves; then earlier departures for moved guests. Parties stay together.
A booking whose own departure still works keeps its seat (policy choice: protect_workable_bookings).

- 1 party needed a new seat or a call ($241). Greedy with repair seated $241 of it with 1 move.
- The exact search (branch and bound, 3 nodes) proved that no plan keeps more and the greedy plan is also best on moves and times.
- Protecting bookings that still work cost nothing today.

## Check before acting

- 1 booking(s) were already inside your 60-minute buffer before this event (sold that way, not caused by it): CL-26-04573 (30 min). The plan does not move them. Check them, and check the sales rule that allowed it.
- Confirm extra or changed shuttle runs with your transport partner (Contractual: check your agreement).
- Weather and safety calls belong to the captain. The plan only re-seats guests.
- The plan does not know guests' wishes, mobility needs or other plans. Ask before moving anyone.

