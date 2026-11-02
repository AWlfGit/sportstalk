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

const str = (v) => (typeof v === "string" ? v.trim() : "");
const arr = (v) => (Array.isArray(v) ? v : []);
let blocked = [];
try { blocked = JSON.parse(fs.readFileSync(path.join(root, "research", "blocked.json"), "utf8")); } catch (e) { /* none */ }
const ok = (text) => !blocked.some((b) => String(text).toLowerCase().includes(String(b).toLowerCase()));
// Which page sport a league belongs to (the same split the page uses)
const SPORT_OF = (lg) => ({ soccer: "football", rugby: "rugby", cricket: "cricket", racing: "f1", football: "nfl", basketball: "nba", hockey: "nhl", baseball: "mlb", "australian-football": "afl", "rugby-league": "nrl" })[String(lg).split("/")[0]] || "";

// Local lingo: team guides (research/out/*.json) and region packs (research/regions/*.json), keeping
// only the fields the page uses, and dropping any text containing a phrase listed in
// research/blocked.json. Pronunciation respellings (tts) are collected separately into the speech
// lexicon. Without the research folder (for example on GitHub), it uses src/lingo.json, the cleaned
// copy this script saves whenever the research folder is present.
function loadLingo() {
  const dir = path.join(root, "research", "out");
  const saved = path.join(__dirname, "lingo.json");
  if (!fs.existsSync(dir)) {
    const d = fs.existsSync(saved) ? JSON.parse(fs.readFileSync(saved, "utf8")) : {};
    return Array.isArray(d) ? { teams: d, regions: {}, say: {} } : { teams: arr(d.teams), regions: d.regions || {}, say: d.say || {} };
  }
  const say = {};
  // A respelling only matters if it differs from the word itself
  const addSay = (scope, word, tts) => {
    word = str(word); tts = str(tts);
    if (!word || !tts || tts.toLowerCase() === word.toLowerCase() || !/^(?:[a-z']+|A)(?: (?:[a-z']+|A))*$/.test(tts)) return;
    const m = (say[scope] = say[scope] || {});
    if (!(word in m)) m[word] = tts;
  };
  const regions = loadRegions(addSay);
  const out = [], seen = new Set();
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch (e) { console.warn("Skipping", f, "-", e.message); continue; }
    for (const t of arr(data)) {
      const team = str(t.team), league = str(t.league);
      if (!team || !league || seen.has(league + "|" + team)) continue;
      seen.add(league + "|" + team);
      const sp = SPORT_OF(league);
      const WHEN = ["any", "win", "loss", "rival"];
      const e = {
        team, espnId: str(t.espnId), league, region: str(t.region),
        aliases: arr(t.aliases).map(str).filter(Boolean).map((s) => s.toLowerCase()).slice(0, 8),
        nickname: str(t.nickname), fans: str(t.fans), ground: str(t.ground),
        rivals: arr(t.rivals).map((r) => ({ team: str(r && r.team), name: str(r && r.name) || str(r && r.team), derby: str(r && r.derby) })).filter((r) => r.name).slice(0, 3),
        legends: arr(t.legends).map(str).filter(Boolean).slice(0, 4),
        memory: str(t.memory),
        lingo: arr(t.lingo).map((x) => ({ term: str(x && x.term), say: str(x && x.say), means: str(x && x.means), tts: str(x && x.tts) })).filter((x) => x.term && x.means && ok(x.term + " " + x.means)).slice(0, 8),
        lines: arr(t.lines).map((x) => ({ t: str(x && x.t), m: str(x && x.m), when: WHEN.includes(str(x && x.when)) ? str(x.when) : "any" })).filter((x) => x.t && ok(x.t + " " + x.m)).slice(0, 8),
        traditions: arr(t.traditions).map((x) => ({ name: str(x && x.name), means: str(x && x.means) })).filter((x) => x.name && x.means && ok(x.name + " " + x.means)).slice(0, 3),
        sore: arr(t.sore).map((x) => ({ topic: str(x && x.topic), why: str(x && x.why) })).filter((x) => x.topic && x.why && ok(x.topic + " " + x.why)).slice(0, 2),
        pronounce: arr(t.pronounce).map((x) => ({ word: str(x && x.word), say: str(x && x.say), why: str(x && x.why), tts: str(x && x.tts) })).filter((x) => x.word && x.say && ok(x.word + " " + x.why)).slice(0, 3),
        avoid: arr(t.avoid).map((x) => ({ say: str(x && x.say), instead: str(x && x.instead), why: str(x && x.why) })).filter((x) => x.say && x.instead && ok(x.say + " " + x.why)).slice(0, 4),
      };
      if (!ok(e.memory)) e.memory = "";
      if (Array.isArray(t.drivers)) e.drivers = t.drivers.map(str).filter(Boolean).slice(0, 3);
      // Respellings go to the speech lexicon; the page itself doesn't need them
      for (const x of e.lingo) { addSay(sp, x.term, x.tts); delete x.tts; }
      for (const x of e.pronounce) { addSay(sp, x.word, x.tts); delete x.tts; }
      for (const k of ["traditions", "sore", "pronounce"]) if (!e[k].length) delete e[k];
      if (!e.region) delete e.region;
      out.push(e);
    }
  }
  // Region words are spoken in every sport whose teams sit in that region
  for (const t of out) {
    const r = t.region && regions.list[t.region];
    if (r) for (const x of r._say) addSay(SPORT_OF(t.league), x.word, x.tts);
  }
  // Talk-pack slang with a respelling ("speccy"), spoken in that pack's sport
  for (const [sp, file] of Object.entries(TALK_FILES)) {
    let d = null;
    try { d = JSON.parse(fs.readFileSync(path.join(root, "research", file), "utf8")); } catch (e) { continue; }
    for (const x of arr(d && d.terms)) addSay(sp, x && x.term, x && x.tts);
  }
  // Hand-checked entries (research/pronounce.json) win over everything else
  const P = loadPronounce();
  for (const x of P.entries) {
    const scopes = x.scope === "*" ? ["*"] : String(x.scope || "*").split(",").map(str);
    for (const sc of scopes) { const m = (say[sc] = say[sc] || {}); m[str(x.word)] = str(x.tts); }
  }
  // Words that are also everyday English ("mate", "gone"): the page respells them only when the word
  // is spoken on its own, from its word card, so ordinary sentences keep the ordinary word
  if (P.alone.length) say._alone = P.alone;
  const regionsOut = {};
  for (const [id, r] of Object.entries(regions.list)) { const c = Object.assign({}, r); delete c._say; regionsOut[id] = c; }
  return { teams: out, regions: regionsOut, say };
}
function loadRegions() {
  const dir = path.join(root, "research", "regions"), list = {};
  if (!fs.existsSync(dir)) return { list };
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch (e) { console.warn("Skipping", f, "-", e.message); continue; }
    for (const r of arr(data)) {
      const id = str(r.id);
      if (!id || list[id]) continue;
      const words = arr(r.words).map((x) => ({ term: str(x && x.term), say: str(x && x.say), means: str(x && x.means), use: str(x && x.use), tts: str(x && x.tts) })).filter((x) => x.term && x.means && ok(x.term + " " + x.means + " " + x.use)).slice(0, 14);
      const pron = arr(r.pronounce).map((x) => ({ word: str(x && x.word), say: str(x && x.say), why: str(x && x.why), tts: str(x && x.tts) })).filter((x) => x.word && x.say && ok(x.word + " " + x.why)).slice(0, 6);
      const _say = words.map((x) => ({ word: x.term, tts: x.tts })).concat(pron.map((x) => ({ word: x.word, tts: x.tts })));
      for (const x of words) delete x.tts;
      for (const x of pron) delete x.tts;
      list[id] = {
        id, name: str(r.name), covers: str(r.covers), dialect: str(r.dialect), words, pronounce: pron,
        lines: arr(r.lines).map((x) => ({ t: str(x && x.t), m: str(x && x.m) })).filter((x) => x.t && ok(x.t + " " + x.m)).slice(0, 6),
        avoid: arr(r.avoid).map((x) => ({ say: str(x && x.say), instead: str(x && x.instead), why: str(x && x.why) })).filter((x) => x.say && x.instead && ok(x.say + " " + x.why)).slice(0, 5),
        habits: arr(r.habits).map(str).filter((h) => h && ok(h)).slice(0, 4),
        _say,
      };
    }
  }
  return { list };
}
// Local mode (src/local.js): where each team is based, the city of each time zone, and the cities a
// visitor can pick, from research/places.json (made by research/get-places.js). Coordinates are
// rounded to about a kilometre. Without the file, Local mode simply finds nothing near.
function loadPlaces() {
  const out = { t: {}, c: {}, z: {}, cities: [] };
  let d;
  try { d = JSON.parse(fs.readFileSync(path.join(root, "research", "places.json"), "utf8")); } catch (e) { return out; }
  const ll = (a, b) => [Math.round(a * 100) / 100, Math.round(b * 100) / 100];
  // City labels for the picker, in English with short region codes: "Seattle, Washington, United
  // States" -> "Seattle, WA"; "Toronto, Ontario" -> "Toronto, ON"; "München, Germany" -> "Munich, Germany"
  const US = { Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO", Connecticut: "CT", Delaware: "DE", "District of Columbia": "DC", Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY" };
  const CA = { Alberta: "AB", "British Columbia": "BC", Manitoba: "MB", "New Brunswick": "NB", "Newfoundland and Labrador": "NL", "Nova Scotia": "NS", Ontario: "ON", "Prince Edward Island": "PE", Quebec: "QC", "Québec": "QC", Saskatchewan: "SK" };
  const EN = { "München": "Munich", Muenchen: "Munich", Roma: "Rome", Torino: "Turin", Napoli: "Naples", Milano: "Milan", Firenze: "Florence", Genova: "Genoa", Venezia: "Venice", Sevilla: "Seville", "Köln": "Cologne", Koeln: "Cologne", Lisboa: "Lisbon", Bucuresti: "Bucharest", "București": "Bucharest", Warszawa: "Warsaw", Praha: "Prague", Wien: "Vienna", Bruxelles: "Brussels", Brussel: "Brussels", "København": "Copenhagen", Kobenhavn: "Copenhagen", "Göteborg": "Gothenburg", Moskva: "Moscow", Athina: "Athens", "Den Haag": "The Hague", "Frankfurt am Main": "Frankfurt", Donostia: "San Sebastian", "Donostia-San Sebastián": "San Sebastian", Bilbo: "Bilbao", "Iruña": "Pamplona", Gasteiz: "Vitoria", "Vitoria-Gasteiz": "Vitoria", "Beograd": "Belgrade", "Kraków": "Krakow", "Plzeň": "Pilsen", "Zürich": "Zurich", "Genève": "Geneva", "Thessaloniki": "Thessaloniki", "New York City": "New York" };
  const STATES = new Set([...Object.keys(US), ...Object.values(US)]), PROVS = new Set([...Object.keys(CA), ...Object.values(CA)]);
  const label = (c) => {
    const p = String(c).split(", ").map((x) => x.trim()).filter(Boolean);
    const city = EN[p[0]] || p[0], rest = p.slice(1), country = rest[rest.length - 1] || "", region = rest.length > 1 ? rest[0] : "";
    if (country === "United States" || country === "USA" || (!region && STATES.has(country))) { const r = region || country; return city + (US[r] || (/^[A-Z]{2}$/.test(r) ? r : "") ? ", " + (US[r] || r) : ", USA"); }
    if (country === "Canada" || (!region && PROVS.has(country))) { const r = region || (PROVS.has(country) ? country : ""); return city + ", " + (CA[r] || (/^[A-Z]{2}$/.test(r) ? r : "Canada")); }
    return country ? city + ", " + country : city;
  };
  // Each place is listed once: a second name for the same spot (Roma beside Rome, within about 2 km) is dropped. Time
  // zones go first, so their plain English names ("Toronto", "Rome") win.
  const rank = new Map();
  const addCity = (name, a, b) => {
    const head = (x) => x.split(",")[0].toLowerCase();
    for (const c of out.cities) if (c[0].toLowerCase() === name.toLowerCase() || (Math.abs(c[1] - a) < 0.02 && Math.abs(c[2] - b) < 0.03) || (head(c[0]) === head(name) && Math.abs(c[1] - a) < 0.3 && Math.abs(c[2] - b) < 0.4)) return;
    out.cities.push([name, ...ll(a, b)]); rank.set(name, rank.size);
  };
  const regionName = (() => { try { const dn = new Intl.DisplayNames(["en"], { type: "region" }); return (cc) => (cc ? (cc.toUpperCase() === "US" ? "USA" : cc.toUpperCase() === "GB" ? "UK" : dn.of(cc.toUpperCase())) : ""); } catch (e) { return () => ""; } })();
  for (const [tz, v] of Object.entries(d.zones || {})) { const c = regionName(v[3]); out.z[tz] = [v[0] + (c && c !== v[0] ? ", " + c : ""), ...ll(v[1], v[2])]; }
  // Browsers report some time zones by an older or newer name than Node lists (India is
  // "Asia/Kolkata" in one and "Asia/Calcutta" in another), so each name answers for the other,
  // and both use today's name for the city (Kolkata, Kyiv)
  const ALIASES = [["Asia/Kolkata", "Asia/Calcutta"], ["Asia/Kathmandu", "Asia/Katmandu"], ["Asia/Ho_Chi_Minh", "Asia/Saigon"], ["Asia/Yangon", "Asia/Rangoon"], ["Asia/Dhaka", "Asia/Dacca"], ["Asia/Thimphu", "Asia/Thimbu"], ["Asia/Ulaanbaatar", "Asia/Ulan_Bator"], ["Asia/Macau", "Asia/Macao"], ["Asia/Jerusalem", "Asia/Tel_Aviv"], ["Europe/Kyiv", "Europe/Kiev"], ["Europe/Istanbul", "Asia/Istanbul"], ["Atlantic/Faroe", "Atlantic/Faeroe"], ["America/Argentina/Buenos_Aires", "America/Buenos_Aires"], ["America/Argentina/Cordoba", "America/Cordoba"], ["America/Indiana/Indianapolis", "America/Indianapolis"], ["America/Kentucky/Louisville", "America/Louisville"], ["America/Nuuk", "America/Godthab"], ["America/Atikokan", "America/Coral_Harbour"], ["Pacific/Chuuk", "Pacific/Truk"], ["Pacific/Pohnpei", "Pacific/Ponape"], ["Pacific/Kanton", "Pacific/Enderbury"], ["Africa/Asmara", "Africa/Asmera"], ["America/Toronto", "America/Montreal"], ["America/Toronto", "America/Nipigon"], ["America/Toronto", "America/Thunder_Bay"], ["America/Edmonton", "America/Yellowknife"], ["America/Winnipeg", "America/Rainy_River"], ["Australia/Sydney", "Australia/Canberra"], ["Australia/Sydney", "Australia/ACT"], ["Australia/Sydney", "Australia/NSW"], ["America/New_York", "US/Eastern"], ["America/Chicago", "US/Central"], ["America/Denver", "US/Mountain"], ["America/Phoenix", "US/Arizona"], ["America/Los_Angeles", "US/Pacific"], ["America/Anchorage", "US/Alaska"], ["Pacific/Honolulu", "US/Hawaii"], ["America/Halifax", "Canada/Atlantic"], ["America/Toronto", "Canada/Eastern"], ["America/Winnipeg", "Canada/Central"], ["America/Edmonton", "Canada/Mountain"], ["America/Vancouver", "Canada/Pacific"], ["America/Regina", "Canada/Saskatchewan"], ["America/St_Johns", "Canada/Newfoundland"], ["Europe/London", "GB"], ["Europe/Dublin", "Eire"], ["Asia/Shanghai", "PRC"], ["Asia/Tokyo", "Japan"], ["Pacific/Auckland", "NZ"]];
  const cityOf = (tz) => tz.split("/").pop().replace(/_/g, " ");
  for (const [a, b] of ALIASES) {
    const src = out.z[a] || out.z[b];
    if (!src) continue;
    const plain = (z) => z.includes("/") && !z.startsWith("US/") && !z.startsWith("Canada/");
    const name = plain(a) && plain(b) ? cityOf(a) : src[0];
    const country = String(src[0]).includes(", ") ? String(src[0]).slice(String(src[0]).indexOf(", ")) : "";
    const full = name === src[0] || name.includes(", ") ? name : name + country;
    out.z[a] = [full, src[1], src[2]]; out.z[b] = [full, src[1], src[2]];
  }
  for (const v of Object.values(out.z)) addCity(v[0], v[1], v[2]);
  for (const [k, v] of Object.entries(d.teams || {})) { out.t[k] = ll(v[2], v[3]); addCity(label(v[1]), v[2], v[3]); }
  for (const [k, v] of Object.entries(d.circuits || {})) out.c[k] = ll(v[1], v[2]);
  for (const v of d.cities || []) addCity(label(v[0]), v[1], v[2]);
  // Alphabetical, but places sharing a name keep the order they were added in: time-zone cities
  // (the big ones) first, so "london" finds London, UK before London, Ontario
  const head = (x) => x[0].split(",")[0].toLowerCase();
  out.cities.sort((x, y) => head(x).localeCompare(head(y)) || rank.get(x[0]) - rank.get(y[0]));
  return out;
}

