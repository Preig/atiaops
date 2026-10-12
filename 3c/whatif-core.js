/* 3.c Revenue-per-slot what-if: pure logic, no page access, no network.
 * Used by index.html (as window.SlotWhatIf) and by the Node tests in dev/ (require).
 *
 * Number 4, revenue per allocated slot = net revenue of the capped product / allocated slots.
 *   allocated slots          = allocation per day x days
 *   last season, per slot    = share used x combo net per booked guest
 *   plan, per slot           = plan share used x combo net per booked guest x (1 + premium share x premium uplift)
 *   change                   = plan - last season, split into a fill part and a premium part
 *   range                    = last season + change x (1 - uncertainty) to last season + change x (1 + uncertainty)
 * Whale-only guests add season revenue but use no allocation, so they never change Number 4.
 * Seat check: combo guests a day (allocation x plan share used) + whale-only guests a day against seats a day.
 */
(function (root) {
  "use strict";
  var W = {};

  /* name, label, min, max, required, integer */
  W.FIELDS = [
    ["allocation", "Allocation per day", 1, 100000, true, true],
    ["days", "Days in the season", 1, 366, true, true],
    ["base_used", "Last season: share of the allocation used (%)", 0, 100, true, false],
    ["net_per_guest", "Combo net revenue per booked guest ($)", 0.01, 100000, true, false],
    ["plan_used", "Plan: share of the allocation used (%)", 0, 100, true, false],
    ["premium_share", "Plan: share of combo guests at the premium (%)", 0, 100, false, false],
    ["premium_uplift", "Plan: premium uplift (%)", -90, 300, false, false],
    ["whale_per_day", "Whale-only guests per day", 0, 100000, false, false],
    ["whale_net", "Whale-only net revenue per guest ($)", 0, 100000, false, false],
    ["seats_per_day", "Seats per day", 1, 100000, false, true],
    ["uncertainty", "Uncertainty (plus or minus %)", 0, 100, false, false]
  ];

  function str(v) { return v === undefined || v === null ? "" : String(v).trim(); }

  /* "1,234.5" -> 1234.5; "" -> null; anything else that is not a number -> NaN */
  W.num = function (v) {
    var s = str(v).replace(/[$,%\s]/g, "");
    if (s === "") return null;
    if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
    return parseFloat(s);
  };

  /* Read raw form values. Returns {values, errors}; errors name the field in plain words. */
  W.parse = function (raw) {
    var values = {}, errors = [];
    W.FIELDS.forEach(function (f) {
      var name = f[0], label = f[1], min = f[2], max = f[3], req = f[4], isInt = f[5];
      var x = W.num(raw ? raw[name] : null);
      if (x === null) {
        if (req) errors.push(label + ": type a number.");
        values[name] = null;
        return;
      }
      if (isNaN(x)) { errors.push(label + ": not a number."); values[name] = null; return; }
      if (x < min || x > max) {
        errors.push(label + ": use a number from " + fmtPlain(min) + " to " + fmtPlain(max) + ".");
        values[name] = null;
        return;
      }
      if (isInt && Math.round(x) !== x) { errors.push(label + ": use a whole number."); values[name] = null; return; }
      values[name] = x;
    });
    return { values: values, errors: errors };
  };

  function fmtPlain(x) { return String(x); }

  /* Core arithmetic on clean values (nulls in optional fields count as zero; uncertainty defaults to 30). */
  W.compute = function (v) {
    var A = v.allocation, D = v.days;
    var slots = A * D;
    var N = v.net_per_guest;
    var s = (v.premium_share || 0) / 100, u = (v.premium_uplift || 0) / 100;
    var U = (v.uncertainty === null || v.uncertainty === undefined ? 30 : v.uncertainty) / 100;
    var baseShare = v.base_used / 100, planShare = v.plan_used / 100;
    var base = { guests: slots * baseShare, comboNet: slots * baseShare * N, perSlot: baseShare * N };
    var factor = 1 + s * u;
    var plan = { guests: slots * planShare, comboNet: slots * planShare * N * factor, perSlot: planShare * N * factor };
    var change = plan.perSlot - base.perSlot;
    var fillPart = (planShare - baseShare) * N;           /* more or fewer slots used, at last season's net */
    var premiumPart = planShare * N * s * u;               /* the premium on the slots the plan uses */
    var a = base.perSlot + change * (1 - U), b = base.perSlot + change * (1 + U);
    var whaleDay = v.whale_per_day || 0, whaleNet = v.whale_net || 0;
    var whaleSeason = whaleDay * D * whaleNet;
    var comboDay = A * planShare;
    var seats = v.seats_per_day || null;
    var seatUse = comboDay + whaleDay;
    return {
      slots: slots,
      base: base,
      plan: plan,
      change: change,
      changePct: base.perSlot > 0 ? 100 * change / base.perSlot : null,
      fillPart: fillPart,
      premiumPart: premiumPart,
      low: Math.min(a, b),
      high: Math.max(a, b),
      seasonChange: plan.comboNet - base.comboNet,
      whaleSeason: whaleSeason,
      planTotal: plan.comboNet + whaleSeason,
      comboPerDay: comboDay,
      seatsPerDay: seats,
      seatUse: seatUse,
      overSeats: seats !== null && seatUse > seats + 1e-9,
      premiumGuests: plan.guests * s
    };
  };

  /* Parse then compute. Returns {ok, errors, result}. */
  W.run = function (raw) {
    var p = W.parse(raw);
    if (p.errors.length) return { ok: false, errors: p.errors, result: null };
    return { ok: true, errors: [], result: W.compute(p.values) };
  };

  W.money = function (x, cents) {
    if (x === null || x === undefined || isNaN(x)) return "?";
    var neg = x < 0, a = Math.abs(x);
    var s = cents ? a.toFixed(2) : String(Math.round(a));
    var parts = s.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (neg ? "-$" : "$") + parts.join(".");
  };
  W.signedMoney = function (x, cents) { return (x > 0 ? "+" : "") + W.money(x, cents); };
  W.pct = function (x, d) { return x === null || isNaN(x) ? "?" : x.toFixed(d === undefined ? 1 : d) + "%"; };
  W.count = function (x) { return String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ","); };

  /* One plain-text line for a memo or a message (no names, aggregates only). */
  W.summary = function (r, v) {
    var lines = [
      "DRAFT - PENDING OWNER REVIEW",
      "What-if, revenue per allocated slot (Number 4):",
      "Last season: " + W.money(r.base.perSlot, true) + " per slot (" + W.pct(v.base_used) + " of " + W.count(r.slots) + " slots used).",
      "Plan: " + W.money(r.plan.perSlot, true) + " per slot, range " + W.money(r.low, true) + " to " + W.money(r.high, true) +
        " (change " + W.signedMoney(r.change, true) + ", plus or minus " + W.pct(v.uncertainty === null ? 30 : v.uncertainty, 0) + " on the change).",
      "Of the change: fill " + W.signedMoney(r.fillPart, true) + ", premium " + W.signedMoney(r.premiumPart, true) + " per slot.",
      "Season combo net: " + W.money(r.plan.comboNet) + " (last season " + W.money(r.base.comboNet) + "). With whale-only: " + W.money(r.planTotal) + "."
    ];
    if (r.seatsPerDay !== null) {
      lines.push("Seats: about " + W.count(r.seatUse) + " a day on average against " + W.count(r.seatsPerDay) + (r.overSeats ? " (OVER: check the plan)." : "."));
    }
    lines.push("Arithmetic on typed inputs; the owner decides prices.");
    return lines.join("\n");
  };

  if (typeof module !== "undefined" && module.exports) module.exports = W;
  else root.SlotWhatIf = W;
})(this);
