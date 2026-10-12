/* For your team: pure logic, no page access, no network.
 * Used by index.html (as window.TeamCore, wired by team.js) and by the Node tests:
 *   node dev/test-team.js
 * Holds: the 12-line context block, a first-pass personal-data check, and the parser for the
 * three assistant instruction files (instructions, output template, conversation starters).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TeamCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var T = {};

  T.STATUS = "draft instructions, not yet tested in a live account";
  T.ASSISTANTS = [
    { key: "crew-coach", name: "Crew Coach", file: "crew-coach.txt", from: "1b" },
    { key: "disruption-desk", name: "Disruption Desk", file: "disruption-desk.txt", from: "2a" },
    { key: "slot-planner", name: "Slot Planner", file: "slot-planner.txt", from: "3a and 3b" }
  ];

  /* ---------- the 12-line context block ---------- */
  T.CTX_LINES = [
    ["l1", "What we are"],
    ["l2", "Where we operate, and the nearest alternative for our guests"],
    ["l3", "Size (departures and seats, rooms, daily caps, staff in totals)"],
    ["l4", "Season, real dates and hours"],
    ["l5", "Busiest and slowest months or days, and how big the swing is"],
    ["l6", "Who our guests are and how they reach us"],
    ["l7", "How guests book us"],
    ["l8", "Who our staff are (totals only)"],
    ["l9", "Licenses, permits, allocations and certificates we depend on (names only)"],
    ["l10", "Partners we depend on"],
    ["l11", "What we never do (including safety lines)"],
    ["l12", "The thing that costs us the most time every week"]
  ];
  function oneLine(s) { return String(s === undefined || s === null ? "" : s).replace(/\s+/g, " ").trim(); }
  T.oneLine = oneLine;
  T.ctxFilled = function (v) {
    v = v || {};
    return T.CTX_LINES.some(function (l) { return oneLine(v[l[0]]) !== ""; });
  };
  T.ctxText = function (v) {
    v = v || {};
    var out = ["BUSINESS CONTEXT (12 lines)", "Business: " + (oneLine(v.name) || "[BUSINESS NAME]"), "Updated: " + (oneLine(v.updated) || "[DATE]")];
    T.CTX_LINES.forEach(function (l, i) { out.push((i + 1) + ". " + l[1] + ": " + (oneLine(v[l[0]]) || "Not supplied")); });
    return out.join("\n");
  };

  /* ---------- personal data: a first pass only, not a guarantee ---------- */
  T.luhn = function (digits) {
    var sum = 0, dbl = false;
    for (var i = digits.length - 1; i >= 0; i--) {
      var d = digits.charCodeAt(i) - 48;
      if (dbl) { d *= 2; if (d > 9) d -= 9; }
      sum += d; dbl = !dbl;
    }
    return sum % 10 === 0;
  };
  T.findPII = function (text) {
    text = String(text || "");
    var hits = [];
    if (/[A-Z0-9._%+-]+@[A-Z0-9-]+(\.[A-Z0-9-]+)*\.[A-Z]{2,}/i.test(text)) hits.push("an email address");
    if (/(^|[^\d])(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/.test(text)) hits.push("a phone number");
    var runs = text.match(/\d(?:[ -]?\d){12,18}/g) || [];
    if (runs.some(function (r) { var d = r.replace(/\D/g, ""); return d.length >= 13 && d.length <= 19 && T.luhn(d); })) hits.push("a card number");
    if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) hits.push("what looks like a Social Security number");
    return hits;
  };
  T.listWords = function (a) {
    if (a.length < 2) return a.join("");
    return a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  };

  /* ---------- assistant files ---------- */
  /* sections are marked "=== NAME ===" on a line of their own */
  T.parseAssistant = function (text) {
    var t = String(text || "").replace(/\r\n/g, "\n"), re = /^=== (.+?) ===\s*$/gm, m, marks = [];
    while ((m = re.exec(t))) marks.push({ name: m[1].trim().toUpperCase(), start: m.index, body: m.index + m[0].length });
    var sec = {};
    marks.forEach(function (k, i) { sec[k.name] = t.slice(k.body, i + 1 < marks.length ? marks[i + 1].start : t.length).replace(/^\n+|\s+$/g, ""); });
    var head = (marks.length ? t.slice(0, marks[0].start) : t).replace(/\s+$/, "");
    var instrMark = marks.filter(function (k) { return k.name === "INSTRUCTIONS"; })[0];
    var startersMark = marks.filter(function (k) { return k.name === "CONVERSATION STARTERS"; })[0];
    var paste = instrMark ? t.slice(instrMark.start, startersMark ? startersMark.start : t.length).replace(/\s+$/, "") : "";
    var starters = (sec["CONVERSATION STARTERS"] || "").split(/\n\s*\n/).map(function (p) { return p.replace(/^\s*\d+\.\s*/, "").replace(/\s+/g, " ").trim(); }).filter(Boolean);
    return { title: (head.split("\n")[0] || "").trim(), head: head, instructions: sec.INSTRUCTIONS || "", template: sec["OUTPUT TEMPLATE"] || "", starters: starters, paste: paste };
  };
  /* placeholders such as [SHIP LETTER] that a person replaces before sending a starter */
  T.placeholders = function (s) {
    var seen = {}, out = [];
    (String(s || "").match(/\[[A-Z][A-Z0-9 ,'.-]*\]/g) || []).forEach(function (p) { if (!seen[p]) { seen[p] = 1; out.push(p); } });
    return out;
  };
  /* paste-and-go: the instructions, then the context block if there is one, then a starter */
  T.bundleText = function (parsed, ctxValues, starterIndex) {
    var parts = ["Follow these instructions for this whole conversation.\n\n" + parsed.paste];
    if (T.ctxFilled(ctxValues)) parts.push(T.ctxText(ctxValues));
    var s = parsed.starters[starterIndex || 0];
    if (s) parts.push(s);
    return parts.join("\n\n---\n\n");
  };

  return T;
});
