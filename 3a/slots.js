/* 3a Fill every capped slot: page wiring. Pure logic lives in slots-core.js (window.SlotsCore).
 * Nothing leaves the browser. localStorage only for convenience (KIT.store wraps it in try/catch).
 */
(function () {
  "use strict";
  var S = window.SlotsCore;
  var KIT = window.KIT || {};
  var store = KIT.store || { get: function () { return null; }, set: function () { }, del: function () { } };
  var SK = "atiaops:3a:";
  var MAX_SAVE = 300000, MAX_FILE = 1024 * 1024;
  var state = { read: null, sum: null, permit: {} };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
  function say(el, msg) { if (KIT.say) KIT.say(el, msg); }
  function save(k, v) { store.set(SK + k, v); }
  function today() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function embedded() { try { return JSON.parse($("alloc-2026").textContent); } catch (e) { return null; } }

  /* ---------- read and summarize ---------- */
  function update() {
    var text = $("csv").value;
    save("csv", text.length <= MAX_SAVE ? text : "");
    state.read = S.readAllocation(text);
    renderParse(state.read, text.length > MAX_SAVE);
    recompute();
  }

  function settings() {
    var st = S.readSettings({ rps: $("rps").value, thr: $("thr").value, fill: $("fill").value });
    $("settings-status").textContent = st.errors.join(" ");
    save("settings", { rps: $("rps").value, thr: $("thr").value, fill: $("fill").value });
    return st;
  }

  function recompute() {
    var st = settings(), r = state.read;
    if (!r || r.error || !r.rows.length) { state.sum = null; $("results").hidden = true; renderMemo(); return; }
    state.sum = S.summarize(r.rows, st);
    $("results").hidden = false;
    renderResults();
    renderMemo();
  }

  function renderParse(r, tooBigToSave) {
    var st = $("parse-status"), det = $("parse-details"), ul = $("parse-notes");
    ul.innerHTML = ""; det.hidden = true;
    if (r.error === "empty") { st.textContent = "No data yet. Load the fictional example or paste your own daily counts."; return; }
    if (r.error) { st.textContent = "Could not use these counts. " + r.error; }
    else {
      var cols = Object.keys(r.columns).map(function (k) { return k + " = " + r.columns[k]; }).join("; ");
      st.textContent = "Read " + r.rows.length + " day" + (r.rows.length === 1 ? "" : "s") + " (" + r.rows[0].date + " to " + r.rows[r.rows.length - 1].date + "). Columns: " + cols + "." +
        (r.ignored.length ? " Not used: " + r.ignored.join(", ") + "." : "") +
        (r.errors.length ? " " + r.errors.length + " row" + (r.errors.length === 1 ? "" : "s") + " skipped." : "") +
        (r.warnings.length ? " " + r.warnings.length + " item" + (r.warnings.length === 1 ? "" : "s") + " to check." : "") +
        (tooBigToSave ? " Too large to remember in this browser; it works for this visit." : "");
    }
    var items = r.errors.map(function (e) { return ["err", e]; }).concat(r.warnings.map(function (w) { return ["warn", w]; }));
    if (!items.length) return;
    var shown = items.slice(0, 60), html = shown.map(function (it) { return '<li class="' + it[0] + '">' + esc(it[1]) + "</li>"; }).join("");
    if (items.length > shown.length) html += "<li>... and " + (items.length - shown.length) + " more. Fix the first ones and paste again.</li>";
    ul.innerHTML = html;
    $("parse-summary").textContent = (r.errors.length ? r.errors.length + " skipped" : "") + (r.errors.length && r.warnings.length ? ", " : "") + (r.warnings.length ? r.warnings.length + " to check" : "") + ": details";
    det.hidden = false;
    if (r.errors.length) det.open = true;
  }

  /* ---------- results ---------- */
  function kpi(big, text, cls) { return '<div class="kpi' + (cls ? " " + cls : "") + '"><b>' + esc(big) + "</b>" + text + "</div>"; }

  function renderResults() {
    var s = state.sum, t = s.turned, h = "";
    h += kpi(S.pctText(s.usedPct, 1), "allocation used: " + esc(S.fmtInt(s.used)) + " of " + esc(S.fmtInt(s.allocation)) + " slots");
    h += kpi(s.atCap + " of " + s.days, "days at the cap (" + s.thr + " or fewer slots left)");
    h += kpi(S.fmtInt(s.unused), "unused slots (" + esc(S.fmtInt(s.unusedBelowCap)) + " on days below the cap)", "green");
    if (s.unusedValue !== null) h += kpi(S.fmtMoney(s.unusedValue), "unused slots at " + esc(S.fmtMoney(s.rps, true)) + " each if every one sold: a ceiling, not a forecast." +
      (s.unusedValueAtFill !== null ? " At a " + esc(s.fill) + "% fill share: " + esc(S.fmtMoney(s.unusedValueAtFill)) + "." : ""), "green");
    else h += kpi("n/a", "value of unused slots: enter a value per slot above", "green");
    if (t.partsPresent) h += kpi(S.fmtInt(t.total), "requests turned away (your estimate): " + esc(S.fmtInt(t.atCap)) + " at the cap, " + esc(S.fmtInt(t.seats)) + " for seats or timing");
    else if (t.present) h += kpi(S.fmtInt(t.total), "requests turned away (your estimate), not split by reason");
    else h += kpi("not in file", "turned-away requests: add a turned_away column, ideally in two parts");
    if (s.noShows.present) h += kpi(S.fmtInt(s.noShows.total), "no-shows, " + esc(S.fmtInt(s.noShows.onCapDays)) + " of them on days at the cap");
    else h += kpi("not in file", "no-shows: add a no_shows column to see slots lost on capped days");
    $("kpis").innerHTML = h;

    var p = S.patterns(s);
    $("facts").innerHTML = p.facts.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
    $("read").innerHTML = p.read.length ? p.read.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") : "<li>Nothing stands out yet.</li>";

    renderHeat();
    renderTables();
  }

  function renderHeat() {
    var s = state.sum, metric = $("metric").value || "used";
    save("metric", metric);
    var max = S.heatMax(s, metric), amber = metric === "unused";
    $("heat").className = "heat" + (amber ? " amber" : "");
    $("legend").className = "legend" + (amber ? " amber" : "");
    var leg = S.heatLegend(metric, max);
    $("legend").innerHTML = leg.map(function (l, i) { return l ? '<li><i class="lv' + i + '" aria-hidden="true"></i>' + esc(l) + "</li>" : ""; }).join("") +
      '<li><i class="none" aria-hidden="true"></i>no days</li>';
    var html = '<div class="row" role="row"><div class="ch" role="columnheader"><span class="visually-hidden">Month</span></div>';
    S.DOW_SHORT.forEach(function (d, i) { html += '<div class="ch" role="columnheader"><abbr title="' + S.DOW[i] + '">' + d + "</abbr></div>"; });
    html += "</div>";
    s.months.forEach(function (m) {
      html += '<div class="row" role="row"><div class="rh" role="rowheader">' + esc(m.short) + "</div>";
      m.cells.forEach(function (c, i) {
        var hc = S.heatCell(c, metric, max);
        if (hc.empty) { html += '<div class="c none" role="cell"><span aria-hidden="true">·</span><span class="visually-hidden">no days</span></div>'; return; }
        var tip = m.name + ", " + S.DOW[i] + "s: " + S.pctText(c.usedPct, 0) + " used, " + c.days + " days, " + S.fmtInt(c.unused) + " unused, " + c.atCap + " at the cap";
        html += '<div class="c lv' + hc.level + '" role="cell" title="' + esc(tip) + '">' + esc(hc.text) + "</div>";
      });
      html += "</div>";
    });
    $("heat").innerHTML = html;

    var tb = "<caption class=\"visually-hidden\">Month by weekday: used %, unused slots and days at the cap</caption><thead><tr><th scope=\"col\">Month</th>";
    S.DOW.forEach(function (d) { tb += '<th scope="col">' + d + "</th>"; });
    tb += "</tr></thead><tbody>";
    s.months.forEach(function (m) {
      tb += '<tr><th scope="row">' + esc(m.label) + "</th>";
      m.cells.forEach(function (c) {
        tb += c.days ? "<td>" + S.pctText(c.usedPct, 0) + " used<br>" + S.fmtInt(c.unused) + " unused<br>" + c.atCap + " of " + c.days + " at cap</td>" : "<td>no days</td>";
      });
      tb += "</tr>";
    });
    $("heat-table").innerHTML = tb + "</tbody>";
  }

  function renderTables() {
    var s = state.sum, t = s.turned;
    var cols = [["Days", "days"], ["Allocation", "allocation"], ["Used", "used"], ["Used %", "pct"], ["Unused", "unused"], ["Days at cap", "atCap"]];
    if (t.partsPresent) cols.push(["Turned away at cap", "turnedAtCap"], ["Turned away, seats or timing", "turnedSeats"]);
    else if (t.present) cols.push(["Turned away", "turned"]);
    if (s.noShows.present) cols.push(["No-shows", "noShows"]);
    function cellv(b, k) { return k === "pct" ? S.pctText(b.usedPct, b.label === "Season" ? 1 : 0) : S.fmtInt(b[k]); }
    function table(first, list, total, withValue) {
      var c = cols.concat(withValue && s.rps !== null ? [["Value of unused", "value"]] : []);
      var h = '<thead><tr><th scope="col">' + first + "</th>" + c.map(function (x) { return '<th scope="col" class="num">' + x[0] + "</th>"; }).join("") + "</tr></thead><tbody>";
      list.concat(total ? [total] : []).forEach(function (b) {
        h += '<tr><th scope="row">' + esc(b.label) + "</th>" + c.map(function (x) {
          var v = x[1] === "value" ? S.fmtMoney(b.unused * s.rps) : cellv(b, x[1]);
          return '<td class="num" data-label="' + esc(x[0]) + '">' + esc(v) + "</td>";
        }).join("") + "</tr>";
      });
      return h + "</tbody>";
    }
    var season = { label: "Season", days: s.days, allocation: s.allocation, used: s.used, usedPct: s.usedPct, unused: s.unused, atCap: s.atCap,
      turned: t.total, turnedAtCap: t.atCap, turnedSeats: t.seats, noShows: s.noShows.total };
    $("t-month").innerHTML = table("Month", s.months, season, true);
    $("t-week").innerHTML = table("Weekday", s.weekdays.filter(function (w) { return w.days; }), null, false);
  }

  /* ---------- memo prompt ---------- */
  function renderMemo() {
    save("capName", $("capName").value); save("facts", $("facts-in").value);
    $("out-memo").textContent = S.memoPrompt(state.sum, { capName: $("capName").value, facts: $("facts-in").value });
  }

  /* ---------- permit check ---------- */
  function renderPermit() {
    var html = "";
    S.PERMIT_ITEMS.forEach(function (it) {
      var v = state.permit[it[0]] || {};
      html += '<li><label class="q"><input type="checkbox" data-pid="' + it[0] + '"' + (v.done ? " checked" : "") + "><span>" + esc(it[1]) + "</span></label>" +
        '<div class="n"><label for="pn-' + it[0] + '">Clause or answer</label><input type="text" id="pn-' + it[0] + '" data-pnote="' + it[0] + '" autocomplete="off" value="' + esc(v.note || "") + '"></div></li>';
    });
    $("permit-list").innerHTML = html;
  }
  function permitChanged(e) {
    var el = e.target, id = el.getAttribute("data-pid") || el.getAttribute("data-pnote");
    if (!id) return;
    var v = state.permit[id] = state.permit[id] || {};
    if (el.type === "checkbox") v.done = el.checked; else v.note = el.value;
    save("permit", state.permit);
  }

  /* ---------- Number 4 ---------- */
  function n4() {
    var r = S.number4($("n4net").value, $("n4slots").value, $("n4used").value);
    save("n4", { net: $("n4net").value, slots: $("n4slots").value, used: $("n4used").value });
    var out = $("n4out");
    if (!$("n4net").value.trim() && !$("n4slots").value.trim()) { out.textContent = ""; return r; }
    out.textContent = r.error ? r.error : "Revenue per allocated slot: " + S.fmtMoney(r.value, true) + "." + (r.usedPct !== null ? " Allocation used: " + S.pctText(r.usedPct, 1) + "." : "");
    return r;
  }

  function loadFile(file, btn) {
    var st = $("parse-status");
    if (!file) return;
    if (file.size > MAX_FILE) { st.textContent = "That file is over 1 MB. Save just the date and count columns and try again."; return; }
    var fr = new FileReader();
    fr.onload = function () { $("csv").value = String(fr.result || ""); update(); say($("loadDemo"), "Read " + file.name + " on this device."); };
    fr.onerror = function () { st.textContent = "Could not read that file."; };
    fr.readAsText(file);
  }

  function restore() {
    var v = store.get(SK + "csv"); if (typeof v === "string") $("csv").value = v;
    var st = store.get(SK + "settings");
    if (st && typeof st === "object") ["rps", "thr", "fill"].forEach(function (k) { if (typeof st[k] === "string") $(k).value = st[k]; });
    var m = store.get(SK + "metric"); if (m === "used" || m === "unused" || m === "cap") $("metric").value = m;
    var c = store.get(SK + "capName"); if (typeof c === "string") $("capName").value = c;
    var f = store.get(SK + "facts"); if (typeof f === "string") $("facts-in").value = f;
    var p = store.get(SK + "permit"); if (p && typeof p === "object") state.permit = p;
    var n = store.get(SK + "n4"); if (n && typeof n === "object") { $("n4net").value = n.net || ""; $("n4slots").value = n.slots || ""; $("n4used").value = n.used || ""; }
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!S) return;
    restore();
    renderPermit();
    $("csv").addEventListener("input", debounce(update, 250));
    $("csv-file").addEventListener("change", function (e) { loadFile(e.target.files && e.target.files[0]); e.target.value = ""; });
    ["rps", "thr", "fill"].forEach(function (id) { $(id).addEventListener("input", recompute); });
    $("metric").addEventListener("change", function () { if (state.sum) renderHeat(); });
    $("capName").addEventListener("input", debounce(renderMemo, 150));
    $("facts-in").addEventListener("input", debounce(renderMemo, 150));
    $("permit-list").addEventListener("change", permitChanged);
    $("permit-list").addEventListener("input", permitChanged);
    ["n4net", "n4slots", "n4used"].forEach(function (id) { $(id).addEventListener("input", n4); });

    document.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("button") : null;
      if (!b || !b.id) return;
      var id = b.id;
      if (id === "loadDemo") {
        var emb = embedded();
        if (!emb || !emb.rows) { say(b, "The fictional data is missing from this page."); return; }
        $("csv").value = S.embedToCSV(emb); update();
        if (!$("capName").value.trim()) { $("capName").value = "Glacier stop: commercial-use allocation of 100 guest visits per day (fictional)"; renderMemo(); }
        say(b, "Fictional 2026 allocation loaded: Channel Light Excursions (FICTIONAL), " + emb.rows.length + " days.");
      } else if (id === "loadMessy") {
        $("csv").value = S.MESSY; update(); say(b, "Messy fictional example loaded. See what the page skipped and why.");
      } else if (id === "csvClear") {
        $("csv").value = ""; update(); say(b, "Cleared.");
      } else if (id === "dlSummary" || id === "dlSummary2") {
        if (!state.sum) { say(b, "Load daily counts first."); return; }
        KIT.download("slot-use-summary.csv", S.summaryCSV(state.sum), "text/csv"); say(b, "Saved slot-use-summary.csv to your downloads.");
      } else if (id === "loadFacts") {
        $("facts-in").value = ((KIT.demo && KIT.demo.facts) || "") + "\n" + ((KIT.demo && KIT.demo.partners) || ""); renderMemo();
        say(b, "Fictional facts loaded. Use your own approved facts.");
      } else if (id === "factsClear") {
        $("facts-in").value = ""; renderMemo(); say(b, "Cleared.");
      } else if (id === "dlPermit" || id === "dlPermit2") {
        KIT.download("permit-check.md", S.permitMarkdown(state.permit, today()), "text/markdown"); say(b, "Saved permit-check.md to your downloads.");
      } else if (id === "permitClear") {
        state.permit = {}; store.del(SK + "permit"); renderPermit(); say(b, "Ticks and notes cleared.");
      } else if (id === "n4demo") {
        $("n4net").value = "1769688"; $("n4slots").value = "15300"; $("n4used").value = "12096"; n4();
        say(b, "Fictional 2026 numbers loaded (Channel Light Excursions, FICTIONAL).");
      } else if (id === "n4use") {
        var r = n4();
        if (r.error) { say(b, r.error); return; }
        $("rps").value = (Math.round(r.value * 100) / 100).toFixed(2); recompute(); say(b, "Value of one slot set to " + S.fmtMoney(r.value, true) + ".");
      } else if (id === "forget") {
        ["csv", "settings", "metric", "capName", "facts", "permit", "n4"].forEach(function (k) { store.del(SK + k); });
        $("csv").value = ""; $("rps").value = String(S.DEFAULTS.rps); $("thr").value = String(S.DEFAULTS.thr); $("fill").value = String(S.DEFAULTS.fill);
        $("metric").value = "used"; $("capName").value = ""; $("facts-in").value = ""; state.permit = {};
        $("n4net").value = ""; $("n4slots").value = ""; $("n4used").value = "";
        renderPermit(); update(); n4(); say(b, "Everything this page saved in this browser is cleared.");
      }
    });

    update();
    n4();
  });
})();
