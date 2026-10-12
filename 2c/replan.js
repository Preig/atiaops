/* 2c page wiring: the fit check and the feasibility checker. Pure logic lives in replan-core.js.
 * Nothing leaves the browser. Form values are remembered in this browser only (kit.js, localStorage). */
(function () {
  "use strict";
  var R = window.ReplanCore;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function verdict(el, cls, html) {
    el.className = "verdict" + (cls ? " " + cls : "");
    el.innerHTML = html;
  }

  /* ---------- feasibility checker ---------- */
  function feas() {
    var f = $("feas-form"), out = $("feas-verdict"), wrap = $("feas-tablewrap"), body = $("feas-rows"), win = $("feas-window");
    if (!f || !R) return;
    var v = window.KIT && KIT.formValues ? KIT.formValues(f) : {};
    var blank = ["arrival", "allAboard", "buffer", "tour", "departures"].every(function (k) { return !String(v[k] || "").trim(); });
    if (blank) {
      wrap.hidden = true; body.innerHTML = ""; win.textContent = "";
      verdict(out, "", "<p>Type a ship's times, or load the fictional example.</p>");
      return;
    }
    var r = R.feasibility(v);
    if (r.errors.length) {
      wrap.hidden = true; body.innerHTML = ""; win.textContent = "";
      verdict(out, "err", r.errors.map(function (e) { return "<p>" + esc(e) + "</p>"; }).join(""));
      return;
    }
    verdict(out, r.works.length ? "ok" : "", "<p><strong>" + esc(r.summary) + "</strong></p><p>Guests can be at your meeting point from " +
      esc(R.fmt(r.ready)) + ".</p>");
    body.innerHTML = r.rows.map(function (row) {
      return "<tr><td data-label=\"Departure\">" + esc(R.fmt(row.departure)) + "</td>" +
        "<td data-label=\"Back at the dock\">" + esc(R.fmt(row.back)) + "</td>" +
        "<td data-label=\"Minutes before all-aboard\" class=\"num\">" + esc(row.margin) + "</td>" +
        "<td data-label=\"Verdict\" class=\"" + (row.works ? "yes" : "no") + "\">" + esc(row.why) + "</td></tr>";
    }).join("");
    wrap.hidden = false;
    win.textContent = r.window ? "Any departure leaving from " + R.fmt(r.window.from) + " to " + R.fmt(r.window.to) +
      " keeps the buffer. Use it to decide whether an extra departure is worth asking your captain and shuttle partner about." :
      "No departure time keeps the buffer for this ship today.";
  }

  /* ---------- fit check ---------- */
  function fit() {
    var f = $("fit-form"), out = $("fit-out");
    var res = R.fitCheck({ freq: f.freq.value, data: f.data.value, who: f.who.value });
    if (!res) return;
    verdict(out, res.level === "fit" ? "ok" : "", "<p>" + esc(res.text) + "</p>");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var ff = $("feas-form"), fitf = $("fit-form");
    if (ff) {
      ff.addEventListener("kit:change", feas);
      ff.addEventListener("input", feas);
      feas();
    }
    if (fitf) fitf.addEventListener("change", fit);
    var clear = $("clear-all");
    if (clear) clear.addEventListener("click", function () {
      if (window.KIT && KIT.builders) Object.keys(KIT.builders).forEach(function (k) { var b = KIT.builders[k]; b.form.reset(); b.refresh(); });
      try {
        var keys = [];
        for (var i = 0; i < window.localStorage.length; i++) { var k = window.localStorage.key(i); if (k && k.indexOf("atiaops:2c") === 0) keys.push(k); }
        keys.forEach(function (k) { window.localStorage.removeItem(k); });
      } catch (e) { }
      if (fitf) fitf.reset();
      verdict($("fit-out"), "", "<p>Answer the three questions to see where to start.</p>");
      feas();
      if (window.KIT && KIT.say) KIT.say(clear, "Cleared everything this page saved in this browser.");
    });
  });
})();
