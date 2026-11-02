// Finds a better speech respelling for every word the voices get wrong.  Windows only:
//   node research/pronounce-fix.js [filter] [--write]
// For each word whose current reading doesn't match its IPA, it tries the plain word, the current
// respelling, versions with syllables joined or swapped, and respellings built from the IPA, speaks
// them all with a Windows voice, and picks the one that sounds closest to the IPA. Without --write
// it only reports; with --write it saves the winners into the research files (tts, or "" when the
// plain word reads right).
const fs = require("fs");
const path = require("path");
const L = require("./pronounce-lib");

const args = process.argv.slice(2);
const write = args.includes("--write");
const only = args.find((a) => !a.startsWith("--")) || "";
const PASS = 0.7;

const items = L.collect(only);
const first = L.speak(items.flatMap((x) => [x.word, x.tts]));
const scoreOf = (x, heard, text) => L.similarity(L.ipaToArpa(x.ipa), heard.get(text || x.word) || []);
const bad = items.filter((x) => scoreOf(x, first, x.tts) < PASS);
// A respelling has to look like plain English to every voice, not just the one we measure with:
// each word has a vowel, at most 3 consonants in a row, no "ww" or "hh", and no word over 10 letters.
const plainWord = (w) => w === "A" || (/^[a-z']+$/.test(w) && /[aeiouy]/.test(w) && !/[bcdfghjklmnpqrstvwxz]{4,}/.test(w) && !/ww|hh|q(?!u)/.test(w) && w.length <= 10);
const valid = (t) => t.split(" ").every(plainWord);

// Candidates for each word that reads wrong
const cand = new Map();
for (const x of bad) {
  const c = new Set([""]);
  const fromTts = x.tts ? x.tts.split(" ") : [];
  const fromIpa = L.ipaSyllables(x.ipa);
  for (const toks of [fromTts, L.swapTokens(fromTts), fromIpa, L.swapTokens(fromIpa)]) if (toks.length) for (const j of L.joins(toks)) if (valid(j)) c.add(j);
  // Abbreviations: letter names, spaced ("m s g")
  if (/^[A-Z]{2,5}$/.test(x.word.replace(/^the /i, ""))) c.add((/^the /i.test(x.word) ? "the " : "") + x.word.replace(/^the /i, "").toLowerCase().split("").join(" "));
  cand.set(x, [...c]);
}
const heard = L.speak([...cand.values()].flat().filter(Boolean));
for (const [k, v] of first) if (!heard.has(k)) heard.set(k, v);

// Pick the best; keep the current respelling unless something is clearly better
const changes = [];
let fixed = 0;
for (const x of bad) {
  const now = scoreOf(x, heard, x.tts);
  let best = { t: x.tts, s: now };
  for (const t of cand.get(x)) {
    const s = scoreOf(x, heard, t);
    // Prefer the plain word, then fewer joined-up words; a change has to be clearly better
    const words = t ? t.split(" ").length : 0, bestWords = best.t ? best.t.split(" ").length : 0;
    if (s > best.s + 0.05 || (t === "" && s >= PASS && s >= best.s - 0.05) || (s >= best.s - 0.02 && s >= PASS && best.s >= PASS && words > bestWords && best.t !== "")) best = { t, s };
  }
  if (best.s >= PASS) fixed++;
  if (best.t !== x.tts) changes.push({ x, from: x.tts, to: best.t, before: now, after: best.s });
}
console.log(`${items.length} words checked; ${bad.length} read wrong; ${fixed} can be fixed with a better respelling; ${bad.length - fixed} still need a person to look.`);
for (const c of changes) console.log(`${c.after >= PASS ? "FIXED " : "BETTER"} ${c.before.toFixed(2)} -> ${c.after.toFixed(2)}  ${c.x.word}: "${c.from}" -> "${c.to}"  [${c.x.where}]`);
for (const x of bad) if (!changes.some((c) => c.x === x) && scoreOf(x, heard, x.tts) < PASS) console.log(`LOOK   ${scoreOf(x, heard, x.tts).toFixed(2)}  ${x.word} "${x.tts}" /${x.ipa}/  [${x.where}]`);

if (write && changes.length) {
  const byFile = new Map();
  for (const c of changes) { if (!byFile.has(c.x.file)) byFile.set(c.x.file, []); byFile.get(c.x.file).push(c); }
  for (const [file, list] of byFile) {
    const p = path.join(L.dir, file), data = L.json(p);
    for (const c of list) {
      const holder = file === "pronounce.json" ? data : file.startsWith("out/") ? data.find((t) => t.team === c.x.owner) : file.startsWith("regions/") ? data.find((r) => r.id === c.x.owner) : data;
      const entry = holder && holder[c.x.list] && holder[c.x.list][c.x.i];
      if (entry && entry[c.x.wordKey] === c.x.word) entry.tts = c.to;
    }
    fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
  }
  console.log("Saved", changes.length, "respellings in", byFile.size, "files.");
}
