/* 3a Fill every capped slot: pure logic, no page access, no network.
 * Used by index.html (as window.SlotsCore) and by the Node tests in dev/ (require).
 * Deterministic: the same CSV and settings always give the same summary and prompt.
 */
(function (root) {
  "use strict";
  var S = {};

  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DOW = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  var DOW_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  S.MONTHS = MONTHS; S.DOW = DOW; S.DOW_SHORT = DOW_SHORT;
  S.MAX_ROWS = 5000;
  S.DEFAULTS = { rps: 115.67, thr: 5, fill: 30 };

  function str(v) { return v === undefined || v === null ? "" : String(v); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /* ---------- number formatting (manual, so Node and every browser agree) ---------- */
  S.fmtInt = function (n) {
    if (n === null || n === undefined || !isFinite(n)) return "n/a";
    var neg = n < 0, s = String(Math.round(Math.abs(n)));
    return (neg ? "-" : "") + s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  S.fmtMoney = function (n, cents) {
    if (n === null || n === undefined || !isFinite(n)) return "n/a";
    if (!cents) return "$" + S.fmtInt(n);
    var r = Math.round(n * 100) / 100, whole = Math.floor(r), c = Math.round((r - whole) * 100);
    return "$" + S.fmtInt(whole) + "." + pad(c);
  };
  /* raw percentage (0 to 100+) to text with dec decimals */
  S.pctText = function (p, dec) {
    if (p === null || p === undefined || !isFinite(p)) return "n/a";
    var f = Math.pow(10, dec || 0);
    return (Math.round(p * f) / f).toFixed(dec || 0) + "%";
  };
  function pct(a, b) { return b > 0 ? (100 * a) / b : null; }
  S.pct = pct;

  /* ---------- CSV ---------- */
  function detectDelim(firstLine) {
    var best = ",", bestN = 0;
    [",", ";", "\t"].forEach(function (d) {
      var n = 0, q = false;
      for (var i = 0; i < firstLine.length; i++) { var c = firstLine[i]; if (c === '"') q = !q; else if (!q && c === d) n++; }
      if (n > bestN) { best = d; bestN = n; }
    });
    return best;
  }
  S.detectDelim = detectDelim;

  /* RFC 4180 style: quoted fields, doubled quotes, delimiters and line breaks inside quotes, CRLF, BOM.
     Rows that are entirely blank are dropped. Each row array carries .line, the line it started on. */
  S.parseCSV = function (text, delim) {
    text = str(text).replace(/\r\n?/g, "\n").replace(/^\uFEFF/, "");
    delim = delim || detectDelim(text.split("\n")[0] || "");
    var rows = [], row = [], field = "", q = false, line = 1, start = 1;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
        else { if (c === "\n") line++; field += c; }
      } else if (c === '"') q = true;
      else if (c === delim) { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); row.line = start; rows.push(row); row = []; field = ""; line++; start = line; }
      else field += c;
    }
    if (field !== "" || row.length) { row.push(field); row.line = start; rows.push(row); }
    return rows.filter(function (r) { return r.some(function (f) { return f.trim() !== ""; }); });
  };

  S.csvCell = function (v) {
    var s = str(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  S.toCSV = function (rows) { return rows.map(function (r) { return r.map(S.csvCell).join(","); }).join("\n") + "\n"; };

  /* ---------- columns ---------- */
  S.normHeader = function (h) {
    return str(h).replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  };
  var COLS = [
    ["date", /^(date|day|service_date|visit_date|trip_date|tour_date)$/],
    ["allocation", /^(allocation|allocated|allocated_slots|daily_allocation|allocation_per_day|slots_allocated|permit_slots|cap|daily_cap|limit|daily_limit)$/],
    ["used", /^(used|slots_used|used_slots|allocation_used|combo_guests|guest_visits|visits|actual_use|actual_visits|actual)$/],
    ["no_shows", /^(no_shows?|noshows?|no_show_guests|no_show_slots)$/],
    ["turned_away", /^(turned_away|turned_away_total|turned_away_est|turned_away_combo_est|turnaways?|declined|requests_declined)$/],
    ["turned_away_at_cap", /^(turned_away_at_cap|turned_away_cap|at_cap_turned_away|declined_at_cap)$/],
    ["turned_away_seats_or_timing", /^(turned_away_seats_or_timing|turned_away_seats|turned_away_timing|turned_away_no_seats|declined_seats_or_timing)$/]
  ];
  S.COLS = COLS;
  S.REQUIRED = ["date", "allocation", "used"];

  /* ---------- cells ---------- */
  S.parseDate = function (v) {
    var s = str(v).trim().replace(/^"|"$/g, "");
    var t = /^(\S+)[ T]\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?Z?$/.exec(s); if (t) s = t[1];
    var y, m, d, a;
    if ((a = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/.exec(s))) { y = +a[1]; m = +a[2]; d = +a[3]; }
    else if ((a = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(s))) { m = +a[1]; d = +a[2]; y = +a[3]; if (a[3].length === 2) y += 2000; }
    else return null;
    var ms = Date.UTC(y, m - 1, d), dt = new Date(ms);
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return y + "-" + pad(m) + "-" + pad(d);
  };
  /* Monday = 0 ... Sunday = 6 */
  S.dowOf = function (iso) {
    var p = iso.split("-");
    return (new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay() + 6) % 7;
  };
  /* whole, non-negative counts. Returns {value} (null when blank) or {error} */
  S.parseCount = function (v) {
    var s = str(v).trim();
    if (s === "") return { value: null };
    if (/^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, "");
    if (/^-\s*\d/.test(s)) return { error: "is negative" };
    if (/^\d+(\.0+)?$/.test(s)) return { value: parseInt(s, 10) };
    if (/^\d*\.\d+$/.test(s)) return { error: "is not a whole number" };
    return { error: "is not a number" };
  };

  function short(s) { s = str(s).trim(); return s.length > 24 ? s.slice(0, 24) + "..." : s; }

  /* ---------- read an allocation CSV ---------- */
  S.readAllocation = function (text) {
    var res = { rows: [], errors: [], warnings: [], columns: {}, ignored: [], error: "", dataLines: 0 };
    if (!str(text).trim()) { res.error = "empty"; return res; }
    var table = S.parseCSV(text);
    if (!table.length) { res.error = "empty"; return res; }
    var head = table[0], norm = head.map(S.normHeader), idx = {};
    norm.forEach(function (h, i) {
      for (var k = 0; k < COLS.length; k++) {
        if (!(COLS[k][0] in idx) && COLS[k][1].test(h)) { idx[COLS[k][0]] = i; res.columns[COLS[k][0]] = head[i].trim(); return; }
      }
      if (h) res.ignored.push(head[i].trim());
    });
    var missing = S.REQUIRED.filter(function (k) { return !(k in idx); });
    if (missing.length) {
      if (S.parseDate(head[0])) res.error = "The first row needs column names: date, allocation and used. Add a header row and try again.";
      else res.error = "Missing column" + (missing.length > 1 ? "s" : "") + ": " + missing.join(", ") +
        ". The file needs columns named date, allocation and used (combo_guests or slots_used also work). Found: " +
        head.map(function (h) { return h.trim() || "(blank)"; }).join(", ") + ".";
      return res;
    }
    if (table.length - 1 > S.MAX_ROWS) { res.error = "That file has " + S.fmtInt(table.length - 1) + " rows. The page reads up to " + S.fmtInt(S.MAX_ROWS) + " (one row per day for about 13 years)."; return res; }
    var hasCap = "turned_away_at_cap" in idx, hasSeats = "turned_away_seats_or_timing" in idx, hasTotal = "turned_away" in idx;
    var seen = {}, mismatch = [];
    for (var r = 1; r < table.length; r++) {
      var row = table[r], line = row.line;
      res.dataLines++;
      var cell = function (k) { return k in idx ? row[idx[k]] : undefined; };
      var date = S.parseDate(cell("date"));
      if (!date) { res.errors.push("Line " + line + ": date \"" + short(cell("date")) + "\" not recognized (use 2026-05-01 or 5/1/2026). Row skipped."); continue; }
      if (seen[date]) { res.warnings.push("Line " + line + ": " + date + " appears again (first on line " + seen[date] + "). The page expects one row per day; this row was skipped."); continue; }
      var bad = false, vals = {};
      ["allocation", "used"].forEach(function (k) {
        if (bad) return;
        var p = S.parseCount(cell(k));
        if (p.error) { res.errors.push("Line " + line + " (" + date + "): " + k + " \"" + short(cell(k)) + "\" " + p.error + ". Row skipped."); bad = true; }
        else if (p.value === null) { res.errors.push("Line " + line + " (" + date + "): " + k + " is blank. Row skipped."); bad = true; }
        else vals[k] = p.value;
      });
      if (bad) continue;
      ["no_shows", "turned_away", "turned_away_at_cap", "turned_away_seats_or_timing"].forEach(function (k) {
        vals[k] = null;
        if (!(k in idx)) return;
        var p = S.parseCount(cell(k));
        if (p.error) res.warnings.push("Line " + line + " (" + date + "): " + k + " \"" + short(cell(k)) + "\" " + p.error + "; left blank.");
        else vals[k] = p.value;
      });
      seen[date] = line;
      var parts = (hasCap && hasSeats && vals.turned_away_at_cap !== null && vals.turned_away_seats_or_timing !== null) ? vals.turned_away_at_cap + vals.turned_away_seats_or_timing : null;
      var turned = parts !== null ? parts : (hasTotal ? vals.turned_away : null);
      if (parts !== null && hasTotal && vals.turned_away !== null && vals.turned_away !== parts) mismatch.push(date);
      if (vals.used > vals.allocation) res.warnings.push("Line " + line + " (" + date + "): used (" + vals.used + ") is above the allocation (" + vals.allocation + "). Check the count and what your permit says about it.");
      res.rows.push({ date: date, allocation: vals.allocation, used: vals.used, noShows: vals.no_shows,
        turned: turned, turnedAtCap: hasCap ? vals.turned_away_at_cap : null, turnedSeats: hasSeats ? vals.turned_away_seats_or_timing : null });
    }
    if (mismatch.length) res.warnings.push("On " + mismatch.length + " day" + (mismatch.length === 1 ? "" : "s") + " (first " + mismatch[0] + ") the turned-away total does not equal the two parts. The page uses the sum of the parts.");
    if (hasCap !== hasSeats) res.warnings.push("Only one of the two turned-away parts is in the file (" + (hasCap ? "at the cap" : "seats or timing") + "). Add the other to see which constraint binds.");
    res.rows.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    if (!res.rows.length) res.error = "No usable rows. " + (res.errors[0] || "");
    return res;
  };

  /* ---------- settings ---------- */
  function num(v) {
    var s = str(v).trim().replace(/^\$/, "").replace(/%$/, "").trim();
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
    if (!/^\d+(\.\d+)?$|^\.\d+$/.test(s)) return null;
    return parseFloat(s);
  }
  S.num = num;
  S.readSettings = function (o) {
    o = o || {}; var out = { errors: [] };
    var rps = str(o.rps).trim() === "" ? S.DEFAULTS.rps : num(o.rps);
    if (rps === null || rps > 100000) { out.errors.push("Revenue per slot: enter a dollar amount of 0 or more, for example 115.67."); rps = null; }
    var thr = str(o.thr).trim() === "" ? S.DEFAULTS.thr : num(o.thr);
    if (thr === null || thr !== Math.floor(thr) || thr > 1000) { out.errors.push("At-cap rule: enter a whole number of slots, 0 or more (the kit uses 5)."); thr = S.DEFAULTS.thr; }
    var fill = str(o.fill).trim() === "" ? S.DEFAULTS.fill : num(o.fill);
    if (fill === null || fill > 100) { out.errors.push("Fill share: enter a percentage from 0 to 100."); fill = null; }
    out.rps = rps; out.thr = thr; out.fill = fill;
    return out;
  };

  /* ---------- summary ---------- */
  function bucket() { return { days: 0, allocation: 0, used: 0, unused: 0, atCap: 0, noShows: 0, noShowDays: 0, turned: 0, turnedAtCap: 0, turnedSeats: 0, usedPct: null }; }
  function addTo(b, r) {
    b.days++; b.allocation += r.allocation; b.used += r.used; b.unused += r.unused; if (r.atCap) b.atCap++;
    if (r.noShows !== null) { b.noShows += r.noShows; b.noShowDays++; }
    if (r.turned !== null) b.turned += r.turned;
    if (r.turnedAtCap !== null) b.turnedAtCap += r.turnedAtCap;
    if (r.turnedSeats !== null) b.turnedSeats += r.turnedSeats;
  }
  function finish(b) { b.usedPct = pct(b.used, b.allocation); return b; }

  S.summarize = function (rows, settings) {
    settings = settings || {};
    var thr = settings.thr === undefined || settings.thr === null ? S.DEFAULTS.thr : settings.thr;
    var rps = settings.rps === undefined ? S.DEFAULTS.rps : settings.rps;
    var fill = settings.fill === undefined ? S.DEFAULTS.fill : settings.fill;
    var sum = { days: 0, zeroDays: 0, allocation: 0, used: 0, unused: 0, atCap: 0, thr: thr, overCapDays: 0, overCapSlots: 0,
      unusedOnCapDays: 0, unusedBelowCap: 0, first: "", last: "", months: [], weekdays: [], cells: {}, multiYear: false,
      rps: rps, fill: fill, unusedValue: null, unusedValueAtFill: null,
      noShows: { present: false, total: 0, onCapDays: 0, days: 0 },
      turned: { present: false, partsPresent: false, total: 0, atCap: 0, seats: 0, seatsOnCapDays: 0, seatsBelowCap: 0, days: 0 } };
    var months = {}, order = [], wk = [0, 1, 2, 3, 4, 5, 6].map(bucket), years = {};
    (rows || []).forEach(function (r0) {
      if (r0.allocation === 0) { sum.zeroDays++; if (r0.used > 0) { sum.overCapDays++; sum.overCapSlots += r0.used; } return; }
      var r = { allocation: r0.allocation, used: r0.used, noShows: r0.noShows === undefined ? null : r0.noShows,
        turned: r0.turned === undefined ? null : r0.turned, turnedAtCap: r0.turnedAtCap === undefined ? null : r0.turnedAtCap,
        turnedSeats: r0.turnedSeats === undefined ? null : r0.turnedSeats };
      r.unused = Math.max(0, r.allocation - r.used);
      r.atCap = r.unused <= thr;
      if (r.used > r.allocation) { sum.overCapDays++; sum.overCapSlots += r.used - r.allocation; }
      var key = r0.date.slice(0, 7), dow = S.dowOf(r0.date);
      years[r0.date.slice(0, 4)] = 1;
      if (!months[key]) { months[key] = bucket(); months[key].key = key; months[key].cells = [0, 1, 2, 3, 4, 5, 6].map(bucket); order.push(key); }
      addTo(months[key], r); addTo(months[key].cells[dow], r); addTo(wk[dow], r);
      sum.days++; sum.allocation += r.allocation; sum.used += r.used; sum.unused += r.unused;
      if (r.atCap) { sum.atCap++; sum.unusedOnCapDays += r.unused; } else sum.unusedBelowCap += r.unused;
      if (!sum.first || r0.date < sum.first) sum.first = r0.date;
      if (!sum.last || r0.date > sum.last) sum.last = r0.date;
      if (r.noShows !== null) { sum.noShows.present = true; sum.noShows.total += r.noShows; sum.noShows.days++; if (r.atCap) sum.noShows.onCapDays += r.noShows; }
      if (r.turned !== null) { sum.turned.present = true; sum.turned.total += r.turned; if (r.turned > 0) sum.turned.days++; }
      if (r.turnedAtCap !== null && r.turnedSeats !== null) {
        sum.turned.partsPresent = true; sum.turned.atCap += r.turnedAtCap; sum.turned.seats += r.turnedSeats;
        if (r.atCap) sum.turned.seatsOnCapDays += r.turnedSeats; else sum.turned.seatsBelowCap += r.turnedSeats;
      }
    });
    sum.multiYear = Object.keys(years).length > 1;
    order.sort();
    sum.months = order.map(function (k) {
      var m = finish(months[k]), mo = +k.slice(5, 7);
      m.label = MONTHS[mo - 1] + " " + k.slice(0, 4);
      m.name = MONTHS[mo - 1];
      m.short = MONTHS[mo - 1].slice(0, 3) + (sum.multiYear ? " " + k.slice(2, 4) : "");
      m.cells.forEach(finish);
      sum.cells[k] = m.cells;
      return m;
    });
    sum.weekdays = wk.map(function (b, i) { finish(b); b.dow = i; b.label = DOW[i]; b.short = DOW_SHORT[i]; return b; });
    sum.usedPct = pct(sum.used, sum.allocation);
    if (rps !== null && rps !== undefined) {
      sum.unusedValue = sum.unused * rps;
      sum.months.forEach(function (m) { m.unusedValue = m.unused * rps; });
      if (fill !== null && fill !== undefined) sum.unusedValueAtFill = sum.unused * (fill / 100) * rps;
    }
    return sum;
  };

  /* ---------- heatmap scale ---------- */
  S.METRICS = {
    used: { label: "Allocation used %", legend: ["under 50%", "50 to 69%", "70 to 84%", "85 to 94%", "95% or more"] },
    unused: { label: "Unused slots" },
    cap: { label: "Days at the cap" }
  };
  /* returns {text, level 0..4, aria} for one month x weekday cell */
  S.heatCell = function (cell, metric, max) {
    if (!cell || !cell.days) return { text: "", level: -1, empty: true };
    var v, level;
    if (metric === "unused") { v = cell.unused; level = v === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((4 * v) / (max || 1)))); return { text: S.fmtInt(v), level: level, value: v }; }
    if (metric === "cap") { v = cell.atCap; level = v === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((4 * v) / (max || 1)))); return { text: String(v), level: level, value: v }; }
    var p = cell.usedPct;
    level = p < 50 ? 0 : p < 70 ? 1 : p < 85 ? 2 : p < 95 ? 3 : 4;
    return { text: S.pctText(p, 0), level: level, value: p };
  };
  S.heatMax = function (sum, metric) {
    var mx = 0;
    sum.months.forEach(function (m) { m.cells.forEach(function (c) { var v = metric === "unused" ? c.unused : metric === "cap" ? c.atCap : 0; if (c.days && v > mx) mx = v; }); });
    return mx;
  };
  /* legend labels for the count metrics, from the same rule heatCell uses */
  S.heatLegend = function (metric, max) {
    if (metric === "used") return S.METRICS.used.legend.slice();
    if (!max) return ["0"];
    var out = ["0"], lo = 1;
    for (var k = 1; k <= 4; k++) {
      var hi = Math.floor((k * max) / 4);
      if (hi >= lo) { out.push(lo === hi ? String(lo) : S.fmtInt(lo) + " to " + S.fmtInt(hi)); lo = hi + 1; }
      else out.push("");
    }
    return out;
  };

  /* ---------- what the numbers say, and my read ---------- */
  function joinAnd(list) {
    if (list.length <= 1) return list.join("");
    if (list.length === 2) return list[0] + " and " + list[1];
    return list.slice(0, -1).join(", ") + " and " + list[list.length - 1];
  }
  S.joinAnd = joinAnd;
  var PLURAL = { Monday: "Mondays", Tuesday: "Tuesdays", Wednesday: "Wednesdays", Thursday: "Thursdays", Friday: "Fridays", Saturday: "Saturdays", Sunday: "Sundays" };
  S.LIGHT_GAP = 10;

  S.lightSpots = function (sum) {
    var base = sum.usedPct, months = [], days = [];
    if (base === null) return { months: months, weekdays: days };
    sum.months.forEach(function (m) { if (m.usedPct !== null && m.days >= 7 && m.usedPct <= base - S.LIGHT_GAP) months.push(m); });
    sum.weekdays.forEach(function (w) { if (w.usedPct !== null && w.days >= 3 && w.usedPct <= base - S.LIGHT_GAP) days.push(w); });
    return { months: months, weekdays: days };
  };

  S.patterns = function (sum) {
    var facts = [], read = [];
    if (!sum || !sum.days) return { facts: facts, read: read };
    facts.push(S.fmtInt(sum.used) + " of " + S.fmtInt(sum.allocation) + " allocated slots used (" + S.pctText(sum.usedPct, 1) + ") over " + sum.days + " days, " + sum.first + " to " + sum.last + ".");
    facts.push("At the cap on " + sum.atCap + " of " + sum.days + " days (unused allocation of " + sum.thr + " or fewer).");
    var byUnused = sum.months.filter(function (m) { return m.unused > 0; }).sort(function (a, b) { return b.unused - a.unused || (a.key < b.key ? -1 : 1); }).slice(0, 2);
    if (byUnused.length && sum.months.length > 1) facts.push("Most unused slots: " + joinAnd(byUnused.map(function (m) { return m.name + (sum.multiYear ? " " + m.key.slice(0, 4) : "") + " (" + S.fmtInt(m.unused) + " unused, " + S.pctText(m.usedPct, 0) + " used)"; })) + ".");
    if (sum.months.length > 1) {
      var full = sum.months.slice().sort(function (a, b) { return b.usedPct - a.usedPct || (a.key < b.key ? -1 : 1); })[0];
      facts.push("Fullest month: " + full.name + (sum.multiYear ? " " + full.key.slice(0, 4) : "") + " (" + S.pctText(full.usedPct, 0) + " used, at the cap on " + full.atCap + " of " + full.days + " days).");
    }
    var wd = sum.weekdays.filter(function (w) { return w.days > 0; });
    if (wd.length >= 2) {
      var lo = wd.slice().sort(function (a, b) { return a.usedPct - b.usedPct || a.dow - b.dow; })[0];
      var others = wd.filter(function (w) { return w !== lo; }).map(function (w) { return Math.round(w.usedPct); });
      var mn = Math.min.apply(null, others), mx = Math.max.apply(null, others);
      facts.push("Lightest weekday: " + lo.label + " (" + S.pctText(lo.usedPct, 0) + " used). The other weekdays run " + (mn === mx ? mn + "%" : mn + "% to " + mx + "%") + ".");
    }
    var t = sum.turned;
    if (t.partsPresent) facts.push("Turned away (your estimate): " + S.fmtInt(t.total) + ". At the cap: " + S.fmtInt(t.atCap) + ". Seats or timing: " + S.fmtInt(t.seats) + " (" + S.fmtInt(t.seatsBelowCap) + " on days below the cap, " + S.fmtInt(t.seatsOnCapDays) + " on days at the cap).");
    else if (t.present) facts.push("Turned away (your estimate): " + S.fmtInt(t.total) + " on " + t.days + " days.");
    if (sum.noShows.present) facts.push("No-shows recorded: " + S.fmtInt(sum.noShows.total) + ", of which " + S.fmtInt(sum.noShows.onCapDays) + " on days at the cap.");
    if (sum.overCapDays) facts.push("Used was above the allocation on " + sum.overCapDays + " day" + (sum.overCapDays === 1 ? "" : "s") + " (" + S.fmtInt(sum.overCapSlots) + " slots). Check those counts.");

    /* my read: interpretation, rule-based and labeled */
    if (t.partsPresent && t.total > 0) {
      if (t.seats > t.atCap) {
        read.push("Identify which constraint actually binds before you exploit it. Seats and departure timing turned away " + S.fmtInt(t.seats) + " requests; the cap turned away " + S.fmtInt(t.atCap) +
          ". The first move is checking the departure schedule against the ships' in-port windows. That constraint is yours to elevate (add or move a departure, within the vessel's certificate limit); the regulatory cap is not.");
        if (t.seatsOnCapDays > 0) read.push("Of those " + S.fmtInt(t.seats) + ", " + S.fmtInt(t.seatsOnCapDays) + " were on days at the cap, when " + S.fmtInt(sum.unusedOnCapDays) +
          " allocation slot" + (sum.unusedOnCapDays === 1 ? " was" : "s were") + " left across all those days. On those days extra seats could add at most " + S.fmtInt(sum.unusedOnCapDays) +
          " capped-product guests; the rest could only be offered the uncapped product. The capped demand that better timing could win back sits on the " + (sum.days - sum.atCap) + " days below the cap (" + S.fmtInt(t.seatsBelowCap) + " requests).");
      } else {
        read.push("The cap turned away " + S.fmtInt(t.atCap) + " requests; seats and timing turned away " + S.fmtInt(t.seats) + ". The cap is the binding constraint: exploit it (no wasted slot, the highest-value use of each slot) and grow where it does not bind (3b).");
      }
    } else if (t.present && t.total > 0) {
      read.push("Your file has one turned-away figure. Next season, record it in two parts: turned away because the allocation was used up, and turned away because no departure had seats at a time that fit. The split tells you which constraint binds.");
    }
    var ls = S.lightSpots(sum);
    var spots = ls.months.map(function (m) { return m.name + (sum.multiYear ? " " + m.key.slice(0, 4) : ""); }).concat(ls.weekdays.map(function (w) { return PLURAL[w.label]; }));
    if (spots.length) read.push(joinAnd(spots) + " hold the empty slots (" + S.LIGHT_GAP + " or more points below the season figure). On those days demand sets the limit, not the cap, and an empty slot expires unsold. Selling there is how you get full use of the allocation: independent travelers, locals and partner packages (3b builds products for those days).");
    else if (sum.months.length > 1) read.push("No month or weekday sits " + S.LIGHT_GAP + " or more points below the season figure: the empty slots are spread thin across the season.");
    if (sum.atCap > 0) read.push("On the " + sum.atCap + " days at the cap, a no-show or a late cancellation is a slot nobody else can use. Deposits, a waitlist and an earlier booking cutoff are the levers; each is a decision for the owner.");
    return { facts: facts, read: read };
  };

  /* ---------- the memo prompt (summary only, never the raw rows) ---------- */
  S.summaryBlock = function (sum) {
    if (!sum || !sum.days) return "[NO SUMMARY YET: load your daily counts on the page]";
    var L = [];
    L.push("Period: " + sum.first + " to " + sum.last + ", " + sum.days + " days with an allocation" + (sum.zeroDays ? " (" + sum.zeroDays + " days with no allocation left out)" : "") + ".");
    L.push("Allocation: " + S.fmtInt(sum.allocation) + " slots. Used: " + S.fmtInt(sum.used) + " (" + S.pctText(sum.usedPct, 1) + "). Unused: " + S.fmtInt(sum.unused) + ".");
    L.push("Days at the cap (unused allocation of " + sum.thr + " or fewer): " + sum.atCap + ". Slots left on those days, in total: " + S.fmtInt(sum.unusedOnCapDays) + ".");
    if (sum.overCapDays) L.push("Days where used was above the allocation: " + sum.overCapDays + " (" + S.fmtInt(sum.overCapSlots) + " slots). [CHECK THE COUNTS AND YOUR PERMIT]");
    L.push("By month (used %, unused slots, days at the cap):");
    sum.months.forEach(function (m) { L.push("- " + m.label + ": " + S.pctText(m.usedPct, 0) + " used, " + S.fmtInt(m.unused) + " unused, at the cap on " + m.atCap + " of " + m.days + " days."); });
    L.push("By weekday (used %): " + sum.weekdays.filter(function (w) { return w.days; }).map(function (w) { return w.short + " " + S.pctText(w.usedPct, 0); }).join(", ") + ".");
    var t = sum.turned;
    if (t.partsPresent) {
      L.push("Requests turned away (owner's estimate): " + S.fmtInt(t.total) + ".");
      L.push("- Because the allocation was used up: " + S.fmtInt(t.atCap) + ".");
      L.push("- Because no departure had seats at a time that fit: " + S.fmtInt(t.seats) + " (" + S.fmtInt(t.seatsBelowCap) + " on days below the cap, " + S.fmtInt(t.seatsOnCapDays) + " on days at the cap).");
    } else if (t.present) L.push("Requests turned away (owner's estimate, not split by reason): " + S.fmtInt(t.total) + ".");
    else L.push("Requests turned away: not recorded.");
    L.push(sum.noShows.present ? "No-shows: " + S.fmtInt(sum.noShows.total) + " (" + S.fmtInt(sum.noShows.onCapDays) + " on days at the cap)." : "No-shows: not recorded.");
    if (sum.rps !== null && sum.rps !== undefined) {
      L.push("Value used for one slot: " + S.fmtMoney(sum.rps, true) + ". Unused slots at that value: " + S.fmtMoney(sum.unusedValue) + " if every one sold (a ceiling, not a forecast)" +
        (sum.unusedValueAtFill !== null ? "; " + S.fmtMoney(sum.unusedValueAtFill) + " at a " + sum.fill + "% fill share (an assumption)." : "."));
    }
    return L.join("\n");
  };

  S.memoPrompt = function (sum, opts) {
    opts = opts || {};
    var cap = str(opts.capName).trim() || "[FILL: what the cap limits, for example guest visits per day at a permitted site]";
    var facts = str(opts.facts).trim() || "None supplied. Where a price, product, channel or contract fact is needed, write [FILL] instead of guessing.";
    return [
      "I run a small Alaska tour business with a capacity cap. Help me think through pricing and packaging options. Work only from the summary below: it was computed on my device from daily counts and holds no guest data.",
      "",
      "What the cap limits: " + cap,
      "",
      "My approved facts (products, prices, channels):",
      facts,
      "",
      "Slot-use summary:",
      S.summaryBlock(sum),
      "",
      "Frame: Theory of Constraints, five steps. 1 Identify the constraint that actually binds: the regulatory cap, or seats and departure timing. 2 Exploit it: get full use out of it (for the cap: no wasted slot, and the highest-value use of each slot). 3 Subordinate everything else (sales, schedule, staffing, pricing) to it. 4 Elevate: only what is mine to elevate. Departures and seats can be added or moved within each vessel's certificate limit; the regulatory allocation is the land manager's decision under the permit, not mine. 5 Repeat.",
      "",
      "Do this:",
      "1. In two or three sentences, say which constraint the numbers show binding, and on which days. Use only the numbers above.",
      "2. Options where requests were turned away for seats or timing (if the summary shows any): checking departure times against ship windows, adding or moving a departure, other ways to add seats within the certificate limit.",
      "3. Options where demand exceeds the cap: premium or small-group departures, an earlier booking cutoff, deposits on capped days, a waitlist to refill no-shows and late cancellations, offering the uncapped product when the day's allocation is used.",
      "4. Options where slots go unused: independent travelers, locals, partner packages, light-day offers.",
      "5. For every option give: the days it targets, what changes, the risks (channel and cruise line contracts, rate parity, guest trust, permit terms, crew hours), the cheapest test, and how I would measure it (revenue per allocated slot and allocation used %). Give any expected effect as a range with its assumption stated, or write [FILL: owner estimate].",
      "6. End with \"Questions for the owner\" listing every [FILL].",
      "",
      "Rules:",
      "- Use only the numbers in this summary and my facts. Do not invent market data, competitor prices, demand response or statistics.",
      "- Never propose using more slots than the allocation, or any way around the permit. For anything about permit terms, write [CHECK YOUR PERMIT].",
      "- Do not set prices. Price ideas are options for me to decide. Nothing changes automatically.",
      "- No fake urgency or invented scarcity. Show total prices, with every fee the guest cannot avoid. If an option packages a lodge night, note that the FTC fee rule (16 CFR Part 464) covers short-term lodging and requires the total price.",
      "- No invented reviews or testimonials (FTC rule, 16 CFR Part 465).",
      "- Mark the whole answer DRAFT - PENDING OWNER REVIEW."
    ].join("\n");
  };

  /* the printable version for the Prompt Kit (dev/core-prompt.txt is generated from this) */
  S.corePrompt = function () {
    return S.memoPrompt(null, { capName: "[WHAT THE CAP LIMITS, for example guest visits per day at a permitted site]", facts: "[PASTE YOUR APPROVED PRODUCT, PRICE AND CHANNEL FACTS. No guest or staff data.]" })
      .replace(S.summaryBlock(null), "[PASTE THE SLOT-USE SUMMARY FROM TOOL 3a: period, allocation, used %, days at the cap, by month, by weekday, requests turned away at the cap and for seats or timing, no-shows. Summary only, never daily rows.]");
  };

  /* ---------- downloads ---------- */
  S.summaryCSV = function (sum) {
    var rows = [["group", "period", "days", "allocation", "used", "used_pct", "unused", "days_at_cap", "turned_away", "turned_away_at_cap", "turned_away_seats_or_timing", "no_shows", "unused_value"]];
    function line(g, p, b, val) {
      rows.push([g, p, b.days, b.allocation, b.used, b.usedPct === null ? "" : (Math.round(b.usedPct * 10) / 10).toFixed(1), b.unused, b.atCap,
        sum.turned.present ? b.turned : "", sum.turned.partsPresent ? b.turnedAtCap : "", sum.turned.partsPresent ? b.turnedSeats : "",
        sum.noShows.present ? b.noShows : "", val === null || val === undefined ? "" : Math.round(val)]);
    }
    var season = { days: sum.days, allocation: sum.allocation, used: sum.used, usedPct: sum.usedPct, unused: sum.unused, atCap: sum.atCap,
      turned: sum.turned.total, turnedAtCap: sum.turned.atCap, turnedSeats: sum.turned.seats, noShows: sum.noShows.total };
    line("season", sum.first + " to " + sum.last, season, sum.unusedValue);
    sum.months.forEach(function (m) { line("month", m.key, m, m.unusedValue); });
    sum.weekdays.forEach(function (w) { if (w.days) line("weekday", w.label, w, sum.rps === null ? null : w.unused * sum.rps); });
    return "# Slot-use summary from ATIA Operations Kit 3a. Days at cap: unused allocation of " + sum.thr + " or fewer. Unused value at " + (sum.rps === null ? "n/a" : S.fmtMoney(sum.rps, true)) + " a slot is a ceiling, not a forecast.\n" + S.toCSV(rows);
  };

  S.PERMIT_ITEMS = [
    ["count", "How does the permit count use: slots booked, guests checked in, or guests on site? Do no-shows and late cancellations count as used?"],
    ["report", "Actual-use reporting: what you report, how often, by what date, and in what format."],
    ["renewal", "Renewal and reallocation: what the permit says about how actual use affects next season's allocation. Read the clause; do not assume a percentage."],
    ["transfer", "Can unused allocation be shared, transferred or pooled with another permit holder? Under what process?"],
    ["limits", "Limits beyond the daily number: weekly or seasonal totals, time-of-day windows, group size on site."],
    ["fees", "Fees: charged per visit used or per slot allocated? This changes what an empty slot costs you."],
    ["products", "Does the permit restrict which products or packages may use the allocation, or how they are priced or marketed?"],
    ["records", "Which records you keep (daily counts, guest counts) and for how long."],
    ["changes", "Who to contact to request an amendment or more allocation, and by when."],
    ["over", "What happens if a day goes over the allocation, and how a miscount is corrected."]
  ];
  S.permitMarkdown = function (state, today) {
    state = state || {};
    var L = ["# Permit check (ATIA Operations Kit, 3a)", "", "Contractual: every answer comes from your permit or agreement, not from this kit. Quote the clause.", "Checked on: " + (today || "[DATE]"), ""];
    S.PERMIT_ITEMS.forEach(function (it, i) {
      var s = state[it[0]] || {};
      L.push((i + 1) + ". [" + (s.done ? "x" : " ") + "] " + it[1]);
      L.push("   Clause or answer: " + (str(s.note).trim() || "[FILL]"));
    });
    L.push("", "Kept with the season's allocation records. No guest data in this file.");
    return L.join("\n") + "\n";
  };

  /* Number 4 */
  S.number4 = function (net, slots, used) {
    var n = num(net), s = num(slots), u = str(used).trim() === "" ? null : num(used);
    if (n === null || s === null) return { error: "Enter net revenue of the capped product and allocated slots." };
    if (s <= 0) return { error: "Allocated slots need to be above 0." };
    if (str(used).trim() !== "" && u === null) return { error: "Slots used: enter a whole number." };
    return { value: n / s, usedPct: u === null ? null : pct(u, s) };
  };

  /* fictional embed (rows as arrays) to CSV text for the box */
  S.embedToCSV = function (emb) {
    var head = ["date", "allocation", "used", "turned_away_at_cap", "turned_away_seats_or_timing"];
    var col = {}; emb.columns.forEach(function (c, i) { col[c] = i; });
    var rows = [head].concat(emb.rows.map(function (r) { return head.map(function (h) { return h in col ? r[col[h]] : ""; }); }));
    return rows.map(function (r) { return r.join(","); }).join("\n") + "\n";
  };

  S.MESSY = [
    "Date,Allocation,\"Slots used\",No-shows,\"Turned away\",Notes",
    "2026-06-01,100,100,2,6,\"Ship day, full\"",
    "2026-06-02,100,97,1,0,\"Rain, two late cancels\"",
    "",
    "6/3/2026,100,\"88\",0,0,",
    "2026-06-04,100,abc,0,0,\"typo in used\"",
    "2026-06-05,100,,0,0,\"used left blank\"",
    "2026-06-06,100,104,0,3,\"over the allocation?\"",
    "2026-06-02,100,95,0,0,\"same date twice\"",
    "2026-06-07,100,61,n/a,0,\"no-show not recorded\""
  ].join("\n") + "\n";

  if (typeof module !== "undefined" && module.exports) module.exports = S;
  else root.SlotsCore = S;
})(this);
