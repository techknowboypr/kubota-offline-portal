# Skill: Offline Website Mirror & Reconstruction

## Purpose

Build a fully functional offline copy of:

https://kubota.escortskubota.com/

The downloader must preserve the visual appearance and functionality of the original website as closely as possible.

The final result must be a real offline website, not a collection of HTML files displayed as raw/formatted text.

---

# 1. PRIMARY REQUIREMENT

The downloaded website must open correctly from the local filesystem.

Example:

kubota_offline/
├── START_OFFLINE.html
├── html/
├── images/
├── assets/
├── pages/
├── data/
└── _logs/

Opening:

kubota_offline/START_OFFLINE.html

must display the website normally.

Do NOT show:

- raw HTML
- escaped HTML
- JSON as page content
- CSS source as visible text
- JavaScript source as visible text
- broken image icons
- unresolved `/assets/...` URLs
- unresolved `/_next/...` URLs
- unresolved `https://kubota.escortskubota.com/...` URLs

---

# 2. CRITICAL HTML REQUIREMENT

Downloaded HTML must remain valid HTML documents.

Every HTML page must contain:

<!doctype html>
<html>
<head>
<meta charset="UTF-8">
...
</head>
<body>
...
</body>
</html>

Do NOT save HTML as:

.txt
.json
.md

Do NOT HTML-escape the entire page.

For example, this is WRONG:

&lt;html&gt;
&lt;head&gt;

This is CORRECT:

<html>
<head>

---

# 3. NEXT.JS IMAGE HANDLING

The original website uses Next.js image optimization.

Example:

https://kubota.escortskubota.com/_next/image?url=https%3A%2F%2Fcorpapi.escortskubota.com%2Fimages%2Fkubota%2Ffeauture-banner%2Fcompact%2FB2741S_STD%2FB2741S_STD_1.png&w=1920&q=100

The downloader MUST decode the `url=` parameter.

Convert it to:

https://corpapi.escortskubota.com/images/kubota/feauture-banner/compact/B2741S_STD/B2741S_STD_1.png

Download the ORIGINAL image.

Do not depend on the Next.js `/ _next/image` endpoint for the offline website.

---

# 4. URL CLEANING

Before downloading any resource, normalize the URL.

Example:

WRONG:

https://corpapi.escortskubota.com/images/example.jpg%5C

CORRECT:

https://corpapi.escortskubota.com/images/example.jpg

Remove:

