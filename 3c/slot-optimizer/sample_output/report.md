# Revenue per allocated slot: options memo for 2027

DRAFT - PENDING OWNER REVIEW

**Channel Light Excursions, Juneau (FICTIONAL TEACHING BUSINESS).** Every number below comes from invented teaching data. This memo never changes a price. The owner decides.

Made by `optimize.py`: 2,000 Monte Carlo draws, seed 2027, 72 options per day type. Ranges are P10 to P90: in 8 of 10 draws the result falls inside. Interpretation is labeled *my read*.

## 1. The short version

- **What limited 2026 (the files, Theory of Constraints step 1: identify).** Heavy days: seats and departure timing (about 23 in 100 combo requests blocked); the glacier allocation is close behind (98% used). Medium days: mostly demand; seats and departure timing block about 6 in 100 combo requests. Light days: demand (about 2 in 100 combo requests blocked).
- Of 1,936 combo requests the files show turned away in 2026, 206 were at the glacier cap and 1,730 for seats or departure timing. Most lost combo guests were lost to our own seats and times, not to the permit.
- **On the 66 days at or near the cap (5 or fewer slots left), both limits bind at once.** 1,423 of the 1,730 seats-or-timing turnaways fell on those days, when only 65 slots were left in total. Extra seats on those days mostly sell whale-only (about $117.58 net per guest who travels) rather than the combo (about $157.84). Only 307 seats-or-timing turnaways fell on the 87 below-cap days; that is where moving or adding a departure wins back combo guests.
- **If nothing changes in 2027:** revenue per allocated slot $114.34 (P10 $108.99 to P90 $118.43), against $115.67 in 2026; allocation used 77.7% (P10 74.2% to P90 80.2%).
- **Recommended settings:** heavy days (64): combo $259 (2026: $219), whale-only $169 (2026: $159), offer independents the departures ships use least; medium days (52): combo $219, whale-only $159, offer independents the departures ships use least; light days (37): combo $219, whale-only $159, offer independents the departures ships use least.
- **With them:** revenue per allocated slot $120.93 (P10 $113.83 to P90 $126.69); season net revenue $2,030,000 (P10 $1,900,000 to P90 $2,140,000); gain over keeping the 2026 settings $100,000 (P10 $45,200 to P90 $142,000). It beats keeping them in 99 in 100 draws.
- **Biggest risk (worst one-at-a-time case in section 8):** price response -2.0 (guests more price-sensitive). The gain there is $4,490, with everything else at middle values; the plan still comes out ahead.
- **Trade-off to check first:** allocation use moves from 77.7% to 76.0% (P50). If your permit or land manager looks at actual use, see the use-neutral alternative in section 6 and check your permit before trading use for price (Contractual).

## 2. Is the model good enough to use? (2026 replay)

The day simulator replayed 2026 10 times with different random arrival orders: once with the actual daily requests (tests the booking model), once with requests from the fitted demand line (tests the whole chain).

| Measure | 2026 files | Replay, actual requests: mean (min to max) | Replay, fitted line: mean (min to max) |
|---|---|---|---|
| Combo guests | 12,096 | 11,961 (11,769 to 12,124) | 11,989 (11,840 to 12,284) |
| Allocation used | 79.1% | 78.2% (76.9% to 79.2%) | 78.4% (77.4% to 80.3%) |
| Revenue per allocated slot | $115.67 | $115.23 ($113.07 to $116.56) | $115.53 ($113.28 to $117.94) |
| Whale-only guests | 1,881 | 1,832 (1,741 to 1,941) | 1,833 (1,778 to 1,906) |
| Turned away, seats or timing | 1,730 | 1,711 (1,497 to 1,823) | 1,690 (1,530 to 1,898) |
| Turned away at the cap | 206 | 273 (208 to 317) | 273 (224 to 314) |
| Days at or near the cap (5 or fewer slots left) | 66 | 59 (56 to 64) | 60 (58 to 63) |
| Seats-or-timing turnaways on days at or near the cap | 1,423 | 1,311 (1,102 to 1,507) | 1,322 (1,117 to 1,452) |
| Seats-or-timing turnaways on below-cap days | 307 | 400 (233 to 499) | 368 (295 to 503) |

