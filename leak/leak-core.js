/* Season Leak Audit: pure logic. No page access, no storage, no network.
 * Used by index.html (as window.LeakCore) and by the Node tests in dev/ (require).
 * The same inputs always give the same results. Arithmetic on the user's own numbers only:
 * no benchmark, average or statistic is built in.
 */
(function (root) {
  "use strict";
  var L = {};
  L.VERSION = 2;
  L.FORMAT = "atiaops-season-leak-audit";

  /* ---------- fields: key -> [label, kind, block] ----------
   * kinds: count (whole number), money, hours, pct (0 to 100), points (0 to 100) */
  var FIELDS = {
    u: ["Uncertainty, plus or minus %", "pct", "general"],
    netrev: ["Season net revenue", "money", "general"],
    c_positions: ["Seasonal positions", "count", "crew"],
    c_returning: ["Returning staff", "count", "crew"],
    c_eligible: ["Eligible to return from last season", "count", "crew"],
    c_hires: ["New hires, including replacements", "count", "crew"],
    c_quits: ["Early quits in the first 30 days", "count", "crew"],
    c_cost: ["All-in cost per hire", "money", "crew"],
    c_x: ["What if the rehire rate rose by (points)", "points", "crew"],
    c_y: ["What if the early-quit rate fell by (points)", "points", "crew"],
    b_ads: ["Ads and job boards", "money", "builder"],
    b_sponsor: ["Sponsor or agency fees", "money", "builder"],
    b_travel: ["Travel to the job", "money", "builder"],
    b_housing: ["Housing setup share", "money", "builder"],
    b_hire_h: ["Hiring time, hours", "hours", "builder"],
    b_hire_rate: ["Hiring time, cost per hour", "money", "builder"],
    b_train_h: ["Training, paid hours", "hours", "builder"],
    b_train_wage: ["Training, wage per hour", "money", "builder"],
    b_trainer_h: ["Trainer time, hours", "hours", "builder"],
    b_trainer_rate: ["Trainer time, cost per hour", "money", "builder"],
    b_ramp: ["Ramp-up shortfall", "money", "builder"],
    r_events: ["Disruption events", "count", "road"],
    r_guests: ["Guests on disrupted bookings", "count", "road"],
    r_recovered: ["Guests recovered (rebooked or seat refilled)", "count", "road"],
    r_net: ["Average net revenue per guest", "money", "road"],
    r_hours: ["Staff hours spent on disruptions", "hours", "road"],
    r_rate: ["Loaded cost per staff hour", "money", "road"],
    /* part (a): empty slots on days below the cap */
    k_unused: ["Unused slots on days below the cap", "count", "cap"],
    k_vps: ["Value per filled slot", "money", "cap"],
    k_fill: ["Realistic fill share, %", "pct", "cap"],
    /* part (b): value gap on days at the cap */
    k_capguests: ["Combo guests on capped days", "count", "cap"],
    k_extra: ["Extra net per slot (your estimate)", "money", "cap"],
    k_capturned: ["Requests turned away on capped days (evidence)", "count", "cap"],
    /* part (c): seats-and-timing turn-aways on days below the cap */
    k_seatturned: ["Seats-or-timing turn-aways on days below the cap", "count", "cap"],
    k_combonet: ["Combo net per guest", "money", "cap"],
    k_recap: ["Recapture share, %", "pct", "cap"],
    /* season totals, optional: Number 4 and allocation used */
    k_alloc: ["Allocated slots for the season", "count", "cap"],
    k_used: ["Allocated slots used", "count", "cap"],
    k_rev: ["Net revenue of the capped product", "money", "cap"]
  };
  L.FIELDS = FIELDS;
  L.KEYS = Object.keys(FIELDS);
  L.DEFAULT_U = 30;
  L.BUILDER = [
    { label: "Ads and job boards", keys: ["b_ads"] },
    { label: "Sponsor or agency fees", keys: ["b_sponsor"] },
    { label: "Travel to the job", keys: ["b_travel"] },
    { label: "Housing setup share", keys: ["b_housing"] },
    { label: "Hiring time", keys: ["b_hire_h", "b_hire_rate"] },
    { label: "Training wage", keys: ["b_train_h", "b_train_wage"] },
    { label: "Trainer time", keys: ["b_trainer_h", "b_trainer_rate"] },
    { label: "Ramp-up shortfall", keys: ["b_ramp"] }
  ];
  L.TOOLS = {
    crew: { code: "1a", label: "1.a", name: "Rehire before you recruit", href: "../1a/" },
    road: { code: "2a", label: "2.a", name: "Journey FMEA and disruption playbook", href: "../2a/" },
    cap: { code: "3a", label: "3.a", name: "Fill every capped slot", href: "../3a/" }
  };
  L.NAMES = { crew: "Crew leak", road: "Road leak", cap: "Cap leak" };

  /* Channel Light Excursions, Juneau: FICTIONAL TEACHING BUSINESS. Same numbers as data/summary_2026.json and DESIGN.md. */
  L.EXAMPLE = {
    label: "2026 (fictional)", u: "30", netrev: "1,969,807",
    c_positions: "22", c_returning: "6", c_eligible: "17", c_hires: "20", c_quits: "4", c_cost: "2,800", c_x: "15", c_y: "10",
    b_ads: "120", b_sponsor: "350", b_travel: "520", b_housing: "300", b_hire_h: "5", b_hire_rate: "45",
    b_train_h: "32", b_train_wage: "21", b_trainer_h: "12", b_trainer_rate: "34", b_ramp: "200",
    r_events: "38", r_guests: "545", r_recovered: "191", r_net: "152.53", r_hours: "127.8", r_rate: "32",
    k_unused: "3,139", k_vps: "115.67", k_fill: "30",
    k_capguests: "6,535", k_extra: "10", k_capturned: "1,629",
    k_seatturned: "307", k_combonet: "157.84", k_recap: "25",
    k_alloc: "15,300", k_used: "12,096", k_rev: "1,769,688"
  };

  /* ---------- small helpers ---------- */
  function str(v) { return v === undefined || v === null ? "" : String(v).trim(); }
  function clean(s, max) { return str(s).replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max || 120); }
  L.clean = clean;
  function round(n, d) { var f = Math.pow(10, d || 0); return Math.round((n + (n >= 0 ? 1 : -1) * 1e-9) * f) / f; }
  L.round = round;
  function commas(s) { var p = String(s).split("."); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ","); return p.join("."); }
  function isNum(n) { return typeof n === "number" && isFinite(n); }

  /* "$2,800"; with cents=true, "$152.53" when the value has cents */
  L.money = function (n, cents) {
    if (!isNum(n)) return "[FILL]";
    var neg = n < 0, a = Math.abs(n), s;
    if (cents && round(a, 2) % 1 !== 0) s = commas(round(a, 2).toFixed(2));
    else s = commas(String(Math.round(a)));
    return (neg ? "-$" : "$") + s;
  };
  /* Rounded for display, so a range does not look more precise than it is. */
  L.nice = function (n) {
    if (!isNum(n)) return n;
    var a = Math.abs(n), step = a >= 100000 ? 1000 : a >= 10000 ? 100 : a >= 1000 ? 10 : 1;
    return Math.round(n / step) * step;
  };
  L.moneyNice = function (n) { return L.money(L.nice(n)); };
  L.num = function (n, d) {
    if (!isNum(n)) return "[FILL]";
    var r = round(n, d || 0);
    return commas(d ? String(r) : String(Math.round(r)));
  };
  L.pct = function (n, d) { return isNum(n) ? round(n, d === undefined ? 1 : d).toFixed(d === undefined ? 1 : d) + "%" : "[FILL]"; };
  L.rangeText = function (r) { return r && isNum(r.mid) ? L.moneyNice(r.lo) + " to " + L.moneyNice(r.hi) : "[FILL]"; };

  /* ---------- parsing and validation ---------- */
  /* Blank -> {v:null}. Accepts "2,800", "$2,800", "30%". Rejects negatives, text, decimals in counts, percentages over 100. */
  L.parse = function (raw, kind) {
    var s = str(raw);
    if (s === "") return { v: null, err: null };
    s = s.replace(/^\$\s*/, "").replace(/[,\s]/g, "").replace(/%$/, "");
    if (/^[-\u2212]/.test(s)) return { v: null, err: "Cannot be negative." };
    if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return { v: null, err: "Use a number, for example 1200." };
    var n = parseFloat(s);
    if (!isFinite(n)) return { v: null, err: "Use a number, for example 1200." };
    if (n > 1e10) return { v: null, err: "That number is too large for this audit." };
    if (kind === "count" && Math.floor(n) !== n) return { v: null, err: "Use a whole number." };
    if ((kind === "pct" || kind === "points") && n > 100) return { v: null, err: "Use a percentage from 0 to 100." };
    return { v: n, err: null };
  };

  L.validate = function (input) {
    input = input || {};
    var v = {}, err = {}, warn = [];
    L.KEYS.forEach(function (k) {
      var p = L.parse(input[k], FIELDS[k][1]);
      v[k] = p.v;
      if (p.err) err[k] = p.err;
    });
    /* cross checks: an impossible pair blocks only the number that depends on it */
    if (v.c_quits !== null && v.c_hires !== null && v.c_quits > v.c_hires) { err.c_quits = "More early quits than new hires: check both counts."; v.c_quits = null; }
    if (v.c_returning !== null && v.c_eligible !== null && v.c_returning > v.c_eligible) { err.c_eligible = "Fewer eligible than returning staff: check both counts."; v.c_eligible = null; }
    if (v.r_recovered !== null && v.r_guests !== null && v.r_recovered > v.r_guests) { err.r_recovered = "More guests recovered than affected: check both counts."; v.r_recovered = null; }
    if (v.k_used !== null && v.k_alloc !== null && v.k_used > v.k_alloc) { err.k_used = "More slots used than allocated: check both counts."; v.k_used = null; }
    /* plausibility warnings: shown, never blocking */
    if (v.c_returning !== null && v.c_positions !== null && v.c_returning > v.c_positions) warn.push("More returning staff than positions: check the counts.");
    if (v.c_positions !== null && v.c_hires !== null && v.c_returning !== null && v.c_hires + v.c_returning < v.c_positions)
      warn.push("Returning staff plus new hires is less than positions: some positions went unfilled, or a count is off.");
    if (v.r_events !== null && v.r_guests !== null && v.r_events > v.r_guests) warn.push("More disruption events than guests affected: check the counts.");
    if (v.k_unused !== null && v.k_alloc !== null && v.k_used !== null && v.k_unused > v.k_alloc - v.k_used)
      warn.push("More unused slots on days below the cap than unused slots for the whole season: check the counts.");
    return { v: v, err: err, warn: warn };
  };

  function rng(mid, u) { return { mid: mid, lo: mid * (1 - u / 100), hi: mid * (1 + u / 100) }; }
  L.range = rng;
  function setRange(o, mid, u) { var r = rng(mid, u); o.mid = r.mid; o.lo = r.lo; o.hi = r.hi; }
  function rate(num, den) {
    if (num === null || den === null || den === 0) return null;
    return { value: 100 * num / den, num: num, den: den, onePerson: 100 / den };
  }
  L.rate = rate;

  /* ---------- cost per hire from its parts ---------- */
  L.costParts = function (v) {
    var lines = [], total = 0, any = false, partial = [];
    L.BUILDER.forEach(function (b) {
      var vals = b.keys.map(function (k) { return v[k]; });
      var have = vals.filter(function (x) { return x !== null && x !== undefined; }).length;
      if (!have) return;
      if (have < vals.length) { partial.push(b.label); return; }
      var amt = vals.length === 1 ? vals[0] : vals[0] * vals[1];
      any = true; total += amt;
      lines.push({ label: b.label, amount: amt, detail: vals.length === 1 ? L.money(amt, true) : L.num(vals[0], 1) + " h x " + L.money(vals[1], true) + " = " + L.money(amt, true) });
    });
    return { any: any, total: any ? total : null, lines: lines, partial: partial };
  };

  /* ---------- crew leak ---------- */
  function whatIf(v, u) {
    var w = { x: v.c_x, y: v.c_y, active: false, extra: null, quitsAvoided: null, hiresAvoided: null, saved: null, notes: [] };
    if (w.x === null && w.y === null) return w;
    w.active = true;
    var extra = 0, qa = 0, ok = false;
    if (w.x !== null) {
      if (v.c_eligible === null || v.c_returning === null) w.notes.push("Enter returning staff and eligible to return to use the rehire what-if.");
      else {
        var room = Math.max(0, v.c_eligible - v.c_returning);
        extra = v.c_eligible * w.x / 100;
        if (extra > room) { extra = room; w.notes.push("Capped at the " + room + " eligible " + (room === 1 ? "person" : "people") + " who did not return."); }
        w.extra = extra; ok = true;
      }
    }
    if (w.y !== null) {
      if (v.c_hires === null || v.c_quits === null) w.notes.push("Enter new hires and early quits to use the early-quit what-if.");
      else {
        var y = w.y, eq = v.c_hires > 0 ? 100 * v.c_quits / v.c_hires : 0;
        if (y > eq) { y = eq; w.notes.push("Capped at the current early-quit rate of " + L.pct(eq) + "."); }
        qa = Math.max(0, v.c_hires - extra) * y / 100;
        w.quitsAvoided = qa; ok = true;
      }
    }
    if (ok) {
      var h = extra + qa;
      if (v.c_hires !== null && h > v.c_hires) h = v.c_hires;
      w.hiresAvoided = h;
      if (v.c_cost !== null) w.saved = rng(h * v.c_cost, u);
      else w.notes.push("Enter the cost per hire to put a dollar figure on it.");
    }
    return w;
  }

  function crew(v, u) {
    var r = { key: "crew", name: L.NAMES.crew, ready: false, missing: [], notes: [] };
    if (v.c_hires === null) r.missing.push("c_hires");
    if (v.c_cost === null) r.missing.push("c_cost");
    if (!r.missing.length) {
      r.ready = true; setRange(r, v.c_hires * v.c_cost, u);
      r.math = [L.num(v.c_hires) + " new hires x " + L.money(v.c_cost, true) + " per hire = " + L.money(r.mid, true)];
    }
    r.rehire = rate(v.c_returning, v.c_eligible);
    r.earlyQuit = rate(v.c_quits, v.c_hires);
    r.perPosition = v.c_positions && v.c_hires !== null ? v.c_hires / v.c_positions : null;
    if (v.c_eligible === 0) r.notes.push("No one was eligible to return, so there is no rehire rate.");
    if (v.c_hires === 0) r.notes.push("No new hires, so there is no early-quit rate.");
    r.whatIf = whatIf(v, u);
    return r;
  }

  /* ---------- road leak ---------- */
  function road(v, u) {
    var r = { key: "road", name: L.NAMES.road, ready: false, missing: [], notes: [], staffCounted: false };
    ["r_guests", "r_recovered", "r_net"].forEach(function (k) { if (v[k] === null) r.missing.push(k); });
    r.recovery = rate(v.r_recovered, v.r_guests);
    if (v.r_guests === 0) r.notes.push("No guests on disrupted bookings, so there is no recovery rate.");
    r.notRecovered = v.r_guests !== null && v.r_recovered !== null ? v.r_guests - v.r_recovered : null;
    r.perEvent = v.r_events && v.r_guests !== null ? v.r_guests / v.r_events : null;
    if (r.missing.length) return r;
    r.lost = r.notRecovered * v.r_net;
    r.math = [L.num(r.notRecovered) + " guests not recovered (" + L.num(v.r_guests) + " minus " + L.num(v.r_recovered) + ") x " + L.money(v.r_net, true) + " = " + L.money(r.lost, true)];
    if (v.r_hours !== null && v.r_rate !== null) {
      r.staff = v.r_hours * v.r_rate; r.staffCounted = true;
      r.math.push(L.num(v.r_hours, 1) + " staff hours x " + L.money(v.r_rate, true) + " = " + L.money(r.staff, true));
    } else {
      r.staff = 0;
      r.notes.push("Staff time not counted yet: add both staff hours and the cost per hour.");
    }
    r.ready = true; setRange(r, r.lost + r.staff, u);
    if (r.staffCounted) r.math.push(L.money(r.lost, true) + " + " + L.money(r.staff, true) + " = " + L.money(r.mid, true));
    return r;
  }

  /* ---------- cap leak: three separate parts ---------- */
  function cap(v, u) {
    var r = { key: "cap", name: L.NAMES.cap, ready: false, missing: [], notes: [], a: null, b: null, c: null, math: [] };
    /* season totals: Number 4 and allocation used (optional context, never part of the leak) */
    r.usedPct = v.k_alloc && v.k_used !== null ? 100 * v.k_used / v.k_alloc : null;
    r.revPerSlot = v.k_alloc && v.k_rev !== null ? v.k_rev / v.k_alloc : null;
    var need = { a: ["k_unused", "k_vps", "k_fill"], b: ["k_capguests", "k_extra"], c: ["k_seatturned", "k_combonet", "k_recap"] };
    r.missingParts = {};
    Object.keys(need).forEach(function (p) { r.missingParts[p] = need[p].filter(function (k) { return v[k] === null; }); });
    if (!r.missingParts.a.length) {
      r.a = v.k_unused * v.k_vps * v.k_fill / 100;
      r.math.push("(a) " + L.num(v.k_unused) + " unused slots below the cap x " + L.money(v.k_vps, true) + " x " + L.num(v.k_fill, 1) + "% = " + L.money(r.a, true));
    }
    if (!r.missingParts.b.length) {
      r.b = v.k_capguests * v.k_extra;
      r.math.push("(b) " + L.num(v.k_capguests) + " combo guests on capped days x " + L.money(v.k_extra, true) + " = " + L.money(r.b, true));
    }
    if (!r.missingParts.c.length) {
      r.c = v.k_seatturned * v.k_combonet * v.k_recap / 100;
      r.math.push("(c) " + L.num(v.k_seatturned) + " turn-aways below the cap x " + L.money(v.k_combonet, true) + " x " + L.num(v.k_recap, 1) + "% = " + L.money(r.c, true));
    }
    var parts = ["a", "b", "c"].filter(function (p) { return r[p] !== null; });
    if (!parts.length) {
      var all = [];
      ["a", "b", "c"].forEach(function (p) { r.missingParts[p].forEach(function (k) { if (all.indexOf(k) < 0) all.push(k); }); });
      r.missing = all;
    } else {
      r.ready = true;
      setRange(r, parts.reduce(function (s, p) { return s + r[p]; }, 0), u);
      if (parts.length > 1) r.math.push(parts.map(function (p) { return L.money(r[p], true); }).join(" + ") + " = " + L.money(r.mid, true));
      ["a", "b", "c"].forEach(function (p) { if (r[p] === null) r.notes.push("Part (" + p + ") not counted yet."); });
      var big = parts.slice().sort(function (x, y) { return r[y] - r[x]; })[0];
      r.largest = r[big] > 0 ? big : null;
    }
    ["a", "b", "c"].forEach(function (p) { if (r[p] !== null) r[p + "Range"] = rng(r[p], u); });
    /* is there evidence that a capped-day slot could earn more? */
    r.headroom = v.k_capturned === null ? null : v.k_capturned > 0;
    if (r.b !== null && r.b > 0 && r.headroom === false) r.notes.push("No requests were turned away on capped days, so there is little evidence a higher price would hold: treat part (b) as a guess.");
    return r;
  }

  /* The teaching point: which constraint binds depends on the day. */
  L.bindingText = function (c, v) {
    var s = [];
    if (c && c.headroom === true && c.b !== null) s.push("Evidence of headroom at the cap: " + L.num(v.k_capturned) + " requests were turned away on capped days, so demand exceeded the slots there.");
    if (c && c.headroom === false) s.push("No requests were turned away on capped days: little evidence that a capped-day slot could earn more.");
    if (c && c.largest === "a") s.push("On these numbers the biggest part is (a): on days below the cap, demand binds, not the cap.");
    if (c && c.largest === "b") s.push("On these numbers the biggest part is (b): at the cap, the lever is value per slot, not volume.");
    if (c && c.largest === "c") s.push("On these numbers the biggest part is (c): on days below the cap, your own seats and departure times turn guests away, and that constraint is yours to elevate.");
    if (!s.length) s.push("Fill in the parts above to see which constraint matters most on your numbers.");
    return s.join(" ");
  };

  /* ---------- the whole audit ---------- */
  L.rank = function (leaks) {
    var order = { crew: 0, road: 1, cap: 2 };
    var list = leaks.filter(function (l) { return l && l.ready && l.mid > 0; })
      .sort(function (a, b) { return (b.mid - a.mid) || (order[a.key] - order[b.key]); });
    return list.map(function (l, i) {
      return {
        key: l.key, name: l.name, mid: l.mid, lo: l.lo, hi: l.hi, tool: L.TOOLS[l.key],
        overlapsNext: i < list.length - 1 && l.lo <= list[i + 1].hi,
        overlapsPrev: i > 0 && list[i - 1].lo <= l.hi
      };
    });
  };

  /* Judgment inputs with page defaults; they never count as "fictional data still on screen". */
  L.ASSUMPTIONS = ["u", "k_fill", "k_extra", "k_recap", "c_x", "c_y"];
  L.exampleShare = function (input) {
    input = input || {};
    var keys = L.KEYS.filter(function (k) { return L.ASSUMPTIONS.indexOf(k) < 0; }), hit = 0, filled = 0;
    keys.forEach(function (k) {
      var p = L.parse(input[k], FIELDS[k][1]);
      if (p.v === null) return;
      filled++;
      if (p.v === L.parse(L.EXAMPLE[k], FIELDS[k][1]).v) hit++;
    });
    return { share: keys.length ? hit / keys.length : 0, hit: hit, filled: filled, of: keys.length };
  };

  L.audit = function (input) {
    input = input || {};
    var val = L.validate(input), v = val.v;
    var uDefault = v.u === null, u = uDefault ? L.DEFAULT_U : v.u;
    var c = crew(v, u), r = road(v, u), k = cap(v, u);
    var leaks = [c, r, k], ready = leaks.filter(function (l) { return l.ready; });
    var total = ready.length ? rng(ready.reduce(function (s, l) { return s + l.mid; }, 0), u) : null;
    var share = total && v.netrev ? { lo: 100 * total.lo / v.netrev, mid: 100 * total.mid / v.netrev, hi: 100 * total.hi / v.netrev } : null;
    var cp = L.costParts(v);
    return {
      label: clean(input.label, 60), v: v, err: val.err, warn: val.warn, u: u, uDefault: uDefault,
      crew: c, road: r, cap: k, leaks: leaks, ready: ready, total: total, share: share,
      ranking: L.rank(leaks), costParts: cp, example: L.exampleShare(input),
      errorCount: Object.keys(val.err).length
    };
  };

  /* ---------- sentences ---------- */
  L.copqText = function (a) {
    if (!a.total) return "Fill in at least one block to see the total.";
    var s = "Together, the leaks you entered come to about " + L.moneyNice(a.total.lo) + " to " + L.moneyNice(a.total.hi) +
      " a season (midpoint " + L.money(a.total.mid) + "). That is what Six Sigma calls the cost of poor quality: money spent or lost because a process did not work right the first time.";
    if (a.cap.ready) s += " The cap leak is mostly lost opportunity, the hidden part of that cost.";
    if (a.share) s += " It is about " + L.pct(a.share.lo, 0) + " to " + L.pct(a.share.hi, 0) + " of the season's net revenue.";
    if (a.ready.length < 3) s += " Blocks not filled in yet are not in the total.";
    return s;
  };

  L.LARGEST = {
    a: "Its largest part is (a), empty slots on days below the cap: volume you can add without a bigger permit, because there demand binds, not the cap.",
    b: "Its largest part is (b), the value gap on capped days: at the cap the lever is value per slot (price or mix), an owner decision. Test the extra net per slot in 3.c before you rely on it.",
    c: "Its largest part is (c), seats-and-timing turn-aways below the cap: check whether adding or moving a departure fits your vessel certificate, crew and transfers."
  };
  L.rankNote = function (a, item, i) {
    var s = "";
    if (item.overlapsNext && item.overlapsPrev) s = "Its range overlaps the leaks on both sides, so its place in the order is too close to call on these numbers.";
    else if (item.overlapsNext) s = "Its range overlaps the next leak's range, so the order between them is too close to call on these numbers. Start with the one you can act on sooner.";
    else if (item.overlapsPrev) s = "Too close to call against the leak above it.";
    else if (i === 0 && a.ranking.length > 1) s = "Clearly the largest on these numbers: its range does not overlap the next one.";
    if (item.key === "cap" && a.cap.largest) s += (s ? " " : "") + L.LARGEST[a.cap.largest];
    if (item.key === "cap") s += (s ? " " : "") + "Much of it rests on your fill share, extra net per slot and recapture share, which are judgments: run Challenge my audit before you act on it.";
    if (item.key === "crew") s += (s ? " " : "") + "Whatever its rank, 1.a has a deadline: ask last season's crew back before they commit elsewhere.";
    return s;
  };

  function part(n, f) { return n === null || n === undefined ? "[FILL]" : f(n); }
  function int(n) { return L.num(n); }
  function cents(n) { return L.money(n, true); }
  function rateText(rt) { return rt ? L.pct(rt.value) + " (" + L.num(rt.num) + " of " + L.num(rt.den) + ")" : "[FILL]"; }

  /* The "Challenge my audit" prompt: numbers only, no names. */
  L.challengePrompt = function (a) {
    var v = a.v, c = a.crew, r = a.road, k = a.cap, out = [];
    out.push("I run a seasonal tourism business in Alaska. Below is my Season Leak Audit for " + (a.label || "[SEASON]") + ": estimates of money spent or lost because a process did not work right the first time. Every number is mine, or arithmetic on mine. Your job is to challenge it, not to agree with it.");
    out.push("");
    out.push("Uncertainty I applied to every leak: plus or minus " + L.num(a.u, 1) + "%.");
    out.push("");
    out.push("1. CREW LEAK = new hires x all-in cost per hire");
    out.push("   " + part(v.c_hires, int) + " new hires (including replacements) x " + part(v.c_cost, cents) + " per hire = " + (c.ready ? L.money(c.mid, true) + ", range " + L.rangeText(c) : "[FILL]"));
    out.push("   Positions " + part(v.c_positions, int) + "; returning staff " + part(v.c_returning, int) + "; eligible to return " + part(v.c_eligible, int) + "; early quits in the first 30 days " + part(v.c_quits, int) + ".");
    out.push("   Rehire rate " + rateText(c.rehire) + "; early-quit rate " + rateText(c.earlyQuit) + ".");
    out.push("   Cost per hire: " + (a.costParts.any ? "parts I entered: " + a.costParts.lines.map(function (l) { return l.label.toLowerCase() + " " + l.detail; }).join("; ") + " (total " + L.money(a.costParts.total, true) + ")." : "one estimate, not itemized."));
    if (c.whatIf.active && c.whatIf.hiresAvoided !== null) out.push("   What if: rehire rate up " + part(v.c_x, function (x) { return L.num(x, 1); }) + " points and early-quit rate down " + part(v.c_y, function (x) { return L.num(x, 1); }) + " points: about " + L.num(c.whatIf.hiresAvoided, 1) + " fewer hires" + (c.whatIf.saved ? ", " + L.rangeText(c.whatIf.saved) + " saved." : "."));
    out.push("");
    out.push("2. ROAD LEAK = guests not recovered x average net per guest + staff hours x cost per hour");
    out.push("   " + part(v.r_events, int) + " disruption events; " + part(v.r_guests, int) + " guests on disrupted bookings; " + part(v.r_recovered, int) + " recovered (recovery rate " + (r.recovery ? L.pct(r.recovery.value) : "[FILL]") + ").");
    out.push("   " + part(r.notRecovered, int) + " not recovered x " + part(v.r_net, cents) + " = " + part(r.lost, cents) + "; staff " + part(v.r_hours, function (x) { return L.num(x, 1); }) + " hours x " + part(v.r_rate, cents) + " = " + (r.staffCounted ? cents(r.staff) : "[FILL]") + ".");
    out.push("   Road leak: " + (r.ready ? L.money(r.mid, true) + ", range " + L.rangeText(r) : "[FILL]"));
    out.push("");
    out.push("3. CAP LEAK, three separate parts");
    var pc = function (x) { return L.num(x, 1) + "%"; };
    out.push("   (a) Empty slots on days below the cap: " + part(v.k_unused, int) + " unused slots x " + part(v.k_vps, cents) + " value per filled slot x " + part(v.k_fill, pc) + " realistic fill share = " + part(k.a, cents) + ". Volume I could add without a bigger permit.");
    out.push("   (b) Value gap on days at the cap: " + part(v.k_capguests, int) + " combo guests on capped days x " + part(v.k_extra, cents) + " extra net per slot (my estimate of what premium pricing or mix could capture) = " + part(k.b, cents) + ". At the cap the lever is value per slot, not volume." +
      (v.k_capturned !== null ? " Requests turned away on capped days: " + int(v.k_capturned) + "." : ""));
    out.push("   (c) Seats-and-timing turn-aways on days below the cap: " + part(v.k_seatturned, int) + " requests x " + part(v.k_combonet, cents) + " combo net per guest x " + part(v.k_recap, pc) + " recapture share = " + part(k.c, cents) + ". A constraint I can elevate by adding or moving a departure.");
    out.push("   Allocation used: " + (k.usedPct !== null ? L.pct(k.usedPct) : "[FILL]") + "; revenue per allocated slot: " + (k.revPerSlot !== null ? L.money(k.revPerSlot, true) : "[FILL]") + ". Cap leak: " + (k.ready ? L.money(k.mid, true) + ", range " + L.rangeText(k) : "[FILL]"));
    out.push("");
    out.push("Total: " + (a.total ? L.rangeText(a.total) + " (midpoint " + L.money(a.total.mid) + ")" : "[FILL]") + ". Order by midpoint: " + (a.ranking.length ? a.ranking.map(function (x) { return x.name.toLowerCase(); }).join(", then ") : "[FILL]") + ".");
    out.push("");
    out.push("Do this:");
    out.push("1. For each leak, list every assumption behind it, including the hidden ones (for example: every early quit was replaced by one new hire; the average net per guest applies to the guests who were not recovered; a share of unused slots could really be sold on light days; the extra net per slot on capped days would hold without losing guests; a turned-away guest would have paid the average combo net).");
    out.push("2. For each assumption, say whether it more likely overstates or understates the leak, and why, in one or two sentences. Say \"I cannot tell\" when you cannot.");
    out.push("3. Name the record that would check each assumption (for example: payroll, the booking system export, the permit use report, the shuttle log).");
    out.push("4. Do not invent numbers, benchmarks, industry averages or statistics. If a comparison needs a number I have not given, write [FILL: what is needed] instead.");
    out.push("5. Say whether the order of the leaks would change under the most plausible corrections, and which estimate is least certain.");
    out.push("6. For the cap leak, say which constraint my numbers suggest binds on which days: demand, the regulatory cap, or my own seats and departure times. Do not assume the cap can be raised.");
    out.push("7. Do not recommend decisions about any individual employee. List any price change only as an option for me to evaluate.");
    out.push("");
    out.push("Mark the whole answer DRAFT - PENDING OWNER REVIEW.");
    return out.join("\n");
  };

  L.numbers = function (a) {
    var v = a.v;
    return [
      { n: 1, name: "Rehire rate", value: a.crew.rehire ? L.pct(a.crew.rehire.value) : null, how: a.crew.rehire ? L.num(a.crew.rehire.num) + " returned of " + L.num(a.crew.rehire.den) + " eligible" : "needs returning staff and eligible to return" },
      { n: 2, name: "Early-quit rate", value: a.crew.earlyQuit ? L.pct(a.crew.earlyQuit.value) : null, how: a.crew.earlyQuit ? L.num(a.crew.earlyQuit.num) + " quit of " + L.num(a.crew.earlyQuit.den) + " new hires" : "needs new hires and early quits" },
      { n: 3, name: "Disruption recovery rate", value: a.road.recovery ? L.pct(a.road.recovery.value) : null, how: a.road.recovery ? L.num(a.road.recovery.num) + " recovered of " + L.num(a.road.recovery.den) + " guests" : "needs guests affected and recovered" },
      { n: 4, name: "Revenue per allocated slot", value: a.cap.revPerSlot !== null ? L.money(a.cap.revPerSlot, true) : null,
        how: (a.cap.revPerSlot !== null ? L.money(v.k_rev) + " ÷ " + L.num(v.k_alloc) + " slots" : "needs net revenue of the capped product and allocated slots") + (a.cap.usedPct !== null ? "; allocation used " + L.pct(a.cap.usedPct) : "") }
    ];
  };

  L.summaryText = function (a) {
    var out = [], ex = a.example.share === 1;
    out.push("SEASON LEAK AUDIT" + (a.label ? " · " + a.label : ""));
    if (ex) out.push("Fictional example: Channel Light Excursions, Juneau, a fictional teaching business.");
    else if (a.example.hit > 0) out.push("Some numbers are still from the fictional example.");
    out.push("Ranges are plus or minus " + L.num(a.u, 1) + "%. Every figure is an estimate from the numbers entered.");
    out.push("");
    a.leaks.forEach(function (l) {
      out.push(l.name + ": " + (l.ready ? L.rangeText(l) + " (midpoint " + L.money(l.mid) + ")" : "not filled in"));
    });
    if (a.cap.ready) {
      out.push("   (a) empty slots on days below the cap: " + (a.cap.a !== null ? L.rangeText(a.cap.aRange) : "not counted"));
      out.push("   (b) value gap on days at the cap: " + (a.cap.b !== null ? L.rangeText(a.cap.bRange) : "not counted"));
      out.push("   (c) seats-and-timing turn-aways below the cap: " + (a.cap.c !== null ? L.rangeText(a.cap.cRange) : "not counted"));
    }
    out.push("");
    out.push(L.copqText(a));
    out.push("");
    out.push("START HERE (largest leak first)");
    if (!a.ranking.length) out.push("No leak to rank yet.");
    a.ranking.forEach(function (it, i) {
      out.push((i + 1) + ". " + it.name + ", " + L.rangeText(it) + ": open " + it.tool.label + " " + it.tool.name + ". " + L.rankNote(a, it, i));
    });
    out.push("");
    out.push("THE FOUR NUMBERS (baseline)");
    L.numbers(a).forEach(function (n) { out.push(n.n + ". " + n.name + ": " + (n.value || "not entered") + " (" + n.how + ")"); });
    if (a.cap.ready) { out.push(""); out.push("Which constraint binds: " + L.bindingText(a.cap, a.v)); }
    return out.join("\n");
  };

  /* ---------- saved history ---------- */
  function validDate(s) { s = str(s); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ""; }
  L.snapshot = function (input, meta) {
    meta = meta || {};
    var rec = { v: 1, id: str(meta.id) || "r0", label: clean(input && input.label, 60), note: clean(meta.note, 140), date: validDate(meta.date), savedAt: str(meta.savedAt), inputs: {} };
    L.KEYS.forEach(function (k) { var p = L.parse(input && input[k], FIELDS[k][1]); if (p.v !== null) rec.inputs[k] = p.v; });
    return rec;
  };
  L.normRecord = function (r) {
    if (!r || typeof r !== "object" || !r.inputs || typeof r.inputs !== "object") return null;
    var out = { v: 1, id: /^[\w-]{1,40}$/.test(str(r.id)) ? str(r.id) : "", label: clean(r.label, 60), note: clean(r.note, 140), date: validDate(r.date), savedAt: isNaN(Date.parse(str(r.savedAt))) ? "" : str(r.savedAt), inputs: {} };
    L.KEYS.forEach(function (k) {
      if (!(k in r.inputs)) return;
      var p = L.parse(r.inputs[k], FIELDS[k][1]);
      if (p.v !== null) out.inputs[k] = p.v;
    });
    return Object.keys(out.inputs).length ? out : null;
  };
  L.recordInput = function (rec) {
    var inp = { label: rec.label };
    L.KEYS.forEach(function (k) { inp[k] = rec.inputs[k] === undefined ? "" : String(rec.inputs[k]); });
    return inp;
  };
  L.recordAudit = function (rec) { return L.audit(L.recordInput(rec)); };
  L.sortRecords = function (recs) {
    return recs.slice().sort(function (a, b) {
      return (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) || (a.savedAt < b.savedAt ? -1 : a.savedAt > b.savedAt ? 1 : 0);
    });
  };
  /* Compare the newest saved audit with the one before it. A change inside the uncertainty band is noise. */
  L.compare = function (older, newer) {
    var A = L.recordAudit(older), B = L.recordAudit(newer);
    if (!A.total || !B.total) return null;
    var diff = B.total.mid - A.total.mid, overlap = A.total.lo <= B.total.hi && B.total.lo <= A.total.hi;
    return { from: older, to: newer, diff: diff, overlap: overlap,
      text: "Total midpoint " + (diff > 0 ? "up " : diff < 0 ? "down " : "unchanged ") + (diff ? L.moneyNice(Math.abs(diff)) + " " : "") + "from " + (older.label || older.date || "the earlier audit") + " to " + (newer.label || newer.date || "the newer audit") + ". " +
        (overlap ? "The two ranges overlap, so treat the change as noise until another season confirms it." : "The two ranges do not overlap: a real change, worth asking why.") };
  };
  function csvCell(x) { x = x === null || x === undefined ? "" : String(x); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }
  L.historyCSV = function (recs) {
    var head = ["date", "label", "note", "uncertainty_pct", "crew_low", "crew_mid", "crew_high", "road_low", "road_mid", "road_high", "cap_low", "cap_mid", "cap_high",
      "cap_a_mid", "cap_b_mid", "cap_c_mid", "total_low", "total_mid", "total_high", "rehire_rate_pct", "early_quit_rate_pct", "recovery_rate_pct", "allocation_used_pct", "revenue_per_slot"];
    var rows = [head.join(",")];
    L.sortRecords(recs).forEach(function (rec) {
      var a = L.recordAudit(rec), R = function (l, f) { return l && l.ready ? Math.round(l[f]) : ""; };
      var p = function (x) { return x ? round(x.value, 1) : ""; };
      rows.push([rec.date, rec.label, rec.note, a.u, R(a.crew, "lo"), R(a.crew, "mid"), R(a.crew, "hi"), R(a.road, "lo"), R(a.road, "mid"), R(a.road, "hi"),
        R(a.cap, "lo"), R(a.cap, "mid"), R(a.cap, "hi"),
        a.cap.a !== null ? Math.round(a.cap.a) : "", a.cap.b !== null ? Math.round(a.cap.b) : "", a.cap.c !== null ? Math.round(a.cap.c) : "",
        a.total ? Math.round(a.total.lo) : "", a.total ? Math.round(a.total.mid) : "", a.total ? Math.round(a.total.hi) : "",
        p(a.crew.rehire), p(a.crew.earlyQuit), p(a.road.recovery), a.cap.usedPct !== null ? round(a.cap.usedPct, 1) : "", a.cap.revPerSlot !== null ? round(a.cap.revPerSlot, 2) : ""].map(csvCell).join(","));
    });
    return rows.join("\n") + "\n";
  };

  if (typeof module !== "undefined" && module.exports) module.exports = L;
  else root.LeakCore = L;
})(this);