- trailing `\`
- trailing `%5C`
- trailing whitespace
- URL fragments
- accidental encoded backslashes

Apply normalization repeatedly until the URL no longer changes.

Example:

image.jpg%5C%5C

becomes:

image.jpg

---

# 5. IMAGE DIRECTORY STRUCTURE

Original image paths must be preserved.

Example source:

https://corpapi.escortskubota.com/images/kubota/feauture-banner/compact/B2741S_STD/B2741S_STD_1.png

Save as:

images/
└── kubota/
    └── feauture-banner/
        └── compact/
            └── B2741S_STD/
                └── B2741S_STD_1.png

Do NOT rename every image to:

image1.png
image2.png
image3.png

Preserving the source path makes URL rewriting much easier.

---

# 6. HTML IMAGE REWRITING

After downloading an image, replace the remote image URL in HTML with the local path.

Example:

Original:

<img src="https://corpapi.escortskubota.com/images/kubota/test.png">

Offline:

<img src="../images/kubota/test.png">

The relative path must be calculated from the HTML file's actual directory.

Do not assume every HTML page is located in the same directory.

---

# 7. IMAGE ATTRIBUTES

Process all common image attributes:

src
srcset
data-src
data-srcset
data-original
data-lazy-src
data-image
data-url
data-original-src
poster

Also inspect:

<img>
<picture>
<source>
<video>
<meta property="og:image">

---

# 8. CSS IMAGE REFERENCES

CSS must also be rewritten.

Example:

Original:

background-image: url("https://corpapi.escortskubota.com/images/banner.jpg");

Offline:

background-image: url("../images/banner.jpg");

Also process:

url(...)
@font-face
background
background-image
mask-image
content
SVG references

---

# 9. CSS DOWNLOAD

Download every CSS file used by the website.

This includes:

- normal CSS
- Next.js generated CSS
- dynamically loaded CSS
- CSS referenced by HTML
- CSS discovered through browser network requests

Preserve the directory structure whenever possible.

Example:

assets/
└── _next/
    └── static/
        └── css/
            └── xxxx.css

---

# 10. JAVASCRIPT DOWNLOAD

Download all JavaScript resources required by the website.

Include:

- normal JS
- Next.js chunks
- `_next/static/...`
- runtime chunks
- page chunks
- webpack chunks
- dynamically loaded JS

Do not display JS source in the browser.

JS must remain:

<script src="..."></script>

not:

<script>
[raw downloaded JS incorrectly inserted into HTML]
</script>

unless the original page actually used inline JavaScript.

---

# 11. FONT DOWNLOAD

Download:

.woff
.woff2
.ttf
.otf
.eot

Rewrite CSS `@font-face` URLs to local files.

---

# 12. OTHER FILE TYPES

The crawler must support, when encountered:

HTML
CSS
JS
JSON
XML
SVG
PNG
JPG
JPEG
WEBP
GIF
AVIF
ICO
BMP
TIFF
WOFF
WOFF2
TTF
OTF
EOT
MP4
WEBM
MP3
WAV
PDF

Do not restrict downloading based only on file extension.

Browser network responses should also be used to discover resources.

---

# 13. NEXT.JS STATIC FILES

Preserve:

/_next/static/

resources.

Example:

/_next/static/chunks/xxxx.js

should become something like:

assets/_next/static/chunks/xxxx.js

HTML must reference the local version.

Do not leave:

/_next/static/...

as an absolute website URL.

---

# 14. HTML LINK REWRITING

Process:

<a href="">
<link href="">
<script src="">
<img src="">
<source src="">
<video src="">
<iframe src="">

Internal website links should become local HTML links.

Example:

Original:

<a href="/tractor/b2441">

Offline:

<a href="../html/tractor__b2441.html">

or the appropriate calculated local path.

---

# 15. INTERNAL ROUTES

Crawl all internal pages.

Only crawl:

https://kubota.escortskubota.com/

and its internal routes.

Avoid infinite crawling of:

query variations
tracking URLs
fragments
external websites
Next.js optimizer URLs

Normalize URLs before adding them to the crawl queue.

---

# 16. SPA / NEXT.JS ROUTING

The website is likely a Next.js application.

Do not assume that downloading one HTML page is sufficient.

Use a real browser crawler such as Playwright.

For each page:

1. Navigate to page.
2. Wait for DOM rendering.
3. Wait for network activity.
4. Scroll through page.
5. Trigger lazy-loaded images.
6. Capture browser network resources.
7. Capture final rendered HTML.
8. Extract internal links.
9. Add new pages to crawl queue.

---

# 17. LAZY LOADING

Many images may not exist in the initial HTML.

Use browser scrolling:

window.scrollTo(
    0,
    document.body.scrollHeight
);

Repeat until the page height stops changing.

After scrolling:

- capture `<img>` URLs
- capture `currentSrc`
- capture `srcset`
- capture network responses

---

# 18. OFFLINE HTML GENERATION

Do not simply dump browser HTML into a file and assume it works.

After downloading resources:

1. Parse HTML with BeautifulSoup.
2. Find remote resource URLs.
3. Find Next.js image URLs.
4. Resolve original URLs.
5. Map each resource to local path.
6. Replace remote references.
7. Save valid HTML.

---

# 19. IMPORTANT: DO NOT DISPLAY SOURCE CODE

The offline page must never show source code like:

<!DOCTYPE html>
<html>
<head>

as visible page text.

If the browser is displaying HTML source as text, the generated file is wrong.

Check:

Content-Type is not relevant for `file://`, so the actual file contents must begin with valid HTML.

Correct:

<!doctype html>
<html>

Incorrect:

"&lt;!doctype html&gt;"

Incorrect:

{
    "html": "<html>..."
}

Incorrect:

"<html>..."

---

# 20. OFFLINE START PAGE

Create:

START_OFFLINE.html

It should contain a normal HTML interface.

It can redirect to:

html/index.html

Example:

<!doctype html>
<html>
<head>
<meta charset="UTF-8">
<title>Kubota Offline</title>
<meta http-equiv="refresh" content="0;url=html/index.html">
</head>
<body>
Opening offline website...
</body>
</html>

---

# 21. FILE PATH RULE

Never hard-code:

/images/
/assets/
/_next/

because the HTML page may be nested.

