// Local mode tests:  node research/test-local.js  [page.html] [--verbose]
// Checks the rules in src/local.js against the data the page actually ships (the "places" and
// "snapshot" blocks compiled into ludicrous-display.html by src/build.js), from ~50 places around
// the world. Rebuild first (node src/build.js) so the page holds the current research/places.json.
//
// FAIL = wrong (a data error or a broken rule): exit code 1.  WARN = works as written but likely to
// confuse a visitor.  Expected positions below are real-world ones (city or ground, to ~20 km),
// written by hand from general knowledge, so a wrong geocode in research/places.json shows up here.
// No network, no dependencies.
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const LOCAL = require("../src/local.js");
const VERBOSE = process.argv.includes("--verbose");

// ---------- Data the page ships ----------
// Another built copy can be tested instead: node research/test-local.js path/to/page.html
const PAGE = process.argv.slice(2).find((a) => !a.startsWith("--")) || path.join(ROOT, "ludicrous-display.html");
const html = fs.readFileSync(PAGE, "utf8");
function block(id) {
  const m = html.match(new RegExp('<script type="application/json" id="' + id + '">([\\s\\S]*?)</script>'));
  if (!m) throw new Error("No " + id + " block in ludicrous-display.html: run node src/build.js");
  return JSON.parse(m[1]);
}
const P = block("places"), SNAP = block("snapshot");
const NAMES = JSON.parse(fs.readFileSync(path.join(__dirname, "places.json"), "utf8")).teams;
const GAMES = Object.values(SNAP.leagues || {}).flat();

// ---------- Tiny harness ----------
let passed = 0, section = "";
const fails = [], warns = [];
function head(t) { section = t; console.log("\n=== " + t + " ==="); }
function check(cond, msg, detail) {
  if (cond) { passed++; if (VERBOSE) console.log("  ok    " + msg); return true; }
  fails.push(section + ": " + msg + (detail ? " [" + detail + "]" : ""));
  console.log("  FAIL  " + msg + (detail ? "  [" + detail + "]" : ""));
  return false;
}
function warn(cond, msg, detail) {
  if (cond) return true;
  warns.push(section + ": " + msg + (detail ? " [" + detail + "]" : ""));
  console.log("  WARN  " + msg + (detail ? "  [" + detail + "]" : ""));
  return false;
}
const info = (msg) => console.log("        " + msg);
const fmt = (n) => (n === Infinity ? "unplaced" : Math.round(n).toLocaleString("en-GB") + " km");

// ---------- Teams by name ----------
// "nhl:Maple Leafs" -> the places key of the one team in that league with that name (exact name,
// then a name starting or ending with it, then a name containing it). "rugby:25920|Perpignan"
// names a key directly, for teams with no place yet. A team that has left the app's leagues
// (relegated, say) is skipped with a warning, so the test needs no change every season.
const LG = { nhl: "hockey/nhl", nba: "basketball/nba", mlb: "baseball/mlb", nfl: "football/nfl", cfl: "football/cfl", cfb: "football/college-football", soccer: "soccer", rugby: "rugby" };
const GAME_LG = { soccer: "soccer/eng.1", rugby: "rugby/267979" };
const fold = (s) => String(s).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/’/g, "'");
const refCache = new Map(), gone = new Set();
function team(ref) {
  if (refCache.has(ref)) return refCache.get(ref);
  const [p, ...rest] = ref.split(":"), [q, given] = rest.join(":").split("|"), lg = LG[p];
  if (!lg) throw new Error("Unknown league prefix in test: " + ref);
  let key = null;
  if (/^\d+$/.test(q)) key = lg + ":" + q;
  else {
    const all = Object.keys(NAMES).filter((k) => k.startsWith(lg + ":")), n = (k) => fold(NAMES[k][0]), f = fold(q);
    const tries = [all.filter((k) => n(k) === f), all.filter((k) => n(k).startsWith(f + " ")), all.filter((k) => n(k).endsWith(" " + f)), all.filter((k) => n(k).includes(f))];
    const hit = tries.find((h) => h.length === 1) || tries.find((h) => h.length) || [];
    if (hit.length > 1) throw new Error("Test team '" + ref + "' matches " + hit.length + " teams in research/places.json: " + hit.map((k) => NAMES[k][0]).join(", ") + ". Use a fuller name.");
    if (!hit.length) { gone.add(ref); refCache.set(ref, null); return null; }
    key = hit[0];
  }
  const t = { ref, key, lg: GAME_LG[p] || lg, id: key.split(":").pop(), name: NAMES[key] ? NAMES[key][0] : given || key };
  refCache.set(ref, t);
  return t;
}
// A game between the team and a side with no place, the team at home or away
const NOWHERE = { id: "__nowhere__", n: "Nowhere Town" };
const game = (t, side) => ({ id: "test", lg: t.lg, h: side === "a" ? NOWHERE : { id: t.id, n: t.name }, a: side === "a" ? { id: t.id, n: t.name } : NOWHERE });
const race = (venue) => ({ id: "test-f1", lg: "racing/f1", race: "Test Grand Prix", venue, res: [{ pos: 1, n: "Test Driver" }] });
const cityArea = (name, ll, km) => LOCAL.area({ mode: "city", city: [name, ll[0], ll[1]], km }, P);
const label = (g) => (g.res ? "F1 " + g.race : g.lg.split("/").pop() + " " + g.a.n + " at " + g.h.n);

