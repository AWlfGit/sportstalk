// Puts the sportstalk/ folder into the c0rw1n.com SITE.zip, replacing any older copy of it.
//   node src/pack-site.js "<site folder>"
// <site folder> is the c0rw1n.com site root, the folder that holds SITE.zip and sportstalk/
// (on the main computer: Dropbox/C01InnovativeWebsite). Every other entry in the zip is copied
// across byte for byte. The old zip is backed up to your temp folder first, and the new one is
// checked (every entry decompressed and its checksum compared) before it replaces the old one.
// No dependencies: plain Node 18 or later.
const fs = require("fs");
const os = require("os");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(process.argv[2] || "");
const zipPath = path.join(root, "SITE.zip");
const folder = "sportstalk";
if (!process.argv[2] || !fs.existsSync(zipPath) || !fs.existsSync(path.join(root, folder, "index.html"))) {
  console.error('Usage: node src/pack-site.js "<site folder>"  (the folder holding SITE.zip and sportstalk/index.html)');
  process.exit(1);
}

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const dosTime = (d) => ({ time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() });

// Read the central directory of an existing zip (no ZIP64; SITE.zip is far below 4 GB)
function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("Not a zip file: " + zipPath);
  const count = buf.readUInt16LE(eocd + 10), cdOffset = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let i = 0, p = cdOffset; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("Damaged zip directory");
    const e = {
      made: buf.readUInt16LE(p + 4), need: buf.readUInt16LE(p + 6), flags: buf.readUInt16LE(p + 8), method: buf.readUInt16LE(p + 10),
      time: buf.readUInt16LE(p + 12), date: buf.readUInt16LE(p + 14), crc: buf.readUInt32LE(p + 16),
      csize: buf.readUInt32LE(p + 20), size: buf.readUInt32LE(p + 24), attr: buf.readUInt32LE(p + 38), local: buf.readUInt32LE(p + 42),
    };
    const n = buf.readUInt16LE(p + 28), x = buf.readUInt16LE(p + 30), c = buf.readUInt16LE(p + 32);
    e.name = buf.slice(p + 46, p + 46 + n).toString(e.flags & 0x800 ? "utf8" : "latin1");
    if (e.csize === 0xffffffff || e.local === 0xffffffff) throw new Error("ZIP64 zips aren't supported");
    const ln = buf.readUInt16LE(e.local + 26), lx = buf.readUInt16LE(e.local + 28);
    e.data = buf.slice(e.local + 30 + ln + lx, e.local + 30 + ln + lx + e.csize);
    entries.push(e);
    p += 46 + n + x + c;
  }
  return entries;
}

function writeZip(entries) {
  const parts = [], dir = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, "utf8"), flags = (e.flags & ~0x8) | 0x800;
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(e.need || 20, 4); h.writeUInt16LE(flags, 6); h.writeUInt16LE(e.method, 8);
    h.writeUInt16LE(e.time, 10); h.writeUInt16LE(e.date, 12); h.writeUInt32LE(e.crc, 14); h.writeUInt32LE(e.data.length, 18);
    h.writeUInt32LE(e.size, 22); h.writeUInt16LE(name.length, 26); h.writeUInt16LE(0, 28);
    parts.push(h, name, e.data);
    const d = Buffer.alloc(46);
    d.writeUInt32LE(0x02014b50, 0); d.writeUInt16LE(e.made || 20, 4); d.writeUInt16LE(e.need || 20, 6); d.writeUInt16LE(flags, 8);
    d.writeUInt16LE(e.method, 10); d.writeUInt16LE(e.time, 12); d.writeUInt16LE(e.date, 14); d.writeUInt32LE(e.crc, 16);
    d.writeUInt32LE(e.data.length, 20); d.writeUInt32LE(e.size, 24); d.writeUInt16LE(name.length, 28);
    d.writeUInt32LE(e.attr || 0, 38); d.writeUInt32LE(offset, 42);
    dir.push(d, name);
    offset += 30 + name.length + e.data.length;
  }
  const cd = Buffer.concat(dir), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cd, end]);
}

function filesIn(dir, base) {
  const out = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const p = path.join(dir, f.name), rel = base + "/" + f.name;
    if (f.isDirectory()) out.push(...filesIn(p, rel));
    else if (f.isFile()) out.push([p, rel]);
  }
  return out;
}

const old = fs.readFileSync(zipPath);
const kept = readZip(old).filter((e) => !e.name.startsWith(folder + "/"));
const added = filesIn(path.join(root, folder), folder).map(([p, name]) => {
  const raw = fs.readFileSync(p), packed = zlib.deflateRawSync(raw, { level: 9 }), stored = packed.length >= raw.length;
  const t = dosTime(fs.statSync(p).mtime);
  return { name, method: stored ? 0 : 8, flags: 0, need: 20, made: 20, time: t.time, date: t.date, crc: crc32(raw), size: raw.length, data: stored ? raw : packed, attr: 0 };
});
const next = writeZip(kept.concat(added));

// Check every entry before replacing the zip
for (const e of readZip(next)) {
  const raw = e.method === 8 ? zlib.inflateRawSync(e.data) : e.method === 0 ? e.data : null;
  if (!raw || raw.length !== e.size || crc32(raw) !== e.crc) throw new Error("Check failed for " + e.name + "; SITE.zip was not changed");
}

const backup = path.join(os.tmpdir(), "SITE-" + new Date().toISOString().replace(/[:.]/g, "-") + ".zip");
fs.writeFileSync(backup, old);
fs.writeFileSync(zipPath + ".new", next);
fs.renameSync(zipPath + ".new", zipPath);
console.log("SITE.zip updated:", kept.length, "site files kept,", added.length, folder + "/ files added,", (next.length / 1048576).toFixed(1), "MB");
console.log("Previous zip backed up to", backup);
