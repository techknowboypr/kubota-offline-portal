const express = require("express");
const path = require("path");
const fs = require("fs");
const https = require("https");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// ---- Original site URLs for image proxying ----
const SITE = "https://kubota.escortskubota.com";
const CORPAPI = "https://corpapi.escortskubota.com";
const STATIC = "https://static.escortskubota.com";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- Static assets (non-image) ----
app.use("/assets", express.static(path.join(ROOT, "assets")));
app.use("/_next", express.static(path.join(ROOT, "_next")));
app.use("/data", express.static(path.join(ROOT, "data")));

// ---- Image proxy: fetch from origin servers and cache to disk ----
function originForImagePath(localPath) {
  // localPath is like "images/kubota/banners/foo.jpg" (no leading slash)
  if (localPath.startsWith("images/kubota/") || localPath.startsWith("images/brochure/"))
    return CORPAPI + "/" + localPath;
  if (localPath.startsWith("images/static/"))
    return STATIC + "/" + localPath.replace("images/static/", "");
  if (localPath.startsWith("images/icons/"))
    return SITE + "/" + localPath.replace("images/", "");
  if (localPath === "images/logo.png") return SITE + "/logo.png";
  if (localPath === "images/favicon.ico") return SITE + "/favicon.ico";
  if (localPath.startsWith("images/virtual-showroom/"))
    return SITE + "/" + localPath.replace("images/", "");
  return SITE + "/" + localPath;
}

function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const newUrl = res.headers.location.startsWith("http")
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        return fetchImage(newUrl).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error("HTTP " + res.statusCode));
      }
      const chunks = [];
      res.on("data", d => chunks.push(d));
      res.on("end", () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers["content-type"] }));
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy());
  });
}

app.use("/images", (req, res) => {
  const localPath = "images" + req.path;
  const diskPath = path.join(ROOT, localPath);

  // If file exists on disk, serve it directly
  if (fs.existsSync(diskPath) && fs.statSync(diskPath).size > 0) {
    return res.sendFile(diskPath);
  }

  // Otherwise fetch from origin and cache
  const originUrl = originForImagePath(localPath);
  fetchImage(originUrl)
    .then(({ buffer, contentType }) => {
      // Save to disk for future requests
      fs.mkdirSync(path.dirname(diskPath), { recursive: true });
      fs.writeFileSync(diskPath, buffer);
      res.type(contentType || "image/jpeg");
      res.send(buffer);
    })
    .catch(() => {
      // Return a transparent 1x1 pixel as fallback
      const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0CAAAAASUVORK5CYII=", "base64");
      res.type("image/png").send(pixel);
    });
});

// ---- Clean URL route mapping ----
const routes = {
  "/": "index.html",
  "/mu-series": "mu-series.html",
  "/l-series": "l-series.html",
  "/neostar-series": "neostar-series.html",
  "/mu-series/mu4201-2wd": "mu-series__mu4201-2wd.html",
  "/mu-series/mu4201-4wd": "mu-series__mu4201-4wd.html",
  "/mu-series/mu4501-2wd": "mu-series__mu4501-2wd.html",
  "/mu-series/mu4501-4wd": "mu-series__mu4501-4wd.html",
  "/mu-series/mu4502-2wd": "mu-series__mu4502-2wd.html",
  "/mu-series/mu4502-4wd": "mu-series__mu4502-4wd.html",
  "/mu-series/mu5002-2wd": "mu-series__mu5002-2wd.html",
  "/mu-series/mu5002-4wd": "mu-series__mu5002-4wd.html",
  "/mu-series/mu5502-2wd": "mu-series__mu5502-2wd.html",
  "/mu-series/mu5502-4wd": "mu-series__mu5502-4wd.html",
  "/l-series/kubota-l3408": "l-series__kubota-l3408.html",
  "/l-series/kubota-l4508": "l-series__kubota-l4508.html",
  "/neostar-series/neostar-a211n": "neostar-series__neostar-a211n.html",
  "/neostar-series/neostar-a211n-op": "neostar-series__neostar-a211n-op.html",
  "/neostar-series/neostar-a211s": "neostar-series__neostar-a211s.html",
  "/neostar-series/neostar-b2441": "neostar-series__neostar-b2441.html",
  "/neostar-series/neostar-b2441n": "neostar-series__neostar-b2441n.html",
  "/neostar-series/neostar-b2441s-narrow": "neostar-series__neostar-b2441s-narrow.html",
  "/neostar-series/neostar-b2741s": "neostar-series__neostar-b2741s.html",
  "/neostar-series/neostar-b2741s-narrow": "neostar-series__neostar-b2741s-narrow.html",
};