// ---------- Real-world positions (for the data audit) ----------
const HOMES = {
  // North America
  "nhl:Maple Leafs": [43.64, -79.38], "nhl:Canadiens": [45.5, -73.57], "nhl:Canucks": [49.28, -123.11], "nhl:Flames": [51.04, -114.05],
  "nhl:Oilers": [53.55, -113.5], "nhl:Winnipeg Jets": [49.89, -97.14], "nhl:Senators": [45.3, -75.93], "nhl:Sabres": [42.88, -78.88],
  "nhl:Utah Mammoth": [40.77, -111.9], "nhl:Kraken": [47.62, -122.35], "nhl:Golden Knights": [36.1, -115.18], "nhl:Islanders": [40.71, -73.73],
  "cfl:Argonauts": [43.63, -79.42], "cfl:Alouettes": [45.51, -73.58], "cfl:BC Lions": [49.28, -123.11], "cfl:Stampeders": [51.07, -114.12],
  "cfl:Elks": [53.56, -113.48], "cfl:Tiger-Cats": [43.25, -79.83], "cfl:Roughriders": [50.45, -104.62], "cfl:Blue Bombers": [49.81, -97.14], "cfl:Red Blacks": [45.4, -75.68],
  "nfl:Bills": [42.77, -78.79], "nfl:Patriots": [42.09, -71.26], "nfl:49ers": [37.4, -121.97], "nfl:Cowboys": [32.75, -97.09], "nfl:Packers": [44.5, -88.06],
  "nfl:Chiefs": [39.05, -94.48], "nfl:Seahawks": [47.6, -122.33], "nfl:Saints": [29.95, -90.08], "nfl:Giants": [40.81, -74.07], "nfl:Commanders": [38.91, -76.86],
  "nba:Raptors": [43.64, -79.38], "nba:Lakers": [34.04, -118.27], "nba:Celtics": [42.37, -71.06], "nba:Knicks": [40.75, -73.99], "nba:Heat": [25.78, -80.19], "nba:Warriors": [37.77, -122.39],
  "mlb:Blue Jays": [43.64, -79.39], "mlb:Dodgers": [34.07, -118.24], "mlb:Yankees": [40.83, -73.93], "mlb:Cubs": [41.95, -87.66], "mlb:Athletics": [38.58, -121.51],
  "soccer:Toronto FC": [43.63, -79.42], "soccer:CF Montréal": [45.56, -73.55], "soccer:Vancouver Whitecaps": [49.28, -123.11], "soccer:LA Galaxy": [33.86, -118.26],
  "soccer:Seattle Sounders FC": [47.6, -122.33], "soccer:Inter Miami CF": [25.79, -80.25], "soccer:FC Dallas": [33.15, -96.84], "soccer:Real Salt Lake": [40.58, -111.89],
  "soccer:Philadelphia Union": [39.83, -75.38], "soccer:Colorado Rapids": [39.81, -104.89],
  "cfb:Alabama Crimson Tide": [33.21, -87.55], "cfb:Ohio State": [40.0, -83.02], "cfb:Notre Dame": [41.7, -86.23], "cfb:Rainbow Warriors": [21.3, -157.82],
  "cfb:Texas Longhorns": [30.28, -97.73], "cfb:USC Trojans": [34.01, -118.29], "cfb:Michigan Wolverines": [42.27, -83.75], "cfb:Oregon Ducks": [44.06, -123.07], "cfb:Florida Gators": [29.65, -82.35],
  // Europe: football
  "soccer:Arsenal": [51.55, -0.11], "soccer:Manchester United": [53.46, -2.29], "soccer:364|Liverpool": [53.43, -2.96], "soccer:Celtic": [55.85, -4.21], "soccer:Rangers": [55.85, -4.31],
  "soccer:Aberdeen": [57.16, -2.09], "soccer:Real Madrid": [40.45, -3.69], "soccer:Barcelona": [41.38, 2.12], "soccer:Valencia": [39.47, -0.36], "soccer:Levante": [39.49, -0.36],
  "soccer:Rayo Vallecano": [40.39, -3.66], "soccer:Sevilla": [37.38, -5.97], "soccer:Bayern Munich": [48.22, 11.62], "soccer:Borussia Dortmund": [51.49, 7.45], "soccer:RB Leipzig": [51.35, 12.35],
  "soccer:Hamburg SV": [53.59, 9.9], "soccer:Paris Saint-Germain": [48.84, 2.25], "soccer:Troyes": [48.31, 4.1], "soccer:Marseille": [43.27, 5.4], "soccer:Lyon": [45.77, 4.98],
  "soccer:AS Monaco": [43.73, 7.42], "soccer:Lille": [50.61, 3.13], "soccer:Juventus": [45.11, 7.64], "soccer:Internazionale": [45.48, 9.12], "soccer:AS Roma": [41.93, 12.45],
  "soccer:Napoli": [40.83, 14.19], "soccer:Benfica": [38.75, -9.18], "soccer:FC Porto": [41.16, -8.58], "soccer:PSV Eindhoven": [51.44, 5.47], "soccer:Galatasaray": [41.1, 28.99],
  "soccer:Olympiacos": [37.95, 23.66], "soccer:Bodo/Glimt": [67.28, 14.38], "soccer:RB Salzburg": [47.82, 13.0], "soccer:Union St.-Gilloise": [50.82, 4.33],
  "soccer:Club Brugge": [51.19, 3.18], "soccer:OFI Crete": [35.34, 25.13], "soccer:Torreense": [39.09, -9.26],
  // Clubs that play some European home games away from home: placed where they are based
  "soccer:Hapoel Be'er": [31.25, 34.79], // Be'er Sheva (European home games in Bucharest)
  "soccer:Shakhtar Donetsk": [49.84, 24.03, 700], // Ukraine: league games at Arena Lviv (2026-27 Champions League home games at Stamford Bridge)
  // Rugby
  "rugby:Leinster": [53.34, -6.23], "rugby:Munster": [52.67, -8.64], "rugby:Ulster": [54.58, -5.96], "rugby:Connacht": [53.28, -9.03], "rugby:Stormers": [-33.9, 18.41],
  "rugby:Bulls": [-25.75, 28.22], "rugby:Lions": [-26.18, 28.06], "rugby:Sharks": [-29.83, 31.03], "rugby:Stade Toulousain": [43.58, 1.43], "rugby:Racing 92": [48.9, 2.23],
  "rugby:Saracens": [51.62, -0.21], "rugby:Harlequins": [51.46, -0.34], "rugby:Sale Sharks": [53.47, -2.37], "rugby:Glasgow Warriors": [55.88, -4.34], "rugby:Edinburgh": [55.94, -3.24],
  "rugby:Scarlets": [51.68, -4.13], "rugby:Benetton Treviso": [45.67, 12.22], "rugby:Zebre": [44.8, 10.33], "rugby:England": [51.46, -0.34], "rugby:Wales": [51.48, -3.18],
  "rugby:Fiji": [-18.14, 178.44], "rugby:Samoa": [-13.83, -171.76], "rugby:Tonga": [-21.14, -175.2], "rugby:New Zealand": [-36.87, 174.74], "rugby:Australia": [-33.87, 151.21],
  "rugby:Argentina": [-34.6, -58.38], "rugby:Japan": [35.68, 139.72], "rugby:Georgia": [41.72, 44.79],
  // Teams that play in the app's competitions but have no place yet (ESPN ids)
  "rugby:25916|Castres Olympique": [43.61, 2.24],
  "rugby:25917|Clermont Auvergne": [45.78, 3.08],
  "rugby:25918|Montpellier Herault": [43.61, 3.88],
  "rugby:25920|Perpignan": [42.7, 2.9],
  "rugby:270567|Pau": [43.3, -0.37],
  "rugby:190153|Oyonnax": [46.26, 5.66],
  "rugby:289267|Belgium": [50.85, 4.35],
  "rugby:289268|Hong Kong": [22.3, 114.17],
};
const CIRCUITS = {
  "Autodromo Enzo e Dino Ferrari": [44.34, 11.72], "Autodromo Hermanos Rodriguez": [19.4, -99.09], "Autodromo Jose Carlos Pace": [-23.7, -46.7],
  "Autodromo Nazionale Monza": [45.62, 9.28], "Bahrain International Circuit": [26.03, 50.51], "Baku City Circuit": [40.37, 49.85],
  "Circuit Gilles-Villeneuve": [45.5, -73.52], "Circuit Park Zandvoort": [52.39, 4.54], "Circuit de Catalunya": [41.57, 2.26], "Circuit de Monaco": [43.73, 7.42],
  "Circuit de Spa-Francorchamps": [50.44, 5.97], "Circuit of the Americas": [30.13, -97.64], "Hungaroring": [47.58, 19.25], "Jeddah Street Circuit": [21.63, 39.1],
  "Las Vegas Street Circuit": [36.11, -115.17], "Losail International Circuit": [25.49, 51.45], "Madring": [40.46, -3.62], "Marina Bay Street Circuit": [1.29, 103.86],
  "Melbourne Grand Prix Circuit": [-37.85, 144.97], "Miami International Autodrome": [25.96, -80.24], "Red Bull Ring": [47.22, 14.76], "Sepang International Circuit": [2.76, 101.74],
  "Shanghai International Circuit": [31.34, 121.22], "Suzuka International Racing Course": [34.84, 136.54], "Yas Marina Circuit": [24.47, 54.6],
};
// The city a visitor's device time zone should stand for (the zone's main city)
const ZONES = {
  "America/New_York": [40.71, -74.01], "America/Chicago": [41.88, -87.63], "America/Denver": [39.74, -104.99], "America/Phoenix": [33.45, -112.07],
  "America/Los_Angeles": [34.05, -118.24], "America/Anchorage": [61.22, -149.9], "Pacific/Honolulu": [21.31, -157.86], "America/Toronto": [43.65, -79.38],
  "America/Vancouver": [49.28, -123.12], "America/Edmonton": [53.55, -113.49], "America/Winnipeg": [49.9, -97.14], "America/Regina": [50.45, -104.62],
  "America/Halifax": [44.65, -63.57], "America/St_Johns": [47.56, -52.71], "America/Mexico_City": [19.43, -99.13], "America/Monterrey": [25.69, -100.32],
  "America/Merida": [20.97, -89.62], "America/Sao_Paulo": [-23.55, -46.63], "America/Bahia": [-12.97, -38.5], "America/Santarem": [-2.44, -54.71],
  "America/Noronha": [-3.85, -32.42], "America/Argentina/Buenos_Aires": [-34.6, -58.38], "America/Buenos_Aires": [-34.6, -58.38], "America/Santiago": [-33.45, -70.67],
  "America/Lima": [-12.05, -77.04], "America/Bogota": [4.71, -74.07], "America/Caracas": [10.49, -66.88], "America/Costa_Rica": [9.93, -84.08],
  "America/El_Salvador": [13.69, -89.19], "America/Puerto_Rico": [18.47, -66.11], "America/Jamaica": [17.97, -76.79], "America/Panama": [8.98, -79.52],
  "America/Havana": [23.13, -82.38], "America/Santo_Domingo": [18.49, -69.93], "America/Antigua": [17.12, -61.85], "America/Barbados": [13.1, -59.62],
  "America/Creston": [49.1, -116.51], "America/Dawson": [64.06, -139.43], "America/Atikokan": [48.76, -91.62],
  "Europe/London": [51.51, -0.13], "Europe/Dublin": [53.35, -6.26], "Europe/Paris": [48.86, 2.35], "Europe/Berlin": [52.52, 13.4], "Europe/Madrid": [40.42, -3.7],
  "Europe/Rome": [41.9, 12.5], "Europe/Lisbon": [38.72, -9.14], "Europe/Amsterdam": [52.37, 4.9], "Europe/Brussels": [50.85, 4.35], "Europe/Zurich": [47.37, 8.54],
  "Europe/Vienna": [48.21, 16.37], "Europe/Stockholm": [59.33, 18.07], "Europe/Oslo": [59.91, 10.75], "Europe/Copenhagen": [55.68, 12.57], "Europe/Helsinki": [60.17, 24.94],
  "Europe/Warsaw": [52.23, 21.01], "Europe/Prague": [50.08, 14.42], "Europe/Athens": [37.98, 23.73], "Europe/Istanbul": [41.01, 28.98], "Europe/Moscow": [55.76, 37.62],
  "Europe/Kyiv": [50.45, 30.52], "Europe/Kiev": [50.45, 30.52], "Europe/Malta": [35.9, 14.51], "Europe/Jersey": [49.19, -2.11], "Europe/Guernsey": [49.46, -2.54],
  "Europe/Isle_of_Man": [54.15, -4.48], "Europe/Sarajevo": [43.86, 18.41], "Atlantic/Reykjavik": [64.15, -21.94], "Atlantic/Canary": [28.1, -15.41],
  "Atlantic/Madeira": [32.65, -16.91], "Atlantic/Azores": [37.74, -25.67], "Atlantic/Bermuda": [32.29, -64.78], "Atlantic/St_Helena": [-15.92, -5.72],
  "Africa/Johannesburg": [-26.2, 28.05], "Africa/Lagos": [6.45, 3.4], "Africa/Cairo": [30.04, 31.24], "Africa/Nairobi": [-1.29, 36.82], "Africa/Casablanca": [33.57, -7.59],
  "Africa/Accra": [5.56, -0.2], "Africa/Mbabane": [-26.31, 31.14],
  "Asia/Dubai": [25.2, 55.27], "Asia/Riyadh": [24.71, 46.68], "Asia/Qatar": [25.29, 51.53], "Asia/Bahrain": [26.23, 50.59], "Asia/Jerusalem": [31.78, 35.22],
  "Asia/Tehran": [35.69, 51.39], "Asia/Karachi": [24.86, 67.0], "Asia/Kolkata": [22.57, 88.36], "Asia/Calcutta": [22.57, 88.36], "Asia/Dhaka": [23.81, 90.41],
  "Asia/Bangkok": [13.75, 100.5], "Asia/Jakarta": [-6.2, 106.85], "Asia/Singapore": [1.29, 103.85], "Asia/Kuala_Lumpur": [3.14, 101.69], "Asia/Manila": [14.6, 120.98],
  "Asia/Hong_Kong": [22.3, 114.17], "Asia/Shanghai": [31.23, 121.47], "Asia/Taipei": [25.03, 121.56], "Asia/Seoul": [37.57, 126.98], "Asia/Tokyo": [35.68, 139.69],
  "Asia/Ho_Chi_Minh": [10.78, 106.7], "Asia/Saigon": [10.78, 106.7], "Asia/Brunei": [4.89, 114.94],
  "Australia/Sydney": [-33.87, 151.21], "Australia/Melbourne": [-37.81, 144.96], "Australia/Brisbane": [-27.47, 153.03], "Australia/Adelaide": [-34.93, 138.6],
  "Australia/Perth": [-31.95, 115.86], "Australia/Darwin": [-12.46, 130.84], "Australia/Hobart": [-42.88, 147.33], "Pacific/Auckland": [-36.85, 174.76],
  "Pacific/Fiji": [-18.14, 178.44], "Pacific/Apia": [-13.83, -171.76], "Pacific/Tongatapu": [-21.14, -175.2], "Pacific/Guam": [13.47, 144.75],
  "Pacific/Port_Moresby": [-9.44, 147.18], "Pacific/Noumea": [-22.28, 166.46], "Pacific/Tahiti": [-17.53, -149.57], "Pacific/Guadalcanal": [-9.43, 159.95],
  "Pacific/Chatham": [-43.95, -176.55], "Pacific/Norfolk": [-29.06, 167.96], "Pacific/Palau": [7.34, 134.48], "Pacific/Tarawa": [1.33, 172.98],
  "Indian/Maldives": [4.17, 73.51], "Indian/Mauritius": [-20.16, 57.5], "Indian/Mahe": [-4.62, 55.45], "Indian/Christmas": [-10.42, 105.68], "Indian/Comoro": [-11.7, 43.26],
};

