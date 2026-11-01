// Builds Ludicrous Display with a fresh snapshot of ESPN results.
//   node src/build.js
// Writes:
//   ludicrous-display.html  full page for opening on your computer (loads live results, snapshot as backup)
//   src/artifact.html       the same page without the document wrapper, for publishing on claude.ai
// Options:
//   --site <folder>     also write the website copy (index.html, fonts/, logos/) into that folder
//   --feed <folder>     also write the results feed (results.json, logos/) the website copy loads
//   --feed-url <url>    where the website copy finds that feed (default: the repository's feed branch)
//   --site-only         skip the two files above
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

// Talk packs: researched slang, phrases, pub-test rounds and five-beat exchanges for a sport.
// Each file in research/ maps to a sport key in the page; missing files are simply skipped.
const TALK_FILES = { nhl: "hockey-canada.json", football: "football-uk.json", nfl: "football-nfl.json" };
function loadTalk() {
  const str = (v) => (typeof v === "string" ? v.trim() : "");
  const arr = (v) => (Array.isArray(v) ? v : []);
  let blocked = [];
  try { blocked = JSON.parse(fs.readFileSync(path.join(root, "research", "blocked.json"), "utf8")); } catch (e) { /* none */ }
  const ok = (text) => !blocked.some((b) => String(text).toLowerCase().includes(String(b).toLowerCase()));
  const out = {};
  for (const [sport, file] of Object.entries(TALK_FILES)) {
    const p = path.join(root, "research", file);
    if (!fs.existsSync(p)) continue;
    let d;
    try { d = JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) { console.warn("Skipping", file, "-", e.message); continue; }
    const P = { terms: [], phrases: {}, exchanges: {}, pub: [], avoid: [], nerd: "", offq: "" };
    P.terms = arr(d.terms).map((x) => ({ term: str(x && x.term), say: str(x && x.say), means: str(x && x.means), use: str(x && x.use) }))
      .filter((x) => x.term && x.means && ok(x.term + " " + x.means + " " + x.use));
    for (const k of ["open", "opinion", "agree", "dodge", "telly", "exit"]) {
      P.phrases[k] = arr(d.phrases && d.phrases[k]).map((x) => ({ t: str(x && x.t), m: str(x && x.m) })).filter((x) => x.t && ok(x.t + " " + x.m));
    }
    for (const [k, v] of Object.entries(d.exchanges || {})) {
      const e = {};
      for (const b of ["open", "them", "back", "agree", "exit"]) if (str(v && v[b]) && ok(v[b])) e[b] = str(v[b]);
      if (Object.keys(e).length) P.exchanges[k] = e;
    }
    P.pub = arr(d.pub).map((r) => ({ say: str(r && r.say), o: arr(r && r.o).filter((o) => Array.isArray(o) && str(o[0]) && [2, 1, 0, -1, -2].includes(+o[1])).map((o) => [str(o[0]), +o[1], str(o[2])]) }))
      .filter((r) => r.say && r.o.length === 3 && r.o.some((o) => o[1] === 2) && ok(r.say + " " + r.o.map((o) => o[0]).join(" ")));
    P.avoid = arr(d.avoid).map((x) => ({ say: str(x && x.say), instead: str(x && x.instead), why: str(x && x.why) })).filter((x) => x.say && x.instead && ok(x.say + " " + x.why));
    if (ok(str(d.nerd))) P.nerd = str(d.nerd);
    if (ok(str(d.offq))) P.offq = str(d.offq);
    out[sport] = P;
  }
  return out;
}

// Team logos from ESPN's image server: a crisp 96px copy for the Modern look and a 16px copy the
// Retro look blows up into pixels. Downloads are cached in _cache/logos for 30 days.
const LOGO_SIZES = { big: 96, px: 16 };
const logoKey = (p) => p.replace(/^\/i\/teamlogos\//, "").replace(/\.png$/i, "").replace(/[^a-z0-9]+/gi, "-");
async function fetchLogos(snap) {
  const cache = path.join(root, "_cache", "logos");
  fs.mkdirSync(cache, { recursive: true });
  const paths = new Set();
  for (const games of Object.values(snap.leagues)) for (const g of games) for (const t of [g.h, g.a]) if (t && /^\/i\/teamlogos\/[\w\/.-]+\.png$/i.test(t.lo || "")) paths.add(t.lo);
  const get = async (p, size, file) => {
    const f = path.join(cache, file);
    if (fs.existsSync(f) && Date.now() - fs.statSync(f).mtimeMs < 30 * 864e5) return fs.readFileSync(f);
    const r = await fetch("https://a.espncdn.com/combiner/i?img=" + p + "&w=" + size + "&h=" + size);
    if (!r.ok || !/^image\/png/.test(r.headers.get("content-type") || "")) throw new Error("HTTP " + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(f, buf);
    return buf;
  };
  const list = [...paths], out = new Map();
  let next = 0, failed = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (next < list.length) {
      const p = list[next++], k = logoKey(p);
      try { out.set(k, { big: await get(p, LOGO_SIZES.big, k + ".png"), px: await get(p, LOGO_SIZES.px, k + "-px.png") }); } catch (e) { failed++; }
    }
  }));
  console.log("Logos:", out.size, "teams", failed ? "(" + failed + " unavailable)" : "");
  return out;
}

