#!/usr/bin/env node
// Master rebuild script: fetches all live pages, processes them into offline HTML,
// downloads all images, and sets up the complete portal.
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.resolve(__dirname, "..");
const SITE = "https://kubota.escortskubota.com";
const CORPAPI = "https://corpapi.escortskubota.com";
const STATIC = "https://static.escortskubota.com";
const CONCURRENCY = 12;

// ============================================================
// 1. PAGE DEFINITIONS
// ============================================================
const pages = [
  { url: "/",                                  dest: "html/index.html" },
  { url: "/mu-series",                         dest: "html/mu-series.html" },
  { url: "/l-series",                          dest: "html/l-series.html" },
  { url: "/neostar-series",                    dest: "html/neostar-series.html" },
  { url: "/mu-series/mu4201-2wd",              dest: "html/mu-series__mu4201-2wd.html" },
  { url: "/mu-series/mu4201-4wd",              dest: "html/mu-series__mu4201-4wd.html" },
  { url: "/mu-series/mu4501-2wd",              dest: "html/mu-series__mu4501-2wd.html" },
  { url: "/mu-series/mu4501-4wd",              dest: "html/mu-series__mu4501-4wd.html" },
  { url: "/mu-series/mu4502-2wd",              dest: "html/mu-series__mu4502-2wd.html" },
  { url: "/mu-series/mu4502-4wd",              dest: "html/mu-series__mu4502-4wd.html" },
  { url: "/mu-series/mu5002-2wd",              dest: "html/mu-series__mu5002-2wd.html" },
  { url: "/mu-series/mu5002-4wd",              dest: "html/mu-series__mu5002-4wd.html" },
  { url: "/mu-series/mu5502-2wd",              dest: "html/mu-series__mu5502-2wd.html" },
  { url: "/mu-series/mu5502-4wd",              dest: "html/mu-series__mu5502-4wd.html" },
  { url: "/l-series/kubota-l3408",             dest: "html/l-series__kubota-l3408.html" },
  { url: "/l-series/kubota-l4508",             dest: "html/l-series__kubota-l4508.html" },
  { url: "/neostar-series/neostar-a211n",      dest: "html/neostar-series__neostar-a211n.html" },
  { url: "/neostar-series/neostar-a211n-op",   dest: "html/neostar-series__neostar-a211n-op.html" },
  { url: "/neostar-series/neostar-a211s",      dest: "html/neostar-series__neostar-a211s.html" },
  { url: "/neostar-series/neostar-b2441",      dest: "html/neostar-series__neostar-b2441.html" },
  { url: "/neostar-series/neostar-b2441n",     dest: "html/neostar-series__neostar-b2441n.html" },
  { url: "/neostar-series/neostar-b2441s-narrow", dest: "html/neostar-series__neostar-b2441s-narrow.html" },
  { url: "/neostar-series/neostar-b2741s",     dest: "html/neostar-series__neostar-b2741s.html" },
  { url: "/neostar-series/neostar-b2741s-narrow", dest: "html/neostar-series__neostar-b2741s-narrow.html" },
];

const urlToLocal = { "/": "index.html" };
for (const p of pages) {
  if (p.url !== "/") urlToLocal[p.url] = path.basename(p.dest);
}

// ============================================================
// 2. UTILITIES
// ============================================================
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 30000, headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const newUrl = res.headers.location.startsWith("http") ? res.headers.location : new URL(res.headers.location, url).href;
        return fetchUrl(newUrl).then(resolve).catch(reject);
      }
      let data = "";
      res.on("data", d => data += d);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function rewriteImgUrl(url) {
  if (!url) return url;
  let decoded = url;
  try { decoded = decodeURIComponent(url); } catch(e) {}
  const nextImgMatch = decoded.match(/\/_next\/image\?url=([^&]+)/);
  if (nextImgMatch) decoded = nextImgMatch[1];

  if (decoded.includes("corpapi.escortskubota.com")) {
    const m = decoded.match(/corpapi\.escortskubota\.com\/(.+)/);
    if (m) return "../" + m[1];
  }
  if (decoded.includes("static.escortskubota.com")) {
    const m = decoded.match(/static\.escortskubota\.com\/(.+)/);
    if (m) return "../images/static/" + m[1];
  }
  if (decoded.includes("kubota.escortskubota.com")) {
    const m = decoded.match(/kubota\.escortskubota\.com\/(.+)/);
    if (m) {
      const rest = m[1];
      if (rest.startsWith("images/")) return "../" + rest;
      if (rest.startsWith("icons/")) return "../images/" + rest;
      if (rest === "logo.png") return "../images/logo.png";
      if (rest === "favicon.ico") return "../images/favicon.ico";
      if (rest.startsWith("virtual-showroom/")) return "../images/" + rest;
      return "../" + rest;
    }
  }
  if (decoded.startsWith("/images/")) return ".." + decoded;
  if (decoded.startsWith("/icons/")) return "../images" + decoded;
  if (decoded.startsWith("/logo.png")) return "../images/logo.png";
  if (decoded.startsWith("/favicon.ico")) return "../images/favicon.ico";
  return url;
}

