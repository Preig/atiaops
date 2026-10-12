# Re-plan for 2026-09-16: 10:30 departure held for marine weather (captain's call)

DRAFT - PENDING OWNER REVIEW. A person approves every change and every message. Nothing has been sent.

FICTIONAL TEACHING DATA: Channel Light Excursions, Kestrel Shuttle and every ship, booking and number here are invented.

Alert known at 7:30. Rules used: back at the meeting point 60 minutes before all-aboard (policy choice); no move onto a departure leaving before 8:00 (30 minutes' notice, policy choice); seats per departure are the smaller of boat and shuttle seats.

## What the plan does

| | Parties | Guests | Net revenue |
|---|---:|---:|---:|
| Touched by the event | 7 | 18 | $2,387 |
| Stay on their booked departure | 0 | 0 | $0 |
| Move to another departure today (needs the guests' yes) | 4 | 8 | $1,060 |
| No workable seat today (call: another day or refund) | 3 | 10 | $1,327 |

If every move is accepted, the day keeps **$1,060 of $2,387** net revenue at stake (44%). Guests may say no: treat this as the most the plan can keep, not a forecast.

## Departures after the re-plan

| Departure | Seats now | Booked before | Booked after | Open seats |
|---|---:|---:|---:|---:|
| 8:00 | 30 | 27 | 30 | 0 |
| 10:30 (cancelled) | 0 (was 30) | 18 | 0 | 0 |
| 13:00 | 30 | 13 | 18 | 12 |
| 15:30 | 30 | 30 | 30 | 0 |

Open seats on departures still ahead: 12. Offer them to your waitlist (tool 2b) after the moves above are confirmed.

## Calls to make, in this order

1. CL-26-04579 · 3 guests · $455.25 · move 10:30 to 13:00 · The OTA's messaging (Contractual: check your OTA supplier terms)
2. CL-26-04567 · 2 guests · $271.56 · move 10:30 to 8:00 · Cruise line shore-excursion desk (Contractual: check your cruise line agreement on who contacts guests)
3. CL-26-04592 · 2 guests · $197.16 · move 10:30 to 13:00 · Cruise line shore-excursion desk (Contractual: check your cruise line agreement on who contacts guests)
4. CL-26-04588 · 1 guest · $135.78 · move 10:30 to 8:00 · Cruise line shore-excursion desk (Contractual: check your cruise line agreement on who contacts guests)
5. CL-26-04566 · 4 guests · $543.12 · no seat today from 10:30: offer another day or a refund · Cruise line shore-excursion desk (Contractual: check your cruise line agreement on who contacts guests)
6. CL-26-04568 · 4 guests · $543.12 · no seat today from 10:30: offer another day or a refund · Cruise line shore-excursion desk (Contractual: check your cruise line agreement on who contacts guests)
7. CL-26-04586 · 2 guests · $240.56 · no seat today from 10:30: offer another day or a refund · Cruise line shore-excursion desk (Contractual: check your cruise line agreement on who contacts guests)

Every message is a draft in approval_queue.csv with status PENDING.

## How the plan was chosen

Goal, in order: keep the most net revenue on the day; then the fewest moves; then earlier departures for moved guests. Parties stay together.
A booking whose own departure still works keeps its seat (policy choice: protect_workable_bookings).

- 7 parties needed a new seat or a call ($2,387). Greedy with repair seated $1,060 of it with 4 moves.
- The exact search (branch and bound, 12 nodes) proved that no plan keeps more and the greedy plan is also best on moves and times.
- Protecting bookings that still work cost nothing today.

## Check before acting

- 1 booking(s) were already inside your 60-minute buffer before this event (sold that way, not caused by it): CL-26-04573 (30 min). The plan does not move them. Check them, and check the sales rule that allowed it.
- Confirm extra or changed shuttle runs with your transport partner (Contractual: check your agreement).
- Weather and safety calls belong to the captain. The plan only re-seats guests.
- The plan does not know guests' wishes, mobility needs or other plans. Ask before moving anyone.

