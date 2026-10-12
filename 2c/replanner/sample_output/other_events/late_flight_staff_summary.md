# Re-plan for 2026-09-16: Booking CL-26-04587 delayed by a late flight (at the meeting point 9:40)

DRAFT - PENDING OWNER REVIEW. A person approves every change and every message. Nothing has been sent.

FICTIONAL TEACHING DATA: Channel Light Excursions, Kestrel Shuttle and every ship, booking and number here are invented.

Alert known at 7:00. Rules used: back at the meeting point 60 minutes before all-aboard (policy choice); no move onto a departure leaving before 7:30 (30 minutes' notice, policy choice); seats per departure are the smaller of boat and shuttle seats.

## What the plan does

| | Parties | Guests | Net revenue |
|---|---:|---:|---:|
| Touched by the event | 1 | 1 | $212 |
| Stay on their booked departure | 0 | 0 | $0 |
| Move to another departure today (needs the guests' yes) | 1 | 1 | $212 |
| No workable seat today (call: another day or refund) | 0 | 0 | $0 |

If every move is accepted, the day keeps **$212 of $212** net revenue at stake (100%). Guests may say no: treat this as the most the plan can keep, not a forecast.

## Departures after the re-plan

| Departure | Seats now | Booked before | Booked after | Open seats |
|---|---:|---:|---:|---:|
| 8:00 | 30 | 27 | 26 | 4 |
| 10:30 | 30 | 18 | 19 | 11 |
| 13:00 | 30 | 13 | 13 | 17 |
| 15:30 | 30 | 30 | 30 | 0 |

Open seats on departures still ahead: 32. Offer them to your waitlist (tool 2b) after the moves above are confirmed.

## Calls to make, in this order

1. CL-26-04587 · 1 guest · $212.43 · move 8:00 to 10:30 · Your booking platform

Every message is a draft in approval_queue.csv with status PENDING.

## How the plan was chosen

Goal, in order: keep the most net revenue on the day; then the fewest moves; then earlier departures for moved guests. Parties stay together.
A booking whose own departure still works keeps its seat (policy choice: protect_workable_bookings).

- 1 party needed a new seat or a call ($212). Greedy with repair seated $212 of it with 1 move.
- The exact search (branch and bound, 4 nodes) proved that no plan keeps more and the greedy plan is also best on moves and times.
- Protecting bookings that still work cost nothing today.

## Check before acting

- 1 booking(s) were already inside your 60-minute buffer before this event (sold that way, not caused by it): CL-26-04573 (30 min). The plan does not move them. Check them, and check the sales rule that allowed it.
- Confirm extra or changed shuttle runs with your transport partner (Contractual: check your agreement).
- Weather and safety calls belong to the captain. The plan only re-seats guests.
- The plan does not know guests' wishes, mobility needs or other plans. Ask before moving anyone.

