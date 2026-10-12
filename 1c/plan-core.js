/* 1.c Season staffing model: pure logic for the in-browser hiring-plan calculator and the fit check.
 * No page access, no network. Used by index.html (as window.PlanCore) and by dev/test-plan.js (require).
 * Same arithmetic as the Python bundle's simple cross-check: hires = new hires / (1 - early-quit rate).
 * The Python model adds the weekly curve, replacement timing and ranges from a simulation.
 */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PlanCore = factory();
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var C = {};
  var DAY_MS = 86400000;
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var Z95 = 1.959963984540054;

  function str(v) { return v === undefined || v === null ? "" : String(v).trim(); }

  /* "1,200" -> 1200, "35%" -> 35, "" -> NaN */
  C.num = function (v) {
    var s = str(v).replace(/[,$%\s]/g, "");
    if (s === "" || !/^-?\d*\.?\d+$/.test(s)) return NaN;
    return parseFloat(s);
  };
  C.blank = function (v) { return str(v) === ""; };

  /* ---------- dates (UTC, so time zones never shift a day) ---------- */
  C.parseISO = function (s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(s));
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3], t = Date.UTC(y, mo - 1, d), dt = new Date(t);
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return t;
  };
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  C.iso = function (t) { var d = new Date(t); return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()); };
  C.addDays = function (iso, n) { var t = C.parseISO(iso); return t === null ? null : C.iso(t + n * DAY_MS); };
  C.diffDays = function (a, b) {
    var ta = C.parseISO(a), tb = C.parseISO(b);
    return ta === null || tb === null ? null : Math.round((tb - ta) / DAY_MS);
  };
  C.niceDate = function (iso) {
    var t = C.parseISO(iso); if (t === null) return "";
    var d = new Date(t);
    return MONTHS[d.getUTCMonth()] + " " + d.getUTCDate() + ", " + d.getUTCFullYear();
  };
  C.todayISO = function (now) {
    var d = now || new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  };

  /* ---------- small maths ---------- */
  C.roundHalfUp = function (x) { return Math.floor(x + 0.5 + 1e-9); };

  /* Wilson 95% interval for x of n. */
  C.wilson = function (x, n) {
    if (!(n > 0) || x < 0 || x > n) return null;
    var p = x / n, z2 = Z95 * Z95, d = 1 + z2 / n;
    var c = (p + z2 / (2 * n)) / d, h = Z95 * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n)) / d;
    return { p: p, lo: x === 0 ? 0 : Math.max(0, c - h), hi: x === n ? 1 : Math.min(1, c + h) };
  };

  /* Split a whole number by weights so the parts are whole and add up. Ties go to the earlier item. */
  C.largestRemainder = function (total, weights) {
    var out = weights.map(function () { return 0; });
    var sum = weights.reduce(function (a, w) { return a + Math.max(0, w); }, 0);
    if (!(total > 0) || !(sum > 0)) return out;
    var raw = weights.map(function (w) { return total * Math.max(0, w) / sum; });
    out = raw.map(function (r) { return Math.floor(r + 1e-9); });
    var left = total - out.reduce(function (a, b) { return a + b; }, 0);
    var order = raw.map(function (r, i) { return i; }).sort(function (a, b) {
      var da = raw[a] - out[a], db = raw[b] - out[b];
      return db - da || a - b;
    });
    for (var k = 0; k < left; k++) out[order[k]] += 1;
    return out;
  };

  C.status = function (latestISO, planISO) {
    var d = C.diffDays(planISO, latestISO);
    if (d === null) return { code: "", text: "" };
    if (d < 0) return { code: "late", text: "LATE (" + (-d) + " days ago)" };
    if (d <= 28) return { code: "soon", text: "SOON (" + d + " days away)" };
    return { code: "ok", text: "OK" };
  };

  /* ---------- validation ---------- */
  function wholeInRange(v, lo, hi) { return isFinite(v) && v % 1 === 0 && v >= lo && v <= hi; }

  /* inp: {positions, eligible, rehire, compare, quitRate, quitsLast, newLast, costPerHire, costRange,
   *       seasonStart, onboarding, planDate, channels: [{name, share, lead}]}  (strings or numbers) */
  C.validate = function (inp) {
    var e = [];
    var positions = C.num(inp.positions), eligible = C.num(inp.eligible), rehire = C.num(inp.rehire);
    var q = C.num(inp.quitRate), onboarding = C.blank(inp.onboarding) ? 14 : C.num(inp.onboarding);
    if (!wholeInRange(positions, 1, 10000)) e.push("Positions: type a whole number of 1 or more.");
    if (!wholeInRange(eligible, 0, 10000)) e.push("Eligible to return: type a whole number, 0 or more.");
    if (!(rehire >= 0 && rehire <= 100)) e.push("Rehire rate: type a percent from 0 to 100.");
    if (!C.blank(inp.compare)) {
      var cmp = C.num(inp.compare);
      if (!(cmp >= 0 && cmp <= 100)) e.push("Compare rehire rate: type a percent from 0 to 100, or leave it blank.");
    }
    if (!(q >= 0 && q < 100)) e.push("Early-quit rate: type a percent from 0 to just under 100.");
    var hasQ = !C.blank(inp.quitsLast), hasN = !C.blank(inp.newLast);
    if (hasQ !== hasN) e.push("Last season: give both early quits and new hires, or leave both blank.");
    else if (hasQ) {
      var x = C.num(inp.quitsLast), n = C.num(inp.newLast);
      if (!wholeInRange(n, 1, 10000) || !wholeInRange(x, 0, 10000) || x > n)
        e.push("Last season: whole numbers, at least 1 new hire, and early quits no more than new hires.");
    }
    if (!C.blank(inp.costPerHire) && !(C.num(inp.costPerHire) >= 0)) e.push("Cost per hire: type a dollar amount, 0 or more.");
    if (!C.blank(inp.costRange) && !(C.num(inp.costRange) >= 0 && C.num(inp.costRange) <= 100))
      e.push("Cost range: type a percent from 0 to 100.");
    if (C.parseISO(inp.seasonStart) === null) e.push("Season start: pick a date.");
    if (!wholeInRange(onboarding, 0, 120)) e.push("Onboarding days: type a whole number from 0 to 120.");
    if (!C.blank(inp.planDate) && C.parseISO(inp.planDate) === null) e.push("Plan date: pick a date, or leave it blank for today.");
    var rows = (inp.channels || []).filter(function (c) { return !(C.blank(c.name) && C.blank(c.share) && C.blank(c.lead)); });
    if (!rows.length) e.push("Channels: fill at least one row (name, share of new hires, weeks of lead time).");
    var total = 0;
    rows.forEach(function (c, i) {
      var s = C.num(c.share), l = C.num(c.lead), label = C.blank(c.name) ? "Channel row " + (i + 1) : str(c.name);
      if (C.blank(c.name)) e.push(label + ": give it a name.");
      if (!(s >= 0 && s <= 100)) e.push(label + ": share must be a percent from 0 to 100.");
      if (!(l >= 0 && l <= 104)) e.push(label + ": lead time must be 0 to 104 weeks.");
      if (s >= 0) total += s;
    });
    if (rows.length && Math.abs(total - 100) > 0.5) e.push("Channel shares add up to " + (Math.round(total * 10) / 10) + "%. Make them add up to 100.");
    return e;
  };

  /* ---------- the plan ---------- */
  function scenario(positions, eligible, ratePct, q) {
    var returning = Math.min(positions, C.roundHalfUp(eligible * ratePct / 100));
    var newHires = positions - returning;
    var total = newHires / (1 - q);
    return { rate: ratePct, returning: returning, newHires: newHires, quits: newHires * q, replacements: total - newHires, total: total };
  }
  C.scenario = scenario;

  C.plan = function (inp, now) {
    var errors = C.validate(inp);
    if (errors.length) return { ok: false, errors: errors };
    var positions = C.num(inp.positions), eligible = C.num(inp.eligible), q = C.num(inp.quitRate) / 100;
    var onboarding = C.blank(inp.onboarding) ? 14 : C.num(inp.onboarding);
    var planDate = C.blank(inp.planDate) ? C.todayISO(now) : str(inp.planDate);
    var base = scenario(positions, eligible, C.num(inp.rehire), q);
    var startDate = C.addDays(inp.seasonStart, -onboarding);
    var rows = (inp.channels || []).filter(function (c) { return !(C.blank(c.name) && C.blank(c.share) && C.blank(c.lead)); });
    var split = C.largestRemainder(base.newHires, rows.map(function (c) { return C.num(c.share); }));
    var channels = rows.map(function (c, i) {
      var lead = C.num(c.lead), latest = C.addDays(startDate, -Math.round(lead * 7));
      var st = C.status(latest, planDate);
      return { name: str(c.name), share: C.num(c.share), hires: split[i], lead: lead, latest: latest, status: st.text, code: st.code };
    }).sort(function (a, b) { return a.latest < b.latest ? -1 : a.latest > b.latest ? 1 : a.name < b.name ? -1 : 1; });
    var cost = C.blank(inp.costPerHire) ? null : C.num(inp.costPerHire);
    var spread = C.blank(inp.costRange) ? 0.25 : C.num(inp.costRange) / 100;
    var res = {
      ok: true, errors: [], planDate: planDate, startDate: startDate, onboarding: onboarding, q: q, base: base,
      channels: channels,
      firstDeadline: channels.filter(function (c) { return c.hires > 0; })[0] || null,
      standby: Math.max(0, Math.ceil(base.replacements - 1e-9)),
      cost: cost === null ? null : { mid: base.total * cost, lo: base.total * cost * (1 - spread), hi: base.total * cost * (1 + spread), perHire: cost, spread: spread }
    };
    if (!C.blank(inp.quitsLast)) {
      var w = C.wilson(C.num(inp.quitsLast), C.num(inp.newLast));
      res.interval = { x: C.num(inp.quitsLast), n: C.num(inp.newLast), p: w.p, lo: w.lo, hi: w.hi,
        totalLo: base.newHires / (1 - w.lo), totalHi: w.hi < 1 ? base.newHires / (1 - w.hi) : Infinity,
        stepPoints: 100 / C.num(inp.newLast) };
    }
    if (!C.blank(inp.compare)) {
      var alt = scenario(positions, eligible, C.num(inp.compare), q);
      res.compare = { alt: alt, hiresAvoided: base.total - alt.total };
      if (cost !== null) {
        var saved = (base.total - alt.total) * cost;
        res.compare.saved = { mid: saved, lo: saved * (1 - spread), hi: saved * (1 + spread) };
      }
    }
    return res;
  };

  /* ---------- plain-text plan, for a calendar note or an AI prompt ---------- */
  C.planText = function (res) {
    if (!res || !res.ok) return "";
    var b = res.base, L = [];
    L.push("DRAFT - PENDING OWNER REVIEW");
    L.push("Hiring plan from the ATIA Operations Kit calculator (tool 1c). Plan date: " + C.niceDate(res.planDate) + ".");
    L.push("Positions: " + (b.returning + b.newHires) + ". Expected returning staff: " + b.returning + " (rehire rate " + b.rate +
      "%). New hires to open the season: " + b.newHires + ".");
    L.push("Early-quit rate " + C.pct(res.q, 0) + ": about " + C.one(b.quits) + " early quits and " + C.one(b.replacements) +
      " replacement hires, " + C.one(b.total) + " hires in all.");
    if (res.interval) {
      L.push("Last season " + res.interval.x + " of " + res.interval.n + " new hires left early: 95% interval " + C.pct(res.interval.lo) +
        " to " + C.pct(res.interval.hi) + ", so " + C.one(res.interval.totalLo) + " to " +
        (isFinite(res.interval.totalHi) ? C.one(res.interval.totalHi) : "no upper limit") + " hires in all.");
    }
    L.push("Start recruiting by:");
    res.channels.forEach(function (c) {
      L.push("- " + C.niceDate(c.latest) + ": " + c.name + ", " + c.hires + " hire" + (c.hires === 1 ? "" : "s") +
        " (lead " + c.lead + " weeks). " + c.status);
    });
    if (res.standby > 0) {
      L.push("Replacements: line up about " + res.standby + " standby candidates from your shortest-lead channels before new hires start on " +
        C.niceDate(res.startDate) + ".");
    }
    if (res.cost) {
      L.push("Recruiting cost (estimate): " + C.money(res.cost.mid) + " (" + C.money(res.cost.lo) + " to " + C.money(res.cost.hi) + ").");
    }
    if (res.compare) {
      var a = res.compare.alt;
      var line = "Compare rehire rate " + a.rate + "%: " + a.returning + " returning, " + a.newHires + " new hires, " + C.one(a.total) +
        " hires in all; " + C.one(res.compare.hiresAvoided) + " fewer hires";
      if (res.compare.saved) line += ", about " + C.money(res.compare.saved.mid) + " less (" + C.money(res.compare.saved.lo) + " to " + C.money(res.compare.saved.hi) + ")";
      L.push(line + ".");
    }
    L.push("Counts and dates only. No staff names. A person decides.");
    return L.join("\n");
  };

  /* ---------- fit check ---------- */
  /* answers: {size: small|mid|big, data: yes|partly|no, help: yes|maybe|no} */
  C.fit = function (a) {
    if (!a || !a.size || !a.data || !a.help) return null;
    if (a.size === "small" || a.data === "no" || a.help === "no") return "start";
    if (a.data === "partly" || a.help === "maybe") return "homework";
    return "fit";
  };

  /* ---------- formatting ---------- */
  C.money = function (x, step) {
    if (!isFinite(x)) return "?";
    var s = step || 100;
    return "$" + (Math.round(x / s) * s).toLocaleString("en-US");
  };
  C.one = function (x) { return isFinite(x) ? (Math.round(x * 10) / 10).toFixed(1) : "?"; };
  C.pct = function (x, digits) { return (100 * x).toFixed(digits === undefined ? 1 : digits) + "%"; };

  return C;
}));
