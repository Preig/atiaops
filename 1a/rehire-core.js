/* 1.a Rehire before you recruit: pure logic. No page access, no storage, no network.
 * Used by index.html (as window.RehireCore) and by the Node tests in dev/ (require).
 * Keyword tagging is a hint for a person to read, not an analysis, and it never looks at individuals.
 */
(function (root) {
  "use strict";
  var R = {};

  /* ---------- themes and keywords (editable on the page) ----------
   * A keyword matches at the start of a word: "hour" finds "hours" and "12-hour", "rent" does not find "parent". */
  R.DEFAULT_THEMES = [
    { key: "housing", name: "Housing", kw: ["housing", "rent", "room", "bed", "apartment", "cabin", "dorm", "place to live", "lease", "kitchen", "commute"] },
    { key: "hours", name: "Hours and schedule", kw: ["hour", "schedul", "shift", "day off", "days off", "in a row", "overtime", "weekend"] },
    { key: "pay", name: "Pay", kw: ["pay", "paid", "wage", "bonus", "tip", "salary", "money", "raise", "cost of living"] },
    { key: "training", name: "Training", kw: ["train", "learn", "shadow", "checklist", "procedure", "nobody told", "no one told", "onboard", "orientation", "routine"] },
    { key: "leads", name: "Leads and feedback", kw: ["lead", "feedback", "manager", "boss", "supervisor", "respect", "praise", "recogni", "yelled", "micromanag"] },
    { key: "work", name: "The work itself", kw: ["script", "guest", "whale", "wildlife", "seasick", "rough water", "the work", "the job itself", "material", "boring", "stale", "repetitive"] },
    { key: "life", name: "Life events", kw: ["family", "school", "college", "university", "year-round", "moving", "personal reason", "wedding", "baby"] }
  ];

  function str(v) { return v === undefined || v === null ? "" : String(v); }
  function clean(s, max) { return str(s).replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max || 500); }
  R.clean = clean;
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function slug(s) { return clean(s, 60).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "theme"; }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function round(n, d) { var f = Math.pow(10, d || 0); return Math.round((n + 1e-9) * f) / f; }
  R.esc = function (s) { return str(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  R.themesText = function (themes) { return themes.map(function (t) { return t.name + ": " + t.kw.join(", "); }).join("\n"); };
  /* "Theme name: keyword, keyword" per line. Returns usable themes and the lines it could not use. */
  R.parseThemes = function (text) {
    var themes = [], errors = [], seen = {};
    str(text).split(/\r?\n/).forEach(function (line, i) {
      var s = line.trim();
      if (!s) return;
      var m = /^([^:]{1,60}):(.*)$/.exec(s);
      if (!m) { errors.push("Line " + (i + 1) + ": write it as Theme: keyword, keyword"); return; }
      var name = clean(m[1], 60), kw = m[2].split(/[,;]/).map(function (k) { return k.trim().toLowerCase(); }).filter(function (k) { return k.length >= 2; });
      if (!name) { errors.push("Line " + (i + 1) + ": the theme needs a name"); return; }
      if (!kw.length) { errors.push("Line " + (i + 1) + ": " + name + " needs at least one keyword of 2 letters or more"); return; }
      var key = slug(name);
      R.DEFAULT_THEMES.forEach(function (d) { if (d.name.toLowerCase() === name.toLowerCase()) key = d.key; });
      if (seen[key]) { seen[key].kw = seen[key].kw.concat(kw.filter(function (k) { return seen[key].kw.indexOf(k) < 0; })); return; }
      var t = { key: key, name: name, kw: kw };
      seen[key] = t; themes.push(t);
    });
    return { themes: themes, errors: errors };
  };
  function themeRes(t) {
    if (!t._re) t._re = t.kw.map(function (k) { return new RegExp("(?:^|[^a-z0-9])" + escRe(k.toLowerCase()), "i"); });
    return t._re;
  }
  R.tagNote = function (text, themes) {
    var out = [], s = str(text);
    themes.forEach(function (t) {
      var hits = [];
      themeRes(t).forEach(function (re, i) { if (re.test(s)) hits.push(t.kw[i]); });
      if (hits.length) out.push({ key: t.key, name: t.name, hits: hits });
    });
    return out;
  };

  /* ---------- reading the notes ---------- */
  R.parseCSV = function (text) {
    var rows = [], row = [], f = "", q = false, i, c, s = str(text).replace(/^﻿/, "");
    for (i = 0; i < s.length; i++) {
      c = s[i];
      if (q) {
        if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"' && f.trim() === "") { q = true; f = ""; }
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && s[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
      else f += c;
    }
    if (f !== "" || row.length) { row.push(f); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return x.trim() !== ""; }); });
  };
  function normWR(x) {
    var s = clean(x, 20).toLowerCase();
    if (/^(yes|y)$/.test(s)) return "yes";
    if (/^(maybe|m|unsure|not sure)$/.test(s)) return "maybe";
    if (/^(no|n)$/.test(s)) return "no";
    return "";
  }
  var NOTE_COLS = ["note", "notes", "text", "comment", "comments", "reason", "reasons"];
  R.parseNotes = function (text) {
    var t = str(text).trim();
    if (!t) return { notes: [], format: "empty", dropped: [] };
    var first = t.split(/\r?\n/)[0].toLowerCase();
    var head0 = first.split(",").map(function (h) { return h.trim().replace(/^"|"$/g, ""); });
    var hasNoteCol = head0.some(function (h) { return NOTE_COLS.indexOf(h) >= 0; });
    if (head0.length > 1 && hasNoteCol) {
      var rows = R.parseCSV(t), head = rows[0].map(function (h) { return h.trim().toLowerCase(); });
      var iNote = -1;
      NOTE_COLS.some(function (n) { iNote = head.indexOf(n); return iNote >= 0; });
      var iId = head.indexOf("note_id") >= 0 ? head.indexOf("note_id") : head.indexOf("id");
      var iRole = head.indexOf("role");
      var iRet = -1;
      head.forEach(function (h, i) { if (iRet < 0 && /return/.test(h)) iRet = i; });
      var used = [iNote, iId, iRole, iRet];
      var dropped = head.filter(function (h, i) { return used.indexOf(i) < 0 && h; });
      var notes = [];
      rows.slice(1).forEach(function (r) {
        var txt = clean(r[iNote], 500);
        if (!txt) return;
        notes.push({ id: clean(iId >= 0 ? r[iId] : "", 20) || "N" + pad2(notes.length + 1), role: clean(iRole >= 0 ? r[iRole] : "", 40), wr: iRet >= 0 ? normWR(r[iRet]) : "", text: txt });
      });
      return { notes: notes, format: "csv", dropped: dropped };
    }
    var out = [];
    t.split(/\r?\n/).forEach(function (line) {
      var s = line.trim().replace(/^(?:[-*•]|\d{1,3}[.)]|N\d{1,3}[.):,]?)\s+/i, "");
      if (!s) return;
      var wr = "", m = /^(yes|maybe|no)\s*[:|]\s*(.+)$/i.exec(s);
      if (m) { wr = m[1].toLowerCase(); s = m[2]; }
      s = clean(s, 500);
      if (s) out.push({ id: "N" + pad2(out.length + 1), role: "", wr: wr, text: s });
    });
    return { notes: out, format: "lines", dropped: [] };
  };

  /* ---------- privacy: remove contact details, flag possible names ---------- */
  R.scrub = function (text) {
    var found = {}, s = str(text);
    s = s.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, function () { found["an email address"] = 1; return "[EMAIL REMOVED]"; });
    s = s.replace(/\bhttps?:\/\/\S+|\bwww\.\S+/gi, function () { found["a link"] = 1; return "[LINK REMOVED]"; });
    s = s.replace(/(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, function () { found["a phone number"] = 1; return "[PHONE REMOVED]"; });
    s = s.replace(/\b\d{8,}\b/g, function () { found["a long number"] = 1; return "[NUMBER REMOVED]"; });
    return { text: s, found: Object.keys(found) };
  };
  var ALLOW = {};
  ("I OK OTA ATIA Alaska Alaskan Juneau Anchorage Fairbanks Seward Ketchikan Sitka Skagway Haines Homer Kenai Valdez Whittier Kodiak Denali " +
   "Mendenhall Auke Bay Glacier Douglas Gastineau Channel Light Excursions Kestrel Shuttle Tern Point Lodge Ship " +
   "January February March April May June July August September October November December Monday Tuesday Wednesday Thursday Friday Saturday Sunday " +
   "English Spanish US USA America American Coast Guard NOAA").split(" ").forEach(function (w) { ALLOW[w] = 1; });
  R.possibleNames = function (text) {
    var s = str(text), out = [], m;
    var mid = /[a-z0-9,;]\s+([A-Z][a-z]{1,20})\b/g;
    while ((m = mid.exec(s))) if (!ALLOW[m[1]] && out.indexOf(m[1]) < 0) out.push(m[1]);
    var role = /\b(?:[Cc]aptain|[Cc]apt\.|[Ll]ead|[Mm]anager|[Bb]oss|[Ss]upervisor)\s+([A-Z][a-z]{1,20})\b/g;
    while ((m = role.exec(s))) if (!ALLOW[m[1]] && out.indexOf(m[1]) < 0) out.push(m[1]);
    return out;
  };

  /* ---------- the Pareto ---------- */
  R.FILTERS = { all: "everyone", yesmaybe: "would return: yes or maybe", yes: "would return: yes", maybe: "would return: maybe", no: "would return: no" };
  function keep(wr, f) {
    if (!f || f === "all") return true;
    if (f === "yesmaybe") return wr === "yes" || wr === "maybe";
    return wr === f;
  }
  R.split = function (notes) {
    var s = { yes: 0, maybe: 0, no: 0, unknown: 0, total: notes.length };
    notes.forEach(function (n) { if (n.wr === "yes" || n.wr === "maybe" || n.wr === "no") s[n.wr]++; else s.unknown++; });
    return s;
  };
  R.pareto = function (notes, themes, filter) {
    var sel = notes.filter(function (n) { return keep(n.wr, filter); });
    var rows = themes.map(function (t, i) { return { key: t.key, name: t.name, order: i, count: 0, ids: [] }; });
    var by = {}; rows.forEach(function (r) { by[r.key] = r; });
    var untagged = [];
    sel.forEach(function (n) {
      var tags = R.tagNote(n.text, themes);
      if (!tags.length) untagged.push(n.id);
      tags.forEach(function (t) { by[t.key].count++; by[t.key].ids.push(n.id); });
    });
    var mentions = rows.reduce(function (s, r) { return s + r.count; }, 0);
    var empty = rows.filter(function (r) { return r.count === 0; }).map(function (r) { return r.name; });
    rows = rows.filter(function (r) { return r.count > 0; }).sort(function (a, b) { return (b.count - a.count) || (a.order - b.order); });
    var cum = 0;
    rows.forEach(function (r, i) { cum += r.count; r.share = 100 * r.count / mentions; r.cum = 100 * cum / mentions; r.top = i < 2; });
    return {
      filter: filter || "all", n: sel.length, total: notes.length, notes: sel, mentions: mentions, rows: rows, untagged: untagged, empty: empty,
      tie: rows.length > 2 && rows[2].count === rows[1].count, split: R.split(notes), multi: mentions > sel.length - untagged.length
    };
  };
  R.topTwoText = function (p) {
    if (!p.rows.length) return "";
    var t = p.rows.slice(0, 2).map(function (r) { return r.name + " (" + r.count + " note" + (r.count === 1 ? "" : "s") + ")"; }).join(" and ");
    if (p.tie) t += ", tied with " + p.rows.filter(function (r, i) { return i >= 2 && r.count === p.rows[1].count; }).map(function (r) { return r.name; }).join(" and ");
    return t;
  };

  R.paretoPrompt = function (notes, p) {
    var L = [], who = p && p.filter && p.filter !== "all" ? " (only notes from people who said " + R.FILTERS[p.filter].replace("would return: ", "") + " to returning)" : "";
    L.push("Below are " + (notes.length || "[NUMBER]") + " de-identified season-end notes from our seasonal crew" + who + ". No names, contact details or health information. Each line: note ID | role | would they return (yes, maybe, no or blank) | note.");
    L.push("");
    if (!notes.length) L.push("[PASTE DE-IDENTIFIED NOTES, ONE PER LINE]");
    notes.forEach(function (n) { L.push(n.id + " | " + (n.role || "role not given") + " | " + (n.wr || "blank") + " | " + n.text); });
    L.push("");
    L.push("A keyword count made on my device, as a cross-check only (one note can carry two themes, and a keyword is not a complaint):");
    if (!p || !p.rows.length) L.push("[NO COUNTS YET]");
    else {
      p.rows.forEach(function (r) { L.push("- " + r.name + ": " + r.count + " note" + (r.count === 1 ? "" : "s") + " (" + r.ids.join(", ") + ")"); });
      if (p.untagged.length) L.push("- Not tagged by any keyword: " + p.untagged.join(", "));
    }
    L.push("");
    L.push("Do this:");
    L.push("1. Sort every note into reasons to leave (or not return) and reasons to stay. A note can be both.");
    L.push("2. Group the reasons to leave into causes. For each cause give the number of notes and the note IDs, and quote the supporting words exactly, in double quotes. Never paraphrase inside quotes.");
    L.push("3. Rank the causes by number of notes (a Pareto). Mark each one: fixable by us before next season, partly fixable, or outside our control (for example, life events).");
    L.push("4. Propose the top two fixable causes. For each, give two or three concrete fixes and what each would take: owner time, cost as [FILL], who decides. Do not invent costs, benchmarks or statistics.");
    L.push("5. Say where the notes are too few or too vague to support a conclusion. With a few dozen notes, treat the ranking as a hint, not a finding.");
    L.push("6. Do not identify, guess at, rank or comment on any individual person, and do not suggest who to rehire. Rehire offers follow a written rule applied to everyone.");
    L.push("");
    L.push("Mark the whole answer DRAFT - PENDING OWNER REVIEW.");
    return L.join("\n");
  };

  /* ---------- Numbers 1 and 2 ---------- */
  function count(raw) {
    var s = str(raw).trim().replace(/,/g, "");
    if (!s) return { v: null, err: null };
    if (/^[-\u2212]/.test(s)) return { v: null, err: "Cannot be negative." };
    if (!/^\d+$/.test(s)) return { v: null, err: "Use a whole number." };
    return { v: parseInt(s, 10), err: null };
  }
  R.count = count;
  R.rates = function (inp) {
    inp = inp || {};
    var e = count(inp.eligible), r = count(inp.returning), h = count(inp.hires), q = count(inp.quits), err = {};
    [["eligible", e], ["returning", r], ["hires", h], ["quits", q]].forEach(function (x) { if (x[1].err) err[x[0]] = x[1].err; });
    var out = { err: err, rehire: null, earlyQuit: null };
    if (e.v !== null && r.v !== null) {
      if (r.v > e.v) err.returning = "More returning staff than eligible: check both counts.";
      else if (e.v > 0) out.rehire = { value: 100 * r.v / e.v, num: r.v, den: e.v, onePerson: 100 / e.v };
    }
    if (h.v !== null && q.v !== null) {
      if (q.v > h.v) err.quits = "More early quits than new hires: check both counts.";
      else if (h.v > 0) out.earlyQuit = { value: 100 * q.v / h.v, num: q.v, den: h.v, onePerson: 100 / h.v };
    }
    return out;
  };
  R.pct = function (n) { return round(n, 1).toFixed(1) + "%"; };

  /* ---------- the honest job post: generic words, promises and risky wording ---------- */
  var RISK_WHY = "Can read as a preference about age, sex, national origin or disability. Federal anti-discrimination law (Title VII, ADA, ADEA) applies to hiring.";
  var RISK_TRY = "Write the job's real requirement: the task, the certificate, the physical work (for example: lift 40 lb, stand on a moving deck for 2.5 hours).";
  R.GEN = [
    { p: "young|youthful|recent (?:college )?grad(?:uate)?s?|digital natives?|native (?:english )?speakers?|able[- ]bodied|physically fit|guys|girls|gals|ladies|max(?:imum)? age|millennials?|gen z", kind: "risk", why: RISK_WHY, tryi: RISK_TRY },
    { p: "once[- ]in[- ]a[- ]lifetime|(?:adventure|experience|summer|opportunity|job|season) of a lifetime|dream job|bucket[- ]list", kind: "gen", why: "Every post says it.", tryi: "Write a day in the job: times, tasks, guests per departure." },
    { p: "competitive (?:pay|wages?|salary|rates?|compensation)|great pay|good pay|generous (?:pay|wages?)|top pay|excellent pay|attractive (?:pay|salary)", kind: "gen", why: "Every post says it, and nobody can check it.", tryi: "Give the pay range per hour, tips if any, and how overtime is paid." },
    { p: "flexible (?:hours|schedules?|scheduling)|flexible", kind: "gen", why: "Flexible for whom?", tryi: "Give the hours-per-week range, the days-off pattern and when schedules are posted." },
    { p: "(?:like a|one big|we are a|we're a) family|family (?:atmosphere|feel|vibe)|great (?:team|culture|crew|environment|vibes?)|(?:amazing|awesome) (?:team|crew)|close[- ]knit", kind: "gen", why: "Every crew says it about itself.", tryi: "Say what you do: schedules posted ahead, a lead on every shift, a check-in in week one." },
    { p: "growth opportunit(?:y|ies)|opportunit(?:y|ies) (?:for|to) grow|room (?:for|to) grow(?:th)?|career growth|advancement opportunit(?:y|ies)", kind: "gen", why: "Vague.", tryi: "Name the next role and what it takes, or leave it out." },
    { p: "other duties as assigned", kind: "gen", why: "Hides the hard parts.", tryi: "List the hard parts: rain, early starts, ship-day rushes, seasickness." },
    { p: "fast[- ]paced|dynamic|high[- ]energy|thrilling", kind: "gen", why: "Describes a feeling, not the work.", tryi: "Say what the rush is: ship days, departures per day, guests per departure." },
    { p: "rock ?stars?|ninjas?|gurus?|superstars?|go[- ]getters?|self[- ]starters?|team players?|people persons?|hard[- ]?working|hard workers?|motivated|passionate|energetic|outgoing|bubbly|enthusiastic|positive attitudes?|good vibes", kind: "gen", why: "A trait nobody can check before day one.", tryi: "Name the task and the standard, for example: brief 30 guests on safety in 5 minutes." },
    { p: "fun|amazing|awesome|incredible|unforgettable|epic|rewarding|exciting|perfect|best", kind: "gen", why: "Every post says it.", tryi: "Write what the day looks like." },
    { p: "beautiful|stunning|breathtaking|spectacular|gorgeous|majestic|scenic|pristine|world[- ]class|unique", kind: "gen", why: "Describes the place, not the job.", tryi: "Give the work location and how far housing is from it." },
    { p: "guarantee(?:d|s)?(?: (?:hours|tips|overtime))?|always|never", kind: "promise", why: "A promise you may have to keep.", tryi: "Remove it unless a written policy says exactly this." }
  ];
  R.GEN.forEach(function (g) { g.re = new RegExp("\\b(?:" + g.p + ")\\b", "gi"); });
  function hashes(s) { return s.replace(/[^\s]/g, "#"); }
  function maskFill(text) { return text.replace(/\[[^\]\n]{0,80}\]/g, hashes); }
  R.findAdjectives = function (text) {
    var t = str(text), work = maskFill(t), hits = [];
    R.GEN.forEach(function (g, gi) {
      g.re.lastIndex = 0;
      var m;
      while ((m = g.re.exec(work))) {
        hits.push({ start: m.index, end: m.index + m[0].length, raw: t.substr(m.index, m[0].length), kind: g.kind, why: g.why, tryi: g.tryi, g: gi });
        work = work.slice(0, m.index) + hashes(m[0]) + work.slice(m.index + m[0].length);
        g.re.lastIndex = m.index + m[0].length;
      }
    });
    return hits.sort(function (a, b) { return a.start - b.start; });
  };
  var MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec";
  R.FACT_RE = new RegExp(
    "\\$\\s?\\d[\\d,]*(?:\\.\\d+)?" +
    "|\\b\\d{1,2}:\\d{2}\\b" +
    "|\\b\\d{1,2}\\s?(?:am|pm)\\b" +
    "|\\b\\d+(?:\\.\\d+)?\\s?(?:to\\s\\d+(?:\\.\\d+)?\\s?)?(?:hours?|hrs?|days?|weeks?|months?|beds?|rooms?|minutes?|min|lb|lbs|pounds|miles?|people|guests|seats|percent|%)(?![a-z])" +
    "|\\b(?:" + MONTHS + ")\\.?\\s+\\d{1,2}\\b", "gi");
  R.findFacts = function (text) {
    var t = str(text), out = [], m;
    R.FACT_RE.lastIndex = 0;
    while ((m = R.FACT_RE.exec(t))) out.push({ start: m.index, end: m.index + m[0].length, raw: m[0] });
    return out;
  };
  R.fills = function (text) { return str(text).match(/\[[^\]\n]{0,80}\]/g) || []; };
  R.markup = function (text) {
    var t = str(text), spans = [];
    R.findAdjectives(t).forEach(function (h) { spans.push({ s: h.start, e: h.end, tag: "mark", cls: h.kind, title: h.tryi }); });
    R.findFacts(t).forEach(function (f) { spans.push({ s: f.start, e: f.end, tag: "span", cls: "fact", title: "Checkable fact" }); });
    var re = /\[[^\]\n]{0,80}\]/g, m;
    while ((m = re.exec(t))) spans.push({ s: m.index, e: m.index + m[0].length, tag: "span", cls: "fillmark", title: "Not filled in yet" });
    spans.sort(function (a, b) { return a.s - b.s || b.e - a.e; });
    var html = "", pos = 0;
    spans.forEach(function (sp) {
      if (sp.s < pos) return;
      html += R.esc(t.slice(pos, sp.s)) + "<" + sp.tag + ' class="' + sp.cls + '" title="' + R.esc(sp.title) + '">' + R.esc(t.slice(sp.s, sp.e)) + "</" + sp.tag + ">";
      pos = sp.e;
    });
    return html + R.esc(t.slice(pos));
  };
  R.postReport = function (text) {
    var hits = R.findAdjectives(text), facts = R.findFacts(text);
    var by = { gen: 0, promise: 0, risk: 0 };
    hits.forEach(function (h) { by[h.kind]++; });
    return { hits: hits, facts: facts.length, fills: R.fills(text).length, gen: by.gen, promise: by.promise, risk: by.risk, words: (str(text).match(/[A-Za-z0-9']+/g) || []).length };
  };

  /* ---------- fictional examples (Channel Light Excursions, Juneau: FICTIONAL TEACHING BUSINESS) ---------- */
  /* The same 30 notes as exit_notes_2026.csv (embedded: the page cannot fetch files). dev/test-rehire.js checks they match. */
  R.SAMPLE_CSV = "note_id,role,would_return,note\r\nN01,Captain,maybe,Nobody told me the ship-late procedure until it happened.\r\nN02,Captain,maybe,Loved the guests and the whales.\r\nN03,Captain,maybe,The naturalist script got stale; I wanted to add my own material.\r\nN04,Reservations,maybe,Pay was fine for Juneau but not after rent.\r\nN05,Naturalist guide,maybe,Housing was fine but I could not find a place for my partner.\r\nN06,Reservations,no,Feedback only came when something went wrong.\r\nN07,Naturalist guide,no,Too many 12-hour ship days in a row in July.\r\nN08,Naturalist guide,no,Leads were great once the season settled.\r\nN09,Dock coordinator,maybe,Pay was fine for Juneau but not after rent.\r\nN10,Naturalist guide,maybe,\"Some weeks had 55 hours, some had 20.\"\r\nN11,Reservations,yes,Too many 12-hour ship days in a row in July.\r\nN12,Captain,maybe,The naturalist script got stale; I wanted to add my own material.\r\nN13,Captain,maybe,Feedback only came when something went wrong.\r\nN14,Dock coordinator,maybe,Nobody told me the ship-late procedure until it happened.\r\nN15,Captain,maybe,Pay was fine for Juneau but not after rent.\r\nN16,Captain,maybe,The naturalist script got stale; I wanted to add my own material.\r\nN17,Reservations,maybe,\"Family reasons, would come back next year.\"\r\nN18,Dock coordinator,yes,Taking a year-round job in Anchorage.\r\nN19,Naturalist guide,no,Housing was fine but I could not find a place for my partner.\r\nN20,Deckhand,maybe,Feedback only came when something went wrong.\r\nN21,Captain,no,A returning bonus would bring me back.\r\nN22,Dock coordinator,maybe,Pay was fine for Juneau but not after rent.\r\nN23,Naturalist guide,no,A returning bonus would bring me back.\r\nN24,Naturalist guide,maybe,Housing was fine but I could not find a place for my partner.\r\nN25,Naturalist guide,maybe,Housing was fine but I could not find a place for my partner.\r\nN26,Naturalist guide,yes,Loved the guests and the whales.\r\nN27,Deckhand,maybe,I learned the dock routine from whoever was free that day.\r\nN28,Naturalist guide,no,Pay was fine for Juneau but not after rent.\r\nN29,Naturalist guide,maybe,Schedule came out too late to plan days off.\r\nN30,Reservations,maybe,Nobody told me the ship-late procedure until it happened.\r\n";
  R.GENERIC_POST = "Join our amazing team for the summer of a lifetime! We are looking for passionate, energetic team players and self-starters who love the outdoors. Fast-paced, fun work in a stunning location. Competitive pay, flexible hours and a family atmosphere. Young, outgoing people encouraged to apply. Other duties as assigned.";
  R.EXAMPLES = {
    "ex-letter": {
      business: "Channel Light Excursions, Juneau (fictional)",
      role: "Naturalist guide",
      season: "May 1 to September 30, 2027; returning crew start April 20, 2027",
      changes: "1. Housing: 2 of our 12 staff beds become rooms for couples, first come, first served.\n2. Pay: a returning bonus for everyone who comes back and finishes the season (below).\n3. Training: a written ship-late procedure and a 14-day checklist for every new crew member.\n4. Schedules posted 3 weeks ahead.",
      pay: "$22 to $26 per hour, by role and certification (fictional)",
      bonus: "$500 for finishing the 2027 season, paid with the final paycheck (fictional)",
      housing: "",
      replyby: "November 15, 2026",
      channel: "email",
      signoff: ""
    },
    "ex-post": {
      business: "Channel Light Excursions, Juneau (fictional)",
      role: "Deckhand",
      dates: "May 1 to September 30, 2027; paid training starts April 20, 2027",
      hours: "38 to 50 hours a week; some July weeks reach 55",
      daysoff: "1 or 2 days off a week; schedules posted 3 weeks ahead",
      pay: "$21 to $24 per hour (fictional); overtime paid as Alaska law requires",
      housing: "Shared staff housing, 12 beds, 2 rooms for couples; cost [FILL]",
      hard: "- Rain and cold on deck\n- Early starts\n- Ship-day rushes\n- Seasickness on rough days",
      hard_other: "Long days in July: up to 12 hours on heavy ship days",
      day: "6:45 Boat checks at Auke Bay with the captain\n8:25 First guests board from the shuttle; safety briefing\n8:30 to 11:00 Whale cruise: lines, deck safety, helping guests move on a wet deck\n11:00 Turn the boat around: wipe down, restock, log\nAfternoon: one or two more cruises, same routine\nEnd of day: fuel, clean, next-day check with the captain",
      needs: "First aid and CPR card within 2 weeks of starting (we pay for the course); lift 40 lb; work standing on a moving deck for 2.5-hour cruises",
      apply: "Apply on our website by January 15, 2027 [FILL: link]"
    },
    "ex-rates": { eligible: "17", returning: "6", hires: "20", quits: "4" }
  };

  if (typeof module !== "undefined" && module.exports) module.exports = R;
  else root.RehireCore = R;
})(this);
