/* 2c Disruption re-planner and loss ledger: pure logic, no page access, no network.
 * Used by index.html (as window.ReplanCore) and by the Node tests in dev/ (require).
 * The timing rules are the same as replanner/disruption/model.py:
 *   ready  = arrival + delay + minutes to the meeting point      (must be no later than the departure)
 *   back   = departure + tour minutes + road delay              (dock to dock)
 *   margin = all-aboard - back                                  (must be at least the buffer)
 */
(function (root) {
  "use strict";
  var R = {};

  function str(v) { return v === undefined || v === null ? "" : String(v).trim(); }

  /* "8:00" or "08:00" -> 480; anything else -> null */
  R.parseTime = function (v) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(str(v));
    if (!m) return null;
    var h = +m[1], mm = +m[2];
    if (h > 23 || mm > 59) return null;
    return h * 60 + mm;
  };

  /* 480 -> "8:00" (times past midnight say "next day") */
  R.fmt = function (t) {
    var neg = t < 0, a = Math.abs(t), day = Math.floor(a / 1440), m = a % 1440;
    var s = (neg ? "-" : "") + Math.floor(m / 60) + ":" + (m % 60 < 10 ? "0" : "") + (m % 60);
    return day > 0 && !neg ? s + " next day" : s;
  };

  /* 780 -> "13:00 (1 pm)" */
  R.guestTime = function (t) {
    var h = Math.floor(t / 60) % 24, m = t % 60, h12 = h % 12 || 12, suf = h < 12 ? "am" : "pm";
    return R.fmt(t) + " (" + h12 + (m ? ":" + (m < 10 ? "0" : "") + m : "") + " " + suf + ")";
  };

  /* Whole minutes, 0 or more. Blank gives the fallback. Returns {value} or {error}. */
  R.minutes = function (v, label, fallback, max) {
    var s = str(v);
    if (s === "") return fallback === undefined ? { error: label + ": type a number of minutes." } : { value: fallback };
    if (!/^\d+$/.test(s)) return { error: label + ": use whole minutes, 0 or more (no minus sign, no decimals)." };
    var n = parseInt(s, 10);
    if (max !== undefined && n > max) return { error: label + ": " + n + " minutes is more than " + max + ". Check the number." };
    return { value: n };
  };

  /* "8:00, 10:30, 13:00" -> {list:[480,630,780]} or {error} */
  R.parseDepartures = function (v) {
    var parts = str(v).split(/[\s,;]+/).filter(Boolean), out = [], bad = [];
    parts.forEach(function (p) { var t = R.parseTime(p); if (t === null) bad.push(p); else if (out.indexOf(t) < 0) out.push(t); });
    if (!parts.length) return { error: "Departure times: type at least one, for example 8:00, 10:30, 13:00, 15:30." };
    if (bad.length) return { error: "Departure times: " + bad.join(", ") + " is not a time like 8:00 or 13:30." };
    out.sort(function (a, b) { return a - b; });
    return { list: out };
  };

  /* The feasibility check for one cruise party. Returns {errors:[...]} or the full result. */
  R.feasibility = function (inp) {
    var errors = [];
    var arrival = R.parseTime(inp.arrival), aa = R.parseTime(inp.allAboard);
    if (arrival === null) errors.push("Ship arrival: type a time like 7:30.");
    if (aa === null) errors.push("All-aboard: type a time like 17:00.");
    var delay = R.minutes(inp.delay, "Delay", 0, 720), walk = R.minutes(inp.toMeeting, "Minutes to your meeting point", 0, 240),
      buffer = R.minutes(inp.buffer, "Buffer", undefined, 480), tour = R.minutes(inp.tour, "Tour length", undefined, 1440),
      road = R.minutes(inp.road, "Road delay", 0, 480), deps = R.parseDepartures(inp.departures);
    [delay, walk, buffer, tour, road].forEach(function (x) { if (x.error) errors.push(x.error); });
    if (deps.error) errors.push(deps.error);
    if (!tour.error && tour.value === 0) errors.push("Tour length: type the minutes from leaving the meeting point to being back, more than 0.");
    if (arrival !== null && aa !== null && aa <= arrival) errors.push("All-aboard must be later than the ship's arrival.");
    if (errors.length) return { errors: errors };

    var ready = arrival + delay.value + walk.value;
    var latest = aa - buffer.value - tour.value - road.value;     // latest departure that still keeps the buffer
    var rows = deps.list.map(function (d) {
      var back = d + tour.value + road.value, margin = aa - back, verdict, why;
      if (ready > d) { verdict = "no"; why = "Leaves before the guests can be there (ready " + R.fmt(ready) + ")."; }
      else if (margin < 0) { verdict = "no"; why = "Back after all-aboard."; }
      else if (margin < buffer.value) { verdict = "no"; why = "Back " + margin + " minutes before all-aboard: inside the " + buffer.value + "-minute buffer."; }
      else { verdict = "yes"; why = "Works: " + margin + " minutes to spare before all-aboard."; }
      return { departure: d, back: back, margin: margin, works: verdict === "yes", why: why };
    });
    var works = rows.filter(function (r) { return r.works; }).map(function (r) { return r.departure; });
    var summary;
    if (works.length) summary = "A guest from this ship can still make: " + works.map(R.fmt).join(", ") + ".";
    else if (latest < ready) summary = "No departure time can work today: the guests are ready at " + R.fmt(ready) +
      ", but a tour would have to leave by " + R.fmt(latest) + " to be back with the buffer.";
    else summary = "None of these departures works. Any departure from " + R.fmt(ready) + " to " + R.fmt(latest) + " would.";
    return {
      errors: [], ready: ready, latest: latest, rows: rows, works: works, summary: summary,
      window: latest >= ready ? { from: ready, to: latest } : null
    };
  };

  /* Number 3 from counts. Returns {rate} or {error}. */
  R.recoveryRate = function (recovered, affected) {
    var a = R.minutes(recovered, "Recovered guests"), b = R.minutes(affected, "Guests affected");
    if (a.error || b.error) return { error: "Type two whole numbers, 0 or more." };
    if (b.value === 0) return { error: "Guests affected must be more than 0." };
    if (a.value > b.value) return { error: "Recovered guests cannot be more than guests affected." };
    return { rate: a.value / b.value };
  };

  /* "Is it for you": three answers -> {level: "start" | "maybe" | "fit", text} or null until all answered */
  R.fitCheck = function (a) {
    if (!a || !a.freq || !a.data || !a.who) return null;
    if (a.freq === "rare" || a.data === "no") {
      return { level: "start", text: "Start lower on the ladder. Write the playbook in 2a and set up the arrival watch in 2b. Keep a disruption log this season (one row per event, with staff hours); next fall the loss ledger can turn it into your cost of poor quality." };
    }
    if (a.who === "nobody" || a.data === "unsure") {
      return { level: "maybe", text: "Possible, with homework. Use the feasibility checker below to write down which departures each ship can make, and ask your booking platform in writing for an export with departure, party size and net. The ledger is the easier first step: it needs only a disruption log and a bookings export once a season." };
    }
    return { level: "fit", text: "A good fit. Download the bundle, run both demos on the fictional data, then try one past disruption day of your own. Plan 2 to 6 weeks with a developer or analyst to connect your exports (estimate)." };
  };

  if (typeof module !== "undefined" && module.exports) module.exports = R;
  else root.ReplanCore = R;
})(this);