// ---- Helper: rewrite paths and inject scripts server-side ----
function processHtml(html) {
  // Fix image src paths: ../images/ -> /images/
  html = html.replace(/src="\.\.\/images\//g, 'src="/images/');
  // Fix srcset paths
  html = html.replace(/srcset="([^"]*)"/g, (m, srcset) => {
    return 'srcset="' + srcset.replace(/\.\.\/images\//g, "/images/") + '"';
  });
  // Fix favicon/icon links
  html = html.replace(/href="\.\.\/images\//g, 'href="/images/');
  // Fix inline style background urls
  html = html.replace(/\.\.\/images\//g, "/images/");

  // Rewrite internal links to clean URLs
  const linkMap = {
    "index.html": "/",
    "mu-series.html": "/mu-series",
    "l-series.html": "/l-series",
    "neostar-series.html": "/neostar-series",
  };
  for (const [old, clean] of Object.entries(linkMap)) {
    html = html.replace(new RegExp('href="' + old.replace(/\./g, "\\.") + '"', "g"), 'href="' + clean + '"');
  }
  // Product page links: mu-series__mu4201-2wd.html -> /mu-series/mu4201-2wd
  html = html.replace(/href="(mu-series|l-series|neostar-series)__([^"]+?)\.html"/g, (m, series, slug) => {
    return 'href="/' + series + "/" + slug + '"';
  });

  // Inject our CSS and JS
  const scriptTag = '\n<link rel="stylesheet" href="/assets/app.css">\n<script src="/assets/app.js" defer></script>';
  html = html.replace("</head>", scriptTag + "\n</head>");

  return html;
}

// ---- Page routes ----
for (const [route, file] of Object.entries(routes)) {
  app.get(route, (req, res) => {
    const filePath = path.join(ROOT, "html", file);
    if (!fs.existsSync(filePath)) return res.status(404).send("Page not found");
    let html = fs.readFileSync(filePath, "utf8");
    html = processHtml(html);
    res.type("html").send(html);
  });
}

// ---- API: Dealer states/districts ----
app.get("/api/dealer-states", (req, res) => {
  const dataPath = path.join(ROOT, "data", "dealer-states.json");
  if (!fs.existsSync(dataPath)) return res.status(404).json({ error: "Data not found" });
  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  res.json(data);
});

