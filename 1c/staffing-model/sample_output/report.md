# Season staffing plan, May 1, 2027 to Sep 30, 2027

**DRAFT - PENDING OWNER REVIEW.** Channel Light Excursions, Juneau (FICTIONAL TEACHING BUSINESS)

FICTIONAL TEACHING DATA: every booking, ship call, staff record, ratio, lead time and cost here is invented.

Made Oct 11, 2026 by the season staffing model (ATIA 2026 Operations Kit, tool 1c). The model plans counts, dates and ranges. It does not choose, score or rank any person, and it sends nothing. A person decides.

Inputs: demand: bookings_2026.csv moved forward 364 days; ship calls: port_schedule_2027.csv; staff: staff_2026.csv; rota: rota_sample_2027.csv.

## Headline

- **Positions at peak: 22** (captain 3, deckhand 6, naturalist guide 6, dock coordinator 4, reservations 3).
- **Rehire 35%:** about 7 returning staff, 15 new hires to open the season, then 3 (1 to 8) early quits and 4 (1 to 9) replacement hires (P50, with P10 to P90 in brackets). Total hires 19 (15 to 25). Recruiting cost estimate $53,700 (P10 $42,300 to P90 $67,700).
- **Rehire 50%:** about 10 returning staff, 12 new hires to open the season, then 3 (0 to 7) early quits and 4 (1 to 8) replacement hires (P50, with P10 to P90 in brackets). Total hires 16 (12 to 21). Recruiting cost estimate $44,400 (P10 $32,800 to P90 $57,800).
- **Rehire 50% instead of Rehire 35%:** 3 fewer hires and $8,800 less recruiting cost (P50; P10 $2,600 to P90 $17,400). Cheaper in 96% of simulated seasons.
- **First deadline:** start J-1 sponsor recruiting by **Oct 31, 2026** for 4 people (deckhand 1, dock coordinator 1, naturalist guide 1, reservations 1). Status: SOON (20 days away).
- **Standby list:** Expect 4 replacement hires (P50; P10 1 to P90 9). In half of the simulated seasons the first departure came by May 4, 2027 (in 1 of 10, by May 1, 2027). Keep a standby list of about 9 pre-screened people from short-lead channels (Job boards and ads; Staff referral; Local hire (lives in Juneau)) ready by May 1, 2027; start building it by Mar 6, 2027 at the latest.
- **Early-quit rate behind the plan:** 20.0% (4 of 20 new hires last season), 95% interval 8.1% to 41.6%. Small sample: read every number above as a range.
- **Workload check:** 9 check-in items, 5 watch items, 4 overtime reminders. See section 6.

## 1. Headcount needed by week

Demand: departures and guests per departure from bookings_2026.csv moved forward 364 days. Ratios from config.json turn them into shifts; shifts become people at 5 shifts per person per week, plus a 10% buffer. The table shows the target headcount (people on staff and working alone).

