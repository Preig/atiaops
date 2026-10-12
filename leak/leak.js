/* Season Leak Audit: page wiring. All arithmetic lives in leak-core.js (tested in dev/).
 * Nothing leaves the browser. localStorage is used for convenience only and every access is wrapped.
 */
(function () {
  "use strict";
  var C = window.LeakCore;
  var KIT = window.KIT = window.KIT || {};
  var HKEY = "atiaops:leak:history";
  var FORMKEY = "atiaops:leak:leak"; /* kit.js keeps the form here: "atiaops:" + data-page + ":" + builder */
  var history = [], canStore = false, last = null, form = null;

  /* ---------- helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k) { try { var v = window.localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function lsDel(k) { try { window.localStorage.removeItem(k); } catch (e) { } }
  function storageWorks() { try { var k = "atiaops:leak:test"; window.localStorage.setItem(k, "1"); var ok = window.localStorage.getItem(k) === "1"; window.localStorage.removeItem(k); return ok; } catch (e) { return false; } }
  function say(el, msg) {
    if (KIT.say) { KIT.say(el, msg); return; }
    var n = el, box = null; while (n && !box) { box = n.querySelector && n.querySelector(".status"); n = n.parentElement; }
    if (box) box.textContent = msg;
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function todayISO() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function newId() { return "a" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
  function download(name, text, mime) {
    if (KIT.download) { KIT.download(name, text, mime); return; }
    var blob = new Blob([text], { type: (mime || "text/plain") + ";charset=utf-8" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function copyText(text, btn, msg) {
    if (KIT.copy) { KIT.copy(text, btn, msg); return; }
    try { navigator.clipboard.writeText(text).then(function () { say(btn, msg); }); } catch (e) { say(btn, "Select the text and copy it."); }
  }

  /* ---------- form values ---------- */
  function builder() { return KIT.builders && KIT.builders.leak; }
  function values() {
    if (builder()) return builder().values();
    var v = {}; $all("input[name]", form).forEach(function (el) { v[el.name] = el.value; }); return v;
  }
  function setValues(vals) {
    if (builder()) { builder().set(vals); return; } /* set() refreshes, which fires kit:change, which renders */
    $all("input[name]", form).forEach(function (el) { if (el.name in vals) el.value = vals[el.name]; });
    render();
  }

  /* ---------- small renderers ---------- */
  function rangeHTML(r) { return '<span class="lo">' + C.moneyNice(r.lo) + '</span> <span class="to">to</span> <span class="hi">' + C.moneyNice(r.hi) + "</span>"; }
  function needsText(keys) { return keys.map(function (k) { return C.FIELDS[k][0].toLowerCase(); }).join(", "); }
  function li(label, value) { return "<li>" + esc(label) + " <b>" + esc(value) + "</b></li>"; }
  function list(el, items) { el.innerHTML = items.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join(""); }
  function waitHTML(name, missing) { return '<p class="leak-name">' + esc(name) + '</p><p class="leak-wait">Needs: ' + esc(needsText(missing)) + ".</p>"; }
  function headHTML(name, l, sub) {
    return '<p class="leak-name">' + esc(name) + '</p><p class="leak-range">' + rangeHTML(l) + '</p><p class="leak-mid">' + sub + "</p>";
  }

  function renderErrors(a) {
    C.KEYS.forEach(function (k) {
      var inp = document.getElementById(k), box = document.getElementById("e-" + k), msg = a.err[k] || "";
      if (inp) { if (msg) inp.setAttribute("aria-invalid", "true"); else inp.removeAttribute("aria-invalid"); }
      if (box) box.textContent = msg;
    });
    $("#warn").textContent = a.warn.join(" ");
    var note = $("#ex-note");
    if (a.example.share === 1) { note.hidden = false; note.textContent = "Fictional example loaded: Channel Light Excursions, Juneau, a fictional teaching business. Type your own numbers over it."; }
    else if (a.example.hit >= 5) { note.hidden = false; note.textContent = a.example.hit + " of the numbers on screen still match the fictional example. Replace them with yours, or clear them."; }
    else note.hidden = true;
  }

  function renderCrew(a) {
    var c = a.crew, v = a.v, out = $("#crew-out");
    var html = c.ready ? headHTML("Crew leak", c, "Midpoint " + C.money(c.mid) + " · " + C.num(v.c_hires) + " hires × " + C.money(v.c_cost, true) + " · plus or minus " + C.num(a.u, 1) + "%")
      : waitHTML("Crew leak", c.missing);
    var m = [];
    if (c.rehire) m.push(li("Rehire rate", C.pct(c.rehire.value) + " (" + C.num(c.rehire.num) + " of " + C.num(c.rehire.den) + ")"));
    else if (v.c_returning !== null && v.c_eligible === null && !a.err.c_eligible) m.push("<li>Add eligible to return to see the rehire rate</li>");
    if (c.earlyQuit) m.push(li("Early-quit rate", C.pct(c.earlyQuit.value) + " (" + C.num(c.earlyQuit.num) + " of " + C.num(c.earlyQuit.den) + ")"));
    if (c.perPosition !== null) m.push(li("New hires per position", C.num(c.perPosition, 2)));
    if (m.length) html += '<ul class="minis">' + m.join("") + "</ul>";
    out.innerHTML = html;

    var w = c.whatIf, wo = $("#whatif-out");
    if (!w.active) wo.textContent = "Enter points above to see the avoidable part.";
    else if (w.hiresAvoided === null) wo.textContent = "";
    else {
      var parts = [];
      if (w.extra !== null) parts.push(C.num(w.extra, 1) + " more returning staff");
      if (w.quitsAvoided !== null) parts.push(C.num(w.quitsAvoided, 1) + " fewer early quits to replace");
      wo.innerHTML = "About <b>" + esc(C.num(w.hiresAvoided, 1)) + " fewer hires</b>" +
        (w.saved ? ", worth <b>" + esc(C.rangeText(w.saved)) + "</b> a season (midpoint " + esc(C.money(w.saved.mid)) + ")" : "") +
        ". " + esc(parts.join(" plus ")) + ".";
    }
    list($("#whatif-notes"), w.notes);

    var lines = (c.math || []).slice();
    if (c.rehire) lines.push("Rehire rate: " + C.num(c.rehire.num) + " ÷ " + C.num(c.rehire.den) + " = " + C.pct(c.rehire.value));
    if (c.earlyQuit) lines.push("Early-quit rate: " + C.num(c.earlyQuit.num) + " ÷ " + C.num(c.earlyQuit.den) + " = " + C.pct(c.earlyQuit.value));
    if (w.extra !== null) lines.push("Extra returners: " + C.num(v.c_eligible) + " × " + C.num(w.x, 1) + "% = " + C.num(w.extra, 2));
    if (w.quitsAvoided !== null) lines.push("Early quits avoided: " + C.num(Math.max(0, v.c_hires - (w.extra || 0)), 2) + " new hires × " + C.num(Math.min(w.y, c.earlyQuit ? c.earlyQuit.value : 0), 1) + "% = " + C.num(w.quitsAvoided, 2));
    if (w.saved) lines.push("Saved: " + C.num(w.hiresAvoided, 2) + " hires × " + C.money(v.c_cost, true) + " = " + C.money(w.saved.mid, true));
    if (a.costParts.any) a.costParts.lines.forEach(function (l) { lines.push("Part, " + l.label.toLowerCase() + ": " + l.detail); });
    list($("#crew-math"), lines.length ? lines : ["Enter new hires and cost per hire."]);

    var cp = a.costParts, bt = $("#btotal"), use = $("#btn-use-parts");
    bt.textContent = cp.any ? "The parts add up to " + C.money(cp.total, true) + " per hire." + (cp.partial.length ? " Not counted yet (needs hours and rate): " + cp.partial.join(", ").toLowerCase() + "." : "")
      : (cp.partial.length ? "Not counted yet (needs hours and rate): " + cp.partial.join(", ").toLowerCase() + "." : "Enter the parts you pay; the total appears here.");
    use.disabled = !cp.any;
    use.textContent = cp.any ? "Use " + C.money(cp.total, true) + " as the cost per hire" : "Use this total as the cost per hire";
  }

  function renderRoad(a) {
    var r = a.road, v = a.v, out = $("#road-out"), html;
    if (r.ready) {
      html = headHTML("Road leak", r, "Midpoint " + C.money(r.mid) + " · " + C.num(r.notRecovered) + " guests not recovered × " + C.money(v.r_net, true) + (r.staffCounted ? " + staff time" : "") + " · plus or minus " + C.num(a.u, 1) + "%");
    } else html = waitHTML("Road leak", r.missing);
    var m = [];
    if (r.recovery) m.push(li("Recovery rate", C.pct(r.recovery.value) + " (" + C.num(r.recovery.num) + " of " + C.num(r.recovery.den) + ")"));
    if (r.ready) m.push(li("Net revenue not recovered", C.money(r.lost)));
    if (r.ready && r.staffCounted) m.push(li("Staff time", C.money(r.staff)));
    if (r.perEvent !== null) m.push(li("Guests per event", C.num(r.perEvent, 1)));
    if (m.length) html += '<ul class="minis">' + m.join("") + "</ul>";
    if (r.notes.length) html += '<ul class="notes-small">' + r.notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul>";
    out.innerHTML = html;
    var lines = (r.math || []).slice();
    if (r.recovery) lines.push("Recovery rate: " + C.num(r.recovery.num) + " ÷ " + C.num(r.recovery.den) + " = " + C.pct(r.recovery.value));
    list($("#road-math"), lines.length ? lines : ["Enter guests affected, guests recovered and average net per guest."]);
  }

  function renderCap(a) {
    var k = a.cap, v = a.v;
    function partOut(id, p, label, extra) {
      var el = $(id);
      if (k[p] === null) { el.innerHTML = "Needs: " + esc(needsText(k.missingParts[p])) + "."; return; }
      el.innerHTML = "(" + p + ") <b>" + esc(C.rangeText(k[p + "Range"])) + "</b> · midpoint " + esc(C.money(k[p])) + (extra ? " · " + esc(extra) : "");
    }
    partOut("#cap-a-out", "a", "", k.a !== null ? C.num(v.k_unused) + " slots × " + C.money(v.k_vps, true) + " × " + C.num(v.k_fill, 1) + "%" : "");
    partOut("#cap-b-out", "b", "", k.b !== null ? C.num(v.k_capguests) + " guests × " + C.money(v.k_extra, true) + " per slot" : "");
    partOut("#cap-c-out", "c", "", k.c !== null ? C.num(v.k_seatturned) + " requests × " + C.money(v.k_combonet, true) + " × " + C.num(v.k_recap, 1) + "%" : "");
    var ctx = [];
    if (k.usedPct !== null) ctx.push("Allocation used <b>" + esc(C.pct(k.usedPct)) + "</b>");
    if (k.revPerSlot !== null) ctx.push("Revenue per allocated slot (Number 4) <b>" + esc(C.money(k.revPerSlot, true)) + "</b>");
    $("#cap-ctx-out").innerHTML = ctx.length ? ctx.join(" · ") : "Optional. Fill these to get Number 4 and allocation used %.";
    var html;
    if (k.ready) {
      var have = ["a", "b", "c"].filter(function (p) { return k[p] !== null; }).map(function (p) { return "(" + p + ")"; });
      html = headHTML("Cap leak", k, "Midpoint " + C.money(k.mid) + " · parts " + have.join(" + ") + " · plus or minus " + C.num(a.u, 1) + "%");
      var m = [];
      if (k.largest) m.push(li("Largest part", "(" + k.largest + ")"));
      if (k.headroom !== null) m.push(li("Turned away on capped days", C.num(v.k_capturned)));
      if (k.usedPct !== null) m.push(li("Allocation used", C.pct(k.usedPct)));
      if (m.length) html += '<ul class="minis">' + m.join("") + "</ul>";
      if (k.notes.length) html += '<ul class="notes-small">' + k.notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul>";
    } else html = waitHTML("Cap leak", k.missing);
    $("#cap-out").innerHTML = html;
    $("#cap-bind").textContent = C.bindingText(k, v);
    var lines = (k.math || []).slice();
    if (k.usedPct !== null) lines.push("Allocation used: " + C.num(v.k_used) + " ÷ " + C.num(v.k_alloc) + " = " + C.pct(k.usedPct));
    if (k.revPerSlot !== null) lines.push("Revenue per allocated slot: " + C.money(v.k_rev) + " ÷ " + C.num(v.k_alloc) + " = " + C.money(k.revPerSlot, true));
    list($("#cap-math"), lines.length ? lines : ["Enter the inputs for at least one part."]);
  }

  function renderResults(a) {
    var tiles = a.leaks.map(function (l) {
      return '<div class="tile"><p class="tile-name">' + esc(l.name) + "</p>" +
        (l.ready ? '<p class="tile-range">' + rangeHTML(l) + '</p><p class="hint">midpoint ' + esc(C.money(l.mid)) + "</p>"
          : '<p class="hint">Not filled in yet</p>') + "</div>";
    }).join("");
    if (a.total) tiles += '<div class="tile total"><p class="tile-name">All three</p><p class="tile-range">' + rangeHTML(a.total) + '</p><p class="hint">midpoint ' + esc(C.money(a.total.mid)) + "</p></div>";
    $("#tiles").innerHTML = tiles;
    $("#copq").textContent = C.copqText(a);

    var rank = a.ranking.map(function (it, i) {
      var note = C.rankNote(a, it, i);
      return '<li class="' + (i === 0 ? "first" : "") + '"><h3>' + (i === 0 ? '<span class="pill teal">Start here</span> ' : "") + esc(it.name) + ' <span class="hint">' + esc(C.rangeText(it)) + "</span></h3>" +
        '<p class="go">Open <a href="' + esc(it.tool.href) + '">' + esc(it.tool.label + " " + it.tool.name) + "</a> (basic rung, free tier)</p>" +
        (note ? "<p>" + esc(note) + "</p>" : "") + "</li>";
    });
    var zero = a.leaks.filter(function (l) { return l.ready && l.mid === 0; });
    if (!rank.length) rank.push('<li><p>Fill in at least one block above to rank the leaks.</p></li>');
    zero.forEach(function (l) { rank.push('<li><h3>' + esc(l.name) + ' <span class="hint">$0</span></h3><p>Zero on these numbers: nothing to fix here, or a number is missing.</p></li>'); });
    $("#rank").innerHTML = rank.join("");

    $("#numbers").innerHTML = C.numbers(a).map(function (n) {
      return '<tr><th scope="row">' + n.n + " · " + esc(n.name) + '</th><td class="v" data-label="Value">' + esc(n.value || "not entered") + '</td><td data-label="How">' + esc(n.how) + "</td></tr>";
    }).join("");

    var notes = [];
    if (a.uDefault) notes.push("Uncertainty is blank, so the default plus or minus 30% is used.");
    if (a.errorCount) notes.push(a.errorCount + " box" + (a.errorCount === 1 ? " has" : "es have") + " a problem, marked in red. Those numbers are left out until fixed.");
    if (a.crew.earlyQuit && a.crew.earlyQuit.den < 100) notes.push("With " + C.num(a.crew.earlyQuit.den) + " new hires, one person moves the early-quit rate " + C.num(a.crew.earlyQuit.onePerson, 1) + " points.");
    if (a.crew.rehire && a.crew.rehire.den < 100) notes.push("With " + C.num(a.crew.rehire.den) + " people eligible, one person moves the rehire rate " + C.num(a.crew.rehire.onePerson, 1) + " points.");
    notes.push("Each leak counts something different: the crew leak is all hiring spend, the road leak is lost net revenue and staff time, and the cap leak is mostly lost opportunity. The order says where the money is, not how much a fix will recover.");
    list($("#notes"), notes);
  }

  function renderPrint(a) {
    var v = a.v, ex = a.example.share === 1;
    var h = "<h2>Season Leak Audit" + (a.label ? " · " + esc(a.label) : "") + "</h2>";
    h += "<p><b>Date:</b> " + esc($("#f-date").value || todayISO()) + " · ranges plus or minus " + esc(C.num(a.u, 1)) + "% · estimates from the numbers entered, not accounting · preig.github.io/atiaops/leak/" + ($("#f-note").value ? " · <b>Note:</b> " + esc($("#f-note").value) : "") + "</p>";
    if (ex) h += "<p><b>Fictional example:</b> Channel Light Excursions, Juneau, a fictional teaching business.</p>";
    else if (a.example.hit >= 5) h += "<p><b>Check:</b> some numbers still match the fictional example.</p>";
    var from = {
      crew: a.crew.ready ? C.num(v.c_hires) + " new hires × " + C.money(v.c_cost, true) : "",
      road: a.road.ready ? C.num(a.road.notRecovered) + " guests not recovered × " + C.money(v.r_net, true) + (a.road.staffCounted ? " + " + C.num(v.r_hours, 1) + " h × " + C.money(v.r_rate, true) : "") : "",
      cap: a.cap.ready ? ["a", "b", "c"].map(function (p) { return "(" + p + ") " + (a.cap[p] !== null ? C.money(a.cap[p]) : "not counted"); }).join(", ") : ""
    };
    h += '<table><thead><tr><th scope="col">Leak</th><th scope="col">Range</th><th scope="col">Midpoint</th><th scope="col">From</th></tr></thead><tbody>';
    a.leaks.forEach(function (l) {
      h += '<tr><th scope="row">' + esc(l.name) + "</th><td>" + (l.ready ? esc(C.rangeText(l)) : "not filled in") + "</td><td>" + (l.ready ? esc(C.money(l.mid)) : "") + "</td><td>" + esc(from[l.key]) + "</td></tr>";
    });
    if (a.total) h += '<tr><th scope="row">All three</th><td><b>' + esc(C.rangeText(a.total)) + "</b></td><td>" + esc(C.money(a.total.mid)) + "</td><td></td></tr>";
    h += "</tbody></table>";
    h += "<p>" + esc(C.copqText(a)) + "</p>";
    h += "<h3>Start here</h3><ol>" + (a.ranking.length ? a.ranking.map(function (it, i) {
      return "<li><b>" + esc(it.name) + "</b>, " + esc(C.rangeText(it)) + ": open " + esc(it.tool.label + " " + it.tool.name) + ". " + esc(C.rankNote(a, it, i)) + "</li>";
    }).join("") : "<li>No leak to rank yet.</li>") + "</ol>";
    if (a.cap.ready) h += "<h3>Which constraint binds</h3><p>" + esc(C.bindingText(a.cap, v)) + " Identify which constraint binds, day by day, before you exploit it.</p>";
    h += '<h3>The four numbers (baseline)</h3><table><tbody>' + C.numbers(a).map(function (n) {
      return '<tr><th scope="row">' + n.n + " · " + esc(n.name) + "</th><td>" + esc(n.value || "not entered") + "</td><td>" + esc(n.how) + "</td></tr>";
    }).join("") + "</tbody></table>";
    h += "<h3>Assumptions</h3><ul><li>Uncertainty plus or minus " + esc(C.num(a.u, 1)) + "%.</li>" +
      "<li>Fill share " + esc(v.k_fill !== null ? C.num(v.k_fill, 1) + "%" : "not set") + ", extra net per slot on capped days " + esc(v.k_extra !== null ? C.money(v.k_extra, true) : "not set") + ", recapture share " + esc(v.k_recap !== null ? C.num(v.k_recap, 1) + "%" : "not set") + ": owner judgments.</li>" +
      "<li>Cost per hire: " + esc(a.costParts.any ? "parts entered add up to " + C.money(a.costParts.total, true) : "one estimate, not itemized") + ".</li></ul>";
    h += "<p><b>Next:</b> copy the \"Challenge my audit\" prompt and check each assumption against your records.</p>";
    $("#print-summary").innerHTML = h;
  }

  function render() {
    var a = C.audit(values());
    last = a;
    renderErrors(a); renderCrew(a); renderRoad(a); renderCap(a); renderResults(a);
    $("#challenge-prompt").textContent = C.challengePrompt(a);
    renderPrint(a);
  }

  /* ---------- history ---------- */
  function loadHistory() {
    var h = lsGet(HKEY), out = [], seen = {};
    if (Array.isArray(h)) h.forEach(function (r) { var n = C.normRecord(r); if (n && n.id && !seen[n.id]) { seen[n.id] = 1; out.push(n); } });
    history = out;
  }
  function persist() { if (!history.length) { lsDel(HKEY); return canStore; } return lsSet(HKEY, history); }
  function cell(label, html, cls) { return '<td data-label="' + esc(label) + '"' + (cls ? ' class="' + cls + '"' : "") + ">" + html + "</td>"; }
  function renderHistory() {
    var box = $("#history"), cmp = $("#compare");
    if (!history.length) { box.innerHTML = '<p class="hint">No saved audits yet. Fill in the blocks, then tap <b>Save this audit</b> under Your results.</p>'; cmp.textContent = ""; return; }
    var sorted = C.sortRecords(history);
    var rows = sorted.slice().reverse().map(function (rec) {
      var a = C.recordAudit(rec), nums = C.numbers(a);
      var R = function (l) { return l.ready ? esc(C.rangeText(l)) : "not filled in"; };
      var name = esc(rec.label || "Unlabeled") + (rec.note ? '<br><span class="hint">' + esc(rec.note) + "</span>" : "");
      var aria = esc((rec.label || "unlabeled audit") + ", " + (rec.date || "no date"));
      return '<tr><th scope="row">' + name + "</th>" + cell("Date", esc(rec.date || "")) + cell("Crew", R(a.crew)) + cell("Road", R(a.road)) + cell("Cap", R(a.cap)) +
        cell("Total", a.total ? "<b>" + esc(C.rangeText(a.total)) + "</b>" : "") +
        cell("1 Rehire", esc(nums[0].value || "")) + cell("2 Early quit", esc(nums[1].value || "")) + cell("3 Recovery", esc(nums[2].value || "")) + cell("4 Per slot", esc(nums[3].value || "")) +
        cell("Actions", '<button type="button" class="secondary small" data-load="' + esc(rec.id) + '" aria-label="Load the audit ' + aria + '">Load</button> <button type="button" class="danger small" data-del="' + esc(rec.id) + '" aria-label="Delete the audit ' + aria + '">Delete</button>', "wrap") + "</tr>";
    });
    box.innerHTML = '<div class="table-wrap"><table class="hist stack"><caption class="visually-hidden">Saved audits, newest first</caption><thead><tr><th scope="col">Season</th><th scope="col">Date</th><th scope="col">Crew</th><th scope="col">Road</th><th scope="col">Cap</th><th scope="col">Total</th><th scope="col">1 Rehire</th><th scope="col">2 Early quit</th><th scope="col">3 Recovery</th><th scope="col">4 Per slot</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead><tbody>' + rows.join("") + "</tbody></table></div>";
    var c = sorted.length > 1 ? C.compare(sorted[sorted.length - 2], sorted[sorted.length - 1]) : null;
    cmp.textContent = c ? c.text : (sorted.length > 1 ? "Fill in more blocks to compare totals." : "Save a second audit, for example next season's, to compare.");
  }
  function saveAudit(btn) {
    var rec = C.snapshot(values(), { id: newId(), date: $("#f-date").value || todayISO(), note: $("#f-note").value, savedAt: new Date().toISOString() });
    if (!Object.keys(rec.inputs).length) { say(btn, "Enter some numbers before you save."); return; }
    history.push(rec);
    var ok = persist();
    renderHistory();
    say(btn, ok ? "Saved in this browser as \"" + (rec.label || "Unlabeled") + "\". See Saved audits below." : "Kept for this visit only: this browser is not saving data. Use Download all to keep it.");
  }
  function loadRecord(id, btn) {
    var rec = history.filter(function (r) { return r.id === id; })[0];
    if (!rec) return;
    var a = last;
    if (a && a.example.filled > 0 && a.example.share < 1 && !window.confirm("Replace the numbers on screen with the audit saved as \"" + (rec.label || rec.date) + "\"?")) return;
    setValues(C.recordInput(rec));
    $("#f-date").value = rec.date || todayISO();
    $("#f-note").value = rec.note || "";
    render();
    say(btn, "Loaded \"" + (rec.label || rec.date) + "\" into the blocks above.");
  }
  function deleteRecord(id) {
    var rec = history.filter(function (r) { return r.id === id; })[0];
    if (!rec || !window.confirm("Delete the audit saved as \"" + (rec.label || rec.date) + "\"? This cannot be undone.")) return;
    history = history.filter(function (r) { return r.id !== id; });
    persist(); renderHistory();
    $("#saved").focus();
    say($("#history"), "Deleted.");
  }
  function importFile(file, btn) {
    if (!file) return;
    if (file.size > 2000000) { say(btn, "That file is too large to be a saved audit file."); return; }
    var fr = new FileReader();
    fr.onload = function () {
      var data = null; try { data = JSON.parse(String(fr.result)); } catch (e) { }
      var recs = data && Array.isArray(data.records) ? data.records : Array.isArray(data) ? data : null;
      if (!recs) { say(btn, "That file is not a saved audit file from this page."); return; }
      var seen = {}, added = 0;
      history.forEach(function (r) { seen[r.id] = 1; });
      recs.forEach(function (r) {
        var n = C.normRecord(r); if (!n) return;
        if (!n.id || seen[n.id]) n.id = newId();
        seen[n.id] = 1; history.push(n); added++;
      });
      persist(); renderHistory();
      say(btn, added ? "Imported " + added + " audit" + (added === 1 ? "" : "s") + "." : "No audits found in that file.");
    };
    fr.onerror = function () { say(btn, "Could not read that file."); };
    fr.readAsText(file);
  }

  /* ---------- actions ---------- */
  function loadExample(btn) {
    var a = last;
    if (a && a.example.filled > a.example.hit && !window.confirm("Replace the numbers on screen with the fictional example? Your saved audits are not touched.")) return;
    setValues(C.EXAMPLE);
    say(btn, "Fictional example loaded: Channel Light Excursions, Juneau (fictional). Type your own numbers over it.");
    if (btn.getAttribute("data-leak-example") === "top") {
      var t = $("#results");
      if (t) { t.scrollIntoView({ behavior: "smooth", block: "start" }); try { t.focus({ preventScroll: true }); } catch (e) { t.focus(); } }
    }
  }
  function clearAll(btn) {
    var a = last;
    if (a && a.example.filled > a.example.hit && !window.confirm("Clear every number on screen? Saved audits are not touched.")) return;
    form.reset();
    lsDel(FORMKEY);
    if (builder()) builder().refresh(); else render();
    say(btn, "Cleared. Defaults are back: plus or minus 30%, fill share 30%, extra net per slot $10, recapture share 25%.");
  }

  document.addEventListener("DOMContentLoaded", function () {
    form = $("#leak-form");
    if (!C || !form) return;
    canStore = storageWorks();
    if (!canStore) $("#storage-warn").textContent = "This browser is not saving data (a private window, or storage is blocked). Saved audits last for this visit only: use Download all to keep them.";
    $("#f-date").value = todayISO();
    form.addEventListener("kit:change", render);
    if (!builder()) form.addEventListener("input", render);
    $("#f-date").addEventListener("change", function () { renderPrint(last || C.audit(values())); });
    $("#f-note").addEventListener("input", function () { renderPrint(last || C.audit(values())); });

    $all("[data-leak-example]").forEach(function (b) { b.addEventListener("click", function () { loadExample(b); }); });
    $("#btn-clear").addEventListener("click", function (e) { clearAll(e.currentTarget); });
    $("#btn-use-parts").addEventListener("click", function (e) {
      var cp = C.costParts(C.validate(values()).v);
      if (!cp.any) return;
      var inp = $("#c_cost");
      inp.value = String(C.round(cp.total, 2));
      inp.dispatchEvent(new Event("input", { bubbles: true }));
      say(e.currentTarget, "Cost per hire set to " + C.money(cp.total, true) + " from the parts.");
    });
    $("#btn-save").addEventListener("click", function (e) { saveAudit(e.currentTarget); });
    $("#btn-copy").addEventListener("click", function (e) { copyText(C.summaryText(last || C.audit(values())), e.currentTarget, "Summary copied."); });
    $("#btn-dl").addEventListener("click", function (e) {
      var a = last || C.audit(values());
      download("season-leak-audit" + (a.label ? "-" + a.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : "") + ".txt", C.summaryText(a) + "\n\n" + C.challengePrompt(a) + "\n");
      say(e.currentTarget, "Saved the summary and the challenge prompt as a .txt file.");
    });
    $("#btn-print").addEventListener("click", function () { renderPrint(last || C.audit(values())); window.print(); });
    $("#history").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.dataset.load) loadRecord(b.dataset.load, b);
      else if (b.dataset.del) deleteRecord(b.dataset.del);
    });
    $("#btn-export-csv").addEventListener("click", function (e) {
      if (!history.length) { say(e.currentTarget, "Nothing saved yet."); return; }
      download("season-leak-audits.csv", C.historyCSV(history), "text/csv"); say(e.currentTarget, "Saved season-leak-audits.csv.");
    });
    $("#btn-export-json").addEventListener("click", function (e) {
      if (!history.length) { say(e.currentTarget, "Nothing saved yet."); return; }
      download("season-leak-audits.json", JSON.stringify({ format: C.FORMAT, version: 1, exported: new Date().toISOString(), records: C.sortRecords(history) }, null, 2), "application/json");
      say(e.currentTarget, "Saved season-leak-audits.json. Import it on another device to move your audits.");
    });
    $("#btn-import").addEventListener("click", function () { $("#f-import").click(); });
    $("#f-import").addEventListener("change", function (e) { importFile(e.target.files && e.target.files[0], $("#btn-import")); e.target.value = ""; });
    $("#btn-delete-all").addEventListener("click", function (e) {
      if (!history.length) { say(e.currentTarget, "Nothing saved yet."); return; }
      if (!window.confirm("Delete all " + history.length + " saved audits in this browser? This cannot be undone. Download a copy first if you want to keep them.")) return;
      history = []; persist(); renderHistory(); say(e.currentTarget, "Deleted all saved audits in this browser.");
    });

    loadHistory(); renderHistory(); render();
  });
})();