// ---------- Places around the world ----------
// local: within 500 km; far: not within 500 km; k1000 / k2000: within 1,000 / 2,000 km; not1000 /
// not2000: not even then. Each team is tried at home and away. Pairs within ~25 km of a boundary
// are left out on purpose. home: a team that plays in that city (for the time-zone default check).
const AREAS = [
  { name: "Toronto", ll: [43.65, -79.38], tz: "America/Toronto", home: "nhl:Maple Leafs",
    local: ["nhl:Maple Leafs", "nba:Raptors", "mlb:Blue Jays", "cfl:Argonauts", "soccer:Toronto FC", "nhl:Sabres", "nfl:Bills", "cfl:Tiger-Cats", "nhl:Senators", "nhl:Red Wings", "nfl:Lions", "nhl:Penguins", "nfl:Browns", "cfb:Syracuse", "cfb:Buffalo Bulls"],
    far: ["nba:Lakers", "nhl:Canucks", "nhl:New York Rangers", "mlb:Yankees"], k1000: ["nhl:New York Rangers", "nhl:Canadiens", "nhl:Blackhawks"], not1000: ["nhl:Canucks", "nba:Lakers"] },
  { name: "Montreal", ll: [45.5, -73.57], tz: "America/Toronto", home: "nhl:Canadiens",
    local: ["nhl:Canadiens", "cfl:Alouettes", "soccer:CF Montréal", "nhl:Senators", "cfl:Red Blacks", "nhl:Bruins", "nba:Celtics", "nfl:Patriots", "cfb:Boston College", "soccer:New England Revolution", "cfb:Syracuse"],
    far: ["nba:Lakers", "nhl:Flyers"], k1000: ["nhl:Maple Leafs", "nhl:New York Rangers", "nhl:Flyers"] },
  { name: "Vancouver", ll: [49.28, -123.12], tz: "America/Vancouver", home: "nhl:Canucks",
    local: ["nhl:Canucks", "cfl:BC Lions", "soccer:Vancouver Whitecaps", "rugby:Canada", "nhl:Kraken", "nfl:Seahawks", "mlb:Mariners", "soccer:Seattle Sounders FC", "cfb:Washington Huskies", "nba:Trail Blazers", "soccer:Portland Timbers"],
    far: ["nhl:Flames", "nhl:Oilers", "nba:Lakers", "nfl:49ers", "cfb:Oregon Ducks"], k1000: ["nhl:Flames", "nhl:Oilers", "cfb:Oregon Ducks"] },
  { name: "Calgary", ll: [51.05, -114.07], tz: "America/Edmonton", home: "nhl:Flames",
    local: ["nhl:Flames", "cfl:Stampeders", "nhl:Oilers", "cfl:Elks"], far: ["nhl:Canucks", "cfl:Roughriders", "nhl:Winnipeg Jets"],
    k1000: ["nhl:Canucks", "cfl:BC Lions", "cfl:Roughriders"], not1000: ["nhl:Winnipeg Jets"], k2000: ["nhl:Winnipeg Jets"] },
  { name: "Halifax", ll: [44.65, -63.57], tz: "America/Halifax",
    local: [], far: ["nhl:Bruins", "nhl:Canadiens"], k1000: ["nhl:Bruins", "nfl:Patriots", "nhl:Canadiens", "cfl:Alouettes"], k2000: ["nhl:Maple Leafs", "nhl:New York Rangers"] },
  { name: "Boston", ll: [42.36, -71.06], tz: "America/New_York", home: "nhl:Bruins",
    local: ["nhl:Bruins", "nba:Celtics", "mlb:Red Sox", "nfl:Patriots", "soccer:New England Revolution", "cfb:Boston College", "cfb:Massachusetts", "cfb:UConn", "nhl:New York Rangers", "nfl:Giants", "nhl:Canadiens", "nhl:Flyers"],
    far: ["nba:Bulls", "nba:Lakers", "nhl:Maple Leafs"], k1000: ["nhl:Maple Leafs", "nhl:Capitals"] },
  { name: "New York", ll: [40.71, -74.01], tz: "America/New_York", home: "nhl:New York Rangers",
    local: ["mlb:Yankees", "mlb:Mets", "nba:Knicks", "nba:Nets", "nhl:New York Rangers", "nhl:Islanders", "nhl:Devils", "nfl:Giants", "nfl:Jets", "soccer:New York City FC", "soccer:Red Bull New York", "cfb:Rutgers", "cfb:Army", "nfl:Eagles", "nhl:Bruins", "nfl:Ravens", "nhl:Capitals", "cfb:Penn State", "cfb:Navy"],
    far: ["nba:Bulls", "nhl:Blackhawks", "nba:Lakers", "nhl:Canadiens"], k1000: ["nhl:Maple Leafs", "nhl:Canadiens", "nfl:Browns"] },
  { name: "Philadelphia", ll: [39.95, -75.17], tz: "America/New_York", home: "nhl:Flyers",
    local: ["nfl:Eagles", "mlb:Phillies", "nba:76ers", "nhl:Flyers", "soccer:Philadelphia Union", "cfb:Temple", "nhl:New York Rangers", "nfl:Ravens", "nhl:Penguins", "nhl:Capitals", "cfb:Penn State", "cfb:Delaware"],
    far: ["nba:Bulls", "nfl:Bears", "nhl:Maple Leafs"] },
  { name: "Pittsburgh", ll: [40.44, -80.0], tz: "America/New_York", home: "nhl:Penguins",
    local: ["nhl:Penguins", "nfl:Steelers", "mlb:Pirates", "cfb:Pittsburgh Panthers", "cfb:Penn State", "nfl:Browns", "mlb:Guardians", "nba:Cavaliers", "nhl:Blue Jackets", "cfb:Ohio State", "nhl:Sabres", "nfl:Bills", "nhl:Maple Leafs", "nhl:Red Wings", "nhl:Capitals", "cfb:West Virginia", "nfl:Bengals"],
    far: ["nhl:Blackhawks", "nba:Lakers"], k1000: ["nhl:Blackhawks", "nhl:Bruins"] },
  { name: "Chicago", ll: [41.88, -87.63], tz: "America/Chicago", home: "nhl:Blackhawks",
    local: ["nfl:Bears", "nba:Bulls", "mlb:Cubs", "mlb:White Sox", "nhl:Blackhawks", "soccer:Chicago Fire FC", "cfb:Northwestern", "cfb:Notre Dame", "nba:Bucks", "mlb:Brewers", "nfl:Packers", "nba:Pacers", "nfl:Colts", "nhl:Red Wings", "nfl:Lions", "cfb:Illinois", "cfb:Purdue", "cfb:Wisconsin", "cfb:Iowa Hawkeyes", "cfb:Michigan Wolverines", "mlb:St. Louis Cardinals", "nhl:Blues"],
    far: ["nba:Lakers", "nhl:Maple Leafs", "nhl:Wild", "nfl:Chiefs"], k1000: ["nhl:Wild", "nhl:Maple Leafs", "nfl:Chiefs", "nhl:Predators"] },
  { name: "Denver", ll: [39.74, -104.99], tz: "America/Denver", home: "nhl:Avalanche",
    local: ["nfl:Broncos", "nba:Nuggets", "nhl:Avalanche", "mlb:Rockies", "soccer:Colorado Rapids", "cfb:Colorado Buffaloes", "cfb:Colorado State", "cfb:Air Force", "cfb:Wyoming"],
    far: ["nba:Jazz", "nfl:Chiefs", "nba:Lakers"], k1000: ["nba:Jazz", "nhl:Utah Mammoth", "cfb:New Mexico Lobos", "nfl:Chiefs"] },
  { name: "Dallas", ll: [32.78, -96.8], tz: "America/Chicago", home: "nhl:Stars",
    local: ["nfl:Cowboys", "nba:Mavericks", "nhl:Stars", "mlb:Texas Rangers", "soccer:FC Dallas", "cfb:SMU", "cfb:TCU", "cfb:North Texas", "cfb:Baylor", "cfb:Texas Longhorns", "soccer:Austin FC", "nba:Spurs", "nba:Rockets", "nfl:Texans", "nba:Thunder", "cfb:Oklahoma Sooners", "cfb:Texas A&M"],
    far: ["nfl:Saints", "nfl:Broncos", "nba:Lakers"], k1000: ["nfl:Saints", "nfl:Chiefs"] },
  { name: "Houston", ll: [29.76, -95.37], tz: "America/Chicago", home: "nba:Rockets",
    local: ["nfl:Texans", "nba:Rockets", "mlb:Astros", "soccer:Houston Dynamo FC", "cfb:Rice", "cfb:Houston Cougars", "cfb:Texas A&M", "nfl:Cowboys", "nba:Spurs", "cfb:LSU", "cfb:Texas Longhorns"],
    far: ["nba:Suns", "nfl:Chiefs", "nba:Lakers"], k1000: ["nfl:Saints", "nba:Thunder"] },
  { name: "Miami", ll: [25.76, -80.19], tz: "America/New_York", home: "nba:Heat",
    local: ["nba:Heat", "nfl:Dolphins", "mlb:Marlins", "nhl:Florida Panthers", "soccer:Inter Miami CF", "cfb:Miami Hurricanes", "cfb:Florida International", "cfb:Florida Atlantic", "nhl:Lightning", "nfl:Buccaneers", "mlb:Rays", "nba:Magic", "soccer:Orlando City SC", "cfb:UCF", "cfb:South Florida"],
    far: ["nfl:Falcons", "nba:Lakers", "nfl:Jaguars"], k1000: ["nfl:Jaguars", "cfb:Florida State"] },
  { name: "Atlanta", ll: [33.75, -84.39], tz: "America/New_York", home: "nba:Hawks",
    local: ["nba:Hawks", "nfl:Falcons", "mlb:Braves", "soccer:Atlanta United FC", "cfb:Georgia Tech", "cfb:Georgia State", "cfb:Georgia Bulldogs", "cfb:Kennesaw State", "cfb:Auburn", "cfb:Alabama Crimson Tide", "cfb:Clemson", "cfb:Tennessee Volunteers", "nhl:Predators", "nfl:Titans", "nba:Hornets", "nfl:Carolina Panthers", "soccer:Charlotte FC"],
    far: ["nba:Heat", "nba:Lakers"], k1000: ["nba:Pelicans"] },
  { name: "Seattle", ll: [47.61, -122.33], tz: "America/Los_Angeles", home: "nhl:Kraken",
    local: ["nfl:Seahawks", "mlb:Mariners", "nhl:Kraken", "soccer:Seattle Sounders FC", "cfb:Washington Huskies", "nhl:Canucks", "cfl:BC Lions", "soccer:Vancouver Whitecaps", "nba:Trail Blazers", "soccer:Portland Timbers", "cfb:Oregon State", "cfb:Oregon Ducks", "cfb:Washington State"],
    far: ["nfl:49ers", "nba:Lakers", "nhl:Flames"], k1000: ["nhl:Flames", "cfb:Boise State"] },
  { name: "Los Angeles", ll: [34.05, -118.24], tz: "America/Los_Angeles", home: "nba:Lakers",
    local: ["nba:Lakers", "nba:Clippers", "mlb:Dodgers", "mlb:Angels", "nhl:Los Angeles Kings", "nhl:Ducks", "nfl:Rams", "nfl:Chargers", "soccer:LA Galaxy", "soccer:LAFC", "cfb:UCLA", "cfb:USC Trojans", "mlb:Padres", "soccer:San Diego FC", "cfb:San Diego State", "nfl:Raiders", "nhl:Golden Knights", "cfb:UNLV", "cfb:Fresno State"],
    far: ["nba:Suns", "nba:Warriors", "nhl:Kraken"], k1000: ["nba:Suns", "nba:Warriors", "nba:Sacramento Kings", "nfl:49ers"] },
  { name: "San Francisco", ll: [37.77, -122.42], tz: "America/Los_Angeles", home: "nba:Warriors",
    local: ["nba:Warriors", "mlb:Giants", "nfl:49ers", "nhl:Sharks", "soccer:San Jose Earthquakes", "cfb:California Golden Bears", "cfb:Stanford", "cfb:San José State", "mlb:Athletics", "nba:Sacramento Kings", "cfb:Sacramento State", "cfb:Fresno State", "cfb:Nevada Wolf Pack"],
    far: ["nba:Lakers", "nhl:Los Angeles Kings", "nfl:Seahawks"], k1000: ["nba:Lakers", "nhl:Golden Knights", "nba:Trail Blazers"] },
  { name: "Phoenix", ll: [33.45, -112.07], tz: "America/Phoenix", home: "nba:Suns",
    local: ["nba:Suns", "mlb:Diamondbacks", "nfl:Arizona Cardinals", "cfb:Arizona State", "cfb:Arizona Wildcats", "nhl:Golden Knights", "nfl:Raiders", "cfb:UNLV"],
    far: ["nba:Lakers", "nhl:Avalanche", "nba:Jazz"], k1000: ["nba:Lakers", "nba:Jazz", "cfb:New Mexico Lobos"] },
  { name: "Honolulu", ll: [21.31, -157.86], tz: "Pacific/Honolulu", home: "cfb:Rainbow Warriors",
    local: ["cfb:Rainbow Warriors"], far: ["nba:Lakers"], not2000: ["nba:Lakers", "nhl:Kraken"] },
  { name: "Anchorage", ll: [61.22, -149.9], tz: "America/Anchorage", local: [], not2000: ["nhl:Canucks", "nhl:Kraken"] },
  { name: "London", ll: [51.51, -0.13], tz: "Europe/London", home: "soccer:Arsenal",
    local: ["soccer:Arsenal", "soccer:Chelsea", "soccer:Tottenham Hotspur", "soccer:West Ham United", "soccer:Fulham", "soccer:Crystal Palace", "soccer:Brentford", "rugby:Harlequins", "rugby:Saracens", "rugby:England", "soccer:Brighton & Hove Albion", "soccer:Manchester United", "soccer:364|Liverpool", "soccer:Newcastle United", "rugby:Leinster", "soccer:Paris Saint-Germain", "rugby:France", "soccer:Club Brugge", "soccer:Anderlecht", "soccer:Union St.-Gilloise", "soccer:PSV Eindhoven", "rugby:Cardiff Blues", "rugby:Wales"],
    far: ["soccer:Celtic", "soccer:Rangers", "rugby:Glasgow Warriors", "rugby:Edinburgh", "soccer:Heart of Midlothian", "soccer:Aberdeen", "soccer:Real Madrid", "soccer:Shakhtar Donetsk", "soccer:Borussia Dortmund"],
    k1000: ["soccer:Celtic", "soccer:Rangers", "rugby:Edinburgh", "soccer:Aberdeen", "soccer:Bayern Munich", "rugby:Stade Toulousain"], not1000: ["soccer:Real Madrid", "soccer:Barcelona"] },
  { name: "Manchester", ll: [53.48, -2.24], tz: "Europe/London", home: "soccer:Manchester City",
    local: ["soccer:Manchester United", "soccer:Manchester City", "soccer:364|Liverpool", "soccer:Everton", "soccer:Burnley", "rugby:Sale Sharks", "soccer:Leeds United", "soccer:Wrexham", "soccer:Newcastle United", "soccer:Arsenal", "rugby:Leinster", "rugby:Ulster", "soccer:Celtic", "soccer:Aberdeen"],
    far: ["soccer:Paris Saint-Germain", "soccer:Real Madrid"], k1000: ["soccer:Paris Saint-Germain"] },
  { name: "Glasgow", ll: [55.86, -4.25], tz: "Europe/London", home: "soccer:Celtic",
    local: ["soccer:Celtic", "soccer:Rangers", "soccer:St Mirren", "soccer:Kilmarnock", "soccer:Motherwell", "soccer:Hibernian", "soccer:Heart of Midlothian", "rugby:Glasgow Warriors", "rugby:Edinburgh", "rugby:Scotland", "soccer:Aberdeen", "soccer:Dundee United", "soccer:St Johnstone", "soccer:Falkirk", "rugby:Ulster", "soccer:Newcastle United", "soccer:Manchester United", "rugby:Leinster"],
    far: ["soccer:Arsenal", "rugby:Harlequins", "soccer:Paris Saint-Germain"], k1000: ["soccer:Arsenal", "rugby:Saracens"] },
  { name: "Dublin", ll: [53.35, -6.26], tz: "Europe/Dublin", home: "rugby:Leinster",
    local: ["rugby:Leinster", "rugby:Ireland", "rugby:Munster", "rugby:Connacht", "rugby:Ulster", "soccer:364|Liverpool", "soccer:Everton", "soccer:Manchester United", "soccer:Wrexham", "rugby:Cardiff Blues", "rugby:Scarlets", "soccer:Celtic", "rugby:Glasgow Warriors", "soccer:Arsenal"],
    far: ["soccer:Paris Saint-Germain", "rugby:France"] },
  { name: "Cardiff", ll: [51.48, -3.18], tz: "Europe/London", home: "rugby:Wales",
    local: ["soccer:Cardiff City", "rugby:Cardiff Blues", "rugby:Wales", "rugby:Dragons", "rugby:Ospreys", "rugby:Scarlets", "soccer:Swansea City", "rugby:Bristol Rugby", "rugby:Bath Rugby", "rugby:Gloucester Rugby", "rugby:Exeter Chiefs", "soccer:Arsenal", "soccer:Manchester United", "rugby:Leinster", "rugby:Munster"],
    far: ["soccer:Real Madrid", "soccer:Bayern Munich"] },
  { name: "Paris", ll: [48.86, 2.35], tz: "Europe/Paris", home: "soccer:Paris Saint-Germain",
    local: ["soccer:Paris Saint-Germain", "soccer:Paris FC", "rugby:Stade Francais Paris", "rugby:Racing 92", "rugby:France", "soccer:Lille", "soccer:Lens", "soccer:Le Havre AC", "soccer:Le Mans", "soccer:AJ Auxerre", "soccer:Troyes", "soccer:Stade Rennais", "soccer:Angers", "soccer:Strasbourg", "soccer:Lyon", "rugby:Lyon", "soccer:Club Brugge", "soccer:Anderlecht", "soccer:Arsenal", "rugby:England", "soccer:PSV Eindhoven"],
    far: ["soccer:Marseille", "rugby:Stade Toulousain", "rugby:Toulon", "soccer:AS Monaco", "soccer:Nice", "soccer:Real Madrid", "soccer:Celtic"],
    k1000: ["soccer:Marseille", "rugby:Stade Toulousain", "soccer:AS Monaco", "soccer:Bayern Munich"], not1000: ["soccer:Real Madrid", "soccer:Napoli"] },
  { name: "Madrid", ll: [40.42, -3.7], tz: "Europe/Madrid", home: "soccer:Real Madrid",
    local: ["soccer:Real Madrid", "soccer:Atlético Madrid", "soccer:Rayo Vallecano", "soccer:Getafe", "soccer:Valencia", "soccer:Levante", "soccer:Villarreal", "soccer:Sevilla", "soccer:Real Betis", "soccer:Athletic Club", "soccer:Real Sociedad", "soccer:Alavés", "soccer:Osasuna", "soccer:Racing Santander", "soccer:Málaga", "soccer:Celta Vigo", "soccer:Elche"],
    far: ["soccer:Paris Saint-Germain", "soccer:Marseille", "rugby:Stade Toulousain"], k1000: ["soccer:Barcelona", "soccer:Benfica", "soccer:FC Porto", "rugby:Stade Toulousain", "rugby:Bayonne"] },
  { name: "Barcelona", ll: [41.39, 2.17], tz: "Europe/Madrid", home: "soccer:Barcelona",
    local: ["soccer:Barcelona", "soccer:Espanyol", "soccer:Toulouse", "rugby:Stade Toulousain", "soccer:Valencia", "soccer:Levante", "soccer:Villarreal", "soccer:Osasuna", "soccer:Alavés", "soccer:Marseille", "rugby:Toulon", "rugby:Bayonne", "rugby:25920|Perpignan", "rugby:25918|Montpellier Herault"],
    far: ["soccer:Sevilla", "soccer:Real Betis", "soccer:Celta Vigo", "soccer:Paris Saint-Germain"], k1000: ["soccer:Real Madrid", "soccer:Sevilla", "soccer:Paris Saint-Germain", "soccer:Juventus"] },
  { name: "Milan", ll: [45.46, 9.19], tz: "Europe/Rome", home: "soccer:Internazionale",
    local: ["soccer:AC Milan", "soccer:Internazionale", "soccer:Como", "soccer:Monza", "soccer:Atalanta", "soccer:Juventus", "soccer:Torino", "soccer:Genoa", "soccer:Parma", "rugby:Zebre", "soccer:Bologna", "soccer:Venezia", "rugby:Benetton Treviso", "soccer:Udinese", "soccer:Fiorentina", "soccer:Sassuolo", "soccer:AS Monaco", "soccer:Nice", "soccer:Bayern Munich", "soccer:RB Salzburg", "soccer:Lyon", "soccer:Marseille", "rugby:Toulon"],
    far: ["soccer:Napoli", "soccer:Lecce", "soccer:Real Madrid", "soccer:Cagliari"], k1000: ["soccer:Napoli", "soccer:AS Roma", "soccer:Barcelona"] },
  { name: "Munich", ll: [48.14, 11.58], tz: "Europe/Berlin", home: "soccer:Bayern Munich",
    local: ["soccer:Bayern Munich", "soccer:FC Augsburg", "soccer:VfB Stuttgart", "soccer:TSG Hoffenheim", "soccer:SC Freiburg", "soccer:Eintracht Frankfurt", "soccer:Mainz", "soccer:RB Salzburg", "soccer:LASK Linz", "soccer:SK Sturm Graz", "soccer:Viktoria Plzen", "soccer:Sparta Prague", "soccer:Slavia Prague", "soccer:Internazionale", "soccer:AC Milan", "soccer:Venezia", "soccer:Udinese", "rugby:Benetton Treviso", "soccer:RB Leipzig", "soccer:Strasbourg"],
    far: ["soccer:Hamburg SV", "soccer:Werder Bremen", "soccer:Real Madrid"], k1000: ["soccer:Hamburg SV", "soccer:Werder Bremen", "soccer:Paris Saint-Germain", "soccer:Union St.-Gilloise"] },
  { name: "Lisbon", ll: [38.72, -9.14], tz: "Europe/Lisbon", home: "soccer:Benfica",
    local: ["soccer:Benfica", "soccer:Sporting CP", "soccer:FC Porto", "soccer:Torreense", "soccer:Sevilla", "soccer:Real Betis", "soccer:Málaga", "soccer:Celta Vigo"],
    far: ["soccer:Barcelona", "soccer:Valencia"], k1000: ["soccer:Real Madrid", "soccer:Atlético Madrid", "soccer:Athletic Club", "soccer:Valencia"], not1000: ["soccer:Paris Saint-Germain"] },
  { name: "Cape Town", ll: [-33.92, 18.42], tz: "Africa/Johannesburg", home: "rugby:Stormers",
    local: ["rugby:Stormers", "soccer:Stellenbosch"], far: ["rugby:Bulls", "rugby:Lions", "rugby:Sharks", "rugby:South Africa", "soccer:Kaizer Chiefs"], not1000: ["rugby:Lions", "rugby:Sharks", "soccer:Kaizer Chiefs"], k2000: ["rugby:Lions", "rugby:Bulls", "rugby:Sharks", "rugby:South Africa", "soccer:Kaizer Chiefs"] },
  { name: "Johannesburg", ll: [-26.2, 28.05], tz: "Africa/Johannesburg", home: "soccer:Kaizer Chiefs",
    local: ["rugby:Lions", "rugby:Bulls", "rugby:South Africa", "soccer:Kaizer Chiefs", "soccer:Orlando Pirates", "soccer:Mamelodi Sundowns"], far: ["rugby:Stormers", "soccer:Stellenbosch"], k2000: ["rugby:Stormers", "soccer:Stellenbosch"] },
  // India is one time zone (Asia/Kolkata), so Mumbai's default area is Kolkata: no "home" check here
  { name: "Mumbai", ll: [19.08, 72.88], tz: "Asia/Kolkata",
    local: ["soccer:Mumbai City FC", "soccer:FC GOA"], far: ["soccer:Bengaluru FC", "soccer:Kerala Blasters FC", "soccer:East Bengal FC"], k1000: ["soccer:Bengaluru FC"], not2000: ["soccer:Arsenal", "rugby:Japan"] },
  { name: "Kolkata", ll: [22.57, 88.36], tz: "Asia/Kolkata", home: "soccer:Mohun Bagan Super Giant",
    local: ["soccer:Mohun Bagan Super Giant", "soccer:East Bengal FC", "soccer:Odisha FC"], far: ["soccer:Mumbai City FC", "soccer:Chennaiyin FC"] },
  { name: "Riyadh", ll: [24.71, 46.68], tz: "Asia/Riyadh", home: "soccer:Al Hilal",
    local: ["soccer:Al Hilal", "soccer:Al Nassr", "soccer:Al Shabab", "soccer:Al Taawoun"], far: ["soccer:Abha", "soccer:Neom SC"], k1000: ["soccer:Abha"] },
  { name: "Istanbul", ll: [41.01, 28.98], tz: "Europe/Istanbul", home: "soccer:Galatasaray",
    local: ["soccer:Galatasaray", "soccer:Fenerbahce", "soccer:Besiktas", "soccer:Kocaelispor", "soccer:Genclerbirligi"], far: ["soccer:Trabzonspor"], k1000: ["soccer:Trabzonspor"] },
  { name: "Shanghai", ll: [31.23, 121.47], tz: "Asia/Shanghai", home: "soccer:Shanghai Port FC",
    local: ["soccer:Shanghai Port FC", "soccer:Shanghai Shenhua FC", "soccer:Zhejiang Professional FC"], far: ["soccer:Beijing Guoan", "soccer:Chengdu Rongcheng"], not1000: ["soccer:Beijing Guoan"], k2000: ["soccer:Beijing Guoan"] },
  { name: "Dubai", ll: [25.2, 55.27], tz: "Asia/Dubai", local: [], not2000: ["soccer:Galatasaray"],
    f1: { 250: ["Yas Marina Circuit"], 500: ["Losail International Circuit"], 2000: ["Jeddah Street Circuit"] } },
  { name: "Tokyo", ll: [35.68, 139.69], tz: "Asia/Tokyo", home: "soccer:FC Tokyo",
    local: ["rugby:Japan", "soccer:FC Tokyo", "soccer:Kawasaki Frontale", "soccer:Urawa Red Diamonds", "soccer:Kashima Antlers", "soccer:Mito Hollyhock", "soccer:Vissel Kobe"],
    far: ["rugby:Australia", "soccer:Sanfrecce Hiroshima", "soccer:Avispa Fukuoka"], k1000: ["soccer:Sanfrecce Hiroshima", "soccer:Avispa Fukuoka"],
    f1: { 500: ["Suzuka International Racing Course"], 2000: ["Shanghai International Circuit"] } },
  { name: "Singapore", ll: [1.29, 103.85], tz: "Asia/Singapore", local: [],
    f1: { 250: ["Marina Bay Street Circuit"], 500: ["Sepang International Circuit"] } },
  { name: "Sydney", ll: [-33.87, 151.21], tz: "Australia/Sydney", home: "soccer:Sydney FC",
    local: ["rugby:Australia", "soccer:Sydney FC", "soccer:Western Sydney Wanderers FC", "soccer:Central Coast Mariners FC", "soccer:Newcastle Jets", "soccer:Macarthur FC", "rugby:New South Wales Waratahs", "rugby:Brumbies"],
    far: ["rugby:New Zealand", "soccer:Melbourne Victory", "soccer:Brisbane Roar FC", "rugby:Queensland Reds"], k1000: ["soccer:Melbourne Victory", "soccer:Brisbane Roar FC", "rugby:Queensland Reds"],
    not2000: ["rugby:New Zealand", "rugby:Fiji", "soccer:Perth Glory FC", "soccer:Wellington Phoenix"], f1: { 1000: ["Melbourne Grand Prix Circuit"] }, f1not: { 500: ["Melbourne Grand Prix Circuit"] } },
  { name: "Melbourne", ll: [-37.81, 144.96], tz: "Australia/Melbourne", home: "soccer:Melbourne Victory",
    local: ["soccer:Melbourne Victory", "soccer:Melbourne City FC"], far: ["soccer:Sydney FC", "soccer:Adelaide United FC"], k1000: ["soccer:Sydney FC", "soccer:Adelaide United FC"],
    f1: { 250: ["Melbourne Grand Prix Circuit"] } },
  { name: "Perth", ll: [-31.95, 115.86], tz: "Australia/Perth", home: "soccer:Perth Glory FC",
    local: ["soccer:Perth Glory FC", "rugby:Western Force"], not2000: ["rugby:Australia", "soccer:Adelaide United FC"], f1not: { 2000: ["Melbourne Grand Prix Circuit"] } },
  { name: "Auckland", ll: [-36.85, 174.76], tz: "Pacific/Auckland", home: "soccer:Auckland FC",
    local: ["rugby:New Zealand", "soccer:Auckland FC", "rugby:Blues", "rugby:Moana Pasifika", "rugby:Chiefs"], far: ["rugby:Crusaders", "rugby:Highlanders"],
    k1000: ["rugby:Crusaders"], not1000: ["rugby:Highlanders"], k2000: ["rugby:Highlanders"], not2000: ["rugby:Australia", "rugby:Fiji", "soccer:Sydney FC"] },
  // Across the date line: Fiji is at 178°E, Tonga and Samoa at 175°W and 172°W
  { name: "Suva", ll: [-18.14, 178.44], tz: "Pacific/Fiji", home: "rugby:Fiji",
    local: ["rugby:Fiji"], far: ["rugby:Tonga", "rugby:Samoa"], k1000: ["rugby:Tonga"], not1000: ["rugby:Samoa"], k2000: ["rugby:Samoa"] },
  { name: "Apia", ll: [-13.83, -171.76], tz: "Pacific/Apia", home: "rugby:Samoa",
    local: ["rugby:Samoa"], k1000: ["rugby:Tonga"], not1000: ["rugby:Fiji"], k2000: ["rugby:Fiji"] },
  { name: "Sao Paulo", ll: [-23.55, -46.63], tz: "America/Sao_Paulo", home: "soccer:Palmeiras",
    local: ["rugby:Brazil", "soccer:Palmeiras", "soccer:Corinthians", "soccer:São Paulo", "soccer:Flamengo", "soccer:Red Bull Bragantino"],
    far: ["rugby:Argentina", "rugby:Uruguay", "soccer:Grêmio", "soccer:Bahia"], k1000: ["soccer:Grêmio"], not1000: ["soccer:Bahia"], k2000: ["rugby:Argentina", "rugby:Uruguay"],
    f1: { 250: ["Autodromo Jose Carlos Pace"] }, f1not: { 2000: ["Circuit Gilles-Villeneuve"] } },
  { name: "Buenos Aires", ll: [-34.6, -58.38], tz: "America/Argentina/Buenos_Aires", home: "soccer:Boca Juniors",
    local: ["rugby:Argentina", "rugby:Uruguay", "soccer:Boca Juniors", "soccer:River Plate", "soccer:Racing Club", "soccer:San Lorenzo", "soccer:Rosario Central", "soccer:Estudiantes de La Plata"],
    far: ["rugby:Brazil", "soccer:Talleres"], k1000: ["soccer:Talleres"], k2000: ["rugby:Brazil"] },
  { name: "Bogota", ll: [4.71, -74.07], tz: "America/Bogota", home: "soccer:Millonarios",
    local: ["soccer:Millonarios", "soccer:Independiente Santa Fe", "soccer:Atlético Nacional", "soccer:Deportivo Cali", "soccer:Deportivo Pereira"], far: ["soccer:Atlético Junior"], k1000: ["soccer:Atlético Junior"] },
  { name: "Lima", ll: [-12.05, -77.04], tz: "America/Lima", home: "soccer:Universitario",
    local: ["soccer:Universitario", "soccer:Alianza Lima", "soccer:Sporting Cristal", "soccer:Sport Huancayo"], far: ["soccer:Melgar"], k1000: ["soccer:Melgar"] },
  { name: "Mexico City", ll: [19.43, -99.13], tz: "America/Mexico_City", home: "soccer:Cruz Azul",
    local: ["soccer:América", "soccer:Cruz Azul", "soccer:Pumas UNAM", "soccer:Toluca", "soccer:Pachuca", "soccer:Puebla", "soccer:Guadalajara"],
    far: ["soccer:Monterrey", "soccer:Tijuana"], k1000: ["soccer:Monterrey"],
    not1000: ["nba:Spurs"], k2000: ["nba:Spurs", "nfl:Texans", "nfl:Cowboys"], f1: { 250: ["Autodromo Hermanos Rodriguez"] } },
  { name: "Reykjavik", ll: [64.15, -21.94], tz: "Atlantic/Reykjavik", local: [],
    not1000: ["soccer:Celtic", "soccer:Aberdeen"], k2000: ["soccer:Celtic", "soccer:Aberdeen", "rugby:Leinster", "soccer:Bodo/Glimt", "soccer:Viking FK"], not2000: ["soccer:Real Madrid"] },
  { name: "Beijing", ll: [39.9, 116.4], tz: "Asia/Shanghai", local: [], f1: { 2000: ["Shanghai International Circuit"] }, f1not: { 1000: ["Shanghai International Circuit"] } },
  // F1 hosts whose circuit should be local at the smallest distance
  { name: "Montreal (F1)", ll: [45.5, -73.57], local: [], f1: { 250: ["Circuit Gilles-Villeneuve"] } },
  { name: "Las Vegas", ll: [36.17, -115.14], local: ["nhl:Golden Knights", "nfl:Raiders"], f1: { 250: ["Las Vegas Street Circuit"] } },
  { name: "Miami (F1)", ll: [25.76, -80.19], local: [], f1: { 250: ["Miami International Autodrome"] } },
  { name: "Bologna", ll: [44.49, 11.34], local: ["soccer:Bologna"], f1: { 250: ["Autodromo Enzo e Dino Ferrari"] } },
  { name: "Northampton", ll: [52.24, -0.9], local: ["rugby:Northampton Saints"], f1: { 250: ["/Silverstone/"] } },
];

