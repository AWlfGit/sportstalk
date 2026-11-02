// Where every team is based, for the page's Local mode:  node research/get-places.js
// Build-time research, run by hand now and then (new teams, promotions). CFL and rugby schedules
// carry no venues, so those teams come from research/places-manual.json. Visitors' browsers never
// contact any of these services: the results are saved in research/places.json and built into
// the page.
//
// 1. ESPN: each league's teams, then each team's schedule. A team's home is the city of the venue
//    where it plays most of its home games (games ESPN marks as neutral-site don't count). Rugby
//    schedules carry no venues, so rugby clubs and national sides come from
//    research/places-manual.json. F1 races use the circuit's city.
// 2. OpenStreetMap's Nominatim service: each city's coordinates, at most one request a second (its
//    usage policy), cached in research/geocode-cache.json so a re-run only looks up new places.
//    Also the city of every time zone, which is how the page guesses a visitor's area without
//    asking (their device's time zone).
// Data: ESPN; coordinates © OpenStreetMap contributors (ODbL), credited on the page.
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const SITE = "https://site.api.espn.com/apis/site/v2/sports/";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const UA = "LudicrousDisplay-sportstalk/1.0 (one-off build-time geocoding of team home cities; https://github.com/AWlfGit/sportstalk)";
const CACHE_FILE = path.join(__dirname, "geocode-cache.json");
const OUT_FILE = path.join(__dirname, "places.json");

const app = fs.readFileSync(path.join(ROOT, "src", "app.html"), "utf8");
const LEAGUES = new Function("return " + app.match(/const LEAGUES=(\{[\s\S]*?\n  \});/)[1])();
// The same key the page uses: soccer and rugby team ids are shared across competitions
const placeKey = (lg, id) => (/^(soccer|rugby)\//.test(lg) ? lg.split("/")[0] : lg) + ":" + id;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const r2 = (x) => Math.round(x * 100) / 100;

async function getJSON(url) {
  for (let k = 0; k < 3; k++) {
    try { const r = await fetch(url); if (r.ok) return await r.json(); } catch (e) { /* retry */ }
    await sleep(700 * (k + 1));
  }
  return null;
}
async function pool(items, n, fn) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}

// ---- Teams and their home venues ----
async function teamsOf(lg) {
  if (lg === "football/college-football") {
    // The top division only (FBS): every team in the FBS standings (ESPN's group lists stop at 25)
    const j = await getJSON("https://site.api.espn.com/apis/v2/sports/football/college-football/standings?group=80");
    const out = new Map();
    const walk = (n) => { if (!n) return; for (const e of (n.standings && n.standings.entries) || []) if (e.team) out.set(String(e.team.id), e.team.displayName); (n.children || []).forEach(walk); };
    walk(j);
    return [...out].map(([id, n]) => ({ id, n }));
  }
  const j = await getJSON(SITE + lg + "/teams?limit=1000");
  return (((j && j.sports && j.sports[0] && j.sports[0].leagues[0].teams) || [])).map((x) => ({ id: String(x.team.id), n: x.team.displayName }));
}
const addr = (a) => {
  if (!a || !a.city) return null;
  const country = a.country === "USA" ? "United States" : a.country || "";
  return [a.city, a.state && a.state !== country ? a.state : "", country].filter(Boolean).join(", ");
};
const few = [];
async function homeOf(lg, id) {
  const seasons = ["", "?season=" + (new Date().getFullYear() - 1)];
  for (const q of seasons) {
    const j = await getJSON(SITE + lg + "/teams/" + id + "/schedule" + q);
    const count = new Map();
    for (const e of (j && j.events) || []) {
      const c = e.competitions && e.competitions[0];
      if (!c || c.neutralSite) continue;
      const home = (c.competitors || []).find((x) => x.homeAway === "home");
      if (!home || String(home.id || (home.team && home.team.id)) !== String(id)) continue;
      const a = addr(c.venue && c.venue.address);
      if (a) count.set(a, (count.get(a) || 0) + 1);
    }
    if (count.size) { const [c, n] = [...count.entries()].sort((x, y) => y[1] - x[1])[0]; if (n < 3) few.push(placeKey(lg, id) + " " + c + " (" + n + " home game" + (n > 1 ? "s" : "") + ")"); return c; }
  }
  return null;
}

