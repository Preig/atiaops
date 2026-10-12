/* 2b Arrival watch and backfill: pure logic for the rebook board simulator. No page access, no network.
 * Used by index.html (as window.Watch) and by the Node tests in dev/ (require).
 * Deterministic: the same day, event and rules always give the same board, plan and drafts.
 * All data describes Channel Light Excursions, Juneau: a FICTIONAL TEACHING BUSINESS.
 *
 * Model (times in minutes after midnight):
 *   A departure leaves the downtown docks at its time (plus any delay), shuttles to Auke Bay,
 *   and is back at the docks tourMin later.
 *   A cruise guest is ready at the meeting point at ship arrival + walk-off (dock or anchor).
 *   A cruise guest fits a departure if ready <= departure start and
 *   start + tourMin + bufferMin <= all-aboard.  Independent guests have no ship constraint.
 *   A move or a waitlist offer also needs noticeMin between the first alert (knownAt) and the
 *   departure, and free seats (never more than the seats per departure).
 */
(function (root) {
  "use strict";
  var W = {};

  function str(v) { return v === undefined || v === null ? "" : String(v).trim(); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  W.str = str;

  /* ---------- times ---------- */
  W.toMin = function (t) {
    var m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(str(t));
    if (!m) return null;
    var h = +m[1], mi = +m[2];
    if (h > 23 || mi > 59) return null;
    return h * 60 + mi;
  };
  /* 480 -> "8:00", 1050 -> "17:30". Past midnight shows "+1d". */
  W.fmt = function (min) {
    if (min === null || min === undefined || isNaN(min)) return "";
    var day = Math.floor(min / 1440), m = ((min % 1440) + 1440) % 1440;
    return Math.floor(m / 60) + ":" + pad(m % 60) + (day > 0 ? " (+1d)" : "");
  };
  W.hhmm = function (min) { var m = ((min % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ":" + pad(m % 60); };

  /* ---------- rules (each one is a policy choice or a fact the owner enters) ---------- */
  W.DEFAULTS = { seats: 30, tourMin: 270, shuttleMin: 25, bufferMin: 60, walkDock: 30, walkAnchor: 60, noticeMin: 45, allocation: 100, waitlistRule: "fifo" };
  W.LIMITS = { seats: [1, 200], tourMin: [30, 720], shuttleMin: [0, 180], bufferMin: [0, 240], walkDock: [0, 240], walkAnchor: [0, 300], noticeMin: [0, 600], allocation: [0, 10000] };
  W.PARAM_LABELS = {
    seats: "Seats per departure", tourMin: "Trip length, dock to dock, in minutes", shuttleMin: "Shuttle, dock to Auke Bay, in minutes",
    bufferMin: "All-aboard buffer, in minutes", walkDock: "Ship arrival to our meeting point, docked ship, in minutes",
    walkAnchor: "Ship arrival to our meeting point, ship at anchor (tender), in minutes", noticeMin: "Minimum notice for a move or a waitlist offer, in minutes",
    allocation: "Glacier allocation, guest visits per day"
  };
  W.params = function (p) {
    var out = {}, errors = [];
    p = p || {};
    Object.keys(W.DEFAULTS).forEach(function (k) {
      var v = p[k];
      if (k === "waitlistRule") { out[k] = v === "bestfit" ? "bestfit" : "fifo"; return; }
      if (v === undefined || v === null || str(v) === "") { out[k] = W.DEFAULTS[k]; return; }
      var s = str(v);
      if (!/^\d{1,5}$/.test(s)) { errors.push(W.PARAM_LABELS[k] + ": write a whole number."); out[k] = W.DEFAULTS[k]; return; }
      var n = parseInt(s, 10), lim = W.LIMITS[k];
      if (n < lim[0] || n > lim[1]) { errors.push(W.PARAM_LABELS[k] + ": expected " + lim[0] + " to " + lim[1] + "."); out[k] = W.DEFAULTS[k]; return; }
      out[k] = n;
    });
    return { params: out, errors: errors };
  };

  W.EVENT_TYPES = [
    ["ship_late", "Ship arrives late"],
    ["ship_skip", "Ship skips the port"],
    ["weather_hold", "Departure held for weather"],
    ["shuttle_delay", "Shuttle delay"]
  ];
  W.isShipEvent = function (t) { return t === "ship_late" || t === "ship_skip"; };

  W.validateEvent = function (ev, day) {
    var errors = [];
    ev = ev || {};
    var types = W.EVENT_TYPES.map(function (x) { return x[0]; });
    if (types.indexOf(ev.type) < 0) { errors.push("Pick an event."); return errors; }
    if (W.toMin(ev.knownAt) === null) errors.push("\"We knew at\" needs a time, for example 08:15.");
    if (W.isShipEvent(ev.type)) {
      if (!day || !day.ships.some(function (s) { return s.ship === ev.ship; })) errors.push("Pick a ship that is in port that day.");
    } else if (!day || day.departures.indexOf(ev.departure) < 0) errors.push("Pick a departure.");
    function mins(v, lo, hi, what) {
      var s = str(v);
      if (!/^-?\d{1,4}$/.test(s)) { errors.push(what + ": write a whole number of minutes."); return; }
      var n = parseInt(s, 10);
      if (n < lo || n > hi) errors.push(what + ": expected " + lo + " to " + hi + " minutes.");
    }
    if (ev.type === "ship_late") {
      mins(ev.minutes, 1, 600, "Minutes late");
      if (str(ev.allaboardShift) !== "") mins(ev.allaboardShift, -240, 240, "All-aboard change");
    }
    if (ev.type === "weather_hold" && !ev.cancel) mins(ev.minutes, 1, 600, "Minutes held");
    if (ev.type === "shuttle_delay") mins(ev.minutes, 1, 600, "Minutes late");
    return errors;
  };

  /* ---------- the day, before and after the event ---------- */
  function buildWorld(day, ev) {
    var deps = {}, ships = {};
    day.departures.forEach(function (d) { deps[d] = { sched: W.toMin(d), delay: 0, cancelled: false }; });
    day.ships.forEach(function (s) { ships[s.ship] = { arrive: W.toMin(s.arrive), aa: W.toMin(s.all_aboard), berth: s.berth, skipped: false }; });
    if (ev) {
      var n = parseInt(str(ev.minutes) || "0", 10) || 0;
      if (ev.type === "ship_late" && ships[ev.ship]) {
        ships[ev.ship].arrive += n;
        ships[ev.ship].aa += parseInt(str(ev.allaboardShift) || "0", 10) || 0;
      }
      if (ev.type === "ship_skip" && ships[ev.ship]) ships[ev.ship].skipped = true;
      if (ev.type === "weather_hold" && deps[ev.departure]) { if (ev.cancel) deps[ev.departure].cancelled = true; else deps[ev.departure].delay = n; }
      if (ev.type === "shuttle_delay" && deps[ev.departure]) deps[ev.departure].delay = n;
    }
    return { deps: deps, ships: ships };
  }
  W.buildWorld = buildWorld;
  function start(w, d) { return w.deps[d].sched + w.deps[d].delay; }
  function isShip(p) { return !!p.ship && p.ship !== "INDEPENDENT"; }

  /* status of a party (booking or waitlist entry) on one departure: ok | cancelled | no_call | missed | buffer */
  W.statusOn = function (p, dep, w, P) {
    var D = w.deps[dep];
    if (!D) return "nodep";
    if (D.cancelled) return "cancelled";
    if (isShip(p)) {
      var s = w.ships[p.ship];
      if (!s) return "ok";
      if (s.skipped) return "no_call";
      var st = start(w, dep);
      var ready = s.arrive + (s.berth === "ANCHOR" ? P.walkAnchor : P.walkDock);
      if (ready > st) return "missed";
      if (st + P.tourMin + P.bufferMin > s.aa) return "buffer";
    }
    return "ok";
  };
  /* minutes of slack a party has on a departure: the smaller of (start - ready) and the all-aboard margin */
  W.slack = function (p, dep, w, P) {
    var D = w.deps[dep];
    if (!D || D.cancelled) return -Infinity;
    if (!isShip(p)) return Infinity;
    var s = w.ships[p.ship];
    if (!s) return Infinity;
    if (s.skipped) return -Infinity;
    var st = start(w, dep), ready = s.arrive + (s.berth === "ANCHOR" ? P.walkAnchor : P.walkDock);
    return Math.min(st - ready, s.aa - (st + P.tourMin + P.bufferMin));
  };
  W.PROBLEM_TEXT = {
    cancelled: "Departure cancelled", no_call: "Ship not in port", missed: "Cannot reach the departure in time",
    buffer: "Back inside the all-aboard buffer", nodep: "Unknown departure"
  };
  function touched(b, ev) {
    if (W.isShipEvent(ev.type)) return b.ship === ev.ship;
    return b.dep === ev.departure;
  }
  W.touched = touched;

  function readyText(p, w, P) {
    var s = w.ships[p.ship];
    if (!s) return "";
    return W.fmt(s.arrive + (s.berth === "ANCHOR" ? P.walkAnchor : P.walkDock));
  }

  W.describeEvent = function (ev, day) {
    var n = parseInt(str(ev.minutes) || "0", 10) || 0;
    if (ev.type === "ship_late") {
      var s = (day.ships.filter(function (x) { return x.ship === ev.ship; })[0]) || {};
      var a = W.toMin(s.arrive), shift = parseInt(str(ev.allaboardShift) || "0", 10) || 0;
      return ev.ship + " is now due at " + W.fmt(a + n) + " instead of " + W.fmt(a) + " (" + n + " minutes late)." +
        (shift ? " Its all-aboard time moves to " + W.fmt(W.toMin(s.all_aboard) + shift) + "." : " Its all-aboard time stays " + W.fmt(W.toMin(s.all_aboard)) + ".");
    }
    if (ev.type === "ship_skip") return ev.ship + " will not call here today.";
    if (ev.type === "weather_hold") return ev.cancel ? "The captain has cancelled the " + W.fmt(W.toMin(ev.departure)) + " departure for weather."
      : "The captain has held the " + W.fmt(W.toMin(ev.departure)) + " departure for weather. It now leaves at about " + W.fmt(W.toMin(ev.departure) + n) + ".";
    if (ev.type === "shuttle_delay") return "The shuttle for the " + W.fmt(W.toMin(ev.departure)) + " departure is " + n + " minutes late. The trip now leaves at about " + W.fmt(W.toMin(ev.departure) + n) + " and comes back about " + n + " minutes later.";
    return "";
  };
  W.shortEvent = function (ev) {
    var n = str(ev.minutes);
    if (ev.type === "ship_late") return ev.ship + " " + n + " min late";
    if (ev.type === "ship_skip") return ev.ship + " skips the port";
    if (ev.type === "weather_hold") return W.fmt(W.toMin(ev.departure)) + (ev.cancel ? " cancelled for weather" : " held " + n + " min for weather");
    if (ev.type === "shuttle_delay") return W.fmt(W.toMin(ev.departure)) + " shuttle " + n + " min late";
    return "";
  };

  /* ---------- the simulation ---------- */
  W.simulate = function (day, ev, rawParams) {
    var pr = W.params(rawParams), P = pr.params;
    var errors = pr.errors.concat(W.validateEvent(ev, day));
    if (errors.length) return { ok: false, errors: errors };
    var knownAt = W.toMin(ev.knownAt);
    var base = buildWorld(day, null), w = buildWorld(day, ev);
    var deps = day.departures.slice().sort(function (a, b) { return W.toMin(a) - W.toMin(b); });
    var warnings = [];
    var load = {};
    deps.forEach(function (d) { load[d] = 0; });
    var manifest = day.bookings.filter(function (b) { return load.hasOwnProperty(b.dep); });
    if (manifest.length < day.bookings.length) warnings.push((day.bookings.length - manifest.length) + " bookings are on a departure time this board does not run; they are left out.");
    manifest.forEach(function (b) { load[b.dep] += b.guests; });
    var load0 = {};
    deps.forEach(function (d) { load0[d] = load[d]; if (load[d] > P.seats) warnings.push("The manifest has " + load[d] + " guests on " + W.fmt(W.toMin(d)) + ", more than " + P.seats + " seats. Check the seat number."); });

    /* A touched booking counts as affected only if the event made it worse (less slack).
     * A booking that was already tight before the event, and is no worse now, is a booking-rule gap, not this event. */
    var affected = [], preGaps = [];
    manifest.forEach(function (b) {
      var before = W.statusOn(b, b.dep, base, P), now = W.statusOn(b, b.dep, w, P);
      var worse = touched(b, ev) && now !== "ok" && (before === "ok" || W.slack(b, b.dep, w, P) < W.slack(b, b.dep, base, P));
      if (worse) affected.push({ b: b, problem: now, preTight: before !== "ok" });
      else if (before !== "ok") preGaps.push({ ref: b.ref, ship: b.ship, dep: b.dep, guests: b.guests, problem: before });
    });

    function fitsTime(p, d) { return W.statusOn(p, d, w, P) === "ok" && start(w, d) - knownAt >= P.noticeMin; }
    function altOK(p, d) { return d !== p.dep && fitsTime(p, d) && P.seats - load[d] >= p.guests; }
    affected.forEach(function (a) { a.initial = deps.filter(function (d) { return altOK(a.b, d); }).length; });
    var order = affected.slice().sort(function (x, y) {
      return x.initial - y.initial || y.b.guests - x.b.guests || (x.b.ref < y.b.ref ? -1 : x.b.ref > y.b.ref ? 1 : 0);
    });
    order.forEach(function (a) {
      var b = a.b, g = b.guests;
      a.fitsTime = deps.filter(function (d) { return d !== b.dep && fitsTime(b, d); });
      a.options = deps.filter(function (d) { return altOK(b, d); });
      var origCancelled = w.deps[b.dep].cancelled;
      if (a.problem === "no_call") { a.action = "no_call"; if (!origCancelled) load[b.dep] -= g; return; }
      if (a.options.length) {
        var s0 = w.deps[b.dep].sched;
        var best = a.options.slice().sort(function (x, y) {
          return Math.abs(start(w, x) - s0) - Math.abs(start(w, y) - s0) || start(w, x) - start(w, y);
        })[0];
        a.action = "move"; a.to = best; a.back = start(w, best) + P.tourMin;
        if (!origCancelled) load[b.dep] -= g;
        load[best] += g;
        return;
      }
      if (a.problem === "buffer") { a.action = "decide"; a.back = start(w, b.dep) + P.tourMin; return; }
      a.action = "no_seat";
      if (!origCancelled) load[b.dep] -= g;
    });

    /* departures after the plan */
    var freed = {}, depRows = [];
    deps.forEach(function (d) {
      var D = w.deps[d];
      var after = D.cancelled ? 0 : load[d];
      freed[d] = D.cancelled ? 0 : Math.max(0, load0[d] - load[d]);
      depRows.push({ dep: d, label: W.fmt(D.sched), start: start(w, d), back: start(w, d) + P.tourMin, atAukeBay: start(w, d) + P.shuttleMin,
        delay: D.delay, cancelled: D.cancelled, before: load0[d], after: after, freed: freed[d], freeBefore: Math.max(0, P.seats - load0[d]),
        tooLate: !D.cancelled && start(w, d) - knownAt < P.noticeMin });
    });

    /* glacier allocation: combo guests who still travel today */
    var travelling = {};
    affected.forEach(function (a) { travelling[a.b.ref] = a.action === "move" || a.action === "decide"; });
    var comboUsed = 0;
    manifest.forEach(function (b) {
      if (b.product !== "COMBO") return;
      if (travelling.hasOwnProperty(b.ref) && !travelling[b.ref]) return;
      comboUsed += b.guests;
    });
    if (comboUsed > P.allocation) warnings.push("The manifest has " + comboUsed + " combo guests, more than the allocation of " + P.allocation + ". Check the allocation number.");
    var allocLeft = Math.max(0, P.allocation - comboUsed);
    var allocStart = allocLeft;

    /* waitlist for freed seats */
    var wl = (day.waitlist || []).map(function (e) {
      return { id: e.id, joined: e.joined, guests: e.guests, product: e.product, channel: e.channel, ship: e.ship, all_aboard: e.all_aboard, offer: null, notes: [] };
    });
    var fifo = wl.slice().sort(function (x, y) { return x.joined < y.joined ? -1 : x.joined > y.joined ? 1 : (x.id < y.id ? -1 : 1); });
    var offers = [], lateSeats = 0, unfilled = 0;
    depRows.forEach(function (row) {
      var d = row.dep, left = freed[d];
      row.offered = 0;
      if (left <= 0) return;
      if (row.tooLate) { lateSeats += left; row.note = "Alert came too late to offer these seats"; return; }
      var cands = fifo.filter(function (c) { return c.offer === null; });
      if (P.waitlistRule === "bestfit") cands = cands.slice().sort(function (x, y) { return y.guests - x.guests; });
      cands.forEach(function (c) {
        var pseudo = { ship: c.ship, dep: null, guests: c.guests };
        var st = W.statusOn(pseudo, d, w, P);
        var at = W.fmt(W.toMin(d));
        if (st === "no_call") { c.notes.push(at + ": ship not in port"); return; }
        if (st === "missed") { c.notes.push(at + ": cannot reach it (ready " + readyText(pseudo, w, P) + ")"); return; }
        if (st === "buffer") { c.notes.push(at + ": would be back inside the all-aboard buffer"); return; }
        if (c.guests > left) { c.notes.push(at + ": party of " + c.guests + ", " + left + " seat" + (left === 1 ? "" : "s") + " left"); return; }
        if (c.product === "COMBO" && c.guests > allocLeft) { c.notes.push(at + ": glacier allocation has " + allocLeft + " visit" + (allocLeft === 1 ? "" : "s") + " left today"); return; }
        c.offer = d;
        left -= c.guests;
        if (c.product === "COMBO") allocLeft -= c.guests;
        row.offered += c.guests;
        offers.push({ id: c.id, dep: d, guests: c.guests, product: c.product, channel: c.channel, ship: c.ship, back: start(w, d) + P.tourMin });
      });
      unfilled += left;
      if (left > 0) row.note = left + " seat" + (left === 1 ? "" : "s") + " still empty after the waitlist";
    });

    /* totals */
    function sumG(list) { return list.reduce(function (s, a) { return s + a.b.guests; }, 0); }
    function sumN(list) { return Math.round(100 * list.reduce(function (s, a) { return s + (+a.b.net || 0); }, 0)) / 100; }
    function act(k) { return affected.filter(function (a) { return a.action === k; }); }
    var affG = sumG(affected), movedG = sumG(act("move")), offered = offers.reduce(function (s, o) { return s + o.guests; }, 0);
    var firstDep = affected.length ? Math.min.apply(null, affected.map(function (a) { return w.deps[a.b.dep].sched; })) : null;
    var recoverable = Math.min(affG, movedG + Math.min(offered, affG - movedG));
    var totals = {
      bookings: manifest.length, guests: manifest.reduce(function (s, b) { return s + b.guests; }, 0),
      affectedBookings: affected.length, affectedGuests: affG,
      movedGuests: movedG, noSeatGuests: sumG(act("no_seat")), noCallGuests: sumG(act("no_call")), decideGuests: sumG(act("decide")),
      movedBookings: act("move").length, noSeatBookings: act("no_seat").length, noCallBookings: act("no_call").length, decideBookings: act("decide").length,
      freedSeats: deps.reduce(function (s, d) { return s + freed[d]; }, 0), offeredSeats: offered, lateSeats: lateSeats, unfilledSeats: unfilled,
      netAffected: sumN(affected), netMoved: sumN(act("move")), netAtRisk: sumN(act("no_seat").concat(act("no_call"))),
      leadMinutes: firstDep === null ? null : firstDep - knownAt,
      recoverableGuests: recoverable, recoverablePct: affG ? Math.round(1000 * recoverable / affG) / 10 : null,
      preGaps: preGaps.length, allocationLeftBefore: allocStart, allocationLeftAfter: allocLeft
    };

    var rows = affected.map(function (a) {
      var b = a.b;
      var s = w.ships[b.ship];
      return { ref: b.ref, ship: b.ship, channel: b.channel, product: b.product, guests: b.guests, net: b.net, dep: b.dep,
        allAboard: s ? W.fmt(s.aa) : "", ready: isShip(b) && s && !s.skipped ? readyText(b, w, P) : "",
        problem: a.problem, problemText: W.PROBLEM_TEXT[a.problem], preTight: a.preTight,
        options: a.options, fitsTime: a.fitsTime, action: a.action, to: a.to || null, back: a.back === undefined ? null : a.back,
        order: order.indexOf(a) + 1 };
    }).sort(function (x, y) { return W.toMin(x.dep) - W.toMin(y.dep) || (x.ref < y.ref ? -1 : 1); });

    return { ok: true, errors: [], warnings: warnings, date: day.date, weekday: day.weekday, event: ev, params: P,
      eventText: W.describeEvent(ev, day), eventShort: W.shortEvent(ev), knownAt: knownAt,
      departures: depRows, affected: rows, preGaps: preGaps, waitlist: fifo, offers: offers, totals: totals };
  };

  /* Same event, known earlier: the detection lesson. */
  W.compareEarlier = function (day, ev, params, minutes) {
    var now = W.simulate(day, ev, params);
    if (!now.ok) return null;
    var k = Math.max(0, W.toMin(ev.knownAt) - (minutes || 60));
    var ev2 = Object.assign({}, ev, { knownAt: W.hhmm(k) });
    var early = W.simulate(day, ev2, params);
    return { knownAt: W.fmt(k), now: now.totals, early: early.totals,
      moreMoved: early.totals.movedGuests - now.totals.movedGuests, moreOffered: early.totals.offeredSeats - now.totals.offeredSeats };
  };

  /* ---------- message drafts (templates, not AI) for the approval queue ---------- */
  W.TEXT = {
    business: "Channel Light Excursions (fictional)", dock: "the downtown docks",
    product: { COMBO: "Whale and Glacier Combo", WHALE: "Whale Only" }
  };
  W.MARK = "DRAFT - PENDING OWNER REVIEW";
  function productName(p) { return W.TEXT.product[p] || p; }
  function optionLine(r, P) {
    if (r.action === "move") return "Proposed: move to the " + W.fmt(W.toMin(r.to)) + " departure, back at " + W.TEXT.dock + " about " + W.fmt(r.back) + ".";
    if (r.action === "decide") return "Back at the dock about " + W.fmt(r.back) + ", inside our " + P.bufferMin + "-minute buffer before the " + r.allAboard + " all-aboard. No other departure fits. [FILL: duty lead's decision]";
    if (r.action === "no_call") return "The ship is not in port. [FILL: refund under the cruise line's terms]";
    return "No other departure today fits the time and seats. [FILL: refund or another day, under our policy]";
  }
  W.buildQueue = function (res, opts) {
    if (!res || !res.ok) return [];
    opts = opts || {};
    var biz = str(opts.business) || W.TEXT.business, P = res.params;
    var items = [], n = 0;
    function add(kind, about, recipient, lines) {
      n++;
      items.push({ qid: "Q" + pad(n), kind: kind, about: about, recipient: recipient, text: [W.MARK].concat(lines).join("\n"), status: "pending", approved_by: "", approved_at: "" });
    }
    var dateLine = res.weekday + " " + res.date;
    /* 1. staff and partner summary (internal) */
    var L = ["To: duty lead, captains on duty, Kestrel Shuttle dispatch (fictional partner)", "Subject: Rebook plan, " + dateLine + ": " + res.eventShort, "",
      res.eventText + " We knew at " + W.fmt(res.knownAt) + ".", "", "Headcount by departure (booked now, after the plan):"];
    res.departures.forEach(function (d) {
      L.push("- " + d.label + ": " + d.before + " now, " + d.after + " after" + (d.cancelled ? " (cancelled)" : d.delay ? " (leaves about " + W.fmt(d.start) + ")" : "") +
        (d.offered ? ", plus up to " + d.offered + " from the waitlist if accepted" : "") + ".");
    });
    var t = res.totals;
    L.push("");
    L.push("Affected: " + t.affectedBookings + " bookings, " + t.affectedGuests + " guests. Moves proposed: " + t.movedGuests + " guests. No same-day seat: " + (t.noSeatGuests + t.noCallGuests) + " guests. Duty lead decides: " + t.decideGuests + " guests.");
    if (t.lateSeats) L.push("Freed seats too late to offer: " + t.lateSeats + ".");
    L.push("Nothing has been sent. Every guest, desk and waitlist message waits in the approval queue.");
    add("staff", "all", "Duty lead, captains, shuttle dispatch (internal)", L);

    /* 2. cruise-line bookings: one message per ship to the shore excursion desk */
    var byShip = {};
    res.affected.forEach(function (r) { if (r.channel === "CRUISE") (byShip[r.ship] = byShip[r.ship] || []).push(r); });
    Object.keys(byShip).sort().forEach(function (ship) {
      var list = byShip[ship];
      var M = ["To: [FILL: " + ship + " shore excursion desk contact] (cruise line terms apply)", "Subject: " + ship + ", " + dateLine + ": " + biz + " bookings", "",
        res.eventText, "These bookings are affected:"];
      list.forEach(function (r) {
        M.push("- " + r.ref + ": " + r.guests + " guest" + (r.guests === 1 ? "" : "s") + ", " + productName(r.product) + ", booked " + W.fmt(W.toMin(r.dep)) + ". " + optionLine(r, P));
      });
      M.push("");
      M.push("Please confirm each guest's choice by [FILL: reply-by time]. [FILL: how long we hold the proposed seats]");
      M.push("[FILL: duty lead first name], " + biz + ", [FILL: business phone]");
      add("desk", list.map(function (r) { return r.ref; }).join(" "), ship + " shore excursion desk", M);
    });

    /* 3. direct and OTA bookings: one message per booking */
    res.affected.forEach(function (r) {
      if (r.channel === "CRUISE") return;
      var via = r.channel === "OTA" ? "Guest on " + r.ref + ", through the OTA's messaging (check your OTA supplier agreement)" : "Guest on " + r.ref + " (direct booking; contact details from your booking system)";
      var M = ["To: " + via, "Subject: Change to your " + productName(r.product) + " today", "", "Hi [GUEST FIRST NAME],", res.eventText + " Your " + W.fmt(W.toMin(r.dep)) + " departure is affected."];
      if (r.action === "move") M.push("We can move your party of " + r.guests + " to the " + W.fmt(W.toMin(r.to)) + " departure, back at " + W.TEXT.dock + " about " + W.fmt(r.back) + ". Please reply by [FILL: reply-by time] to keep these seats.");
      else M.push("We have no other seat today that works. [FILL: refund or another day, under our policy]");
      M.push("[FILL: staff first name], " + biz + ", [FILL: business phone]");
      add("guest", r.ref, r.channel === "OTA" ? "Guest via OTA messaging" : "Guest (direct booking)", M);
    });

    /* 4. waitlist offers */
    res.offers.forEach(function (o) {
      var to = o.channel === "CRUISE" ? "[FILL: " + o.ship + " shore excursion desk contact], for waitlist entry " + o.id + " (cruise line terms apply)"
        : "Waitlist entry " + o.id + (o.channel === "OTA" ? ", through the OTA's messaging" : " (contact details from your waitlist)");
      var M = ["To: " + to, "Subject: A seat opened on today's " + W.fmt(W.toMin(o.dep)) + " " + productName(o.product), "",
        "Hi [GUEST FIRST NAME],", o.guests + " seat" + (o.guests === 1 ? "" : "s") + " opened on today's " + W.fmt(W.toMin(o.dep)) + " departure from " + W.TEXT.dock + ", back about " + W.fmt(o.back) + ".",
        "If you want " + (o.guests === 1 ? "it" : "them") + ", reply by [FILL: offer expires at]. After that we offer " + (o.guests === 1 ? "it" : "them") + " to the next party on the list. Price: [FILL: price from your booking system].",
        "[FILL: staff first name], " + biz + ", [FILL: business phone]"];
      add("waitlist", o.id, o.channel === "CRUISE" ? o.ship + " shore excursion desk" : "Waitlist guest", M);
    });
    return items;
  };

  /* ---------- CSV ---------- */
  W.parseCSV = function (text) {
    var rows = [], row = [], cell = "", q = false, i, c;
    text = String(text || "").replace(/^\uFEFF/, "");
    for (i = 0; i < text.length; i++) {
      c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return str(x) !== ""; }); });
  };
  W.csvObjects = function (text) {
    var rows = W.parseCSV(text);
    if (!rows.length) return [];
    var head = rows[0].map(str);
    return rows.slice(1).map(function (r) { var o = {}; head.forEach(function (h, i) { o[h] = r[i] === undefined ? "" : r[i]; }); return o; });
  };
  W.csvCell = function (v) {
    if (typeof v === "number") return String(v);
    var s = v === undefined || v === null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(?:\.\d+)?$/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  W.toCSV = function (header, rows) {
    return [header].concat(rows).map(function (r) { return r.map(W.csvCell).join(","); }).join("\r\n") + "\r\n";
  };
  W.QUEUE_COLS = ["queue_id", "date", "event", "kind", "about", "recipient", "draft", "status", "approved_by", "approved_at", "sent_by", "sent_at", "notes"];
  W.queueCSV = function (res, items) {
    return W.toCSV(W.QUEUE_COLS, (items || []).map(function (q) {
      return [q.qid, res.date, res.eventShort, q.kind, q.about, q.recipient, q.text, q.status, q.approved_by, q.approved_at, "", "", ""];
    }));
  };
  W.PLAN_COLS = ["row_type", "date", "event", "known_at", "id", "ship", "channel", "guests", "product", "booked_departure", "problem", "departures_that_fit", "proposed_action", "proposed_departure", "back_at_dock", "approved_by", "notes"];
  W.ACTION_TEXT = { move: "Move", no_seat: "No same-day seat: refund or another day (policy)", no_call: "Ship not in port: refund (cruise line terms)", decide: "Duty lead decides" };
  W.planCSV = function (res) {
    if (!res || !res.ok) return W.toCSV(W.PLAN_COLS, []);
    var rows = [];
    var k = W.fmt(res.knownAt);
    res.affected.forEach(function (r) {
      rows.push(["affected", res.date, res.eventShort, k, r.ref, r.ship, r.channel, r.guests, r.product, W.fmt(W.toMin(r.dep)), r.problemText + (r.preTight ? " (already tight before the event)" : ""),
        r.options.map(function (d) { return W.fmt(W.toMin(d)); }).join(" "), W.ACTION_TEXT[r.action], r.to ? W.fmt(W.toMin(r.to)) : "", r.back === null ? "" : W.fmt(r.back), "", ""]);
    });
    res.waitlist.forEach(function (c) {
      rows.push(["waitlist", res.date, res.eventShort, k, c.id, c.ship, c.channel, c.guests, c.product, "", "", "", c.offer ? "Offer" : "No offer", c.offer ? W.fmt(W.toMin(c.offer)) : "",
        c.offer ? W.fmt(W.toMin(c.offer) + res.params.tourMin) : "", "", c.notes.join("; ")]);
    });
    res.preGaps.forEach(function (g) {
      rows.push(["gap_before_event", res.date, res.eventShort, k, g.ref, g.ship, "", g.guests, "", W.fmt(W.toMin(g.dep)), W.PROBLEM_TEXT[g.problem], "", "Check the booking rule", "", "", "", ""]);
    });
    return W.toCSV(W.PLAN_COLS, rows);
  };

  /* ---------- extraction (mirrors dev/make_samples.py; the tests use it to check the embedded samples) ---------- */
  W.extractDay = function (bookingRows, scheduleRows, date) {
    var ships = scheduleRows.filter(function (r) { return r.date === date; }).map(function (r) {
      return { ship: r.ship, berth: r.berth, arrive: r.arrive, depart: r.depart, all_aboard: r.all_aboard };
    });
    var bookings = bookingRows.filter(function (r) { return r.date === date && r.status !== "CANCELLED_GUEST"; }).map(function (r) {
      return { ref: r.booking_ref, dep: r.departure, product: r.product, channel: r.channel, adults: +r.adults, children: +r.children, guests: +r.guests, net: +r.net, ship: r.ship, all_aboard: r.all_aboard };
    });
    return { date: date, ships: ships, bookings: bookings };
  };

  /* ---------- measures ---------- */
  W.refillRate = function (freed, refilled) {
    var f = str(freed), r = str(refilled);
    if (!/^\d{1,6}$/.test(f) || !/^\d{1,6}$/.test(r)) return { ok: false, error: "Enter whole numbers of seats." };
    var fn = parseInt(f, 10), rn = parseInt(r, 10);
    if (fn === 0) return { ok: false, error: "No freed seats yet." };
    if (rn > fn) return { ok: false, error: "Refilled seats cannot be more than freed seats." };
    return { ok: true, rate: Math.round(1000 * rn / fn) / 10 };
  };

  if (typeof module !== "undefined" && module.exports) module.exports = W;
  else root.Watch = W;
})(this);