// =====================================================================
head("Rules: placeKey, km, kmOf");
check(LOCAL.placeKey("soccer/uefa.champions", "359") === "soccer:359", "soccer ids are shared across competitions");
check(LOCAL.placeKey("rugby/271937", 25924) === "rugby:25924", "rugby ids are shared across competitions");
check(LOCAL.placeKey("hockey/nhl", 21) === "hockey/nhl:21", "other sports' ids are per league", LOCAL.placeKey("hockey/nhl", 21));
const near = (a, b, tol) => Math.abs(a - b) <= tol;
check(near(LOCAL.km([51.51, -0.13], [48.86, 2.35]), 344, 6), "London to Paris is about 344 km", fmt(LOCAL.km([51.51, -0.13], [48.86, 2.35])));
check(near(LOCAL.km([40.71, -74.01], [34.05, -118.24]), 3940, 25), "New York to Los Angeles is about 3,940 km");
check(LOCAL.km([43.65, -79.38], [43.65, -79.38]) === 0, "a place is 0 km from itself");
check(near(LOCAL.km([-18.14, 178.44], [-13.83, -171.76]), 1150, 30), "Suva to Apia goes across the date line (about 1,150 km, not 19,000)", fmt(LOCAL.km([-18.14, 178.44], [-13.83, -171.76])));
check(near(LOCAL.km([90, 0], [-90, 0]), 20015, 5), "pole to pole is half the Earth's circumference");
check(near(LOCAL.km([51.51, -0.13], [-33.87, 151.21]), 16990, 40), "London to Sydney is about 16,990 km");
check(LOCAL.kmOf({}) === 500 && LOCAL.kmOf(null) === 500 && LOCAL.kmOf({ km: 300 }) === 500, "kmOf: 500 km unless a listed distance is chosen");
check([250, 500, 1000, 2000].every((k) => LOCAL.kmOf({ km: k }) === k && LOCAL.kmOf({ km: String(k) }) === k), "kmOf: 250, 500, 1000 and 2000 (number or text)");
check(JSON.stringify(LOCAL.DISTANCES) === "[250,500,1000,2000]" && LOCAL.RADIUS_KM === 500, "distance options are 250/500/1000/2000, default 500");