| Week | Dates | Departures | Guests | Captains | Deckhands | Naturalists | Dock | Reservations | Total |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | May 1 to May 7 | 27 | 398 | 3 | 4 | 4 | 3 | 3 | 17 |
| 2 | May 8 to May 14 | 27 | 414 | 3 | 4 | 5 | 3 | 3 | 18 |
| 3 | May 15 to May 21 | 27 | 450 | 3 | 4 | 5 | 3 | 3 | 18 |
| 4 | May 22 to May 28 | 28 | 512 | 3 | 4 | 5 | 3 | 3 | 18 |
| 5 | May 29 to Jun 4 | 28 | 549 | 3 | 5 | 5 | 3 | 3 | 19 |
| 6 | Jun 5 to Jun 11 | 28 | 707 | 3 | 6 | 6 | 3 | 3 | 21 |
| 7 | Jun 12 to Jun 18 | 28 | 732 | 3 | 6 | 6 | 4 | 3 | 22 |
| 8 | Jun 19 to Jun 25 | 28 | 735 | 3 | 5 | 6 | 4 | 3 | 21 |
| 9 | Jun 26 to Jul 2 | 28 | 786 | 3 | 6 | 6 | 4 | 3 | 22 |
| 10 | Jul 3 to Jul 9 | 28 | 770 | 3 | 6 | 6 | 4 | 3 | 22 |
| 11 | Jul 10 to Jul 16 | 28 | 783 | 3 | 6 | 6 | 4 | 3 | 22 |
| 12 | Jul 17 to Jul 23 | 28 | 783 | 3 | 6 | 6 | 4 | 3 | 22 |
| 13 | Jul 24 to Jul 30 | 28 | 785 | 3 | 6 | 6 | 4 | 3 | 22 |
| 14 | Jul 31 to Aug 6 | 28 | 774 | 3 | 6 | 6 | 4 | 3 | 22 |
| 15 | Aug 7 to Aug 13 | 28 | 695 | 3 | 6 | 6 | 4 | 3 | 22 |
| 16 | Aug 14 to Aug 20 | 28 | 652 | 3 | 5 | 6 | 4 | 3 | 21 |
| 17 | Aug 21 to Aug 27 | 28 | 654 | 3 | 6 | 6 | 3 | 3 | 21 |
| 18 | Aug 28 to Sep 3 | 28 | 518 | 3 | 5 | 5 | 3 | 3 | 19 |
| 19 | Sep 4 to Sep 10 | 26 | 510 | 3 | 4 | 5 | 3 | 3 | 18 |
| 20 | Sep 11 to Sep 17 | 27 | 473 | 3 | 4 | 5 | 3 | 3 | 18 |
| 21 | Sep 18 to Sep 24 | 28 | 451 | 3 | 4 | 5 | 2 | 3 | 17 |
| 22 | Sep 25 to Sep 30 | 24 | 386 | 3 | 4 | 5 | 3 | 3 | 18 |

**Model check against 2026-05-01 to 2026-09-30.** The same ratios applied to last season's own dates give the positions below, next to the positions staffed when last season opened.

| Role | Model | Staffed | Gap |
|---|---:|---:|---:|
| Captain | 3 | 3 | 0 |
| Deckhand | 6 | 5 | +1 |
| Naturalist guide | 6 | 6 | 0 |
| Dock coordinator | 4 | 5 | -1 |
| Reservations | 3 | 3 | 0 |
| Total | 22 | 22 | 0 |

My read: where the gap is not 0, either the ratio is off or last season ran short or long in that role. The model cannot tell which. Adjust the ratio in config.json until last season reproduces, or keep the gap on purpose (Policy choice).

## 2. Attrition curve from last season

> **Small sample.** 20 new hires, 4 early quits. One person more or less moves the rate by about 5 points. Treat the curve as a planning range, not a fact.

Share of new hires who had left, by week of tenure (Kaplan-Meier: people who finished the season count as staying, not leaving). The band resamples the 20 people 2,000 times (bootstrap); with this few people the band is rough, not exact.

| Week of tenure | At risk | Left | Cumulative share left | 95% band |
|---:|---:|---:|---|---|
| 1 | 20 | 0 | 0.0% | 0.0% to 0.0% |
| 2 | 20 | 0 | 0.0% | 0.0% to 0.0% |
| 3 | 20 | 3 | 15.0% | 0.0% to 30.0% |
| 4 | 17 | 1 | 20.0% | 5.0% to 40.0% |
| 5 | 16 | 0 | 20.0% | 5.0% to 40.0% |
| 6 | 16 | 0 | 20.0% | 5.0% to 40.0% |
| 16 | 16 | 1 | 25.0% | 10.0% to 45.0% |

- **Early-quit rate (Number 2):** 4 of 20 new hires left within 30 days: 20.0%, Wilson 95% interval 8.1% to 41.6%.
- **When:** early quits left on tenure days 16 to 23. With 14 days of onboarding before opening day, that is the first weeks of the season.
- **Returning staff:** 0 of 6 left within 30 days (0.0%, interval 0.0% to 39.0%); 1 left later in the season. Six people cannot tell you much.
- **Later departures (new hires):** 1 left after day 30 and before the season ended.

