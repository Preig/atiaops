/* 2a Journey FMEA and disruption playbook: page wiring. Pure logic lives in fmea-core.js (window.FMEA).
 * Nothing leaves the browser. Entries are remembered in this browser only (localStorage, via KIT.store).
 */
(function () {
  "use strict";
  var F = window.FMEA, KIT = window.KIT;
  var KEY = "atiaops:2a:";
  var state = { rows: [], policy: {}, gh: {}, sel: null, business: "" };
  var undo = null;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n) { return "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function save() {
    KIT.store.set(KEY + "rows", state.rows);
    KIT.store.set(KEY + "policy", state.policy);
    KIT.store.set(KEY + "gh", state.gh);
    KIT.store.set(KEY + "sel", state.sel);
    KIT.store.set(KEY + "business", state.business);
  }
  function status(id, msg) {
    var b = $(id);
    if (!b) return;
    b.textContent = msg;
    clearTimeout(b._t);
    b._t = setTimeout(function () { b.textContent = ""; }, 8000);
  }
  var timers = {};
  function later(name, fn, ms) { clearTimeout(timers[name]); timers[name] = setTimeout(fn, ms || 200); }

  /* ---------- static content from the core ---------- */
  function renderStatic() {
    ["S", "O", "D"].forEach(function (dim) {
      var tb = document.querySelector("#scale-" + dim + " tbody");
      tb.innerHTML = F.SCALES[dim].map(function (r) {
        return "<tr><td>" + r[0] + "</td><td>" + esc(r[1]) + "</td><td>" + esc(r[2]) + "</td></tr>";
      }).join("");
    });
    var max = Math.max.apply(null, F.LOG_2026.map(function (c) { return c.lost; }));
    $("cause-bars").innerHTML = F.LOG_2026.map(function (c) {
      var pct = Math.round(100 * c.lost / max);
      return '<li><span class="bt"><span>' + esc(c.cause) + "</span><b>" + money(c.lost) + '</b></span><span class="bar" style="width:' + pct + '%" aria-hidden="true"></span></li>';
    }).join("");
    $("cause-table").innerHTML = F.LOG_2026.map(function (c) {
      return "<tr><td>" + esc(c.cause) + '</td><td class="num">' + c.events + '</td><td class="num">' + c.guests + '</td><td class="num">' + c.recovered + '</td><td class="num">' + money(c.lost) + "</td></tr>";
    }).join("");
    $("ex-polished").textContent = F.EXAMPLES.polished;
    $("ex-grounded").textContent = F.EXAMPLES.grounded;
    $("ex-problems").innerHTML = F.EXAMPLES.problems.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("");
  }

  /* ---------- FMEA editor ---------- */
  var DIMS = { severity: "S", occurrence: "O", detection: "D", new_severity: "S", new_occurrence: "O", new_detection: "D" };
  function scoreSelect(rid, key, val, labelText) {
    var dim = DIMS[key], id = "r-" + rid + "-" + key;
    var opts = '<option value="">Not scored</option>';
    for (var n = 1; n <= 10; n++) {
      var t = F.SCALES[dim].filter(function (x) { return x[0] === n; })[0];
      opts += '<option value="' + n + '"' + (String(val) === String(n) ? " selected" : "") + ">" + n + ": " + esc(t[1]) + "</option>";
    }
    return '<div><label for="' + id + '">' + labelText + "</label>" +
      '<select id="' + id + '" data-k="' + key + '" aria-describedby="' + id + '-h">' + opts + "</select>" +
      '<span class="hint" id="' + id + '-h">' + esc(F.scaleText(dim, val)) + "</span></div>";
  }
  function field(rid, key, label, val, kind) {
    var id = "r-" + rid + "-" + key;
    var input = kind === "area"
      ? '<textarea id="' + id + '" data-k="' + key + '" class="short">' + esc(val) + "</textarea>"
      : '<input type="text" id="' + id + '" data-k="' + key + '" value="' + esc(val) + '" autocomplete="off">';
    return '<div><label for="' + id + '">' + label + "</label>" + input + "</div>";
  }
  function rowEl(r) {
    var d = document.createElement("details");
    d.className = "frow";
    d.dataset.id = r.id;
    var rid = esc(r.id);
    d.innerHTML =
      '<summary><span class="rk"></span><span class="fm"></span><span class="rpnbox"></span><span class="flags"></span></summary>' +
      '<div class="fbody">' +
      '<div class="fgrid">' + field(rid, "journey_step", "Journey step", r.journey_step) + field(rid, "failure_mode", "Failure mode", r.failure_mode) + "</div>" +
      '<div class="fgrid">' + field(rid, "effect", "Effect on the guest and the business", r.effect, "area") + field(rid, "cause", "Causes", r.cause, "area") + "</div>" +
      '<div class="fgrid">' + field(rid, "current_controls", "Current controls (how you find out today)", r.current_controls, "area") + field(rid, "occurrence_note", "Where the occurrence score came from <small>(your log, or a team estimate)</small>", r.occurrence_note) + "</div>" +
      '<div class="sod">' + scoreSelect(rid, "severity", r.severity, "Severity (S)") + scoreSelect(rid, "occurrence", r.occurrence, "Occurrence (O)") + scoreSelect(rid, "detection", r.detection, "Detection (D)") + "</div>" +
      '<div class="fgrid">' + field(rid, "action", "Countermeasure (recommended action)", r.action, "area") +
      "<div>" + field(rid, "owner_role", "Owner <small>(a role, not a name)</small>", r.owner_role) + field(rid, "due", "Due", r.due) + "</div></div>" +
      '<div class="after"><h4>After the countermeasure is in place: re-score</h4>' +
      '<div class="sod">' + scoreSelect(rid, "new_severity", r.new_severity, "New S") + scoreSelect(rid, "new_occurrence", r.new_occurrence, "New O") + scoreSelect(rid, "new_detection", r.new_detection, "New D") + "</div>" +
      '<p class="hint newrpn"></p></div>' +
      '<ul class="chk issues" aria-label="Checks on this row"></ul>' +
      '<div class="btns"><button type="button" class="danger small" data-remove="' + rid + '">Remove this row</button></div>' +
      "</div>";
    return d;
  }
  function renderEditor(openId) {
    var host = $("fmea-rows");
    host.innerHTML = "";
    if (!state.rows.length) host.innerHTML = '<p class="hint">No rows yet. Load the fictional example or add a row.</p>';
    state.rows.forEach(function (r) {
      var el = rowEl(r);
      if (openId && r.id === openId) el.open = true;
      host.appendChild(el);
    });
    updateDerived();
  }
  function findRow(id) { for (var i = 0; i < state.rows.length; i++) if (state.rows[i].id === id) return state.rows[i]; return null; }

  function flagsHtml(x) {
    var h = "";
    if (x.severe) h += '<span class="flag sev">Severity ' + x.s + "</span> ";
    if (x.top) h += '<span class="flag top">Top 5</span> ';
    if (x.rpn === null) h += '<span class="flag none">Not scored</span>';
    return h;
  }
  function updateDerived() {
    var ranked = F.rank(state.rows);
    var byId = {};
    ranked.forEach(function (x) { byId[x.row.id] = x; });
    /* ranked table */
    $("ranked-rows").innerHTML = ranked.length ? ranked.map(function (x) {
      var after = x.newRpn === null ? "" : String(x.newRpn);
      return "<tr>" +
        '<td class="num rk-c" data-label="Rank">' + (x.rank === null ? "" : x.rank) + "</td>" +
        '<td class="fm-c" data-label="Failure mode">' + esc(x.row.failure_mode || "(no name)") + "</td>" +
        '<td class="num sod-c" data-label="S">' + (x.s === null ? "" : x.s) + "</td>" +
        '<td class="num sod-c" data-label="O">' + (x.o === null ? "" : x.o) + "</td>" +
        '<td class="num sod-c" data-label="D">' + (x.d === null ? "" : x.d) + "</td>" +
        '<td class="num sod-c" data-label="RPN"><b>' + (x.rpn === null ? "" : x.rpn) + "</b></td>" +
        '<td data-label="Flag">' + flagsHtml(x) + "</td>" +
        '<td class="num after-c' + (after ? "" : " empty") + '" data-label="RPN after">' + esc(after) + "</td></tr>";
    }).join("") : '<tr><td colspan="8">No rows.</td></tr>';
    var acts = ranked.filter(function (x) { return x.top || x.severe; });
    var sev = ranked.filter(function (x) { return x.severe; });
    var sevOutside = sev.filter(function (x) { return !x.top; });
    var unscored = ranked.filter(function (x) { return x.rpn === null; }).length;
    var sum = state.rows.length + " row" + (state.rows.length === 1 ? "" : "s") + ". Action list: " + acts.length + " (top five by RPN" + (sevOutside.length ? ", plus " + sevOutside.length + " with severity 9 or 10 outside the top five" : "") + ").";
    if (unscored) sum += " " + unscored + " not scored yet.";
    $("ranked-sum").textContent = sum;
    /* row summaries and checks */
    Array.prototype.forEach.call(document.querySelectorAll("#fmea-rows .frow"), function (el) {
      var x = byId[el.dataset.id];
      if (!x) return;
      el.classList.toggle("severe", x.severe);
      el.classList.toggle("top", x.top && !x.severe);
      el.querySelector(".rk").textContent = x.rank === null ? "#" : "#" + x.rank;
      el.querySelector(".fm").textContent = x.row.failure_mode || "(new row)";
      el.querySelector(".rpnbox").textContent = x.rpn === null ? "RPN not scored" : "RPN " + x.rpn;
      el.querySelector(".flags").innerHTML = flagsHtml(x);
      var nr = el.querySelector(".newrpn");
      nr.textContent = x.newRpn === null ? "New RPN appears when all three new scores are set." : "New RPN " + x.newRpn + (x.rpn !== null ? " (was " + x.rpn + ")" : "") + ".";
      var issues = F.rowIssues(x.row, x);
      el.querySelector(".issues").innerHTML = issues.map(function (i) {
        return '<li class="' + i.level + '"><span class="tag">' + (i.level === "bad" ? "Fix" : i.level === "warn" ? "Check" : "Note") + "</span>" + esc(i.text) + "</li>";
      }).join("");
    });
    later("pack", renderPack, 250);
  }

  function wireEditor() {
    var host = $("fmea-rows");
    function onEdit(e) {
      var t = e.target, k = t.dataset && t.dataset.k;
      if (!k) return;
      var el = t.closest(".frow"), r = el && findRow(el.dataset.id);
      if (!r) return;
      r[k] = t.value;
      if (DIMS[k]) { var h = $(t.id + "-h"); if (h) h.textContent = F.scaleText(DIMS[k], t.value); }
      save();
      updateDerived();
    }
    host.addEventListener("input", onEdit);
    host.addEventListener("change", onEdit);
    host.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-remove]");
      if (!b) return;
      var id = b.dataset.remove, idx = -1;
      state.rows.forEach(function (r, i) { if (r.id === id) idx = i; });
      if (idx < 0) return;
      undo = { row: state.rows[idx], index: idx };
      state.rows.splice(idx, 1);
      save();
      renderEditor();
      var st = $("st-fmea");
      st.innerHTML = "Row removed. <button type=\"button\" class=\"ghost small\" id=\"fmea-undo\">Undo</button>";
      clearTimeout(st._t);
      st._t = setTimeout(function () { st.textContent = ""; }, 12000);
    });
    $("st-fmea").addEventListener("click", function (e) {
      if (e.target.id !== "fmea-undo" || !undo) return;
      state.rows.splice(Math.min(undo.index, state.rows.length), 0, undo.row);
      var id = undo.row.id;
      undo = null;
      save();
      renderEditor(id);
      status("st-fmea", "Row restored.");
    });
    $("fmea-add").addEventListener("click", function () {
      var r = F.blankRow(F.nextId(state.rows));
      state.rows.push(r);
      save();
      renderEditor(r.id);
      var inp = $("r-" + r.id + "-failure_mode");
      if (inp) inp.focus();
      status("st-fmea", "Row added at the end. Name the failure mode, then score it.");
    });
    $("fmea-demo").addEventListener("click", function () {
      state.rows = F.demoRows();
      save();
      renderEditor();
      status("st-fmea", "Fictional example loaded. Replace it with your own route and scores.");
    });
    $("fmea-sort").addEventListener("click", function () {
      state.rows = F.rank(state.rows).map(function (x) { return x.row; });
      save();
      renderEditor();
      status("st-fmea", "Rows sorted by RPN. Unscored rows are at the end.");
    });
    $("fmea-clear").addEventListener("click", function () {
      undo = null;
      state.rows = [];
      save();
      renderEditor();
      status("st-fmea", "All rows cleared. Add your own, or load the fictional example.");
    });
    $("fmea-csv").addEventListener("click", function () {
      KIT.download("journey-fmea.csv", F.rowsToCSV(state.rows), "text/csv");
      status("st-fmea-io", "Saved journey-fmea.csv to your downloads.");
    });
    $("fmea-import").addEventListener("change", function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        var res = F.rowsFromCSV(String(rd.result || ""));
        if (!res.rows.length) { status("st-fmea-io", res.error || "No rows found in that file."); return; }
        state.rows = res.rows;
        save();
        renderEditor();
        status("st-fmea-io", "Imported " + res.rows.length + " rows." + (res.error ? " " + res.error : ""));
      };
      rd.onerror = function () { status("st-fmea-io", "Could not read that file."); };
      rd.readAsText(f);
      e.target.value = "";
    });
  }

  /* ---------- policy check ---------- */
  var LBL = { policy: '<span class="lbl">Policy choice</span>', contract: '<span class="lbl contract">Contractual</span>', rec: '<span class="lbl">Recommendation</span>', legal: '<span class="lbl legal">Legal mandate</span>' };
  function renderPolicyForm() {
    $("pol-form").innerHTML = F.POLICY_ITEMS.map(function (it) {
      var id = "pol-" + it.key, v = state.policy[it.key] || "";
      var input = it.kind === "minutes"
        ? '<input type="number" id="' + id + '" name="' + it.key + '" min="0" step="1" inputmode="numeric" value="' + esc(v) + '" aria-describedby="' + id + '-h ' + id + '-s">'
        : '<textarea id="' + id + '" name="' + it.key + '" class="short" aria-describedby="' + id + '-h ' + id + '-s">' + esc(v) + "</textarea>";
      return '<div class="pq"><label for="' + id + '">' + esc(it.q) + " " + LBL[it.label] + "</label>" +
        '<span class="hint" id="' + id + '-h">' + esc(it.hint) + "</span>" + input +
        '<p class="st" id="' + id + '-s" aria-live="polite"></p></div>';
    }).join("");
    updatePolicy();
  }
  function updatePolicy() {
    var chk = F.policyCheck(state.policy);
    chk.items.forEach(function (it) {
      var el = $("pol-" + it.key + "-s");
      if (!el) return;
      el.className = "st " + it.status;
      el.textContent = it.status === "ok" ? "Decided." : it.status === "gap" ? "Decide before May." : it.text;
    });
    $("pol-score").textContent = chk.decided + " of " + chk.total;
    $("pol-gaps").innerHTML = chk.gaps.length ? chk.gaps.map(function (g) {
      return '<li class="' + (g.status === "bad" ? "bad" : "gap") + '"><span class="tag">' + (g.status === "bad" ? "Fix" : "Decide") + "</span>" + esc(g.q) + (g.status === "bad" ? ": " + esc(g.text) : "") + "</li>";
    }).join("") : '<li class="ok"><span class="tag">Done</span>Every decision on the list is made. Review them with the team once a season.</li>';
    $("pol-sheet").textContent = "DISRUPTION POLICY SHEET: " + (state.business || "[FILL: business name]") + "\n" + F.policySheet(state.policy);
    later("pack", renderPack, 250);
  }
  function wirePolicy() {
    function onEdit(e) {
      var t = e.target;
      if (!t.name) return;
      state.policy[t.name] = t.value;
      save();
      updatePolicy();
    }
    $("pol-form").addEventListener("input", onEdit);
    $("pol-form").addEventListener("change", onEdit);
    $("pol-demo").addEventListener("click", function () {
      state.policy = Object.assign({}, F.DEMO_POLICY);
      save();
      renderPolicyForm();
      status("st-pol", "Fictional answers loaded, with six gaps left on purpose.");
    });
    $("pol-clear").addEventListener("click", function () {
      state.policy = {};
      save();
      renderPolicyForm();
      status("st-pol", "Cleared.");
    });
  }

  /* ---------- message pack ---------- */
  function selectedIds() {
    if (state.sel === null) return F.actionList(state.rows).map(function (x) { return x.row.id; });
    var ids = state.rows.map(function (r) { return r.id; });
    return state.sel.filter(function (id) { return ids.indexOf(id) >= 0; });
  }
  function promptsFor() {
    var ids = selectedIds();
    return F.rank(state.rows).filter(function (x) { return ids.indexOf(x.row.id) >= 0; }).map(function (x) {
      return { id: x.row.id, name: x.row.failure_mode || x.row.id, text: F.messagePrompt(x.row, state.policy, { business: state.business }) };
    });
  }
  function renderPack() {
    var ids = selectedIds();
    var ranked = F.rank(state.rows);
    $("pack-scen").innerHTML = ranked.length ? ranked.map(function (x) {
      var id = "sc-" + esc(x.row.id);
      return '<li><label for="' + id + '"><input type="checkbox" id="' + id + '" value="' + esc(x.row.id) + '"' + (ids.indexOf(x.row.id) >= 0 ? " checked" : "") + "> <span>" +
        esc(x.row.failure_mode || x.row.id) + ' <span class="hint">(' + (x.rpn === null ? "not scored" : "RPN " + x.rpn) + (x.severe ? ", severity " + x.s : "") + ")</span></span></label></li>";
    }).join("") : '<li class="hint">No FMEA rows yet.</li>';
    var gaps = F.policyCheck(state.policy).gaps.length;
    $("pack-gapnote").textContent = gaps ? "Your policy sheet has " + gaps + " open item" + (gaps === 1 ? "" : "s") + ". Each goes into the prompts as [FILL], so the AI asks instead of guessing. Decide them first for better drafts." : "Your policy sheet is complete.";
    var host = $("pack-out"), open = {};
    Array.prototype.forEach.call(host.querySelectorAll("details.prompt"), function (d) { open[d.dataset.id] = d.open; });
    var list = promptsFor();
    host.innerHTML = list.length ? "" : '<p class="hint">Select at least one scenario.</p>';
    list.forEach(function (p, i) {
      var d = document.createElement("details");
      d.className = "prompt";
      d.dataset.id = p.id;
      d.open = p.id in open ? open[p.id] : i === 0;
      var pid = "pk-" + p.id;
      d.innerHTML = "<summary>Prompt " + (i + 1) + ": " + esc(p.name) + '</summary><div class="pbody"><div class="output"><p class="label">Message pack prompt</p><pre id="' + esc(pid) + '" tabindex="0"></pre></div>' +
        '<div><div class="btns"><button type="button" data-copy="' + esc(pid) + '">Copy this prompt</button></div><p class="status" role="status" aria-live="polite"></p></div></div>';
      d.querySelector("pre").textContent = p.text;
      host.appendChild(d);
    });
  }
  function allPromptsText() {
    var list = promptsFor();
    if (!list.length) return "";
    return list.map(function (p, i) { return "PROMPT " + (i + 1) + " OF " + list.length + ": " + p.name + "\n\n" + p.text; }).join("\n\n==========\n\n") + "\n";
  }
  function wirePack() {
    $("pack-business").addEventListener("input", function (e) {
      state.business = e.target.value;
      save();
      updatePolicy();
    });
    $("pack-scen").addEventListener("change", function () {
      state.sel = Array.prototype.map.call(document.querySelectorAll("#pack-scen input:checked"), function (i) { return i.value; });
      save();
      renderPack();
    });
    $("pack-actionlist").addEventListener("click", function () { state.sel = null; save(); renderPack(); status("st-pack-sel", "Action list selected."); });
    $("pack-none").addEventListener("click", function () { state.sel = []; save(); renderPack(); status("st-pack-sel", "No scenarios selected."); });
    $("pack-copyall").addEventListener("click", function (e) {
      var t = allPromptsText();
      if (!t) { status("st-pack", "Select at least one scenario first."); return; }
      KIT.copy(t, e.target, "Copied " + promptsFor().length + " prompts. Paste one at a time into your AI tool.");
    });
    $("pack-save").addEventListener("click", function () {
      var t = allPromptsText();
      if (!t) { status("st-pack", "Select at least one scenario first."); return; }
      KIT.download("message-pack-prompts.txt", t, "text/plain");
      status("st-pack", "Saved message-pack-prompts.txt to your downloads.");
    });
    $("dl-pack").addEventListener("click", function () { $("pack-save").click(); status("st-files", "Saved message-pack-prompts.txt to your downloads."); });
  }

  /* ---------- draft checker ---------- */
  function allowedText() { return F.policySheet(state.policy) + "\n" + (state.business || ""); }
  function runCheck() {
    var res = F.checkDraft($("draft").value, allowedText());
    $("draft-results").innerHTML = res.items.map(function (i) {
      var tag = i.level === "bad" ? "Fix" : i.level === "warn" ? "Check" : i.level === "ok" ? "OK" : "Note";
      return '<li class="' + i.level + '"><span class="tag">' + tag + "</span>" + esc(i.text) + "</li>";
    }).join("");
    status("st-draft", res.bad ? res.bad + " item" + (res.bad === 1 ? "" : "s") + " to fix before this draft is approved." : "No hard flags. A person still reads it against the policy sheet.");
  }
  function wireChecker() {
    $("draft-check").addEventListener("click", runCheck);
    $("draft-polished").addEventListener("click", function () { $("draft").value = F.EXAMPLES.polished; runCheck(); });
    $("draft-grounded").addEventListener("click", function () { $("draft").value = F.EXAMPLES.grounded; runCheck(); });
    $("draft-clear").addEventListener("click", function () { $("draft").value = ""; $("draft-results").innerHTML = ""; status("st-draft", "Cleared."); });
  }

  /* ---------- getting here ---------- */
  var GH_AREA = { meeting_point: 1, from_docks: 1, tender: 1, flying_in: 1, ship_late: 1, running_late: 1, weather: 1, transfer: 1 };
  var GH_NUM = { check_in: 1, buffer: 1 };
  function renderGhForm() {
    $("gh-form").innerHTML = F.GH_FIELDS.map(function (f) {
      var id = "gh-" + f[0], v = state.gh[f[0]] || "";
      var input = GH_AREA[f[0]] ? '<textarea id="' + id + '" name="' + f[0] + '" class="short">' + esc(v) + "</textarea>"
        : GH_NUM[f[0]] ? '<input type="number" id="' + id + '" name="' + f[0] + '" min="0" step="1" inputmode="numeric" value="' + esc(v) + '">'
        : '<input type="text" id="' + id + '" name="' + f[0] + '" value="' + esc(v) + '" autocomplete="off">';
      return '<div><label for="' + id + '">' + esc(f[1]) + "</label>" + input + "</div>";
    }).join("");
    updateGh();
  }
  function updateGh() {
    var res = F.gettingHere(state.gh);
    $("gh-out").textContent = res.text;
    $("gh-gaps").textContent = res.gaps.length ? res.gaps.length + " gap" + (res.gaps.length === 1 ? "" : "s") + " marked [FILL]: " + res.gaps.join("; ") + "." : "No gaps. The owner reads it once more before it goes live.";
    $("gh-prompt").textContent = F.gettingHerePrompt(res.text);
  }
  function wireGh() {
    function onEdit(e) { if (!e.target.name) return; state.gh[e.target.name] = e.target.value; save(); updateGh(); }
    $("gh-form").addEventListener("input", onEdit);
    $("gh-form").addEventListener("change", onEdit);
    $("gh-demo").addEventListener("click", function () { state.gh = Object.assign({}, F.DEMO_GH); save(); renderGhForm(); status("st-gh", "Fictional example loaded, with gaps left on purpose."); });
    $("gh-clear").addEventListener("click", function () { state.gh = {}; save(); renderGhForm(); status("st-gh", "Cleared."); });
  }

  /* ---------- measure ---------- */
  function updateMeasure() {
    var g = $("m-guests").value, r = $("m-rec").value, m = F.parseMinutesList($("m-min").value);
    var out = [];
    if (g === "" && r === "") out.push("Number 3: enter guests on disrupted bookings and guests recovered.");
    else {
      var rr = F.recoveryRate(g, r);
      out.push(rr.ok ? "Number 3, disruption recovery rate: " + rr.recovered + " of " + rr.guests + " = " + rr.rate.toFixed(1) + "%" : "Number 3: " + rr.error);
    }
    if (m.values.length) {
      var med = F.median(m.values), mx = Math.max.apply(null, m.values);
      var tgt = F.policyValue(state.policy, "first_notice");
      out.push("Minutes from first alert to first message: median " + med + " over " + m.values.length + " event" + (m.values.length === 1 ? "" : "s") + ", slowest " + mx + "." + (tgt ? " Target " + tgt + "." : ""));
      if (m.values.length < 10) out.push("Fewer than 10 events: read this as a direction, not a result.");
    } else out.push("Alert to first message: enter one number of minutes per event.");
    if (m.bad.length) out.push("Ignored (not whole minutes): " + m.bad.join(", "));
    $("m-out").textContent = out.join("\n");
    KIT.store.set(KEY + "measure", { g: g, r: r, m: $("m-min").value });
  }
  function wireMeasure() {
    var s = KIT.store.get(KEY + "measure");
    if (s) { $("m-guests").value = s.g || ""; $("m-rec").value = s.r || ""; $("m-min").value = s.m || ""; }
    $("m-form").addEventListener("input", updateMeasure);
    $("m-demo").addEventListener("click", function () { $("m-guests").value = "545"; $("m-rec").value = "191"; $("m-min").value = ""; updateMeasure(); });
    updateMeasure();
  }

  /* ---------- downloads, forget ---------- */
  function scalesText() {
    var out = ["JOURNEY FMEA SCORING GUIDE (ATIA Operations Kit, tool 2a)", "RPN = Severity x Occurrence x Detection. Flag every severity 9 or 10 whatever the RPN.", ""];
    [["S", "SEVERITY: worst credible effect on the guest and the business"], ["O", "OCCURRENCE: how often, counted from your log (season of about 150 operating days)"], ["D", "DETECTION: how early and how surely current controls catch it (no control = 10)"]].forEach(function (p) {
      out.push(p[1]);
      F.SCALES[p[0]].forEach(function (r) { out.push("  " + r[0] + "  " + r[1] + ". " + r[2]); });
      out.push("");
    });
    out.push("FIVE RULES");
    out.push("1. Score with the team, not alone.");
    out.push("2. Severity follows the effect, not the cause.");
    out.push("3. RPN sorts; it does not measure. Equal RPNs can hide very different risks.");
    out.push("4. No fixed RPN threshold. Work the top of the list and every severity 9 or 10.");
    out.push("5. Close the loop: re-score when an action is done. Only removing the effect lowers severity.");
    return out.join("\n") + "\n";
  }
  function wireFiles() {
    $("dl-fmea").addEventListener("click", function () { KIT.download("journey-fmea.csv", F.rowsToCSV(state.rows), "text/csv"); status("st-files", "Saved journey-fmea.csv to your downloads."); });
    $("dl-scales").addEventListener("click", function () { KIT.download("fmea-scoring-guide.txt", scalesText(), "text/plain"); status("st-files", "Saved fmea-scoring-guide.txt to your downloads."); });
    $("forget").addEventListener("click", function () {
      undo = null;
      state = { rows: F.demoRows(), policy: Object.assign({}, F.DEMO_POLICY), gh: Object.assign({}, F.DEMO_GH), sel: null, business: "Channel Light Excursions (fictional)" };
      $("pack-business").value = state.business;
      $("m-guests").value = ""; $("m-rec").value = ""; $("m-min").value = "";
      $("draft").value = ""; $("draft-results").innerHTML = "";
      renderEditor(); renderPolicyForm(); renderGhForm(); updateMeasure(); renderPack();
      /* rendering may have written defaults back; remove every key last */
      ["rows", "policy", "gh", "sel", "business", "measure"].forEach(function (k) { KIT.store.del(KEY + k); });
      status("st-forget", "Everything this page saved in this browser is gone. The fictional example is showing again.");
    });
  }

  /* ---------- start ---------- */
  function init() {
    if (!F || !KIT) return;
    var rows = KIT.store.get(KEY + "rows"), pol = KIT.store.get(KEY + "policy"), gh = KIT.store.get(KEY + "gh");
    var sel = KIT.store.get(KEY + "sel"), biz = KIT.store.get(KEY + "business");
    state.rows = Array.isArray(rows) ? rows.filter(function (r) { return r && typeof r === "object"; }).map(function (r) { return Object.assign(F.blankRow(""), r); }) : F.demoRows();
    state.rows.forEach(function (r) { if (!/^R\d+$/.test(String(r.id))) r.id = F.nextId(state.rows); });
    state.policy = pol && typeof pol === "object" ? pol : Object.assign({}, F.DEMO_POLICY);
    state.gh = gh && typeof gh === "object" ? gh : Object.assign({}, F.DEMO_GH);
    state.sel = Array.isArray(sel) ? sel : null;
    state.business = typeof biz === "string" ? biz : $("pack-business").value;
    $("pack-business").value = state.business;
    renderStatic();
    wireEditor(); wirePolicy(); wirePack(); wireChecker(); wireGh(); wireMeasure(); wireFiles();
    renderEditor(); renderPolicyForm(); renderGhForm();
    renderPack();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
