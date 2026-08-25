#!/usr/bin/env node
// Rebuilds the Kubota offline portal from fetched live HTML pages.
// Processes each page: extracts body content, rewrites image URLs to local paths,
// fixes internal links to relative .html files, wraps in self-contained HTML.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE = "https://kubota.escortskubota.com";
const CORPAPI = "https://corpapi.escortskubota.com";
const STATIC = "https://static.escortskubota.com";

// Page mapping: source URL -> local file path
const pages = [
  { url: "/",                        dest: "html/index.html" },
  { url: "/mu-series",               dest: "html/mu-series.html" },
  { url: "/l-series",                dest: "html/l-series.html" },
  { url: "/neostar-series",          dest: "html/neostar-series.html" },
  // MU series products
  { url: "/mu-series/mu4201-2wd",    dest: "html/mu-series__mu4201-2wd.html" },
  { url: "/mu-series/mu4201-4wd",    dest: "html/mu-series__mu4201-4wd.html" },
  { url: "/mu-series/mu4501-2wd",    dest: "html/mu-series__mu4501-2wd.html" },
  { url: "/mu-series/mu4501-4wd",    dest: "html/mu-series__mu4501-4wd.html" },
  { url: "/mu-series/mu4502-2wd",    dest: "html/mu-series__mu4502-2wd.html" },
  { url: "/mu-series/mu4502-4wd",    dest: "html/mu-series__mu4502-4wd.html" },
  { url: "/mu-series/mu5002-2wd",    dest: "html/mu-series__mu5002-2wd.html" },
  { url: "/mu-series/mu5002-4wd",    dest: "html/mu-series__mu5002-4wd.html" },
  { url: "/mu-series/mu5502-2wd",    dest: "html/mu-series__mu5502-2wd.html" },
  { url: "/mu-series/mu5502-4wd",    dest: "html/mu-series__mu5502-4wd.html" },
  // L series products
  { url: "/l-series/kubota-l3408",   dest: "html/l-series__kubota-l3408.html" },
  { url: "/l-series/kubota-l4508",   dest: "html/l-series__kubota-l4508.html" },
  // NeoStar products
  { url: "/neostar-series/neostar-a211n",       dest: "html/neostar-series__neostar-a211n.html" },
  { url: "/neostar-series/neostar-a211n-op",    dest: "html/neostar-series__neostar-a211n-op.html" },
  { url: "/neostar-series/neostar-a211s",       dest: "html/neostar-series__neostar-a211s.html" },
  { url: "/neostar-series/neostar-b2441",       dest: "html/neostar-series__neostar-b2441.html" },
  { url: "/neostar-series/neostar-b2441n",      dest: "html/neostar-series__neostar-b2441n.html" },
  { url: "/neostar-series/neostar-b2441s-narrow", dest: "html/neostar-series__neostar-b2441s-narrow.html" },
  { url: "/neostar-series/neostar-b2741s",      dest: "html/neostar-series__neostar-b2741s.html" },
  { url: "/neostar-series/neostar-b2741s-narrow", dest: "html/neostar-series__neostar-b2741s-narrow.html" },
];

// Map URL path to local HTML file for link rewriting
const urlToLocal = {
  "/":               "index.html",
  "/mu-series":      "mu-series.html",
  "/l-series":       "l-series.html",
  "/neostar-series": "neostar-series.html",
};
// Add product pages
for (const p of pages) {
  if (p.url !== "/" && !urlToLocal[p.url]) {
    // /mu-series/mu4201-2wd -> mu-series__mu4201-2wd.html (relative from html/)
    const local = path.basename(p.dest);
    urlToLocal[p.url] = local;
  }
}

// Rewrite a single image URL to a local path
function rewriteImgUrl(url) {
  if (!url) return url;
  // Decode URL-encoded paths from _next/image optimizer
  let decoded = url;
  try { decoded = decodeURIComponent(url); } catch(e) {}

  // Handle _next/image?url=...&w=...&q=... pattern
  const nextImgMatch = decoded.match(/\/_next\/image\?url=([^&]+)/);
  if (nextImgMatch) {
    decoded = nextImgMatch[1];
  }

  // Now map to local path
  // corpapi images: https://corpapi.escortskubota.com/images/kubota/... -> images/kubota/...
  // site images: https://kubota.escortskubota.com/images/... -> images/...
  //               https://kubota.escortskubota.com/logo.png -> images/logo.png
  //               https://kubota.escortskubota.com/icons/... -> images/icons/...
  //               https://kubota.escortskubota.com/favicon.ico -> images/favicon.ico
  // static: https://static.escortskubota.com/new/images/... -> images/static/new/images/...

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
      // logo.png, favicon.ico, icons/... -> images/...
      if (rest.startsWith("images/")) return "../" + rest;
      if (rest.startsWith("icons/")) return "../images/" + rest;
      if (rest === "logo.png") return "../images/logo.png";
      if (rest === "favicon.ico") return "../images/favicon.ico";
      return "../" + rest;
    }
  }
  // Already relative paths like /images/... or /icons/...
  if (decoded.startsWith("/images/")) return ".." + decoded;
  if (decoded.startsWith("/icons/")) return "../images" + decoded;
  if (decoded.startsWith("/logo.png")) return "../images/logo.png";
  if (decoded.startsWith("/favicon.ico")) return "../images/favicon.ico";

  return url; // fallback: leave as-is
}

