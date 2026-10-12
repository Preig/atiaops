/* 2b Arrival watch and backfill: page wiring. Pure logic lives in watch-core.js (window.Watch).
 * The fictional day samples are embedded in index.html (<script type="application/json" id="samples">),
 * built by dev/make_samples.py, so the page works offline with no fetch. Nothing leaves the browser.
 */
(function () {
  "use strict";
  var W = window.Watch, KIT = window.KIT;
  var KEY = "atiaops:2b:";
  var DATA = null, res = null, queue = [], sig = "";

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n) { return "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function t(hm) { return W.fmt(W.toMin(hm)); }
  function status(id, msg) {
    var b = $(id);
    if (!b) return;
    b.textContent = msg;
    clearTimeout(b._t);
    b._t = setTimeout(function () { b.textContent = ""; }, 8000);
  }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : (many || one + "s")); }

  function loadData() {
    var el = $("samples");
    try { DATA = JSON.parse(el.textContent); } catch (e) { DATA = null; }
    return DATA && DATA.days && DATA.days.length;
  }
  function day() { var i = +$("b-day").value; return DATA.days[i] || DATA.days[0]; }

  /* ---------- form ---------- */
  var PARAM_IDS = { seats: "p-seats", bufferMin: "p-buffer", noticeMin: "p-notice", walkDock: "p-walkdock", walkAnchor: "p-walkanchor", allocation: "p-alloc", tourMin: "p-tour", shuttleMin: "p-shuttle" };
  function setParams(p) {
    Object.keys(PARAM_IDS).forEach(function (k) { $(PARAM_IDS[k]).value = p[k] === undefined ? W.DEFAULTS[k] : p[k]; });
    var rule = p.waitlistRule === "bestfit" ? "bestfit" : "fifo";
    $("p-wl-fifo").checked = rule === "fifo";
    $("p-wl-best").checked = rule === "bestfit";
  }
  function getParams() {
    var p = {};
    Object.keys(PARAM_IDS).forEach(function (k) { p[k] = $(PARAM_IDS[k]).value; });
    p.waitlistRule = $("p-wl-best").checked ? "bestfit" : "fifo";
    return p;
  }
  function fillDaySelects(d) {
    $("b-ship").innerHTML = d.ships.map(function (s) {
      return '<option value="' + esc(s.ship) + '">' + esc(s.ship) + " (" + (s.berth === "ANCHOR" ? "at anchor" : "docked") + ", arrives " + t(s.arrive) + ", all-aboard " + t(s.all_aboard) + ")</option>";
    }).join("");
    $("b-dep").innerHTML = d.departures.map(function (x) { return '<option value="' + esc(x) + '">' + t(x) + "</option>"; }).join("");
    $("b-story").textContent = d.story;
  }
  function setEvent(ev) {
    $("b-type").value = ev.type;
    var d = day();
    if (ev.ship && d.ships.some(function (s) { return s.ship === ev.ship; })) $("b-ship").value = ev.ship;
    if (ev.departure && d.departures.indexOf(ev.departure) >= 0) $("b-dep").value = ev.departure;
    $("b-min").value = ev.minutes === undefined || ev.minutes === null ? 60 : ev.minutes;
    $("b-shift").value = ev.allaboardShift === undefined ? 0 : ev.allaboardShift;
    $("b-cancel").checked = !!ev.cancel;
    $("b-known").value = ev.knownAt || "08:00";
    showFields();
  }
  function getEvent() {
    return { type: $("b-type").value, ship: $("b-ship").value, departure: $("b-dep").value, minutes: $("b-min").value,
      allaboardShift: $("b-shift").value, cancel: $("b-cancel").checked, knownAt: ($("b-known").value || "").slice(0, 5) };
  }
  function showFields() {
    var ty = $("b-type").value, ship = W.isShipEvent(ty);
    $("w-ship").hidden = !ship;
    $("w-dep").hidden = ship;
    $("w-shift").hidden = ty !== "ship_late";
    $("w-cancel").hidden = ty !== "weather_hold";
    $("w-min").hidden = ty === "ship_skip" || (ty === "weather_hold" && $("b-cancel").checked);
    $("b-min-l").textContent = ty === "weather_hold" ? "Minutes held" : "Minutes late";
  }
  function saveForm() {
    KIT.store.set(KEY + "form", { day: $("b-day").value, ev: getEvent(), params: getParams() });
  }

  /* ---------- results ---------- */
  var ACTION_HTML = {
    move: function (r) { return '<span class="act-move">Move to ' + t(r.to) + "</span>, back about " + W.fmt(r.back); },
    no_seat: function () { return '<span class="act-no_seat">No same-day seat</span>: refund or another day (your policy)'; },
    no_call: function () { return '<span class="act-no_call">Ship not in port</span>: refund under the cruise line\'s terms'; },
    decide: function (r) { return '<span class="act-decide">Duty lead decides</span>: back about ' + W.fmt(r.back) + ", inside the buffer, no other departure fits"; }
  };
  function stat(n, label, cls) { return '<div class="stat' + (cls ? " " + cls : "") + '"><b>' + n + "</b><span>" + esc(label) + "</span></div>"; }

  function render() {
    var d = day();
    var ev = getEvent();
    res = W.simulate(d, ev, getParams());
    saveForm();
    if (!res.ok) {
      $("b-errors").textContent = res.errors.join(" ");
      $("b-result").hidden = true;
      queue = []; sig = ""; renderQueue();
      return;
    }
    $("b-errors").textContent = "";
    $("b-result").hidden = false;
    var T = res.totals;
    $("b-event").textContent = res.eventText + " We knew at " + W.fmt(res.knownAt) + ".";
    $("b-stats").innerHTML =
      stat(T.affectedBookings + " / " + T.affectedGuests, "affected bookings / guests", T.affectedGuests ? "bad" : "") +
      stat(T.movedGuests, "guests moved to another departure", "good") +
      stat(T.noSeatGuests + T.noCallGuests, "guests with no same-day seat", T.noSeatGuests + T.noCallGuests ? "bad" : "") +
      stat(T.decideGuests, "guests the duty lead decides on") +
      stat(T.freedSeats, "seats freed") +
      stat(T.offeredSeats, "freed seats offered to the waitlist", "good") +
      stat(T.lateSeats, "freed seats too late to offer", T.lateSeats ? "bad" : "") +
      stat(T.recoverablePct === null ? "n/a" : T.recoverablePct + "%", "Number 3 for this event if every move and offer is accepted (upper bound)");

    /* the detection lesson */
    var c = W.compareEarlier(d, ev, getParams(), 60);
    var lead = T.leadMinutes;
    var L = [];
    if (lead !== null) L.push("The first alert came " + (lead >= 0 ? plural(lead, "minute") + " before" : plural(-lead, "minute") + " after") + " the first affected departure.");
    if (c && (c.moreMoved > 0 || c.moreOffered > 0)) {
      L.push("<b>Known an hour earlier (at " + esc(c.knownAt) + "):</b> " + (c.moreMoved ? plural(c.moreMoved, "more guest") + " moved" : "") +
        (c.moreMoved && c.moreOffered ? " and " : "") + (c.moreOffered ? plural(c.moreOffered, "more freed seat") + " offered to the waitlist" : "") + ". That hour is what a watch buys.");
    } else if (c) {
      L.push("Knowing an hour earlier (at " + esc(c.knownAt) + ") changes nothing on this board: here the limit is seats, the buffer or the waitlist, not time.");
    }
    $("b-lesson").innerHTML = L.join(" ");
    $("b-warn").textContent = res.warnings.join(" ");

    $("b-deps").innerHTML = res.departures.map(function (x) {
      var note = x.cancelled ? "Cancelled" : (x.delay ? "Leaves " + x.delay + " min late. " : "") + (x.note || "") + (x.freeBefore && !x.freed ? (x.note ? " " : "") + plural(x.freeBefore, "seat") + " empty before the event" : "");
      return '<tr class="' + (x.cancelled ? "cancelled" : "") + '"><td class="hd" data-label="Departure"><b>' + esc(x.label) + "</b></td>" +
        '<td class="il" data-label="Leaves dock">' + (x.cancelled ? "" : W.fmt(x.start)) + "</td>" +
        '<td class="il" data-label="At Auke Bay">' + (x.cancelled ? "" : W.fmt(x.atAukeBay)) + "</td>" +
        '<td class="il" data-label="Back at dock">' + (x.cancelled ? "" : W.fmt(x.back)) + "</td>" +
        '<td class="num il" data-label="Booked now">' + x.before + "</td>" +
        '<td class="num il" data-label="After plan">' + x.after + "</td>" +
        '<td class="num il" data-label="Freed">' + x.freed + "</td>" +
        '<td class="num il" data-label="Offered">' + (x.offered || 0) + "</td>" +
        '<td data-label="Note">' + esc(note.trim()) + "</td></tr>";
    }).join("");

    $("b-aff").innerHTML = res.affected.length ? res.affected.map(function (r) {
      var fits = r.fitsTime.map(function (x) { return t(x) + (r.options.indexOf(x) < 0 && r.action === "move" && r.to !== x ? " (taken in plan)" : r.options.indexOf(x) < 0 ? " (full)" : ""); });
      return "<tr><td data-label=\"Booking\"><b>" + esc(r.ref) + "</b></td>" +
        '<td data-label="Ship, all-aboard">' + esc(r.ship === "INDEPENDENT" ? "Independent" : r.ship + ", " + r.allAboard) + "</td>" +
        '<td class="il" data-label="Channel">' + esc(r.channel) + "</td>" +
        '<td class="num il" data-label="Guests">' + r.guests + "</td>" +
        '<td class="il" data-label="Booked">' + t(r.dep) + "</td>" +
        '<td data-label="Problem">' + esc(r.problemText) + (r.ready && r.problem === "missed" ? " (ready " + esc(r.ready) + ")" : "") + (r.preTight ? ' <span class="pill amber">tight before the event</span>' : "") + "</td>" +
        '<td data-label="Departures that fit">' + (fits.length ? esc(fits.join(", ")) : "None") + "</td>" +
        '<td data-label="Proposed">' + ACTION_HTML[r.action](r) + "</td></tr>";
    }).join("") : '<tr><td colspan="8">No booking is hurt by this event under your rules.</td></tr>';

    var wl = res.waitlist;
    if (!d.waitlist.length) $("b-wl-note").textContent = "No waitlist on this fictional day: nobody was turned away. Freed seats stay empty unless a walk-up guest takes them.";
    else $("b-wl-note").textContent = plural(T.freedSeats, "seat") + " freed, " + T.offeredSeats + " offered under the " + (res.params.waitlistRule === "bestfit" ? "best-fit" : "first-come, first-served") + " rule, " + T.lateSeats + " too late to offer. Glacier visits left for refilled combo seats: " + T.allocationLeftBefore + " before offers, " + T.allocationLeftAfter + " after.";
    $("b-wl").innerHTML = wl.length ? wl.map(function (c) {
      return "<tr><td data-label=\"Entry\"><b>" + esc(c.id) + "</b></td>" +
        '<td class="il" data-label="Joined">' + esc(c.joined.replace(/^\d{4}-/, "")) + "</td>" +
        '<td class="num il" data-label="Guests">' + c.guests + "</td>" +
        '<td data-label="Product">' + esc(W.TEXT.product[c.product] || c.product) + "</td>" +
        '<td data-label="Ship or independent">' + esc(c.ship === "INDEPENDENT" ? "Independent (" + c.channel + ")" : c.ship + ", all-aboard " + t(c.all_aboard)) + "</td>" +
        '<td data-label="Offer">' + (c.offer ? '<span class="act-move">' + t(c.offer) + "</span>" : "No offer") + "</td>" +
        '<td data-label="Why not elsewhere">' + esc(c.notes.join("; ")) + "</td></tr>";
    }).join("") : '<tr><td colspan="7">No waitlist entries.</td></tr>';

    $("b-gaps-s").textContent = "Bookings that were already tight before the event (" + res.preGaps.length + ")";
    $("b-gaps").innerHTML = res.preGaps.length ? res.preGaps.map(function (g) {
      return "<tr><td data-label=\"Booking\">" + esc(g.ref) + '</td><td data-label="Ship">' + esc(g.ship) + '</td><td data-label="Booked">' + t(g.dep) + '</td><td class="num" data-label="Guests">' + g.guests + '</td><td data-label="Problem">' + esc(W.PROBLEM_TEXT[g.problem]) + "</td></tr>";
    }).join("") : '<tr><td colspan="5">None on this day under your rules.</td></tr>';

    var newSig = JSON.stringify([d.date, ev, getParams()]);
    if (newSig !== sig) {
      sig = newSig;
      queue = W.buildQueue(res, {});
      renderQueue();
    }
  }

  /* ---------- approval queue ---------- */
  function nowHM() { var n = new Date(); return W.hhmm(n.getHours() * 60 + n.getMinutes()); }
  function renderQueue() {
    var host = $("q-list");
    if (!queue.length) { host.innerHTML = '<p class="hint">No drafts. Fix the event above first.</p>'; updateQueueSum(); return; }
    host.innerHTML = queue.map(function (q) {
      var id = "qt-" + q.qid;
      return '<div class="qitem ' + q.status + '" data-q="' + q.qid + '">' +
        '<div class="qhead"><b>' + q.qid + " · " + esc(q.recipient) + '</b><span class="pill ' + (q.status === "approved" ? "" : q.status === "held" ? "amber" : "teal") + '">' + q.status + "</span></div>" +
        '<label for="' + id + '">Draft text <small>(edit here; ' + esc(q.kind) + ", about " + esc(q.about) + ")</small></label>" +
        '<textarea id="' + id + '" spellcheck="true">' + esc(q.text) + "</textarea>" +
        '<p class="qstate">' + esc(qstate(q)) + "</p>" +
        '<div><div class="btns">' +
        '<button type="button" class="small" data-act="approve">Approve</button>' +
        '<button type="button" class="secondary small" data-act="hold">Hold</button>' +
        '<button type="button" class="ghost small" data-act="pending">Back to pending</button>' +
        '<button type="button" class="ghost small" data-copy="' + id + '" data-copy-msg="Copied the draft. Send it only after approval, from your booking system or email.">Copy</button>' +
        '</div><p class="status" role="status" aria-live="polite"></p></div></div>';
    }).join("");
    updateQueueSum();
  }
  function qstate(q) {
    var fills = (q.text.match(/\[FILL[^\]]*\]/g) || []).length;
    if (q.status === "approved") return "Approved by " + q.approved_by + " at " + q.approved_at + ". Not sent: a person sends it from your booking system or email, then records sent_by and sent_at.";
    if (q.status === "held") return "On hold. It stays in the queue until someone decides.";
    return "Pending approval." + (fills ? " " + plural(fills, "[FILL] item") + " to complete first." : "");
  }
  function updateQueueSum() {
    var c = { pending: 0, approved: 0, held: 0 };
    queue.forEach(function (q) { c[q.status]++; });
    $("q-sum").textContent = queue.length ? plural(queue.length, "draft") + ": " + c.pending + " pending, " + c.approved + " approved, " + c.held + " on hold. Nothing has been sent." : "";
  }
  function wireQueue() {
    var s = KIT.store.get(KEY + "initials");
    if (typeof s === "string") $("q-initials").value = s;
    $("q-initials").addEventListener("input", function (e) {
      e.target.value = e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4);
      KIT.store.set(KEY + "initials", e.target.value);
    });
    $("q-list").addEventListener("input", function (e) {
      var box = e.target.closest(".qitem");
      if (!box || e.target.tagName !== "TEXTAREA") return;
      var q = queue.filter(function (x) { return x.qid === box.dataset.q; })[0];
      if (!q) return;
      q.text = e.target.value;
      if (q.status === "approved") {
        q.status = "pending"; q.approved_by = ""; q.approved_at = "";
        box.className = "qitem pending";
        box.querySelector(".pill").className = "pill teal";
        box.querySelector(".pill").textContent = "pending";
        updateQueueSum();
      }
      box.querySelector(".qstate").textContent = qstate(q);
    });
    $("q-list").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-act]");
      if (!b) return;
      var box = b.closest(".qitem");
      var q = queue.filter(function (x) { return x.qid === box.dataset.q; })[0];
      if (!q) return;
      var st = box.querySelector(".status");
      if (b.dataset.act === "approve") {
        var ini = $("q-initials").value;
        if (!/^[A-Z]{1,4}$/.test(ini)) { st.textContent = "Type your initials in the box above first (letters only)."; $("q-initials").focus(); return; }
        if (q.text.indexOf("[FILL") >= 0) { st.textContent = "This draft still has [FILL] items. Complete them, then approve."; return; }
        q.status = "approved"; q.approved_by = ini; q.approved_at = nowHM();
      } else if (b.dataset.act === "hold") { q.status = "held"; q.approved_by = ""; q.approved_at = ""; }
      else { q.status = "pending"; q.approved_by = ""; q.approved_at = ""; }
      var y = window.scrollY;
      renderQueue();
      window.scrollTo(0, y);
      var again = document.querySelector('.qitem[data-q="' + q.qid + '"] button[data-act="' + b.dataset.act + '"]');
      if (again) again.focus({ preventScroll: true });
    });
    $("q-csv").addEventListener("click", function () {
      if (!res || !res.ok) { status("st-queue", "Fix the event first."); return; }
      var name = "approval-queue-" + res.date + ".csv";
      KIT.download(name, W.queueCSV(res, queue), "text/csv");
      status("st-queue", "Saved " + name + " to your downloads.");
    });
  }

  /* ---------- measure ---------- */
  function updateMeasure() {
    var f = $("m-freed").value, r = $("m-refilled").value;
    KIT.store.set(KEY + "measure", { f: f, r: r });
    if (f === "" && r === "") { $("m-out").textContent = "Enter freed seats and refilled seats for a season (or one event)."; return; }
    var x = W.refillRate(f, r);
    $("m-out").textContent = x.ok ? "Seats refilled after disruption: " + r + " of " + f + " = " + x.rate.toFixed(1) + "%" : x.error;
  }

  /* ---------- start ---------- */
  function init() {
    if (!W || !KIT) return;
    if (!loadData()) { $("b-errors").textContent = "The fictional day samples did not load. Rebuild them with dev/make_samples.py."; return; }
    $("b-day").innerHTML = DATA.days.map(function (d, i) { return '<option value="' + i + '">' + esc(d.label) + "</option>"; }).join("");
    $("b-type").innerHTML = W.EVENT_TYPES.map(function (x) { return '<option value="' + x[0] + '">' + esc(x[1]) + "</option>"; }).join("");
    var saved = KIT.store.get(KEY + "form");
    var di = saved && DATA.days[+saved.day] ? +saved.day : 0;
    $("b-day").value = String(di);
    fillDaySelects(day());
    setParams(saved && saved.params ? saved.params : W.DEFAULTS);
    setEvent(saved && saved.ev ? saved.ev : day().suggested);

    var timer = null;
    function soon() { clearTimeout(timer); timer = setTimeout(render, 120); }
    $("board-form").addEventListener("input", function (e) {
      if (e.target.id === "b-day") return;
      if (e.target.id === "b-type" || e.target.id === "b-cancel") showFields();
      soon();
    });
    $("board-form").addEventListener("change", function (e) {
      if (e.target.id === "b-day") {
        fillDaySelects(day());
        setEvent(day().suggested);
        status("st-board", "Loaded this day's suggested event. Change it freely.");
        render();
        return;
      }
      if (e.target.id === "b-type" || e.target.id === "b-cancel") showFields();
      soon();
    });
    $("board-form").addEventListener("submit", function (e) { e.preventDefault(); render(); });
    $("b-suggest").addEventListener("click", function () { setEvent(day().suggested); render(); status("st-board", "Suggested event loaded."); });
    $("b-reset").addEventListener("click", function () { setParams(W.DEFAULTS); render(); status("st-board", "Rules reset to the fictional defaults."); });
    $("b-plan-csv").addEventListener("click", function () {
      if (!res || !res.ok) { status("st-plan", "Fix the event first."); return; }
      var name = "rebook-plan-" + res.date + ".csv";
      KIT.download(name, W.planCSV(res), "text/csv");
      status("st-plan", "Saved " + name + " to your downloads.");
    });
    wireQueue();
    var m = KIT.store.get(KEY + "measure");
    if (m) { $("m-freed").value = m.f || ""; $("m-refilled").value = m.r || ""; }
    $("m-form").addEventListener("input", updateMeasure);
    updateMeasure();
    $("forget").addEventListener("click", function () {
      $("b-day").value = "0";
      fillDaySelects(day());
      setParams(W.DEFAULTS);
      setEvent(day().suggested);
      $("q-initials").value = "";
      $("m-freed").value = ""; $("m-refilled").value = "";
      sig = "";
      render(); updateMeasure();
      ["form", "initials", "measure"].forEach(function (k) { KIT.store.del(KEY + k); });
      status("st-forget", "Everything this page saved in this browser is gone.");
    });
    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