*My read:* the totals that drive revenue (combo guests, revenue per slot, seats-or-timing turnaways) land within a few percent. The model turns away more guests at the cap than the files show and reaches the cap on fewer days: treat the at-cap split as rough. The demand line explains 95% of the day-to-day variation in 2026 requests (R squared 0.95); a typical day is off by about 8 requests.

## 3. Which constraint binds

Theory of Constraints says: identify the constraint before you exploit it. A combo request can be blocked by the glacier allocation (a regulatory cap you cannot raise) or by seats and departure times (which the owner controls).

| Period | Day type | Days | Combo requests per day (est.) | Allocation used | Seats used | Blocked at the cap (incl. est. whale-only takers) | Blocked, seats or timing | Days at or near the cap | Binding constraint (my read) |
|---|---|---|---|---|---|---|---|---|---|
| 2026 actual | Heavy | 65 | 127 | 98.1% | 94.9% | 396 | 1,463 | 57 | Seats and departure timing (about 23 in 100 combo requests blocked); the glacier allocation is close behind (98% used) |
| 2026 actual | Medium | 51 | 81 | 76.4% | 72.6% | 16 | 229 | 9 | Mostly demand; seats and departure timing block about 6 in 100 combo requests |
| 2026 actual | Light | 37 | 50 | 49.2% | 48.0% | 0 | 38 | 0 | Demand (about 2 in 100 combo requests blocked) |
| 2026 actual | Season | 153 | 93 | 79.1% | 76.1% | 412 | 1,730 | 66 | Seats and departure timing (about 15 in 100 combo requests blocked) |
| 2027 if nothing changes | Heavy | 64 | 121 | 93.8% | 90.2% | 408 | 1,308 | 44 | Seats and departure timing (about 22 in 100 combo requests blocked) |
| 2027 if nothing changes | Medium | 52 | 86 | 79.3% | 74.8% | 40 | 324 | 5 | Mostly demand; seats and departure timing block about 8 in 100 combo requests |
| 2027 if nothing changes | Light | 37 | 49 | 47.7% | 46.8% | 0 | 43 | 0 | Demand (about 2 in 100 combo requests blocked) |
| 2027 if nothing changes | Season | 153 | 92 | 77.7% | 74.4% | 447 | 1,674 | 49 | Seats and departure timing (about 15 in 100 combo requests blocked) |

Both limits at once: days at or near the cap (5 or fewer slots left at close) against below-cap days.

| Period | Days at or near the cap | Slots left on those days (total) | Seats-or-timing turnaways on those days | Below-cap days | Seats-or-timing turnaways on below-cap days |
|---|---|---|---|---|---|
| 2026 actual | 66 | 65 | 1,423 | 87 | 307 |
| 2027 if nothing changes (middle values) | 49 | 73 | 1,174 | 104 | 500 |
| 2027 recommended plan (middle values) | 35 | 71 | 432 | 118 | 318 |

*My read:* on days at or near the cap a guest turned away for seats could not have had the glacier anyway: the slots were nearly gone. So more seats or better times on those days add whale-only guests, not combo guests, and do not raise revenue per slot. On below-cap days the same fix wins back combo guests. The optimizer respects this because the day simulator stops selling the combo at the allocation, whatever the seats.

Which departures sell out on heavy days (2 or fewer seats left):

| Heavy days | 8:00 | 10:30 | 13:00 | 15:30 |
|---|---|---|---|---|
| 2026 actual | 28.2 seats, sold out 55 of 65 days | 29.2 seats, sold out 59 of 65 days | 28.9 seats, sold out 57 of 65 days | 27.6 seats, sold out 48 of 65 days |
| 2027 if nothing changes | 26.1 seats, sold out 33 of 64 days | 27.6 seats, sold out 42 of 64 days | 28.5 seats, sold out 52 of 64 days | 26.1 seats, sold out 35 of 64 days |
| 2027 recommended plan | 26.4 seats, sold out 28 of 64 days | 24.4 seats, sold out 26 of 64 days | 26.0 seats, sold out 31 of 64 days | 25.9 seats, sold out 34 of 64 days |

