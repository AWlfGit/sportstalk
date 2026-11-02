// Screens the research files before they go into the page: node research/audit.js [file-filter]
// Prints anything that might break the content rules (lyrics, offensive or tragedy references,
// swearing), malformed pronunciation fields, unknown region ids, and gaps in the data.
// Add phrases to research/blocked.json to drop matching lines at build time.
// With a filter (e.g. "nhl" or "regions/uk"), only matching files are reported.
const fs = require("fs");
const path = require("path");

const only = process.argv[2] || "";
const OFFENSIVE = /\b(yids?|yiddo|gyp(sy|sies|po)|rent ?boys?|scum|sheep[- ]?shag\w*|bin ?dippers?|plastic paddy|fenians?|huns?|taigs?|papists?|popish|ira|uvf|uda|sectarian|nazis?|nazism|retard\w*|tranny|poof|queer)\b/i;
// "Munich" on its own is a city (Bayern); the 1958 air crash is what this catches
const TRAGEDY = /\b(munich (air|disaster|crash|58|'58)|hillsborough|heysel|bradford fire|ibrox disaster|superga|air crash|plane crash|disaster|tragedy|died|(?<!at the |sudden )deaths?)\b/i;
const SONGISH = /\b(lyrics?|verse|chorus|sing(s|ing)?|sung|songs?|chants?|anthem|hymn)\b/i;
const SWEAR = /\b(fuck\w*|shit\w*|cunts?|twats?|wank\w*|bastards?|pricks?|dickheads?|bitch\w*|assholes?|arseholes?|goddamn\w*)\b/i;
const LONGQUOTE = /["“][^"”]{45,}["”]/;
const PLACEHOLDER = /\{(\w+)\}/g, KNOWN = new Set(["team", "opp", "player", "score", "when", "driver", "winner", "pos", "race"]); // the last four are F1's
const WHEN = new Set(["any", "win", "loss", "rival"]);
// Region ids are the ones listed in REGIONS.md
const REGION_IDS = new Set([...fs.readFileSync(path.join(__dirname, "REGIONS.md"), "utf8").matchAll(/^- `([a-z0-9-]+)`:/gm)].map((m) => m[1]));

const issues = [];
const wanted = (rel) => !only || rel.includes(only);
function screen(where, field, text, opts = {}) {
  if (!text) return;
  if (OFFENSIVE.test(text)) issues.push(`OFFENSIVE? ${where} [${field}] ${text}`);
  if (SWEAR.test(text)) issues.push(`SWEARING?  ${where} [${field}] ${text}`);
  if (TRAGEDY.test(text)) issues.push(`TRAGEDY?   ${where} [${field}] ${text}`);
  if (/\n|♪|\s\/\s/.test(text) || LONGQUOTE.test(text)) issues.push(`LYRIC?     ${where} [${field}] ${text}`);
  if (opts.song && SONGISH.test(text)) issues.push(`SONG?      ${where} [${field}] ${text}`);
  for (const m of String(text).matchAll(PLACEHOLDER)) if (!KNOWN.has(m[1])) issues.push(`BAD SLOT   ${where} [${field}] {${m[1]}} in: ${text}`);
}
// A speech respelling: lower case words, no hyphens, no capitals (except the word "A"), no IPA symbols
function checkSay(where, x, label) {
  if (x.tts && !/^(?:[a-z']+|A)(?: (?:[a-z']+|A))*$/.test(x.tts)) issues.push(`BAD TTS    ${where} [${label}] "${x.tts}" (lower-case words only)`);
  if (x.ipa && /[A-Z]/.test(x.ipa)) issues.push(`BAD IPA    ${where} [${label}] "${x.ipa}" (IPA has no capital letters)`);
  if (x.tts && !x.ipa) issues.push(`NO IPA     ${where} [${label}] has tts "${x.tts}" but no ipa to check it against`);
}

// Team guides
let teams = 0;
const outDir = path.join(__dirname, "out");
for (const f of fs.readdirSync(outDir).filter((x) => x.endsWith(".json")).sort()) {
  if (!wanted("out/" + f)) continue;
  const data = JSON.parse(fs.readFileSync(path.join(outDir, f), "utf8"));
  for (const t of data) {
    teams++;
    const where = `${f.replace(".json", "")} | ${t.team}`;
    for (const x of t.lines || []) { screen(where, "line", x.t, { song: true }); screen(where, "line note", x.m); if (x.when && !WHEN.has(x.when)) issues.push(`BAD WHEN   ${where} "${x.when}" on: ${x.t}`); }
    for (const x of t.lingo || []) { screen(where, "term", x.term, { song: true }); screen(where, "meaning", x.means); checkSay(where, x, x.term); }
    for (const x of t.avoid || []) screen(where, "avoid", x.say + " -> " + x.instead + " (" + x.why + ")");
    for (const x of t.traditions || []) screen(where, "tradition", x.name + ": " + x.means);
    for (const x of t.sore || []) screen(where, "sore", x.topic + ": " + x.why);
    for (const x of t.pronounce || []) { screen(where, "pronounce", x.word + ": " + (x.why || "")); checkSay(where, x, x.word); }
    for (const k of ["memory", "nickname", "fans"]) screen(where, k, t[k] || "");
    if (t.region !== undefined && t.region !== "" && !REGION_IDS.has(t.region)) issues.push(`BAD REGION ${where}: "${t.region}"`);
    const gaps = [];
    if (!t.nickname && !t.fans) gaps.push("nickname+fans");
    if (!t.ground) gaps.push("ground");
    if (!(t.rivals || []).length) gaps.push("rivals");
    if ((t.lines || []).length < 2) gaps.push("lines");
    if ((t.lingo || []).length < 1) gaps.push("lingo");
    if (gaps.length) issues.push(`GAPS       ${where}: ${gaps.join(", ")}`);
    if ((t.unsure || []).length) issues.push(`UNSURE     ${where}: ${t.unsure.join("; ")}`);
  }
}

// Region packs
let regions = 0;
const regDir = path.join(__dirname, "regions");
const seenRegions = new Set();
if (fs.existsSync(regDir)) for (const f of fs.readdirSync(regDir).filter((x) => x.endsWith(".json")).sort()) {
  if (!wanted("regions/" + f)) continue;
  for (const r of JSON.parse(fs.readFileSync(path.join(regDir, f), "utf8"))) {
    regions++;
    const where = `regions/${f.replace(".json", "")} | ${r.id}`;
    if (!REGION_IDS.has(r.id)) issues.push(`BAD REGION ${where}: unknown id`);
    if (seenRegions.has(r.id)) issues.push(`DUPLICATE  ${where}`);
    seenRegions.add(r.id);
    for (const x of r.words || []) { screen(where, "word", x.term + " | " + x.means + " | " + (x.use || ""), { song: true }); checkSay(where, x, x.term); }
    for (const x of r.pronounce || []) { screen(where, "pronounce", x.word + ": " + (x.why || "")); checkSay(where, x, x.word); }
    for (const x of r.lines || []) screen(where, "line", x.t + " | " + (x.m || ""), { song: true });
    for (const x of r.avoid || []) screen(where, "avoid", x.say + " -> " + x.instead + " (" + x.why + ")");
    for (const h of r.habits || []) screen(where, "habit", h);
    if ((r.words || []).length < 6) issues.push(`GAPS       ${where}: only ${(r.words || []).length} words`);
    if ((r.unsure || []).length) issues.push(`UNSURE     ${where}: ${r.unsure.join("; ")}`);
  }
}

// Talk packs (sport-wide slang, phrases, pub-test rounds and five-beat exchanges)
let packs = 0;
for (const f of ["hockey-canada.json", "football-uk.json", "football-nfl.json", "basketball-nba.json", "baseball-mlb.json", "f1-na.json", "afl-australia.json", "nrl-australia.json"]) {
  const p = path.join(__dirname, f);
  if (!fs.existsSync(p) || !wanted(f)) continue;
  packs++;
  const d = JSON.parse(fs.readFileSync(p, "utf8"));
  const where = f.replace(".json", "");
  for (const x of d.terms || []) { screen(where, "term " + x.term, x.term + " | " + x.means + " | " + (x.use || "")); checkSay(where, x, x.term); }
  for (const [k, list] of Object.entries(d.phrases || {})) for (const x of list || []) screen(where, "phrase " + k, x.t + " | " + (x.m || ""), { song: true });
  for (const [k, e] of Object.entries(d.exchanges || {})) for (const [b, t] of Object.entries(e || {})) screen(where, "exchange " + k + "." + b, t, { song: true });
  for (const r of d.pub || []) screen(where, "pub", r.say + " | " + (r.o || []).map((o) => o[0] + " (" + o[2] + ")").join(" | "));
  for (const x of d.avoid || []) screen(where, "avoid", x.say + " -> " + x.instead + " (" + x.why + ")");
  screen(where, "nerd", d.nerd || ""); screen(where, "offq", d.offq || "");
  for (const r of d.pub || []) if (!(r.o || []).some((o) => +o[1] === 2)) issues.push(`PUB ROUND  ${f} has no best answer: ${r.say}`);
}

console.log(teams, "teams,", regions, "regions and", packs, "talk packs checked,", issues.length, "items to review");
for (const i of issues) console.log(i);