Breakdowns, for reading only. Do not plan on these: within channels and within roles, every interval overlaps every other, so these numbers give no evidence of a difference.

| By | Group | Early quits | Share | 95% interval |
|---|---|---|---|---|
| channel | J-1 sponsor | 2 of 5 | 40% | 12% to 77% |
| channel | Job boards and ads | 1 of 7 | 14% | 3% to 51% |
| channel | Local hire (lives in Juneau) | 1 of 4 | 25% | 5% to 70% |
| channel | Staff referral | 0 of 4 | 0% | 0% to 49% |
| role | Captain | 0 of 2 | 0% | 0% to 66% |
| role | Deckhand | 0 of 4 | 0% | 0% to 49% |
| role | Dock coordinator | 1 of 4 | 25% | 5% to 70% |
| role | Naturalist guide | 2 of 7 | 29% | 8% to 64% |
| role | Reservations | 1 of 3 | 33% | 6% to 79% |

## 3. Hiring plan by date and channel (Rehire 35%)

Start recruiting by the date in the first column at the latest. It counts back from the day the person is needed working alone: 14 days of onboarding, then the long end of the channel's lead time. Long-lead channels go to the earliest positions.

| Start recruiting by | Channel | People | Roles | Lead time | Working alone by | Status |
|---|---|---:|---|---|---|---|
| Oct 31, 2026 | J-1 sponsor | 4 | deckhand 1, dock coordinator 1, naturalist guide 1, reservations 1 | 16 to 24 weeks | May 1, 2027 | SOON (20 days away) |
| Feb 6, 2027 | Job boards and ads | 5 | captain 1, deckhand 1, dock coordinator 1, naturalist guide 1, reservations 1 | 6 to 10 weeks | May 1, 2027 | OK |
| Feb 20, 2027 | Staff referral | 1 | captain 1 | 4 to 8 weeks | May 1, 2027 | OK |
| Feb 20, 2027 | Returning staff (rehire letter, tool 1a) | 7 | captain 1, deckhand 2, dock coordinator 1, naturalist guide 2, reservations 1 | 4 to 8 weeks | May 1, 2027 | OK |
| Feb 27, 2027 | Staff referral | 1 | naturalist guide 1 | 4 to 8 weeks | May 8, 2027 | OK |
| Mar 20, 2027 | Staff referral | 1 | deckhand 1 | 4 to 8 weeks | May 29, 2027 | OK |
| Apr 3, 2027 | Staff referral | 1 | dock coordinator 1 | 4 to 8 weeks | Jun 12, 2027 | OK |
| Apr 10, 2027 | Local hire (lives in Juneau) | 2 | deckhand 1, naturalist guide 1 | 3 to 6 weeks | Jun 5, 2027 | OK |

**Replacements.** Expect 4 replacement hires (P50; P10 1 to P90 9). In half of the simulated seasons the first departure came by May 4, 2027 (in 1 of 10, by May 1, 2027). Keep a standby list of about 9 pre-screened people from short-lead channels (Job boards and ads; Staff referral; Local hire (lives in Juneau)) ready by May 1, 2027; start building it by Mar 6, 2027 at the latest.

| Role | Replacement hires, P50 (P10 to P90) |
|---|---|
| Captain | 1 (0 to 2) |
| Deckhand | 1 (0 to 3) |
| Naturalist guide | 1 (0 to 3) |
| Dock coordinator | 0 (0 to 2) |
| Reservations | 1 (0 to 2) |

Returning staff: the date is the latest to ask them back. Tool 1a asks in October, when the crew you want back has just left.

J-1 hires: timing and obligations are set by the sponsor and the program. Contractual and regulatory: check your sponsor agreement and current DOL and State Department rules. The lead time here is fictional.

The full plan, row by row and for every scenario, is in hiring_plan.csv.

## 4. Recruiting cost and range

