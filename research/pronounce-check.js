// Checks that the page's speech voices will say local words the local way.  Windows only:
//   node research/pronounce-check.js [filter]
// For every term, name and region word that has an IPA reference, it speaks the word (or its
// tts respelling, if it has one) with a Windows speech voice, records the sounds the voice makes,
// and compares them with the IPA. It lists:
//   FIX TTS   a respelling that still comes out wrong
//   NEEDS TTS a word with no respelling that the voice gets wrong
// The voices in browsers differ from Windows' own, so treat this as a strong hint, not proof:
// a respelling that passes here reads predictably as ordinary English.
// A filter (e.g. "nhl" or "regions/uk") limits the check to matching files.
const L = require("./pronounce-lib");
if (process.platform !== "win32") { console.error("This check needs Windows (it uses the Windows speech engine)."); process.exit(1); }
const only = process.argv[2] || "";
const items = L.collect(only);
if (!items.length) { console.log("Nothing to check: no entries with an ipa."); process.exit(0); }
const heard = L.speak(items.flatMap((x) => [x.word, x.tts]));
const PASS = 0.7;
const report = [];
let ok = 0;
for (const x of items) {
  const want = L.ipaToArpa(x.ipa), spoken = heard.get(x.tts || x.word) || [];
  const score = L.similarity(want, spoken);
  if (score >= PASS) { ok++; continue; }
  const plain = x.tts ? L.similarity(want, heard.get(x.word) || []) : score;
  report.push(`${x.tts ? "FIX TTS  " : "NEEDS TTS"} ${score.toFixed(2)}  ${x.word}${x.tts ? ' -> "' + x.tts + '"' : ""}  ipa /${x.ipa}/ = ${want.join(" ")}  voice says: ${spoken.join(" ")}${x.tts ? `  (plain word scores ${plain.toFixed(2)})` : ""}  [${x.where}]`);
}
console.log(`${items.length} words checked against their IPA: ${ok} sound right, ${report.length} to look at. Fix them with: node research/pronounce-fix.js --write`);
for (const r of report.sort()) console.log(r);