// ---- API: Search ----
app.get("/api/search", (req, res) => {
  const q = (req.query.q || "").toString().toLowerCase().trim();
  if (!q) return res.json({ results: [] });

  const searchIndex = [
    { title: "MU Series", url: "/mu-series", desc: "42-55 HP category tractors", keywords: "mu series tractor 42 45 50 55 hp" },
    { title: "L Series", url: "/l-series", desc: "34-45 HP category tractors", keywords: "l series tractor 34 45 hp kubota" },
    { title: "NeoStar Series", url: "/neostar-series", desc: "21-27 HP category tractors", keywords: "neostar series tractor 21 27 hp compact" },
    { title: "MU4201 2WD", url: "/mu-series/mu4201-2wd", desc: "42 HP, 2WD tractor", keywords: "mu4201 2wd 42 hp 2434 cc" },
    { title: "MU4201 4WD", url: "/mu-series/mu4201-4wd", desc: "42 HP, 4WD tractor", keywords: "mu4201 4wd 42 hp" },
    { title: "MU4501 2WD", url: "/mu-series/mu4501-2wd", desc: "45 HP, 2WD tractor", keywords: "mu4501 2wd 45 hp" },
    { title: "MU4501 4WD", url: "/mu-series/mu4501-4wd", desc: "45 HP, 4WD tractor", keywords: "mu4501 4wd 45 hp" },
    { title: "MU4502 2WD", url: "/mu-series/mu4502-2wd", desc: "45 HP, 2WD tractor", keywords: "mu4502 2wd 45 hp" },
    { title: "MU4502 4WD", url: "/mu-series/mu4502-4wd", desc: "45 HP, 4WD tractor", keywords: "mu4502 4wd 45 hp" },
    { title: "MU5002 2WD", url: "/mu-series/mu5002-2wd", desc: "50 HP, 2WD tractor", keywords: "mu5002 2wd 50 hp" },
    { title: "MU5002 4WD", url: "/mu-series/mu5002-4wd", desc: "50 HP, 4WD tractor", keywords: "mu5002 4wd 50 hp" },
    { title: "MU5502 2WD", url: "/mu-series/mu5502-2wd", desc: "55 HP, 2WD tractor", keywords: "mu5502 2wd 55 hp" },
    { title: "MU5502 4WD", url: "/mu-series/mu5502-4wd", desc: "55 HP, 4WD tractor", keywords: "mu5502 4wd 55 hp" },
    { title: "Kubota L3408", url: "/l-series/kubota-l3408", desc: "L Series 34 HP tractor", keywords: "l3408 l series 34 hp" },
    { title: "Kubota L4508", url: "/l-series/kubota-l4508", desc: "L Series 45 HP tractor", keywords: "l4508 l series 45 hp" },
    { title: "NeoStar A211N", url: "/neostar-series/neostar-a211n", desc: "NeoStar 21 HP tractor", keywords: "neostar a211n 21 hp" },
    { title: "NeoStar A211N OP", url: "/neostar-series/neostar-a211n-op", desc: "NeoStar 21 HP orchard tractor", keywords: "neostar a211n op 21 hp orchard" },
    { title: "NeoStar A211S", url: "/neostar-series/neostar-a211s", desc: "NeoStar 21 HP tractor", keywords: "neostar a211s 21 hp" },
    { title: "NeoStar B2441", url: "/neostar-series/neostar-b2441", desc: "NeoStar 24 HP tractor", keywords: "neostar b2441 24 hp" },
    { title: "NeoStar B2441N", url: "/neostar-series/neostar-b2441n", desc: "NeoStar 24 HP narrow tractor", keywords: "neostar b2441n 24 hp narrow" },
    { title: "NeoStar B2441S Narrow", url: "/neostar-series/neostar-b2441s-narrow", desc: "NeoStar 24 HP narrow tractor", keywords: "neostar b2441s narrow 24 hp" },
    { title: "NeoStar B2741S", url: "/neostar-series/neostar-b2741s", desc: "NeoStar 27 HP tractor", keywords: "neostar b2741s 27 hp" },
    { title: "NeoStar B2741S Narrow", url: "/neostar-series/neostar-b2741s-narrow", desc: "NeoStar 27 HP narrow tractor", keywords: "neostar b2741s narrow 27 hp" },
  ];

  const results = searchIndex.filter(item =>
    item.title.toLowerCase().includes(q) ||
    item.desc.toLowerCase().includes(q) ||
    item.keywords.toLowerCase().includes(q)
  );
  res.json({ results });
});

// ---- API: Contact form submission ----
app.post("/api/contact", async (req, res) => {
  const { name, email, phone, state, district, message, product } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Name, email, and message are required" });
  }
  if (!supabase) {
    return res.status(500).json({ error: "Database not configured" });
  }
  const { data, error } = await supabase
    .from("enquiries")
    .insert([{ name, email, phone, state, district, message, product }]);
  if (error) {
    return res.status(500).json({ error: "Failed to submit enquiry" });
  }
  res.json({ success: true, message: "Enquiry submitted successfully" });
});

// ---- Fallback: serve other html files from /html ----
app.get("*", (req, res) => {
  const reqPath = req.path;
  if (reqPath.endsWith(".html")) {
    const filePath = path.join(ROOT, "html", path.basename(reqPath));
    if (fs.existsSync(filePath)) {
      let html = fs.readFileSync(filePath, "utf8");
      html = processHtml(html);
      return res.type("html").send(html);
    }
  }
  res.status(404).send("Page not found");
});

app.listen(PORT, () => {
  console.log(`Kubota website running on http://localhost:${PORT}`);
});
