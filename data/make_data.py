#!/usr/bin/env python3
"""Deterministic fictional teaching data for the ATIA Operations Kit.

Business: Channel Light Excursions, Juneau. FICTIONAL TEACHING BUSINESS.
Every ship, booking, staff record and number here is invented. No real people,
no real ships, no real schedules. Run:  python make_data.py   (writes CSVs beside it)

Files written:
  bookings_2026.csv         one row per booking (no names, no contact data)
  disruptions_2026.csv      one row per transit / weather disruption event
  allocation_2026.csv       one row per day: glacier allocation, use, turned-away estimates
                            (turned_away_combo_est = turned_away_at_cap + turned_away_seats_or_timing;
                             at_cap: the allocation was used up and the guest declined whale-only;
                             seats_or_timing: no departure had seats or fitted the ship's all-aboard time)
  port_schedule_2026.csv    fictional ship calls with all-aboard times
  port_schedule_2027.csv    next season's fictional schedule (for planning tools)
  staff_2026.csv            one row per seasonal hire (IDs only)
  exit_notes_2026.csv       de-identified season-end notes (free text)
  summary_2026.json         the headline numbers every page and slide uses
"""
import csv, json, random, math, datetime as dt
from pathlib import Path

OUT = Path(__file__).resolve().parent
R = random.Random(20261014)

SEASON_START = dt.date(2026, 5, 1)
SEASON_END = dt.date(2026, 9, 30)
DEPARTURES = ["08:00", "10:30", "13:00", "15:30"]
SEATS = 30                     # per departure (fictional vessel certificate limit)
ALLOC_PER_DAY = 100            # fictional glacier commercial-use allocation, guest visits per day
PRICE = {"COMBO": {"adult": 219, "child": 169}, "WHALE": {"adult": 159, "child": 119}}
NET_SHARE = {"CRUISE": 0.62, "OTA": 0.75, "DIRECT": 0.97}   # fictional contracts: share of ticket kept
CAP_WEEKDAY, CAP_SATURDAY = 16000, 12000                     # daily passenger limits used in the teaching example

def days(a, b):
    d = a
    while d <= b:
        yield d
        d += dt.timedelta(days=1)

def season_weight(d):
    """Demand shape: thin in early May and late September, peak late June to mid August."""
    x = (d - SEASON_START).days / (SEASON_END - SEASON_START).days
    return 0.35 + 0.75 * math.exp(-((x - 0.5) / 0.26) ** 2)

# ---------------------------------------------------------------- port schedule
SHIPS = [("Ship A", 4200), ("Ship B", 3900), ("Ship C", 3100), ("Ship D", 2600), ("Ship E", 2400),
         ("Ship F", 2100), ("Ship G", 1900), ("Ship H", 1300), ("Ship I", 900), ("Ship J", 600)]

def port_schedule(year):
    rows = []
    start, end = dt.date(year, 5, 1), dt.date(year, 9, 30)
    for d in days(start, end):
        w = season_weight(dt.date(2026, d.month, d.day))
        n = max(1, min(6, round(1 + 4.6 * w + R.uniform(-0.8, 0.8))))
        if d.weekday() == 5:
            n = max(1, n - 2)
        cap = CAP_SATURDAY if d.weekday() == 5 else CAP_WEEKDAY
        picks = R.sample(SHIPS, n)
        total = 0
        for i, (name, pax) in enumerate(sorted(picks, key=lambda s: -s[1])):
            est = int(pax * R.uniform(0.9, 1.0))
            if total + est > cap:
                est = max(0, cap - total)
            if est == 0:
                continue
            total += est
            berth = "DOCK" if i < 4 else "ANCHOR"
            arr_h = R.choice([7, 7, 8, 9, 10, 11, 12, 13])
            stay = R.choice([7, 8, 9, 9, 10])
            arrive = dt.datetime.combine(d, dt.time(arr_h, R.choice([0, 30])))
            depart = arrive + dt.timedelta(hours=stay)
            all_aboard = depart - dt.timedelta(minutes=30)
            rows.append({"date": d.isoformat(), "weekday": d.strftime("%a"), "ship": name, "berth": berth,
                         "arrive": arrive.strftime("%H:%M"), "depart": depart.strftime("%H:%M"),
                         "all_aboard": all_aboard.strftime("%H:%M"), "est_passengers": est,
                         "daily_cap": cap})
    return rows

# ---------------------------------------------------------------- bookings + disruptions + allocation
CAUSES = [("Ship late or tendering from anchor", 14), ("Marine weather hold", 9), ("Flight delay or fog (independent guests)", 7),
          ("Road or traffic delay on the shuttle route", 5), ("Ship schedule change or skipped call", 3)]