*My read:* on heavy days both limits are close: 94.9% of seats and 98.1% of the allocation were used, and every departure sold out on more than half of them. Raising seats alone would mostly hit the glacier cap next (see the added-departure scenario). On medium days the allocation sat 1,202 slots unused while 229 requests were turned away for seats or timing; the departures that sold out most often were 10:30 (26 of 51 days) and 13:00 (21 of 51 days). That is a timing problem the owner can work on, not a permit problem.

## 4. 2027 day types and demand ranges

The kit's day-type rule (the same as tool 3b; Policy choice, thresholds in config.json). Port load = cruise passengers in port / the day's passenger limit. Last-season use = the combo's allocation used on the same weekday in the same month of 2026. **Heavy** if port load is 70% or more, or last-season use is 95% or more. **Light** only if port load is under 40% and last-season use is under 75%. **Medium** otherwise. Per-day list: `day_types_2027.csv`.

| Day type | Days in 2027 | Combo requests per day (low / mid / high) | Whale-only requests per day (low / mid / high) | Cruise share of requests |
|---|---|---|---|---|
| Heavy | 64 | 106 / 121 / 139 | 10 / 12 / 15 | 47.7% |
| Medium | 52 | 74 / 84 / 96 | 9 / 11 / 12 | 50.8% |
| Light | 37 | 43 / 51 / 58 | 8 / 9 / 10 | 52.0% |

How the ranges were built: section 10 and the README.

## 5. Recommended settings per day type, and the downside

Decision rule (Policy choice, `decision_rule` in config.json): change a setting only if the change earns more than keeping the 2026 settings in at least 80 in 100 draws, and each changed lever (combo price, whale-only price, operating option) does so on its own. Among those, the highest median wins.

| Day type | Days | Recommended settings | Net revenue, these days | Net revenue with 2026 settings | Gain | Beats 2026 settings in | Combo guests vs 2026 settings (P50) | Flags |
|---|---|---|---|---|---|---|---|---|
| Heavy | 64 | combo $259 (2026: $219), whale-only $169 (2026: $159), offer independents the departures ships use least | $1,070,000 (P10 $995,000 to P90 $1,130,000) | $985,000 (P10 $947,000 to P90 $1,010,000) | $85,700 (P10 $31,500 to P90 $126,000) | 98 in 100 | -362 | combo price is at the highest option tested; whale-only price is at the highest option tested |
| Medium | 52 | combo $219, whale-only $159, offer independents the departures ships use least | $672,000 (P10 $630,000 to P90 $706,000) | $659,000 (P10 $620,000 to P90 $692,000) | $13,600 (P10 $10,900 to P90 $14,000) | 100 in 100 | +110 |  |
| Light | 37 | combo $219, whale-only $159, offer independents the departures ships use least | $292,000 (P10 $267,000 to P90 $311,000) | $291,000 (P10 $266,000 to P90 $308,000) | $1,240 (P10 $811 to P90 $2,390) | 100 in 100 | +9 |  |

Top three options per day type (all options are in `options_by_day_type.csv`):

