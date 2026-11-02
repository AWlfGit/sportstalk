// Shared pieces for the pronunciation tools (pronounce-check.js and pronounce-fix.js).
// Windows only: speech is measured with the Windows speech engine (pronounce-check.ps1).
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const dir = __dirname;
const json = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

// Every term, name and region word with an IPA reference, and where it lives
function collect(only) {
  const items = [];
  const want = (rel) => !only || rel.includes(only);
  const add = (file, owner, list, i, wordKey, x) => { if (x[wordKey] && x.ipa) items.push({ file, owner, list, i, wordKey, word: x[wordKey], ipa: x.ipa, tts: x.tts || "", where: file + (owner ? " | " + owner : "") }); };
  if (want("pronounce.json")) (json(path.join(dir, "pronounce.json")).entries || []).forEach((x, i) => add("pronounce.json", "", "entries", i, "word", x));
  for (const f of fs.readdirSync(path.join(dir, "out")).filter((f) => f.endsWith(".json"))) {
    if (!want("out/" + f)) continue;
    for (const t of json(path.join(dir, "out", f))) {
      (t.lingo || []).forEach((x, i) => add("out/" + f, t.team, "lingo", i, "term", x));
      (t.pronounce || []).forEach((x, i) => add("out/" + f, t.team, "pronounce", i, "word", x));
    }
  }
  const regDir = path.join(dir, "regions");
  if (fs.existsSync(regDir)) for (const f of fs.readdirSync(regDir).filter((f) => f.endsWith(".json"))) {
    if (!want("regions/" + f)) continue;
    for (const r of json(path.join(regDir, f))) {
      (r.words || []).forEach((x, i) => add("regions/" + f, r.id, "words", i, "term", x));
      (r.pronounce || []).forEach((x, i) => add("regions/" + f, r.id, "pronounce", i, "word", x));
    }
  }
  for (const f of fs.readdirSync(dir).filter((f) => /^(hockey|football|basketball|baseball|f1)-.*\.json$/.test(f))) {
    if (!want(f)) continue;
    (json(path.join(dir, f)).terms || []).forEach((x, i) => add(f, "", "terms", i, "term", x));
  }
  return items;
}

// Speak a list of texts with the Windows voice; returns a Map text -> ARPAbet phonemes
function speak(texts) {
  texts = [...new Set(texts.filter(Boolean))];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "say-"));
  fs.writeFileSync(path.join(tmp, "in.json"), JSON.stringify(texts));
  execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(dir, "pronounce-check.ps1"), path.join(tmp, "in.json"), path.join(tmp, "out.json")], { stdio: "inherit" });
  const said = JSON.parse(fs.readFileSync(path.join(tmp, "out.json"), "utf8").replace(/^﻿/, ""));
  fs.rmSync(tmp, { recursive: true, force: true });
  return new Map(texts.map((t, i) => [t, String(said[i] || "").split(" ").filter(Boolean)]));
}

// IPA to ARPAbet, close enough to compare
const MULTI = [["tʃ", "CH"], ["dʒ", "JH"], ["eɪ", "EY"], ["aɪ", "AY"], ["ɑɪ", "AY"], ["ɔɪ", "OY"], ["aʊ", "AW"], ["oʊ", "OW"], ["əʊ", "OW"], ["ɪə", "IH"], ["eə", "EH"], ["ɛə", "EH"], ["ʊə", "UH"], ["ɜr", "ER"], ["ər", "ER"], ["ts", "T S"]];
const ONE = { i: "IY", ɪ: "IH", e: "EH", ɛ: "EH", æ: "AE", a: "AA", ɑ: "AA", ɒ: "AA", ɔ: "AO", o: "OW", ʊ: "UH", u: "UW", ʌ: "AH", ə: "AH", ɐ: "AH", ɜ: "ER", ɝ: "ER", ɚ: "ER", ɨ: "IH", y: "UW", ø: "ER", œ: "ER", ɯ: "UW", p: "P", b: "B", t: "T", d: "D", k: "K", g: "G", ɡ: "G", f: "F", v: "V", θ: "TH", ð: "DH", s: "S", z: "Z", ʃ: "SH", ʒ: "ZH", h: "H", m: "M", n: "N", ŋ: "NG", l: "L", ɫ: "L", r: "R", ɹ: "R", ɾ: "RD", ʁ: "R", ʀ: "R", ɻ: "R", j: "Y", w: "W", x: "H", χ: "H", ç: "H", ɣ: "G", β: "B", ʔ: "", ɲ: "N Y", ʎ: "L Y", c: "K", ɟ: "G", ʝ: "Y", ɬ: "L" };
const cleanIpa = (ipa) => String(ipa).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/eː/g, "eɪ").replace(/oː/g, "oʊ").replace(/[ˈˌː.‿()\/\[\]\s-]/g, "").toLowerCase();
function ipaToArpa(ipa) {
  let s = cleanIpa(ipa);
  const out = [];
  while (s) {
    const m = MULTI.find(([k]) => s.startsWith(k));
    if (m) { out.push(...m[1].split(" ")); s = s.slice(m[0].length); continue; }
    const v = ONE[s[0]];
    if (v) out.push(...v.split(" "));
    s = s.slice(1);
  }
  return out;
}

