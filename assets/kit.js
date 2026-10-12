/* ATIA Operations Kit - shared behaviour (adapted from the ATIA AI Take-Home Kit). No dependencies, works offline, nothing leaves the browser.
 *
 * Conventions every tool page can use:
 *   <button data-copy="ID" [data-copy-msg="..."] [data-status="ID"]>  copy the text of #ID; optional custom message and status target
 *   <form data-builder="KEY"> + inputs   live prompt builder; inputs need name="field"
 *   <template id="T"> ... {{field|[FALLBACK]}} ... </template>
 *   <pre data-render="T" data-builder-src="KEY"></pre>   rendered from template T with the form's values
 *   <button data-fill="KEY" data-example="NAME">         fill form KEY from KIT.examples[NAME] (or <script type="application/json" id="NAME">)
 *   <button data-reset="KEY">            clear the form (and its saved values)
 *   <button data-download="file.ext" data-from="ID" [data-mime="text/csv"]>  save the text of #ID as a file
 *   <nav class="tool-nav" data-toolnav="1a"></nav>       standard links across the kit
 * Form values are remembered in this browser only (localStorage), so a page can be closed and reopened.
 */
(function () {
  "use strict";
  var KIT = window.KIT = window.KIT || {};

  KIT.tools = [
    ["1a", "Rehire before you recruit", 1, 1, "OPS"], ["1b", "Standard work and crew coach", 1, 2, "OPS + CX"], ["1c", "Season staffing model", 1, 3, "OPS"],
    ["2a", "Journey FMEA and disruption playbook", 2, 1, "CX + OPS"], ["2b", "Arrival watch and backfill", 2, 2, "OPS"], ["2c", "Disruption re-planner and loss ledger", 2, 3, "OPS"],
    ["3a", "Fill every capped slot", 3, 1, "OPS"], ["3b", "Off-cap product lab", 3, 2, "PRODUCT"], ["3c", "Revenue-per-slot optimizer", 3, 3, "OPS"]
  ];
  KIT.pains = [
    [1, "Staff turnover", "Recruiting and retraining cost"],
    [2, "Transit bottlenecks", "Lost operational revenue"],
    [3, "Capacity caps", "Growth stalls at the cap"]
  ];

  /* ---------- fictional teaching data (same numbers as data/summary_2026.json) ---------- */
  KIT.demo = {
    business: "Channel Light Excursions, Juneau (FICTIONAL TEACHING BUSINESS)",
    facts: [
      "FICTIONAL TEACHING BUSINESS: Channel Light Excursions, Juneau",
      "Offer: Whale and Glacier Combo, about 4.5 hours dock to dock. Shuttle from the downtown cruise docks to Auke Bay (about 25 minutes), 2.5-hour whale-watching cruise, then a 50-minute stop at Mendenhall Glacier under a commercial-use allocation of 100 guest visits per day. Departures from the downtown docks 8:00, 10:30, 13:00, 15:30, May 1 to September 30. 30 seats per departure (vessel certificate limit). Minimum age 3. Adult $219, child (3 to 12) $169.",
      "Second product: Whale Only, 3 hours, adult $159, child $119. Sold when the glacier allocation for the day is used up, and to guests who skip the glacier.",
      "Policies: runs in rain. Cancels for a marine weather warning or a vessel safety call by the captain, with a choice of rebooking or a full refund. Guests booked through a cruise line follow the cruise line's terms. We plan every cruise-guest departure to return to the dock at least 60 minutes before the ship's all-aboard time.",
      "Channels: cruise line shore-excursion desks (about half of guests), two OTAs, own website and phone.",
      "Team: 22 seasonal positions (captains 3, deckhands 5, naturalist guides 6, dock coordinators 5, reservations 3). Staff housing: 12 leased beds.",
      "Not supplied (ask the owner): group rates, private charters, pet policy, vessel accessibility, the exact refund terms of each cruise line contract."
    ].join("\n"),
    partners: [
      "Partner A: Kestrel Shuttle (FICTIONAL). Dock to Auke Bay and glacier transfers, two 24-seat buses and one 14-seat van. Needs 30 minutes notice for an extra run.",
      "Partner B: Tern Point Lodge (FICTIONAL). 18-room lodge 20 minutes from Auke Bay. Packages for independent travelers in May, early June and September."
    ].join("\n"),
    season: "Season 2026 (fictional): 12,914 guests, net revenue about $1.97 million, 38 disruption events affecting 545 guests (35% recovered), glacier allocation 79% used (at or near the cap on 66 days, about 1,936 combo requests turned away), 20 new hires for 22 positions, 6 returning staff, 4 early quits in the first 30 days.",
    month: "July in Juneau (fictional teaching summary): cool and often wet, long daylight, fog and low ceilings can delay flights, ships may tender from anchor when docks are full."
  };
  KIT.examples = KIT.examples || {};

  /* ---------- storage (never required; private windows may block it) ---------- */
  var store = {
    get: function (k) { try { return JSON.parse(window.localStorage.getItem(k) || "null"); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
    del: function (k) { try { window.localStorage.removeItem(k); } catch (e) { } }
  };
  KIT.store = store;
  var pageKey = "atiaops:" + (document.body && document.body.dataset.page || location.pathname);

  /* ---------- status line ---------- */
  function say(fromEl, msg) {
    var box = null, n = fromEl;
    if (fromEl && fromEl.dataset && fromEl.dataset.status) box = document.getElementById(fromEl.dataset.status);
    while (n && !box) { box = n.querySelector && n.querySelector(".status"); n = n.parentElement; }
    box = box || document.getElementById("copy-status");
    if (box) { box.textContent = msg; clearTimeout(box._t); box._t = setTimeout(function () { box.textContent = ""; }, 6000); }
  }
  KIT.say = say;

  function textOf(el) {
    if (!el) return "";
    if ("value" in el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.tagName === "SELECT")) return el.value;
    return el.innerText !== undefined ? el.innerText : el.textContent;
  }
  KIT.textOf = textOf;

  /* ---------- copy ---------- */
  KIT.copy = function (text, fromEl, okMsg) {
    var msgOk = okMsg || (fromEl && fromEl.dataset && fromEl.dataset.copyMsg) || "Copied. Paste it into Claude, ChatGPT or Gemini.";
    function fallback() {
      var area = document.createElement("textarea");
      area.value = text; area.setAttribute("readonly", ""); area.style.position = "fixed"; area.style.left = "-10000px";
      document.body.appendChild(area); area.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) { }
      area.remove();
      say(fromEl, ok ? msgOk : "Select the text and press Ctrl+C (Cmd+C on a Mac).");
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { say(fromEl, msgOk); }, fallback);
    } else fallback();
  };

  /* ---------- download ---------- */
  KIT.download = function (name, text, mime) {
    var blob = new Blob([text], { type: (mime || "text/plain") + ";charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  /* ---------- template rendering: {{field}} or {{field|[FALLBACK]}} ---------- */
  KIT.render = function (tpl, values) {
    return tpl.replace(/\{\{\s*([\w.-]+)\s*(?:\|([^}]*))?\}\}/g, function (_, k, fb) {
      var v = values[k];
      if (v === undefined || v === null || String(v).trim() === "") return fb !== undefined ? fb : "[" + k.toUpperCase().replace(/[_-]/g, " ") + "]";
      return String(v).trim();
    });
  };
  function tplText(id) {
    var t = document.getElementById(id);
    if (!t) return "";
    var raw = t.tagName === "TEMPLATE" ? t.innerHTML : t.textContent;
    // decode entities written in the template (&amp; &lt; &gt; &quot;)
    var d = document.createElement("textarea"); d.innerHTML = raw; return d.value.replace(/^\n/, "");
  }
  KIT.tplText = tplText;

  function formValues(form) {
    var v = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === "checkbox") { if (el.checked) v[el.name] = v[el.name] ? v[el.name] + "\n" + el.value : el.value; else if (!(el.name in v)) v[el.name] = ""; }
      else if (el.type === "radio") { if (el.checked) v[el.name] = el.value; else if (!(el.name in v)) v[el.name] = ""; }
      else v[el.name] = el.value;
    });
    return v;
  }
  KIT.formValues = formValues;
  function setValues(form, vals) {
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || !(el.name in vals)) return;
      if (el.type === "checkbox") el.checked = String(vals[el.name]).split("\n").indexOf(el.value) >= 0;
      else if (el.type === "radio") el.checked = vals[el.name] === el.value;
      else el.value = vals[el.name];
    });
  }

  KIT.builders = {};
  function wireBuilder(form) {
    var key = form.dataset.builder, sk = pageKey + ":" + key;
    var saved = store.get(sk); if (saved) setValues(form, saved);
    function refresh() {
      var vals = formValues(form);
      store.set(sk, vals);
      document.querySelectorAll('[data-builder-src="' + key + '"]').forEach(function (out) {
        if (out.dataset.render) out.textContent = KIT.render(tplText(out.dataset.render), vals);
      });
      form.dispatchEvent(new CustomEvent("kit:change", { detail: vals }));
    }
    form.addEventListener("input", refresh);
    form.addEventListener("change", refresh);
    form.addEventListener("submit", function (e) { e.preventDefault(); refresh(); });
    KIT.builders[key] = { form: form, refresh: refresh, values: function () { return formValues(form); }, set: function (v) { setValues(form, v); refresh(); } };
    refresh();
  }

  function exampleData(name) {
    var s = document.getElementById(name);
    if (s && s.type === "application/json") { try { return JSON.parse(s.textContent); } catch (e) { } }
    var ex = KIT.examples[name];
    return typeof ex === "function" ? ex() : ex;
  }

  function wireToolNav(nav) {
    var cur = nav.dataset.toolnav, root = nav.dataset.root || "../";
    var html = '<a href="' + root + '"' + (cur === "hub" ? ' aria-current="page"' : "") + '>All tools</a>';
    html += '<a href="' + root + 'leak/"' + (cur === "leak" ? ' aria-current="page"' : "") + '>Season Leak Audit</a>';
    KIT.tools.forEach(function (t) {
      html += '<a href="' + root + t[0] + '/"' + (cur === t[0] ? ' aria-current="page"' : "") + ' title="' + t[1] + '">' + t[0].charAt(0) + "." + t[0].charAt(1) + " " + t[1] + "</a>";
    });
    html += '<a href="' + root + 'team/"' + (cur === "team" ? ' aria-current="page"' : "") + '>For your team</a>';
    nav.innerHTML = html;
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("form[data-builder]").forEach(wireBuilder);
    document.querySelectorAll("nav[data-toolnav]").forEach(wireToolNav);
    document.addEventListener("click", function (e) {
      var b = e.target.closest("button, a.button");
      if (!b) return;
      if (b.dataset.copy) { e.preventDefault(); KIT.copy(textOf(document.getElementById(b.dataset.copy)), b); }
      else if (b.dataset.download) {
        e.preventDefault();
        var src = b.dataset.from ? textOf(document.getElementById(b.dataset.from)) : (b.dataset.text || "");
        KIT.download(b.dataset.download, src, b.dataset.mime);
        say(b, "Saved " + b.dataset.download + " to your downloads.");
      }
      else if (b.dataset.fill) {
        e.preventDefault();
        var bl = KIT.builders[b.dataset.fill], data = exampleData(b.dataset.example);
        if (bl && data) { bl.set(data); say(b, "Fictional example loaded. Replace it with your own approved facts."); }
      }
      else if (b.dataset.reset) {
        e.preventDefault();
        var bb = KIT.builders[b.dataset.reset];
        if (bb) { bb.form.reset(); store.del(pageKey + ":" + b.dataset.reset); bb.refresh(); say(b, "Cleared."); }
      }
    });
  });
})();
