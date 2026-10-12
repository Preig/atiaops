/* 1.a Rehire before you recruit: page wiring. The logic lives in rehire-core.js (tested in dev/).
 * Nothing leaves the browser. localStorage is used for convenience only, and every access is wrapped.
 */
(function () {
  "use strict";
  var R = window.RehireCore;
  var KIT = window.KIT = window.KIT || {};
  KIT.examples = KIT.examples || {};
  if (R) Object.keys(R.EXAMPLES).forEach(function (k) { KIT.examples[k] = R.EXAMPLES[k]; });
  var K = { notes: "atiaops:1a:notes", themes: "atiaops:1a:themes", filter: "atiaops:1a:filter", adj: "atiaops:1a:adj" };
  var lastPareto = null;

  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return R.esc(s); }
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { } }
  function lsDel(k) { try { window.localStorage.removeItem(k); } catch (e) { } }
  function say(el, msg) {
    if (KIT.say) { KIT.say(el, msg); return; }
    var n = el, box = null; while (n && !box) { box = n.querySelector && n.querySelector(".status"); n = n.parentElement; }
    if (box) box.textContent = msg;
  }
  function joinAnd(a) { return a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }
  function plural(n, w) { return n + " " + w + (n === 1 ? "" : "s"); }

  /* ---------- 1 · Pareto ---------- */
  function currentThemes() {
    var t = R.parseThemes($("#themes").value);
    $("#themes-errs").innerHTML = t.errors.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") +
      (!t.themes.length ? "<li>No usable themes, so the kit's keywords are used.</li>" : "");
    return t.themes.length ? t.themes : R.DEFAULT_THEMES;
  }

  function renderSplit(s) {
    var parts = [["yes", "Yes"], ["maybe", "Maybe"], ["no", "No"], ["unknown", "Not given"]].filter(function (x) { return s[x[0]] > 0; });
    $("#split").innerHTML = parts.map(function (x) { return '<i class="sw-' + x[0] + '" style="flex:' + s[x[0]] + ' 1 0"></i>'; }).join("");
    $("#split-legend").innerHTML = parts.map(function (x) {
      return '<li><span class="sw sw-' + x[0] + '" aria-hidden="true"></span>' + x[1] + " <b>" + s[x[0]] + "</b> (" + Math.round(100 * s[x[0]] / s.total) + "%)</li>";
    }).join("");
  }

  function renderPareto() {
    if (!R) return;
    var raw = $("#notes").value, filter = $("#filter").value;
    lsSet(K.notes, raw); lsSet(K.filter, filter); lsSet(K.themes, $("#themes").value);
    var pn = R.parseNotes(raw), th = currentThemes();
    var p = R.pareto(pn.notes, th, filter);
    lastPareto = p;

    var warn = [], sc = R.scrub(raw), names = R.possibleNames(raw);
    if (sc.found.length) warn.push("Found " + joinAnd(sc.found) + ": removed from the prompt below. Delete it from the box too.");
    if (names.length) warn.push("Possible names: " + names.slice(0, 8).join(", ") + (names.length > 8 ? " and more" : "") + ". Check them and remove any person's name before you copy the prompt.");
    if (pn.dropped.length) warn.push("Columns left out of the prompt: " + pn.dropped.join(", ") + ".");
    $("#notes-warn").textContent = warn.join(" ");

    var body = $("#pareto-body");
    if (!pn.notes.length) {
      $("#pareto-summary").textContent = "Paste notes or load the fictional set to see the Pareto.";
      body.hidden = true;
    } else if (!p.n) {
      $("#pareto-summary").textContent = "No notes match \"" + R.FILTERS[filter] + "\". Choose Everyone, or add yes, maybe or no to your notes.";
      body.hidden = true;
    } else {
      body.hidden = false;
      $("#pareto-summary").innerHTML = "<b>" + plural(p.n, "note") + "</b>" + (filter !== "all" ? " (of " + p.total + ", " + esc(R.FILTERS[filter]) + ")" : "") +
        " · " + plural(p.mentions, "theme mention") + (p.multi ? " (some notes carry two themes)" : "") + " · " + p.untagged.length + " not tagged." +
        (p.rows.length ? " Top two: <b>" + esc(R.topTwoText(p)) + "</b>." : "");
      renderSplit(p.split);
      var max = p.rows.length ? p.rows[0].count : 1;
      $("#pchart").innerHTML = p.rows.map(function (r) {
        var title = r.name + ": " + plural(r.count, "note") + ", " + r.share.toFixed(1) + "% of mentions, cumulative " + r.cum.toFixed(1) + "%";
        return '<li class="' + (r.top ? "top" : "") + '" title="' + esc(title) + '"><span class="pl">' + esc(r.name) + (r.top ? '<span class="tag">Top two</span>' : "") + "</span>" +
          '<span class="pb" aria-hidden="true"><i style="width:' + (100 * r.count / max).toFixed(1) + '%"></i></span>' +
          '<span class="pv">' + r.count + "<small>cum. " + Math.round(r.cum) + "%</small></span>" +
          '<span class="visually-hidden">' + esc(title) + "</span></li>";
      }).join("") || "<li>No note matched a keyword. Edit the keywords below.</li>";
      var notes = [];
      if (p.tie) notes.push("Second place is a tie, so read the notes behind every tied theme before you pick two.");
      if (p.untagged.length) notes.push("Not tagged by any keyword: " + p.untagged.join(", ") + ". Read them: they may be a theme the keywords miss.");
      if (p.empty.length) notes.push("No notes for: " + p.empty.join(", ") + ".");
      if (p.n < 30) notes.push("With " + plural(p.n, "note") + ", treat the order as a hint, not a finding.");
      notes.push("A count is not a complaint: a theme can hold reasons to stay as well as reasons to leave.");
      $("#pareto-note").textContent = notes.join(" ");
      $("#pareto-table").innerHTML = p.rows.map(function (r) {
        return '<tr><th scope="row">' + esc(r.name) + (r.top ? ' <span class="tag">Top two</span>' : "") + '</th><td class="num" data-label="Notes">' + r.count +
          '</td><td class="num" data-label="Share of mentions">' + r.share.toFixed(1) + '%</td><td class="num" data-label="Cumulative">' + r.cum.toFixed(1) +
          '%</td><td class="ids" data-label="Which notes">' + esc(r.ids.join(", ")) + "</td></tr>";
      }).join("");
    }
    var clean = p.notes.map(function (n) { return { id: n.id, role: R.scrub(n.role).text, wr: n.wr, text: R.scrub(n.text).text }; });
    $("#out-pareto").textContent = R.paretoPrompt(clean, p);
    var top = $("#letter-top");
    top.textContent = p.rows.length ? "Top two themes in your notes: " + R.topTwoText(p) + ". For each, write what you have decided to change. If nothing has changed, leave it out: the message should not promise a fix you have not made."
      : "Run the Pareto first: its top two themes are what this message should answer.";
  }

  function loadFile(file, btn) {
    if (!file) return;
    if (file.size > 2000000) { say(btn, "That file is over 2 MB. Paste the notes instead."); return; }
    var fr = new FileReader();
    fr.onload = function () { $("#notes").value = String(fr.result); renderPareto(); say(btn, "Loaded " + file.name + " on this device. Nothing was uploaded."); };
    fr.onerror = function () { say(btn, "Could not read that file."); };
    fr.readAsText(file);
  }

  /* ---------- 3 · adjective finder and the facts ---------- */
  var KIND = { gen: ["", "Generic"], promise: ["amber", "Promise"], risk: ["red", "Check: legal risk"] };
  function renderAdj() {
    var t = $("#adj").value;
    lsSet(K.adj, t);
    var rep = R.postReport(t);
    $("#adj-out").innerHTML = t.trim() ? R.markup(t) : '<span class="hint">Paste a post above, or load the generic example.</span>';
    $("#adj-sum").innerHTML = t.trim() ? [
      plural(rep.gen, "generic word"), plural(rep.promise, "promise"), plural(rep.risk, "legal-risk word"), plural(rep.facts, "checkable fact"), rep.fills + " [FILL] still owed"
    ].map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") : "";
    /* one line per kind of word, in order of first appearance, each word listed once */
    var groups = [], byG = {};
    rep.hits.forEach(function (h) {
      var g = byG[h.g];
      if (!g) { g = byG[h.g] = { h: h, words: [] }; groups.push(g); }
      if (g.words.map(function (w) { return w.toLowerCase(); }).indexOf(h.raw.toLowerCase()) < 0) g.words.push(h.raw);
    });
    $("#adj-list").innerHTML = groups.map(function (g) {
      var k = KIND[g.h.kind];
      return '<li><span class="pill ' + k[0] + '">' + k[1] + "</span> " + g.words.map(function (w) { return '<mark class="' + g.h.kind + '">' + esc(w) + "</mark>"; }).join(", ") +
        ": " + esc(g.h.why) + '<span class="try">Instead: ' + esc(g.h.tryi) + "</span></li>";
    }).join("");
  }
  var POST_FACTS = [["business", "business"], ["role", "role"], ["dates", "dates"], ["hours", "hours"], ["daysoff", "days off"], ["pay", "pay"], ["housing", "housing"], ["hard", "what is hard"], ["day", "a day in the job"], ["needs", "what you need"], ["apply", "how to apply"]];
  function renderPostCount(vals) {
    vals = vals || (KIT.builders.post && KIT.builders.post.values()) || {};
    var filled = POST_FACTS.filter(function (f) { return String(vals[f[0]] || "").trim(); });
    var words = [];
    POST_FACTS.forEach(function (f) {
      R.findAdjectives(vals[f[0]] || "").forEach(function (h) { words.push("\"" + h.raw + "\" (" + f[1] + ")"); });
    });
    var gaps = filled.filter(function (f) { return /\[[^\]]*\]/.test(vals[f[0]]); }).length;
    var s = filled.length + " of " + POST_FACTS.length + " facts filled" + (gaps ? " (" + gaps + " still contain a [FILL] gap)" : "") + "; empty ones become [FILL] in the prompt.";
    if (words.length) s += " Generic or risky words in your facts: " + words.slice(0, 6).join(", ") + ". Replace them with numbers and tasks.";
    $("#post-count").textContent = s;
  }

  /* ---------- Numbers 1 and 2 ---------- */
  function renderRates(vals) {
    vals = vals || (KIT.builders.rates && KIT.builders.rates.values()) || {};
    var r = R.rates(vals), out = [];
    Object.keys(r.err).forEach(function (k) { out.push('<span class="hint">' + esc(r.err[k]) + "</span>"); });
    if (r.rehire) out.push("Number 1 · Rehire rate: <b>" + R.pct(r.rehire.value) + "</b> (" + r.rehire.num + " of " + r.rehire.den + "). One person moves it " + r.rehire.onePerson.toFixed(1) + " points.");
    if (r.earlyQuit) out.push("Number 2 · Early-quit rate: <b>" + R.pct(r.earlyQuit.value) + "</b> (" + r.earlyQuit.num + " of " + r.earlyQuit.den + "). One person moves it " + r.earlyQuit.onePerson.toFixed(1) + " points.");
    $("#rates-out").innerHTML = out.length ? out.join("<br>") : "Enter the counts above.";
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!R) return;
    $("#notes").value = lsGet(K.notes) || "";
    $("#themes").value = lsGet(K.themes) || R.themesText(R.DEFAULT_THEMES);
    var f = lsGet(K.filter); if (f && R.FILTERS[f]) $("#filter").value = f;
    $("#adj").value = lsGet(K.adj) || "";

    $("#notes").addEventListener("input", renderPareto);
    $("#themes").addEventListener("input", renderPareto);
    $("#filter").addEventListener("change", renderPareto);
    $("#notes-file").addEventListener("change", function (e) { loadFile(e.target.files && e.target.files[0], e.target); e.target.value = ""; });
    $("#btn-notes-example").addEventListener("click", function (e) {
      var cur = $("#notes").value.trim();
      if (cur && cur !== R.SAMPLE_CSV.trim() && !window.confirm("Replace the notes in the box with the 30 fictional notes?")) return;
      $("#notes").value = R.SAMPLE_CSV.replace(/\r\n/g, "\n");
      renderPareto();
      say(e.currentTarget, "Loaded the 30 fictional notes (Channel Light Excursions, fictional). Same as exit_notes_2026.csv.");
    });
    $("#btn-notes-clear").addEventListener("click", function (e) {
      var cur = $("#notes").value.trim();
      if (cur && cur !== R.SAMPLE_CSV.replace(/\r\n/g, "\n").trim() && !window.confirm("Clear the notes in the box?")) return;
      $("#notes").value = ""; lsDel(K.notes); renderPareto(); say(e.currentTarget, "Cleared.");
    });
    $("#btn-themes-reset").addEventListener("click", function (e) {
      $("#themes").value = R.themesText(R.DEFAULT_THEMES); renderPareto(); say(e.currentTarget, "Keywords reset to the kit's list.");
    });

    $("#adj").addEventListener("input", renderAdj);
    $("#btn-adj-example").addEventListener("click", function (e) { $("#adj").value = R.GENERIC_POST; renderAdj(); say(e.currentTarget, "Loaded a generic post (fictional). Every marked word is one a traveler or a recruit cannot check."); });
    $("#btn-adj-clear").addEventListener("click", function (e) { $("#adj").value = ""; lsDel(K.adj); renderAdj(); say(e.currentTarget, "Cleared."); });

    var fp = $("#form-post"), fr = $("#form-rates");
    if (fp) fp.addEventListener("kit:change", function (e) { renderPostCount(e.detail); });
    if (fr) fr.addEventListener("kit:change", function (e) { renderRates(e.detail); });

    renderPareto(); renderAdj();
    if (KIT.builders && KIT.builders.post) renderPostCount();
    if (KIT.builders && KIT.builders.rates) renderRates();
  });
})();
