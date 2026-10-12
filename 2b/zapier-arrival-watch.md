# Arrival watch in Zapier: the recipe

From the ATIA Operations Kit, tool 2b Arrival watch and backfill: https://preig.github.io/atiaops/2b/
Teaching data is fictional (Channel Light Excursions, Juneau, and its fictional partner Kestrel Shuttle). Times and costs are estimates. Checked 11 Oct 2026.

> **Status: untested in live accounts.** This recipe is written from Zapier's documented building blocks and checked for logic only. It has not been run end to end in a real Zapier account. Step names change. Check each step against Zapier's help (https://help.zapier.com/) before you build, and run it on the fictional test rows below before any real booking touches it.

**What you build:** one Zap per watch (port schedule, weather alert, booking system, and optionally flight status), plus one Zap that drafts guest messages after the captain records a hold. Every Zap ends in the same place: rows with status `pending` in an approval sheet, and a staff-only alert to the duty lead.

**What you never build:** a step that sends anything to a guest, a cruise line desk or an OTA. No "Send email", no "Send SMS" to guests, no auto-reply. One person approves each draft and sends it from your booking system or email. **Policy choice**, and the point of the whole rung.

**What the AI step does, and does not do:** it drafts the *first notice* (what we know, what we do not know yet, when we will update) from your approved 2a message pack. It does not work out rebooking options. Seats, the all-aboard buffer and walk-off times are a puzzle with exact answers; the duty lead works them out on the 2b rebook board (or by hand with the same rules) and writes the options message after that.

The names below are generic. The line "Look for" says roughly what a step is called today. No Zap template file is included: it would be tied to someone else's account connections.

---

## Before you start (about 1 hour)

1. **A Zapier plan** that allows multi-step Zaps, filters, webhooks and the polling interval you want. Roughly $20 to $30 a month for a small operator (estimate; check current plans). Webhooks by Zapier may need a paid plan.
2. **A Google account** with Google Sheets.
3. **From tool 2a:** your disruption policy sheet and the approved message pack (the first notice for each scenario). **From tool 2b:** your waitlist rule.
4. **A staff alert channel** for the duty lead: email, a text to a staff phone, or your team chat. Staff only, never guests.
5. **Optional AI step:** AI by Zapier, or the Anthropic (Claude), OpenAI or Google AI app with your own key. **Contractual:** check that provider's business data terms first.

## Set up the workbook "Arrival watch" (about 30 minutes)

One Google Sheet, six tabs. Format every date column as `YYYY-MM-DD` and every time column as plain text `HH:MM`, so lookups match exactly.

| Tab | Columns | Who fills it |
|---|---|---|
| `port_schedule` | date, ship, berth, arrive, all_aboard, status, changed_at, changed_by, note, is_soon | Your team, whenever the port agent or a cruise line desk tells you something. status is one of: scheduled, late, anchor, skipped. changed_by holds initials only. |
| `manifest` | date, departure, booking_ref, channel, guests, product, ship, all_aboard, key_ship, key_dep | Exported from your booking system each morning for today and tomorrow. IDs and counts only. |
| `holds` | date, departure, decision, decided_by, decided_at | The duty lead, after the captain's call. decision is "cancelled" or "held N minutes". |
| `approvals` | the 13 columns of `approval-queue-template.csv` | The Zaps add rows; a person fills approved_by, approved_at, sent_by, sent_at. |
| `alerts_seen` | alert_id, seen_at | Optional, Zap 2. |
| `policies` | A1: policy sheet text from 2a. A2: the first-notice texts from your 2a message pack. | The owner. |

Helper formulas (put them in row 2 and fill down, or use ARRAYFORMULA):

- `manifest` key_ship: `=A2&"|"&G2` (date and ship). key_dep: `=A2&"|"&B2` (date and departure).
- `port_schedule` is_soon: `=IF(AND(A2>=TODAY(), A2<=TODAY()+1), "yes", "no")`.

**Do not add guest names, emails, phone numbers or payment details to any tab.** The person who sends a message looks up the contact in the booking system. **Policy choice.** Share the sheet only with staff who already see bookings.

---

## Zap 1: port-schedule change (start here, about 2 hours)

1. **Trigger: a ship row changes.**
   Look for: Google Sheets, "New or Updated Spreadsheet Row", tab `port_schedule`, trigger column `changed_at`. Your team updates changed_at with every change, so one column drives the trigger.
2. **Continue only for today or tomorrow, and only for trouble.**
   Look for: Filter by Zapier. Conditions: is_soon exactly matches `yes`, AND status is in `late, anchor, skipped`.
3. **Find the bookings on that ship.**
   Look for: Google Sheets, "Lookup Spreadsheet Rows (Advanced)" or "Find many rows". Tab `manifest`, lookup column key_ship, value: the trigger row's date, a `|`, and its ship.
4. **Read the policies and the first-notice text.**
   Look for: Google Sheets, "Get Many Spreadsheet Rows" or a lookup on tab `policies`.
5. **Draft the first notice.** Pick one:
   - Template, no AI: Formatter by Zapier, Text, "Replace". Start from your approved first-notice text and replace [SHIP], [NEW ARRIVAL TIME] and [BOOKING REFS] with mapped fields.
   - AI step: paste the AI step prompt from the 2b page (section 3, "The AI step prompt") and map the event line, the booking rows (booking_ref, channel, guests, departure only), the policy sheet and the message pack. Map nothing else.
6. **Guard.**
   Look for: Filter by Zapier. Continue only if the draft text contains `DRAFT - PENDING OWNER REVIEW`.
7. **Add the drafts to the approval sheet.**
   Look for: Google Sheets, "Create Spreadsheet Row(s)", tab `approvals`. queue_id: the run's date and time plus a counter. kind: `desk` for cruise-line bookings (one row per ship), `guest` for direct and OTA bookings. status: `pending`. Leave approved_by, approved_at, sent_by and sent_at empty.
8. **Alert the duty lead.**
   Look for: Email by Zapier, SMS by Zapier, or your team chat app. Text: "Ship [SHIP] is [STATUS]. [N] drafts waiting in approvals. Open the rebook board for options." Staff only.

## Zap 2: weather alert heads-up to the captain (about 1 to 2 hours)

This Zap never drafts a guest message. A weather alert goes to the captain on duty, who makes the call. **Recommendation:** keep it that way; an automation that drafts "trip cancelled" before the captain decides puts pressure on a safety call.

1. **Find your own forecast zone.** On https://www.weather.gov/ open the forecast for your dock or route; the page shows the zone. For the water you operate on, use the marine forecast for your coastal waters and note the zone shown there. You can also open `https://api.weather.gov/points/LAT,LON` in a browser (your latitude and longitude in decimal degrees) and read the `forecastZone` line for the land zone. If unsure, ask your local National Weather Service forecast office. Do not copy a zone code from another business or from this recipe.
2. **Trigger: poll the alerts feed.**
   Look for: Webhooks by Zapier, "Retrieve Poll".
   - URL: `https://api.weather.gov/alerts/active?zone=YOUR_ZONE_ID` (check the API documentation at https://www.weather.gov/documentation/services-web-api for more than one zone).
   - Headers: `User-Agent` set to your business name and a business contact address in brackets, for example `(Your Business Name, ops@yourbusiness.example)`, and `Accept` set to `application/geo+json`. The service asks every caller to identify itself this way; check the current documentation.
   - Key (where the list is): `features`. Deduplication key: `id`, so each alert fires once.
   - How often it polls depends on your Zapier plan.
3. **Continue only for the alert types your captain chose.**
   Look for: Filter by Zapier on the alert's event name. **Policy choice:** sit down with the captain, look at real alerts in the feed for your zone, and copy the event names exactly. Do not guess them.
4. **Alert the captain on duty and the duty lead.** Headline, event, effective and expiry times, the link. Text ends: "Heads-up only. The captain decides."
5. **Optional log.** Google Sheets, "Create Spreadsheet Row" in `approvals` with kind `staff` and status `info`, so the season's alerts are on record.

## Zap 3: hold recorded, then guest drafts (about 1 hour)

1. **Trigger:** Google Sheets, "New Spreadsheet Row", tab `holds` (the duty lead adds the row after the captain's call).
2. **Find the bookings on that departure:** lookup on `manifest`, column key_dep, value date|departure.
3. **Draft the first notice** as in Zap 1, step 5, with the hold or cancellation as the event line.
4. **Guard, add rows to `approvals`, alert the duty lead** as in Zap 1, steps 6 to 8.

## Zap 4: booking-system webhook (about 1 to 2 hours)

1. **Trigger: a booking is created, changed or cancelled.**
   Look for: your booking system's own Zapier app ("New booking", "Booking cancelled"). If it has none but can call a webhook: Webhooks by Zapier, "Catch Hook", and paste the URL Zapier shows into your booking system's webhook settings.
2. **Update the manifest.** Google Sheets, "Create Spreadsheet Row" or "Update Spreadsheet Row". Map only: date, departure, booking_ref, channel, guests, product, ship, all_aboard. **Do not map** names, emails, phone numbers, payment or notes fields. **Policy choice.**
3. **Same-day cancellation:** Filter by Zapier: status is cancelled AND date is today. Then draft a waitlist offer from your waitlist rule (template text), add it to `approvals` with kind `waitlist`, and alert the duty lead: "[N] seats freed on [DEPARTURE]. Waitlist offer drafted."

## Zap 5 (optional, paid): flight status

Skip this until Zaps 1 to 4 work. It needs a paid flight-data API, and it handles guest data.

- **Only for guests who chose to give you a flight number.** Store it in your booking system and in a `flight` column of `manifest`. Never send it to an AI step. **Recommendation:** treat a flight number as guest data.
- **Cost:** the provider charges per lookup or per plan. Lookups a season = guests with a flight number per day x lookups per guest per day x days. For example 10 x 6 x 153 = 9,180 lookups. Multiply by the provider's price, and check its terms. **Contractual.**
- **Steps:** Schedule by Zapier, every 30 minutes in the arrival window. Lookup today's `manifest` rows with a flight number. For each, Webhooks by Zapier, GET to the provider's flight-status URL from their documentation, with your API key where they say. Filter: estimated arrival plus your walk-off time is later than the booked departure. Draft from the "Flight delayed or fog" first notice, add to `approvals`, alert the duty lead.

---

## Test with fictional rows (about 1 hour)

1. In `manifest`, add these fictional rows with **today's date** in place of DATE:

   | date | departure | booking_ref | channel | guests | product | ship | all_aboard |
   |---|---|---|---|---|---|---|---|
   | DATE | 10:30 | TEST-001 | CRUISE | 2 | COMBO | Ship A | 18:30 |
   | DATE | 10:30 | TEST-002 | CRUISE | 1 | COMBO | Ship A | 18:30 |
   | DATE | 13:00 | TEST-003 | CRUISE | 4 | COMBO | Ship A | 18:30 |
   | DATE | 13:00 | TEST-004 | DIRECT | 2 | WHALE | INDEPENDENT | |

2. In `port_schedule`, add Ship A for today: berth DOCK, arrive 10:00, all_aboard 18:30, status scheduled.
3. Change Ship A to arrive 13:00, status late, and update changed_at.
4. **Expect:** Zap 1 adds one `desk` row for Ship A listing TEST-001, TEST-002 and TEST-003, all `pending`; one staff alert; nothing in any Sent folder; TEST-004 untouched.
5. Update changed_at again with no other change. **Expect:** a second set of drafts. Decide whether you want that (a re-alert) or add a filter on status changes only. **Policy choice.**
6. Add a `holds` row for today, departure 13:00, "cancelled". **Expect:** Zap 3 drafts for TEST-003 (desk) and TEST-004 (guest).
7. Compare with the 2b rebook board on the fictional Fri 24 Jul, Ship A 180 minutes late: the same bookings should show up there.
8. Delete every TEST row and test draft. Then point the manifest export at real bookings.

## Every draft: one person approves

Open `approvals`. For each `pending` row: check it against the rebook board or your plan, fill every [FILL], delete the DRAFT line last, send it from your booking system or email, then write your initials in approved_by and sent_by and the times in approved_at and sent_at, and set status `sent`. **Policy choice:** one named person approves each draft, and no Zap ever sends one.

## Errors

- Zapier emails you when a step fails. Check the Zap history every morning in season: a watch that silently stopped is worse than no watch.
- If the approvals step ran but the alert failed, the drafts still wait in the sheet.
- If a lookup finds no bookings, nothing is added. That is correct; it is not an error.

## Running cost (estimate)

- Polling: checks a season = checks per hour x hours a day x days. Every 15 minutes for 14 hours over 153 days is 4 x 14 x 153 = 8,568 checks.
- In Zapier, tasks are usually counted when an action step runs, not when a poll finds nothing. Check how your current plan counts them.
- Each event then uses a few tasks per affected booking (lookup, draft, row, alert).

*AI drafts. A person approves.*