// Logo files for the website copy and the feed. Logos for teams no longer in the results are removed.
function writeLogos(dir, logos) {
  fs.mkdirSync(dir, { recursive: true });
  const keep = new Set();
  for (const [k, v] of logos) {
    keep.add(k + ".png"); keep.add(k + "-px.png");
    fs.writeFileSync(path.join(dir, k + ".png"), v.big);
    fs.writeFileSync(path.join(dir, k + "-px.png"), v.px);
  }
  for (const f of fs.readdirSync(dir)) if (/^[a-z0-9-]+\.png$/i.test(f) && !keep.has(f)) fs.unlinkSync(path.join(dir, f));
}

// Where the website copy loads fresh results from (the repository's feed branch)
const fu = process.argv.indexOf("--feed-url");
const feedUrl = fu > 0 && process.argv[fu + 1] ? process.argv[fu + 1] : "https://raw.githubusercontent.com/AWlfGit/sportstalk/feed/";

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
  const talk = loadTalk();
  console.log("Talk packs:", Object.keys(talk).map((k) => k + " (" + Object.keys(talk[k].exchanges).length + " exchanges, " + talk[k].terms.length + " terms)").join(", ") || "none");
  // Character art in src/art/ is embedded into the page, so every copy works as a single file.
  const art = (m, f) => 'url("data:image/' + (f.endsWith(".png") ? "png" : "webp") + ";base64," + fs.readFileSync(path.join(__dirname, "art", f)).toString("base64") + '")';
  const base = src.replace(/url\("art\/([\w.-]+\.(?:webp|png))"\)/g, art)
    .replace("__SNAPSHOT__", () => json).replace("__LINGO__", () => safe(lingo)).replace("__TALK__", () => safe(talk));
  // Logos are embedded in the single-file copies; the website copy serves them as files instead.
  const logos = await fetchLogos(snap);
  const embedded = {}, files = {};
  for (const [k, v] of logos) {
    embedded[k] = ["data:image/png;base64," + v.big.toString("base64"), "data:image/png;base64," + v.px.toString("base64")];
    files[k] = ["logos/" + k + ".png", "logos/" + k + "-px.png"];
  }
  const page = base.replace("__LOGOS__", () => safe(embedded));
  console.log("Logo data:", (safe(embedded).length / 1024).toFixed(0), "KB embedded");
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
    let site = base.replace("__LOGOS__", () => safe(files));
    site = swap(site, /<!--FONTS-->[\s\S]*?<!--\/FONTS-->/, '<link rel="stylesheet" href="fonts/fonts.css">');
    site = swap(site, /const LIVE_MODE="auto";/, 'const LIVE_MODE="ask";');
    site = swap(site, /const FEED_URL="";/, () => "const FEED_URL=" + JSON.stringify(feedUrl) + ";");
    // Served as a folder (example.com/sportstalk/): add the trailing slash if a host leaves it off,
    // so the relative fonts/ and logos/ paths resolve inside the folder
    site = swap(site, /<title>/, '<script>if(!/\\/$|\\.html?$/.test(location.pathname))location.replace(location.pathname+"/"+location.search+location.hash)</script>\n<meta name="robots" content="noindex, nofollow">\n<title>');
    site = site.replace("/*ESPN-START*/", "").replace("/*ESPN-END*/", "");
    fs.mkdirSync(path.join(dir, "fonts"), { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), wrap(site));
    for (const f of fs.readdirSync(path.join(__dirname, "fonts"))) {
      fs.copyFileSync(path.join(__dirname, "fonts", f), path.join(dir, "fonts", f));
    }
    // Fonts that are no longer used (VT323) are removed from the site folder
    for (const f of fs.readdirSync(path.join(dir, "fonts"))) if (/^(vt323|OFL-vt323)/i.test(f)) fs.unlinkSync(path.join(dir, "fonts", f));
    writeLogos(path.join(dir, "logos"), logos);
    console.log("Website copy written to", dir, "(results feed: " + feedUrl + ")");
  }

  // Results feed (node src/build.js --feed <folder>): the snapshot plus every team logo, which the
  // GitHub workflow publishes to the repository's feed branch for the website copy to load.
  const fat = process.argv.indexOf("--feed");
  if (fat > 0 && process.argv[fat + 1]) {
    const dir = path.resolve(process.argv[fat + 1]);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "results.json"), JSON.stringify(snap));
    writeLogos(path.join(dir, "logos"), logos);
    fs.writeFileSync(path.join(dir, "README.md"), "# Ludicrous Display results feed\n\nESPN results and team logos, rebuilt by the workflow on `main` twice a day and on every push.\nThis branch is replaced on each run, so don't commit to it. Taken " + snap.taken + ".\n");
    console.log("Results feed written to", dir);
  }

  console.log("Snapshot:", (json.length / 1024).toFixed(0), "KB, taken", now.toLocaleString("en-GB"));
})();
