/* 2a Journey FMEA and disruption playbook: pure logic, no page access, no network.
 * Used by index.html (as window.FMEA) and by the Node tests in dev/ (require).
 * Deterministic: the same inputs always give the same ranking, checks and prompts.
 * All example rows and answers describe Channel Light Excursions, Juneau: a FICTIONAL TEACHING BUSINESS.
 */
(function (root) {
  "use strict";
  var F = {};

  function str(v) { return v === undefined || v === null ? "" : String(v).trim(); }
  F.str = str;

  /* ---------- scoring guidance (1 to 10), adapted to a tour operator ----------
   * Severity: the worst credible effect on the guest and the business. Only a change to the
   *   process or design that removes the effect lowers it; better checks do not.
   * Occurrence: how often the cause or failure happens. Count it from your disruption log.
   *   A season here is about 150 operating days. Keep the same scale season to season.
   * Detection: how early and how surely current controls catch it before the guest feels it.
   *   No control at all scores 10.
   */
  F.SCALES = {
    S: [
      [10, "Safety at risk with no warning", "A guest or crew member could be hurt, with no warning. Example: a guest is left behind at a remote stop."],
      [9, "Safety, compliance or stranding with warning", "A cruise guest misses the all-aboard, a vessel or permit limit is broken, or a safety risk is known and run anyway."],
      [8, "Guest loses the whole trip", "Cancelled, missed or refunded, and the guest's day plan breaks."],
      [7, "Much smaller trip", "Glacier stop dropped, moved to another day, or a wait of more than an hour."],
      [6, "Noticeable change", "Moved to another departure the same day, or a wait of 30 to 60 minutes."],
      [5, "Inconvenienced and says so", "A wait of 15 to 30 minutes, confusion at the meeting point."],
      [4, "Minor change most guests notice", "A delay under 15 minutes."],
      [3, "Minor change some guests notice", "A small change to the order of the day."],
      [2, "Barely noticed", "Only a careful guest would see it."],
      [1, "No effect on the guest", "Internal only."]
    ],
    O: [
      [10, "Most operating days", "75 or more times a season."],
      [9, "Several times a week", "30 to 74 times a season."],
      [8, "About weekly", "15 to 29 times a season."],
      [7, "Every week or two", "8 to 14 times a season."],
      [6, "About monthly", "4 to 7 times a season."],
      [5, "A few times a season", "2 to 3 times a season."],
      [4, "About once a season", "Most seasons see it once."],
      [3, "Every 2 to 3 seasons", "Seen, but not every year."],
      [2, "Once in 4 or more seasons", "Rare, but it has happened here or to a neighbor."],
      [1, "Prevented by design", "Cannot happen the way you run it now."]
    ],
    D: [
      [10, "Not caught at all", "No control exists. You may never find out."],
      [9, "Caught after the departure", "The guest calls or complains later."],
      [8, "Caught only at a no-show", "Nobody knows until the guest is missing."],
      [7, "Caught at the meeting point", "Headcount or check-in, under 30 minutes to act."],
      [6, "Caught 30 to 60 minutes ahead, by chance", "Only if someone happens to look."],
      [5, "Caught 30 to 60 minutes ahead, by routine", "A check that always happens."],
      [4, "Caught 1 to 2 hours ahead, by routine", "A check that always happens."],
      [3, "Caught the morning of, 2 hours or more ahead", "A routine morning check."],
      [2, "Caught the day before, by routine", "A check that always happens the evening before."],
      [1, "Caught automatically or blocked by design", "Example: the booking system will not sell the seat."]
    ]
  };
  F.scaleText = function (dim, score) {
    var n = F.score(score), list = F.SCALES[dim] || [];
    for (var i = 0; i < list.length; i++) if (list[i][0] === n) return list[i][1] + ". " + list[i][2];
    return "";
  };

  /* ---------- scores and RPN ---------- */
  F.score = function (v) {
    var s = str(v);
    if (!/^\d{1,2}$/.test(s)) return null;
    var n = parseInt(s, 10);
    return n >= 1 && n <= 10 ? n : null;
  };
  F.rpn = function (row) {
    var s = F.score(row.severity), o = F.score(row.occurrence), d = F.score(row.detection);
    return s === null || o === null || d === null ? null : s * o * d;
  };
  F.newRpn = function (row) {
    var s = F.score(row.new_severity), o = F.score(row.new_occurrence), d = F.score(row.new_detection);
    return s === null || o === null || d === null ? null : s * o * d;
  };
  F.SEVERE = 9;

  F.COLS = ["id", "journey_step", "failure_mode", "effect", "severity", "cause", "occurrence", "occurrence_note", "current_controls", "detection",
    "action", "owner_role", "due", "new_severity", "new_occurrence", "new_detection"];
  F.blankRow = function (id) {
    var r = {}; F.COLS.forEach(function (k) { r[k] = ""; });
    r.id = id || "";
    return r;
  };
  F.nextId = function (rows) {
    var max = 0;
    (rows || []).forEach(function (r) { var m = /^R(\d+)$/.exec(str(r.id)); if (m) max = Math.max(max, parseInt(m[1], 10)); });
    return "R" + (max + 1);
  };

  /* Rank: scored rows by RPN (high first), ties by severity, then occurrence, then detection,
   * then the order you typed them. Unscored rows go last. "Top" = the first `top` scored rows,
   * plus any row tied with the last one (ties at the cutoff are not dropped).
   * Severity 9 or 10 is flagged whatever the RPN: that is standard FMEA practice. */
  F.rank = function (rows, opts) {
    var top = (opts && opts.top) || 5;
    var list = (rows || []).map(function (r, i) {
      var s = F.score(r.severity), o = F.score(r.occurrence), d = F.score(r.detection);
      return { row: r, index: i, s: s, o: o, d: d, rpn: F.rpn(r), newRpn: F.newRpn(r), severe: s !== null && s >= F.SEVERE, top: false, rank: null };
    });
    var scored = list.filter(function (x) { return x.rpn !== null; });
    var unscored = list.filter(function (x) { return x.rpn === null; });
    scored.sort(function (a, b) { return b.rpn - a.rpn || b.s - a.s || b.o - a.o || b.d - a.d || a.index - b.index; });
    var cut = scored.length >= top ? scored[top - 1] : null;
    scored.forEach(function (x, i) {
      x.rank = i + 1;
      x.top = i < top || (cut !== null && x.rpn === cut.rpn && x.s === cut.s && x.o === cut.o && x.d === cut.d);
    });
    return scored.concat(unscored);
  };
  F.actionList = function (rows, opts) {
    return F.rank(rows, opts).filter(function (x) { return x.top || x.severe; });
  };

  /* Issues a Black Belt would raise about one row. level: bad | warn | info */
  F.rowIssues = function (row, ranked) {
    var out = [];
    ["severity", "occurrence", "detection"].forEach(function (k) {
      var v = str(row[k]);
      if (v === "") out.push({ level: "warn", text: "Not scored yet: " + k + "." });
      else if (F.score(v) === null) out.push({ level: "bad", text: k.charAt(0).toUpperCase() + k.slice(1) + " takes a whole number from 1 to 10." });
    });
    if (!str(row.failure_mode)) out.push({ level: "warn", text: "No failure mode written." });
    if (!str(row.effect)) out.push({ level: "warn", text: "No effect written. Severity scores the effect, so write it first." });
    var s = F.score(row.severity), ns = F.score(row.new_severity);
    if (s !== null && ns !== null && ns < s) out.push({ level: "warn", text: "Severity dropped after the action. That is right only if the action removes or changes the effect itself (a design or process change). Better checks lower detection, not severity." });
    ["new_severity", "new_occurrence", "new_detection"].forEach(function (k) {
      var v = str(row[k]);
      if (v !== "" && F.score(v) === null) out.push({ level: "bad", text: "After-action " + k.replace("new_", "") + " takes a whole number from 1 to 10." });
    });
    if (ranked && (ranked.top || ranked.severe)) {
      if (!str(row.action)) out.push({ level: "bad", text: "On the action list but no countermeasure is written." });
      if (!str(row.owner_role)) out.push({ level: "warn", text: "No owner. Name a role (for example Duty lead), not a person." });
    }
    return out;
  };

  /* ---------- the fictional example rows (Channel Light Excursions, FICTIONAL) ---------- */
  F.DEMO_ROWS = [
    { id: "R1", journey_step: "Ship to dock", failure_mode: "Ship arrives late",
      effect: "Cruise guests miss their booked departure and are moved to a later one or refunded. A later departure can come back inside the all-aboard buffer.",
      severity: "8", cause: "Weather at sea, port congestion, the cruise line changes the schedule.", occurrence: "6",
      occurrence_note: "Fictional 2026 log: 14 events for late arrival and tendering together. Split them in your own log.",
      current_controls: "Port schedule read the evening before. Someone looks at the dock at arrival time.", detection: "6",
      action: "Get each ship's updated arrival time 2 hours before the first departure. Keep the rebook board (2b) ready.", owner_role: "Dock coordinator lead", due: "Before May 1",
      new_severity: "", new_occurrence: "", new_detection: "" },
    { id: "R2", journey_step: "Ship to dock", failure_mode: "Ship tenders guests ashore from anchor",
      effect: "Guests reach the meeting point well after a docked ship's guests and miss early departures.",
      severity: "7", cause: "Docks full; the ship is assigned to anchor.", occurrence: "6",
      occurrence_note: "Fictional 2026 log: counted with late arrivals (14 events together).",
      current_controls: "The port schedule shows dock or anchor. Checked on the morning call.", detection: "5",
      action: "Booking rule: sell anchor-ship guests only departures that leave at least [FILL] minutes after arrival (policy choice).", owner_role: "Reservations lead", due: "Before May 1",
      new_severity: "", new_occurrence: "", new_detection: "" },
    { id: "R3", journey_step: "Ship to dock", failure_mode: "Ship skips the port",
      effect: "Every guest from that ship loses the trip. Their seats sit empty unless refilled.",
      severity: "8", cause: "Weather, a mechanical problem, an itinerary change.", occurrence: "5",
      occurrence_note: "Fictional 2026 log: 3 schedule changes or skipped calls.",
      current_controls: "The cruise line desk tells us, sometimes only that morning.", detection: "5",
      action: "Ask each shore excursion desk for skipped-call notice by a set time. Keep a waitlist to refill the seats (2b).", owner_role: "Reservations lead", due: "Before May 1",
      new_severity: "", new_occurrence: "", new_detection: "" },
    { id: "R4", journey_step: "Flight to town", failure_mode: "Flight delayed or fog (independent guests)",
      effect: "The guest misses the departure, often the only day they had for it.",
      severity: "8", cause: "Fog and low ceilings, late inbound flights.", occurrence: "6",
      occurrence_note: "Fictional 2026 log: 7 events.",
      current_controls: "None until the guest calls.", detection: "8",
      action: "At booking, ask same-day fliers to book a departure at least [FILL] hours after landing, and to text us when they land. Decide the same-day rebook rule.", owner_role: "Reservations lead", due: "Before May 1",
      new_severity: "", new_occurrence: "", new_detection: "" },
    { id: "R5", journey_step: "Ferry to town", failure_mode: "Ferry delayed",
      effect: "A guest arriving by ferry misses the departure.",
      severity: "8", cause: "Weather, mechanical problem, schedule change.", occurrence: "3",
      occurrence_note: "Not in the fictional 2026 log. Team estimate.",
      current_controls: "None until the guest calls.", detection: "8",
      action: "", owner_role: "", due: "",
      new_severity: "", new_occurrence: "", new_detection: "" },
    { id: "R6", journey_step: "Dock to Auke Bay shuttle", failure_mode: "Shuttle late (bus or driver)",
      effect: "The departure leaves late and comes back late. Cruise guests can miss the all-aboard.",
      severity: "9", cause: "Bus breakdown, driver late, the previous run late.", occurrence: "4",
      occurrence_note: "Not separated in the fictional 2026 log. Team estimate.",
      current_controls: "Kestrel Shuttle dispatch calls us when a bus leaves late.", detection: "5",
      action: "Agree a late-bus call within 5 minutes with Kestrel Shuttle (check your partner agreement). If the return would land inside the buffer, the duty lead decides before the boat leaves.", owner_role: "Duty lead", due: "Before May 1",
      new_severity: "", new_occurrence: "", new_detection: "" },
    { id: "R7", journey_step: "Dock to Auke Bay shuttle", failure_mode: "Road closure or heavy traffic on the shuttle route",
      effect: "The shuttle reaches Auke Bay late; the departure runs late or is missed.",
      severity: "8", cause: "Road works, a crash, ship-day traffic.", occurrence: "6",
      occurrence_note: "Fictional 2026 log: 5 road or traffic delays.",
      current_controls: "The driver reports by radio.", detection: "6",
      action: "", owner_role: "", due: "",
      new_severity: "", new_occurrence: "", new_detection: "" },
    { id: "R8", journey_step: "Auke Bay to the water", failure_mode: "Marine weather hold",
      effect: "The departure is held or cancelled. Guests lose the trip or move.",
      severity: "8", cause: "Wind and sea state, a marine weather warning.", occurrence: "7",
      occurrence_note: "Fictional 2026 log: 9 holds.",
      current_controls: "The captain checks the marine forecast the evening before and in the morning.", detection: "3",
      action: "Captain's call by a set time before departure. Message pack ready. Rebook and waitlist rules decided.", owner_role: "Captain on duty (safety call); duty lead (messages)", due: "Before May 1",
      new_severity: "", new_occurrence: "", new_detection: "" },
    { id: "R9", journey_step: "Whole route", failure_mode: "Wildfire smoke",
      effect: "Poor views; guests with breathing problems at risk; possible cancellation.",
      severity: "7", cause: "Regional wildfires.", occurrence: "2",
      occurrence_note: "Not in the fictional 2026 log. Team estimate.",
      current_controls: "Air quality forecast checked when smoke is in the news.", detection: "3",
      action: "", owner_role: "", due: "",
      new_severity: "", new_occurrence: "", new_detection: "" },
    { id: "R10", journey_step: "Dock to meeting point", failure_mode: "Guest at the wrong meeting point",
      effect: "The guest misses the shuttle, or the departure waits and comes back late.",
      severity: "7", cause: "Unclear directions, several docks, no sign.", occurrence: "6",
      occurrence_note: "Not in the fictional 2026 log. Team estimate. Start counting it.",
      current_controls: "Headcount at the shuttle door.", detection: "7",
      action: "", owner_role: "", due: "",
      new_severity: "", new_occurrence: "", new_detection: "" }
  ];
  F.demoRows = function () { return F.DEMO_ROWS.map(function (r) { return Object.assign({}, r); }); };

  /* ---------- CSV ---------- */
  F.parseCSV = function (text) {
    var rows = [], row = [], cell = "", q = false, i, c;
    text = String(text || "").replace(/^\uFEFF/, "");
    for (i = 0; i < text.length; i++) {
      c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return str(x) !== ""; }); });
  };
  /* quote cells that need it; neutralise spreadsheet formulas (=, +, -, @ at the start) */
  F.csvCell = function (v) {
    if (typeof v === "number") return String(v);
    var s = v === undefined || v === null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(?:\.\d+)?$/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  F.toCSV = function (header, rows) {
    return [header].concat(rows).map(function (r) { return r.map(F.csvCell).join(","); }).join("\r\n") + "\r\n";
  };

  F.EXPORT_COLS = ["rank", "id", "journey_step", "failure_mode", "effect", "severity", "cause", "occurrence", "occurrence_note", "current_controls", "detection",
    "rpn", "flag", "action", "owner_role", "due", "new_severity", "new_occurrence", "new_detection", "new_rpn"];
  F.rowsToCSV = function (rows) {
    var ranked = F.rank(rows);
    return F.toCSV(F.EXPORT_COLS, ranked.map(function (x) {
      var flag = [];
      if (x.severe) flag.push("SEVERITY 9-10");
      if (x.top) flag.push("TOP 5");
      if (x.rpn === null) flag.push("NOT SCORED");
      return F.EXPORT_COLS.map(function (k) {
        if (k === "rank") return x.rank === null ? "" : x.rank;
        if (k === "rpn") return x.rpn === null ? "" : x.rpn;
        if (k === "new_rpn") return x.newRpn === null ? "" : x.newRpn;
        if (k === "flag") return flag.join("; ");
        return str(x.row[k]);
      });
    }));
  };
  var ALIASES = {
    step: "journey_step", stage: "journey_step", process_step: "journey_step",
    failure: "failure_mode", mode: "failure_mode", potential_failure_mode: "failure_mode",
    effects: "effect", potential_effect: "effect", s: "severity", sev: "severity",
    causes: "cause", potential_cause: "cause", o: "occurrence", occ: "occurrence",
    controls: "current_controls", current_control: "current_controls", d: "detection", det: "detection",
    recommended_action: "action", countermeasure: "action", owner: "owner_role", responsibility: "owner_role",
    target_date: "due", due_date: "due"
  };
  F.rowsFromCSV = function (text) {
    var rows = F.parseCSV(text);
    if (!rows.length) return { rows: [], error: "The file is empty." };
    var head = rows[0].map(function (h) {
      var k = str(h).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      return ALIASES[k] || k;
    });
    if (head.indexOf("failure_mode") < 0) return { rows: [], error: "No 'failure_mode' column found. Start from a CSV saved on this page." };
    var out = [];
    rows.slice(1).forEach(function (r) {
      var row = F.blankRow("");
      head.forEach(function (k, i) { if (F.COLS.indexOf(k) >= 0) row[k] = str(r[i]).replace(/^'(?=[=+\-@])/, ""); });
      if (row.failure_mode === "" && row.effect === "") return;
      out.push(row);
    });
    var seen = {};
    out.forEach(function (r, i) {
      if (!/^R\d+$/.test(r.id) || seen[r.id]) r.id = "";
      if (r.id) seen[r.id] = true;
    });
    out.forEach(function (r) { if (!r.id) r.id = F.nextId(out); });
    var max = 40;
    return { rows: out.slice(0, max), error: out.length > max ? "Only the first " + max + " rows were loaded." : "" };
  };

  /* ---------- policy completeness check ---------- */
  /* label: legal | contract | policy | rec   kind: text | minutes */
  F.POLICY_ITEMS = [
    { key: "safety_call", label: "rec", kind: "text", q: "Who makes the weather and vessel safety call",
      hint: "A qualified person, usually the captain on duty. Tools never make this call." },
    { key: "decision_owner", label: "policy", kind: "text", q: "Who decides the rebook plan on the day",
      hint: "A role, for example Duty lead." },
    { key: "decision_by", label: "policy", kind: "minutes", q: "Decision deadline, in minutes before the affected departure",
      hint: "After this point, the default in the next answer applies." },
    { key: "rebook_refund", label: "policy", kind: "text", q: "Rebook or refund: what we offer, in what order",
      hint: "For example: the guest chooses another departure today, another day, or a full refund." },
    { key: "partner_transfer", label: "contract", kind: "text", q: "Who pays for an extra or changed partner shuttle run",
      hint: "Check your agreement with the shuttle partner." },
    { key: "cruise_terms", label: "contract", kind: "text", q: "Cruise-line guests: whose terms apply and who tells them",
      hint: "Check your cruise line contract. Often you tell the ship's shore excursion desk, not the guest." },
    { key: "ota_terms", label: "contract", kind: "text", q: "OTA guests: whose terms apply and how you message them",
      hint: "Check your OTA supplier agreement." },
    { key: "allaboard_buffer", label: "policy", kind: "minutes", q: "All-aboard buffer, in minutes",
      hint: "We plan every cruise-guest departure to be back at the dock this many minutes before all-aboard." },
    { key: "waitlist_rule", label: "policy", kind: "text", q: "Waitlist rule for freed seats",
      hint: "Order (first come, first served or best fit), party splitting, how long an offer stays open. See 2b." },
    { key: "late_wait", label: "policy", kind: "minutes", q: "How long the shuttle waits for a late guest, in minutes",
      hint: "Every minute waited comes off the all-aboard buffer for everyone on board." },
    { key: "approver", label: "policy", kind: "text", q: "Who approves guest messages before they go out",
      hint: "One named role. AI and templates draft; this person approves." },
    { key: "goodwill", label: "policy", kind: "text", q: "What we offer for the inconvenience, if anything",
      hint: "Write \"nothing beyond the refund\" if that is the decision. Blank is not a decision." },
    { key: "first_notice", label: "policy", kind: "minutes", q: "First-notice target, in minutes from the first alert",
      hint: "This is the number you measure (minutes from first alert to first guest message)." }
  ];
  F.DEMO_POLICY = {
    safety_call: "The captain on duty makes every weather and vessel safety call.",
    decision_owner: "Duty lead on the day.",
    decision_by: "",
    rebook_refund: "The guest chooses: another departure today if one fits, or a full refund.",
    partner_transfer: "",
    cruise_terms: "Guests booked through a cruise line follow the cruise line's terms. We contact the ship's shore excursion desk, not the guest.",
    ota_terms: "",
    allaboard_buffer: "60",
    waitlist_rule: "",
    late_wait: "",
    approver: "The duty lead approves every guest message before it is sent.",
    goodwill: "",
    first_notice: "15"
  };
  F.MINUTE_LIMITS = { decision_by: [0, 720], allaboard_buffer: [0, 240], late_wait: [0, 120], first_notice: [1, 240] };

  F.isBlankAnswer = function (v) {
    var s = str(v);
    if (s === "") return true;
    if (/\[\s*fill/i.test(s)) return true;
    return /^(tbd|tbc|todo|to do|\?+|n\/?a|none yet|not decided|undecided|unknown|later|ask .*)$/i.test(s.replace(/[.!]+$/, ""));
  };
  F.policyCheck = function (answers) {
    answers = answers || {};
    var items = F.POLICY_ITEMS.map(function (it) {
      var v = str(answers[it.key]);
      if (F.isBlankAnswer(v)) return { key: it.key, q: it.q, label: it.label, status: "gap", text: "Decide before May." };
      if (it.kind === "minutes") {
        if (!/^\d{1,4}$/.test(v)) return { key: it.key, q: it.q, label: it.label, status: "bad", text: "Write a whole number of minutes." };
        var n = parseInt(v, 10), lim = F.MINUTE_LIMITS[it.key];
        if (lim && (n < lim[0] || n > lim[1])) return { key: it.key, q: it.q, label: it.label, status: "bad", text: "Expected " + lim[0] + " to " + lim[1] + " minutes. Check the number." };
      }
      if (it.kind === "text" && v.length < 3) return { key: it.key, q: it.q, label: it.label, status: "bad", text: "Too short to act on. Write the decision in a full sentence." };
      return { key: it.key, q: it.q, label: it.label, status: "ok", text: "Decided." };
    });
    var ok = items.filter(function (x) { return x.status === "ok"; }).length;
    return { items: items, decided: ok, total: items.length, gaps: items.filter(function (x) { return x.status !== "ok"; }) };
  };
  F.policyValue = function (answers, key) {
    var it = F.POLICY_ITEMS.filter(function (x) { return x.key === key; })[0];
    var v = str((answers || {})[key]);
    if (!it || F.isBlankAnswer(v)) return "";
    if (it.kind === "minutes") return /^\d{1,4}$/.test(v) ? v : "";
    return v;
  };
  /* The policy sheet the prompts use. Only decided answers are written; gaps become [FILL]. */
  F.policySheet = function (answers) {
    var chk = F.policyCheck(answers);
    return F.POLICY_ITEMS.map(function (it, i) {
      var st = chk.items[i], v = str((answers || {})[it.key]);
      var val = st.status === "ok" ? (it.kind === "minutes" ? v + " minutes" : v) : "[FILL: not decided yet]";
      return "- " + it.q + ": " + val;
    }).join("\n");
  };

  /* ---------- message pack prompt, one per scenario ---------- */
  F.messagePrompt = function (row, answers, opts) {
    opts = opts || {};
    var business = str(opts.business) || "[FILL: business name]";
    var s = F.score(row.severity);
    var first = F.policyValue(answers, "first_notice");
    var safety = F.policyValue(answers, "safety_call");
    var lines = [];
    lines.push("Act as the disruption message drafter for " + business + ". You draft; a person approves every message before anything is sent. Nothing you write is sent automatically.");
    lines.push("");
    lines.push("SCENARIO (from our journey FMEA):");
    lines.push("Failure: " + (str(row.failure_mode) || "[FILL: failure mode]") + (str(row.journey_step) ? " (" + str(row.journey_step) + ")" : ""));
    lines.push("Effect on the guest: " + (str(row.effect) || "[FILL: effect]"));
    lines.push("Usual causes: " + (str(row.cause) || "[FILL: causes]"));
    lines.push("Our countermeasure: " + (str(row.action) || "[FILL: countermeasure not written yet]"));
    if (s !== null) lines.push("Severity " + s + " of 10." + (s >= F.SEVERE ? " Severity 9 or 10: a safety or stranding risk. Keep every word factual and plain." : ""));
    lines.push("");
    lines.push("OUR DISRUPTION POLICIES (use only these; a line marked [FILL] is not decided, so do not guess it):");
    lines.push(F.policySheet(answers));
    lines.push("");
    lines.push("TASK");
    lines.push("Draft four items for this scenario. They are templates we reuse, not messages for one guest.");
    lines.push("1. FIRST NOTICE, sent within " + (first ? first + " minutes" : "[FILL: first-notice target]") + " of the first alert: what we know, what we do not know yet, and when we will update. Under 70 words.");
    lines.push("2. OPTIONS MESSAGE: only the choices our policies allow, in the order the policies give. Use [NEW DEPARTURE TIME], [SEATS] and [REPLY BY] where the duty lead fills in the day's facts. Under 110 words.");
    lines.push("3. CONFIRMATION, after the guest chooses. Under 60 words.");
    lines.push("4. STAFF DECISION CARD: who decides, by when, the checklist in order, and what to record (time of first alert, time of first message, guests rebooked, seats refilled). Safety calls stay with " + (safety ? "the person named in our policies" : "[FILL: who makes the safety call]") + ".");
    lines.push("");
    lines.push("Rules:");
    lines.push("- Use only the scenario and the policies above. Do not add times, prices, refunds, credits, compensation or waiting promises that are not written above.");
    lines.push("- Do not promise weather, wildlife, or that a ship, flight, shuttle or boat will wait.");
    lines.push("- Cruise-line guests: address the options message to the ship's shore excursion desk and follow our cruise-line policy line. OTA guests: write it for the OTA's messaging and follow our OTA policy line.");
    lines.push("- Use the placeholders [GUEST FIRST NAME], [BOOKING REF], [PARTY SIZE] and [BOOKED DEPARTURE]. Names and contact details are merged in our booking system, never in this chat.");
    lines.push("- Plain words, short sentences, no exclamation marks.");
    lines.push("- Where something is missing, write [FILL: what is missing] and list it at the end under QUESTIONS FOR THE OWNER.");
    lines.push("- Put this on the first line of each item: DRAFT - PENDING OWNER REVIEW");
    return lines.join("\n");
  };

  /* ---------- draft checker: polished but wrong vs grounded ---------- */
  var ALWAYS = [
    [/\bguarantee(?:d|s)?\b/gi, "Guarantee"], [/\bpromise[sd]?\b/gi, "Promise"], [/\bdon'?t worry\b|\bdo not worry\b/gi, "Reassurance, not a fact"],
    [/\bno problem\b/gi, "Reassurance, not a fact"], [/\bplenty of time\b/gi, "Time promise"], [/\brest assured\b/gi, "Reassurance, not a fact"],
    [/\bdefinitely\b|\bfor sure\b|\bcertainly\b|\b100\s?%/gi, "Certainty word"],
    [/\b(?:we(?:'ll| will)|will) (?:hold|wait for)\b/gi, "Waiting promise"], [/\bhold the (?:boat|bus|shuttle|departure)\b/gi, "Waiting promise"],
    [/\byou(?:'ll| will) (?:see|spot)\b|\bwhales are\b|\bwhales will\b/gi, "Wildlife promise"],
    [/\b(?:calm|sunny|clear) (?:seas|skies|water|weather)\b|\bweather will\b/gi, "Weather promise"],
    [/\bgot you covered\b|\btake care of everything\b/gi, "Vague promise"]
  ];
  var MONEY = /\b(refund(?:s|ed)?|voucher|credit|discount|free|compensation|complimentary|on us)\b/gi;
  F.checkDraft = function (text, allowed) {
    var s = String(text || "").replace(/[\u2018\u2019\u02bc]/g, "'"), ok = String(allowed || "").toLowerCase();
    var items = [];
    function add(level, t) { items.push({ level: level, text: t }); }
    if (!str(s)) return { items: [{ level: "info", text: "Paste a draft to check it." }], fills: 0, bad: 0 };
    if (!/DRAFT - PENDING OWNER REVIEW/.test(s)) add("bad", "No \"DRAFT - PENDING OWNER REVIEW\" line. Every draft carries it until a person approves.");
    ALWAYS.forEach(function (p) {
      var found = s.match(p[0]);
      if (found) add("bad", p[1] + ": \"" + uniq(found).join("\", \"") + "\". Not in your policies.");
    });
    var money = (s.match(MONEY) || []).filter(function (w) {
      var stem = w.toLowerCase().replace(/(?:s|ed)$/, "").replace(/\s+/g, "\\s+");
      return !new RegExp("\\b" + stem + "(?:s|ed)?\\b").test(ok);
    });
    if (money.length) add("bad", "Money or compensation word not in your policies: \"" + uniq(money).join("\", \"") + "\".");
    var times = (s.match(/\b\d{1,2}:\d{2}\b|\b\d{1,2}\s?(?:am|pm)\b/gi) || []).filter(function (t) { return ok.indexOf(t.toLowerCase()) < 0; });
    if (times.length) add("bad", "Time not in your policies: " + uniq(times).join(", ") + ". Times come from the rebook board on the day; use a placeholder.");
    var amounts = (s.match(/\$\s?\d[\d,]*(?:\.\d+)?|\b\d+(?:\.\d+)?\s?%/g) || []).filter(function (t) { return ok.indexOf(t.toLowerCase()) < 0; });
    if (amounts.length) add("bad", "Amount not in your policies: " + uniq(amounts).join(", ") + ".");
    var mins = (s.match(/\b\d+\s?(?:minutes?|mins?|hours?|hrs?)\b/gi) || []).filter(function (t) {
      var n = /\d+/.exec(t)[0]; return !new RegExp("\\b" + n + "\\b").test(ok);
    });
    if (mins.length) add("warn", "Duration not in your policies: " + uniq(mins).join(", ") + ". Check it.");
    if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(s)) add("bad", "An email address. Keep contact details in your booking system.");
    if (/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/.test(s)) add("bad", "A phone number. Use [FILL: business phone]; never a personal number.");
    if (/\b(?:my cell|my mobile|my personal)\b/i.test(s)) add("bad", "A personal contact. Messages give the business line only.");
    var greet = /\b(?:Dear|Hi|Hello|Hey)\s+([A-Z][a-z]+)\b/g, m, names = [];
    while ((m = greet.exec(s))) { if (!/^(?:There|All|Everyone|Team|Folks)$/.test(m[1])) names.push(m[1]); }
    if (names.length) add("bad", "Greeting with a name: " + uniq(names).join(", ") + ". Use [GUEST FIRST NAME]; names are merged in the booking system.");
    if ((s.match(/!/g) || []).length >= 2) add("warn", "Exclamation marks. A disruption message reads calmer without them.");
    var fills = (s.match(/\[FILL[^\]]*\]/gi) || []).length;
    if (fills) add("info", fills + " [FILL] item" + (fills === 1 ? "" : "s") + " for the duty lead to complete before sending.");
    var bad = items.filter(function (x) { return x.level === "bad"; }).length;
    if (!bad) add("ok", "No promise words, invented times, amounts or personal data found. A person still reads it against the policies.");
    return { items: items, fills: fills, bad: bad };
  };
  function uniq(a) { var o = []; a.forEach(function (x) { if (o.indexOf(x) < 0) o.push(x); }); return o; }

  F.EXAMPLES = {
    polished: "Hi Dana! So sorry about the delay with your ship! Don't worry, we've got you covered: we'll hold the 10:30 boat for you, and you'll still be back in plenty of time for your ship. If anything goes wrong you get a full refund plus a free hot chocolate, guaranteed. Whales are out in force this week, so you're in for a treat! Call my cell anytime.",
    grounded: [
      "DRAFT - PENDING OWNER REVIEW",
      "To: [SHIP] shore excursion desk (cruise line terms apply)",
      "Booking [BOOKING REF], [PARTY SIZE] guests, cannot make the [BOOKED DEPARTURE] departure because the ship is now due at [FILL: new arrival time].",
      "Our policy: the guest chooses another departure today if one fits, or a full refund. We plan every cruise-guest departure to be back at the dock at least 60 minutes before all-aboard, so we offer only departures that meet that.",
      "Departures that fit today: [FILL: from the rebook board].",
      "Please send the guest's choice by [REPLY BY].",
      "[FILL: duty lead first name], Channel Light Excursions (fictional)"
    ].join("\n"),
    problems: [
      "Uses a guest's name in the draft. Names belong in the booking system, merged at send time.",
      "Promises to hold the boat. No policy says the boat waits, and every minute waited comes off everyone's all-aboard buffer.",
      "Says \"plenty of time\" for the ship. The policy is a 60-minute buffer, checked on the day, not a promise.",
      "Offers a refund \"plus a free hot chocolate, guaranteed\". The policy gives a choice of rebook or refund and nothing else.",
      "Promises whales. Wildlife is never promised.",
      "Gives a personal phone. Messages carry the business line only.",
      "Writes straight to the guest. Cruise-line guests are reached through the ship's shore excursion desk under our policy.",
      "No DRAFT line, so nothing stops it being sent unread."
    ]
  };

  /* ---------- "Getting here, honestly" website section ---------- */
  F.GH_FIELDS = [
    ["business", "Business name, as guests know it"],
    ["meeting_point", "Where we meet"],
    ["from_docks", "Getting there from the cruise docks"],
    ["check_in", "Check in, in minutes before departure"],
    ["departures", "Departure times"],
    ["transfer", "The transfer and how long it takes"],
    ["duration", "How long the trip takes, door to door"],
    ["buffer", "All-aboard buffer, in minutes"],
    ["tender", "If your ship anchors and tenders guests ashore"],
    ["flying_in", "Flying or arriving by ferry the same day"],
    ["ship_late", "If your ship is late or skips the port"],
    ["running_late", "If you are running late"],
    ["weather", "Weather"],
    ["contact", "On the day, call"]
  ];
  F.DEMO_GH = {
    business: "Channel Light Excursions (fictional)",
    meeting_point: "Our check-in table at the downtown cruise docks.",
    from_docks: "",
    check_in: "",
    departures: "8:00, 10:30, 13:00 and 15:30, May 1 to September 30.",
    transfer: "Kestrel Shuttle (fictional partner) drives you to Auke Bay, about 25 minutes each way.",
    duration: "About 4.5 hours from the downtown docks and back.",
    buffer: "60",
    tender: "Getting ashore by tender boat takes longer than walking off a docked ship. Pick a later departure and tell us your ship when you book.",
    flying_in: "",
    ship_late: "If your ship arrives late we offer another departure that still gets you back at least 60 minutes before all-aboard, or a full refund. Guests who booked through a cruise line follow the cruise line's terms.",
    running_late: "",
    weather: "We run in rain. We cancel for a marine weather warning or a vessel safety call by the captain, with a choice of rebooking or a full refund.",
    contact: ""
  };
  F.gettingHere = function (f) {
    f = f || {};
    var gaps = [];
    function v(k, what) { var s = str(f[k]); if (!s || /\[\s*fill/i.test(s)) { gaps.push(what); return s || "[FILL: " + what + "]"; } return s; }
    var name = v("business", "business name");
    var buf = str(f.buffer), bufOk = /^\d{1,3}$/.test(buf);
    if (!bufOk) gaps.push("all-aboard buffer in minutes");
    var ci = str(f.check_in), ciOk = /^\d{1,3}$/.test(ci);
    if (!ciOk) gaps.push("check-in minutes");
    var L = [];
    L.push("## Getting here, honestly");
    L.push("");
    L.push("Arrival times slip: ships run late, fog holds flights, roads back up. Here is how we plan for it, and what happens when it goes wrong.");
    L.push("");
    L.push("**Where we meet.** " + v("meeting_point", "meeting point"));
    L.push("");
    L.push("**From the cruise docks.** " + v("from_docks", "walking time and route from each cruise dock"));
    L.push("");
    L.push("**Check in** " + (ciOk ? ci + " minutes" : "[FILL: check-in minutes]") + " before your departure. Departures: " + v("departures", "departure times"));
    L.push("");
    L.push("**The transfer and the trip.** " + v("transfer", "transfer and its time") + " " + v("duration", "trip length"));
    L.push("");
    L.push("**Back before your ship.** We plan every cruise-guest departure to be back at the dock at least " + (bufOk ? buf + " minutes" : "[FILL: buffer minutes]") + " before your ship's all-aboard time. When you book, tell us your ship so we can check it.");
    L.push("");
    L.push("**If your ship anchors.** " + v("tender", "what tender guests should know"));
    L.push("");
    L.push("**Flying or arriving by ferry the same day.** " + v("flying_in", "how long after landing to book"));
    L.push("");
    L.push("**If your ship is late or skips the port.** " + v("ship_late", "ship-late policy"));
    L.push("");
    L.push("**If you are running late.** " + v("running_late", "late-guest policy"));
    L.push("");
    L.push("**Weather.** " + v("weather", "weather policy"));
    L.push("");
    L.push("**On the day, call** " + v("contact", "business phone for the day") + ".");
    L.push("");
    L.push("_" + name + ". We never promise weather or wildlife._");
    return { text: L.join("\n"), gaps: gaps };
  };
  F.gettingHerePrompt = function (sectionText) {
    return [
      "Tighten this website section for clarity. It is called \"Getting here, honestly\".",
      "",
      "SECTION:",
      str(sectionText) || "[PASTE THE SECTION]",
      "",
      "Rules:",
      "- Keep every fact, number and time exactly as written. Do not add any fact, time, distance, price or promise.",
      "- Keep every [FILL] as it is and list them at the end under QUESTIONS FOR THE OWNER.",
      "- Plain words, short sentences, under 250 words. Keep the bold headings.",
      "- Do not promise weather, wildlife, or that a ship, flight or boat will wait.",
      "- Put this on the first line: DRAFT - PENDING OWNER REVIEW"
    ].join("\n");
  };

  /* ---------- measures ---------- */
  F.recoveryRate = function (guests, recovered) {
    var g = str(guests), r = str(recovered);
    if (!/^\d{1,7}$/.test(g) || !/^\d{1,7}$/.test(r)) return { ok: false, error: "Enter whole numbers of guests." };
    var gn = parseInt(g, 10), rn = parseInt(r, 10);
    if (gn === 0) return { ok: false, error: "No guests on disrupted bookings yet." };
    if (rn > gn) return { ok: false, error: "Recovered guests cannot be more than guests on disrupted bookings." };
    return { ok: true, rate: Math.round(1000 * rn / gn) / 10, guests: gn, recovered: rn };
  };
  F.parseMinutesList = function (text) {
    var vals = [], bad = [];
    str(text).split(/[\s,;]+/).forEach(function (p) {
      if (!p) return;
      if (/^\d{1,4}$/.test(p)) vals.push(parseInt(p, 10)); else bad.push(p);
    });
    return { values: vals, bad: bad };
  };
  F.median = function (list) {
    if (!list || !list.length) return null;
    var a = list.slice().sort(function (x, y) { return x - y; }), n = a.length;
    return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
  };

  /* the fictional 2026 disruption log, by cause (from data/disruptions_2026.csv) */
  F.LOG_2026 = [
    { cause: "Marine weather hold", events: 9, guests: 205, recovered: 69, lost: 21187 },
    { cause: "Ship late or tendering from anchor", events: 14, guests: 180, recovered: 78, lost: 12603 },
    { cause: "Flight delay or fog (independent guests)", events: 7, guests: 81, recovered: 26, lost: 9304 },
    { cause: "Road or traffic delay on the shuttle route", events: 5, guests: 39, recovered: 6, lost: 4985 },
    { cause: "Ship schedule change or skipped call", events: 3, guests: 40, recovered: 12, lost: 3517 }
  ];

  if (typeof module !== "undefined" && module.exports) module.exports = F;
  else root.FMEA = F;
})(this);
