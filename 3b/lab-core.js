/* 3b Off-cap product lab: pure logic, no page access, no network.
 * Used by index.html (as window.LabCore) and by the Node tests in dev/ (require).
 * Deterministic: the same schedule, settings and concepts always give the same calendar, scores and prompts.
 */
(function (root) {
  "use strict";
  var L = {};

  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DOW = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  var DOW_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  L.MONTHS = MONTHS; L.DOW = DOW; L.DOW_SHORT = DOW_SHORT;
  L.MAX_ROWS = 20000;
  L.DEFAULTS = { limit: 16000, satLimit: 12000, heavyPct: 70, lightPct: 40, heavyUse: 95, lightUse: 75 };
  L.RULE_DEFAULTS = { w_desirability: 1, w_feasibility: 1, w_viability: 1, w_capIndependence: 1, minScore: 3.5, floor: 2, minCap: 3 };

  function str(v) { return v === undefined || v === null ? "" : String(v); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /* ---------- formatting ---------- */
  L.fmtInt = function (n) {
    if (n === null || n === undefined || !isFinite(n)) return "n/a";
    var neg = n < 0, s = String(Math.round(Math.abs(n)));
    return (neg ? "-" : "") + s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  L.pctText = function (p, dec) {
    if (p === null || p === undefined || !isFinite(p)) return "n/a";
    var f = Math.pow(10, dec || 0);
    return (Math.round(p * f) / f).toFixed(dec || 0) + "%";
  };
  function joinAnd(list) {
    if (list.length <= 1) return list.join("");
    if (list.length === 2) return list[0] + " and " + list[1];
    return list.slice(0, -1).join(", ") + " and " + list[list.length - 1];
  }
  L.joinAnd = joinAnd;

  /* ---------- CSV (same parser as 3a) ---------- */
  function detectDelim(firstLine) {
    var best = ",", bestN = 0;
    [",", ";", "\t"].forEach(function (d) {
      var n = 0, q = false;
      for (var i = 0; i < firstLine.length; i++) { var c = firstLine[i]; if (c === '"') q = !q; else if (!q && c === d) n++; }
      if (n > bestN) { best = d; bestN = n; }
    });
    return best;
  }
  L.parseCSV = function (text, delim) {
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
  L.csvCell = function (v) {
    var s = str(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  L.toCSV = function (rows) { return rows.map(function (r) { return r.map(L.csvCell).join(","); }).join("\n") + "\n"; };
  L.normHeader = function (h) { return str(h).replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""); };

  L.parseDate = function (v) {
    var s = str(v).trim();
    var t = /^(\S+)[ T]\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?Z?$/.exec(s); if (t) s = t[1];
    var y, m, d, a;
    if ((a = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/.exec(s))) { y = +a[1]; m = +a[2]; d = +a[3]; }
    else if ((a = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(s))) { m = +a[1]; d = +a[2]; y = +a[3]; if (a[3].length === 2) y += 2000; }
    else return null;
    var dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return y + "-" + pad(m) + "-" + pad(d);
  };
  L.dowOf = function (iso) { var p = iso.split("-"); return (new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay() + 6) % 7; };
  L.parseCount = function (v) {
    var s = str(v).trim();
    if (s === "") return { value: null };
    if (/^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, "");
    if (/^-\s*\d/.test(s)) return { error: "is negative" };
    if (/^\d+(\.0+)?$/.test(s)) return { value: parseInt(s, 10) };
    if (/^\d*\.\d+$/.test(s)) return { error: "is not a whole number" };
    return { error: "is not a number" };
  };
  function num(v) {
    var s = str(v).trim().replace(/^\$/, "").replace(/%$/, "").trim();
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
    if (!/^\d+(\.\d+)?$|^\.\d+$/.test(s)) return null;
    return parseFloat(s);
  }
  L.num = num;
  function short(s) { s = str(s).trim(); return s.length > 24 ? s.slice(0, 24) + "..." : s; }

  function mapColumns(head, cols) {
    var idx = {}, names = {}, ignored = [];
    head.map(L.normHeader).forEach(function (h, i) {
      for (var k = 0; k < cols.length; k++) if (!(cols[k][0] in idx) && cols[k][1].test(h)) { idx[cols[k][0]] = i; names[cols[k][0]] = head[i].trim(); return; }
      if (h) ignored.push(head[i].trim());
    });
    return { idx: idx, names: names, ignored: ignored };
  }

  /* ---------- port schedule: one row per ship call or per day; passengers summed per date ---------- */
  var SCHED_COLS = [
    ["date", /^(date|day|call_date|port_date)$/],
    ["passengers", /^(passengers|est_passengers|estimated_passengers|passengers_in_port|pax|guests|lower_berths|berths|capacity)$/],
    ["ship", /^(ship|vessel|ship_name|vessel_name)$/]
  ];
  L.readSchedule = function (text) {
    var res = { days: [], errors: [], warnings: [], columns: {}, ignored: [], error: "" };
    if (!str(text).trim()) { res.error = "empty"; return res; }
    var t = L.parseCSV(text);
    var m = mapColumns(t[0], SCHED_COLS);
    res.columns = m.names; res.ignored = m.ignored;
    var miss = ["date", "passengers"].filter(function (k) { return !(k in m.idx); });
    if (miss.length) {
      res.error = L.parseDate(t[0][0]) ? "The first row needs column names: date and passengers." :
        "Missing column" + (miss.length > 1 ? "s" : "") + ": " + miss.join(", ") + ". The schedule needs a date column and a passengers column (est_passengers or passengers_in_port also work), one row per ship call or per day. Found: " + t[0].map(function (h) { return h.trim() || "(blank)"; }).join(", ") + ".";
      return res;
    }
    if (t.length - 1 > L.MAX_ROWS) { res.error = "That file has " + L.fmtInt(t.length - 1) + " rows. The page reads up to " + L.fmtInt(L.MAX_ROWS) + "."; return res; }
    var by = {};
    for (var r = 1; r < t.length; r++) {
      var row = t[r], line = row.line, d = L.parseDate(row[m.idx.date]);
      if (!d) { res.errors.push("Line " + line + ": date \"" + short(row[m.idx.date]) + "\" not recognized. Row skipped."); continue; }
      var p = L.parseCount(row[m.idx.passengers]);
      if (p.error || p.value === null) { res.errors.push("Line " + line + " (" + d + "): passengers \"" + short(row[m.idx.passengers]) + "\" " + (p.error || "is blank") + ". Row skipped."); continue; }
      if (!by[d]) by[d] = { date: d, ships: 0, passengers: 0 };
      by[d].ships++; by[d].passengers += p.value;
    }
    res.days = Object.keys(by).sort().map(function (k) { return by[k]; });
    if (!("ship" in m.idx) && res.days.some(function (x) { return x.ships > 1; })) res.warnings.push("Some dates appear on more than one row and were added together, as if each row were one ship call.");
    if (!res.days.length) res.error = "No usable rows. " + (res.errors[0] || "");
    return res;
  };

  /* A ship-call file has no row on a day with no ships. Dates missing between the first and last date
     are added as 0 passengers, and the count is reported so the owner can check it. */
  L.fillGaps = function (days) {
    if (!days || !days.length) return { days: [], filled: [] };
    var have = {}, out = [], filled = [];
    days.forEach(function (d) { have[d.date] = d; });
    var p = days[0].date.split("-"), t = Date.UTC(+p[0], +p[1] - 1, +p[2]), last = days[days.length - 1].date;
    for (var i = 0; i < 1000; i++) {
      var dt = new Date(t + i * 86400000), iso = dt.getUTCFullYear() + "-" + pad(dt.getUTCMonth() + 1) + "-" + pad(dt.getUTCDate());
      if (have[iso]) out.push(have[iso]); else { out.push({ date: iso, ships: 0, passengers: 0 }); filled.push(iso); }
      if (iso === last) break;
    }
    return { days: out, filled: filled };
  };

  /* ---------- last season's use, month x weekday (the 3a format: date, allocation, used) ---------- */
  var USE_COLS = [
    ["date", /^(date|day|service_date|visit_date|trip_date|tour_date)$/],
    ["allocation", /^(allocation|allocated|allocated_slots|daily_allocation|allocation_per_day|slots_allocated|permit_slots|cap|limit|daily_limit)$/],
    ["used", /^(used|slots_used|used_slots|allocation_used|combo_guests|guest_visits|visits|actual_use|actual_visits|actual)$/]
  ];
  L.readUse = function (text) {
    var res = { rows: [], errors: [], error: "", columns: {} };
    if (!str(text).trim()) { res.error = "empty"; return res; }
    var t = L.parseCSV(text), m = mapColumns(t[0], USE_COLS);
    res.columns = m.names;
    var miss = ["date", "allocation", "used"].filter(function (k) { return !(k in m.idx); });
    if (miss.length) { res.error = "Missing column" + (miss.length > 1 ? "s" : "") + ": " + miss.join(", ") + ". Use the same daily counts as 3a: date, allocation, used."; return res; }
    var seen = {};
    for (var r = 1; r < t.length; r++) {
      var row = t[r], d = L.parseDate(row[m.idx.date]), a = L.parseCount(row[m.idx.allocation]), u = L.parseCount(row[m.idx.used]);
      if (!d || a.error || u.error || a.value === null || u.value === null) { res.errors.push("Line " + row.line + ": skipped (date, allocation and used need values)."); continue; }
      if (seen[d]) continue;
      seen[d] = 1;
      res.rows.push({ date: d, allocation: a.value, used: u.value });
    }
    if (!res.rows.length) res.error = "No usable rows.";
    return res;
  };
  L.useGrid = function (rows) {
    var g = {};
    (rows || []).forEach(function (r) {
      if (!r.allocation) return;
      var k = (+r.date.slice(5, 7)) + "-" + L.dowOf(r.date);
      if (!g[k]) g[k] = { allocation: 0, used: 0, days: 0, pct: null };
      g[k].allocation += r.allocation; g[k].used += r.used; g[k].days++;
    });
    Object.keys(g).forEach(function (k) { g[k].pct = (100 * g[k].used) / g[k].allocation; });
    return g;
  };

  /* ---------- settings ---------- */
  L.readSettings = function (o) {
    o = o || {}; var out = { errors: [] }, D = L.DEFAULTS;
    function get(k, max) {
      var s = str(o[k]).trim();
      if (s === "") return D[k];
      var v = num(s);
      if (v === null || (max !== undefined && v > max)) return null;
      return v;
    }
    out.limit = get("limit");
    if (out.limit === null || out.limit <= 0) { out.errors.push("Daily limit: enter a number of passengers above 0."); out.limit = D.limit; }
    var sat = str(o.satLimit).trim();
    out.satLimit = sat === "" ? (str(o.limit).trim() === "" ? D.satLimit : out.limit) : num(sat);
    if (out.satLimit === null || out.satLimit <= 0) { out.errors.push("Saturday limit: enter a number above 0, or leave it blank to use the daily limit."); out.satLimit = out.limit; }
    ["heavyPct", "lightPct"].forEach(function (k) { out[k] = get(k, 300); if (out[k] === null) { out.errors.push("Port thresholds: enter a percentage of the limit."); out[k] = D[k]; } });
    ["heavyUse", "lightUse"].forEach(function (k) { out[k] = get(k, 100); if (out[k] === null) { out.errors.push("Your-use thresholds: enter a percentage from 0 to 100."); out[k] = D[k]; } });
    if (out.lightPct >= out.heavyPct) { out.errors.push("The light threshold for port load needs to be below the heavy threshold."); out.lightPct = D.lightPct; out.heavyPct = D.heavyPct; }
    if (out.lightUse >= out.heavyUse) { out.errors.push("The light threshold for your use needs to be below the heavy threshold."); out.lightUse = D.lightUse; out.heavyUse = D.heavyUse; }
    return out;
  };

  /* ---------- classification ---------- */
  /* heavy: port load at or above heavyPct of the limit, OR your last-season use for that month and weekday at or above heavyUse.
     light: port load below lightPct AND (no use data, or use below lightUse). medium: everything else. */
  L.classifyDay = function (load, use, st) {
    if (load >= st.heavyPct || (use !== null && use >= st.heavyUse)) return "heavy";
    if (load < st.lightPct && (use === null || use < st.lightUse)) return "light";
    return "medium";
  };
  L.classify = function (days, st, grid) {
    st = st || L.readSettings({});
    var out = { days: [], counts: { heavy: 0, medium: 0, light: 0 }, months: [], weekdays: DOW.map(function (d, i) { return { dow: i, label: d, light: 0, days: 0 }; }), hasUse: !!(grid && Object.keys(grid).length) };
    var months = {};
    (days || []).forEach(function (d) {
      var dow = L.dowOf(d.date), mo = +d.date.slice(5, 7), limit = dow === 5 ? st.satLimit : st.limit;
      var load = (100 * d.passengers) / limit;
      var cell = out.hasUse ? grid[mo + "-" + dow] : null, use = cell ? cell.pct : null;
      var cls = L.classifyDay(load, use, st);
      var x = { date: d.date, dow: dow, month: mo, ships: d.ships, passengers: d.passengers, limit: limit, load: load, use: use, cls: cls };
      out.days.push(x); out.counts[cls]++;
      out.weekdays[dow].days++; if (cls === "light") out.weekdays[dow].light++;
      var key = d.date.slice(0, 7);
      if (!months[key]) months[key] = { key: key, name: MONTHS[mo - 1], label: MONTHS[mo - 1] + " " + key.slice(0, 4), days: 0, heavy: 0, medium: 0, light: 0, lightDates: [] };
      months[key].days++; months[key][cls]++;
      if (cls === "light") months[key].lightDates.push(x);
    });
    out.months = Object.keys(months).sort().map(function (k) { return months[k]; });
    return out;
  };
  L.dayLabel = function (x) { return DOW_SHORT[x.dow] + " " + (+x.date.slice(8, 10)); };
  L.describeDay = function (x) {
    return DOW[x.dow] + " " + MONTHS[x.month - 1] + " " + (+x.date.slice(8, 10)) + ": " + x.cls + ". " + L.fmtInt(x.passengers) + " passengers in port on " + x.ships + " ship" + (x.ships === 1 ? "" : "s") +
      ", " + L.pctText(x.load, 0) + " of the " + L.fmtInt(x.limit) + " limit" + (x.use === null ? "." : "; your last-season use on " + DOW[x.dow] + "s in " + MONTHS[x.month - 1] + ": " + L.pctText(x.use, 0) + ".");
  };

  /* text block for the prompts: counts and every light date */
  L.lightBlock = function (res, st) {
    if (!res || !res.days.length) return "[NO LIGHT-DAY LIST YET: load a port schedule on the page]";
    var first = res.days[0].date, last = res.days[res.days.length - 1].date, Ln = [];
    Ln.push("Season " + first + " to " + last + ": " + res.counts.light + " light, " + res.counts.medium + " medium, " + res.counts.heavy + " heavy days.");
    if (st) Ln.push("Rule: heavy when passengers in port reach " + st.heavyPct + "% of the daily limit (" + L.fmtInt(st.limit) + ", Saturday " + L.fmtInt(st.satLimit) + ")" +
      (res.hasUse ? " or last season's use for that month and weekday reached " + st.heavyUse + "%" : "") + "; light when below " + st.lightPct + "%" + (res.hasUse ? " and last season's use was below " + st.lightUse + "%" : "") + ".");
    Ln.push("Light days by month:");
    res.months.forEach(function (m) { Ln.push("- " + m.label + " (" + m.light + "): " + (m.lightDates.length ? m.lightDates.map(L.dayLabel).join(", ") : "none")); });
    var wd = res.weekdays.filter(function (w) { return w.light > 0; }).sort(function (a, b) { return b.light - a.light || a.dow - b.dow; });
    if (wd.length) Ln.push("Light days by weekday: " + wd.map(function (w) { return w.label + " " + w.light + " of " + w.days; }).join(", ") + ".");
    return Ln.join("\n");
  };
  L.calendarCSV = function (res) {
    var rows = [["date", "weekday", "ships", "passengers_in_port", "daily_limit", "port_load_pct", "last_season_use_pct", "class"]];
    res.days.forEach(function (x) {
      rows.push([x.date, DOW_SHORT[x.dow], x.ships, x.passengers, x.limit, (Math.round(x.load * 10) / 10).toFixed(1), x.use === null ? "" : (Math.round(x.use * 10) / 10).toFixed(1), x.cls]);
    });
    return L.toCSV(rows);
  };

  /* ---------- concepts ---------- */
  L.FIELDS = [
    ["name", "Concept name"],
    ["who", "Who it is for"],
    ["resource", "Resource it uses"],
    ["avoids", "Which cap it avoids, and how"],
    ["when", "When it runs"],
    ["price", "Total price the guest sees"],
    ["capacity", "Capacity"],
    ["staff", "Staff needed"],
    ["partner", "Partner needed"],
    ["risks", "Risks"],
    ["test", "Cheapest test, and what result kills it"]
  ];
  L.CRITERIA = [
    ["desirability", "Desirability", "Would the guests it is for want it, at that total price?"],
    ["feasibility", "Feasibility", "Can you run it with the boats, crew and partners you have?"],
    ["viability", "Viability", "Does it make money after costs, commissions and partner shares?"],
    ["capIndependence", "Cap-independence", "Does it stay clear of the capped resource on capped days?"]
  ];
  L.cardText = function (c) {
    c = c || {};
    var Ln = ["PRODUCT CONCEPT: " + (str(c.name).trim() || "[FILL: name]")];
    L.FIELDS.slice(1).forEach(function (f) { Ln.push(f[1] + ": " + (str(c[f[0]]).trim() || "[FILL]")); });
    if (c.example) Ln.push("(Fictional teaching example for Channel Light Excursions. Replace with your own facts.)");
    return Ln.join("\n");
  };

  L.EXAMPLES = [
    { id: "ex-lodge", example: true, name: "Whale Only plus lodge night",
      who: "Independent travelers staying two or more nights in Juneau in May, early June and September",
      resource: "Open Whale Only seats on light days, plus one room night at Tern Point Lodge (fictional partner)",
      avoids: "Whale Only has no glacier stop, so it uses no allocation slot",
      when: "Light days in May, early June and September (the lodge's package months)",
      price: "One total per person, double occupancy, all fees the guest cannot avoid included: Whale Only $159 adult (fictional) plus the lodge night [FILL: Tern Point rate] plus taxes and fees [FILL]",
      capacity: "[FILL: rooms a night the lodge will hold]; seats from open Whale Only capacity",
      staff: "No extra crew; reservations handles the package",
      partner: "Tern Point Lodge (fictional): written rate, room block and cancellation terms",
      risks: "Lodge-night package price falls under the FTC fee rule (total price shown); who refunds what if one half cancels; partner capacity",
      test: "Offer four light weekends in May to the direct email list. Kill if fewer than [FILL] packages sell.",
      scores: { desirability: 4, feasibility: 3, viability: 3, capIndependence: 5 } },
    { id: "ex-birding", example: true, name: "Early-May birding cruise",
      who: "Birders who travel in shoulder season, and local birding groups",
      resource: "Vessel and a naturalist guide on light mornings",
      avoids: "No glacier stop, so no allocation slot",
      when: "Light mornings in early to mid May",
      price: "[FILL: total per adult, all fees in]; first test near the Whale Only price ($159 adult, fictional)",
      capacity: "Up to the vessel certificate limit (30 in the example); sell [FILL] to leave rail space",
      staff: "Captain, deckhand and a guide who knows birds [FILL: who on the team]",
      partner: "Optional: a local birding group to co-host [FILL]",
      risks: "Thin demand; guide expertise; early-May weather",
      test: "Two departures, promoted to local groups and the email list. Kill if under [FILL] seats sell.",
      scores: { desirability: 3, feasibility: 4, viability: 2, capIndependence: 5 } },
    { id: "ex-locals", example: true, name: "Locals' Saturday",
      who: "Juneau residents and their visiting family",
      resource: "Open Whale Only seats on Saturdays, the lightest weekday in 2026 (66% glacier use, fictional)",
      avoids: "Whale Only uses no glacier slot",
      when: "Saturdays in May and September",
      price: "[FILL: locals' total price]; check rate parity before setting it",
      capacity: "Open seats on Saturday departures",
      staff: "Existing Saturday crew",
      partner: "None",
      risks: "A lower locals' price may conflict with rate-parity clauses in OTA or cruise line contracts (check your contracts); residency checks; may pull full-price guests",
      test: "One Saturday a month, promoted locally. Kill if most buyers would have paid full price.",
      scores: { desirability: 3, feasibility: 4, viability: 1, capIndependence: 4 } },
    { id: "ex-photo", example: true, name: "September photography departure",
      who: "Photographers who want fall light and room at the rail",
      resource: "Vessel on light September afternoons, small group",
      avoids: "No glacier stop, so no allocation slot",
      when: "Light days in September, late afternoon",
      price: "[FILL: total per person, small group, all fees in]",
      capacity: "[FILL: for example 12 seats] for rail space, never above the vessel certificate limit",
      staff: "Captain, deckhand and a guide who photographs [FILL]",
      partner: "None",
      risks: "Fewer seats need a higher price; weather; sunset timing",
      test: "Two departures sold direct. Kill if either is under half full.",
      scores: { desirability: 3, feasibility: 4, viability: 3, capIndependence: 5 } }
  ];

  L.DEMO_INPUTS = {
    resources: [
      "Whale Only cruise: no glacier stop, so no allocation slot (adult $159, child $119, fictional).",
      "Vessel seats and crew on light days in May and September.",
      "Naturalist guides on light days.",
      "Tern Point Lodge (fictional partner): 18 rooms, packages for independent travelers in May, early June and September.",
      "Kestrel Shuttle (fictional partner): two 24-seat buses and one 14-seat van; 30 minutes notice for an extra run."
    ].join("\n"),
    segments: [
      "Independent travelers staying two or more nights.",
      "Juneau residents and their visiting family.",
      "Special-interest visitors (birding, photography) in May and September.",
      "Guests staying at Tern Point Lodge."
    ].join("\n")
  };

  /* ---------- scoring ---------- */
  L.readRule = function (o) {
    o = o || {}; var D = L.RULE_DEFAULTS, out = { weights: {}, errors: [] };
    L.CRITERIA.forEach(function (c) {
      var k = "w_" + c[0], s = str(o[k]).trim(), v = s === "" ? D[k] : num(s);
      if (v === null || v > 5) { out.errors.push("Weight for " + c[1] + ": enter 0 to 5."); v = D[k]; }
      out.weights[c[0]] = v;
    });
    var total = 0; Object.keys(out.weights).forEach(function (k) { total += out.weights[k]; });
    if (total <= 0) { out.errors.push("Set at least one weight above 0."); L.CRITERIA.forEach(function (c) { out.weights[c[0]] = 1; }); }
    [["minScore", "Test threshold", 5], ["floor", "Lowest single score", 5], ["minCap", "Cap-independence minimum", 5]].forEach(function (r) {
      var s = str(o[r[0]]).trim(), v = s === "" ? D[r[0]] : num(s);
      if (v === null || v > r[2]) { out.errors.push(r[1] + ": enter a number from 0 to " + r[2] + "."); v = D[r[0]]; }
      out[r[0]] = v;
    });
    return out;
  };
  L.score = function (scores, rule) {
    rule = rule || L.readRule({});
    scores = scores || {};
    var missing = L.CRITERIA.filter(function (c) { var v = scores[c[0]]; return !(v >= 1 && v <= 5); });
    if (missing.length) return { weighted: null, decision: "unscored", reasons: ["Not scored yet: " + missing.map(function (c) { return c[1].toLowerCase(); }).join(", ") + "."] };
    var sw = 0, s = 0;
    L.CRITERIA.forEach(function (c) { sw += rule.weights[c[0]]; s += rule.weights[c[0]] * scores[c[0]]; });
    var w = Math.round((s / sw) * 100) / 100, reasons = [];
    if (w < rule.minScore) reasons.push("weighted score " + w.toFixed(2) + " is below " + rule.minScore);
    var low = L.CRITERIA.filter(function (c) { return scores[c[0]] < rule.floor; });
    if (low.length) reasons.push(low.map(function (c) { return c[1].toLowerCase() + " " + scores[c[0]]; }).join(", ") + " below the floor of " + rule.floor);
    if (scores.capIndependence < rule.minCap) reasons.push("cap-independence " + scores.capIndependence + " is below " + rule.minCap);
    return { weighted: w, decision: reasons.length ? "kill" : "test", reasons: reasons.length ? reasons : ["meets every part of the rule"] };
  };
  L.ruleText = function (rule) {
    var w = L.CRITERIA.map(function (c) { return c[1].toLowerCase() + " x" + rule.weights[c[0]]; }).join(", ");
    return "Test if the weighted score (" + w + ") is at least " + rule.minScore + ", no single score is below " + rule.floor + ", and cap-independence is at least " + rule.minCap + ". Otherwise kill.";
  };
  L.scoresCSV = function (concepts, rule) {
    var rows = [["concept", "desirability", "feasibility", "viability", "cap_independence", "weighted", "decision", "reasons"]];
    (concepts || []).forEach(function (c) {
      var r = L.score(c.scores, rule), s = c.scores || {};
      rows.push([c.name || "(unnamed)", s.desirability || "", s.feasibility || "", s.viability || "", s.capIndependence || "", r.weighted === null ? "" : r.weighted.toFixed(2), r.decision, r.reasons.join("; ")]);
    });
    return "# Kill-or-test scores (ATIA Operations Kit 3b). Rule: " + L.ruleText(rule) + " Policy choice: the owner sets the rule before scoring.\n" + L.toCSV(rows);
  };

  /* ---------- prompts ---------- */
  L.conceptsPrompt = function (o) {
    o = o || {};
    var facts = str(o.facts).trim() || "None supplied. Where a fact about products, prices, boats, crew or partners is needed, write [FILL] instead of guessing.";
    var res = str(o.resources).trim() || "[FILL: boats, crew, partners and products that the cap does not touch, and when they sit idle]";
    var seg = str(o.segments).trim() || "[FILL: guest groups you do not serve well today]";
    return [
      "I run a small Alaska tour business. One product is limited by a regulatory cap. Help me design up to 5 new product concepts that grow the business where the cap does not bind: on light days, with resources the cap does not touch, and for guests I do not serve well today.",
      "",
      "My approved facts:",
      facts,
      "",
      "Resources the cap does not touch:",
      res,
      "",
      "Guest groups to consider:",
      seg,
      "",
      "Light days next season (computed on my device from a port schedule; no guest data):",
      str(o.light).trim() || "[NO LIGHT-DAY LIST YET]",
      "",
      "Frame: Theory of Constraints, step 5 (repeat): go back to step 1 where the cap does not bind. There the constraint is demand: there is no product those guests want yet. Do not let inertia, selling only the capped product, become the constraint. Do not plan on more allocation: elevating a regulatory cap is the land manager's decision, not mine.",
      "",
      "For each concept, fill this card:",
      L.FIELDS.map(function (f) { return "- " + f[1] + ":"; }).join("\n"),
      "",
      "Rules:",
      "- Every concept uses no capped slot on capped days. Say how in \"Which cap it avoids, and how\".",
      "- Use only my facts. Do not invent prices, demand, market sizes, competitor offers or statistics. Where a number is needed, write [FILL: what is needed].",
      "- Prices are shown as the total the guest pays, with every fee the guest cannot avoid. Any concept that includes a lodge night falls under the FTC fee rule for short-term lodging (16 CFR Part 464): total price shown.",
      "- Capacity never goes above the vessel's Coast Guard certificate limit. Whale viewing keeps the legal approach distance (100 yards for humpbacks in Alaska); never promise closer viewing or a sighting.",
      "- No invented reviews or testimonials (FTC rule, 16 CFR Part 465).",
      "- For each concept, name the cheapest test and the result that would kill it.",
      "- After the 5 cards, list \"Questions for the owner\" with every [FILL].",
      "- Mark the whole answer DRAFT - PENDING OWNER REVIEW."
    ].join("\n");
  };

  L.offerPrompt = function (o) {
    o = o || {};
    var lo = num(o.minPrice), hi = num(o.maxPrice), range;
    if (lo !== null && hi !== null && lo <= hi) range = "between $" + lo + " and $" + hi + " total per person";
    else range = "[FILL: the owner's minimum and maximum total price per person]";
    var concepts = str(o.concepts).trim() || "[FILL: the concept cards you decided to test]";
    var lodging = !!o.lodging;
    return [
      "Draft an offer calendar for the light days below. Drafts only: I review, price and publish every offer myself.",
      "",
      "Concepts to offer (already scored \"test\" by the owner):",
      concepts,
      "",
      "Light days (computed on my device; no guest data):",
      str(o.light).trim() || "[NO LIGHT-DAY LIST YET]",
      "",
      "Channels: " + (str(o.channels).trim() || "[FILL: where offers go, for example own website and email list]"),
      "Booking and cancellation terms: " + (str(o.terms).trim() || "[FILL: the owner's written terms]"),
      "",
      "Make a table with one row per offer: dates, why those days (light), concept, total price, channel, date to publish, and a message draft under 60 words. Group nearby dates instead of one row per day.",
      "",
      "Pricing guardrails:",
      "- Every price stays " + range + ". Show it as the total price, with every fee the guest cannot avoid. No price outside the range, and nothing on heavy days.",
      lodging ? "- These offers include a lodge night. The FTC Rule on Unfair or Deceptive Fees (16 CFR Part 464) covers short-term lodging: wherever a price appears, show the total price, with every fee the guest cannot avoid. Write [OWNER: confirm the total with the lodge] next to each lodge price." :
        "- If an offer includes a lodge night, the FTC Rule on Unfair or Deceptive Fees (16 CFR Part 464) covers it: show the total price. Tours sold alone are not covered by that rule; show the total anyway.",
      "- No fake urgency: no countdowns, no \"last chance\" for an offer that will run again, no \"only N left\" unless N comes from the live booking system when the message is sent (write [OWNER: live count] instead).",
      "- No invented reviews, testimonials, star ratings or quotes (FTC rule, 16 CFR Part 465). If a real review would help, write [OWNER: paste an exact real review, or leave out].",
      "- No promise of wildlife sightings, weather or closer viewing than the legal approach distance.",
      "- Do not change any existing price. The owner sets every price and publishes every offer.",
      "",
      "End with \"Questions for the owner\" listing every [FILL] and [OWNER] item. Mark the whole answer DRAFT - PENDING OWNER REVIEW."
    ].join("\n");
  };

  /* the printable version for the Prompt Kit (dev/core-prompt.txt is generated from this) */
  L.corePrompt = function () {
    return L.conceptsPrompt({
      facts: "[PASTE YOUR APPROVED FACTS: products, prices, boats, crew roles, partners. No guest or staff data.]",
      resources: "[LIST WHAT THE CAP DOES NOT TOUCH: boats, crew, partners and products, and when they sit idle]",
      segments: "[LIST GUEST GROUPS YOU DO NOT SERVE WELL TODAY]",
      light: "[PASTE THE LIGHT-DAY LIST FROM TOOL 3b: light, medium and heavy counts, the rule, light days by month and by weekday]"
    });
  };

  /* ---------- weekly no-code refresh recipe (Markdown) ---------- */
  L.recipeMarkdown = function (st, today) {
    st = st || L.readSettings({});
    var f = function (n) { return L.fmtInt(n); };
    return [
      "# Weekly light-day refresh: a no-code recipe",
      "",
      "From the ATIA Operations Kit, tool 3b Off-cap product lab: https://preig.github.io/atiaops/3b/",
      "",
      "**Status: draft recipe, untested in live accounts.** Step names in Google Sheets, Zapier and Make change; check each tool's help when a step is not where this says. Teaching data is fictional (Channel Light Excursions, Juneau).",
      "",
      "**What it does:** once a week it refreshes the light-day list for the next 8 weeks and drafts offer copy for the owner to review. **It never publishes, never sends and never changes a price.**",
      "",
      "**Effort (estimates):** 1 to 3 hours to set up; 15 to 30 minutes a week to review. **Cost:** the spreadsheet is free; a scheduled multi-step automation in Zapier or Make may need a paid plan (check current plans).",
      "",
      "## Your settings (from the page" + (today ? ", " + today : "") + ")",
      "",
      "- Daily passenger limit: " + f(st.limit) + " (Saturday " + f(st.satLimit) + ")",
      "- Heavy: passengers in port at or above " + st.heavyPct + "% of the limit, or last season's use for that month and weekday at or above " + st.heavyUse + "%",
      "- Light: passengers in port below " + st.lightPct + "% of the limit, and last season's use below " + st.lightUse + "% (or no use data)",
      "- Medium: everything else",
      "",
      "## 1. The sheet (estimate: 30 to 60 minutes)",
      "",
      "Make a Google Sheet with three tabs. No guest data goes in any of them.",
      "",
      "**Tab `days`**, one row per date:",
      "",
      "| Column | Header | Formula or source |",
      "|---|---|---|",
      "| A | date | 2027-05-01 and so on |",
      "| B | weekday | `=TEXT(A2,\"ddd\")` |",
      "| C | passengers_in_port | Sum of ships' passengers for that date, from the published cruise schedule for your port. [FILL: your source] |",
      "| D | limit | `=IF(B2=\"Sat\"," + st.satLimit + "," + st.limit + ")` |",
      "| E | load_pct | `=C2/D2*100` |",
      "| F | use_last_season_pct | Look up month and weekday in tab `use` (blank if you have none) |",
      "| G | class | `=IF(OR(E2>=" + st.heavyPct + ",AND(F2<>\"\",F2>=" + st.heavyUse + ")),\"heavy\",IF(AND(E2<" + st.lightPct + ",OR(F2=\"\",F2<" + st.lightUse + ")),\"light\",\"medium\"))` |",
      "| H | offer_status | blank, drafted, approved, published, skipped |",
      "| I | approved_by | initials of the one person who approved |",
      "",
      "**Tab `use`**: month, weekday, use_pct, from last season's daily counts (the summary CSV from tool 3a has used % by month and weekday).",
      "",
      "**Tab `offers`**: dates, concept, total_price, channel, draft, status, approved_by.",
      "",
      "## 2. The weekly run (Zapier or Make)",
      "",
      "1. **Trigger:** a schedule, every Monday at 7:00. Look for \"Schedule\" (Zapier) or the scenario scheduling setting (Make).",
      "2. **Find rows** in `days` where the date is within the next 8 weeks, class is `light`, and offer_status is blank.",
      "3. **AI step:** send the offer calendar prompt from the 3b page with those dates, your \"test\" concepts and your price range. Dates and counts only. Check the AI provider's business data terms first (Contractual).",
      "4. **Write drafts** into tab `offers` with status `DRAFT - PENDING OWNER REVIEW`, and set offer_status to `drafted` in `days`.",
      "5. **Notify** the owner by email or chat: how many light days are coming and how many drafts are waiting.",
      "",
      "Never add a step that publishes, sends, posts or changes a price.",
      "",
      "## 3. The owner's review (estimate: 15 to 30 minutes a week)",
      "",
      "- [ ] Every price is the total price, inside the owner's range.",
      "- [ ] A lodge-night package shows the total price, with every fee the guest cannot avoid (16 CFR Part 464 covers short-term lodging). Confirm current text.",
      "- [ ] No fake urgency: no countdowns, no \"only N left\" unless the live count is checked when it goes out.",
      "- [ ] No invented reviews or testimonials (16 CFR Part 465).",
      "- [ ] No promise of sightings, weather or closer whale viewing than the legal approach distance.",
      "- [ ] Approve, edit or delete each draft. Publish by hand. Write your initials in approved_by.",
      "",
      "## 4. Is it working?",
      "",
      "- Monthly in season: share of bookings on light days (bookings on light days divided by all bookings), with the same light-day rule all season.",
      "- Season end: Number 4 (revenue per allocated slot) should not fall; off-cap net revenue (products that use no capped slot) is the growth.",
      "",
      "## What this recipe does not do",
      "",
      "- It does not set or change prices, publish offers or send messages.",
      "- It does not read guest data, and none should be added.",
      "- It has not been tested in a live Zapier or Make account. Test it on a copy of the sheet first.",
      ""
    ].join("\n");
  };

  /* ---------- measure ---------- */
  L.lightShare = function (light, total) {
    var a = num(light), b = num(total);
    if (a === null || b === null) return { error: "Enter bookings on light days and all bookings." };
    if (b <= 0) return { error: "All bookings need to be above 0." };
    if (a > b) return { error: "Bookings on light days cannot be more than all bookings." };
    return { value: (100 * a) / b };
  };

  /* fictional embeds to working inputs */
  L.daysFromEmbed = function (emb) {
    var c = {}; emb.columns.forEach(function (x, i) { c[x] = i; });
    return emb.rows.map(function (r) { return { date: r[c.date], ships: r[c.ships], passengers: r[c.passengers] }; });
  };
  L.useFromEmbed = function (emb) {
    var c = {}; emb.columns.forEach(function (x, i) { c[x] = i; });
    return emb.rows.map(function (r) { return { date: r[c.date], allocation: r[c.allocation], used: r[c.used] }; });
  };

  if (typeof module !== "undefined" && module.exports) module.exports = L;
  else root.LabCore = L;
})(this);