Cost per hire by channel (fictional, from config.json): J-1 sponsor $3,930 ($2,948 to $4,913); Job boards and ads $2,748 ($2,061 to $3,435); Staff referral $2,530 ($1,898 to $3,163); Local hire (lives in Juneau) $1,723 ($1,292 to $2,154). Returning staff: $0 each.

| Scenario | Hires P50 (P10 to P90) | Cost P10 | Cost P50 | Cost P90 | Cost mean |
|---|---|---:|---:|---:|---:|
| Rehire 35% | 19 (15 to 25) | $42,300 | $53,700 | $67,700 | $54,500 |
| Rehire 50% | 16 (12 to 21) | $32,800 | $44,400 | $57,800 | $45,000 |

Cross-check with the Season Leak Audit's simple rule: 15 new hires / (1 - 20.0%) = 18.8 expected hires; x $2,795 per hire = $52,400. The simulation's mean is 19.7 hires and $54,500; it differs because it also replaces later departures and uses channel costs.

## 5. Scenario comparison

Both scenarios use the same random numbers, run by run, so the difference column is measured on paired seasons.

| P50 (P10 to P90) | Rehire 35% | Rehire 50% | Difference (Rehire 35% minus Rehire 50%) |
|---|---|---|---|
| Returning staff | 7 (4 to 10) | 10 (7 to 13) | -3 (-5 to -1) |
| New hires to open the season | 15 (12 to 18) | 12 (9 to 15) | 3 (1 to 5) |
| Early quits | 3 (1 to 8) | 3 (0 to 7) | 0 (0 to 2) |
| Replacement hires | 4 (1 to 9) | 4 (1 to 8) | 0 (0 to 2) |
| Total hires | 19 (15 to 25) | 16 (12 to 21) | 3 (1 to 6) |
| Recruiting cost | $53,700 ($42,300 to $67,700) | $44,400 ($32,800 to $57,800) | $8,800 ($2,600 to $17,400) |
| Shortfall, person-weeks below need | 13.6 (3.4 to 30.0) | 12.4 (3.2 to 28.4) | 0.0 (-2.4 to 5.8) |

My read: in this model the rehire rate moves cost through fewer hires, because a returning person is counted at $0 recruiting cost, and last season no returning person left in the first 30 days. That last point rests on 6 people. The shortfall row barely moves between the scenarios. In the Rehire 35% scenario, 44% of the shortfall falls in the first six weeks, when early quits land before their replacements work alone.

## 6. Workload check

Owner-set thresholds (Policy choice): more than 50 hours a week per person, fewer than 1 day off a week, more than 7 days in a row without a day off. The check reads schedules, never people. Every item is "schedule a check-in", owned by a manager. CHECK-IN: the plan, or the typical simulated season, crosses a threshold. WATCH: only the bad season (1 in 10) does. OVERTIME: a reminder, not a finding.

**Overtime reminder.** Legal mandate: Alaska Statute AS 23.10.060 requires overtime at one and one-half times the regular rate for hours over 8 in a day or over 40 in a workweek. Exemptions are listed in AS 23.10.055 and in AS 23.10.060 itself (for example, an employer with fewer than four employees). Whether any role is exempt is a question for the state, not for this tool. Confirm the current text and your case with Alaska DOLWD Wage and Hour. Checked 11 Oct 2026.