// Rewrite internal navigation links to local HTML files
function rewriteLink(href) {
  if (!href) return href;
  // Remove leading slash for matching
  let clean = href.replace(/^\//, "");

  // Direct match
  if (urlToLocal["/" + clean]) return urlToLocal["/" + clean];
  // Try matching without query params
  const base = clean.split("?")[0];
  if (urlToLocal["/" + base]) return urlToLocal["/" + base];

  // Handle relative links like "mu-series/mu4201-2wd" (no leading slash)
  if (urlToLocal["/" + href]) return urlToLocal["/" + href];

  // External links - leave as-is
  if (href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:")) return href;
  if (href.startsWith("#")) return href;

  return href;
}

// Determine the depth for relative path calculation
// html/index.html -> depth 1 (../images/...)
// html/mu-series__mu4201-2wd.html -> depth 1 (../images/...)
// All our HTML files are in html/ so images are at ../images/

function processPage(htmlSource, destPath) {
  let html = htmlSource;

  // Remove all <script> tags
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "");

  // Remove <link> tags for Next.js CSS/chunks (we'll use our own CSS)
  html = html.replace(/<link\s+rel="stylesheet"\s+href="[^"]*"[^>]*>/gi, "");
  html = html.replace(/<link\s+as="style"[^>]*>/gi, "");
  html = html.replace(/<link\s+rel="preload"[^>]*>/gi, "");
  html = html.replace(/<link\s+rel="prefetch"[^>]*>/gi, "");

  // Rewrite _next/image optimized URLs in src attributes
  html = html.replace(/src="([^"]*)"/g, (match, url) => {
    const local = rewriteImgUrl(url);
    return `src="${local}"`;
  });
  // Also in srcset
  html = html.replace(/srcset="([^"]*)"/g, (match, srcset) => {
    const rewritten = srcset.split(",").map(s => {
      const parts = s.trim().split(/\s+/);
      const local = rewriteImgUrl(parts[0]);
      return local + (parts[1] ? " " + parts[1] : "");
    }).join(", ");
    return `srcset="${rewritten}"`;
  });

  // Rewrite internal links
  html = html.replace(/href="([^"]*)"/g, (match, href) => {
    // Skip external, tel, mailto, anchors
    if (href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:") || href.startsWith("#")) {
      return match;
    }
    // Skip _next/static assets
    if (href.startsWith("/_next/") || href.startsWith("/static/")) {
      return match;
    }
    const local = rewriteLink(href);
    return `href="${local}"`;
  });

  // Extract the body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let bodyContent = bodyMatch ? bodyMatch[1] : html;

  // Extract title
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : "Kubota Agricultural Machinery India";

  // Build clean self-contained HTML
  const cleanHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="icon" href="../images/favicon.ico" type="image/x-icon">
  <style>
${CSS}
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;

  fs.mkdirSync(path.dirname(path.join(ROOT, destPath)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, destPath), cleanHtml);
  return cleanHtml.length;
}

