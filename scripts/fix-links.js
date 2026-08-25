#!/usr/bin/env node
// Fixes remaining absolute links across all HTML pages
const fs = require("fs");
const path = require("path");
const dir = path.resolve(__dirname, "..", "html");
const files = fs.readdirSync(dir).filter(f => f.endsWith(".html"));
let total = 0;
for (const f of files) {
  const fp = path.join(dir, f);
  let html = fs.readFileSync(fp, "utf8");
  let changed = false;
  const replacements = [
    [/href="\/blogs"/g, 'href="index.html"'],
    [/href="\/hi"/g, 'href="index.html"'],
    [/href="\/hi\/mu-series"/g, 'href="mu-series.html"'],
    [/href="\/hi\/l-series"/g, 'href="l-series.html"'],
    [/href="\/hi\/neostar-series"/g, 'href="neostar-series.html"'],
    [/href="\/hi\/mu-series\/([^"]*)"/g, 'href="mu-series__$1.html"'],
    [/href="\/hi\/l-series\/([^"]*)"/g, 'href="l-series__$1.html"'],
    [/href="\/hi\/neostar-series\/([^"]*)"/g, 'href="neostar-series__$1.html"'],
    [/href="\/"/g, 'href="index.html"'],
  ];
  for (const [re, replacement] of replacements) {
    if (re.test(html)) { html = html.replace(re, replacement); changed = true; }
  }
  if (changed) { fs.writeFileSync(fp, html); total++; }
}
console.log(`Fixed links in ${total} files.`);