// Hand-checked pronunciation fixes, e.g. the Canadian "eh" (research/pronounce.json)
function loadPronounce() {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(root, "research", "pronounce.json"), "utf8"));
    return { entries: arr(d.entries).filter((x) => str(x.word) && str(x.tts)), alone: arr(d.alone).map(str).filter(Boolean).map((w) => w.toLowerCase()) };
  } catch (e) { return { entries: [], alone: [] }; }
}

// Talk packs: researched slang, phrases, pub-test rounds and five-beat exchanges for a sport.
// Each file in research/ maps to a sport key in the page; missing files are simply skipped.
const TALK_FILES = { nhl: "hockey-canada.json", football: "football-uk.json", nfl: "football-nfl.json", nba: "basketball-nba.json", mlb: "baseball-mlb.json", f1: "f1-na.json", afl: "afl-australia.json", nrl: "nrl-australia.json" };
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
    // The sport's own betting words, when the pack's card has them
    const bet = arr(d.builtin && d.builtin.betting).filter((b) => Array.isArray(b) && b.length === 3 && b.every((x) => str(x)) && ok(b.join(" "))).map((b) => b.map(str));
    if (bet.length >= 3) P.betting = bet;
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
  if (fs.existsSync(path.join(root, "research", "out"))) fs.writeFileSync(path.join(__dirname, "lingo.json"), JSON.stringify(lingo));
  const talk = loadTalk();
  console.log("Talk packs:", Object.keys(talk).map((k) => k + " (" + Object.keys(talk[k].exchanges).length + " exchanges, " + talk[k].terms.length + " terms)").join(", ") || "none");
  // Character art in src/art/ is embedded into the page, so every copy works as a single file.
  const art = (m, f) => 'url("data:image/' + (f.endsWith(".png") ? "png" : "webp") + ";base64," + fs.readFileSync(path.join(__dirname, "art", f)).toString("base64") + '")';
  const places = loadPlaces();
  console.log("Local mode:", Object.keys(places.t).length, "teams placed,", Object.keys(places.c).length, "circuits,", places.cities.length, "cities,", Object.keys(places.z).length, "time zones,", (safe(places).length / 1024).toFixed(0), "KB");
  const base = src.replace(/url\("art\/([\w.-]+\.(?:webp|png))"\)/g, art)
    .replace("__SNAPSHOT__", () => json).replace("__TALK__", () => safe(talk)).replace("__SAY__", () => safe(lingo.say))
    .replace("__PLACES__", () => safe(places)).replace("__LOCAL_JS__", () => fs.readFileSync(path.join(__dirname, "local.js"), "utf8"));
  const lingoAll = { teams: lingo.teams, regions: lingo.regions };
  // Logos are embedded in the single-file copies; the website copy serves them as files instead.
  const logos = await fetchLogos(snap);
  const embedded = {}, files = {};
  for (const [k, v] of logos) {
    embedded[k] = ["data:image/png;base64," + v.big.toString("base64"), "data:image/png;base64," + v.px.toString("base64")];
    files[k] = ["logos/" + k + ".png", "logos/" + k + "-px.png"];
  }
  const page = base.replace("__LOGOS__", () => safe(embedded)).replace("__LINGO__", () => safe(lingoAll));
  console.log("Logo data:", (safe(embedded).length / 1024).toFixed(0), "KB embedded");
  const sayCount = Object.entries(lingo.say).filter(([k]) => k !== "_alone").reduce((n, [, m]) => n + Object.keys(m).length, 0);
  console.log("Local lingo:", lingo.teams.length, "teams,", Object.keys(lingo.regions).length, "regions,", (safe(lingoAll).length / 1024).toFixed(0), "KB;", sayCount, "pronunciation fixes");
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
    let site = base.replace("__LOGOS__", () => safe(files)).replace("__LINGO__", () => safe({ split: true }));
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
    // Local lingo, one file per sport (its teams and their regions), fetched when the sport is picked
    fs.mkdirSync(path.join(dir, "lingo"), { recursive: true });
    const sizes = [];
    for (const sp of ["football", "rugby", "cricket", "f1", "nfl", "nba", "nhl", "mlb", "afl", "nrl"]) {
      const teams = lingo.teams.filter((t) => SPORT_OF(t.league) === sp), regions = {};
      for (const t of teams) if (t.region && lingo.regions[t.region]) regions[t.region] = lingo.regions[t.region];
      const body = JSON.stringify({ teams, regions });
      fs.writeFileSync(path.join(dir, "lingo", sp + ".json"), body);
      sizes.push(sp + " " + (body.length / 1024).toFixed(0) + "KB");
    }
    console.log("Website copy written to", dir, "(results feed: " + feedUrl + "; lingo: " + sizes.join(", ") + ")");
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
