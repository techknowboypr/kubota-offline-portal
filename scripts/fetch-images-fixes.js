#!/usr/bin/env node
// Second-pass downloader for the 26 images that failed the first pass.
// These need non-standard origin URLs or path remapping.
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.resolve(__dirname, "..");
const SITE = "https://kubota.escortskubota.com";
const CORPAPI = "https://corpapi.escortskubota.com";
const STATIC = "https://static.escortskubota.com";

// manifest path -> actual download URL
const fixes = [
  // Icons/logo/favicon served from site root, not /images/
  ["images/logo.png",                                              `${SITE}/logo.png`],
  ["images/favicon.ico",                                           `${SITE}/favicon.ico`],
  ["images/icons/menu-icon.png",                                   `${SITE}/icons/menu-icon.png`],
  ["images/icons/new-in-star.png",                                 `${SITE}/icons/new-in-star.png`],
  ["images/icons/social-icons/facebook.png",                       `${SITE}/icons/social-icons/facebook.png`],
  ["images/icons/social-icons/instagram.png",                      `${SITE}/icons/social-icons/instagram.png`],
  ["images/icons/social-icons/youtube.png",                        `${SITE}/icons/social-icons/youtube.png`],

  // IMG_7161 missing extension — it's a .webp
  ["images/kubota/feauture-banner/compact/product-image/A211N-OP/IMG_7161",
   `${CORPAPI}/images/kubota/feauture-banner/compact/product-image/A211N-OP/IMG_7161.webp`],

  // ekl-logo lives on static.escortskubota.com under /new/images/
  ["images/static/new/images/ekl-logo-1200-630.jpg",               `${STATIC}/new/images/ekl-logo-1200-630.jpg`],

  // Virtual-showroom assets served from site /virtual-showroom, not /images/virtual-showroom
  ["images/virtual-showroom/images/preview_nodeimage_node1.jpg",   `${SITE}/virtual-showroom/images/preview_nodeimage_node1.jpg`],
  ["images/virtual-showroom/images/preview_nodeimage_node2.jpg",   `${SITE}/virtual-showroom/images/preview_nodeimage_node2.jpg`],
  ["images/virtual-showroom/images/preview_nodeimage_node4.jpg",   `${SITE}/virtual-showroom/images/preview_nodeimage_node4.jpg`],
  ["images/virtual-showroom/images/preview_nodeimage_node6.jpg",   `${SITE}/virtual-showroom/images/preview_nodeimage_node6.jpg`],
  ["images/virtual-showroom/images/preview_nodeimage_node7.jpg",   `${SITE}/virtual-showroom/images/preview_nodeimage_node7.jpg`],
  ["images/virtual-showroom/images/preview_nodeimage_node8.jpg",   `${SITE}/virtual-showroom/images/preview_nodeimage_node8.jpg`],
  ["images/virtual-showroom/images/preview_nodeimage_node9.jpg",   `${SITE}/virtual-showroom/images/preview_nodeimage_node9.jpg`],
  ["images/virtual-showroom/images/preview_nodeimage_node12.jpg",  `${SITE}/virtual-showroom/images/preview_nodeimage_node12.jpg`],
  ["images/virtual-showroom/images/preview_nodeimage_node14.jpg",  `${SITE}/virtual-showroom/images/preview_nodeimage_node14.jpg`],
  ["images/virtual-showroom/images/preview_nodeimage_node15.jpg",  `${SITE}/virtual-showroom/images/preview_nodeimage_node15.jpg`],
  ["images/virtual-showroom/media/TVSS.png",                       `${SITE}/virtual-showroom/media/TVSS.png`],
  ["images/virtual-showroom/media/Showroom_animation.mp4",         `${SITE}/virtual-showroom/media/Showroom_animation.mp4`],
  ["images/virtual-showroom/pano2vr_player.js",                    `${SITE}/virtual-showroom/pano2vr_player.js`],
  ["images/virtual-showroom/skin.js",                              `${SITE}/virtual-showroom/skin.js`],
  ["images/virtual-showroom/webxr/three.min.js",                   `${SITE}/virtual-showroom/webxr/three.min.js`],
  ["images/virtual-showroom/webxr/webxr-polyfill.min.js",          `${SITE}/virtual-showroom/webxr/webxr-polyfill.min.js`],

  // A211S_new.pdf — not found on corpapi; B2441S-A221S.pdf is the combined brochure that covers A211S
  ["images/brochure/kubota/A211S_new.pdf",                         `${CORPAPI}/images/brochure/kubota/B2441S-A221S.pdf`],
];

function download(destPath, url) {
  const dest = path.join(ROOT, destPath);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return Promise.resolve({ destPath, status: "skip" });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  return new Promise((resolve) => {
    let attempts = 0;
    function tryFetch() {
      attempts++;
      const file = fs.createWriteStream(dest);
      const req = https.get(url, { timeout: 60000 }, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          fs.existsSync(dest) && fs.unlinkSync(dest);
          if (attempts < 3) return setTimeout(tryFetch, 500);
          return resolve({ destPath, status: "fail", code: res.statusCode, url });
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          if (fs.statSync(dest).size > 0) resolve({ destPath, status: "ok" });
          else if (attempts < 3) { fs.unlinkSync(dest); setTimeout(tryFetch, 500); }
          else resolve({ destPath, status: "fail", code: "empty", url });
        });
      });
      req.on("error", () => {
        fs.existsSync(dest) && fs.unlinkSync(dest);
        if (attempts < 3) return setTimeout(tryFetch, 500);
        resolve({ destPath, status: "fail", code: "err", url });
      });
      req.on("timeout", () => { req.destroy(); });
    }
    tryFetch();
  });
}

async function main() {
  console.log(`Second-pass: ${fixes.length} special-case downloads...`);
  let ok = 0, skip = 0, fail = 0;
  const failed = [];

  // Run with limited concurrency (mp4 is large)
  const CONC = 6;
  let idx = 0;
  async function worker() {
    while (idx < fixes.length) {
      const i = idx++;
      const [destPath, url] = fixes[i];
      const r = await download(destPath, url);
      if (r.status === "ok") ok++;
      else if (r.status === "skip") skip++;
      else { fail++; failed.push(r); }
      console.log(`  ${r.status.padEnd(4)}  ${destPath}`);
    }
  }
  await Promise.all(Array.from({ length: CONC }, () => worker()));

  console.log(`\nSummary: ok=${ok}  skip=${skip}  fail=${fail}  total=${fixes.length}`);
  if (failed.length > 0) {
    console.log("\nStill failed:");
    for (const f of failed) console.log(`  - ${f.destPath}  (HTTP ${f.code})`);
  }
}

main();
