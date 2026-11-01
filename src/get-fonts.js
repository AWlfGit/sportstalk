// Downloads the page's fonts (SIL Open Font License) for self-hosting:  node src/get-fonts.js
// Writes src/fonts/: woff2 files (latin + latin-ext), fonts.css and each family's licence.
const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "fonts");
const FAMILIES = [
  ["Barlow", "wght@400;500;600;700", "barlow", ["barlow"]],
  ["Big Shoulders Display", "wght@700;800;900", "big-shoulders-display", ["bigshouldersdisplay", "bigshoulders"]],
  ["Barlow Condensed", "ital,wght@0,500;0,600;0,700;1,600;1,700", "barlow-condensed", ["barlowcondensed"]],
];
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

(async () => {
  fs.mkdirSync(out, { recursive: true });
  let css = "/* Self-hosted fonts. SIL Open Font License 1.1, see the OFL-*.txt files. */\n";
  for (const [family, axis, slug, licenceDirs] of FAMILIES) {
    const url = "https://fonts.googleapis.com/css2?family=" + family.replace(/ /g, "+") + (axis ? ":" + axis : "") + "&display=swap";
    const text = await (await fetch(url, { headers: { "User-Agent": UA } })).text();
    const seen = new Map();
    for (const [, subset, body] of text.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)) {
      if (subset !== "latin" && subset !== "latin-ext") continue;
      const weight = /font-weight:\s*(\d+)/.exec(body)[1];
      const style = (/font-style:\s*(\w+)/.exec(body) || [, "normal"])[1];
      const src = /url\(([^)]+\.woff2)\)/.exec(body)[1];
      const range = /unicode-range:\s*([^;]+);/.exec(body)[1];
      let file = seen.get(src);
      if (!file) {
        file = `${slug}-${subset}-${weight}${style === "italic" ? "i" : ""}.woff2`;
        fs.writeFileSync(path.join(out, file), Buffer.from(await (await fetch(src)).arrayBuffer()));
        seen.set(src, file);
      }
      css += `@font-face{font-family:"${family}";font-style:${style};font-weight:${weight};font-display:swap;src:url(${file}) format("woff2");unicode-range:${range}}\n`;
    }
    let licence = null;
    for (const dir of licenceDirs) {
      const r = await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${dir}/OFL.txt`);
      if (r.ok) { licence = await r.text(); break; }
    }
    if (licence) fs.writeFileSync(path.join(out, `OFL-${slug}.txt`), licence);
    else console.warn("Licence not found for", family);
    console.log(family, "->", seen.size, "files");
  }
  fs.writeFileSync(path.join(out, "fonts.css"), css);
})();