// Sounds that are near enough: reduced vowels, accent differences (a/æ, eː/ɛ), voicing, taps
const NEAR = [["AH", "AX", "IH", "EH", "ER", "UH"], ["AA", "AO", "AH", "AX"], ["AA", "AE"], ["EY", "EH"], ["IY", "IH"], ["UW", "UH"], ["EH", "AE"], ["OW", "AO"], ["T", "D"], ["P", "B"], ["K", "G"], ["S", "Z"], ["F", "V"], ["TH", "DH"], ["SH", "ZH"], ["CH", "JH"]];
const close = (a, b) => (a === "RD" && ["R", "D", "T"].includes(b)) || (b === "RD" && ["R", "D", "T"].includes(a)) || NEAR.some((g) => g.includes(a) && g.includes(b));
const light = (p) => ["AH", "AX", "IH", "ER", "R", "H", "Y"].includes(p);
function similarity(a, b) {
  if (!a.length || !b.length) return 0;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = d[0][j - 1] + (light(b[j - 1]) ? 0.5 : 1);
  for (let i = 1; i <= a.length; i++) {
    d[i][0] = d[i - 1][0] + (light(a[i - 1]) ? 0.5 : 1);
    for (let j = 1; j <= b.length; j++) {
      const sub = a[i - 1] === b[j - 1] ? 0 : close(a[i - 1], b[j - 1]) ? 0.4 : 1;
      d[i][j] = Math.min(d[i - 1][j - 1] + sub, d[i - 1][j] + (light(a[i - 1]) ? 0.5 : 1), d[i][j - 1] + (light(b[j - 1]) ? 0.5 : 1));
    }
  }
  return 1 - d[a.length][b.length] / Math.max(a.length, b.length);
}

// A respelling from the IPA, syllable by syllable, in ordinary English spelling
const SPELL_MULTI = [["tʃ", "ch"], ["dʒ", "j"], ["eɪ", "ay"], ["aɪ", "eye"], ["ɑɪ", "eye"], ["ɔɪ", "oy"], ["aʊ", "ow"], ["oʊ", "oh"], ["əʊ", "oh"], ["ɪə", "eer"], ["eə", "air"], ["ɛə", "air"], ["ʊə", "oor"], ["ts", "ts"]];
const SPELL_V = { i: "ee", ɪ: "i", e: "eh", ɛ: "eh", æ: "a", a: "ah", ɑ: "ah", ɒ: "o", ɔ: "aw", o: "oh", ʊ: "oo", u: "oo", ʌ: "uh", ə: "uh", ɐ: "uh", ɜ: "er", ɝ: "er", ɚ: "er", ɨ: "i", y: "oo", ø: "er", œ: "er", ɯ: "oo" };
const SPELL_C = { p: "p", b: "b", t: "t", d: "d", k: "k", g: "g", ɡ: "g", f: "f", v: "v", θ: "th", ð: "th", s: "s", z: "z", ʃ: "sh", ʒ: "zh", h: "h", m: "m", n: "n", ŋ: "ng", l: "l", ɫ: "l", r: "r", ɹ: "r", ɾ: "r", ʁ: "r", ʀ: "r", ɻ: "r", j: "y", w: "w", x: "h", χ: "h", ç: "h", ɣ: "g", β: "b", ɲ: "ny", ʎ: "ly", c: "k", ɟ: "g", ʝ: "y", ɬ: "l" };
function ipaSyllables(ipa) {
  let s = String(ipa).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/eː/g, "eɪ").replace(/oː/g, "oʊ").replace(/[ː()\/\[\]]/g, "").toLowerCase();
  const units = []; // {t: spelling, v: isVowel} or {b: true} for a break
  while (s) {
    if (/^[ˈˌ.‿\s-]/.test(s)) { units.push({ b: true }); s = s.slice(1); continue; }
    const m = SPELL_MULTI.find(([k]) => s.startsWith(k));
    if (m) { units.push({ t: m[1], v: m[0] !== "tʃ" && m[0] !== "dʒ" && m[0] !== "ts" }); s = s.slice(m[0].length); continue; }
    if (SPELL_V[s[0]]) units.push({ t: SPELL_V[s[0]], v: true });
    else if (SPELL_C[s[0]]) units.push({ t: SPELL_C[s[0]], v: false });
    s = s.slice(1);
  }
  // Each syllable is one vowel with the consonant just before it; leftover consonants stay at the end
  const sylls = [];
  let cur = "", hasV = false;
  for (let k = 0; k < units.length; k++) {
    const u = units[k];
    if (u.b) { if (cur) { sylls.push(cur); cur = ""; hasV = false; } continue; }
    if (u.v) { if (hasV) { sylls.push(cur); cur = ""; } cur += u.t; hasV = true; continue; }
    const nextV = units.slice(k + 1).find((x) => !x.b);
    if (hasV && nextV && nextV.v) { sylls.push(cur); cur = u.t; hasV = false; } else cur += u.t;
  }
  if (cur) sylls.push(cur);
  return sylls;
}
// All ways of joining neighbouring syllables (up to 8 syllables)
function joins(tokens) {
  if (tokens.length > 8) return [tokens.join(" ")];
  const out = [];
  for (let mask = 0; mask < 1 << (tokens.length - 1); mask++) {
    let s = tokens[0];
    for (let k = 1; k < tokens.length; k++) s += (mask & (1 << (k - 1)) ? "" : " ") + tokens[k];
    out.push(s);
  }
  return out;
}
// Swaps for syllables the voice spells out as letters (measured with Microsoft David)
const SWAP = { luh: "lur", guh: "gur", buh: "bur", ba: "bah", na: "nah", sa: "sah", sta: "stah", le: "lur", oo: "ooh", et: "ett", ee: "ey", ga: "gah", da: "dah", ma: "mah", pa: "pah", va: "vah", za: "zah", ha: "hah", ra: "rah", wa: "wah", ja: "jah", ya: "yah" };
const swapTokens = (tokens) => tokens.map((t) => SWAP[t] || t);

module.exports = { dir, json, collect, speak, ipaToArpa, similarity, ipaSyllables, joins, swapTokens };
