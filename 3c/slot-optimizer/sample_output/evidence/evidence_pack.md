# Allocation evidence pack, 2026 season

DRAFT - PENDING OWNER REVIEW

**Channel Light Excursions, Juneau (FICTIONAL TEACHING BUSINESS).** Every number here comes from invented teaching data.

For a permit renewal or a conversation with the land manager or the city. Facts from the daily allocation log, plus estimates that are labeled as estimates. **Contractual:** check your permit or agreement for what it asks you to report, in what form and by when. This pack makes no claim about use-it-or-lose-it rules or any specific use threshold.

## 1. Season at a glance (2026-05-01 to 2026-09-30)

| Measure | Value |
|---|---|
| Days in the season | 153 |
| Allocation (guest visits) | 15,300 |
| Visits used (combo guests booked) | 12,096 |
| Allocation used | 79.1% |
| Unused visits | 3,204 |
| Days at or near the cap (5 or fewer visits left) | 66 |
| Days with no visits left | 33 |
| Requests turned away at the cap (fact, from the log) | 206 |
| Guests who took whale-only instead when the glacier was full (estimate) | 206 (range 88 to 481) |
| Glacier visits the allocation could not serve: turned away at the cap plus whale-only takers (estimate) | 412 (range 294 to 687) |
| Requests turned away for our own seats or departure times (NOT allocation demand) | 1,730 |

How the estimate works: guests turned away at the cap were offered whale-only; those who accepted were not recorded as turned away. Their number is estimated as turned-away-at-cap x a / (1 - a), where a, the share who accept whale-only, is between 0.3 and 0.7 (an assumption, not a measurement).

**Do not present the 1,730 seats-or-timing turnaways as demand for more allocation.** Those guests were limited by our own seats and departure times, on days when visits were often left unused.

## 2. By month

| Month | Days | Allocation | Used | Used % | Unused | Days at or near the cap | Turned away at cap | Turned away, seats or timing | Whale-only guests |
|---|---|---|---|---|---|---|---|---|---|
| May | 31 | 3,100 | 1,728 | 55.7% | 1,372 | 1 | 0 | 70 | 291 |
| June | 30 | 3,000 | 2,748 | 91.6% | 252 | 21 | 59 | 330 | 408 |
| July | 31 | 3,100 | 3,075 | 99.2% | 25 | 30 | 128 | 925 | 535 |
| August | 31 | 3,100 | 2,698 | 87.0% | 402 | 13 | 19 | 358 | 400 |
| September | 30 | 3,000 | 1,847 | 61.6% | 1,153 | 1 | 0 | 47 | 247 |

## 3. By weekday

| Weekday | Days | Used % | Unused | Days at or near the cap | Turned away at cap |
|---|---|---|---|---|---|
| Mon | 22 | 82.4% | 388 | 9 | 4 |
| Tue | 22 | 80.5% | 430 | 10 | 42 |
| Wed | 22 | 82.7% | 381 | 11 | 30 |
| Thu | 21 | 81.8% | 382 | 11 | 31 |
| Fri | 22 | 79.8% | 444 | 11 | 30 |
| Sat | 22 | 65.8% | 752 | 5 | 22 |
| Sun | 22 | 80.6% | 427 | 9 | 47 |

*My read:* use peaks in July (99.2%, 30 days at or near the cap) and is lowest in May (55.7%); the lowest weekday is Sat (65.8%). Unused visits sit mostly in the shoulder months, while the cap binds mid-season. If your permit allows it, that pattern supports asking about flexibility across days before asking for a larger daily number; check first (Contractual).

## 4. Reconciliation

| Item | This pack | Summary file | Match |
|---|---|---|---|
| allocation_season | 15300 | 15300 | yes |
| allocation_used | 12096 | 12096 | yes |
| allocation_used_pct | 79.1 | 79.1 | yes |
| days_cap_binding | 66 | 66 | yes |
| turned_away_combo_est | 1936 | 1936 | yes |
| turned_away_at_cap | 206 | 206 | yes |
| turned_away_seats_or_timing | 1730 | 1730 | yes |

## 5. Questions to answer from your permit (Contractual: check your permit)

- How often actual use is reported, in what format, and to whom.
- How a visit is counted (per guest, per trip, per vehicle) and whether guides count.
- Whether actual use is considered at renewal, and how. Read the clause; do not assume.
- Whether temporary or additional allocation can be requested for high-demand days, and the lead time.
- Whether allocation can be shifted between days, weeks or months, or shared with another permit holder.
- How long the permit asks you to keep the daily log, if it says, and whether the log can be audited.
- Who at the agency or city is the contact, and the deadline for the next renewal: [FILL].

## 6. Daily compliance log

`compliance_log_template.csv` has one row per departure that visits the site: date, departure, vessel or vehicle ID, guide staff ID, guests at the site (a count), times at the site, the day's allocation, visits so far and visits left. **No guest names, no contact details**: counts and staff IDs only (Policy choice). Fill it the same day. Policy choice: who records it and who checks it weekly.

## 7. Cover note draft (fill the blanks before sending)

```
DRAFT - PENDING OWNER REVIEW
To: [FILL: land manager or city contact, by role]
Subject: 2026 season actual use, allocation [FILL: permit number]

We used 12,096 of 15,300 allocated visits (79.1%) from May 1 to September 30. On 66 days the allocation was at or near the cap (5 or fewer visits left; 33 of them with none left). On those days we turned away 206 requests at the cap, and we estimate 88 to 481 more guests took a trip without the glacier stop instead. Unused visits were concentrated in May and September. The attached monthly table and daily log show the detail.

[FILL: what you are asking for, if anything, in one sentence, worded to match your permit's terms]
[FILL: name and role of the sender]
```

Files: `evidence_pack.md`, `evidence_by_month.csv`, `evidence_by_weekday.csv`, `evidence_days_at_cap.csv`, `evidence_turned_away.csv`, `compliance_log_template.csv`.