// =====================================================================
head("Rules: the visitor's area (area)");
check(LOCAL.area({ mode: "off" }, P, "Europe/London") === null, "Everywhere: no area");
check(LOCAL.area(null, P, "Europe/London") === null, "no setting: no area");
const tzA = LOCAL.area({ mode: "auto" }, P, "America/Toronto");
check(tzA && tzA.src === "tz" && tzA.km === LOCAL.TZ_KM && LOCAL.km(tzA.ll, [43.65, -79.38]) < 30, "time-zone default: America/Toronto stands for Toronto, reaching " + LOCAL.TZ_KM + " km (a guess)", tzA && tzA.label);
const tzK = LOCAL.area({ mode: "auto", km: 2000 }, P, "America/Toronto");
check(tzK && tzK.km === 2000, "time-zone default keeps the chosen distance");
check(LOCAL.area({ mode: "auto" }, P, "Mars/Olympus_Mons") === null, "unknown time zone: no area (the page then shows everything and asks the visitor to pick)");
check(LOCAL.area({ mode: "auto" }, P, "") === null && LOCAL.area({ mode: "auto" }, P, undefined) === null, "no time zone: no area");
info("UTC/Etc/UTC (privacy browsers, servers): " + (LOCAL.area({ mode: "auto" }, P, "UTC") ? "an area" : "no area, shows everything"));
const cA = cityArea("Glasgow", [55.86, -4.25], 1000);
check(cA && cA.src === "city" && cA.label === "Glasgow" && cA.km === 1000, "city mode uses the picked city and distance");
const gA = LOCAL.area({ mode: "auto", gps: [43.66, -79.4] }, P, "Europe/London");
check(gA && gA.src === "gps" && /toronto/i.test(gA.label), "shared location wins over the time zone and is named after the nearest city", gA && gA.label);
const gFar = LOCAL.area({ mode: "auto", gps: [0, -140] }, P, "Europe/London");
check(gFar && gFar.label === "your location", "shared location far from any listed city is 'your location'", gFar && gFar.label);
const gBad = LOCAL.area({ mode: "auto", gps: [999, 0] }, P, "Europe/London");
check(gBad && gBad.src === "tz" && /london/i.test(gBad.label), "an impossible shared location is ignored (falls back to the time zone)");
const cBad = LOCAL.area({ mode: "city", city: ["Nowhere", "x", 5], gps: [43.66, -79.4] }, P, "Europe/London");
check(cBad && cBad.src === "gps", "a broken picked city falls back to the shared location");
// Stored settings can be damaged; empty coordinates must not become 0°, 0° (the Gulf of Guinea)
const nullCity = LOCAL.area({ mode: "city", city: ["Nowhere", null, null] }, P, "Europe/London");
check(!nullCity || LOCAL.km(nullCity.ll, [0, 0]) > 1, "a picked city with empty coordinates is not placed at 0°, 0°", nullCity && JSON.stringify(nullCity));
const nullGps = LOCAL.area({ mode: "auto", gps: [null, ""] }, P, "Europe/London");
check(!nullGps || nullGps.src !== "gps", "a shared location with empty coordinates is ignored", nullGps && JSON.stringify(nullGps));

