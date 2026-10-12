/* 1.c Season staffing model: page wiring. The arithmetic lives in plan-core.js (window.PlanCore).
 * Nothing leaves the browser. Text typed by the user is written with textContent, never as HTML.
 */
(function () {
  "use strict";
  var C = window.PlanCore;
  function $(id) { return document.getElementById(id); }
  function el(tag, text, cls) {
    var e = document.createElement(tag);
    if (text !== undefined && text !== null) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  var last = null;

  function inputs() {
    var f = $("plan-form"), v = {};
    Array.prototype.forEach.call(f.elements, function (x) { if (x.name) v[x.name] = x.value; });
    var ch = [];
    for (var i = 1; i <= 5; i++) ch.push({ name: v["ch" + i + "_name"], share: v["ch" + i + "_share"], lead: v["ch" + i + "_lead"] });
    return {
      positions: v.positions, eligible: v.eligible, rehire: v.rehire, compare: v.compare, quitRate: v.quitRate,
      quitsLast: v.quitsLast, newLast: v.newLast, costPerHire: v.costPerHire, costRange: v.costRange,
      seasonStart: v.seasonStart, onboarding: v.onboarding, planDate: v.planDate, channels: ch
    };
  }

  function verdict(cls, nodes) {
    var box = $("o-verdict");
    box.className = "verdict" + (cls ? " " + cls : "");
    clear(box);
    nodes.forEach(function (n) { box.appendChild(n); });
  }

  function p(parts) {
    /* parts: strings, or [text, "strong"] pairs */
    var e = el("p");
    parts.forEach(function (x) {
      if (Array.isArray(x)) e.appendChild(el(x[1], x[0]));
      else e.appendChild(document.createTextNode(x));
    });
    return e;
  }

  function calc() {
    var res = C.plan(inputs());
    last = res;
    var rows = $("o-rows"), more = $("o-more");
    clear(rows); clear(more);
    if (!res.ok) {
      ["o-ret", "o-new", "o-total", "o-cost"].forEach(function (id) { $(id).textContent = "?"; });
      $("o-cost-l").textContent = "recruiting cost";
      var ul = el("ul");
      res.errors.forEach(function (m) { ul.appendChild(el("li", m)); });
      verdict("err", [p([["Check these inputs:", "strong"]]), ul]);
      var tr = el("tr"), td = el("td", "Fix the inputs above to see the dates.");
      td.colSpan = 5; tr.appendChild(td); rows.appendChild(tr);
      $("plan-status").textContent = "Inputs need attention: " + res.errors[0];
      return;
    }
    var b = res.base;
    $("o-ret").textContent = String(b.returning);
    $("o-new").textContent = String(b.newHires);
    $("o-total").textContent = C.one(b.total);
    if (res.cost) {
      $("o-cost").textContent = C.money(res.cost.mid);
      $("o-cost-l").textContent = "recruiting cost (" + C.money(res.cost.lo) + " to " + C.money(res.cost.hi) + ")";
    } else {
      $("o-cost").textContent = "?";
      $("o-cost-l").textContent = "recruiting cost: add a cost per hire";
    }

    var v = [p([b.newHires + " new hires at a " + C.pct(res.q, 0) + " early-quit rate means about " + C.one(b.quits) +
      " early quits and " + C.one(b.replacements) + " replacement hires: ", [C.one(b.total) + " hires in all", "strong"], "."])];
    if (res.interval) {
      var hi = isFinite(res.interval.totalHi) ? C.one(res.interval.totalHi) : "no upper limit";
      v.push(p(["How sure: last season " + res.interval.x + " of " + res.interval.n + " new hires left early. The 95% interval runs from " +
        C.pct(res.interval.lo) + " to " + C.pct(res.interval.hi) + ", so plan for ", [C.one(res.interval.totalLo) + " to " + hi + " hires", "strong"],
        ". One person moves the rate by " + C.one(res.interval.stepPoints) + " points."]));
    } else {
      v.push(p(["Add last season's early quits and new hires to see how sure that rate is."]));
    }
    var late = res.channels.filter(function (c) { return c.code === "late" && c.hires > 0; });
    var soon = res.channels.filter(function (c) { return c.code === "soon" && c.hires > 0; });
    if (late.length) v.push(p([["Late: ", "strong"], late.map(function (c) { return c.name; }).join(", ") +
      " should have started already. Move those hires to a shorter-lead channel or a later start date."]));
    else if (soon.length) v.push(p([["Soon: ", "strong"], soon.map(function (c) { return c.name; }).join(", ") +
      " starts within four weeks of the plan date."]));
    verdict(late.length ? "err" : "", v);

    res.channels.forEach(function (c) {
      var tr = el("tr", null, c.code === "late" ? "late" : c.code === "soon" ? "soon" : "");
      tr.appendChild(el("td", c.name));
      tr.appendChild(el("td", String(c.hires), "num"));
      tr.appendChild(el("td", c.lead + " wk", "num"));
      tr.appendChild(el("td", C.niceDate(c.latest), "nowrap"));
      tr.appendChild(el("td", c.status, c.code === "late" ? "st-late" : c.code === "soon" ? "st-soon" : ""));
      rows.appendChild(tr);
    });

    if (res.standby > 0) {
      more.appendChild(p([["Replacements: ", "strong"], "line up about " + res.standby + " standby candidates from your shortest-lead channels before new hires start on " +
        C.niceDate(res.startDate) + ". In the fictional 2026 season, early quits came 16 to 23 days after starting."]));
    }
    if (res.compare) {
      var a = res.compare.alt;
      var parts = [["At a " + a.rate + "% rehire rate: ", "strong"], a.returning + " returning, " + a.newHires + " new hires, " + C.one(a.total) +
        " hires in all. That is " + C.one(res.compare.hiresAvoided) + " fewer hires"];
      if (res.compare.saved) parts.push(" and about " + C.money(res.compare.saved.mid) + " less (" + C.money(res.compare.saved.lo) + " to " +
        C.money(res.compare.saved.hi) + ")");
      parts.push(".");
      more.appendChild(p(parts));
    }
    more.appendChild(el("p", "Plan date: " + C.niceDate(res.planDate) + ". Dates count back " + res.onboarding +
      " days of onboarding and the lead time you typed. Estimates.", "hint"));
    $("plan-status").textContent = "Plan updated: " + C.one(b.total) + " hires in all; first deadline " +
      (res.firstDeadline ? C.niceDate(res.firstDeadline.latest) + " (" + res.firstDeadline.name + ")" : "none") + ".";
  }

  function fit() {
    var f = $("fit-form");
    var a = { size: f.size.value, data: f.data.value, help: f.help.value };
    var level = C.fit(a) || "";
    var box = $("fit-out");
    box.className = "verdict" + (level === "fit" ? " ok" : "");
    Array.prototype.forEach.call(box.querySelectorAll("[data-fit]"), function (n) { n.hidden = n.getAttribute("data-fit") !== level; });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!C) return;
    var pf = $("plan-form");
    pf.addEventListener("kit:change", calc);
    pf.addEventListener("input", calc);
    calc();
    $("fit-form").addEventListener("change", fit);
    fit();

    $("plan-clear").addEventListener("click", function () {
      var empty = {};
      Array.prototype.forEach.call(pf.elements, function (x) { if (x.name) empty[x.name] = ""; });
      if (window.KIT && KIT.builders && KIT.builders.plan) KIT.builders.plan.set(empty);
      else { Array.prototype.forEach.call(pf.elements, function (x) { if (x.name) x.value = ""; }); calc(); }
      if (window.KIT && KIT.say) KIT.say(this, "Cleared. Type your own numbers, or load the fictional example.");
    });
    $("copy-plan").addEventListener("click", function () {
      if (!last || !last.ok) { KIT.say(this, "Fix the inputs first."); return; }
      KIT.copy(C.planText(last), this, "Copied. Paste it into your calendar notes or an AI chat.");
    });
    $("save-plan").addEventListener("click", function () {
      if (!last || !last.ok) { KIT.say(this, "Fix the inputs first."); return; }
      KIT.download("1c-hiring-plan.txt", C.planText(last), "text/plain");
      KIT.say(this, "Saved 1c-hiring-plan.txt to your downloads.");
    });
    $("clear-all").addEventListener("click", function () {
      try {
        var keys = [];
        for (var i = 0; i < window.localStorage.length; i++) {
          var k = window.localStorage.key(i);
          if (k && k.indexOf("atiaops:1c") === 0) keys.push(k);
        }
        keys.forEach(function (k) { window.localStorage.removeItem(k); });
      } catch (e) { /* storage blocked: nothing saved */ }
      if (window.KIT && KIT.builders) Object.keys(KIT.builders).forEach(function (k) { var bl = KIT.builders[k]; bl.form.reset(); bl.refresh(); });
      $("fit-form").reset();
      fit();
      calc();
      if (window.KIT && KIT.say) KIT.say(this, "Cleared everything this page saved in this browser. The calculator shows the fictional example again.");
    });
  });
})();
