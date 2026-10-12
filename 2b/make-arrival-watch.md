# Arrival watch in Make: the recipe

From the ATIA Operations Kit, tool 2b Arrival watch and backfill: https://preig.github.io/atiaops/2b/
Teaching data is fictional (Channel Light Excursions, Juneau, and its fictional partner Kestrel Shuttle). Times and costs are estimates. Checked 11 Oct 2026.

> **Status: untested in live accounts.** This recipe is written from Make's documented building blocks and checked for logic only. It has not been run end to end in a real Make account. Module names change. Check each module against Make's help (https://help.make.com/) before you build, and run it on the fictional test rows below before any real booking touches it.

**What you build:** one scenario per watch (port schedule, weather alert, booking system, and optionally flight status), plus one scenario that drafts guest messages after the captain records a hold. Every scenario ends in the same place: rows with status `pending` in an approval sheet, and a staff-only alert to the duty lead.

**What you never build:** a module that sends anything to a guest, a cruise line desk or an OTA. One person approves each draft and sends it from your booking system or email. **Policy choice**, and the point of the whole rung.

**What the AI module does, and does not do:** it drafts the *first notice* (what we know, what we do not know yet, when we will update) from your approved 2a message pack. It does not work out rebooking options. The duty lead works those out on the 2b rebook board (or by hand with the same rules) and writes the options message after that.

The names below are generic. The line "Look for" says roughly what a module is called today. No blueprint file is included: it would be tied to someone else's connections.

---

## Before you start (about 1 hour)

1. **A Make plan** with enough operations (credits) for scheduled scenarios. Roughly $20 to $30 a month for a small operator (estimate; check current plans).
2. **A Google account** with Google Sheets. Read Make's help page on connecting Google first: for some account types it asks you to set up your own Google Cloud connection.
3. **From tool 2a:** your disruption policy sheet and the approved message pack. **From tool 2b:** your waitlist rule.
4. **A staff alert channel** for the duty lead: email, a text to a staff phone, or your team chat. Staff only, never guests.
5. **Optional AI module:** the Anthropic Claude, OpenAI or Gemini app. **Contractual:** check that provider's business data terms first.

## Set up the workbook "Arrival watch" (about 30 minutes)

Use the same workbook as the Zapier recipe: tabs `port_schedule`, `manifest`, `holds`, `approvals`, `policies`. Format dates as `YYYY-MM-DD` and times as plain text `HH:MM`.

| Tab | Columns |
|---|---|
| `port_schedule` | date, ship, berth, arrive, all_aboard, status (scheduled, late, anchor, skipped), changed_at, changed_by (initials), note |
| `manifest` | date, departure, booking_ref, channel, guests, product, ship, all_aboard |
| `holds` | date, departure, decision ("cancelled" or "held N minutes"), decided_by, decided_at |
| `approvals` | the 13 columns of `approval-queue-template.csv` |
| `policies` | A1: policy sheet text from 2a. A2: the first-notice texts from your 2a message pack. |

**Do not add guest names, emails, phone numbers or payment details to any tab.** **Policy choice.** Share the sheet only with staff who already see bookings.

Instead of the Zapier recipe's alert-dedupe tab, Make uses a **data store** (Scenario 2).

---

## Scenario 1: port-schedule change (start here, about 2 hours)

1. **Trigger.** Two ways; pick the one that works in your account:
   - Look for: Google Sheets, a "Watch Changes" trigger. It may ask you to install Make's add-on in the sheet.
   - Or schedule the scenario every 15 minutes and use Google Sheets, "Search Rows" on `port_schedule` where changed_at is later than the scenario's last run (store the last run time in a data store record).
2. **Filter** on the link: date is today or tomorrow, and status is one of `late`, `anchor`, `skipped`.
   Example condition for the date: `formatDate(now; "YYYY-MM-DD")` equal to the row's date, OR `formatDate(addDays(now; 1); "YYYY-MM-DD")` equal to it.
3. **Find the bookings on that ship.** Google Sheets, "Search Rows" on `manifest` where date equals the row's date and ship equals the row's ship. Each booking comes out as its own bundle.
4. **Group by recipient.** Look for: a Router with two routes. Route A: channel equals `CRUISE`, then a Text aggregator that joins booking_ref, guests and departure into one list per ship (group by ship). Route B: channel is not `CRUISE`, one bundle per booking.
5. **Read the policies.** Google Sheets, "Get a Cell" for `policies` A1 and A2.
6. **Draft the first notice.** Pick one:
   - Template, no AI: build the text with Make's text functions, starting from your approved first-notice text and replacing [SHIP], [NEW ARRIVAL TIME] and [BOOKING REFS] with mapped items.
   - AI module: Look for: Anthropic Claude "Create a Prompt" (your own key) or its simple text prompt module, or the OpenAI or Gemini equivalent. Paste the AI step prompt from the 2b page (section 3, "The AI step prompt") and map the event line, the booking list (booking_ref, channel, guests, departure only), the policy sheet and the message pack. Map nothing else.
7. **Guard filter:** continue only if the text contains `DRAFT - PENDING OWNER REVIEW`.
8. **Add the drafts to the approval sheet.** Google Sheets, "Add a Row", tab `approvals`. kind: `desk` on route A, `guest` on route B. status: `pending`. Leave approved_by, approved_at, sent_by and sent_at empty.
9. **Alert the duty lead** (after a Numeric aggregator or a Text aggregator so it fires once per change): "Ship [SHIP] is [STATUS]. [N] drafts waiting in approvals. Open the rebook board for options." Staff only.
10. **Error handling.** Right-click the AI module and the Sheets module, "Add error handler", then "Ignore" or "Break", so one bad bundle does not stop the rest. Turn on error notifications in your Make settings.

## Scenario 2: weather alert heads-up to the captain (about 1 to 2 hours)

This scenario never drafts a guest message. A weather alert goes to the captain on duty, who makes the call. **Recommendation:** keep it that way; an automation that drafts "trip cancelled" before the captain decides puts pressure on a safety call.

1. **Find your own forecast zone.** On https://www.weather.gov/ open the forecast for your dock or route; the page shows the zone. For the water you operate on, use the marine forecast for your coastal waters and note the zone shown there. You can also open `https://api.weather.gov/points/LAT,LON` in a browser (your latitude and longitude in decimal degrees) and read the `forecastZone` line for the land zone. If unsure, ask your local National Weather Service forecast office. Do not copy a zone code from another business or from this recipe.
2. **Schedule** the scenario every 15 minutes in your operating hours (scenario scheduling; check the time zone in your Make settings).
3. **Call the alerts feed.** Look for: HTTP, "Make a request".
   - URL: `https://api.weather.gov/alerts/active?zone=YOUR_ZONE_ID` (check the API documentation at https://www.weather.gov/documentation/services-web-api for more than one zone). Method GET.
   - Headers: `User-Agent` set to your business name and a business contact address in brackets, for example `(Your Business Name, ops@yourbusiness.example)`, and `Accept` set to `application/geo+json`. The service asks every caller to identify itself this way; check the current documentation.
   - Parse response: yes.
4. **Iterator** over `features`.
5. **Skip alerts already seen.** Look for: Data store, "Get a record" with key = the feature's `id`; a filter that continues only if no record was found; then Data store, "Add/replace a record" with that id and the time.
6. **Filter on the alert types your captain chose.** **Policy choice:** look at real alerts in the feed for your zone with the captain and copy the event names exactly. Do not guess them.
7. **Alert the captain on duty and the duty lead:** headline, event, effective and expiry times, the link. Text ends: "Heads-up only. The captain decides."

## Scenario 3: hold recorded, then guest drafts (about 1 hour)

1. **Trigger:** Google Sheets, "Watch Rows" (new rows) on tab `holds`. The duty lead adds the row after the captain's call.
2. **Find the bookings on that departure:** "Search Rows" on `manifest` where date and departure match.
3. Continue as Scenario 1, steps 4 to 10, with the hold or cancellation as the event line.

## Scenario 4: booking-system webhook (about 1 to 2 hours)

1. **Trigger.** Look for: your booking system's own Make app ("watch bookings", "watch cancellations"). If it has none but can call a webhook: Webhooks, "Custom webhook", and paste the address Make shows into your booking system's webhook settings.
2. **Update the manifest:** Google Sheets, "Add a Row" or "Update a Row". Map only: date, departure, booking_ref, channel, guests, product, ship, all_aboard. **Do not map** names, emails, phone numbers, payment or notes fields. **Policy choice.**
3. **Same-day cancellation:** filter on status cancelled and date today. Then draft a waitlist offer from your waitlist rule (template text), add it to `approvals` with kind `waitlist`, and alert the duty lead: "[N] seats freed on [DEPARTURE]. Waitlist offer drafted."

## Scenario 5 (optional, paid): flight status

Skip this until Scenarios 1 to 4 work. It needs a paid flight-data API, and it handles guest data.

- **Only for guests who chose to give you a flight number.** Store it in your booking system and in a `flight` column of `manifest`. Never send it to an AI module. **Recommendation:** treat a flight number as guest data.
- **Cost:** lookups a season = guests with a flight number per day x lookups per guest per day x days. For example 10 x 6 x 153 = 9,180 lookups. Multiply by the provider's price, and check its terms. **Contractual.**
- **Modules:** schedule every 30 minutes in the arrival window; "Search Rows" for today's manifest rows with a flight number; HTTP "Make a request" to the provider's flight-status URL from their documentation, with your API key where they say; a filter for estimated arrival plus your walk-off time later than the booked departure; draft from the "Flight delayed or fog" first notice; add to `approvals`; alert the duty lead.

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
3. Change Ship A to arrive 13:00, status late, update changed_at, and click "Run once" on Scenario 1.
4. **Expect:** one `desk` row for Ship A listing TEST-001, TEST-002 and TEST-003, `pending`; one staff alert; nothing in any Sent folder; TEST-004 untouched.
5. Click "Run once" again with no change. **Expect:** nothing new (Scenario 1 only picks rows changed since the last run).
6. Add a `holds` row for today, departure 13:00, "cancelled", and run Scenario 3. **Expect:** drafts for TEST-003 (desk) and TEST-004 (guest).
7. Compare with the 2b rebook board on the fictional Fri 24 Jul, Ship A 180 minutes late: the same bookings should show up there.
8. Delete every TEST row, test draft and data store record. Then point the manifest export at real bookings.

## Every draft: one person approves

Open `approvals`. For each `pending` row: check it against the rebook board or your plan, fill every [FILL], delete the DRAFT line last, send it from your booking system or email, then write your initials in approved_by and sent_by and the times in approved_at and sent_at, and set status `sent`. **Policy choice:** one named person approves each draft, and no scenario ever sends one.

## Running cost (estimate)

- Scheduled runs a season = runs per hour x hours a day x days. Every 15 minutes for 14 hours over 153 days is 4 x 14 x 153 = 8,568 runs per scheduled scenario.
- In Make, a scheduled run usually uses at least one operation even when it finds nothing. Check how your current plan counts them, and widen the interval outside your busy hours if the count is too high.
- Each event then uses a few operations per affected booking (search, draft, row, alert).

*AI drafts. A person approves.*