// =====================================================================
head("Rules: which games are local (isLocal, distance)");
const leafs = team("nhl:Maple Leafs"), lakers = team("nhl:Los Angeles Kings"), toronto = cityArea("Toronto", [43.65, -79.38], 500);
check(LOCAL.isLocal(game(leafs, "h"), toronto, P), "home team in range: local");
check(LOCAL.isLocal(game(leafs, "a"), toronto, P), "away team in range: local wherever the game is played");
check(!LOCAL.isLocal(game(lakers, "h"), toronto, P), "neither team in range: not local");
check(LOCAL.isLocal({ lg: "hockey/nhl", h: { id: lakers.id }, a: { id: leafs.id } }, toronto, P), "Kings v Maple Leafs (in Los Angeles) is local to Toronto");
const both = { lg: "hockey/nhl", h: { id: lakers.id }, a: { id: leafs.id } };
check(near(LOCAL.distance(both, toronto, P), LOCAL.km(toronto.ll, P.t[leafs.key]), 0.001), "distance is to the nearer of the two teams");
const nowhere = { id: "x", lg: "hockey/nhl", h: { id: "999991" }, a: { id: "999992" } };
check(LOCAL.distance(nowhere, toronto, P) === Infinity && !LOCAL.isLocal(nowhere, cityArea("T", [43.65, -79.38], 2000), P), "teams with no place: never local, even at 2,000 km");
check(LOCAL.isLocal(nowhere, toronto, P, () => true), "...unless it's the visitor's own team");
check(LOCAL.isLocal(game(lakers, "h"), toronto, P, (g) => g.h.id === lakers.id), "the visitor's own team counts however far away");
check(!LOCAL.isLocal(game(lakers, "h"), toronto, P, () => false), "a 'mine' that says no changes nothing");
check(LOCAL.isLocal(nowhere, null, P) && LOCAL.isLocal(game(lakers, "h"), null, P), "Everywhere (no area): every game is local");
check(LOCAL.isLocal(game(leafs, "h"), { ll: [43.65, -79.38], label: "T", src: "city" }, P), "an area without km uses 500 km");
check(!LOCAL.isLocal(null, toronto, P), "no game: not local");
check(!LOCAL.isLocal(race("Nowhere Raceway"), toronto, P) && LOCAL.isLocal(race("Nowhere Raceway"), toronto, P, () => true), "F1 race at an unknown circuit: not local unless it's the visitor's");
const torontoLeague = { lg: "basketball/nba", h: { id: leafs.id }, a: NOWHERE };
check(LOCAL.distance(torontoLeague, toronto, P) > 2000, "ids are looked up in the game's own league (NBA team " + leafs.id + " isn't the Maple Leafs)", fmt(LOCAL.distance(torontoLeague, toronto, P)));
// Real snapshot games with no place for either team
const unplaced = GAMES.filter((g) => !g.res && LOCAL.distance(g, { ll: [0, 0] }, P) === Infinity);
warn(unplaced.length === 0, "snapshot games where neither team has a place (never local)", unplaced.map(label).join("; "));
const halfPlaced = new Set();
for (const g of GAMES) if (!g.res) for (const t of [g.h, g.a]) if (!LOCAL.teamAt(P, g.lg, t)) halfPlaced.add(t.n + " (" + LOCAL.placeKey(g.lg, String(t.id)) + ")");
warn(halfPlaced.size === 0, "snapshot teams with no place", [...halfPlaced].join(", "));