| Level | Source | Role | When or pattern | Measure | Value | Threshold | Action |
|---|---|---|---|---|---|---|---|
| WATCH | plan | Captain | weeks 1 to 6, 8, 14 to 18 (May 1 to Jun 11; Jun 19 to Jun 25; Jul 31 to Sep 3); 1 season in 10 (P10 on hand) | shifts per person per week | up to 7 shifts | 6 shifts | Watch: in 1 simulated season in 10, early departures leave the captains short in weeks 1 to 6, 8, 14 to 18 and the rest would go over the threshold. Keep the standby list ready, and if it happens, schedule a check-in with the captains. |
| WATCH | plan | Deckhand | weeks 4 (May 22 to May 28); 1 season in 10 (P10 on hand) | shifts per person per week | up to 6.7 shifts | 6 shifts | Watch: in 1 simulated season in 10, early departures leave the deckhands short in weeks 4 and the rest would go over the threshold. Keep the standby list ready, and if it happens, schedule a check-in with the deckhands. |
| WATCH | plan | Naturalist guide | weeks 1, 3 to 10, 14 to 17 (May 1 to May 7; May 15 to Jul 9; Jul 31 to Aug 27); 1 season in 10 (P10 on hand) | hours per person per week and shifts per person per week | up to 76 h; up to 8 shifts | 50 h; 6 shifts | Watch: in 1 simulated season in 10, early departures leave the naturalist guides short in weeks 1, 3 to 10, 14 to 17 and the rest would go over the threshold. Keep the standby list ready, and if it happens, schedule a check-in with the naturalist guides. |
| WATCH | plan | Dock coordinator | weeks 1, 3 to 5, 8 to 11, 14 to 15 (May 1 to May 7; May 15 to Jun 4; Jun 19 to Jul 16; Jul 31 to Aug 13); 1 season in 10 (P10 on hand) | hours per person per week and shifts per person per week | up to 53.3 h; up to 6.7 shifts | 50 h; 6 shifts | Watch: in 1 simulated season in 10, early departures leave the dock coordinators short in weeks 1, 3 to 5, 8 to 11, 14 to 15 and the rest would go over the threshold. Keep the standby list ready, and if it happens, schedule a check-in with the dock coordinators. |
| WATCH | plan | Reservations | weeks 1 to 6, 8, 14 to 18 (May 1 to Jun 11; Jun 19 to Jun 25; Jul 31 to Sep 3); 1 season in 10 (P10 on hand) | hours per person per week and shifts per person per week | up to 56 h; up to 7 shifts | 50 h; 6 shifts | Watch: in 1 simulated season in 10, early departures leave the reservations staff short in weeks 1 to 6, 8, 14 to 18 and the rest would go over the threshold. Keep the standby list ready, and if it happens, schedule a check-in with the reservations staff. |
| OVERTIME | plan | Naturalist guide | staffed to target | overtime reminder | 9.5 h shifts (over 8 h a day); about 45.6 h a week per person in the heaviest week, May 15 to May 21 (over 40 h) | 8 h a day, 40 h a week | Budget overtime or change the shift pattern (Policy choice). |
| CHECK-IN | last season | Captain | runs of days without a day off | schedules with a run over the threshold | 1 of 3 (longest 8 days) | 7 days | Schedule a check-in about the captain rota pattern with the lead who sets it, before the next rota is published. |
| CHECK-IN | last season | Deckhand | runs of days without a day off | schedules with a run over the threshold | 2 of 5 (longest 11 days) | 7 days | Schedule a check-in about the deckhand rota pattern with the lead who sets it, before the next rota is published. |
| CHECK-IN | last season | Dock coordinator | runs of days without a day off | schedules with a run over the threshold | 3 of 6 (longest 9 days) | 7 days | Schedule a check-in about the dock coordinator rota pattern with the lead who sets it, before the next rota is published. |
| CHECK-IN | last season | Naturalist guide | runs of days without a day off | schedules with a run over the threshold | 5 of 8 (longest 12 days) | 7 days | Schedule a check-in about the naturalist guide rota pattern with the lead who sets it, before the next rota is published. |
| CHECK-IN | last season | Reservations | runs of days without a day off | schedules with a run over the threshold | 1 of 4 (longest 9 days) | 7 days | Schedule a check-in about the reservations rota pattern with the lead who sets it, before the next rota is published. |
| CHECK-IN | last season | Reservations | average weekly hours | schedules averaging over the threshold | 1 of 4 (highest 55 h) | 50 h a week | Schedule a check-in about reservations weekly hours with the lead who sets the rota. |
| OVERTIME | last season | All roles | average weekly hours | schedules averaging over the weekly overtime threshold | 20 of 26 | 40 h a week | Check that payroll paid overtime where it applied. |
| CHECK-IN | rota | Naturalist guide | rota line R04, Jul 5 to Jul 14 | days in a row without a day off | 10 | 7 days | Schedule a check-in and change rota line R04 so it has a day off. |
| CHECK-IN | rota | Naturalist guide | rota line R04, week of Jul 5 | hours in the week | 66.5 | 50 h | Schedule a check-in and rebalance rota line R04 for that week. |
| CHECK-IN | rota | Dock coordinator | rota line R07, week of Jul 5 | hours in the week | 57 | 50 h | Schedule a check-in and rebalance rota line R07 for that week. |
| OVERTIME | rota | Dock coordinator | rota line R07, Jul 5 to Jul 16 | overtime reminder | 6 shifts over 8 h a day, 1 line-week over 40 h | 8 h a day, 40 h a week | Budget overtime for these lines or change them. |
| OVERTIME | rota | Naturalist guide | rota lines R04, R05, R06, Jul 5 to Jul 18 | overtime reminder | 32 shifts over 8 h a day, 6 line-weeks over 40 h | 8 h a day, 40 h a week | Budget overtime for these lines or change them. |