// ---- Coordinates ----
let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")); } catch (e) { cache = {}; }
let last = 0, asked = 0;
async function geocode(q, cityOnly) {
  const key = (cityOnly ? "city:" : "") + q;
  if (key in cache) return cache[key];
  const wait = 1100 - (Date.now() - last); if (wait > 0) await sleep(wait);
  last = Date.now(); asked++;
  let hit = null;
  try {
    const r = await fetch(NOMINATIM + "?format=jsonv2&limit=1&addressdetails=1&accept-language=en&q=" + encodeURIComponent(q) + (cityOnly ? "&featureType=city" : ""), { headers: { "User-Agent": UA, "Accept-Language": "en" } });
    if (r.ok) { const x = (await r.json())[0]; if (x) hit = { ll: [r2(+x.lat), r2(+x.lon)], cc: (x.address && x.address.country_code) || "" }; }
    else if (r.status === 429 || r.status === 403) throw new Error("Nominatim refused (" + r.status + "): stopping so the policy isn't strained");
  } catch (e) { if (/refused/.test(e.message)) throw e; }
  cache[key] = hit;
  if (asked % 25 === 0) { fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 0)); process.stdout.write(`  ${asked} looked up\n`); }
  return hit;
}

// Countries each league's teams should be in (a check, not a filter)
const EXPECT = { "football/nfl": ["us"], "football/college-football": ["us"], "football/cfl": ["ca"], "basketball/nba": ["us", "ca"], "hockey/nhl": ["us", "ca"], "baseball/mlb": ["us", "ca"], "soccer/usa.1": ["us", "ca"], "soccer/eng.1": ["gb"], "soccer/eng.2": ["gb"], "soccer/sco.1": ["gb"], "soccer/esp.1": ["es"], "soccer/ita.1": ["it"], "soccer/ger.1": ["de"], "soccer/fra.1": ["fr", "mc"] };