// =====================================================================
head("Data: team homes (within 80 km of where they really play)");
for (const [ref, [lat, lon, tol]] of Object.entries(HOMES)) {
  const t = team(ref); if (!t) continue;
  const at = P.t[t.key], lim = tol || 80;
  if (!at) { check(false, t.name + " has a place", t.key + " missing"); continue; }
  const d = LOCAL.km(at, [lat, lon]);
  check(d <= lim, t.name + " is placed at its home", fmt(d) + " off: " + (NAMES[t.key] ? NAMES[t.key][1] : "") + " " + at.join(","));
}
// Every team key the page could look up must have sane coordinates
const badLL = Object.entries(P.t).filter(([, v]) => !(Array.isArray(v) && Math.abs(v[0]) <= 90 && Math.abs(v[1]) <= 180));
check(badLL.length === 0, "every team place is a valid latitude/longitude", badLL.map((x) => x[0]).join(", "));

head("Data: F1 circuits (within 60 km)");
for (const [name, ll] of Object.entries(CIRCUITS)) {
  if (!P.c[name]) { warn(false, name + " is in the data (only this year's and last year's races are)"); continue; }
  const d = LOCAL.km(P.c[name], ll);
  check(d <= 60, name + " is placed at the circuit", fmt(d) + " off at " + P.c[name].join(","));
}
check(Object.keys(P.c).some((n) => /silverstone/i.test(n)), "Silverstone (British Grand Prix) is in the data", "ESPN gives its town as 'Silverstone, Britain', which the geocoder misses: add it to places-manual.json circuits");

