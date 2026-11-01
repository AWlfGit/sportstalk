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
console.log(teams, "teams checked,", issues.length, "items to review");
for (const i of issues) console.log(i);
