/* 3b Off-cap product lab: page wiring. Pure logic lives in lab-core.js (window.LabCore).
 * Nothing leaves the browser. localStorage only for convenience (KIT.store wraps it in try/catch).
 */
(function () {
  "use strict";
  var L = window.LabCore;
  var KIT = window.KIT || {};
  var store = KIT.store || { get: function () { return null; }, set: function () { }, del: function () { } };
  var SK = "atiaops:3b:";
  var MAX_SAVE = 300000, MAX_FILE = 1024 * 1024;
  var SET_IDS = ["limit", "satLimit", "heavyPct", "lightPct", "heavyUse", "lightUse"];
  var RULE_IDS = ["w_desirability", "w_feasibility", "w_viability", "w_capIndependence", "minScore", "floor", "minCap"];
  var LONG = { who: 1, resource: 1, avoids: 1, price: 1, risks: 1, test: 1 };
  var state = { mode: "demo", days: [], grid: null, st: null, res: null, rule: null, concepts: [], editing: null, formFrom: null, offerSel: {}, demoDays: [], demoGrid: null };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
  function say(el, msg) { if (KIT.say) KIT.say(el, msg); }
  function save(k, v) { store.set(SK + k, v); }
  function today() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function json(id) { try { return JSON.parse($(id).textContent); } catch (e) { return null; } }
  function uid() { return "c" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }

  /* ---------- calendar ---------- */
  function readSettings() {
    var o = {}; SET_IDS.forEach(function (k) { o[k] = $(k).value; });
    save("settings", o);
    var st = L.readSettings(o);
    $("settings-status").textContent = st.errors.join(" ");
    return st;
  }

  function renderCalendar() {
    state.st = readSettings();
    state.res = L.classify(state.days, state.st, state.grid);
    var r = state.res, c = r.counts;
    $("counts").innerHTML = '<div class="k-light"><b>' + c.light + "</b>light days</div>" + '<div class="k-medium"><b>' + c.medium + "</b>medium</div>" + '<div class="k-heavy"><b>' + c.heavy + "</b>heavy</div>";
    var byDate = {}; r.days.forEach(function (x) { byDate[x.date] = x; });
    var html = "";
    r.months.forEach(function (m) {
      var y = +m.key.slice(0, 4), mo = +m.key.slice(5, 7), n = new Date(Date.UTC(y, mo, 0)).getUTCDate();
      var first = L.dowOf(m.key + "-01");
      html += '<table class="cal"><caption>' + esc(m.label) + " <span>" + m.light + " light · " + m.medium + " medium · " + m.heavy + " heavy</span></caption><thead><tr>";
      L.DOW.forEach(function (d, i) { html += '<th scope="col"><abbr title="' + d + '">' + L.DOW_SHORT[i].slice(0, 2) + "</abbr></th>"; });
      html += "</tr></thead><tbody><tr>";
      var col = 0;
      for (var b = 0; b < first; b++) { html += '<td class="blank"></td>'; col++; }
      for (var d = 1; d <= n; d++) {
        if (col === 7) { html += "</tr><tr>"; col = 0; }
        var iso = m.key + "-" + (d < 10 ? "0" : "") + d, x = byDate[iso];
        if (x) {
          var desc = L.describeDay(x);
          html += '<td class="k-' + x.cls + '" title="' + esc(desc) + '"><span class="d" aria-hidden="true">' + d + '</span><span class="k" aria-hidden="true">' + x.cls.charAt(0).toUpperCase() + '</span><span class="visually-hidden">' + esc(desc) + "</span></td>";
        } else html += '<td class="blank"><span class="d">' + d + '</span><span class="visually-hidden">no schedule</span></td>';
        col++;
      }
      while (col < 7) { html += '<td class="blank"></td>'; col++; }
      html += "</tr></tbody></table>";
    });
    $("cal").innerHTML = html;
    $("light-list").innerHTML = r.months.map(function (m) {
      return "<li><b>" + esc(m.label) + " (" + m.light + "):</b> " + (m.lightDates.length ? esc(m.lightDates.map(L.dayLabel).join(", ")) : "none") + "</li>";
    }).join("");
    var wd = r.weekdays.filter(function (w) { return w.light > 0; }).sort(function (a, b) { return b.light - a.light || a.dow - b.dow; });
    $("light-weekdays").textContent = wd.length ? "Light days by weekday: " + wd.map(function (w) { return w.label + " " + w.light + " of " + w.days; }).join(", ") + "." : "";
    renderPrompts();
  }

  function useDemo() {
    state.mode = "demo"; state.days = state.demoDays; state.grid = state.demoGrid;
    save("mode", "demo");
    $("sched-status").textContent = "Fictional 2027 schedule (invented ship calls, Ship A to Ship J) with fictional 2026 glacier use: Channel Light Excursions (FICTIONAL). " + state.days.length + " days.";
    $("sched-notes").innerHTML = "";
    renderCalendar();
  }

  function useMine(btn, quiet) {
    var text = $("sched").value, notes = [];
    var r = L.readSchedule(text);
    save("sched", text.length <= MAX_SAVE ? text : ""); save("use", $("use").value.length <= MAX_SAVE ? $("use").value : "");
    if (r.error) {
      $("sched-notes").innerHTML = "<li>" + esc(r.error === "empty" ? "Paste or upload a schedule first." : r.error) + "</li>";
      if (!quiet) say(btn, "Could not use that schedule. The calendar still shows the " + (state.mode === "demo" ? "fictional schedule." : "last one that worked."));
      return false;
    }
    var g = L.fillGaps(r.days), grid = null, useNote;
    if ($("use").value.trim()) {
      var u = L.readUse($("use").value);
      if (u.error) useNote = "Last season's counts not used: " + u.error;
      else { grid = L.useGrid(u.rows); useNote = "Last season's counts: " + u.rows.length + " days, used as the second signal."; }
      (u.errors || []).slice(0, 10).forEach(function (e) { notes.push(e); });
    } else useNote = "No last-season counts: days are classified by port load only.";
    state.mode = "mine"; state.days = g.days; state.grid = grid;
    save("mode", "mine");
    r.errors.slice(0, 20).forEach(function (e) { notes.push(e); });
    if (r.errors.length > 20) notes.push("... and " + (r.errors.length - 20) + " more skipped rows.");
    r.warnings.forEach(function (w) { notes.push(w); });
    if (g.filled.length) notes.push(g.filled.length + " date" + (g.filled.length === 1 ? "" : "s") + " between the first and last had no rows (first " + g.filled[0] + ") and count as 0 passengers, no ships. Check that is right.");
    $("sched-notes").innerHTML = notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("");
    $("sched-status").textContent = "Your schedule: " + g.days.length + " days, " + g.days[0].date + " to " + g.days[g.days.length - 1].date + ". " + useNote;
    renderCalendar();
    if (!quiet) say(btn, "Your schedule is in the calendar.");
    return true;
  }

  function readFileInto(input, target, after) {
    var f = input.files && input.files[0];
    if (!f) return;
    if (f.size > MAX_FILE) { $("sched-notes").innerHTML = "<li>That file is over 1 MB. Save only the date and passenger columns and try again.</li>"; input.value = ""; return; }
    var fr = new FileReader();
    fr.onload = function () { $(target).value = String(fr.result || ""); input.value = ""; if (after) after(); };
    fr.onerror = function () { $("sched-notes").innerHTML = "<li>Could not read that file.</li>"; };
    fr.readAsText(f);
  }

  /* ---------- concepts ---------- */
  function buildForm() {
    $("cfields").innerHTML = L.FIELDS.map(function (f) {
      var id = "c-" + f[0];
      return "<div><label for=\"" + id + "\">" + esc(f[1]) + "</label>" + (LONG[f[0]] ? '<textarea id="' + id + '" class="short" data-cf="' + f[0] + '"></textarea>' : '<input type="text" id="' + id + '" data-cf="' + f[0] + '">') + "</div>";
    }).join("");
    $("ex-pick").innerHTML = L.EXAMPLES.map(function (e, i) { return '<option value="' + i + '">' + esc(e.name) + " (fictional)</option>"; }).join("");
    $("crit-help").innerHTML = L.CRITERIA.map(function (c) { return "<li><b>" + esc(c[1]) + ":</b> " + esc(c[2]) + "</li>"; }).join("");
  }
  function formValues() { var v = {}; L.FIELDS.forEach(function (f) { v[f[0]] = $("c-" + f[0]).value; }); return v; }
  function setForm(c) { L.FIELDS.forEach(function (f) { $("c-" + f[0]).value = (c && c[f[0]]) || ""; }); renderPreview(); }
  function renderPreview() {
    var v = formValues(); if (state.formFrom) v.example = true;
    $("card-preview").textContent = L.cardText(v);
    save("form", { values: formValues(), editing: state.editing, from: state.formFrom });
  }
  function saveConcepts() { save("concepts", state.concepts); }
  function find(id) { for (var i = 0; i < state.concepts.length; i++) if (state.concepts[i].id === id) return state.concepts[i]; return null; }
  function decisionOf(c) { return L.score(c.scores, state.rule); }
  function badge(r) { return '<span class="dec ' + r.decision + '">' + (r.decision === "unscored" ? "not scored" : r.decision) + "</span>"; }

  function renderList() {
    var ul = $("clist");
    if (!state.concepts.length) { ul.innerHTML = '<li class="hint">No concepts yet.</li>'; return; }
    ul.innerHTML = state.concepts.map(function (c) {
      var r = decisionOf(c);
      return '<li><div class="top"><h4>' + esc(c.name || "(unnamed)") + (c.example ? ' <span class="hint">(fictional example)</span>' : "") + "</h4> " + badge(r) + "</div>" +
        '<pre tabindex="0" aria-label="Card: ' + esc(c.name) + '">' + esc(L.cardText(c)) + "</pre>" +
        '<div class="btns tight"><button type="button" class="ghost small" data-edit="' + c.id + '">Edit</button><button type="button" class="ghost small" data-copycard="' + c.id + '">Copy card</button><button type="button" class="danger small" data-remove="' + c.id + '">Remove</button></div></li>';
    }).join("");
  }

  function renderGrid() {
    var t = $("grid");
    $("grid-empty").hidden = state.concepts.length > 0;
    if (!state.concepts.length) { t.innerHTML = ""; return; }
    var h = '<thead><tr><th scope="col">Concept</th>' + L.CRITERIA.map(function (c) { return '<th scope="col">' + esc(c[1]) + "</th>"; }).join("") + '<th scope="col" class="num">Weighted</th><th scope="col">Decision</th></tr></thead><tbody>';
    state.concepts.forEach(function (c) {
      var r = decisionOf(c);
      h += '<tr data-row="' + c.id + '"><th scope="row">' + esc(c.name || "(unnamed)") + "</th>";
      L.CRITERIA.forEach(function (k) {
        var v = (c.scores || {})[k[0]], sid = "s-" + c.id + "-" + k[0];
        h += '<td data-label="' + esc(k[1]) + '"><label class="visually-hidden" for="' + sid + '">' + esc(k[1]) + " for " + esc(c.name) + '</label><select id="' + sid + '" data-score="' + c.id + '" data-crit="' + k[0] + '"><option value="">score</option>' +
          [1, 2, 3, 4, 5].map(function (n) { return '<option value="' + n + '"' + (v === n ? " selected" : "") + ">" + n + "</option>"; }).join("") + "</select></td>";
      });
      h += '<td class="num" data-label="Weighted" data-w="' + c.id + '">' + (r.weighted === null ? "n/a" : r.weighted.toFixed(2)) + '</td><td class="r wide" data-label="Decision" data-d="' + c.id + '">' + badge(r) + " " + esc(r.reasons.join("; ")) + "</td></tr>";
    });
    t.innerHTML = h + "</tbody>";
  }
  function refreshRow(id) {
    var c = find(id), r = decisionOf(c);
    var w = document.querySelector('[data-w="' + id + '"]'), d = document.querySelector('[data-d="' + id + '"]');
    if (w) w.textContent = r.weighted === null ? "n/a" : r.weighted.toFixed(2);
    if (d) d.innerHTML = badge(r) + " " + esc(r.reasons.join("; "));
  }

  function readRule() {
    var o = {}; RULE_IDS.forEach(function (k) { o[k] = $(k).value; });
    save("rule", o);
    state.rule = L.readRule(o);
    $("rule-status").textContent = state.rule.errors.join(" ");
    $("rule-text").textContent = "Rule: " + L.ruleText(state.rule);
  }

  /* ---------- prompts ---------- */
  function renderOfferSel() {
    var ul = $("offersel");
    $("offersel-empty").hidden = state.concepts.length > 0;
    ul.innerHTML = state.concepts.map(function (c) {
      var r = decisionOf(c), on = state.offerSel[c.id] !== undefined ? state.offerSel[c.id] : r.decision === "test";
      return '<li><label><input type="checkbox" data-offer="' + c.id + '"' + (on ? " checked" : "") + "> <span>" + esc(c.name || "(unnamed)") + " " + badge(r) + "</span></label></li>";
    }).join("");
  }
  function selectedConcepts() {
    return state.concepts.filter(function (c) {
      var r = decisionOf(c);
      return state.offerSel[c.id] !== undefined ? state.offerSel[c.id] : r.decision === "test";
    });
  }
  function renderPrompts() {
    if (!state.res) return;
    var light = L.lightBlock(state.res, state.st);
    save("cp", { facts: $("cp-facts").value, res: $("cp-res").value, seg: $("cp-seg").value });
    $("out-concepts").textContent = L.conceptsPrompt({ facts: $("cp-facts").value, resources: $("cp-res").value, segments: $("cp-seg").value, light: light });
    var sel = selectedConcepts();
    var o = { minPrice: $("minPrice").value, maxPrice: $("maxPrice").value, lodging: $("lodging").checked, channels: $("channels").value, terms: $("terms").value };
    save("offer", { sel: state.offerSel, minPrice: o.minPrice, maxPrice: o.maxPrice, lodging: o.lodging, channels: o.channels, terms: o.terms });
    var msgs = [], lo = L.num(o.minPrice), hi = L.num(o.maxPrice);
    if ((o.minPrice.trim() && lo === null) || (o.maxPrice.trim() && hi === null)) msgs.push("Prices: enter dollar amounts, for example 159.");
    else if (lo !== null && hi !== null && lo > hi) msgs.push("The minimum price is above the maximum, so the prompt asks the owner for a range instead.");
    if (!o.lodging && sel.some(function (c) { return /lodge/i.test([c.name, c.resource, c.price].join(" ")); })) msgs.push("A ticked concept mentions a lodge. If the offer includes a lodge night, tick the lodge box: the fee rule for short-term lodging applies.");
    $("offer-status").textContent = msgs.join(" ");
    o.concepts = sel.map(L.cardText).join("\n\n");
    o.light = light;
    $("out-offer").textContent = L.offerPrompt(o);
    $("recipe-preview").textContent = L.recipeMarkdown(state.st, today());
  }

  function renderConceptsAll() { renderList(); renderGrid(); renderOfferSel(); renderPrompts(); }

  function lightShare() {
    save("ls", { light: $("ls-light").value, all: $("ls-all").value });
    if (!$("ls-light").value.trim() && !$("ls-all").value.trim()) { $("ls-out").textContent = ""; return; }
    var r = L.lightShare($("ls-light").value, $("ls-all").value);
    $("ls-out").textContent = r.error ? r.error : "Share of bookings on light days: " + L.pctText(r.value, 1) + ".";
  }

  function cardsText() {
    return "Concept cards (ATIA Operations Kit 3b). DRAFT - PENDING OWNER REVIEW.\nRule: " + L.ruleText(state.rule) + "\n\n" +
      state.concepts.map(function (c) { var r = decisionOf(c); return L.cardText(c) + "\nDecision: " + r.decision + (r.weighted === null ? "" : " (weighted " + r.weighted.toFixed(2) + ")") + ". " + r.reasons.join("; ") + "."; }).join("\n\n") + "\n";
  }

  /* ---------- restore ---------- */
  function restore() {
    var s = store.get(SK + "settings"); if (s && typeof s === "object") SET_IDS.forEach(function (k) { if (typeof s[k] === "string") $(k).value = s[k]; });
    var r = store.get(SK + "rule"); if (r && typeof r === "object") RULE_IDS.forEach(function (k) { if (typeof r[k] === "string") $(k).value = r[k]; });
    var cp = store.get(SK + "cp"); if (cp && typeof cp === "object") { $("cp-facts").value = cp.facts || ""; $("cp-res").value = cp.res || ""; $("cp-seg").value = cp.seg || ""; }
    var cs = store.get(SK + "concepts"); if (Array.isArray(cs)) state.concepts = cs.filter(function (c) { return c && typeof c === "object" && c.id; });
    var of = store.get(SK + "offer");
    if (of && typeof of === "object") {
      state.offerSel = of.sel && typeof of.sel === "object" ? of.sel : {};
      ["minPrice", "maxPrice", "channels", "terms"].forEach(function (k) { if (typeof of[k] === "string") $(k).value = of[k]; });
      $("lodging").checked = !!of.lodging;
    }
    var f = store.get(SK + "form");
    if (f && typeof f === "object" && f.values) { setForm(f.values); state.editing = f.editing && find(f.editing) ? f.editing : null; state.formFrom = f.from || null; }
    var ls = store.get(SK + "ls"); if (ls && typeof ls === "object") { $("ls-light").value = ls.light || ""; $("ls-all").value = ls.all || ""; }
    var sc = store.get(SK + "sched"); if (typeof sc === "string") $("sched").value = sc;
    var us = store.get(SK + "use"); if (typeof us === "string") $("use").value = us;
    $("cSave").textContent = state.editing ? "Save changes" : "Add to my concepts";
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!L) return;
    var port = json("port-2027"), use = json("use-2026");
    state.demoDays = port && port.rows ? L.daysFromEmbed(port) : [];
    state.demoGrid = use && use.rows ? L.useGrid(L.useFromEmbed(use)) : null;
    buildForm();
    restore();
    readRule();
    if (store.get(SK + "mode") === "mine" && $("sched").value.trim() && useMine(null, true)) { /* own schedule restored */ }
    else useDemo();
    renderPreview();
    renderConceptsAll();
    lightShare();

    SET_IDS.forEach(function (id) { $(id).addEventListener("input", debounce(renderCalendar, 150)); });
    RULE_IDS.forEach(function (id) { $(id).addEventListener("input", debounce(function () { readRule(); renderConceptsAll(); }, 150)); });
    ["cp-facts", "cp-res", "cp-seg", "minPrice", "maxPrice", "channels", "terms"].forEach(function (id) { $(id).addEventListener("input", debounce(renderPrompts, 150)); });
    $("lodging").addEventListener("change", renderPrompts);
    $("cform").addEventListener("input", renderPreview);
    $("cform").addEventListener("submit", function (e) { e.preventDefault(); });
    $("sched-file").addEventListener("change", function () { readFileInto($("sched-file"), "sched", function () { useMine($("useMine")); }); });
    $("use-file").addEventListener("change", function () { readFileInto($("use-file"), "use", function () { say($("useMine"), "Counts loaded. Press \"Use my schedule\" to apply them."); }); });
    ["ls-light", "ls-all"].forEach(function (id) { $(id).addEventListener("input", lightShare); });

    document.addEventListener("change", function (e) {
      var el = e.target;
      if (el.matches && el.matches("select[data-score]")) {
        var c = find(el.getAttribute("data-score")); if (!c) return;
        c.scores = c.scores || {};
        if (el.value) c.scores[el.getAttribute("data-crit")] = parseInt(el.value, 10); else delete c.scores[el.getAttribute("data-crit")];
        saveConcepts(); refreshRow(c.id); renderList(); renderOfferSel(); renderPrompts();
      } else if (el.matches && el.matches("input[data-offer]")) {
        state.offerSel[el.getAttribute("data-offer")] = el.checked; renderPrompts();
      }
    });

    document.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("button") : null;
      if (!b) return;
      var id = b.id;
      if (b.hasAttribute("data-edit")) {
        var c = find(b.getAttribute("data-edit")); if (!c) return;
        state.editing = c.id; state.formFrom = null; setForm(c); $("cSave").textContent = "Save changes";
        $("c-name").focus(); say($("cSave"), "Editing \"" + (c.name || "(unnamed)") + "\". Save changes when done.");
      } else if (b.hasAttribute("data-remove")) {
        var rid = b.getAttribute("data-remove"), rc = find(rid);
        state.concepts = state.concepts.filter(function (x) { return x.id !== rid; });
        delete state.offerSel[rid];
        if (state.editing === rid) { state.editing = null; $("cSave").textContent = "Add to my concepts"; }
        saveConcepts(); renderConceptsAll(); say($("cSave"), "Removed \"" + ((rc && rc.name) || "(unnamed)") + "\".");
      } else if (b.hasAttribute("data-copycard")) {
        var cc = find(b.getAttribute("data-copycard")); if (cc && KIT.copy) KIT.copy(L.cardText(cc), b, "Card copied.");
      } else if (id === "exLoad") {
        var ex = L.EXAMPLES[+$("ex-pick").value];
        state.editing = null; state.formFrom = ex.id; setForm(ex); $("cSave").textContent = "Add to my concepts";
        say(b, "Fictional example loaded into the form. Edit it, then add it to your concepts.");
      } else if (id === "exAll") {
        var added = 0;
        L.EXAMPLES.forEach(function (x) {
          if (state.concepts.some(function (c) { return c.from === x.id; })) return;
          var copy = JSON.parse(JSON.stringify(x)); copy.from = x.id; copy.id = uid(); state.concepts.push(copy); added++;
        });
        saveConcepts(); renderConceptsAll();
        say(b, added ? added + " fictional examples added, with fictional teaching scores. Re-score them as if they were yours." : "The four fictional examples are already in your concepts.");
      } else if (id === "cSave") {
        var v = formValues();
        if (!v.name.trim()) { say(b, "Give the concept a name first."); $("c-name").focus(); return; }
        if (state.editing && find(state.editing)) {
          var ed = find(state.editing); L.FIELDS.forEach(function (f) { ed[f[0]] = v[f[0]]; });
          say(b, "Saved \"" + v.name.trim() + "\".");
        } else {
          var nc = v; nc.id = uid(); nc.scores = {};
          var src = state.formFrom ? L.EXAMPLES.filter(function (x) { return x.id === state.formFrom; })[0] : null;
          if (src) { nc.example = true; nc.from = src.id; nc.scores = JSON.parse(JSON.stringify(src.scores)); }
          state.concepts.push(nc);
          say(b, "Added \"" + v.name.trim() + "\". Score it under Kill or test.");
        }
        state.editing = null; state.formFrom = null; setForm({}); b.textContent = "Add to my concepts";
        saveConcepts(); renderConceptsAll();
      } else if (id === "cReset") {
        state.editing = null; state.formFrom = null; setForm({}); $("cSave").textContent = "Add to my concepts"; say(b, "Form cleared.");
      } else if (id === "cpDemo") {
        $("cp-facts").value = ((KIT.demo && KIT.demo.facts) || "") + "\n" + ((KIT.demo && KIT.demo.partners) || "");
        $("cp-res").value = L.DEMO_INPUTS.resources; $("cp-seg").value = L.DEMO_INPUTS.segments; renderPrompts();
        say(b, "Fictional inputs loaded (Channel Light Excursions, FICTIONAL). Use your own approved facts.");
      } else if (id === "cpClear") {
        $("cp-facts").value = ""; $("cp-res").value = ""; $("cp-seg").value = ""; renderPrompts(); say(b, "Cleared.");
      } else if (id === "useMine") {
        useMine(b);
      } else if (id === "useDemo") {
        useDemo(); say(b, "Back to the fictional 2027 schedule.");
      } else if (id === "dlCal" || id === "dlCal2") {
        KIT.download("light-day-calendar.csv", L.calendarCSV(state.res), "text/csv"); say(b, "Saved light-day-calendar.csv to your downloads.");
      } else if (id === "dlScores" || id === "dlScores2") {
        if (!state.concepts.length) { say(b, "No concepts to save yet."); return; }
        KIT.download("kill-or-test-scores.csv", L.scoresCSV(state.concepts, state.rule), "text/csv"); say(b, "Saved kill-or-test-scores.csv to your downloads.");
      } else if (id === "dlCards") {
        if (!state.concepts.length) { say(b, "No concepts to save yet."); return; }
        KIT.download("concept-cards.txt", cardsText(), "text/plain"); say(b, "Saved concept-cards.txt to your downloads.");
      } else if (id === "dlRecipe" || id === "dlRecipe2") {
        KIT.download("light-day-refresh-recipe.md", L.recipeMarkdown(state.st, today()), "text/markdown"); say(b, "Saved light-day-refresh-recipe.md to your downloads.");
      } else if (id === "forget") {
        ["settings", "mode", "sched", "use", "cp", "concepts", "rule", "offer", "form", "ls"].forEach(function (k) { store.del(SK + k); });
        var D = L.DEFAULTS, R = L.RULE_DEFAULTS;
        SET_IDS.forEach(function (k) { $(k).value = String(D[k]); });
        RULE_IDS.forEach(function (k) { $(k).value = String(R[k]); });
        ["cp-facts", "cp-res", "cp-seg", "minPrice", "maxPrice", "channels", "terms", "sched", "use", "ls-light", "ls-all"].forEach(function (k) { $(k).value = ""; });
        $("lodging").checked = false;
        state.concepts = []; state.offerSel = {}; state.editing = null; state.formFrom = null; setForm({}); $("cSave").textContent = "Add to my concepts";
        readRule(); useDemo(); renderConceptsAll(); lightShare();
        say(b, "Everything this page saved in this browser is cleared.");
      }
    });
  });
})();
