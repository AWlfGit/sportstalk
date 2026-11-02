// Screens the research files before they go into the page: node research/audit.js
// Prints anything that might break the content rules (lyrics, offensive or tragedy references)
// and gaps in the data. Add phrases to research/blocked.json to drop matching lines at build time.
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "out");
const OFFENSIVE = /\b(yids?|yiddo|gyp(sy|sies|po)|rent ?boys?|scum|sheep[- ]?shag\w*|bin ?dippers?|plastic paddy|fenians?|huns?|taigs?|papists?|popish|ira|uvf|uda|sectarian|nazi\w*|retard\w*|tranny|poof|queer)\b/i;
const TRAGEDY = /\b(munich|hillsborough|heysel|bradford fire|ibrox disaster|superga|air crash|plane crash|disaster|tragedy|died|deaths?)\b/i;
const SONGISH = /\b(lyrics?|verse|chorus|sing(s|ing)?|sung|songs?|chants?|anthem|hymn)\b/i;
const LONGQUOTE = /["“][^"”]{45,}["”]/;

const issues = [];
let teams = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
  const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  for (const t of data) {
    teams++;
    const where = `${f.replace(".json", "")} | ${t.team}`;
    const texts = [];
    for (const x of t.lines || []) texts.push(["line", x.t], ["line note", x.m]);
    for (const x of t.lingo || []) texts.push(["term", x.term], ["meaning", x.means]);
    for (const x of t.avoid || []) texts.push(["avoid", x.say + " -> " + x.instead + " (" + x.why + ")"]);
    texts.push(["memory", t.memory || ""], ["nickname", t.nickname || ""], ["fans", t.fans || ""]);
    for (const [field, text] of texts) {
      if (!text) continue;
      if (OFFENSIVE.test(text)) issues.push(`OFFENSIVE? ${where} [${field}] ${text}`);
      if (TRAGEDY.test(text)) issues.push(`TRAGEDY?   ${where} [${field}] ${text}`);
      if (/\n|♪|\s\/\s/.test(text) || LONGQUOTE.test(text)) issues.push(`LYRIC?     ${where} [${field}] ${text}`);
      if (SONGISH.test(text) && (field === "line" || field === "term")) issues.push(`SONG?      ${where} [${field}] ${text}`);
    }
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
// Talk packs (sport-wide slang, phrases, pub-test rounds and five-beat exchanges)
const SWEAR = /\b(fuck\w*|shit\w*|cunts?|twats?|wank\w*|bastards?|pricks?|dickheads?|bitch\w*|assholes?|arseholes?|goddamn\w*)\b/i;
const PLACEHOLDER = /\{(\w+)\}/g, KNOWN = new Set(["team", "opp", "player", "score", "when", "driver", "winner", "pos", "race"]); // the last four are F1's
let packs = 0;
for (const f of ["hockey-canada.json", "football-uk.json", "football-nfl.json", "basketball-nba.json", "baseball-mlb.json", "f1-na.json"]) {
  const p = path.join(__dirname, f);
  if (!fs.existsSync(p)) continue;
  packs++;
  const d = JSON.parse(fs.readFileSync(p, "utf8"));
  const texts = [];
  for (const x of d.terms || []) texts.push(["term " + x.term, x.term + " | " + x.means + " | " + (x.use || "")]);
  for (const [k, list] of Object.entries(d.phrases || {})) for (const x of list || []) texts.push(["phrase " + k, x.t + " | " + (x.m || "")]);
  for (const [k, e] of Object.entries(d.exchanges || {})) for (const [b, t] of Object.entries(e || {})) texts.push(["exchange " + k + "." + b, t]);
  for (const r of d.pub || []) texts.push(["pub", r.say + " | " + (r.o || []).map((o) => o[0] + " (" + o[2] + ")").join(" | ")]);
  for (const x of d.avoid || []) texts.push(["avoid", x.say + " -> " + x.instead + " (" + x.why + ")"]);
  texts.push(["nerd", d.nerd || ""], ["offq", d.offq || ""]);
  for (const [field, text] of texts) {
    if (!text) continue;
    const where = `${f.replace(".json", "")} [${field}]`;
    if (OFFENSIVE.test(text)) issues.push(`OFFENSIVE? ${where} ${text}`);
    if (SWEAR.test(text)) issues.push(`SWEARING?  ${where} ${text}`);
    if (TRAGEDY.test(text)) issues.push(`TRAGEDY?   ${where} ${text}`);
    if (/\n|♪|\s\/\s/.test(text) || LONGQUOTE.test(text)) issues.push(`LYRIC?     ${where} ${text}`);
    if (SONGISH.test(text) && /^(phrase|exchange)/.test(field)) issues.push(`SONG?      ${where} ${text}`);
    for (const m of String(text).matchAll(PLACEHOLDER)) if (!KNOWN.has(m[1])) issues.push(`BAD SLOT   ${where} {${m[1]}} in: ${text}`);
  }
  for (const r of d.pub || []) if (!(r.o || []).some((o) => +o[1] === 2)) issues.push(`PUB ROUND  ${f} has no best answer: ${r.say}`);
}
console.log(teams, "teams and", packs, "talk packs checked,", issues.length, "items to review");
for (const i of issues) console.log(i);