(async () => {
  const teams = {}, warn = [], none = [];
  const leagues = Object.values(LEAGUES).flat().map((x) => x[0]).filter((lg) => !/^racing|^rugby/.test(lg)).sort((a, b) => /uefa/.test(a) - /uefa/.test(b));
  for (const lg of leagues) {
    const list = await teamsOf(lg);
    const homes = await pool(list, 6, (t) => homeOf(lg, t.id));
    let found = 0;
    list.forEach((t, i) => { const k = placeKey(lg, t.id); if (homes[i]) { found++; if (!teams[k]) teams[k] = { n: t.n, c: homes[i], lg }; } else if (!teams[k]) none.push(lg + " " + t.n); });
    console.log(`${lg}: ${list.length} teams, ${found} with a home venue`);
  }
  const MAN = JSON.parse(fs.readFileSync(path.join(__dirname, "places-manual.json"), "utf8"));
  for (const [k, [n, c]] of Object.entries(MAN.teams || {})) teams[k] = { n, c, lg: k.split(":")[0] };
  const covered = (x) => Object.values(MAN.teams || {}).some(([n]) => x.endsWith(" " + n));
  for (let i = none.length - 1; i >= 0; i--) if (covered(none[i])) none.splice(i, 1);
  // F1: circuits of this year's and last year's races
  const circuits = {};
  for (const y of [new Date().getFullYear(), new Date().getFullYear() - 1]) {
    const j = await getJSON(SITE + "racing/f1/scoreboard?dates=" + y);
    for (const e of (j && j.events) || []) { const c = e.circuit; const a = c && ((MAN.circuits || {})[c.fullName] || addr(c.address)); if (c && c.fullName && a) circuits[c.fullName] = a; }
  }
  console.log(`F1: ${Object.keys(circuits).length} circuits`);

  // Coordinates for every home city and circuit
  const places = {};
  for (const c of new Set([...Object.values(teams).map((t) => t.c), ...Object.values(circuits)])) places[c] = await geocode(c, false);
  // Time zones: the city each one is named after
  // A zone named after a country or island, or a city name found in several countries, uses an
  // explicit "City, Country" query from places-manual.json. Every zone is then checked against its
  // UTC offset: a place more than about 1.6 hours of longitude from it is a wrong lookup (Malta found
  // in New York state) and is dropped, except the few real zones that sit far from their offset.
  const offsetOf = (tz, d) => { const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(d).find((x) => x.type === "timeZoneName").value; const m = /GMT([+-]\d+)(?::(\d+))?/.exec(f); return m ? +m[1] + (m[2] ? Math.sign(+m[1] || 1) * m[2] / 60 : 0) : 0; };
  const FAR_FROM_OFFSET = new Set(["Africa/El_Aaiun", "America/Adak", "America/Nome", "America/Inuvik", "America/Whitehorse", "America/Dawson", "America/Argentina/Rio_Gallegos", "America/Argentina/Ushuaia", "America/Coyhaique", "America/Punta_Arenas", "Pacific/Apia", "Pacific/Fakaofo", "Pacific/Kiritimati", "Pacific/Chatham", "Pacific/Tongatapu", "Asia/Kashgar", "Asia/Urumqi", "Europe/Madrid", "Atlantic/Canary"]);
  const zones = {}, dropped = [];
  const ZONES = [...new Set([...Intl.supportedValuesOf("timeZone"), ...Object.keys(MAN.zones || {})])];
  for (const tz of ZONES) {
    const p = tz.split("/"); if (p.length < 2 || /^(Etc|Antarctica)$/.test(p[0])) continue;
    const city = p[p.length - 1].replace(/_/g, " "), hint = p.length === 3 ? ", " + p[1].replace(/_/g, " ") : "";
    const q = (MAN.zones || {})[tz];
    const hit = q ? await geocode(q, false) : await geocode(city + hint, true);
    if (!hit) { dropped.push(tz + " (not found)"); continue; }
    const std = Math.min(offsetOf(tz, new Date(Date.UTC(2026, 0, 15))), offsetOf(tz, new Date(Date.UTC(2026, 6, 15))));
    let diff = Math.abs(hit.ll[1] / 15 - std); if (diff > 12) diff = 24 - diff;
    if (diff > 1.6 && !FAR_FROM_OFFSET.has(tz)) { dropped.push(tz + " (looked up at " + hit.ll.join(", ") + ", too far from UTC" + (std >= 0 ? "+" : "") + std + ")"); continue; }
    zones[tz] = [q ? q.split(",")[0] : city, hit.ll[0], hit.ll[1], hit.cc || ""];
  }
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 0));

  const cities = [];
  for (const q of MAN.cities || []) { const g = await geocode(q, false); if (g) cities.push([q.replace(/, United States$/, "").replace(/^(.+?), ([A-Za-z ]+), (Canada)$/, "$1, $3"), g.ll[0], g.ll[1]]); }
  const out = { about: "Where teams are based, for Local mode. Built by research/get-places.js: home venues from ESPN team schedules (rugby by hand, research/places-manual.json), coordinates © OpenStreetMap contributors (ODbL) via Nominatim. Keys match placeKey() in src/app.html.", built: new Date().toISOString().slice(0, 10), teams: {}, circuits: {}, zones, cities };
  for (const [k, t] of Object.entries(teams).sort()) {
    const g = places[t.c];
    if (!g) { none.push(t.lg + " " + t.n + " (no coordinates for " + t.c + ")"); continue; }
    const exp = EXPECT[t.lg];
    if (exp && g.cc && !exp.includes(g.cc)) warn.push(`${t.lg} ${t.n}: ${t.c} looked up in '${g.cc}'`);
    out.teams[k] = [t.n, t.c, g.ll[0], g.ll[1]];
  }
  for (const [name, c] of Object.entries(circuits).sort()) { const g = places[c]; if (g) out.circuits[name] = [c, g.ll[0], g.ll[1]]; }
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 1) + "\n");
  console.log(`\n${Object.keys(out.teams).length} teams placed, ${Object.keys(out.circuits).length} circuits, ${Object.keys(zones).length} time zones; ${asked} new lookups`);
  console.log(`No home found (${none.length}):`); for (const x of none) console.log("  " + x);
  const lostCircuits = Object.keys(circuits).filter((n) => !out.circuits[n]);
  if (lostCircuits.length) { console.log(`CIRCUITS WITH NO COORDINATES (${lostCircuits.length}), add a query to places-manual.json "circuits":`); for (const x of lostCircuits) console.log("  " + x + " (" + circuits[x] + ")"); }
  console.log(`Time zones dropped (${dropped.length}), add a query to places-manual.json "zones" if it's a real place:`); for (const x of dropped) console.log("  " + x);
  console.log(`Check these (${warn.length}):`); for (const x of warn) console.log("  " + x);
  console.log(`Homes decided by fewer than 3 home games (${few.filter((x) => !MAN.teams[x.split(" ")[0]]).length}); add to places-manual.json if wrong:`); for (const x of few) if (!MAN.teams[x.split(" ")[0]]) console.log("  " + x);
})().catch((e) => { fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 0)); console.error(e); process.exit(1); });
