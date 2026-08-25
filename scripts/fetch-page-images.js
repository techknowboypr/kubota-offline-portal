#!/usr/bin/env node
// Collects all image paths referenced by the HTML pages,
// determines the correct origin URL, and downloads missing files.
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.resolve(__dirname, "..");
const SITE = "https://kubota.escortskubota.com";
const CORPAPI = "https://corpapi.escortskubota.com";
const STATIC = "https://static.escortskubota.com";
const CONCURRENCY = 12;

// Collect all image paths from HTML files
const htmlDir = path.join(ROOT, "html");
const htmlFiles = fs.readdirSync(htmlDir).filter(f => f.endsWith(".html"));
const imagePaths = new Set();

for (const f of htmlFiles) {
  const html = fs.readFileSync(path.join(htmlDir, f), "utf8");
  // Match src="../images/..." patterns
  const srcs = html.matchAll(/src="(\.\.\/images\/[^"]+)"/g);
  for (const m of srcs) {
    // Remove the ../ prefix to get the local path
    imagePaths.add(m[1].replace(/^\.\.\//, ""));
  }
  // Also match srcset paths
  const srcsets = html.matchAll(/srcset="([^"]+)"/g);
  for (const m of srcsets) {
    const urls = m[1].split(",").map(s => s.trim().split(/\s+/)[0]);
    for (const u of urls) {
      if (u.startsWith("../images/")) {
        imagePaths.add(u.replace(/^\.\.\//, ""));
      }
    }
  }
}

// Also add paths from CSS background-image url() references
for (const f of htmlFiles) {
  const html = fs.readFileSync(path.join(htmlDir, f), "utf8");
  const bgImgs = html.matchAll(/url\(['"]?(\.\.\/images\/[^'")]+)['"]?\)/g);
  for (const m of bgImgs) {
    imagePaths.add(m[1].replace(/^\.\.\//, ""));
  }
}

// Determine origin URL for a local path
function originFor(localPath) {
  if (localPath.startsWith("images/kubota/") || localPath.startsWith("images/brochure/")) {
    return CORPAPI + "/" + localPath;
  }
  if (localPath.startsWith("images/static/")) {
    // images/static/new/images/... -> static.escortskubota.com/new/images/...
    return STATIC + "/" + localPath.replace("images/static/", "");
  }
  if (localPath.startsWith("images/icons/")) {
    // images/icons/menu-icon.png -> site/icons/menu-icon.png
    return SITE + "/" + localPath.replace("images/", "");
  }
  if (localPath === "images/logo.png") return SITE + "/logo.png";
  if (localPath === "images/favicon.ico") return SITE + "/favicon.ico";
  if (localPath.startsWith("images/virtual-showroom/")) {
    return SITE + "/" + localPath.replace("images/", "");
  }
  // Default: site/images/...
  return SITE + "/" + localPath;
}

function download(localPath) {
  const dest = path.join(ROOT, localPath);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return Promise.resolve({ localPath, status: "skip" });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const url = originFor(localPath);

  return new Promise((resolve) => {
    let attempts = 0;
    function tryFetch() {
      attempts++;
      const file = fs.createWriteStream(dest);
      const req = https.get(url, { timeout: 30000 }, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
          if (attempts < 3) return setTimeout(tryFetch, 500);
          return resolve({ localPath, status: "fail", code: res.statusCode, url });
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          if (fs.statSync(dest).size > 0) resolve({ localPath, status: "ok" });
          else if (attempts < 3) { fs.unlinkSync(dest); setTimeout(tryFetch, 500); }
          else resolve({ localPath, status: "fail", code: "empty", url });
        });
      });
      req.on("error", () => {
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        if (attempts < 3) return setTimeout(tryFetch, 500);
        resolve({ localPath, status: "fail", code: "err", url });
      });
      req.on("timeout", () => { req.destroy(); });
    }
    tryFetch();
  });
}

async function main() {
  const paths = [...imagePaths].sort();
  console.log(`Found ${paths.length} unique image references in HTML pages.\n`);

  // Show what we found
  for (const p of paths.slice(0, 10)) console.log(`  ${p}  ->  ${originFor(p)}`);
  if (paths.length > 10) console.log(`  ... and ${paths.length - 10} more\n`);

  let ok = 0, skip = 0, fail = 0;
  const failed = [];
  let done = 0;

  let idx = 0;
  async function worker() {
    while (idx < paths.length) {
      const i = idx++;
      const r = await download(paths[i]);
      done++;
      if (r.status === "ok") ok++;
      else if (r.status === "skip") skip++;
      else { fail++; failed.push(r); }
      if (done % 25 === 0 || done === paths.length) {
        process.stdout.write(`\r  Progress: ${done}/${paths.length}  (ok=${ok} skip=${skip} fail=${fail})`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  console.log("\n");
  console.log(`Summary: ok=${ok}  skipped(already present)=${skip}  failed=${fail}  total=${paths.length}`);
  if (failed.length > 0) {
    console.log("\nFailed downloads:");
    for (const f of failed) console.log(`  - ${f.localPath}  (HTTP ${f.code})`);
    console.log(`  URL: ${f.url}`);
  }
}

main();