Always calculate the relative path.

Example:

HTML:

html/products/index.html

Image:

images/kubota/product/image.png

Correct:

../../images/kubota/product/image.png

---

# 22. REMOTE URL AUDIT

After rewriting, scan every HTML and CSS file.

Report any remaining URLs matching:

https://kubota.escortskubota.com/

https://corpapi.escortskubota.com/

https://...

/_next/image

/_next/static

If a resource has a local copy, replace the remote URL.

---

# 23. BROKEN IMAGE AUDIT

After download:

For every `<img>`:

1. Resolve its local path.
2. Check whether the file exists.
3. If missing, log it.

Create:

_logs/missing-images.json

Example:

[
    {
        "page": "html/index.html",
        "url": "...",
        "expected_local": "../images/..."
    }
]

---

# 24. RESOURCE MANIFEST

Create:

_logs/manifest.json

Include:

{
    "source_website": "...",
    "pages": [],
    "images": [],
    "css": [],
    "javascript": [],
    "fonts": [],
    "media": [],
    "other_resources": [],
    "local_mapping": {}
}

---

# 25. OFFLINE TEST

After downloading, run an automated validation.

For every HTML page:

- verify valid HTML
- verify local CSS exists
- verify local JS exists
- verify local images exist
- verify internal links resolve
- verify no malformed `%5C`
- verify no `/ _next/image`
- verify no remote image URLs when a local copy exists

---

# 26. BROWSER TEST

Use Playwright to open:

START_OFFLINE.html

or preferably serve the directory through a local HTTP server.

Important:

Some JavaScript modules behave differently under `file://`.

Therefore create a local server test:

python -m http.server 8000 --directory kubota_offline

Then test:

http://127.0.0.1:8000/START_OFFLINE.html

Use this for final validation.

---

# 27. VISUAL VALIDATION

The goal is not just "HTML downloaded".

The final offline website must visually resemble the source website:

- header
- navigation
- hero banners
- tractor images
- product cards
- buttons
- fonts
- spacing
- colors
- responsive layout
- footer
- menus
- sliders
- galleries

Do not replace the original design with a generic HTML layout.

---

# 28. RESPONSIVE VALIDATION

Test at:

1920x1080
1366x768
1024x768
768x1024
390x844

Check:

- no horizontal overflow
- images display
- navigation works
- cards remain aligned
- mobile menu works
- fonts load
- banners display

---

# 29. DO NOT MODIFY VISUAL DESIGN UNNECESSARILY

The downloader/reconstructor should preserve the original site's:

- CSS
- HTML structure
- class names
- images
- fonts
- JS
- layout

Only modify URLs and functionality necessary to make it work offline.

---

# 30. FINAL OUTPUT

The final output must be:

kubota_offline/
│
├── START_OFFLINE.html
│
├── html/
│   ├── index.html
│   ├── ...
│
├── images/
│   └── kubota/
│       ├── feauture-banner/
│       ├── implement-banner/
│       ├── compact-series/
│       └── ...
│
├── assets/
│   ├── _next/
│   │   └── static/
│   ├── css/
│   ├── js/
│   └── fonts/
│
├── data/
│
└── _logs/
    ├── manifest.json
    ├── missing-images.json
    ├── missing-assets.json
    └── remote-url-audit.json

---

# 31. SUCCESS CRITERIA

The task is complete only when:

1. START_OFFLINE.html opens normally.
2. HTML is rendered as a webpage, not text.
3. Images display.
4. Original image URLs are converted from Next.js URLs.
5. `%5C` / trailing backslashes are removed.
6. CSS loads locally.
7. JavaScript loads locally.
8. Fonts load locally.
9. Internal links work locally.
10. Next.js static files are local.
11. No unnecessary remote resource requests remain.
12. The page visually resembles the original website.
13. Mobile layout works.
14. The offline directory can be copied to another computer.
15. The website can be served with a basic local HTTP server without requiring the original website.

---

# 32. IMPORTANT IMPLEMENTATION RULE

Do NOT solve the problem by converting HTML into plain text.

Do NOT create a Markdown representation.

Do NOT create a JSON representation of the page.

Do NOT use escaped HTML as page content.

The output must be actual browser-renderable HTML with local CSS, JS, images, fonts and other assets.

The primary objective is:

DOWNLOAD → MAP → REWRITE → VALIDATE → OFFLINE RENDER