const CSS = `
/* Base reset and typography */
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #1a1a1a; background: #fff; line-height: 1.5;
}
img { max-width: 100%; height: auto; display: block; }
a { text-decoration: none; color: inherit; }

/* Header */
header { background: #fff; padding: 15px 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 100; }
header .px-4 { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
header img[alt="logo"] { max-height: 50px; width: auto; }
header .flex { display: flex; align-items: center; gap: 20px; }
header nav { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
header nav a { font-size: 14px; color: #333; font-weight: 500; transition: color 0.2s; }
header nav a:hover { color: #f26522; }
header .text-\\[\\#000\\] { color: #000; }

/* Series navigation cards on home */
.series-card { display: block; border-radius: 12px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; }
.series-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.15); }

/* Product cards */
.product-card { border: 1px solid #e5e5e5; border-radius: 12px; overflow: hidden; transition: all 0.3s; background: #fff; }
.product-card:hover { border-color: #f26522; box-shadow: 0 8px 25px rgba(242,101,34,0.15); transform: translateY(-3px); }
.product-card img { width: 100%; aspect-ratio: 4/3; object-fit: contain; background: #f8f8f8; }

/* Buttons */
button, .btn { background: #f26522; color: #fff; border: none; padding: 12px 28px; border-radius: 6px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.2s, transform 0.1s; }
button:hover, .btn:hover { background: #d85213; transform: translateY(-1px); }

/* Banners */
.banner { width: 100%; max-height: 400px; object-fit: cover; }

/* Footer */
footer { background: #1a1a2e; color: #ccc; padding: 40px 20px 20px; margin-top: 40px; }
footer a { color: #ccc; }
footer a:hover { color: #f26522; }
footer .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 30px; }

/* Spec tables */
.spec-table { width: 100%; border-collapse: collapse; }
.spec-table td { padding: 12px 16px; border-bottom: 1px solid #eee; }
.spec-table td:first-child { font-weight: 600; color: #555; width: 40%; }

/* Feature sections */
.feature-section { padding: 40px 20px; max-width: 1200px; margin: 0 auto; }
.feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
.feature-item { text-align: center; padding: 20px; }
.feature-item img { max-width: 80px; margin: 0 auto 12px; }

/* Responsive grid */
.grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; padding: 20px; max-width: 1200px; margin: 0 auto; }
.grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 24px; padding: 20px; max-width: 1000px; margin: 0 auto; }

/* Container */
.container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }

/* Section headings */
h1, h2, h3 { line-height: 1.3; }
h1 { font-size: 2rem; margin: 20px 0; }
h2 { font-size: 1.5rem; margin: 16px 0; }
h3 { font-size: 1.2rem; margin: 12px 0; }
p { margin-bottom: 12px; }

/* Kubota orange accent */
.text-orange { color: #f26522; }
.bg-orange { background: #f26522; }

/* Utility */
.text-center { text-align: center; }
.mt-4 { margin-top: 16px; }
.mb-4 { margin-bottom: 16px; }
.px-4 { padding-left: 16px; padding-right: 16px; }
.py-8 { padding-top: 32px; padding-bottom: 32px; }
.hidden { display: none; }
`;

// Main execution
async function main() {
  console.log("Rebuilding Kubota offline portal...\n");

  // We already have the live pages fetched in /tmp/
  const tmpMap = {
    "/": "/tmp/live-home.html",
    "/mu-series": "/tmp/mu-series.html",
    "/l-series": "/tmp/l-series.html",
    "/neostar-series": "/tmp/neostar-series.html",
  };
  // Product pages
  const products = {
    "/mu-series/mu4201-2wd": "/tmp/mu-mu4201-2wd.html",
    "/mu-series/mu4201-4wd": "/tmp/mu-mu4201-4wd.html",
    "/mu-series/mu4501-2wd": "/tmp/mu-mu4501-2wd.html",
    "/mu-series/mu4501-4wd": "/tmp/mu-mu4501-4wd.html",
    "/mu-series/mu4502-2wd": "/tmp/mu-mu4502-2wd.html",
    "/mu-series/mu4502-4wd": "/tmp/mu-mu4502-4wd.html",
    "/mu-series/mu5002-2wd": "/tmp/mu-mu5002-2wd.html",
    "/mu-series/mu5002-4wd": "/tmp/mu-mu5002-4wd.html",
    "/mu-series/mu5502-2wd": "/tmp/mu-mu5502-2wd.html",
    "/mu-series/mu5502-4wd": "/tmp/mu-mu5502-4wd.html",
    "/l-series/kubota-l3408": "/tmp/l-kubota-l3408.html",
    "/l-series/kubota-l4508": "/tmp/l-kubota-l4508.html",
    "/neostar-series/neostar-a211n": "/tmp/neo-neostar-a211n.html",
    "/neostar-series/neostar-a211n-op": "/tmp/neo-neostar-a211n-op.html",
    "/neostar-series/neostar-a211s": "/tmp/neo-neostar-a211s.html",
    "/neostar-series/neostar-b2441": "/tmp/neo-neostar-b2441.html",
    "/neostar-series/neostar-b2441n": "/tmp/neo-neostar-b2441n.html",
    "/neostar-series/neostar-b2441s-narrow": "/tmp/neo-neostar-b2441s-narrow.html",
    "/neostar-series/neostar-b2741s": "/tmp/neo-neostar-b2741s.html",
    "/neostar-series/neostar-b2741s-narrow": "/tmp/neo-neostar-b2741s-narrow.html",
  };
  Object.assign(tmpMap, products);

  let ok = 0, fail = 0;
  for (const page of pages) {
    const srcFile = tmpMap[page.url];
    if (!srcFile || !fs.existsSync(srcFile)) {
      console.log(`  FAIL  ${page.dest}  (source not found: ${srcFile})`);
      fail++;
      continue;
    }
    const source = fs.readFileSync(srcFile, "utf8");
    const size = processPage(source, page.dest);
    console.log(`  OK    ${page.dest}  (${(size/1024).toFixed(0)} KB)`);
    ok++;
  }

  console.log(`\nDone: ${ok} pages built, ${fail} failed.`);
}

main();
