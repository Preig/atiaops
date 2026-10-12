/* 1.b Standard work and crew coach: page wiring. Uses ../assets/kit.js (KIT) and coach-core.js (CoachCore).
 * Everything runs in this browser. Nothing you type is sent anywhere, and nothing goes into a URL.
 * Saved in this browser only (localStorage, keys starting "atiaops:1b"), so the page can be closed and reopened.
 */
(function () {
  "use strict";
  var C, KIT, store, SK = "atiaops:1b:";

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function today() { var d = new Date(); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function rawBlock(id) { var el = $(id); return el ? el.textContent.replace(/^\n/, "") : ""; }
  function say(el, msg) { KIT.say(el, msg); }
  function debounce(fn, ms) { var t; return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); }; }
  function listWords(a) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }
  function newRid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function armed(b, label, again) {
    if (b.dataset.armed !== "1") {
      b.dataset.armed = "1"; b.textContent = again;
      setTimeout(function () { b.dataset.armed = ""; b.textContent = label; }, 5000);
      return false;
    }
    b.dataset.armed = ""; b.textContent = label; return true;
  }

  /* ---------- the procedure pack used by the checks ---------- */
  var DEFAULT_PACK = [], custom = null;
  function keyOf(file) { return file.replace(/\.md$/, ""); }
  function loadDefaultPack() {
    DEFAULT_PACK = C.PROCEDURES.map(function (p) { var el = $("proc-" + keyOf(p.file)); return { name: p.file, text: el ? el.textContent : "" }; });
    DEFAULT_PACK.forEach(function (f) {
      var info = document.querySelector('[data-pinfo="' + keyOf(f.name) + '"]');
      if (!info) return;
      var n = C.procLines(f.text).length, s = C.safetyLines(f.text).length;
      info.textContent = "· " + n + " lines" + (s ? ", " + s + " marked SAFETY" : "");
    });
    var saved = store.get(SK + "pack");
    custom = Array.isArray(saved) && saved.length ? saved : null;
    renderPackStatus();
  }
  function pack() { return custom || DEFAULT_PACK; }
  function renderPackStatus() {
    var el = $("pack-status"); if (!el) return;
    el.textContent = custom
      ? "Your " + custom.length + " file" + (custom.length === 1 ? "" : "s") + ": " + custom.map(function (f) { return f.name + " (" + C.procLines(f.text).length + " numbered lines)"; }).join(", ") + ". Kept in this browser only."
      : "The six fictional procedures on this page.";
  }
  function wirePackFiles() {
    var input = $("pack-file"); if (!input) return;
    input.addEventListener("change", function (e) {
      var files = Array.prototype.slice.call(e.target.files || []), st = $("pack-status");
      if (!files.length) return;
      Promise.all(files.map(function (f) {
        return new Promise(function (res) {
          var r = new FileReader();
          r.onload = function () { res({ name: f.name, text: String(r.result || "") }); };
          r.onerror = function () { res(null); };
          r.readAsText(f);
        });
      })).then(function (list) {
        list = list.filter(Boolean);
        var pii = list.filter(function (f) { return C.piiHits(f.text).length; }).map(function (f) { return f.name; });
        custom = list.length ? list : null;
        if (custom && !pii.length) store.set(SK + "pack", custom); else store.del(SK + "pack");
        renderPackStatus(); refreshAllChecks();
        if (pii.length && st) st.textContent += " " + listWords(pii) + " look" + (pii.length === 1 ? "s" : "") + " like " + (pii.length === 1 ? "it contains" : "they contain") + " personal details. Remove them; until then nothing is saved in this browser.";
        else if (custom && !custom.some(function (f) { return C.procLines(f.text).length; }) && st) st.textContent += " No numbered lines found: the line checks need lines that start 1., 2., 3.";
      });
      e.target.value = "";
    });
  }

  /* ---------- PII warning on the interview notes ---------- */
  function warnPII(formKey, vals, outId) {
    var hits = C.piiHits(Object.keys(vals).map(function (k) { return vals[k]; }).join("\n")), el = $(outId);
    if (hits.length) store.del("atiaops:1b:" + formKey); // kit.js saved the form; take that copy out again
    if (el) el.textContent = hits.length ? "This looks like it contains " + listWords(hits) + ". Remove guest and staff details before you copy. Until you do, this form is not saved in this browser." : "";
  }

  /* ---------- grader ---------- */
  var gr = { questions: [], answers: {}, meta: {} };
  function grSave() { store.set(SK + "grader", gr); }
  function defaultQuestions() { return C.questionsFromCSV(rawBlock("src-test-questions")); }
  function grades() { return gr.questions.map(function (q) { var a = gr.answers[q.id]; return a && a.g || ""; }); }
  function qById(id) { for (var i = 0; i < gr.questions.length; i++) if (gr.questions[i].id === id) return gr.questions[i]; return null; }
  function settingsNow() {
    var s = C.settings($("set-bar").value, $("set-max").value);
    $("set-errors").textContent = s.errors.join(" ");
    return s;
  }
  function renderQuestions() {
    var html = "";
    gr.questions.forEach(function (q) {
      var a = gr.answers[q.id] || {}, srcs = C.sources(q), id = esc(q.id);
      html += '<details class="q" id="q-' + id + '" data-qid="' + id + '">' +
        '<summary><span class="qid">' + id + '</span> <span class="qtext">' + esc(q.question) + '</span><span class="visually-hidden">. Status: </span> <span class="qstate" id="st-' + id + '"></span></summary>' +
        '<div class="qbody">' +
        '<p class="qexp"><b>Expected:</b> <span class="pill teal">' + esc(C.OUTCOME_SHORT[q.expected_outcome || ""]) + '</span> ' +
        (srcs.length ? 'from <code>' + srcs.map(function (s) { return esc(C.sourceLabel(s)); }).join("</code> or <code>") + '</code>' : (q.expected_outcome ? "(not in the procedures)" : "")) +
        (q.trap ? ' <span class="pill amber">Trap: ' + esc(q.trap) + '</span>' : "") + '</p>' +
        (q.good ? '<p class="hint">What good looks like: ' + esc(q.good) + '</p>' : "") +
        '<div class="btns tight"><button type="button" class="ghost small" data-act="copyq" data-qid="' + id + '">Copy the question</button></div>' +
        '<label for="ans-' + id + '">The coach\'s answer to ' + id + '</label>' +
        '<textarea id="ans-' + id + '" class="ans" data-qid="' + id + '" spellcheck="false"></textarea>' +
        '<div class="checks" id="chk-' + id + '"></div>' +
        '<fieldset class="grade"><legend>Your grade for ' + id + '</legend>' +
        C.GRADES.map(function (g) {
          var gid = "g-" + q.id + "-" + g[0].replace(/\s+/g, "-");
          return '<label for="' + esc(gid) + '"><input type="radio" id="' + esc(gid) + '" name="g-' + id + '" value="' + esc(g[0]) + '" data-qid="' + id + '"' + (a.g === g[0] ? " checked" : "") + '> ' + esc(g[1]) + '</label>';
        }).join("") +
        '</fieldset>' +
        '<label for="note-' + id + '">Note <small>(optional: what was wrong, or which procedure line needs fixing)</small></label>' +
        '<input type="text" id="note-' + id + '" class="note" data-qid="' + id + '" autocomplete="off">' +
        '</div></details>';
    });
    $("qlist").innerHTML = html;
    gr.questions.forEach(function (q) {
      var a = gr.answers[q.id] || {};
      $("ans-" + q.id).value = a.a || "";
      $("note-" + q.id).value = a.n || "";
      runCheck(q); setState(q);
    });
    $("q-count").textContent = gr.questions.length;
    $("out-round").textContent = C.batchPrompt(gr.questions);
    renderSummary();
  }
  function runCheck(q) {
    var a = (gr.answers[q.id] || {}).a || "", res = C.autoCheck(q, a, pack()), box = $("chk-" + q.id);
    if (!box) return res;
    if (res.empty) { box.innerHTML = '<p class="hint">Paste the answer to run the checks.</p>'; return res; }
    box.innerHTML = '<ul class="chk">' + res.items.map(function (it) {
      return '<li class="' + it.level + '"><span class="tag">' + C.CHECK_LABEL[it.level] + '</span> ' + esc(it.text) + '</li>';
    }).join("") + '</ul>' +
      (res.suggestion ? '<p class="sugg">The checks point to: <b>' + esc(res.suggestion) + '</b>. They are hints. You decide the grade.</p>' : '<p class="sugg">No expected outcome for this question, so no hint. You decide the grade.</p>');
    return res;
  }
  function refreshAllChecks() { if ($("qlist")) gr.questions.forEach(runCheck); }
  function setState(q) {
    var a = gr.answers[q.id] || {}, st = $("st-" + q.id);
    if (!st) return;
    if (a.g) st.innerHTML = '<span class="pill ' + (C.GRADE_CLASS[a.g] || "") + '">' + esc(a.g) + '</span>';
    else if (a.a) st.innerHTML = '<span class="pill teal">answer pasted</span>';
    else st.innerHTML = '<span class="pill ghostpill">not graded</span>';
  }
  function currentSummary() {
    var s = C.summarize(grades());
    s.date = gr.meta.date || today(); s.tool = gr.meta.tool || ""; s.round = gr.meta.round || ""; s.rid = gr.meta.rid || "";
    s.sig = s.date + "|" + gr.questions.map(function (q) { return q.id + "=" + ((gr.answers[q.id] || {}).g || ""); }).join(",");
    return s;
  }
  function renderSummary() {
    var s = currentSummary(), st = settingsNow(), j = C.judge(s, st);
    $("sum-graded").textContent = s.graded + " of " + s.total;
    $("sum-pct").textContent = C.pct(s.pct);
    $("sum-refuse").textContent = String(s.refused);
    $("stat-refuse").classList.toggle("bad", s.refused > 0);
    var v = $("sum-verdict");
    v.className = "callout verdict " + (j.status === "pass" ? "green" : "amber");
    v.textContent = s.graded ? j.text : "No answers graded yet. Your bar: " + st.bar + "% correct and at most " + st.maxRefuse + " should have refused.";
  }
  function exportRows() {
    var rows = [["date", "round", "tool", "question_id", "question", "expected_outcome", "expected_source", "answer", "auto_checks", "grade", "note", "graded_by"]], p = pack();
    gr.questions.forEach(function (q) {
      var a = gr.answers[q.id] || {};
      rows.push([gr.meta.date || today(), gr.meta.round || "", gr.meta.tool || "", q.id, q.question, q.expected_outcome, q.expected_source, a.a || "", C.checkLog(C.autoCheck(q, a.a || "", p)), a.g || "", a.n || "", gr.meta.by || ""]);
    });
    return rows;
  }
  function setQuestions(qs) {
    var old = {};
    gr.questions.forEach(function (q) { old[q.id] = q.question; });
    qs.forEach(function (q) { var a = gr.answers[q.id], was = a && (a.qt || old[q.id]); if (a && was && was !== q.question) delete gr.answers[q.id]; });
    gr.questions = qs;
  }
  function metaToForm() { ["tool", "date", "by", "round"].forEach(function (k) { var el = $("gm-" + k); if (el) el.value = gr.meta[k] || ""; }); }
  function wireGrader() {
    var saved = store.get(SK + "grader");
    if (saved && saved.questions && saved.questions.length) gr = saved; else gr.questions = defaultQuestions();
    gr.answers = gr.answers || {}; gr.meta = gr.meta || {};
    if (!gr.meta.date) gr.meta.date = today();
    if (!gr.meta.rid) gr.meta.rid = newRid();
    var set = store.get(SK + "settings");
    if (set) { $("set-bar").value = set.bar; $("set-max").value = set.max; }
    ["set-bar", "set-max"].forEach(function (id) {
      $(id).addEventListener("input", function () { store.set(SK + "settings", { bar: $("set-bar").value, max: $("set-max").value }); renderSummary(); renderHistory(); });
    });
    metaToForm();
    ["tool", "date", "by", "round"].forEach(function (k) {
      var el = $("gm-" + k); if (!el) return;
      function upd() { gr.meta[k] = el.value; grSave(); renderSummary(); }
      el.addEventListener("input", upd); el.addEventListener("change", upd);
    });
    renderQuestions();
    var box = $("qlist"), timers = {};
    function check(id) { clearTimeout(timers[id]); timers[id] = setTimeout(function () { var q = qById(id); if (q) runCheck(q); }, 300); }
    box.addEventListener("input", function (e) {
      var t = e.target, id = t.dataset.qid;
      if (!id) return;
      gr.answers[id] = gr.answers[id] || {}; gr.answers[id].qt = (qById(id) || {}).question;
      if (t.classList.contains("ans")) { gr.answers[id].a = t.value; check(id); setState(qById(id)); }
      else if (t.classList.contains("note")) gr.answers[id].n = t.value;
      grSave();
    });
    box.addEventListener("change", function (e) {
      var t = e.target, id = t.dataset.qid;
      if (t.type === "radio" && id) {
        gr.answers[id] = gr.answers[id] || {}; gr.answers[id].g = t.value; gr.answers[id].qt = (qById(id) || {}).question;
        grSave(); setState(qById(id)); renderSummary();
      }
    });
    $("q-file").addEventListener("change", function (e) {
      var f = e.target.files && e.target.files[0], st = $("q-file-status");
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        var qs = C.questionsFromFile(String(r.result || ""), f.name);
        if (!qs.length) { st.textContent = "No questions found in " + f.name + ". Use a CSV with a question column, or one question per line."; return; }
        setQuestions(qs); grSave(); renderQuestions();
        st.textContent = "Loaded " + qs.length + " questions from " + f.name + " (read on this device, not uploaded). Answers to the same questions are kept.";
      };
      r.onerror = function () { st.textContent = "Could not read that file."; };
      r.readAsText(f);
      e.target.value = "";
    });
  }
  function loadExampleRound(b) {
    var ex;
    try { ex = JSON.parse(rawBlock("ex-round")); } catch (err) { ex = null; }
    if (!ex || !ex.answers) { say(b, "The fictional round could not be read."); return; }
    setQuestions(defaultQuestions());
    gr.answers = {};
    Object.keys(ex.answers).forEach(function (id) {
      var q = qById(id), e = ex.answers[id];
      if (q) gr.answers[id] = { a: e.a, g: e.g, n: e.n || "", qt: q.question };
    });
    gr.meta = { tool: ex.meta.tool, round: ex.meta.round, by: ex.meta.by, date: ex.meta.date, rid: newRid() };
    metaToForm(); grSave(); renderQuestions();
    var s = currentSummary();
    say(b, "Fictional graded round loaded: " + s.correct + " of " + s.total + " correct, " + s.refused + " should have refused. Open Q03: the checks say correct, the owner graded it wrong.");
  }
  function doSplit(b) {
    var text = $("batch").value, parts = C.splitBatch(text, gr.questions.length);
    if (!text.trim()) { say(b, "Paste the coach's whole reply first."); return; }
    if (!parts.length) { say(b, "No numbered answers found. The reply needs answers numbered 1, 2, 3 to match the questions."); return; }
    parts.forEach(function (p, i) { var q = gr.questions[i]; if (!q) return; gr.answers[q.id] = gr.answers[q.id] || {}; gr.answers[q.id].a = p; gr.answers[q.id].qt = q.question; });
    grSave(); renderQuestions();
    say(b, "Split into " + parts.length + " of " + gr.questions.length + " answers. Open each question to check the split and grade it." + (parts.length < gr.questions.length ? " Some answers were not found: paste those by hand." : ""));
  }

  /* ---------- saved rounds ---------- */
  function rounds() { var r = store.get(SK + "rounds"); return Array.isArray(r) ? r : []; }
  function renderHistory() {
    var r = rounds();
    $("hist-wrap").hidden = !r.length;
    $("hist-body").innerHTML = r.map(function (x) {
      var res = x.status === "pass" ? "Met the bar" : x.status === "fail" ? "Not yet" : "Incomplete";
      return '<tr><td data-label="Date">' + esc(x.date) + '</td><td data-label="Tool and round">' + esc((x.tool || "-") + (x.round ? " · " + x.round : "")) + '</td><td class="num" data-label="Graded">' + x.graded + " of " + x.total +
        '</td><td class="num" data-label="Correct">' + esc(C.pct(x.pct)) + '</td><td class="num" data-label="Should have refused">' + x.refused + '</td><td data-label="Bar">' + esc(x.bar + "% correct, " + x.maxRefuse + " refusals allowed") + '</td><td data-label="Result">' + esc(res) + "</td></tr>";
    }).join("");
  }

  /* ---------- 14-day plan ---------- */
  var lastPlan = null;
  function safetyFiles() { return DEFAULT_PACK.filter(function (f) { return C.safetyLines(f.text).length; }).map(function (f) { return f.name; }); }
  function planOpts() {
    var v = KIT.builders.plan ? KIT.builders.plan.values() : {};
    var procs = String(v.procs || "").split("\n").concat(String(v.extra || "").split(/\r?\n/)).map(function (x) { return x.trim(); }).filter(Boolean);
    return { role: v.role, start: v.start, off: v.off, lead: v.lead, qualified: v.qualified, shadow: v.shadow, colead: v.colead, procs: procs, safety: safetyFiles() };
  }
  function renderPlan() {
    var p = C.buildPlan(planOpts()), sum = $("plan-summary"), warn = $("plan-warn");
    lastPlan = p.ok ? p : null;
    if (!p.ok) {
      sum.className = "callout amber"; sum.textContent = p.errors.join(" ");
      warn.innerHTML = ""; $("plan-wrap").hidden = true; return;
    }
    var s = p.summary;
    sum.className = "callout green";
    sum.textContent = "14-day plan for " + p.role + ": " + s.workingDays + " working days (" + s.shadow + " shadow, " + s.colead + " co-lead, " + s.solo + " solo) and " + s.daysOff + " days off. " +
      (s.firstSolo ? "First solo day: day " + s.daysToSolo + ", " + C.dayLabel(C.parseISO(s.firstSolo)) + "." : "No solo day in the 14 days.") + " Draft: the lead adjusts it.";
    warn.innerHTML = p.warnings.map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("");
    $("plan-body").innerHTML = p.days.map(function (d) {
      var cls = d.phase === "Day off" ? "off" : d.phase === "Shadow" ? "p-shadow" : d.phase === "Co-lead" ? "p-colead" : "p-solo";
      return '<tr class="' + cls + '"><td class="dnum" data-label="Day">' + d.day + '</td><td class="ddate" data-label="Date">' + esc(d.label) + '</td><td class="phase" data-label="Phase">' + esc(d.phase) + "</td>" +
        '<td class="what" data-label="What happens">' + (d.tasks.length > 1 ? "<ul>" + d.tasks.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>" : esc(d.tasks.join(" "))) + "</td>" +
        '<td class="sign" data-label="Sign-off">' + (d.signoff.length ? d.signoff.map(function (t) { return esc(t) + ": ____"; }).join("<br>") : "") + "</td></tr>";
    }).join("");
    $("plan-wrap").hidden = false;
  }
  function planName(ext) {
    var p = lastPlan, role = p ? p.role.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : "plan";
    return "onboarding-plan-" + (role || "role") + (p && p.days[0] ? "-" + p.days[0].date : "") + "." + ext;
  }

  /* ---------- clicks ---------- */
  function onClick(e) {
    var b = e.target.closest("button[data-act]");
    if (!b) return;
    var act = b.dataset.act;
    if (act === "proc-copy") { var pre = $("proc-" + b.dataset.key); if (pre) KIT.copy(pre.textContent, b, "Copied. Paste it where your crew coach keeps its files."); }
    else if (act === "pack-reset") { custom = null; store.del(SK + "pack"); renderPackStatus(); refreshAllChecks(); say(b, "Checking against the six fictional procedures again."); }
    else if (act === "copyq") { var q = qById(b.dataset.qid); if (q) KIT.copy(q.question, b, "Question copied. Paste it into a new chat with your coach."); }
    else if (act === "round-copy") { KIT.copy($("out-round").textContent, b); }
    else if (act === "q-default") { setQuestions(defaultQuestions()); grSave(); renderQuestions(); say(b, "The 20 fictional test questions are loaded. Answers to the same questions are kept."); }
    else if (act === "ex-round") { loadExampleRound(b); }
    else if (act === "split") { doSplit(b); }
    else if (act === "batch-clear") { $("batch").value = ""; say(b, "Cleared."); }
    else if (act === "g-clear") {
      if (!armed(b, "Clear answers and grades", "Click again to clear all answers and grades")) return;
      gr.answers = {}; gr.meta.rid = newRid(); grSave(); renderQuestions();
      say(b, "Answers and grades cleared. The questions stay. Saving from now on starts a new round.");
    } else if (act === "g-csv") {
      KIT.download("crew-coach-grading-log-" + (gr.meta.date || today()) + ".csv", C.toCSV(exportRows()), "text/csv");
      say(b, "Saved the grading log as CSV. Keep it with your monthly records.");
    } else if (act === "g-save-round") {
      var s = currentSummary(), st = settingsNow(), j = C.judge(s, st);
      if (!s.graded) { say(b, "Grade at least one answer first."); return; }
      var rec = { rid: s.rid, date: s.date, tool: s.tool, round: s.round, graded: s.graded, total: s.total, correct: s.correct, wrong: s.counts.wrong, refused: s.refused, pct: s.pct, bar: st.bar, maxRefuse: st.maxRefuse, status: j.status, sig: s.sig + "|" + st.bar + "|" + st.maxRefuse };
      var up = C.upsertRound(rounds(), rec);
      if (up.action === "same") { say(b, "This round is already saved."); return; }
      store.set(SK + "rounds", up.list); renderHistory();
      say(b, up.action === "updated" ? "This round was already saved. It is updated with your latest grades." : "Round saved in this browser.");
    } else if (act === "g-copy-sum") {
      var s2 = currentSummary(), j2 = C.judge(s2, settingsNow());
      KIT.copy("Crew coach test round " + s2.date + (s2.tool ? " · " + s2.tool : "") + "\nGraded: " + s2.graded + " of " + s2.total + "\nCorrect: " + C.pct(s2.pct) +
        "\nShould have refused: " + s2.refused + "\n" + C.GRADES.map(function (g) { return g[1] + ": " + s2.counts[g[0]]; }).join("\n") + "\n" + j2.text, b);
    } else if (act === "hist-csv") {
      var rows = [["date", "tool", "round", "graded", "total", "correct", "wrong", "should_have_refused", "percent_correct", "pass_bar_percent", "refusals_allowed", "result"]].concat(rounds().map(function (x) {
        return [x.date, x.tool, x.round || "", x.graded, x.total, x.correct, x.wrong, x.refused, C.pct(x.pct), x.bar, x.maxRefuse, x.status];
      }));
      KIT.download("crew-coach-rounds.csv", C.toCSV(rows), "text/csv"); say(b, "Saved crew-coach-rounds.csv.");
    } else if (act === "hist-clear") {
      if (!armed(b, "Clear history", "Click again to clear the history")) return;
      store.del(SK + "rounds"); renderHistory(); say(b, "History cleared.");
    } else if (act === "plan-role") {
      var role = String(($("p-role") || {}).value || "").trim().toLowerCase(), list = C.ROLE_PROCS[role];
      if (!list) { say(b, "Type one of the listed roles first, or tick the procedures by hand."); return; }
      document.querySelectorAll('#form-plan input[name="procs"]').forEach(function (c) { c.checked = list.indexOf(c.value) >= 0; });
      KIT.builders.plan.refresh(); renderPlan(); say(b, "Picked the usual procedures for this role (fictional). Adjust them.");
    } else if (act === "plan-build") {
      renderPlan(); say(b, lastPlan ? "Plan built. Download it, print it, or copy it." : "Fix the items above first.");
    } else if (act === "plan-md" || act === "plan-csv" || act === "plan-copy") {
      renderPlan();
      if (!lastPlan) { say(b, "Build the plan first: pick a first day."); return; }
      if (act === "plan-md") { KIT.download(planName("md"), C.planMarkdown(lastPlan), "text/markdown"); say(b, "Saved " + planName("md") + "."); }
      else if (act === "plan-csv") { KIT.download(planName("csv"), C.planCSV(lastPlan), "text/csv"); say(b, "Saved " + planName("csv") + "."); }
      else KIT.copy(C.planMarkdown(lastPlan), b, "Plan copied as Markdown.");
    } else if (act === "plan-print") { window.print(); }
    else if (act === "forget") {
      var keys = [];
      try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf("atiaops:1b") === 0) keys.push(k); } } catch (err) { }
      keys.forEach(function (k) { store.del(k); });
      say(b, "Everything this page saved in this browser is cleared. Reload the page to start fresh.");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    C = window.CoachCore; KIT = window.KIT; store = KIT.store;
    loadDefaultPack();
    wirePackFiles();
    wireGrader();
    renderHistory();
    var fi = $("form-interview");
    if (fi) {
      fi.addEventListener("kit:change", function (e) { warnPII("interview", e.detail || {}, "pii-interview"); });
      warnPII("interview", KIT.builders.interview ? KIT.builders.interview.values() : {}, "pii-interview");
    }
    var fp = $("form-plan");
    if (fp) fp.addEventListener("kit:change", debounce(renderPlan, 150));
    renderPlan();
    document.addEventListener("click", onClick);
  });
})();
