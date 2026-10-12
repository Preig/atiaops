/* 3.c page wiring: the what-if calculator, the fit check and "clear my data".
 * Pure arithmetic lives in whatif-core.js (window.SlotWhatIf). Nothing leaves the browser.
 */
(function () {
  "use strict";
  var W = window.SlotWhatIf;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function setVerdict(el, cls, html) {
    el.className = "verdict" + (cls ? " " + cls : "");
    el.innerHTML = html;
  }

  function render() {
    var form = $("whatif-form");
    if (!form || !W) return;
    var raw = window.KIT && KIT.formValues ? KIT.formValues(form) : {};
    var out = W.run(raw);
    var box = $("wi-results"), err = $("wi-errors"), seat = $("wi-seat"), sum = $("wi-summary");
    if (!out.ok) {
      box.hidden = true;
      setVerdict(err, "err", "<p><strong>Check these inputs:</strong></p><ul>" + out.errors.map(function (e) { return "<li>" + esc(e) + "</li>"; }).join("") + "</ul>");
      err.hidden = false;
      sum.textContent = "";
      return;
    }
    err.hidden = true;
    box.hidden = false;
    var r = out.result, v = W.parse(raw).values;
    $("o-base").textContent = W.money(r.base.perSlot, true);
    $("o-plan").textContent = W.money(r.plan.perSlot, true);
    $("o-range").textContent = W.money(r.low, true) + " to " + W.money(r.high, true);
    $("o-change").textContent = W.signedMoney(r.change, true) + (r.changePct === null ? "" : " (" + (r.changePct > 0 ? "+" : "") + W.pct(r.changePct) + ")");
    $("o-fill").textContent = W.signedMoney(r.fillPart, true);
    $("o-prem").textContent = W.signedMoney(r.premiumPart, true);
    $("o-season").textContent = W.money(r.plan.comboNet);
    $("o-season-base").textContent = W.money(r.base.comboNet);
    $("o-season-change").textContent = W.signedMoney(r.seasonChange);
    $("o-whale").textContent = W.money(r.whaleSeason);
    $("o-total").textContent = W.money(r.planTotal);
    $("o-slots").textContent = W.count(r.slots);
    if (r.seatsPerDay === null) {
      setVerdict(seat, "", "<p>Add seats per day to check that the plan fits your departures.</p>");
    } else if (r.overSeats) {
      setVerdict(seat, "err", "<p><strong>Over the seats.</strong> The plan needs about " + W.count(r.seatUse) + " seats a day on average (" +
        W.count(r.comboPerDay) + " combo + " + W.count(v.whale_per_day || 0) + " whale-only) and you have " + W.count(r.seatsPerDay) +
        ". Averages hide peaks: on busy days seats run out first. Lower the plan, or see the departure scenarios in the sample report.</p>");
    } else {
      var spare = r.seatsPerDay - r.seatUse;
      setVerdict(seat, spare / r.seatsPerDay < 0.1 ? "" : "ok", "<p><strong>Fits on average:</strong> about " + W.count(r.seatUse) + " of " +
        W.count(r.seatsPerDay) + " seats a day (" + W.count(r.comboPerDay) + " combo + " + W.count(v.whale_per_day || 0) +
        " whale-only). Averages hide peaks: on days at or near the cap the seats and the allocation both run out, and extra seats there mostly sell whale-only.</p>");
    }
    sum.textContent = W.summary(r, v);
  }

  function fit() {
    var f = $("fit-form"), out = $("fit-out");
    var cap = f.cap.value, data = f.data.value, help = f.help.value;
    if (!cap || !data || !help) return;
    var msg, cls = "";
    if (cap === "none") {
      msg = "<p><strong>Not this rung.</strong> Without a cap, revenue per slot is not your constraint. Use the <a href=\"../leak/\">Season Leak Audit</a> to find where money leaks, and <a href=\"../3b/\">3.b Off-cap product lab</a> for new products.</p>";
    } else if (cap === "rarely") {
      msg = "<p><strong>Your constraint is demand, not the cap.</strong> Start with <a href=\"../3a/\">3.a Fill every capped slot</a> (empty slots first) and <a href=\"../3b/\">3.b</a> for light days. Use the what-if below to see what a fuller allocation is worth.</p>";
    } else if (data === "no") {
      msg = "<p><strong>Start the daily log this season.</strong> Download the evidence pack's <code>compliance_log_template.csv</code> and record allocation used and requests turned away, by cause, every day. Use the what-if below meanwhile; run the bundle next fall.</p>";
    } else if (help === "no" || data === "partly") {
      msg = "<p><strong>Possible, with help.</strong> Use the what-if below and the memo prompt now. The Python bundle needs daily counts and a few days of an analyst's time to adapt to your exports (estimate). The demo shows what you would get.</p>";
    } else {
      msg = "<p><strong>A good fit.</strong> Download the bundle, run the demo, then point it at your own exports (README, section \"Using your own data\"). Read the replay check in section 2 of the report before anything else.</p>";
      cls = "ok";
    }
    setVerdict(out, cls, msg);
  }

  function samePlan() {
    var b = window.KIT && KIT.builders && KIT.builders.whatif;
    if (!b) return;
    var v = KIT.formValues(b.form);
    v.plan_used = v.base_used;
    v.premium_share = "0";
    v.premium_uplift = "0";
    b.set(v);
    KIT.say($("wi-same"), "Plan set to last season: no fill change, no premium. Now change one input at a time.");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = $("whatif-form");
    if (form) {
      form.addEventListener("kit:change", render);
      form.addEventListener("input", render);
      render();
    }
    var ff = $("fit-form");
    if (ff) ff.addEventListener("change", fit);
    var same = $("wi-same");
    if (same) same.addEventListener("click", function (e) { e.preventDefault(); samePlan(); });
    var clear = $("clear-all");
    if (clear) clear.addEventListener("click", function () {
      if (window.KIT && KIT.builders) Object.keys(KIT.builders).forEach(function (k) {
        var b = KIT.builders[k]; b.form.reset();
        if (KIT.store) KIT.store.del("atiaops:3c:" + k);
        b.refresh();
      });
      if (ff) { ff.reset(); setVerdict($("fit-out"), "", "<p>Answer the three questions to see where to start.</p>"); }
      render();
      if (window.KIT && KIT.say) KIT.say(this, "Cleared everything this page saved in this browser.");
    });
  });
})();