| Day type | Option | Net revenue, these days | Beats 2026 settings in | Passes the rule |
|---|---|---|---|---|
| Heavy | combo $259 (2026: $219), whale-only $169 (2026: $159), offer independents the departures ships use least | $1,070,000 (P10 $995,000 to P90 $1,130,000) | 98 in 100 | yes |
| Heavy | combo $259 (2026: $219), whale-only $169 (2026: $159), protect combo seats and steer independents | $1,070,000 (P10 $995,000 to P90 $1,130,000) | 98 in 100 | yes |
| Heavy | combo $259 (2026: $219), whale-only $159, offer independents the departures ships use least | $1,070,000 (P10 $995,000 to P90 $1,120,000) | 98 in 100 | yes |
| Medium | combo $259 (2026: $219), whale-only $149 (2026: $159), offer independents the departures ships use least | $677,000 (P10 $619,000 to P90 $731,000) | 72 in 100 | no: combo price, whale-only price |
| Medium | combo $259 (2026: $219), whale-only $149 (2026: $159), protect combo seats and steer independents | $677,000 (P10 $619,000 to P90 $731,000) | 72 in 100 | no: combo price, whale-only price |
| Medium | combo $259 (2026: $219), whale-only $169 (2026: $159), offer independents the departures ships use least | $677,000 (P10 $615,000 to P90 $733,000) | 71 in 100 | no: combo price, whale-only price |
| Light | combo $219, whale-only $169 (2026: $159), offer independents the departures ships use least | $292,000 (P10 $268,000 to P90 $311,000) | 99 in 100 | no: whale-only price |
| Light | combo $219, whale-only $169 (2026: $159), protect combo seats and steer independents | $292,000 (P10 $268,000 to P90 $311,000) | 99 in 100 | no: whale-only price |
| Light | combo $219, whale-only $149 (2026: $159), offer independents the departures ships use least | $292,000 (P10 $267,000 to P90 $311,000) | 96 in 100 | no: whale-only price |

*Flag:* a recommended price sits at the edge of the options tested. The model cannot say whether a bigger step is better, and a bigger step adds risks it does not capture (guest reaction, reviews, cruise line terms). Test before going further.

## 6. Season totals

| Plan | Season net revenue (combo and whale-only) | Revenue per allocated slot (Number 4) | Number 4 vs 2026 ($115.67), P50 | Allocation used (2026: 79.1%) | Beats 'nothing changes' in |
|---|---|---|---|---|---|
| 2027 if nothing changes | $1,930,000 (P10 $1,830,000 to P90 $2,020,000) | $114.34 (P10 $108.99 to P90 $118.43) | -1.32 | 77.7% (P10 74.2% to P90 80.2%) |  |
| 2027 recommended plan | $2,030,000 (P10 $1,900,000 to P90 $2,140,000) | $120.93 (P10 $113.83 to P90 $126.69) | +5.26 | 76.0% (P10 71.6% to P90 79.5%) | 99 in 100 |
| 2027 use-neutral alternative | $1,960,000 (P10 $1,860,000 to P90 $2,040,000) | $115.63 (P10 $110.21 to P90 $119.54) | -0.03 | 79.0% (P10 75.4% to P90 81.6%) | 100 in 100 |

*My read:* '2027 if nothing changes' differs from 2026 for reasons the model can show: the 2027 schedule brings 1,276,340 cruise passengers in port against 1,304,962 in 2026 (-2.2%), it has 64 heavy days against 65, and the model replays 2026 $0.44 low on average (section 2). Neither season is a forecast of the market; the range is.

Use-neutral alternative (Policy choice): the same rule, but no day type may sell fewer combo guests (median) than with the 2026 settings. Settings: heavy: combo $219, whale-only $169 (2026: $159), offer independents the departures ships use least; medium: combo $219, whale-only $159, offer independents the departures ships use least; light: combo $219, whale-only $159, offer independents the departures ships use least.

## 7. Where the gain comes from (middle values)

| Change | Season gain vs 2026 settings | Revenue per allocated slot | Allocation used |
|---|---|---|---|
| Operating options only (steer or protect), 2026 prices | $26,400 | $116.06 | 79.2% |
| Price changes only, 2026 way of selling | $79,000 | $120.37 | 75.1% |
| Both (the recommended plan) | $114,000 | $122.21 | 76.7% |

*My read:* steering independents is the low-risk part (it moves guests, not prices). The price part carries the price-response risk.

## 8. Sensitivity: one input at a time

Recommended plan versus keeping the 2026 settings, with one input moved and the rest at middle values. Direct simulation, 4 replays per row.

