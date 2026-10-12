/* 404 helper: offers a one-tap fix for common typos. Nothing is sent anywhere. */
/* Offer a one-tap fix for common typos (capital letters, "1.a", missing parts). Nothing is sent anywhere. */
(function () {
  var known = {
    "leak": ["/atiaops/leak/", "the Season Leak Audit"], "audit": ["/atiaops/leak/", "the Season Leak Audit"],
    "1a": ["/atiaops/1a/", "1.a Rehire before you recruit"], "1b": ["/atiaops/1b/", "1.b Standard work and crew coach"],
    "1c": ["/atiaops/1c/", "1.c Season staffing model"], "2a": ["/atiaops/2a/", "2.a Journey FMEA and playbook"],
    "2b": ["/atiaops/2b/", "2.b Arrival watch and backfill"], "2c": ["/atiaops/2c/", "2.c Re-planner and loss ledger"],
    "3a": ["/atiaops/3a/", "3.a Fill every capped slot"], "3b": ["/atiaops/3b/", "3.b Off-cap product lab"],
    "3c": ["/atiaops/3c/", "3.c Revenue-per-slot optimizer"], "team": ["/atiaops/team/", "the team tools"],
    "pain1": ["/atiaops/#pain1", "Pain 1 on the map"], "pain2": ["/atiaops/#pain2", "Pain 2 on the map"],
    "pain3": ["/atiaops/#pain3", "Pain 3 on the map"],
    "promptkithtml": ["/atiaops/Prompt-Kit.html", "the printable prompt kit"],
    "promptkit": ["/atiaops/Prompt-Kit.html", "the printable prompt kit"],
    "future": ["https://preig.github.io/atiafuture/", "the AI impact horizon page"],
    "atiafuture": ["https://preig.github.io/atiafuture/", "the AI impact horizon page"],
    "index": ["/atiaops/", "the kit home page"], "indexhtml": ["/atiaops/", "the kit home page"]
  };
  function link(href, text) {
    var a = document.createElement("a");
    a.href = href; a.textContent = text;
    return a;
  }
  function say(nodes) {
    var box = document.getElementById("suggest");
    if (!box) return;
    box.textContent = "";
    nodes.forEach(function (n) { box.appendChild(typeof n === "string" ? document.createTextNode(n) : n); });
    box.className += " on";
  }
  function show(target) {
    if (target) say(["Did you mean ", link(target[0], target[1]), "?"]);
  }
  try {
    var path = decodeURIComponent(location.pathname || "");
    var parts = path.split("/").filter(function (p) { return p; });
    var i = parts.map(function (p) { return p.toLowerCase(); }).indexOf("atiaops");
    var rest = i >= 0 ? parts.slice(i + 1) : parts;
    for (var n = 0; n < rest.length; n++) {
      var key = rest[n].toLowerCase().replace(/[^a-z0-9]/g, "");
      if (known[key]) {
        var exact = known[key][0] === path || known[key][0] === path + "/";
        if (!exact) show(known[key]);
        else if (/^[123][abc]$/.test(key)) {
          /* the address is right but that tool page is not uploaded yet: point to its prompt in the printable kit */
          say(["This tool page is not published yet. Its prompt is in the ",
            link("/atiaops/Prompt-Kit.html#s" + key, "printable prompt kit, section " + key.charAt(0) + "." + key.charAt(1)), "."]);
        }
        else say(["This page is not published yet. Start from ", link("/atiaops/", "all nine tools"), "."]);
        break;
      }
    }
    if (i < 0 && !rest.length) show(known.index);
  } catch (e) { }
})();
