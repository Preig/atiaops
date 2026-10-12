# Disruption loss ledger, season 2026

DRAFT - PENDING OWNER REVIEW.

FICTIONAL TEACHING DATA: Channel Light Excursions, Kestrel Shuttle and every ship, booking and number here are invented.

## Headline

- **Number 3, disruption recovery rate: 35.0%** (191 of 545 guests on disrupted bookings were rebooked or had their seat refilled).
- Uncertainty: about 28.3% to 41.5% (95% bootstrap interval, resampling the season's 38 events). Next season will have its own interval; if the two overlap a lot, treat the change as noise.
- Net revenue lost to refunds: **$51,596**. Net revenue recovered: $27,910.
- Staff time: 127.8 hours, about $4,090 at $32.00 an hour (loaded cost, an input).
- **Cost of poor quality (partial): $55,686** = refunds plus staff time. It leaves out goodwill, reviews, partner fees and comps, so it is a floor, not the full cost.

## By cause (Pareto: largest cost first)

| Cause | Events | Guests | Recovered | Rate | Net lost | Staff h | Cost (partial) | Cumulative |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Marine weather hold | 9 | 205 | 69 | 33.7% | $21,187 | 32.2 | $22,218 | 39.9% |
| Ship late or tendering from anchor | 14 | 180 | 78 | 43.3% | $12,603 | 48.9 | $14,168 | 65.3% |
| Flight delay or fog (independent guests) | 7 | 81 | 26 | 32.1% | $9,304 | 23.6 | $10,059 | 83.4% |
| Road or traffic delay on the shuttle route | 5 | 39 | 6 | 15.4% | $4,985 | 14.7 | $5,455 | 93.2% |
| Ship schedule change or skipped call | 3 | 40 | 12 | 30.0% | $3,517 | 8.4 | $3,785 | 100.0% |

## By month

| Month | Events | Guests | Recovered | Rate | Net lost | Staff h |
|---|---:|---:|---:|---:|---:|---:|
| May 2026 | 8 | 81 | 25 | 30.9% | $7,803 | 28.2 |
| June 2026 | 8 | 103 | 33 | 32.0% | $10,574 | 21.7 |
| July 2026 | 9 | 167 | 60 | 35.9% | $15,181 | 34.9 |
| August 2026 | 7 | 118 | 47 | 39.8% | $11,323 | 22.5 |
| September 2026 | 6 | 76 | 26 | 34.2% | $6,715 | 20.5 |

Months hold 6 to 9 events each here: month-to-month swings in the rate are mostly noise. Compare season to season.

Causes with fewer than 10 events (Marine weather hold, 9; Flight delay or fog (independent guests), 7; Road or traffic delay on the shuttle route, 5; Ship schedule change or skipped call, 3): treat their rates as rough.

## Reconciliation

Every event in the disruption log matches its bookings: guests, rebooked, refilled, refunded and net lost.

## What to do with it

- Pricing and terms: the cost per disrupted guest is an input to your rebook and refund terms (policy choice).
- Staffing: staff hours by month show when disruption handling eats the day.
- Insurance and partners: the cause table is the evidence for a conversation about cover, or about a shuttle or cruise line agreement (Contractual: check your agreements).
- Advocacy: advocacy_export.csv holds aggregates only (month x cause, no booking refs, no event IDs), in a shared cause list, so an association could add members' files together. Sharing it needs a written data-sharing agreement (Contractual).