| Input changed | Gain | Number 4, recommended | Number 4, 2026 settings | Allocation used, recommended | Plan still ahead? |
|---|---|---|---|---|---|
| All inputs at middle values | $114,000 | $122.21 | $114.70 | 76.7% | yes |
| Demand at the low end of its range | $79,600 | $110.32 | $104.96 | 69.2% | yes |
| Demand at the high end of its range | $145,000 | $131.59 | $122.17 | 82.5% | yes |
| Price response -2.0 (guests more price-sensitive) | $4,490 | $115.87 | $114.70 | 73.1% | yes |
| Price response -0.4 (guests less price-sensitive) | $169,000 | $125.34 | $114.70 | 78.4% | yes |
| Whale-only accepted by 30% when the glacier is full | $114,000 | $122.22 | $114.71 | 76.7% | yes |
| Whale-only accepted by 70% when the glacier is full | $112,000 | $122.20 | $114.69 | 76.7% | yes |
| 40% of steered independents take the offered time | $105,000 | $121.80 | $114.70 | 76.3% | yes |
| 80% of steered independents take the offered time | $118,000 | $122.46 | $114.70 | 76.9% | yes |
| Cruise share of requests 10 points lower | $110,000 | $127.04 | $119.67 | 77.3% | yes |
| Cruise share of requests 10 points higher | $112,000 | $116.69 | $109.30 | 75.6% | yes |
| Cruise-line rate stays at the 2026 rate (price change on OTA and direct only) | $70,200 | $119.20 | $114.70 | 77.9% | yes |
| Kept share of booked net 3 points lower (more cancellations or refunds) | $110,000 | $118.25 | $110.99 | 76.7% | yes |
| Cruise-line net share 5 points lower | $106,000 | $118.28 | $111.23 | 76.7% | yes |

## 9. Scenarios the owner controls (not part of the recommendation)

Each scenario keeps the recommended prices and options and changes the operation on the listed day types, with the same draws. Costs are not modeled.

| Scenario | Season net vs recommended plan | Number 4 | Combo guests vs recommended (P50) | Whale-only guests vs recommended (P50) | Binding constraint after (my read) |
|---|---|---|---|---|---|
| Keep the stated 60-minute return buffer before all-aboard | -$41,500 (P10 -$43,500 to P90 -$39,700) | $118.47 (P10 $111.30 to P90 $124.31) | -318 | -41 | heavy: Seats and departure timing (about 14 in 100 combo requests blocked); medium: Mostly demand; seats and departure timing block about 9 in 100 combo requests; light: Mostly demand; seats and departure timing block about 5 in 100 combo requests |
| Add an 11:45 departure on heavy days (a second vessel, 30 seats) | $23,600 (P10 $14,700 to P90 $38,200) | $121.36 (P10 $114.30 to P90 $126.97) | +58 | +161 | heavy: The glacier allocation (about 11 in 100 combo requests blocked) |
| Add an 11:45 departure on medium days (a second vessel, 30 seats) | $10,900 (P10 $9,170 to P90 $13,700) | $121.37 (P10 $114.30 to P90 $127.08) | +65 | +39 | medium: Mostly demand; the glacier allocation block about 4 in 100 combo requests |

- **Keep the stated 60-minute return buffer before all-aboard.** Assumptions: Same demand and settings as the recommended plan. Cruise parties only book departures that return 60 minutes before all-aboard. Policy choice: guest safety margin versus seats.
- **Add an 11:45 departure on heavy days (a second vessel, 30 seats).** Assumptions: A second vessel, crew and shuttle seats are available at 11:45 on heavy days. The glacier allocation does not change, so the combo stays capped at 100 a day: on days at or near the cap most added seats can only sell whale-only. Costs (charter, crew hours, fuel, shuttle) are NOT modeled: compare the gain with your own cost before deciding.
- **Add an 11:45 departure on medium days (a second vessel, 30 seats).** Assumptions: Same as the heavy-day scenario, on medium days instead. These days are mostly below the cap, so seats at a time that fits the ships can win back combo guests. Costs are NOT modeled.

*My read:* adding seats on heavy days moves the binding constraint to the glacier allocation (Theory of Constraints step 5: when a constraint is broken, find the next one). On heavy days most of the added seats sell whale-only, because those days had almost no slots left; on medium days, mostly below the cap, the same departure wins back combo guests. Once seats stop binding, only price and mix raise revenue per slot. The buffer scenario prices the gap between the stated 60-minute plan and how 2026 was actually sold.