function rewriteLink(href) {
  if (!href || href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:") || href.startsWith("#")) return href;
  if (href.startsWith("/_next/") || href.startsWith("/static/")) return href;

  let clean = href.replace(/^\//, "");
  if (urlToLocal["/" + clean]) return urlToLocal["/" + clean];
  const base = clean.split("?")[0];
  if (urlToLocal["/" + base]) return urlToLocal["/" + base];
  if (urlToLocal["/" + href]) return urlToLocal["/" + href];

  // Hindi portal links -> English equivalent
  const hiMatch = href.match(/^\/hi\/(.+)$/);
  if (hiMatch) {
    const eng = "/" + hiMatch[1];
    if (urlToLocal[eng]) return urlToLocal[eng];
  }
  if (href === "/blogs" || href === "/hi") return "index.html";
  if (href === "/") return "index.html";
  return href;
}

// ============================================================
// 3. CSS
// ============================================================
const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:#1a1a1a;background:#fff;line-height:1.5}
img{max-width:100%;height:auto;display:block}
a{text-decoration:none;color:inherit}
header{background:#fff;padding:15px 20px;box-shadow:0 2px 8px rgba(0,0,0,.1);position:sticky;top:0;z-index:100}
header .px-4{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
header img[alt="logo"]{max-height:50px;width:auto}
header nav{display:flex;gap:20px;align-items:center;flex-wrap:wrap}
header nav a{font-size:14px;color:#333;font-weight:500;transition:color .2s}
header nav a:hover{color:#f26522}
.series-card{display:block;border-radius:12px;overflow:hidden;transition:transform .2s,box-shadow .2s}
.series-card:hover{transform:translateY(-4px);box-shadow:0 12px 30px rgba(0,0,0,.15)}
.product-card{border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;transition:all .3s;background:#fff}
.product-card:hover{border-color:#f26522;box-shadow:0 8px 25px rgba(242,101,34,.15);transform:translateY(-3px)}
.product-card img{width:100%;aspect-ratio:4/3;object-fit:contain;background:#f8f8f8}
button,.btn{background:#f26522;color:#fff;border:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:600;cursor:pointer;transition:background .2s,transform .1s}
button:hover,.btn:hover{background:#d85213;transform:translateY(-1px)}
.banner{width:100%;max-height:400px;object-fit:cover}
footer{background:#1a1a2e;color:#ccc;padding:40px 20px 20px;margin-top:40px}
footer a{color:#ccc}
footer a:hover{color:#f26522}
.spec-table{width:100%;border-collapse:collapse}
.spec-table td{padding:12px 16px;border-bottom:1px solid #eee}
.spec-table td:first-child{font-weight:600;color:#555;width:40%}
.feature-section{padding:40px 20px;max-width:1200px;margin:0 auto}
.feature-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}
.feature-item{text-align:center;padding:20px}
.feature-item img{max-width:80px;margin:0 auto 12px}
.grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px;padding:20px;max-width:1200px;margin:0 auto}
.container{max-width:1200px;margin:0 auto;padding:0 20px}
h1,h2,h3{line-height:1.3}
h1{font-size:2rem;margin:20px 0}
h2{font-size:1.5rem;margin:16px 0}
h3{font-size:1.2rem;margin:12px 0}
p{margin-bottom:12px}
.text-center{text-align:center}
`;

// ============================================================
// 4. PAGE PROCESSING
// ============================================================
function processPage(htmlSource, destPath) {
  let html = htmlSource;
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<link\s+rel="stylesheet"\s+href="[^"]*"[^>]*>/gi, "");
  html = html.replace(/<link\s+as="style"[^>]*>/gi, "");
  html = html.replace(/<link\s+rel="preload"[^>]*>/gi, "");
  html = html.replace(/<link\s+rel="prefetch"[^>]*>/gi, "");

  html = html.replace(/src="([^"]*)"/g, (m, url) => `src="${rewriteImgUrl(url)}"`);
  html = html.replace(/srcset="([^"]*)"/g, (m, srcset) => {
    return `srcset="${srcset.split(",").map(s => { const p = s.trim().split(/\s+/); return rewriteImgUrl(p[0]) + (p[1] ? " " + p[1] : ""); }).join(", ")}"`;
  });
  html = html.replace(/href="([^"]*)"/g, (m, href) => `href="${rewriteLink(href)}"`);

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let bodyContent = bodyMatch ? bodyMatch[1] : html;
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : "Kubota Agricultural Machinery India";

  const cleanHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="icon" href="../images/favicon.ico" type="image/x-icon">
  <style>${CSS}</style>
</head>
<body>
${bodyContent}
</body>
</html>`;

  fs.mkdirSync(path.dirname(path.join(ROOT, destPath)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, destPath), cleanHtml);
  return cleanHtml.length;
}

// ============================================================
// 5. IMAGE COLLECTION & DOWNLOAD
// ============================================================
function collectImagePaths() {
  const htmlDir = path.join(ROOT, "html");
  const files = fs.readdirSync(htmlDir).filter(f => f.endsWith(".html"));
  const imagePaths = new Set();
  for (const f of files) {
    const html = fs.readFileSync(path.join(htmlDir, f), "utf8");
    for (const m of html.matchAll(/src="(\.\.\/images\/[^"]+)"/g)) imagePaths.add(m[1].replace(/^\.\.\//, ""));
    for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
      for (const u of m[1].split(",")) {
        const p = u.trim().split(/\s+/)[0];
        if (p.startsWith("../images/")) imagePaths.add(p.replace(/^\.\.\//, ""));
      }
    }
    for (const m of html.matchAll(/url\(['"]?(\.\.\/images\/[^'")]+)['"]?\)/g)) imagePaths.add(m[1].replace(/^\.\.\//, ""));
  }
  return [...imagePaths].sort();
}

function originFor(localPath) {
  if (localPath.startsWith("images/kubota/") || localPath.startsWith("images/brochure/")) return CORPAPI + "/" + localPath;
  if (localPath.startsWith("images/static/")) return STATIC + "/" + localPath.replace("images/static/", "");
  if (localPath.startsWith("images/icons/")) return SITE + "/" + localPath.replace("images/", "");
  if (localPath === "images/logo.png") return SITE + "/logo.png";
  if (localPath === "images/favicon.ico") return SITE + "/favicon.ico";
  if (localPath.startsWith("images/virtual-showroom/")) return SITE + "/" + localPath.replace("images/", "");
  return SITE + "/" + localPath;
}

function downloadFile(localPath) {
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

// ============================================================
// 6. ROOT LANDING PAGE
// ============================================================
function createRootIndex() {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kubota Agricultural Machinery India - Offline Portal</title>
  <meta http-equiv="refresh" content="0;url=html/index.html">
  <link rel="icon" href="images/favicon.ico" type="image/x-icon">
  <style>
    :root{--primary:#f26522;--primary-dark:#d85213;--bg-gradient:radial-gradient(circle at 50% 0%,#1a233a 0%,#0b0f19 75%);--surface:rgba(255,255,255,.05);--surface-hover:rgba(255,255,255,.09);--border:rgba(255,255,255,.12);--text:#f3f4f6;--text-muted:#9ca3af}
    *{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
    body{background:var(--bg-gradient);background-color:#0b0f19;color:var(--text);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem 1rem;text-align:center}
    .container{background:var(--surface);border:1px solid var(--border);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-radius:1.5rem;padding:2.5rem 2rem;max-width:620px;width:100%;box-shadow:0 25px 50px -12px rgba(0,0,0,.6)}
    .logo-box{margin-bottom:1.25rem}.logo-box img{max-height:52px;width:auto;object-fit:contain;margin:0 auto}
    .status-badge{display:inline-flex;align-items:center;gap:.5rem;font-size:.85rem;color:#34d399;background:rgba(16,185,129,.12);padding:.35rem .9rem;border-radius:9999px;border:1px solid rgba(16,185,129,.25);margin-bottom:1.25rem;font-weight:500}
    .status-dot{width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 8px #10b981}
    h1{font-size:1.85rem;font-weight:700;margin-bottom:.75rem;color:#fff;letter-spacing:-.02em}
    p{color:var(--text-muted);font-size:.95rem;line-height:1.6;margin-bottom:1.75rem}
    .btn-group{display:grid;grid-template-columns:repeat(2,1fr);gap:.85rem;margin-bottom:1.5rem}
    .btn{display:inline-flex;align-items:center;justify-content:center;padding:.85rem 1.25rem;border-radius:.75rem;font-weight:600;font-size:.95rem;text-decoration:none;transition:all .2s ease;cursor:pointer}
    .btn-primary{background:var(--primary);color:#fff;grid-column:span 2;box-shadow:0 4px 14px rgba(242,101,34,.35)}
    .btn-primary:hover{background:var(--primary-dark);transform:translateY(-2px);box-shadow:0 6px 20px rgba(242,101,34,.5)}
    .btn-secondary{background:rgba(255,255,255,.06);color:var(--text);border:1px solid var(--border)}
    .btn-secondary:hover{background:var(--surface-hover);border-color:rgba(255,255,255,.25);transform:translateY(-1px)}
    .footer{margin-top:1.5rem;font-size:.8rem;color:var(--text-muted);border-top:1px solid rgba(255,255,255,.08);padding-top:1.25rem}
  </style>
  <script>window.location.href="html/index.html";</script>
</head>
<body>
  <main class="container">
    <div class="logo-box"><img src="images/logo.png" alt="Kubota Logo"></div>
    <div class="status-badge"><span class="status-dot"></span>100% Offline Mirror &amp; Portal Ready</div>
    <h1>Kubota Agricultural Machinery</h1>
    <p>Redirecting automatically to the home portal. If you are not redirected immediately, select an entry point below.</p>
    <nav class="btn-group">
      <a href="html/index.html" class="btn btn-primary">Launch Main Portal</a>
      <a href="html/mu-series.html" class="btn btn-secondary">MU Series Tractors</a>
      <a href="html/l-series.html" class="btn btn-secondary">L Series Tractors</a>
      <a href="html/neostar-series.html" class="btn btn-secondary">NeoStar Series</a>
    </nav>
    <footer class="footer">Escorts Kubota Limited &bull; Offline Edition</footer>
  </main>
</body>
</html>`;
  fs.writeFileSync(path.join(ROOT, "index.html"), html);
}

// ============================================================
// 7. PACKAGE.JSON
// ============================================================
function createPackageJson() {
  const pkg = {
    name: "kubota-offline-portal",
    version: "1.0.0",
    description: "Kubota Agricultural Machinery India - 100% Offline Website Mirror & Reconstruction",
    main: "index.html",
    scripts: {
      start: "npx serve .",
      dev: "npx serve .",
      preview: "npx http-server . -p 8080",
      build: "node scripts/rebuild-all.js"
    },
    keywords: ["kubota","offline-website","website-mirror","html5","digital-archive","offline-portal"],
    author: "Kubota Offline Portal Contributors",
    license: "MIT"
  };
  fs.writeFileSync(path.join(ROOT, "package.json"), JSON.stringify(pkg, null, 2));
}

// ============================================================
// 8. ADD MISSING NEOSTAR PRODUCT CARDS
// ============================================================
function addMissingNeostarCards() {
  const file = path.join(ROOT, "html", "neostar-series.html");
  let html = fs.readFileSync(file, "utf8");
  if (html.includes("neostar-series__neostar-a211n.html")) return; // already added

  const marker = "SUITABLE IMPLEMENTS";
  const idx = html.indexOf(marker);
  if (idx === -1) return;
  const insertPoint = html.lastIndexOf("<section", idx);

  const cards = `
<section class="sm:p-5 py-5" style="padding:20px;max-width:1200px;margin:0 auto;">
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;margin-top:24px;">
    <a href="neostar-series__neostar-a211n.html" style="display:block;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;transition:all .3s;background:#fff;" onmouseover="this.style.borderColor='#f26522';this.style.boxShadow='0 8px 25px rgba(242,101,34,.15)';this.style.transform='translateY(-3px)'" onmouseout="this.style.borderColor='#e5e5e5';this.style.boxShadow='none';this.style.transform='none'">
      <div style="text-align:center;padding:20px 20px 10px;"><h2 style="font-size:1.5rem;color:#FF7F3E;margin-bottom:8px;">KUBOTA A211N</h2><p style="color:#666;font-size:14px;">14.5 kW &bull; 21 HP &bull; 4WD</p></div>
      <div style="background:#f8f8f8;padding:20px;text-align:center;"><img src="../images/kubota/compact-series/A211N.jpg" alt="Kubota A211N" style="max-width:100%;max-height:200px;object-fit:contain;margin:0 auto;"></div>
      <div style="padding:12px 20px;text-align:center;color:#f26522;font-weight:600;font-size:14px;">Know more &#10095;</div>
    </a>
    <a href="neostar-series__neostar-a211n-op.html" style="display:block;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;transition:all .3s;background:#fff;" onmouseover="this.style.borderColor='#f26522';this.style.boxShadow='0 8px 25px rgba(242,101,34,.15)';this.style.transform='translateY(-3px)'" onmouseout="this.style.borderColor='#e5e5e5';this.style.boxShadow='none';this.style.transform='none'">
      <div style="text-align:center;padding:20px 20px 10px;"><h2 style="font-size:1.5rem;color:#FF7F3E;margin-bottom:8px;">KUBOTA A211N-OP</h2><p style="color:#666;font-size:14px;">14.5 kW &bull; 21 HP &bull; Orchard Specialist</p></div>
      <div style="background:#f8f8f8;padding:20px;text-align:center;"><img src="../images/kubota/compact-series/A211N-OP.jpg" alt="Kubota A211N-OP" style="max-width:100%;max-height:200px;object-fit:contain;margin:0 auto;"></div>
      <div style="padding:12px 20px;text-align:center;color:#f26522;font-weight:600;font-size:14px;">Know more &#10095;</div>
    </a>
    <a href="neostar-series__neostar-b2441.html" style="display:block;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;transition:all .3s;background:#fff;" onmouseover="this.style.borderColor='#f26522';this.style.boxShadow='0 8px 25px rgba(242,101,34,.15)';this.style.transform='translateY(-3px)'" onmouseout="this.style.borderColor='#e5e5e5';this.style.boxShadow='none';this.style.transform='none'">
      <div style="text-align:center;padding:20px 20px 10px;"><h2 style="font-size:1.5rem;color:#FF7F3E;margin-bottom:8px;">KUBOTA B2441</h2><p style="color:#666;font-size:14px;">16.3 kW &bull; 24 HP &bull; 4WD</p></div>
      <div style="background:#f8f8f8;padding:20px;text-align:center;"><img src="../images/kubota/compact-series/B-2441.jpg" alt="Kubota B2441" style="max-width:100%;max-height:200px;object-fit:contain;margin:0 auto;"></div>
      <div style="padding:12px 20px;text-align:center;color:#f26522;font-weight:600;font-size:14px;">Know more &#10095;</div>
    </a>
    <a href="neostar-series__neostar-b2441n.html" style="display:block;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;transition:all .3s;background:#fff;" onmouseover="this.style.borderColor='#f26522';this.style.boxShadow='0 8px 25px rgba(242,101,34,.15)';this.style.transform='translateY(-3px)'" onmouseout="this.style.borderColor='#e5e5e5';this.style.boxShadow='none';this.style.transform='none'">
      <div style="text-align:center;padding:20px 20px 10px;"><h2 style="font-size:1.5rem;color:#FF7F3E;margin-bottom:8px;">KUBOTA B2441N</h2><p style="color:#666;font-size:14px;">16.3 kW &bull; 24 HP &bull; 4WD</p></div>
      <div style="background:#f8f8f8;padding:20px;text-align:center;"><img src="../images/kubota/compact-series/B2441N.jpg" alt="Kubota B2441N" style="max-width:100%;max-height:200px;object-fit:contain;margin:0 auto;"></div>
      <div style="padding:12px 20px;text-align:center;color:#f26522;font-weight:600;font-size:14px;">Know more &#10095;</div>
    </a>
  </div>
</section>
`;
  html = html.slice(0, insertPoint) + cards + "\n" + html.slice(insertPoint);
  fs.writeFileSync(file, html);
}

// ============================================================
// 9. MAIN
// ============================================================
async function main() {
  console.log("=== Kubota Offline Portal Rebuild ===\n");

  // Phase 1: Create project structure
  console.log("Phase 1: Creating project structure...");
  fs.mkdirSync(path.join(ROOT, "html"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, "scripts"), { recursive: true });
  createPackageJson();
  createRootIndex();
  console.log("  Created package.json, index.html\n");

  // Phase 2: Fetch and process all pages
  console.log("Phase 2: Fetching and processing pages...");
  let okPages = 0;
  for (const page of pages) {
    try {
      const source = await fetchUrl(SITE + page.url);
      const size = processPage(source, page.dest);
      console.log(`  OK  ${page.dest}  (${(size/1024).toFixed(0)} KB)`);
      okPages++;
    } catch(e) {
      console.log(`  FAIL  ${page.dest}  (${e.message})`);
    }
  }
  console.log(`  ${okPages}/${pages.length} pages built.\n`);

  // Phase 3: Add missing NeoStar product cards
  console.log("Phase 3: Adding missing NeoStar product cards...");
  addMissingNeostarCards();
  console.log("  Done.\n");

  // Phase 4: Collect and download images
  console.log("Phase 4: Downloading images...");
  const imagePaths = collectImagePaths();
  console.log(`  Found ${imagePaths.length} unique image references.\n`);

  let okImg = 0, skipImg = 0, failImg = 0;
  const failed = [];
  let done = 0;
  let idx = 0;
  async function worker() {
    while (idx < imagePaths.length) {
      const i = idx++;
      const r = await downloadFile(imagePaths[i]);
      done++;
      if (r.status === "ok") okImg++;
      else if (r.status === "skip") skipImg++;
      else { failImg++; failed.push(r); }
      if (done % 25 === 0 || done === imagePaths.length) {
        process.stdout.write(`\r  Progress: ${done}/${imagePaths.length}  (ok=${okImg} skip=${skipImg} fail=${failImg})`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log("\n");
  if (failed.length > 0) {
    console.log("  Failed downloads:");
    for (const f of failed) console.log(`    - ${f.localPath}  (HTTP ${f.code})`);
  }

  // Phase 5: Verification
  console.log("\nPhase 5: Verification...");
  const htmlFiles = fs.readdirSync(path.join(ROOT, "html")).filter(f => f.endsWith(".html"));
  let brokenLinks = 0, totalLinks = 0, missingImgs = 0, totalImgs = 0;
  for (const f of htmlFiles) {
    const html = fs.readFileSync(path.join(ROOT, "html", f), "utf8");
    for (const m of html.matchAll(/href="([^"]+\.html)"/g)) {
      totalLinks++;
      if (!fs.existsSync(path.join(ROOT, "html", m[1]))) { brokenLinks++; console.log(`  BROKEN LINK: ${f} -> ${m[1]}`); }
    }
    for (const m of html.matchAll(/src="(\.\.\/images\/[^"]+)"/g)) {
      totalImgs++;
      if (!fs.existsSync(path.join(ROOT, m[1].replace(/^\.\.\//, "")))) { missingImgs++; console.log(`  MISSING IMG: ${f} -> ${m[1]}`); }
    }
  }
  const totalFiles = htmlFiles.length;
  const imageFiles = 0;
  const countImages = (() => { let n = 0; const walk = d => { for (const e of fs.readdirSync(d, {withFileTypes:true})) { if (e.isDirectory()) walk(path.join(d, e.name)); else n++; } }; walk(path.join(ROOT, "images")); return n; })();

  console.log(`\n=== RESULTS ===`);
  console.log(`Pages: ${totalFiles}`);
  console.log(`Links: ${totalLinks} total, ${brokenLinks} broken`);
  console.log(`Images refs: ${totalImgs} total, ${missingImgs} missing`);
  console.log(`Image files on disk: ${countImages}`);
  console.log(`Downloads: ok=${okImg} skip=${skipImg} fail=${failImg}`);
  console.log(`\nDone! Portal is ready.`);
}

main().catch(e => { console.error("Fatal error:", e); process.exit(1); });