head("Data: time-zone cities");
for (const [tz, ll] of Object.entries(ZONES)) {
  const z = P.z[tz];
  if (!z) { check(false, tz + " is known", "missing: visitors in this zone get no area"); continue; }
  const d = LOCAL.km([z[1], z[2]], ll);
  check(d <= 150, tz + " stands for the right place", "'" + z[0] + "' is " + fmt(d) + " away at " + z[1] + "," + z[2]);
}
// Every zone: the city's longitude should fit the zone's UTC offset (catches a same-named town on another continent)
function offsetHours(tz) {
  const one = (d) => { const s = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" }).formatToParts(d).find((p) => p.type === "timeZoneName").value; const m = s.match(/GMT([+-])(\d+)(?::(\d+))?/); return m ? (m[1] === "-" ? -1 : 1) * (+m[2] + (+m[3] || 0) / 60) : 0; };
  try { return Math.min(one(new Date(Date.UTC(2026, 0, 15))), one(new Date(Date.UTC(2026, 6, 15)))); } catch (e) { return null; }
}
const offBad = [];
for (const [tz, z] of Object.entries(P.z)) {
  const o = offsetHours(tz); if (o == null) continue;
  let d = z[2] / 15 - o; while (d > 12) d -= 24; while (d < -12) d += 24;
  if (Math.abs(d) > 3) offBad.push(tz + " -> '" + z[0] + "' at " + z[1] + "," + z[2]);
}
check(offBad.length === 0, "every time-zone city lies in its own zone (longitude fits the UTC offset): " + offBad.length + " don't", offBad.join("; "));
const same = (a, b) => P.z[a] && P.z[b] && P.z[a][1] === P.z[b][1] && P.z[a][2] === P.z[b][2];
check(same("Asia/Kolkata", "Asia/Calcutta"), "Asia/Kolkata and Asia/Calcutta are the same place");
check(same("America/New_York", "US/Eastern") && same("America/Los_Angeles", "US/Pacific"), "US/Eastern and US/Pacific match their America/ names");
check(same("America/Argentina/Buenos_Aires", "America/Buenos_Aires"), "both Buenos Aires zone names work");
check(same("Europe/Kyiv", "Europe/Kiev") && same("Asia/Ho_Chi_Minh", "Asia/Saigon"), "old and new names (Kiev/Kyiv, Saigon/Ho Chi Minh) work");
// Zones browsers report for real places (Intl's own list, plus common older names), that have no city
const want = Intl.supportedValuesOf("timeZone").filter((z) => !/^(Etc|Antarctica)\//.test(z) && z.includes("/"))
  .concat(["Atlantic/Faroe", "Pacific/Kanton", "Pacific/Pohnpei", "Pacific/Chuuk", "Europe/Belfast", "Asia/Chongqing", "Asia/Harbin"]);
const missing = [...new Set(want)].filter((z) => !P.z[z]);
check(missing.length === 0, missing.length + " real-place time zones have no city (visitors there get no default area)", missing.join(" "));

// =====================================================================
head("Places around the world");
const summary = [];
const awayExamples = [];
for (const A of AREAS) {
  const at = {}; for (const k of LOCAL.DISTANCES) at[k] = cityArea(A.name, A.ll, k);
  const yes = (ref, k, side) => LOCAL.isLocal(game(team(ref), side), at[k], P);
  const dist = (ref) => { const t = team(ref); return P.t[t.key] ? LOCAL.km(A.ll, P.t[t.key]) : Infinity; };
  const tryAll = (refs, k, want) => { for (const ref of (refs || []).filter(team)) for (const side of ["h", "a"]) check(yes(ref, k, side) === want, A.name + " " + k + " km: " + team(ref).name + (side === "a" ? " (away)" : "") + (want ? " is local" : " is not local"), fmt(dist(ref))); };
  tryAll(A.local, 500, true); tryAll(A.far, 500, false); tryAll(A.k1000, 1000, true); tryAll(A.not1000, 1000, false); tryAll(A.k2000, 2000, true); tryAll(A.not2000, 2000, false);
  for (const [want, sets] of [[true, A.f1], [false, A.f1not]]) for (const [k, names] of Object.entries(sets || {})) for (const n of names) {
    const venue = /^\/.*\/$/.test(n) ? Object.keys(P.c).find((c) => new RegExp(n.slice(1, -1), "i").test(c)) : n;
    if (!venue) { check(false, A.name + " " + k + " km: " + n + " race is local", "no such circuit in the data"); continue; }
    const d = P.c[venue] ? LOCAL.km(A.ll, P.c[venue]) : Infinity;
    check(LOCAL.isLocal(race(venue), at[k], P) === want, A.name + " " + k + " km: F1 at " + venue + (want ? " is local" : " is not local"), fmt(d));
  }
  // The snapshot: the set at each distance contains the set at the one before
  const sets = LOCAL.DISTANCES.map((k) => GAMES.filter((g) => LOCAL.isLocal(g, at[k], P)));
  for (let i = 1; i < sets.length; i++) { const big = new Set(sets[i]); check(sets[i - 1].every((g) => big.has(g)), A.name + ": games local at " + LOCAL.DISTANCES[i - 1] + " km are local at " + LOCAL.DISTANCES[i] + " km"); }
  // Real away games that count
  for (const g of sets[1]) if (!g.res) { const dh = LOCAL.km(A.ll, LOCAL.teamAt(P, g.lg, g.h) || [0, 0]), pa = LOCAL.teamAt(P, g.lg, g.a); if (pa && LOCAL.km(A.ll, pa) <= 500 && dh > 500 && LOCAL.teamAt(P, g.lg, g.h)) awayExamples.push(A.name + ": " + label(g) + " (" + fmt(dh) + " away)"); }
  // Nearest team and circuit
  let best = null; for (const [k, ll] of Object.entries(P.t)) { const d = LOCAL.km(A.ll, ll); if (!best || d < best.d) best = { d, n: NAMES[k] ? NAMES[k][0] : k }; }
  summary.push({ A, counts: sets.map((s) => s.length), list: sets[1].slice(0, 5).map(label), best });
}
check(awayExamples.length > 0, "a real snapshot game counts as local because the local team is the AWAY side");
info(awayExamples.length + " such cases, e.g. " + awayExamples.slice(0, 4).join(" | "));

head("Local games in the snapshot (" + GAMES.length + " games, taken " + String(SNAP.taken).slice(0, 16) + ")");
console.log("        " + "place".padEnd(16) + "250   500  1000  2000   nearest team");
for (const s of summary) {
  console.log("        " + s.A.name.padEnd(16) + s.counts.map((n) => String(n).padStart(4)).join("  ") + "   " + (s.best ? s.best.n + " " + fmt(s.best.d) : "-"));
  if (VERBOSE && s.list.length) console.log("          " + s.list.join(" | "));
}
const empty = summary.filter((s) => s.counts[3] === 0 && s.best && s.best.d > 2000).map((s) => s.A.name + " (nearest " + s.best.n + ", " + fmt(s.best.d) + ")");
warn(empty.length === 0, "nothing can be local here even at 2,000 km: the list is always empty", empty.join("; "));

// =====================================================================
head("Time-zone default (no city picked, nothing shared)");
for (const A of AREAS) {
  if (!A.tz) continue;
  const z = LOCAL.area({ mode: "auto" }, P, A.tz);
  if (!z) { warn(false, A.name + ": " + A.tz + " gives no area, so every game shows"); continue; }
  const d = LOCAL.km(A.ll, z.ll);
  if (A.home && team(A.home)) { const t = team(A.home); const ok = LOCAL.isLocal(game(t, "h"), z, P); warn(ok, A.name + " (" + A.tz + " = " + z.label + ", " + fmt(d) + " away): " + t.name + " is local by default", ok ? "" : fmt(P.t[t.key] ? LOCAL.km(z.ll, P.t[t.key]) : Infinity) + " from " + z.label); }
  else if (VERBOSE) info(A.name + ": " + A.tz + " = " + z.label + ", " + fmt(d) + " away");
}
// Every visit opens on All sports with Local mode on (the device's time zone; a guess reaches
// TZ_KM). Where nothing is near, the page shows every game with a note, so this is information.
const anyKeys = Object.keys(P.t);
const tzs = [...new Set(AREAS.map((A) => A.tz).filter(Boolean))];
const nothing = tzs.filter((tz) => { const z = LOCAL.area({ mode: "auto" }, P, tz); return z && !anyKeys.some((k) => LOCAL.km(z.ll, P.t[k]) <= z.km); });
info(nothing.length + " of " + tzs.length + " sample time zones have no team in reach by default, so they open on every game with a note" + (nothing.length ? ": " + nothing.join(" ") : ""));
// Big countries with one zone: how far the zone's city is from other big cities in it
const REACH = [["Asia/Shanghai", { Beijing: [39.9, 116.4], Guangzhou: [23.13, 113.26], Chengdu: [30.66, 104.07] }], ["Asia/Kolkata", { Mumbai: [19.08, 72.88], Delhi: [28.61, 77.21], Bengaluru: [12.97, 77.59] }],
  ["Europe/Moscow", { "St Petersburg": [59.94, 30.31], Kazan: [55.79, 49.12] }], ["America/Sao_Paulo", { Rio: [-22.91, -43.17], Brasilia: [-15.79, -47.88], "Porto Alegre": [-30.03, -51.23] }],
  ["America/New_York", { Boston: [42.36, -71.06], Atlanta: [33.75, -84.39], Miami: [25.76, -80.19], Detroit: [42.33, -83.05] }], ["America/Chicago", { Dallas: [32.78, -96.8], Houston: [29.76, -95.37], Minneapolis: [44.98, -93.27] }],
  ["America/Los_Angeles", { "San Francisco": [37.77, -122.42], Seattle: [47.61, -122.33] }], ["America/Toronto", { Ottawa: [45.42, -75.7], Montreal: [45.5, -73.57], "Quebec City": [46.81, -71.21] }],
  ["Europe/London", { Manchester: [53.48, -2.24], Glasgow: [55.86, -4.25], Belfast: [54.6, -5.93] }], ["Europe/Madrid", { Barcelona: [41.39, 2.17], Seville: [37.39, -5.98] }],
  ["Europe/Berlin", { Munich: [48.14, 11.58], Cologne: [50.94, 6.96], Hamburg: [53.55, 10.0] }], ["Europe/Paris", { Marseille: [43.3, 5.37], Lyon: [45.76, 4.84] }],
  ["Australia/Sydney", { Canberra: [-35.28, 149.13] }], ["Africa/Johannesburg", { "Cape Town": [-33.92, 18.42], Durban: [-29.86, 31.02] }]];
for (const [tz, cities] of REACH) { const z = P.z[tz]; if (!z) continue; info(tz.padEnd(20) + " = " + z[0].padEnd(12) + " " + Object.entries(cities).map(([n, ll]) => n + " " + fmt(LOCAL.km([z[1], z[2]], ll))).join(", ")); }

// =====================================================================
head("Picking a city by typing (findCity) and naming a location (nearestCity)");
const FIND = [
  ["montreal", [45.5, -73.57]], ["Montréal", [45.5, -73.57]], ["  MONTREAL  ", [45.5, -73.57]], ["san fran", [37.77, -122.42]], ["Sao Paulo", [-23.55, -46.63]], ["São Paulo", [-23.55, -46.63]],
  ["st. louis", [38.63, -90.2]], ["st louis", [38.63, -90.2]], ["new york", [40.71, -74.01]], ["london", [51.51, -0.13]], ["toronto", [43.65, -79.38]], ["vancouver", [49.28, -123.12]],
  ["glasgow", [55.86, -4.25]], ["dublin", [53.35, -6.26]], ["cardiff", [51.48, -3.18]], ["paris", [48.86, 2.35]], ["madrid", [40.42, -3.7]], ["barcelona", [41.39, 2.17]],
  ["milan", [45.46, 9.19]], ["lisbon", [38.72, -9.14]], ["cape town", [-33.92, 18.42]], ["johannesburg", [-26.2, 28.05]], ["sydney", [-33.87, 151.21]], ["auckland", [-36.85, 174.76]],
  ["tokyo", [35.68, 139.69]], ["singapore", [1.29, 103.85]], ["dubai", [25.2, 55.27]], ["honolulu", [21.31, -157.86]], ["anchorage", [61.22, -149.9]], ["reykjavik", [64.15, -21.94]],
  ["mexico city", [19.43, -99.13]], ["buenos aires", [-34.6, -58.38]], ["halifax", [44.65, -63.57]], ["calgary", [51.05, -114.07]], ["seattle", [47.61, -122.33]], ["angeles", [34.05, -118.24]],
  ["winston salem", [36.1, -80.24]], ["stoke on trent", [53.0, -2.18]], ["santiago", [-33.45, -70.67]], ["malta", [35.9, 14.51]],
  ["new  york", [40.71, -74.01]], ["los   angeles", [34.05, -118.24]],
];
for (const [text, ll] of FIND) { const c = LOCAL.findCity(P, text); const d = c ? LOCAL.km([c[1], c[2]], ll) : Infinity; check(d <= 100, "'" + text + "' finds the right city", c ? "'" + c[0] + "', " + fmt(d) + " off" : "nothing found"); }
check(LOCAL.findCity(P, "") === null && LOCAL.findCity(P, "a") === null && LOCAL.findCity(P, "qqzzxx") === null, "too-short or unknown text finds nothing");
// Two letters are enough to start a name, whatever the letters (an "s" is just a letter)
for (const t of ["sa", "st", "as"]) { const c = LOCAL.findCity(P, t); check(c && fold(c[0]).replace(/[.\s]/g, "").startsWith(t) || (c && fold(c[0]).split(/[ ,]+/).some((w) => w.startsWith(t))), "'" + t + "' finds a city starting with '" + t + "'", c ? c[0] : "nothing found"); }
// Big cities a visitor might type, in English: these only work if the list has them
const ENGLISH = { munich: [48.14, 11.58], turin: [45.07, 7.68], naples: [40.85, 14.27], florence: [43.77, 11.26], seville: [37.39, -5.98], valencia: [39.47, -0.38], dortmund: [51.51, 7.47], mumbai: [19.08, 72.88], delhi: [28.61, 77.21], beijing: [39.9, 116.4], "rio de janeiro": [-22.91, -43.17], wellington: [-41.29, 174.78], "quebec": [46.81, -71.21] };
const notFound = Object.entries(ENGLISH).filter(([t, ll]) => { const c = LOCAL.findCity(P, t); return !c || LOCAL.km([c[1], c[2]], ll) > 100; }).map(([t]) => t + " -> " + ((LOCAL.findCity(P, t) || [])[0] || "nothing"));
warn(notFound.length === 0, "big cities typed in English that the picker can't find", notFound.join(", "));
for (const t of ["birmingham", "perth", "athens", "columbia", "st johns", "la"]) info("'" + t + "' picks " + ((LOCAL.findCity(P, t) || [])[0] || "nothing"));
const nc = (ll) => LOCAL.nearestCity(P, ll);
check(/toronto/i.test(nc([43.7, -79.4]).label), "nearestCity near Toronto is Toronto");
check(/london/i.test(nc([51.5, -0.1]).label), "nearestCity near London is London");
check(/sydney/i.test(nc([-33.9, 151.2]).label), "nearestCity near Sydney is Sydney");
check(!/malta/i.test(nc([42.65, -73.75]).label), "a shared location in Albany, NY is not named 'Malta'", nc([42.65, -73.75]).label);
check(!/christmas/i.test(nc([28.54, -81.1]).label), "a shared location east of Orlando is not named 'Christmas'", nc([28.54, -81.1]).label);
check(nc([0, -140]).km > 500, "nearestCity in mid-Pacific is far from everything (the Marquesas are about 990 km)");
check(LOCAL.nearestCity({}, [0, 0]) === null, "nearestCity with no cities: none");
warn(gone.size === 0, "teams named in this test that aren't in research/places.json any more (left the app's leagues?), skipped", [...gone].join(", "));

// =====================================================================
console.log("\n=== Summary ===");
console.log("  " + passed + " passed, " + fails.length + " failed, " + warns.length + " warnings");
if (fails.length && !VERBOSE) console.log("  (run with --verbose to see every passing check and each place's local games)");
process.exit(fails.length ? 1 : 0);
