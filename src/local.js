/* Local mode: which games are local to a visitor, worked out on their own device (nothing here
   makes a network request). The build inlines this file into the page; tests can require() it.

   A game is local when either team is based within the visitor's distance (500 km unless they
   choose 250, 1,000 or 2,000 km for sparse regions; a time-zone guess reaches 1,000 km) of their
   area, wherever the
   game is played (a local team's away game still counts), or when the visitor's own team plays.
   An F1 race is local when its circuit is in range. Team bases come from research/places.json
   (home venues from ESPN, coordinates from OpenStreetMap), compiled by src/build.js into:
     P.t  team key -> [lat, lon]       key: placeKey(league, ESPN team id)
     P.c  circuit name -> [lat, lon]
     P.z  time zone -> [city, lat, lon]
     P.cities  [[label, lat, lon], ...]  (for picking a city)
   The visitor's area ("where") is one of:
     {mode:"auto"}                  their device's time zone city, or
     {mode:"auto", gps:[lat,lon]}   a location they chose to share (rounded to about 1 km)
     {mode:"city", city:[label,lat,lon]}
     {mode:"off"}                   everywhere: no local filter
   plus km: the distance (default RADIUS_KM). Works anywhere: distances are great-circle, so the
   date line and the poles are no problem. */
const LOCAL = (() => {
  const RADIUS_KM = 500, TZ_KM = 1000, DISTANCES = [250, 500, 1000, 2000];
  // The distance: the visitor's choice, else 500 km; a time-zone guess (a whole zone, so coarse)
  // reaches 1,000 km until they choose a distance or a city
  const chosenKm = (where) => (where && DISTANCES.includes(+where.km) ? +where.km : 0);
  const kmOf = (where) => chosenKm(where) || RADIUS_KM;
  // Soccer and rugby team ids are shared across competitions; other sports' ids are per league
  const placeKey = (lg, id) => (/^(soccer|rugby)\//.test(lg) ? lg.split("/")[0] : lg) + ":" + id;
  // A real coordinate pair (stored settings can hold null or "" after damage; those aren't 0, 0)
  const num = (v) => v !== null && v !== "" && v !== undefined && typeof v !== "boolean" && Number.isFinite(+v);
  const ok = (ll) => Array.isArray(ll) && ll.length >= 2 && num(ll[0]) && num(ll[1]) && Math.abs(ll[0]) <= 90 && Math.abs(ll[1]) <= 180;
  // Great-circle distance in km
  function km(a, b) {
    const R = 6371, r = (x) => (x * Math.PI) / 180;
    const dLat = r(b[0] - a[0]), dLon = r(b[1] - a[1]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  const teamAt = (P, lg, t) => (P && P.t && t && t.id != null && lg ? P.t[placeKey(lg, String(t.id))] || null : null);
  function nearestCity(P, ll) {
    let best = null, d = Infinity;
    for (const c of (P && P.cities) || []) { const k = km(ll, [c[1], c[2]]); if (k < d) { d = k; best = c; } }
    return best ? { label: best[0], km: d } : null;
  }
  // The visitor's area, or null for everywhere (or when it can't be worked out)
  function area(where, P, tz) {
    if (!where || where.mode === "off") return null;
    const km = kmOf(where);
    if (where.mode === "city" && where.city && ok([where.city[1], where.city[2]])) return { ll: [+where.city[1], +where.city[2]], label: String(where.city[0]), src: "city", km };
    if (where.gps && ok(where.gps)) { const n = nearestCity(P, where.gps); return { ll: [+where.gps[0], +where.gps[1]], label: n && n.km < 150 ? n.label : "your location", src: "gps", km }; }
    const z = P && P.z && tz ? P.z[tz] : null;
    if (z && ok([z[1], z[2]])) return { ll: [+z[1], +z[2]], label: String(z[0]), src: "tz", km: chosenKm(where) || TZ_KM };
    return null;
  }
  // Distance from the area to the nearer of the two teams (or the circuit); Infinity if unknown
  function distance(g, A, P) {
    if (!A || !g) return Infinity;
    if (g.res) { const c = P && P.c ? P.c[g.venue] : null; return c ? km(A.ll, c) : Infinity; }
    let d = Infinity;
    for (const t of [g.h, g.a]) { const p = teamAt(P, g.lg, t); if (p) d = Math.min(d, km(A.ll, p)); }
    return d;
  }
  // mine(g): true when the visitor's own team (or driver) is in the game; those always count
  function isLocal(g, A, P, mine) {
    if (!A) return true;
    if (!g) return false;
    if (distance(g, A, P) <= (A.km || RADIUS_KM)) return true;
    return !!(mine && mine(g));
  }
  // A city typed by the visitor: the whole label, then the start of the label, then the start of the
  // city's name, then the start of a word in the city's name (not in its region: "York" isn't "Bronx,
  // New York"), and last a whole word of the label, so a country finds its city ("malta": Valletta). Accents, full stops and hyphens don't matter ("st louis", "Sao Paulo", "winston salem").
  const fold = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[.'’]/g, "").replace(/[-‐]/g, " ").replace(/\s+/g, " ").trim();
  // Everyday names and local spellings for a city in the list
  const ALIAS = { la: "los angeles", nyc: "new york", ny: "new york", "new york city": "new york", dc: "washington", "washington dc": "washington", sf: "san francisco", philly: "philadelphia", vegas: "las vegas", rio: "rio de janeiro", munchen: "munich", muenchen: "munich", roma: "rome", koln: "cologne", koeln: "cologne", sevilla: "seville", napoli: "naples", milano: "milan", torino: "turin", lisboa: "lisbon", wien: "vienna", praha: "prague", bombay: "mumbai", calcutta: "kolkata", madras: "chennai", peking: "beijing", kiev: "kyiv", saigon: "ho chi minh", "mexico": "mexico city", "quebec": "quebec city", "kc": "kansas city", "tdot": "toronto", "the six": "toronto" };
  function findCity(P, text) {
    let q = fold(text).replace(/^saint /, "st ").replace(/ saint /g, " st ");
    q = ALIAS[q] || q;
    if (q.length < 2) return null;
    const list = (P && P.cities) || [];
    const full = (c) => fold(c[0]), city = (c) => fold(String(c[0]).split(",")[0]);
    return list.find((c) => full(c) === q) || list.find((c) => city(c) === q) || list.find((c) => full(c).startsWith(q)) || list.find((c) => city(c).startsWith(q)) || list.find((c) => city(c).split(" ").some((w) => w.startsWith(q))) || list.find((c) => full(c).split(/[ ,]+/).some((w) => w === q)) || null;
  }
  return { RADIUS_KM, TZ_KM, DISTANCES, kmOf, chosenKm, placeKey, km, teamAt, nearestCity, area, distance, isLocal, findCity };
})();
if (typeof module !== "undefined" && module.exports) module.exports = LOCAL;
