/* 1.b Standard work and crew coach: pure logic, no page access, no network.
 * Used by index.html (as window.CoachCore, wired by coach.js) and by the Node tests:
 *   node dev/test-coach.js
 * Holds: CSV helpers, the answer checks for the crew coach, the grading math with the owner's
 * pass bar, saved-round bookkeeping, and the 14-day onboarding plan.
 * Teaching data is fictional: Channel Light Excursions, Juneau.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CoachCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var C = {};

  /* ---------- fixed strings the crew coach instruction asks for ---------- */
  C.DECLINE = "Not in our procedures. Ask your lead.";
  C.LEAD = "Ask your lead.";
  C.DRAFT = "DRAFT - PENDING OWNER REVIEW";
  C.PROCEDURES = [
    { file: "dock-check-in.md", title: "Dock check-in for cruise guests" },
    { file: "ship-late-tendering.md", title: "Ship late or tendering from anchor" },
    { file: "mendenhall-stop.md", title: "Mendenhall Glacier stop" },
    { file: "whale-viewing.md", title: "Whale viewing distance and conduct" },
    { file: "rain-cold-gear.md", title: "Rain and cold gear for guests" },
    { file: "lost-late-guest.md", title: "Lost or late guest" }
  ];
  C.FILES = C.PROCEDURES.map(function (p) { return p.file; });
  C.OUTCOMES = {
    answer: "Answer from the procedures: quote the line, name the file and line number",
    answer_lead: "Quote the line, then end with \"Ask your lead.\"",
    refuse: "Reply exactly \"Not in our procedures. Ask your lead.\""
  };
  C.OUTCOME_SHORT = { answer: "Answer", answer_lead: "Answer, then ask your lead", refuse: "Refuse", "": "Not set" };
  C.GRADES = [["correct", "Correct"], ["wrong", "Wrong"], ["should have refused", "Should have refused"]];
  C.GRADE_CLASS = { "correct": "", "wrong": "amber", "should have refused": "red" };
  /* fictional starting point for the onboarding plan: which procedures each role learns first */
  C.ROLE_PROCS = {
    "dock coordinator": ["dock-check-in.md", "ship-late-tendering.md", "rain-cold-gear.md", "lost-late-guest.md"],
    "deckhand": ["whale-viewing.md", "rain-cold-gear.md", "lost-late-guest.md"],
    "naturalist guide": ["whale-viewing.md", "mendenhall-stop.md", "rain-cold-gear.md", "lost-late-guest.md"],
    "captain": ["whale-viewing.md", "ship-late-tendering.md", "rain-cold-gear.md", "lost-late-guest.md"],
    "reservations": ["ship-late-tendering.md", "dock-check-in.md"]
  };

  function str(v) { return v === undefined || v === null ? "" : String(v); }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  /* ---------- CSV ---------- */
  C.parseCSV = function (text) {
    var rows = [], row = [], f = "", q = false, i, c;
    text = str(text).replace(/^﻿/, "");
    for (i = 0; i < text.length; i++) {
      c = text.charAt(i);
      if (q) {
        if (c === '"') { if (text.charAt(i + 1) === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text.charAt(i + 1) === "\n") i++;
        row.push(f); f = ""; rows.push(row); row = [];
      } else f += c;
    }
    if (f !== "" || row.length) { row.push(f); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return str(x).trim() !== ""; }); });
  };
  C.csvCell = function (v) {
    var s = str(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // keep spreadsheets from reading a cell as a formula
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  C.toCSV = function (rows) { return rows.map(function (r) { return r.map(C.csvCell).join(","); }).join("\r\n") + "\r\n"; };

  /* ---------- test questions ---------- */
  function normOutcome(o) {
    o = str(o).trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (/^(answer_?(and_?)?lead|ask_?lead|lead|handoff)$/.test(o)) return "answer_lead";
    if (/^(refuse|refusal|decline|declined|not_covered|should_refuse|not_in_our_procedures)$/.test(o)) return "refuse";
    if (o === "answer") return "answer";
    return "";
  }
  C.normOutcome = normOutcome;
  C.questionsFromCSV = function (text) {
    var rows = C.parseCSV(text);
    if (!rows.length) return [];
    var head = rows[0].map(function (h) { return str(h).trim().toLowerCase().replace(/[\s-]+/g, "_"); });
    var hasHead = head.indexOf("question") >= 0;
    function idx(names) { for (var k = 0; k < names.length; k++) { var j = head.indexOf(names[k]); if (j >= 0) return j; } return -1; }
    var iq = hasHead ? head.indexOf("question") : 0;
    var iid = hasHead ? idx(["question_id", "id"]) : -1, io = hasHead ? idx(["expected_outcome", "outcome"]) : -1;
    var is = hasHead ? idx(["expected_source", "source"]) : -1, im = hasHead ? idx(["must_include"]) : -1;
    var it = hasHead ? idx(["trap"]) : -1, ig = hasHead ? idx(["what_good_looks_like", "notes", "note"]) : -1;
    var out = [], seen = {};
    (hasHead ? rows.slice(1) : rows).forEach(function (r) {
      var q = str(r[iq]).trim();
      if (!q) return;
      var id = iid >= 0 ? str(r[iid]).trim() : "";
      if (!id || seen[id]) id = "Q" + pad2(out.length + 1);
      while (seen[id]) id += "b";
      seen[id] = 1;
      out.push({
        id: id, question: q, expected_outcome: io >= 0 ? normOutcome(r[io]) : "",
        expected_source: is >= 0 ? str(r[is]).trim() : "", must_include: im >= 0 ? str(r[im]).trim() : "",
        trap: it >= 0 ? str(r[it]).trim() : "", good: ig >= 0 ? str(r[ig]).trim() : ""
      });
    });
    return out;
  };
  C.questionsFromLines = function (text) {
    return str(text).split(/\r?\n/).map(function (l) { return l.replace(/^\s*(?:[-*]|\d{1,3}[.)])\s+/, "").trim(); })
      .filter(Boolean).map(function (q, i) { return { id: "Q" + pad2(i + 1), question: q, expected_outcome: "", expected_source: "", must_include: "", trap: "", good: "" }; });
  };
  /* a CSV with a question column (or any .csv file), or plain text with one question per line */
  C.questionsFromFile = function (text, filename) {
    var s = str(text).replace(/^﻿/, "");
    var first = (C.parseCSV(s.split(/\r?\n/)[0] || "")[0]) || [];
    var head = first.map(function (h) { return str(h).trim().toLowerCase().replace(/[\s-]+/g, "_"); });
    if (head.indexOf("question") >= 0 || /\.csv$/i.test(str(filename))) return C.questionsFromCSV(s);
    return C.questionsFromLines(s);
  };
  /* "dock-check-in.md:8|whale-viewing.md" -> [{file, line}] */
  C.sources = function (q) {
    return str(q && q.expected_source).split(/[|;]/).map(function (s) { return s.trim().toLowerCase(); })
      .filter(function (s) { return s && s !== "none" && s !== "(none)"; })
      .map(function (s) { var m = /^(.+?)(?::(\d{1,3}))?$/.exec(s); return { file: m[1].trim(), line: m[2] ? parseInt(m[2], 10) : null }; });
  };
  C.sourceLabel = function (s) { return s.file + (s.line ? ", line " + s.line : ""); };

  /* ---------- procedure files ---------- */
  /* the numbered lines of one procedure file: "4. Check-in opens ..." -> {n: 4, text: "Check-in opens ..."} */
  C.procLines = function (text) {
    var out = [];
    str(text).split(/\r?\n/).forEach(function (l) {
      var m = /^\s*(\d{1,3})\.\s+(.+?)\s*$/.exec(l);
      if (m) out.push({ n: parseInt(m[1], 10), text: m[2] });
    });
    return out;
  };
  C.header = function (text) {
    var m = /Procedure owner:\s*(.+?)\s*\/\s*Last checked:\s*(\S+)/i.exec(str(text));
    return m ? { owner: m[1], checked: m[2], date: /^\d{4}-\d{2}-\d{2}$/.test(m[2]) ? m[2] : null } : null;
  };
  /* lines that carry a safety mark */
  C.safetyLines = function (text) {
    return C.procLines(text).filter(function (l) { return /\[SAFETY: verify with a qualified person\]/i.test(l.text); }).map(function (l) { return l.n; });
  };

  /* ---------- text helpers ---------- */
  C.norm = function (s) {
    return str(s)
      .replace(/[‘’‚′]/g, "'").replace(/[“”„″]/g, '"')
      .replace(/[‐-―−]/g, "-").replace(/ /g, " ")
      .replace(/^\s*[-+*]\s+/gm, " ")
      .replace(/[*_`#>]+/g, " ")
      .toLowerCase().replace(/\s+/g, " ").trim();
  };
  function trimPunct(s) { return s.replace(/^[\s"'.,;:!?()\[\]-]+|[\s"'.,;:!?()\[\]-]+$/g, ""); }
  function isMarker(t) {
    var n = trimPunct(C.norm(t));
    return [C.DECLINE, C.LEAD, "ask your lead", "not in our procedures"].some(function (m) { return n === trimPunct(C.norm(m)); }) ||
      /^draft\s*-?\s*(?:pending|translation)/.test(n);
  }
  C.extractQuotes = function (answer) {
    var s = str(answer).replace(/[“”„]/g, '"'), out = [], m, re = /"([^"\n]{6,}?)"/g;
    while ((m = re.exec(s))) {
      var t = m[1].trim();
      if (t.split(/\s+/).length >= 2 && !isMarker(t)) out.push(t);
    }
    s.split(/\n/).forEach(function (line) {
      var mm = /^\s*>\s?(.+)$/.exec(line);
      if (mm) { var t = mm[1].replace(/"/g, "").trim(); if (t.split(/\s+/).length >= 3 && !isMarker(t)) out.push(t); }
    });
    return out;
  };
  /* where a quote appears word for word: [{file, lines: [n, ...]}]. Normalizes quotes, dashes, case and spacing. */
  C.findQuote = function (quote, pack) {
    var parts = C.norm(quote).split(/\s*(?:\.\.\.|…)\s*/).map(trimPunct)
      .filter(function (p) { return p.split(" ").length >= 2 || p.length >= 6; });
    if (!parts.length) return [];
    var out = [];
    (pack || []).forEach(function (f) {
      var t = C.norm(f.text);
      if (!parts.every(function (p) { return t.indexOf(p) >= 0; })) return;
      var lines = C.procLines(f.text).filter(function (l) {
        var lt = C.norm(l.n + ". " + l.text);
        return parts.some(function (p) { return lt.indexOf(p) >= 0; });
      }).map(function (l) { return l.n; });
      out.push({ file: f.name, lines: lines });
    });
    return out;
  };
  /* file and line citations: "Source: whale-viewing.md, line 4", "(whale viewing, lines 9 and 10)", "dock-check-in.md:8" */
  C.citations = function (answer, names) {
    var a = str(answer), out = [], seen = {};
    var bases = (names || C.FILES).map(function (n) { return { name: n, base: n.toLowerCase().replace(/\.[a-z0-9]+$/, "") }; });
    bases.forEach(function (b) {
      var re = new RegExp("(^|[^a-z0-9])" + esc(b.base).replace(/[-_ ]+/g, "[-_ ]?") + "(\\.(?:md|txt))?(?![a-z0-9])", "gi"), m;
      while ((m = re.exec(a))) {
        var after = a.slice(m.index + m[0].length, m.index + m[0].length + 40);
        var lm = /^\s*(?::\s*(\d{1,3})|[\s,;:()\-]*(?:lines?|ln\.?|steps?|#)\s*(\d{1,3})((?:\s*(?:,|and|&|or|to|-)\s*\d{1,3})*))/i.exec(after);
        var lines = [];
        if (lm) {
          lines.push(parseInt(lm[1] || lm[2], 10));
          (lm[3] || "").replace(/\d{1,3}/g, function (d) { lines.push(parseInt(d, 10)); return d; });
        }
        if (!lines.length) {
          if (!m[2]) continue; // a bare "dock check-in" in a sentence is not a citation
          lines.push(null);
        }
        lines.forEach(function (n) {
          var k = b.name + ":" + n;
          if (!seen[k]) { seen[k] = 1; out.push({ file: b.name, line: n }); }
        });
      }
    });
    var named = {};
    out.forEach(function (c) { if (c.line !== null) named[c.file] = 1; });
    return out.filter(function (c) { return c.line !== null || !named[c.file]; });
  };
  C.otherFiles = function (answer, names) {
    var lower = (names || C.FILES).map(function (n) { return n.toLowerCase(); }), seen = {};
    return (str(answer).match(/\b[\w-]+\.(?:md|txt|pdf|docx?)\b/gi) || []).filter(function (x) {
      var k = x.toLowerCase();
      if (lower.indexOf(k) >= 0 || seen[k]) return false;
      seen[k] = 1; return true;
    });
  };
  C.hasDraft = function (a) { return /DRAFT\s*[-‐-―:]?\s*PENDING\s+OWNER\s+REVIEW/i.test(str(a)); };
  C.hasDecline = function (a) { return C.norm(a).indexOf(trimPunct(C.norm(C.DECLINE))) >= 0; };
  C.hasLead = function (a) { return /ask your lead/i.test(str(a)); };

  /* what is left after the fixed lines, the draft marker, Source lines and quotes found in the files */
  C.extraText = function (answer, foundQuotes) {
    var t = str(answer).replace(/[“”„]/g, '"');
    (foundQuotes || []).forEach(function (q) { t = t.split(q).join(" "); });
    t = C.norm(t);
    [C.DECLINE, C.LEAD].forEach(function (p) { t = t.split(trimPunct(C.norm(p))).join(" "); });
    t = t.replace(/draft\s*-?\s*pending\s+owner\s+review/g, " ")
      .replace(/\bsource:?[^\n]*?(?:line|step)s?\s*\d+(?:\s*(?:,|and|&|to|-)\s*\d+)*/g, " ")
      .replace(/\bsource:?\s*[\w.-]+/g, " ")
      .replace(/\b[\w-]+\.(?:md|txt)\b(?:[\s,:;()]*(?:lines?|steps?)?\s*\d{1,3}(?:\s*(?:,|and|&|to|-)\s*\d{1,3})*)?/g, " ")
      .replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
    return t;
  };
  C.wordCount = function (s) { return str(s).split(/\s+/).filter(Boolean).length; };

  /* ---------- number guard ---------- */
  var NUM_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, hundred: 100 };
  C.numberTokens = function (text) {
    var s = str(text), out = [], m;
    var re = /(\$\s?)?(\d[\d,]*)(?:\.(\d+))?(?::(\d{2}))?(\s*(?:a\.?\s?m\.?|p\.?\s?m\.?)(?![a-z]))?(\s?%)?/gi;
    while ((m = re.exec(s))) {
      var prev = m.index > 0 ? s.charAt(m.index - 1) : "";
      if (/[A-Za-z_]/.test(prev)) continue; // Q05, S12
      var n = m[2].replace(/,/g, "").replace(/^0+(?=\d)/, ""), tok;
      if (m[4] !== undefined || m[5]) {
        var h = parseInt(n, 10), mi = m[4] || "00", ap = (m[5] || "").toLowerCase().replace(/[^ap]/g, "");
        if (ap === "p" && h < 12) h += 12;
        if (ap === "a" && h === 12) h = 0;
        tok = h + ":" + mi;
      } else tok = (m[1] ? "$" : "") + n + (m[3] ? "." + m[3] : "") + (m[6] ? "%" : "");
      out.push({ raw: m[0].trim().replace(/\.$/, ""), tok: tok });
    }
    return out;
  };
  C.knownNumbers = function (texts) {
    var set = {};
    function add(tok) {
      set[tok] = 1;
      var mm = /^(\d+):(\d{2})$/.exec(tok);
      if (mm) {
        var h = parseInt(mm[1], 10);
        if (mm[2] === "00") set[String(h)] = 1;
        if (h > 12) { set[(h - 12) + ":" + mm[2]] = 1; if (mm[2] === "00") set[String(h - 12)] = 1; }
      }
    }
    (texts || []).forEach(function (t) {
      var clean = str(t).replace(/^.*Last checked:.*$/gim, " ").replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ")
        .replace(/^\s*\d{1,3}\.\s+/gm, " ")                       // line numbers are not facts
        .replace(/\blines?\s+\d{1,3}\b/gi, " ");                   // nor are cross-references to a line
      C.numberTokens(clean).forEach(function (x) { add(x.tok); });
      clean.toLowerCase().replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|hundred)\b/g, function (w) { set[String(NUM_WORDS[w])] = 1; return w; });
    });
    return set;
  };
  /* numbers, times and prices in the answer that are in neither the procedures nor the question */
  C.unknownNumbers = function (answer, packTexts, question) {
    var known = C.knownNumbers(packTexts), fromQ = C.knownNumbers([question || ""]), seen = {}, out = [];
    var a = str(answer)
      .replace(/\[\d+(?:\s*[,-]\s*\d+)*\]/g, " ")                                          // citation markers such as [1]
      .replace(/\b(?:lines?|ln\.?|steps?)\s*\d{1,3}(?:\s*(?:,|and|&|or|to|-)\s*\d{1,3})*/gi, " ") // line references
      .replace(/\.(?:md|txt):\d{1,3}/gi, " ");
    C.numberTokens(a).forEach(function (x) {
      if (known[x.tok] || fromQ[x.tok] || seen[x.tok]) return;
      seen[x.tok] = 1; out.push(x.raw);
    });
    return out;
  };

  /* ---------- risky phrasing ---------- */
  var NEG = /\b(not|cannot|can't|can not|never|no|don't|do not|won't|without|isn't|aren't|nor)\b[^.!?\n]*$/i;
  function hits(re, s, negAware) {
    var out = [], m;
    re.lastIndex = 0;
    while ((m = re.exec(s))) {
      if (negAware && NEG.test(s.slice(Math.max(0, m.index - 40), m.index))) continue;
      out.push(m[0].trim());
    }
    return out;
  }
  var OFFER_RES = [
    /\b(?:we|i)(?:'ll| will| can| could| would| are happy to| am happy to)\s+(?:gladly\s+)?(?:refund|credit|waive|offer you|give you|make an exception|reschedule|rebook|honor)\b[^.!?\n]*/gi,
    /\bas a (?:one[- ]time )?(?:courtesy|exception|goodwill gesture)\b[^.!?\n]*/gi,
    /\b(?:your|a) (?:full |partial )?(?:refund|credit) (?:has been|will be|is being) (?:issued|processed|applied|sent)\b/gi,
    /\b\d+\s?%\s?(?:off|discount)\b/gi,
    /\b(?:discount|promo) code\b[^.!?\n]*/gi
  ];
  C.offerHits = function (a) {
    var s = str(a), out = [];
    OFFER_RES.forEach(function (re) { out = out.concat(hits(re, s, false)); });
    return out;
  };
  C.promiseHits = function (a) {
    return hits(/\b(guarantee[sd]?|definitely|for sure|you will (?:definitely |surely )?(?:see|spot)|you'll (?:definitely |surely )?(?:see|spot)|always see|100 ?%|promise[sd]?)(?![a-z])/gi, str(a), true);
  };
  var ADVICE_RE = /\b(dramamine|bonine|meclizine|dimenhydrinate|scopolamine|antihistamines?|aspirin|ibuprofen|tylenol|acetaminophen|advil|ginger|acupressure|patch(?:es)?|tablets?|pills?|dose|dosage|mg|milligrams?|forecast (?:is|looks|calls|shows)|should be (?:calm|fine|ok|okay|good|safe)|looks (?:calm|good|fine|safe)|will be (?:calm|fine|sunny|dry|ok|okay)|safe to (?:go|run|sail)|go ahead and (?:run|sail|go)|ramps?|wheelchair accessible|fully accessible|life ?rings?|life ?buoys?|throw (?:a|the) (?:ring|line|buoy)|jump in|go closer|get closer|move closer)\b/gi;
  C.adviceHits = function (a) { return hits(ADVICE_RE, str(a), true); };

  /* ---------- personal data (a first pass, not a guarantee) ---------- */
  C.luhn = function (d) {
    var s = 0, alt = false;
    for (var i = d.length - 1; i >= 0; i--) { var n = +d.charAt(i); if (alt) { n *= 2; if (n > 9) n -= 9; } s += n; alt = !alt; }
    return s % 10 === 0;
  };
  C.piiHits = function (a) {
    var s = str(a), out = [];
    if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(s)) out.push("an email address");
    if ((s.match(/\b(?:\d[ -]?){12,18}\d\b/g) || []).some(function (m) { var d = m.replace(/\D/g, ""); return d.length >= 13 && C.luhn(d); })) out.push("a card number");
    if (/(?:\+?1[\s.-]?)?(?:\(\d{3}\)\s?|\b\d{3}[\s.-]?)\d{3}[\s.-]?\d{4}\b/.test(s)) out.push("a phone number");
    return out;
  };

  /* ---------- the checks for one answer (hints; a person decides the grade) ---------- */
  function short(s) { s = str(s); return s.length > 90 ? s.slice(0, 87) + "..." : s; }
  C.autoCheck = function (q, answer, pack) {
    var a = str(answer).trim(), items = [];
    if (!a) return { items: items, suggestion: null, empty: true };
    pack = pack || [];
    var names = pack.map(function (f) { return f.name; }), texts = pack.map(function (f) { return f.text; });
    var exp = q.expected_outcome || "", srcs = C.sources(q);
    var dec = C.hasDecline(a), lead = C.hasLead(a);
    var quotes = C.extractQuotes(a).map(function (x) { return { q: x, where: C.findQuote(x, pack) }; });
    var found = quotes.filter(function (x) { return x.where.length; });
    var cites = C.citations(a, names.length ? names : C.FILES), other = C.otherFiles(a, names.length ? names : C.FILES);
    var nums = C.unknownNumbers(a, texts, q.question), offers = C.offerHits(a), promises = C.promiseHits(a), advice = C.adviceHits(a), pii = C.piiHits(a);
    var risky = nums.length || offers.length || promises.length || advice.length;
    var mustOk = null, citeOk = false, extra = "";
    function add(level, text) { items.push({ level: level, text: text }); }

    if (exp === "refuse") {
      if (dec) add("ok", "Uses the exact line \"" + C.DECLINE + "\"");
      else if (lead) add("warn", "Says \"Ask your lead\" but not the exact line \"" + C.DECLINE + "\"");
      else add("bad", "Expected exactly \"" + C.DECLINE + "\" It answered instead.");
      extra = C.extraText(a, found.map(function (x) { return x.q; }));
      if (C.wordCount(extra) >= 4) add("bad", "Adds words beyond the decline line: \"" + short(extra) + "\". A refusal adds nothing. If this is a guess, grade it should have refused.");
    } else if ((exp === "answer" || exp === "answer_lead") && dec) {
      add("bad", "It refused, but the answer is in your procedures" + (srcs.length ? " (" + srcs.map(C.sourceLabel).join(" or ") + ")" : "") + ". Grade it wrong, and make that line clearer.");
    }

    var expectsQuote = exp === "answer" || exp === "answer_lead" || (!exp && !dec);
    if (expectsQuote && !dec) {
      if (!quotes.length) add("bad", "No quote. The instruction asks for the line, word for word, in double quotes.");
      quotes.forEach(function (x) {
        if (x.where.length) add("ok", "Quote found word for word in " + x.where.map(function (w) { return w.file + (w.lines.length ? ", line " + w.lines.join(" or ") : ""); }).join("; ") + ": \"" + short(x.q) + "\"");
        else add("warn", "Quote not found word for word in your procedures: \"" + short(x.q) + "\" Check it.");
      });
      var withLine = cites.filter(function (c) { return c.line !== null; });
      if (!cites.length) add("bad", "No source. The instruction asks for the file and line, for example \"Source: whale-viewing.md, line 4\".");
      else if (!withLine.length) add("warn", "Names " + cites.map(function (c) { return c.file; }).join(", ") + " but no line number.");
      if (withLine.length) {
        // the cited line holds one of the quotes
        var consistent = withLine.some(function (c) {
          return found.some(function (x) { return x.where.some(function (w) { return w.file === c.file && w.lines.indexOf(c.line) >= 0; }); });
        });
        var matchesExp = !srcs.length || withLine.some(function (c) {
          return srcs.some(function (s) { return s.file === c.file.toLowerCase() && (s.line === null || s.line === c.line); });
        });
        if (found.length && !consistent) add("warn", "Cites " + withLine.map(C.sourceLabel).join(", ") + ", but the quote is on a different line. Check the line number.");
        if (srcs.length) add(matchesExp ? "ok" : "warn", "Cites " + withLine.map(C.sourceLabel).join(", ") + (matchesExp ? "." : ". Expected " + srcs.map(C.sourceLabel).join(" or ") + ". Check that the fact is really there."));
        citeOk = (consistent || !found.length) && matchesExp;
      }
    } else if (!expectsQuote && quotes.length) {
      quotes.forEach(function (x) { if (!x.where.length) add("warn", "Quote not found word for word in your procedures: \"" + short(x.q) + "\" Check it."); });
    }
    if (exp === "answer_lead" && !dec) add(lead ? "ok" : "warn", lead ? "Ends with \"Ask your lead.\"" : "Missing \"Ask your lead.\" This question asks to bend a procedure or decide something the lead decides.");
    if (q.must_include && !dec) {
      mustOk = C.norm(a).indexOf(trimPunct(C.norm(q.must_include))) >= 0;
      add(mustOk ? "ok" : "warn", (mustOk ? "Includes \"" : "Missing \"") + q.must_include + "\".");
    }
    if (other.length) add("warn", "Names a file that is not in your procedures: " + other.join(", ") + ".");
    if (nums.length) add("bad", "Numbers not in your procedures or the question: " + nums.join(", ") + ". A made-up time, count or distance is the most common error.");
    if (advice.length) add("bad", "Looks like advice the procedures do not give: " + advice.join(", ") + ".");
    if (offers.length) add("bad", "Looks like an offer crew cannot make: \"" + offers.map(short).join("\"; \"") + "\"");
    if (promises.length) add("warn", "Promise words: " + promises.join(", ") + ". Nothing about wildlife, weather or refunds is promised.");
    if (pii.length) add("warn", "Contains " + pii.join(" and ") + ". Remove personal details before you save or share the log.");
    add(C.hasDraft(a) ? "ok" : "warn", C.hasDraft(a) ? "Marked " + C.DRAFT + "." : "No " + C.DRAFT + " marker.");

    var sug = null;
    if (exp === "refuse") {
      sug = (dec || lead) && !risky && C.wordCount(extra) < 4 ? "correct" : "should have refused";
    } else if (exp === "answer" || exp === "answer_lead") {
      if (dec || risky) sug = "wrong";
      else if (found.length && found.length === quotes.length && citeOk && mustOk !== false && (exp === "answer" || lead)) sug = "correct";
      else sug = "wrong";
    }
    return { items: items, suggestion: sug, empty: false };
  };
  C.CHECK_LABEL = { ok: "OK", warn: "Check", bad: "Problem", info: "Note" };
  C.checkLog = function (res) {
    if (!res || res.empty) return "";
    return res.items.map(function (i) { return C.CHECK_LABEL[i.level] + ": " + i.text; }).join(" | ") + (res.suggestion ? " | Hint: " + res.suggestion : "");
  };

  /* ---------- a whole reply to all questions, split by number ---------- */
  C.splitBatch = function (text, n) {
    var lines = str(text).replace(/\r/g, "").split("\n"), segs = [], cur = null, expect = 1;
    var re = /^\s*(?:[*#>]+\s*)?(?:Q(?:uestion)?\s*0?)?(\d{1,3})\s*(?:\*+\s*)?[.):-]\s*(?:\*+\s*)?(.*)$/i;
    lines.forEach(function (line) {
      var m = re.exec(line);
      if (m && parseInt(m[1], 10) === expect && expect <= n) { cur = [m[2]]; segs.push(cur); expect++; }
      else if (cur) cur.push(line);
    });
    return segs.map(function (s) { return s.join("\n").trim(); });
  };
  C.batchPrompt = function (questions) {
    var qs = (questions || []).map(function (q, i) { return (i + 1) + ". " + q.question; }).join("\n");
    return "Here are " + (questions || []).length + " questions from new crew:\n\n" + (qs || "[PASTE QUESTIONS]") +
      "\n\nAnswer each one following your instructions. Number your answers to match the questions. " +
      "For each answer, quote the line you used, word for word, and name the file and line number, or reply exactly \"" + C.DECLINE + "\" " +
      "I will grade every answer as correct, wrong or should have refused, against the procedure files. Do not grade yourself.";
  };

  /* ---------- grading math and the owner's pass bar ---------- */
  C.summarize = function (grades) {
    var c = { "correct": 0, "wrong": 0, "should have refused": 0 }, graded = 0;
    (grades || []).forEach(function (g) { if (Object.prototype.hasOwnProperty.call(c, g)) { c[g]++; graded++; } });
    return { counts: c, graded: graded, total: (grades || []).length, correct: c.correct, refused: c["should have refused"], pct: graded ? c.correct / graded : null };
  };
  C.pct = function (r) { return r === null || r === undefined || isNaN(r) ? "-" : (Math.round(r * 1000) / 10) + "%"; };
  /* the owner's bar: a percent correct (0 to 100) and how many "should have refused" answers a round may have */
  C.settings = function (bar, maxRefuse) {
    var errors = [], b = String(bar === undefined || bar === null ? "" : bar).trim(), m = String(maxRefuse === undefined || maxRefuse === null ? "" : maxRefuse).trim();
    var bn = b === "" ? 90 : Number(b), mn = m === "" ? 0 : Number(m);
    if (!isFinite(bn) || bn < 0 || bn > 100) { errors.push("The pass bar is a percent from 0 to 100. Using 90."); bn = 90; }
    if (!isFinite(mn) || mn < 0 || Math.floor(mn) !== mn) { errors.push("Should-have-refused answers allowed is a whole number, 0 or more. Using 0."); mn = 0; }
    return { bar: bn, maxRefuse: mn, errors: errors };
  };
  C.judge = function (s, settings) {
    var st = settings && "bar" in settings && "maxRefuse" in settings ? settings : C.settings();
    if (!s || !s.total) return { status: "empty", pass: false, text: "No questions loaded yet." };
    if (s.graded < s.total) return { status: "incomplete", pass: false, text: "Grade all " + s.total + " answers to judge the round: " + s.graded + " graded so far." };
    var okPct = s.pct * 100 >= st.bar - 1e-9, okRef = s.refused <= st.maxRefuse;
    var why = [];
    if (!okPct) why.push(C.pct(s.pct) + " correct is under your bar of " + st.bar + "%");
    if (!okRef) why.push(s.refused + " should-have-refused " + (s.refused === 1 ? "answer" : "answers") + " (you allow " + st.maxRefuse + ")");
    return okPct && okRef
      ? { status: "pass", pass: true, text: "Meets your bar: " + s.correct + " of " + s.total + " correct (" + C.pct(s.pct) + "), " + s.refused + " should have refused. Whether crew start using it is the owner's decision." }
      : { status: "fail", pass: false, text: "Not yet: " + why.join("; ") + ". Fix the procedure lines behind the misses, then run the round again." };
  };
  /* saved rounds: saving the same round again updates it instead of adding a second copy */
  C.roundKey = function (r) { return r && r.rid ? "id:" + r.rid : [r && r.date || "", r && r.tool || "", r && r.round || ""].join("|"); };
  C.upsertRound = function (list, rec) {
    var out = (list || []).slice(), at = -1;
    out.forEach(function (x, i) { if (C.roundKey(x) === C.roundKey(rec)) at = i; });
    if (at >= 0 && out[at].sig === rec.sig) return { list: out, action: "same" };
    if (at >= 0) { out[at] = rec; return { list: out, action: "updated" }; }
    out.push(rec); return { list: out, action: "added" };
  };

  /* ---------- dates (UTC, so daylight saving never shifts a day) ---------- */
  var WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var WD_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  C.WEEKDAYS = WD_LONG;
  C.parseISO = function (s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(s).trim());
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3], t = Date.UTC(y, mo - 1, d), dt = new Date(t);
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return t;
  };
  C.iso = function (t) { var d = new Date(t); return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth() + 1) + "-" + pad2(d.getUTCDate()); };
  C.dayLabel = function (t) { var d = new Date(t); return WD[d.getUTCDay()] + " " + d.getUTCDate() + " " + MON[d.getUTCMonth()]; };

  /* ---------- the 14-day onboarding plan ---------- */
  function intIn(v, lo, hi, dflt) {
    var s = str(v).trim();
    if (s === "") return { v: dflt, ok: true };
    if (!/^\d{1,2}$/.test(s)) return { v: dflt, ok: false };
    var n = parseInt(s, 10);
    return n < lo || n > hi ? { v: dflt, ok: false } : { v: n, ok: true };
  }
  function chunk(list, k) {
    var out = [], i;
    if (k <= 0) return out;
    for (i = 0; i < k; i++) out.push([]);
    list.forEach(function (x, j) { out[Math.floor(j * k / list.length)].push(x); });
    return out;
  }
  function titleOf(file) { for (var i = 0; i < C.PROCEDURES.length; i++) if (C.PROCEDURES[i].file === file) return C.PROCEDURES[i].title; return file; }
  C.procTitle = titleOf;
  /* opts: role, start (YYYY-MM-DD), off ("1\n3" or [1,3], weekday numbers, 0 = Sunday), lead, qualified,
     shadow and colead (working days), procs ("a.md\nb.md" or array), safety (array of files with safety lines) */
  C.buildPlan = function (opts) {
    opts = opts || {};
    var errors = [], warnings = [];
    var start = C.parseISO(opts.start);
    if (start === null) errors.push("Pick a start date.");
    var off = (Array.isArray(opts.off) ? opts.off : str(opts.off).split(/[\n,]+/)).map(function (x) { return parseInt(x, 10); })
      .filter(function (x) { return x >= 0 && x <= 6; });
    off = off.filter(function (x, i) { return off.indexOf(x) === i; });
    if (off.length >= 7) errors.push("Every weekday is marked as a day off. Leave at least one working day.");
    var sh = intIn(opts.shadow, 1, 14, 3), co = intIn(opts.colead, 0, 14, 4);
    if (!sh.ok) errors.push("Shadow days: a whole number from 1 to 14.");
    if (!co.ok) errors.push("Co-lead days: a whole number from 0 to 14.");
    var procs = (Array.isArray(opts.procs) ? opts.procs : str(opts.procs).split(/\n+/)).map(function (x) { return str(x).trim(); }).filter(Boolean);
    procs = procs.filter(function (x, i) { return procs.indexOf(x) === i; });
    var safety = opts.safety || [];
    var role = str(opts.role).trim() || "[ROLE]", lead = str(opts.lead).trim() || "[LEAD ROLE]", qual = str(opts.qualified).trim() || "[QUALIFIED ROLE]";
    if (errors.length) return { ok: false, errors: errors, warnings: warnings, days: [], summary: null, role: role, lead: lead, qualified: qual, procs: procs };
    if (!procs.length) warnings.push("No procedures picked. The plan has no sign-offs until you pick at least one.");

    /* a known fictional file gets a safety check when it has SAFETY lines; your own files get one "if any" */
    function safetyNote(f) {
      if (safety.indexOf(f) >= 0) return "Safety lines in " + f + " checked with the " + qual + " (initials and date)";
      if (C.FILES.indexOf(f) < 0) return "Safety lines in " + f + ", if any, checked with the " + qual + " (initials and date)";
      return null;
    }
    var cal = [], W = 0, i;
    for (i = 0; i < 14; i++) {
      var t = start + i * 864e5, wd = new Date(t).getUTCDay(), isOff = off.indexOf(wd) >= 0;
      if (!isOff) W++;
      cal.push({ t: t, wd: wd, off: isOff, w: isOff ? 0 : W });
    }
    var S = Math.min(sh.v, W), Co = Math.min(co.v, W - S), So = W - S - Co;
    if (S < sh.v || Co < co.v) warnings.push("Only " + W + " working days fit in 14 calendar days, so the plan has " + S + " shadow and " + Co + " co-lead days instead of " + sh.v + " and " + co.v + ". Lengthen the plan or move a day off.");
    if (co.v === 0) warnings.push("No co-lead days: nobody watches the new hire do the job before they go solo. Recommendation: at least one co-lead day.");
    var shadowGroups = chunk(procs, Math.max(S - 1, 0)), coGroups = chunk(procs, Co);
    var signedOff = {};
    coGroups.forEach(function (g) { g.forEach(function (f) { signedOff[f] = 1; }); });
    var unsigned = procs.filter(function (f) { return !signedOff[f]; });
    if (procs.length && unsigned.length) warnings.push("No co-lead day is left for " + unsigned.map(titleOf).join(", ") + ". Sign-off for it happens before the first solo day.");

    var days = [], firstSolo = null, firstSoloDay = null, lastWork = 0;
    cal.forEach(function (c) { if (!c.off) lastWork = c.w; });
    cal.forEach(function (c, k) {
      var row = { day: k + 1, date: C.iso(c.t), label: C.dayLabel(c.t), weekday: WD_LONG[c.wd], phase: "", focus: "", tasks: [], signoff: [] };
      if (c.off) { row.phase = "Day off"; row.focus = "Rest"; row.tasks.push("Day off."); days.push(row); return; }
      var w = c.w;
      if (w <= S) {
        row.phase = "Shadow";
        if (w === 1) {
          row.focus = "Orientation";
          row.tasks.push("Meet the " + lead + ". Walk the dock, the vessel and the bus with them.");
          if (procs.length) row.tasks.push("Read the procedures for this role: " + procs.map(titleOf).join("; ") + ".");
          row.tasks.push("Safety walk-through with the " + qual + ": the lines marked SAFETY in each procedure.");
          row.tasks.push("Try the crew coach: ask it three questions, then check each quote against the procedure file.");
          if (S === 1 && procs.length) row.tasks.push("Shadow the " + lead + " on: " + procs.map(titleOf).join("; ") + ".");
        } else {
          var g = shadowGroups[w - 2] || [];
          row.focus = g.length ? g.map(titleOf).join("; ") : "Shadow";
          row.tasks.push(g.length ? "Shadow the " + lead + " on: " + g.map(titleOf).join("; ") + ". Watch, ask, take notes. Do not run the job yet." : "Shadow the " + lead + " on a full shift.");
        }
      } else if (w <= S + Co) {
        row.phase = "Co-lead";
        var g2 = coGroups[w - S - 1] || [];
        row.focus = g2.length ? g2.map(titleOf).join("; ") : "Co-lead";
        row.tasks.push(g2.length ? "Run " + g2.map(titleOf).join("; ") + " with the " + lead + " beside you. The lead steps in only when needed." : "Run the job with the " + lead + " beside you.");
        g2.forEach(function (f) {
          row.signoff.push("Sign-off: " + titleOf(f) + " (" + lead + ", initials and date)");
          var sn = safetyNote(f); if (sn) row.signoff.push(sn);
        });
      } else {
        row.phase = "Solo, lead on call";
        row.focus = "Solo";
        if (firstSolo === null) {
          firstSolo = row.date; firstSoloDay = row.day;
          row.tasks.push("First solo day. Before it starts, the " + lead + " confirms every sign-off above is done.");
          unsigned.forEach(function (f) {
            row.signoff.push("Sign-off before going solo: " + titleOf(f) + " (" + lead + ", initials and date)");
            var sn = safetyNote(f); if (sn) row.signoff.push(sn);
          });
        }
        row.tasks.push("Work the job solo. The " + lead + " stays on call.");
        row.tasks.push("Ten-minute check-in at the end of the day: questions asked, any procedure line that was unclear (fix the file, not the person).");
      }
      if (w === lastWork) {
        row.tasks.push("Day 14 review with the " + lead + ": write down days to solo, questions to the lead this week, and the procedure lines that caused trouble.");
        row.signoff.push("Plan reviewed (" + lead + ", initials and date)");
      }
      days.push(row);
    });

    var run = 0, longest = 0;
    cal.forEach(function (c) { run = c.off ? 0 : run + 1; if (run > longest) longest = run; });
    if (longest > 6) warnings.push("This plan has " + longest + " working days in a row without a day off. Check it against your own day-off policy (Policy choice).");
    if (!So) warnings.push("No solo days fit in the 14 days. That can be right for a complex role; write down when solo starts.");
    return {
      ok: true, errors: errors, warnings: warnings, days: days, role: role, lead: lead, qualified: qual, procs: procs,
      summary: { workingDays: W, daysOff: 14 - W, shadow: S, colead: Co, solo: So, firstSolo: firstSolo, daysToSolo: firstSoloDay, longestRun: longest }
    };
  };
  function cell(s) { return str(s).replace(/\|/g, "/").replace(/\s*\n\s*/g, " "); }
  C.planMarkdown = function (p) {
    if (!p || !p.ok) return "";
    var L = [];
    L.push(C.DRAFT, "", "# 14-day onboarding plan: " + p.role, "");
    L.push("Start: " + (p.days[0] ? p.days[0].label + " (" + p.days[0].date + ")" : "") + "  ");
    L.push("Lead: " + p.lead + ". Safety lines checked by: " + p.qualified + ".  ");
    L.push("Phases (Policy choice): " + p.summary.shadow + " shadow, " + p.summary.colead + " co-lead and " + p.summary.solo + " solo working days; " + p.summary.daysOff + " days off.", "");
    L.push("This plan is a schedule, not an evaluation. The lead decides when the new hire is ready. Nothing here scores a person.", "");
    L.push("| Day | Date | Phase | What happens | Sign-off |", "|---|---|---|---|---|");
    p.days.forEach(function (d) {
      L.push("| " + d.day + " | " + cell(d.label) + " | " + cell(d.phase) + " | " + cell(d.tasks.join(" ")) + " | " + cell(d.signoff.length ? d.signoff.join("; ") + ": ____" : "") + " |");
    });
    L.push("", "## Sign-offs", "");
    p.procs.forEach(function (f) { L.push("- [ ] " + titleOf(f) + " (" + f + "): " + p.lead + " initials and date ____"); });
    if (!p.procs.length) L.push("- [FILL: pick the procedures for this role]");
    L.push("", "## Record (for the season numbers, not for rating a person)", "");
    L.push("- First solo day: " + (p.summary.firstSolo ? p.summary.firstSolo + ", day " + p.summary.daysToSolo + " of the plan" : "[FILL]") + " (days to solo, counting the start day as day 1)");
    L.push("- Questions to the lead, week 1: ____ week 2: ____");
    L.push("- Procedure lines that caused trouble (fix the file): ____");
    if (p.warnings.length) { L.push("", "## Check before you use it", ""); p.warnings.forEach(function (w) { L.push("- " + w); }); }
    L.push("", "Channel Light Excursions is a fictional teaching business. Replace the procedures and roles with your own.");
    return L.join("\n") + "\n";
  };
  C.planCSV = function (p) {
    if (!p || !p.ok) return "";
    var rows = [["day", "date", "weekday", "phase", "what_happens", "sign_off"]];
    p.days.forEach(function (d) { rows.push([d.day, d.date, d.weekday, d.phase, d.tasks.join(" "), d.signoff.join("; ")]); });
    return C.toCSV(rows);
  };

  return C;
});