Open question for the owner: in the 2026 bookings, 1,262 of 6,596 cruise guests (19.1%) were on departures that returned less than 60 minutes before all-aboard, though the stated plan is 60 minutes. Which is the rule? (Policy choice with a guest-safety side: decide it before pricing.)

## 10. What the model assumes

- Combo requests per day follow passengers in port plus a month base, fitted on 2026 (requests = sold + turned away + estimated whale-only takers at the cap).
- Whale-only takers at the cap were not recorded; they are estimated from at-cap turnaways and an acceptance of 0.3 to 0.7 (mid 0.5).
- Demand in 2027 is within -10% to +10% of 2026 (assumption). All day types move together in a draw, which gives a wider, more cautious range.
- Price response (elasticity) between -2.0 and -0.4, mid -1.0 (assumption: never measured). It applies to both products and every channel.
- A cruise party only books a departure that is back at the dock by its ship's all-aboard time (combo 4.5 h, whale-only 3.0 h dock to dock). Independents fit any departure.
- Steering: 60 in 100 independent parties (range 40 in 100 to 80 in 100) take the departure ships use least when it is offered first; fixed at the middle value in the Monte Carlo, varied in section 8.
- Protecting combo seats stops whale-only bookings that would leave fewer seats than unsold combo slots, until 90% of a day's requests have arrived.
- Revenue per booked guest = gross at list x (price option / list) x channel net share x the share of booked net kept in 2026 after cancellations, no-shows and refunds (combo 92.6%, whale-only 90.6%).
- Day-to-day luck is averaged, not drawn: replays of 2026 moved revenue per slot by -$2.16 to $1.33 around the mean. The P10 to P90 ranges come from the assumption ranges above.

## 11. Limits, and what this does not do

- It does not change prices, inventory or channel settings. It writes this memo; a person decides and acts.
- It does not model costs (fuel, crew hours, permit fees per visit, a second vessel). Gains are net revenue, not profit.
- It does not model guest reaction beyond the elasticity range: reviews, cruise line relations, repeat guests.
- It does not predict weather, disruptions or ship schedule changes; it uses the published 2027 schedule as given.
- It does not know your permit, cruise line or OTA terms. Those can rule out a setting the model likes.
- One season of data. Small samples warrant small claims: treat the ranges as the message, not the medians.
- It never handles names, contact details or payment data, and it does not need them.

## 12. Before you act

- **Contractual:** check your permit. What it says about actual-use reporting, how use is counted and whether use affects renewal. This memo makes no claim about use-it-or-lose-it rules.
- **Contractual:** check your cruise line and OTA agreements before changing rates, the rate a cruise line pays, or which departures a channel can sell (steering). Section 8 shows the plan if cruise-line rates stay fixed.
- **Legal mandate:** the passenger limit of any vessel, including a second vessel for an added departure, comes from its Coast Guard certificate of inspection (vessel-specific; confirm the current certificate).
- **Legal mandate:** extra departures mean extra crew hours. Alaska overtime rules apply (AS 23.10.060, exemptions in AS 23.10.055); confirm with Alaska DOLWD Wage and Hour.
- **Policy choice:** prices, steering, protection, the return buffer and the decision rule thresholds are yours to set.
- **Recommendation:** test before you switch. For example, apply the heavy-day price to direct bookings on heavy days in one month, keep the rest as in 2026, and compare Number 4 and requests turned away. Cost of skipping the test: the price-response risk in section 8 stays unmeasured for another season.
- **Recommendation:** track Number 4 (net revenue of the combo / allocated slots) and allocation used % every month, season against season. A few hundred guests a month make month-to-month swings mostly noise.

## 13. Files in this folder

`report.md` (this memo), `plan.csv`, `options_by_day_type.csv`, `season_summary.csv`, `binding_constraints.csv`, `departure_fill.csv`, `sensitivity.csv`, `scenarios.csv`, `day_types_2027.csv`, `validation_2026_replay.csv`, `whatif_example.json`.