My read: at a 10% buffer, no role gets an extra person at its peak, because 10% of a team of 3 to 6 is less than half a person. Peak slack is captain 0.2 of a person, deckhand 0.4 of a person, naturalist guide 0.4 of a person, dock coordinator 0.0 of a person, reservations 0.2 of a person. With so little slack, one early departure is enough to take away days off until a replacement works alone, which is what the WATCH items show. A buffer for a small team is a whole person or nothing (Policy choice).

## 7. Method

1. **Demand.** Departures that ran and guests on each (guest cancellations left out), moved to next season's dates by whole weeks, or a forecast you supply. Ship calls per day from the port schedule.
2. **Shifts.** Per departure: max(minimum crew, guests / guests per person, rounded up), divided by departures one person covers in a shift. Per ship call: calls x people per call, rounded up, with a daily minimum. Fixed roles: shifts per day.
3. **People.** Need = the larger of weekly shifts / shifts per person and the busiest day's shifts. Target = need rounded up, plus the buffer when it amounts to at least half a person. Positions = the highest weekly target; a position is needed from the first week the target reaches it.
4. **Attrition.** Kaplan-Meier by week of tenure from last season's start and end dates. Wilson interval for the early-quit share; bootstrap band for the curve.
5. **Simulation.** 2,000 seeded runs per scenario. Each run resamples last season's people and refits the curve (how uncertain the rate is), draws who returns at the scenario's rehire rate, and plays out each hire week by week (luck). A departure is replaced if at least 4 weeks would remain and the role would fall below target. Each hire costs a triangular draw from the channel's low, mid and high cost. P10 to P90 means 8 of 10 simulated seasons fall inside.
6. **Workload.** Hours and shifts per person per week by role, if staffed to target, in the typical simulated season (P50 people on hand) and in a bad one (P10). Last season's schedules are counted by role. An optional draft rota is checked line by line.

## 8. Limits and what this does not do

- The attrition curve comes from one season and 20 new hires. It was fitted on the same season it describes and has not been tested on a second one. Add each season's start and end dates and rerun.
- Departures are modeled by week of tenure. Last season's later departures came in August and may follow the calendar (school starts) more than tenure. With so few, the model cannot tell.
- Last season's demand is used as next season's unless you supply a forecast. Bookings you turned away are not demand the model sees.
- A shift can cover any two departures; real pairing, travel between docks and breaks are not modeled.
- Lead times and costs are fictional estimates in config.json. Replace them with your own.
- It does not choose, score, rank or flag any person, predict who will quit, send anything, post a job or make an offer. Hiring decisions, schedules and pay stay with a person.
- It is not legal advice. Overtime, visa programs and vessel crewing rules need the sources named above.

## Files

weekly_headcount.csv, hiring_plan.csv, recruiting_calendar.csv, cost_and_scenarios.csv, attrition_curve.csv, workload_checks.csv, summary.json, and narrative_draft.md if the AI narrative ran.