def build_bookings(sched):
    by_day = {}
    for r in sched:
        by_day.setdefault(r["date"], []).append(r)
    bookings, alloc_rows = [], []
    seq = 0
    for d in days(SEASON_START, SEASON_END):
        ds = d.isoformat()
        ships = by_day.get(ds, [])
        pax = sum(s["est_passengers"] for s in ships)
        w = season_weight(d)
        # requested combo guests: cruise demand scales with passengers in port, independents with season
        want_combo = int(pax * 0.0068 + 52 * w + R.uniform(-8, 8))
        want_whale = int(14 * w + R.uniform(0, 6))
        combo_left = ALLOC_PER_DAY
        seats_left = {t: SEATS for t in DEPARTURES}
        used_combo = used_whale = turned = turned_cap = 0
        demand = []
        for _ in range(max(0, want_combo)):
            demand.append("COMBO")
        for _ in range(max(0, want_whale)):
            demand.append("WHALE")
        R.shuffle(demand)
        # group guests into parties of 1 to 5
        i = 0
        while i < len(demand):
            size = min(len(demand) - i, R.choice([1, 2, 2, 2, 3, 4, 4, 5]))
            prod = demand[i]
            i += size
            chan = R.choices(["CRUISE", "OTA", "DIRECT"], weights=[52, 23, 25])[0]
            if chan == "CRUISE" and ships:
                ship = R.choice(ships)
                ok = [t for t in DEPARTURES if t >= ship["arrive"] and
                      (dt.datetime.strptime(t, "%H:%M") + dt.timedelta(hours=4, minutes=30)).strftime("%H:%M") <= ship["all_aboard"]]
                ship_name, aa = ship["ship"], ship["all_aboard"]
            else:
                chan = "OTA" if chan == "CRUISE" else chan
                ok, ship_name, aa = DEPARTURES[:], "INDEPENDENT", ""
            ok = [t for t in ok if seats_left[t] >= size]
            if not ok:
                turned += size if prod == "COMBO" else 0
                continue
            if prod == "COMBO" and combo_left < size:
                # cap binds: offer whale-only; about half accept
                if R.random() < 0.5:
                    prod = "WHALE"
                else:
                    turned += size
                    turned_cap += size
                    continue
            t = R.choice(ok)
            seats_left[t] -= size
            if prod == "COMBO":
                combo_left -= size; used_combo += size
            else:
                used_whale += size
            children = R.choice([0, 0, 0, 1, 2]) if size >= 2 else 0
            children = min(children, size - 1)
            adults = size - children
            gross = adults * PRICE[prod]["adult"] + children * PRICE[prod]["child"]
            seq += 1
            bookings.append({"booking_ref": f"CL-26-{seq:05d}", "date": ds, "weekday": d.strftime("%a"), "departure": t,
                             "product": prod, "channel": chan, "adults": adults, "children": children, "guests": size,
                             "gross": gross, "net": round(gross * NET_SHARE[chan], 2), "ship": ship_name, "all_aboard": aa,
                             "lead_days": R.choice([0, 1, 3, 7, 14, 30, 45, 60, 90, 120]),
                             "status": "COMPLETED", "disruption_cause": "", "event_id": ""})
        alloc_rows.append({"date": ds, "weekday": d.strftime("%a"), "ships_in_port": len(ships), "passengers_in_port": pax,
                           "allocation": ALLOC_PER_DAY, "combo_guests": used_combo, "whale_only_guests": used_whale,
                           "unused_allocation": ALLOC_PER_DAY - used_combo, "turned_away_combo_est": turned,
                           "turned_away_at_cap": turned_cap, "turned_away_seats_or_timing": turned - turned_cap})
    # ordinary cancellations and no-shows
    for b in bookings:
        u = R.random()
        if u < 0.035:
            b["status"] = "CANCELLED_GUEST"
        elif u < 0.05:
            b["status"] = "NO_SHOW"
    # disruption events
    events = []
    eid = 0
    pool = [b for b in bookings if b["status"] == "COMPLETED"]
    for cause, n in CAUSES:
        for _ in range(n):
            eid += 1
            if "independent" in cause:
                cand = [b for b in pool if b["ship"] == "INDEPENDENT" and not b["event_id"]]
            elif "Ship" in cause:
                cand = [b for b in pool if b["ship"] != "INDEPENDENT" and not b["event_id"]]
            else:
                cand = [b for b in pool if not b["event_id"]]
            seed = R.choice(cand)
            if "Marine weather" in cause:
                hit = [b for b in pool if b["date"] == seed["date"] and b["departure"] == seed["departure"] and not b["event_id"]]
            elif "Ship" in cause:
                hit = [b for b in pool if b["date"] == seed["date"] and b["ship"] == seed["ship"] and not b["event_id"]]
            else:
                hit = [b for b in pool if b["date"] == seed["date"] and b["departure"] == seed["departure"] and not b["event_id"]]
                hit = hit[: max(1, len(hit) // 2)]
            reb = ref = fill = 0
            for b in hit:
                v = R.random()
                b["event_id"] = f"E{eid:02d}"
                b["disruption_cause"] = cause
                if v < 0.22:
                    b["status"] = "DISRUPTED_REBOOKED"; reb += b["guests"]
                elif v < 0.36:
                    b["status"] = "DISRUPTED_REFILLED"; fill += b["guests"]
                else:
                    b["status"] = "DISRUPTED_REFUNDED"; ref += b["guests"]
            g = sum(b["guests"] for b in hit)
            events.append({"event_id": f"E{eid:02d}", "date": seed["date"], "cause": cause, "departure": seed["departure"],
                           "bookings_affected": len(hit), "guests_affected": g, "guests_rebooked": reb,
                           "guests_seat_refilled": fill, "guests_refunded": ref,
                           "net_revenue_lost": round(sum(b["net"] for b in hit if b["status"] == "DISRUPTED_REFUNDED"), 2),
                           "staff_hours": round(R.uniform(1.5, 6.0), 1)})
    events.sort(key=lambda e: (e["date"], e["departure"]))
    return bookings, events, alloc_rows

# ---------------------------------------------------------------- staff
ROLES = [("Captain", 3), ("Deckhand", 5), ("Naturalist guide", 6), ("Dock coordinator", 5), ("Reservations", 3)]
CHANNELS = ["RETURNING", "REFERRAL", "J1_SPONSOR", "JOB_BOARD", "LOCAL"]
EXIT_THEMES = {
    "housing": ["Staff housing was crowded and far from the harbor.", "Rent for a shared room ate most of my tips.",
                "Housing was fine but I could not find a place for my partner."],
    "hours": ["Too many 12-hour ship days in a row in July.", "Schedule came out too late to plan days off.",
              "Some weeks had 55 hours, some had 20."],
    "pay": ["Pay was fine for Juneau but not after rent.", "A returning bonus would bring me back."],
    "training": ["I learned the dock routine from whoever was free that day.", "Nobody told me the ship-late procedure until it happened.",
                 "The first week was shadowing with no checklist."],
    "manager": ["Leads were great once the season settled.", "Feedback only came when something went wrong."],
    "work": ["Loved the guests and the whales.", "The naturalist script got stale; I wanted to add my own material.",
             "Seasickness on rough days made deck work hard."],
    "life": ["Going back to school in August.", "Family reasons, would come back next year.", "Taking a year-round job in Anchorage."],
}

def build_staff():
    rows, notes = [], []
    sid = 0
    hires_needed = []
    for role, n in ROLES:
        hires_needed += [role] * n
    returning_slots = set(R.sample(range(len(hires_needed)), 6))
    for i, role in enumerate(hires_needed):
        sid += 1
        ret = i in returning_slots
        chan = "RETURNING" if ret else R.choices(CHANNELS[1:], weights=[3, 6, 4, 3])[0]
        start = dt.date(2026, 4, R.randint(14, 28))
        left_early = (not ret) and R.random() < 0.31
        if left_early:
            end = start + dt.timedelta(days=R.randint(6, 29))
        else:
            end = dt.date(2026, 9, R.randint(15, 30)) if R.random() > 0.12 else dt.date(2026, 8, R.randint(5, 25))
        rows.append({"staff_id": f"S{sid:02d}", "role": role, "returning": "Y" if ret else "N", "hire_channel": chan,
                     "start_date": start.isoformat(), "end_date": end.isoformat(),
                     "left_in_first_30_days": "Y" if left_early else "N",
                     "finished_season": "Y" if end >= dt.date(2026, 9, 15) else "N",
                     "eligible_rehire": "Y" if (end >= dt.date(2026, 9, 15) and R.random() > 0.1) else "N",
                     "avg_weekly_hours": R.choice([38, 42, 46, 48, 50, 52, 55]),
                     "longest_run_days_without_day_off": R.choice([5, 6, 6, 7, 8, 9, 11, 12])})
    # replacements for early quits
    early = [r for r in rows if r["left_in_first_30_days"] == "Y"]
    for r in early:
        sid += 1
        start = dt.date.fromisoformat(r["end_date"]) + dt.timedelta(days=R.randint(7, 18))
        rows.append({"staff_id": f"S{sid:02d}", "role": r["role"], "returning": "N", "hire_channel": R.choice(["REFERRAL", "JOB_BOARD", "LOCAL"]),
                     "start_date": start.isoformat(), "end_date": dt.date(2026, 9, R.randint(15, 30)).isoformat(),
                     "left_in_first_30_days": "N", "finished_season": "Y", "eligible_rehire": "Y",
                     "avg_weekly_hours": R.choice([42, 46, 48, 50]), "longest_run_days_without_day_off": R.choice([5, 6, 7, 9])})
    themes = list(EXIT_THEMES)
    for k in range(30):
        th = R.choices(themes, weights=[6, 5, 3, 5, 2, 4, 3])[0]
        notes.append({"note_id": f"N{k+1:02d}", "role": R.choice([r for r, _ in ROLES]),
                      "would_return": R.choice(["yes", "maybe", "maybe", "no"]),
                      "note": R.choice(EXIT_THEMES[th])})
    return rows, notes

def write(name, rows):
    with open(OUT / name, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)

def main():
    s26 = port_schedule(2026)
    s27 = port_schedule(2027)
    bookings, events, alloc = build_bookings(s26)
    staff, notes = build_staff()
    write("port_schedule_2026.csv", s26); write("port_schedule_2027.csv", s27)
    write("bookings_2026.csv", bookings); write("disruptions_2026.csv", events)
    write("allocation_2026.csv", alloc); write("staff_2026.csv", staff); write("exit_notes_2026.csv", notes)

    done = [b for b in bookings if b["status"] in ("COMPLETED", "DISRUPTED_REBOOKED", "DISRUPTED_REFILLED")]
    guests = sum(b["guests"] for b in done)
    net = sum(b["net"] for b in done)
    combo_rev = sum(b["net"] for b in done if b["product"] == "COMBO")
    alloc_total = sum(a["allocation"] for a in alloc)
    alloc_used = sum(a["combo_guests"] for a in alloc)
    dis_g = sum(e["guests_affected"] for e in events)
    dis_rec = sum(e["guests_rebooked"] + e["guests_seat_refilled"] for e in events)
    new_hires = [r for r in staff if r["returning"] == "N"]
    early = [r for r in staff if r["left_in_first_30_days"] == "Y"]
    summary = {
        "business": "Channel Light Excursions, Juneau (FICTIONAL TEACHING BUSINESS)",
        "season": "May 1 to September 30, 2026 (153 days)",
        "departures_per_day": len(DEPARTURES), "seats_per_departure": SEATS,
        "seat_capacity_season": SEATS * len(DEPARTURES) * 153,
        "guests_served": guests, "net_revenue": round(net),
        "avg_net_per_guest": round(net / guests, 2),
        "allocation_per_day": ALLOC_PER_DAY, "allocation_season": alloc_total, "allocation_used": alloc_used,
        "allocation_used_pct": round(100 * alloc_used / alloc_total, 1),
        "combo_net_revenue": round(combo_rev), "revenue_per_allocated_slot": round(combo_rev / alloc_total, 2),
        "days_cap_binding": sum(1 for a in alloc if a["unused_allocation"] <= 5),
        "turned_away_combo_est": sum(a["turned_away_combo_est"] for a in alloc),
        "turned_away_at_cap": sum(a["turned_away_at_cap"] for a in alloc),
        "turned_away_seats_or_timing": sum(a["turned_away_seats_or_timing"] for a in alloc),
        "days_below_cap": sum(1 for a in alloc if a["unused_allocation"] > 5),
        "unused_allocation_below_cap": sum(a["unused_allocation"] for a in alloc if a["unused_allocation"] > 5),
        "combo_guests_on_capped_days": sum(a["combo_guests"] for a in alloc if a["unused_allocation"] <= 5),
        "turned_away_seats_or_timing_on_capped_days": sum(a["turned_away_seats_or_timing"] for a in alloc if a["unused_allocation"] <= 5),
        "turned_away_seats_or_timing_below_cap": sum(a["turned_away_seats_or_timing"] for a in alloc if a["unused_allocation"] > 5),
        "combo_net_per_guest": round(combo_rev / sum(b["guests"] for b in done if b["product"] == "COMBO"), 2),
        "whale_only_net_per_guest": round(sum(b["net"] for b in done if b["product"] == "WHALE") / sum(b["guests"] for b in done if b["product"] == "WHALE"), 2),
        "disruption_events": len(events), "guests_disrupted": dis_g, "guests_recovered": dis_rec,
        "disruption_recovery_rate_pct": round(100 * dis_rec / dis_g, 1),
        "net_revenue_lost_disruption": round(sum(e["net_revenue_lost"] for e in events)),
        "disruption_staff_hours": round(sum(e["staff_hours"] for e in events), 1),
        "seasonal_positions": sum(n for _, n in ROLES),
        "hires_total": len([r for r in staff if r["returning"] == "N"]),
        "returning_staff": len([r for r in staff if r["returning"] == "Y"]),
        "early_quits_first_30_days": len(early),
        "early_quit_rate_pct": round(100 * len(early) / len(new_hires), 1),
        "eligible_to_return_2027": len([r for r in staff if r["eligible_rehire"] == "Y"]),
    }
    (OUT / "summary_2026.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))

if __name__ == "__main__":
    main()
