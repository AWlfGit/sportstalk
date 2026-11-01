// Builds Ludicrous Display with a fresh snapshot of ESPN results.
//   node src/build.js
// Writes:
//   ludicrous-display.html  full page for opening on your computer (loads live results, snapshot as backup)
//   src/artifact.html       the same page without the document wrapper, for publishing on claude.ai
// Options:
//   --site <folder>   also write the website copy (index.html and fonts/) into that folder
//   --site-only       skip the two files above and write only the website copy
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(__dirname, "app.html"), "utf8");

// Reuse the page's own ESPN code so the snapshot matches what the page fetches live.
const code = src.split("/*ESPN-START*/")[1].split("/*ESPN-END*/")[0];
const ESPN = new Function(code + ";return ESPN;")();

// Team guides: merges research/out/*.json, keeps only the fields the page uses, and drops any
// text containing a phrase listed in research/blocked.json (a JSON array of strings).
// Without the research folder (for example on GitHub), it uses src/lingo.json, the cleaned copy
// this script saves whenever the research folder is present.
function loadLingo() {
  const dir = path.join(root, "research", "out");
  const saved = path.join(__dirname, "lingo.json");
  if (!fs.existsSync(dir)) return fs.existsSync(saved) ? JSON.parse(fs.readFileSync(saved, "utf8")) : [];
  const str = (v) => (typeof v === "string" ? v.trim() : "");
  const arr = (v) => (Array.isArray(v) ? v : []);
  let blocked = [];
  try { blocked = JSON.parse(fs.readFileSync(path.join(root, "research", "blocked.json"), "utf8")); } catch (e) { /* none */ }
  const ok = (text) => !blocked.some((b) => String(text).toLowerCase().includes(String(b).toLowerCase()));
  const out = [], seen = new Set();
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch (e) { console.warn("Skipping", f, "-", e.message); continue; }
    for (const t of arr(data)) {
      const team = str(t.team), league = str(t.league);
      if (!team || !league || seen.has(league + "|" + team)) continue;
      seen.add(league + "|" + team);
      const e = {
        team, espnId: str(t.espnId), league,
        aliases: arr(t.aliases).map(str).filter(Boolean).map((s) => s.toLowerCase()).slice(0, 8),
        nickname: str(t.nickname), fans: str(t.fans), ground: str(t.ground),
        rivals: arr(t.rivals).map((r) => ({ team: str(r && r.team), name: str(r && r.name) || str(r && r.team), derby: str(r && r.derby) })).filter((r) => r.name).slice(0, 3),
        legends: arr(t.legends).map(str).filter(Boolean).slice(0, 4),
        memory: str(t.memory),
        lingo: arr(t.lingo).map((x) => ({ term: str(x && x.term), say: str(x && x.say), means: str(x && x.means) })).filter((x) => x.term && x.means && ok(x.term + " " + x.means)).slice(0, 5),
        lines: arr(t.lines).map((x) => ({ t: str(x && x.t), m: str(x && x.m) })).filter((x) => x.t && ok(x.t + " " + x.m)).slice(0, 6),
        avoid: arr(t.avoid).map((x) => ({ say: str(x && x.say), instead: str(x && x.instead), why: str(x && x.why) })).filter((x) => x.say && x.instead && ok(x.say + " " + x.why)).slice(0, 3),
      };
      if (!ok(e.memory)) e.memory = "";
      if (Array.isArray(t.drivers)) e.drivers = t.drivers.map(str).filter(Boolean).slice(0, 3);
      out.push(e);
    }
  }
  return out;
}

(async () => {
  const now = new Date();
  const snap = { taken: now.toISOString(), leagues: {}, tables: {} };
  for (const [lg, name] of [].concat(...Object.values(ESPN.LEAGUES))) {
    try {
      snap.leagues[lg] = (await ESPN.games(lg, 7, now)).slice(0, 60);
    } catch (e) {
      snap.leagues[lg] = [];
      console.warn("No games for", name, "-", e.message);
    }
    try {
      const t = await ESPN.standings(lg);
      if (Object.keys(t).length) snap.tables[lg] = t;
    } catch (e) { /* standings are optional */ }
    console.log(name.padEnd(28), String(snap.leagues[lg].length).padStart(3), "games");
  }

  const safe = (value) => JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .split(String.fromCharCode(0x2028)).join("\\u2028")
    .split(String.fromCharCode(0x2029)).join("\\u2029");
  const json = safe(snap);
  const lingo = loadLingo();
  if (fs.existsSync(path.join(root, "research", "out"))) fs.writeFileSync(path.join(__dirname, "lingo.json"), JSON.stringify(lingo, null, 1));
  const page = src.replace("__SNAPSHOT__", () => json).replace("__LINGO__", () => safe(lingo));
  console.log("Team guides:", lingo.length, "teams,", (safe(lingo).length / 1024).toFixed(0), "KB");
  const siteOnly = process.argv.includes("--site-only");
  if (!siteOnly) fs.writeFileSync(path.join(__dirname, "artifact.html"), page);

  const wrap = (p) => {
    const cut = p.indexOf("</style>") + "</style>".length;
    return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' +
      p.slice(0, cut) + "\n</head>\n<body>\n" + p.slice(cut) + "\n</body>\n</html>\n";
  };
  if (!siteOnly) fs.writeFileSync(path.join(root, "ludicrous-display.html"), wrap(page));

  // Website copy (node src/build.js --site <folder>): hidden from search engines, fonts served
  // from the site itself, and ESPN is only contacted when the visitor asks for live results.
  const at = process.argv.indexOf("--site");
  if (at > 0 && process.argv[at + 1]) {
    const dir = path.resolve(process.argv[at + 1]);
    const swap = (s, from, to) => { if (!from.test(s)) throw new Error("Site build: pattern not found " + from); return s.replace(from, to); };
    let site = page;
    site = swap(site, /<!--FONTS-->[\s\S]*?<!--\/FONTS-->/, '<link rel="stylesheet" href="fonts/fonts.css">');
    site = swap(site, /const LIVE_MODE="auto";/, 'const LIVE_MODE="ask";');
    site = swap(site, /<title>/, '<meta name="robots" content="noindex, nofollow">\n<title>');
    site = site.replace("/*ESPN-START*/", "").replace("/*ESPN-END*/", "");
    fs.mkdirSync(path.join(dir, "fonts"), { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), wrap(site));
    for (const f of fs.readdirSync(path.join(__dirname, "fonts"))) {
      fs.copyFileSync(path.join(__dirname, "fonts", f), path.join(dir, "fonts", f));
    }
    console.log("Website copy written to", dir);
  }

  console.log("Snapshot:", (json.length / 1024).toFixed(0), "KB, taken", now.toLocaleString("en-GB"));
})();
