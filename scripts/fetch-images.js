#!/usr/bin/env node
// Downloads all images listed in _logs/manifest.json that are missing from disk.
// Origin chosen by path prefix:
//   images/kubota/*  and  images/brochure/*  -> https://corpapi.escortskubota.com/
//   everything else                          -> https://kubota.escortskubota.com/
// Runs with concurrency 12 for speed.
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.resolve(__dirname, "..");
const CORPAPI = "https://corpapi.escortskubota.com";
const SITE = "https://kubota.escortskubota.com";
const CONCURRENCY = 12;

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "_logs/manifest.json"), "utf8"));
const paths = manifest.images || [];
const total = paths.length;

function originFor(p) {
  if (p.startsWith("images/kubota/") || p.startsWith("images/brochure/")) return CORPAPI;
  return SITE;
}

function download(p) {
  const dest = path.join(ROOT, p);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return Promise.resolve({ p, status: "skip" });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const url = originFor(p) + "/" + p;

  return new Promise((resolve) => {
    let attempts = 0;
    function tryFetch() {
      attempts++;
      const file = fs.createWriteStream(dest);
      const req = https.get(url, { timeout: 30000 }, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          fs.existsSync(dest) && fs.unlinkSync(dest);
          if (attempts < 3) return setTimeout(tryFetch, 500);
          return resolve({ p, status: "fail", code: res.statusCode, origin: originFor(p) });
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          if (fs.statSync(dest).size > 0) resolve({ p, status: "ok" });
          else if (attempts < 3) { fs.unlinkSync(dest); setTimeout(tryFetch, 500); }
          else resolve({ p, status: "fail", code: "empty", origin: originFor(p) });
        });
      });
      req.on("error", () => {
        fs.existsSync(dest) && fs.unlinkSync(dest);
        if (attempts < 3) return setTimeout(tryFetch, 500);
        resolve({ p, status: "fail", code: "err", origin: originFor(p) });
      });
      req.on("timeout", () => { req.destroy(); });
    }
    tryFetch();
  });
}

async function main() {
  console.log(`Manifest lists ${total} image entries. Downloading with concurrency ${CONCURRENCY}...`);
  let ok = 0, skip = 0, fail = 0;
  const failed = [];
  let done = 0;

  // Simple concurrency pool
  let idx = 0;
  async function worker() {
    while (idx < paths.length) {
      const i = idx++;
      const r = await download(paths[i]);
      done++;
      if (r.status === "ok") ok++;
      else if (r.status === "skip") skip++;
      else { fail++; failed.push(r); }
      if (done % 25 === 0 || done === total) {
        process.stdout.write(`\r  Progress: ${done}/${total}  (ok=${ok} skip=${skip} fail=${fail})`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  console.log("\n");
  console.log(`Summary: ok=${ok}  skipped(already present)=${skip}  failed=${fail}  total=${total}`);
  if (failed.length > 0) {
    console.log("\nFailed downloads:");
    for (const f of failed) console.log(`  - ${f.p}  (HTTP ${f.code}, ${f.origin})`);
  }
}

main();
