# Re-plan for 2026-09-16: Ship E skips the call

DRAFT - PENDING OWNER REVIEW. A person approves every change and every message. Nothing has been sent.

FICTIONAL TEACHING DATA: Channel Light Excursions, Kestrel Shuttle and every ship, booking and number here are invented.

Alert known at 6:00. Rules used: back at the meeting point 60 minutes before all-aboard (policy choice); no move onto a departure leaving before 6:30 (30 minutes' notice, policy choice); seats per departure are the smaller of boat and shuttle seats.

## What the plan does

| | Parties | Guests | Net revenue |
|---|---:|---:|---:|
| Touched by the event | 5 | 17 | $1,918 |
| Stay on their booked departure | 0 | 0 | $0 |
| Move to another departure today (needs the guests' yes) | 0 | 0 | $0 |
| No workable seat today (call: another day or refund) | 5 | 17 | $1,918 |

If every move is accepted, the day keeps **$0 of $1,918** net revenue at stake (0%). Guests may say no: treat this as the most the plan can keep, not a forecast.

## Departures after the re-plan

| Departure | Seats now | Booked before | Booked after | Open seats |
|---|---:|---:|---:|---:|
| 8:00 | 30 | 27 | 27 | 3 |
| 10:30 | 30 | 18 | 18 | 12 |
| 13:00 | 30 | 13 | 13 | 17 |
| 15:30 | 30 | 30 | 13 | 17 |

Open seats on departures still ahead: 49. Offer them to your waitlist (tool 2b) after the moves above are confirmed.

## Calls to make, in this order

1. CL-26-04569 · 4 guests · $543.12 · no seat today from 15:30: offer another day or a refund · Cruise line shore-excursion desk (Contractual: check your cruise line agreement on who contacts guests)
2. CL-26-04570 · 4 guests · $512.12 · no seat today from 15:30: offer another day or a refund · Cruise line shore-excursion desk (Contractual: check your cruise line agreement on who contacts guests)
3. CL-26-04580 · 5 guests · $492.90 · no seat today from 15:30: offer another day or a refund · Cruise line shore-excursion desk (Contractual: check your cruise line agreement on who contacts guests)
4. CL-26-04571 · 2 guests · $197.16 · no seat today from 15:30: offer another day or a refund · Cruise line shore-excursion desk (Contractual: check your cruise line agreement on who contacts guests)
5. CL-26-04576 · 2 guests · $172.36 · no seat today from 15:30: offer another day or a refund · Cruise line shore-excursion desk (Contractual: check your cruise line agreement on who contacts guests)

Every message is a draft in approval_queue.csv with status PENDING.

## How the plan was chosen

Goal, in order: keep the most net revenue on the day; then the fewest moves; then earlier departures for moved guests. Parties stay together.
A booking whose own departure still works keeps its seat (policy choice: protect_workable_bookings).

- 5 parties needed a new seat or a call ($1,918). Greedy with repair seated $0 of it with 0 moves.
- The exact search (branch and bound, 6 nodes) proved that no plan keeps more and the greedy plan is also best on moves and times.
- Protecting bookings that still work cost nothing today.

## Check before acting

- 1 booking(s) were already inside your 60-minute buffer before this event (sold that way, not caused by it): CL-26-04573 (30 min). The plan does not move them. Check them, and check the sales rule that allowed it.
- Confirm extra or changed shuttle runs with your transport partner (Contractual: check your agreement).
- Weather and safety calls belong to the captain. The plan only re-seats guests.
- The plan does not know guests' wishes, mobility needs or other plans. Ask before moving anyone.

