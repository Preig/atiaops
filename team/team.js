/* For your team: page wiring. Uses ../assets/kit.js (KIT) and team-core.js (TeamCore).
 * No network; nothing leaves the browser.
 * - Builds the 12-line context block and puts it into the paste-and-go bundles.
 * - Reads the three assistant files embedded in the page and offers copy buttons for the
 *   instructions, each starter and the bundle.
 * - Checks text for emails, phone numbers and card numbers before copying (a first pass only).
 */
(function () {
  "use strict";
  var T, KIT, SK = "atiaops:team:";
  var parsed = {};

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ctxValues() { return KIT.builders.ctx ? KIT.builders.ctx.values() : {}; }

  /* ---------- context block ---------- */
  function renderCtx() {
    var v = ctxValues(), out = $("out-ctx");
    if (out) out.textContent = T.ctxText(v);
    var hits = T.findPII(Object.keys(v).map(function (k) { return v[k]; }).join("\n"));
    if (hits.length) KIT.store.del(SK + "ctx"); // kit.js saved the form; take that copy out again
    var w = $("pii-ctx");
    if (w) w.textContent = hits.length ? "This looks like it contains " + T.listWords(hits) + ". Remove guest and staff details before you copy. Until you do, this block is not saved in this browser." : "";
    updateBundles();
  }

  /* ---------- assistants ---------- */
  function wireAssistants() {
    T.ASSISTANTS.forEach(function (a) {
      var pre = $("txt-" + a.key);
      if (!pre) return;
      var p = parsed[a.key] = T.parseAssistant(pre.textContent);
      var len = document.querySelector('[data-len="' + a.key + '"]');
      if (len) len.textContent = pre.textContent.replace(/\s+$/, "").length.toLocaleString("en-US") + " characters";
      var ol = $("st-" + a.key);
      if (ol) ol.innerHTML = p.starters.map(function (s, i) {
        var ph = T.placeholders(s);
        return '<li><pre class="prompt" id="st-' + a.key + '-' + i + '">' + esc(s) + '</pre>' +
          (ph.length ? '<p class="hint">Replace ' + esc(T.listWords(ph)) + ' in the chat before you send.</p>' : "") +
          '<div><div class="btns tight"><button type="button" class="secondary small" data-guard-copy="st-' + a.key + '-' + i + '">Copy starter ' + (i + 1) + '</button>' +
          '<button type="button" class="ghost small override" hidden>It is fictional or already removed: copy anyway</button></div>' +
          '<p class="status" role="status" aria-live="polite"></p></div></li>';
      }).join("");
      var sel = $("sel-" + a.key);
      if (sel) {
        sel.innerHTML = p.starters.map(function (s, i) { return '<option value="' + i + '">' + esc((i + 1) + ". " + (s.length > 70 ? s.slice(0, 67) + "..." : s)) + "</option>"; }).join("");
        sel.addEventListener("change", updateBundles);
      }
    });
    updateBundles();
  }
  function bundleFor(key) {
    var sel = $("sel-" + key);
    return T.bundleText(parsed[key], ctxValues(), sel ? parseInt(sel.value || "0", 10) : 0);
  }
  function updateBundles() {
    T.ASSISTANTS.forEach(function (a) {
      var sum = $("sum-" + a.key);
      if (!sum || !parsed[a.key]) return;
      var withCtx = T.ctxFilled(ctxValues());
      sum.textContent = "Copies about " + bundleFor(a.key).length.toLocaleString("en-US") + " characters: the instructions, " +
        (withCtx ? "your context block" : "no context block yet (fill in section 1)") + ", then the starter you picked. Attach the files in the chat.";
    });
  }

  /* ---------- guarded copy: text that looks like personal data waits for a confirmation ---------- */
  function overrideBtn(btn) { var row = btn.closest(".btns"); return row ? row.querySelector("button.override") : null; }
  function guardedCopy(getText, btn, okMsg) {
    var text = getText(), hits = T.findPII(text), ob = overrideBtn(btn);
    if (hits.length) {
      if (ob) { ob._getText = getText; ob._msg = okMsg; ob.hidden = false; }
      KIT.say(btn, "Not copied: this looks like it contains " + T.listWords(hits) + ". Remove it, or confirm it is fictional.");
      return;
    }
    if (ob) { ob.hidden = true; ob._getText = null; }
    KIT.copy(text, btn, okMsg);
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.guardCopy) {
      e.preventDefault();
      var id = b.dataset.guardCopy;
      guardedCopy(function () { var el = $(id); return el ? el.textContent : ""; }, b);
    } else if (b.dataset.copyInstr) {
      e.preventDefault();
      var k = b.dataset.copyInstr;
      if (parsed[k]) KIT.copy(parsed[k].paste, b, "Instructions copied (INSTRUCTIONS through OUTPUT TEMPLATE). Paste them into the assistant's instruction field.");
    } else if (b.dataset.bundleCopy) {
      e.preventDefault();
      var bk = b.dataset.bundleCopy;
      guardedCopy(function () { return bundleFor(bk); }, b, "Bundle copied. Paste it into a new chat and attach the files.");
    } else if (b.classList.contains("override")) {
      e.preventDefault();
      b.hidden = true;
      if (b._getText) { KIT.copy(b._getText(), b, b._msg); b._getText = null; }
    } else if (b.dataset.act === "ctx-save") {
      e.preventDefault();
      var text = $("out-ctx").textContent, hits = T.findPII(text);
      if (hits.length) { KIT.say(b, "Not saved: this looks like it contains " + T.listWords(hits) + ". Remove it first."); return; }
      KIT.download("business-context.md", text + "\n", "text/markdown");
      KIT.say(b, "Saved business-context.md to your downloads.");
    } else if (b.id === "forget") {
      e.preventDefault();
      try {
        var keys = [];
        for (var i = 0; i < localStorage.length; i++) { var key = localStorage.key(i); if (key && key.indexOf(SK) === 0) keys.push(key); }
        keys.forEach(function (x) { KIT.store.del(x); });
      } catch (err) { }
      var bl = KIT.builders && KIT.builders.ctx;
      if (bl) { bl.form.reset(); bl.refresh(); KIT.store.del(SK + "ctx"); }
      KIT.say(b, "Cleared. Nothing from this page is saved in this browser now.");
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    T = window.TeamCore; KIT = window.KIT;
    var form = $("form-ctx");
    if (form) form.addEventListener("kit:change", renderCtx);
    wireAssistants();
    renderCtx();
  });
})();
