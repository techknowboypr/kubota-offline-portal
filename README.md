# Kubota Agricultural Machinery India — Offline Portal & Digital Archive

<div align="center">

![Offline Ready](https://img.shields.io/badge/Offline-100%25%20Ready-brightgreen?style=for-the-badge&logo=offline)
![Bilingual](https://img.shields.io/badge/Language-English%20%7C%20Hindi-orange?style=for-the-badge)
![HTML5 / Next.js](https://img.shields.io/badge/Tech-HTML5%20%7C%20CSS3%20%7C%20JS-blue?style=for-the-badge)
![Zero Remote Dependencies](https://img.shields.io/badge/Remote%20Requests-0%20(Zero)-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-lightgrey?style=for-the-badge)

<br/>

**A fully reconstructed, standalone offline mirror and interactive digital portal for Kubota Agricultural Machinery India.**

[🚀 Quick Start](#-quick-start) •
[✨ Features](#-features) •
[📂 Repository Structure](#-repository-structure) •
[🛠️ Offline Architecture](#-offline-architecture) •
[🌐 GitHub Pages Deployment](#-github-pages-deployment) •
[📄 License](#-license)

</div>

---

## 📖 Overview

This repository provides a complete, high-fidelity offline mirror and portal for **Kubota Agricultural Machinery India** (`https://kubota.escortskubota.com/`).

It enables full local exploration of Kubota's tractor lineups (**MU Series**, **L Series**, **NeoStar Series**), technical specifications, downloadable brochures, bilingual portals (English & Hindi), and the interactive **3D Virtual Showroom** without requiring an active internet connection or external CDN dependencies.

---

## 🚀 Quick Start

You can run and explore this offline portal in multiple ways:

### Option 1: Direct Local Browser (Zero Setup)
Simply double-click either:
- **`START_OFFLINE.html`** or **`index.html`** in the repository root.
- It will automatically launch the portal in your default web browser using the `file://` protocol.

### Option 2: Using Node.js / NPX
Run a lightweight static local server:
```bash
# Using npm script
npm start

# Or using npx serve directly
npx serve .
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option 3: Using Python
If you have Python installed:
```bash
# Python 3
python -m http.server 8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

### Option 4: VS Code Live Server
Right-click `index.html` or `START_OFFLINE.html` in Visual Studio Code and select **"Open with Live Server"**.

---

## ✨ Features

- 🌐 **100% Offline Capability**: All HTML pages, stylesheets, JavaScript chunks, fonts, images, videos, and PDF brochures are self-contained locally.
- 🚜 **Complete Tractor Lineup**:
  - **MU Series**: MU4501 (2WD/4WD), MU5502 (2WD/4WD), MU5002, MU4201.
  - **L Series**: L3408, L4508.
  - **NeoStar Series**: A211N, B2441, B2741S.
- 🇮🇳 **Bilingual Portal**: Complete English and Hindi (`/hi`) product portals and localization assets.
- 🕶️ **3D Virtual Showroom**: Interactive 360° panorama tour powered by Pano2VR, WebXR polyfills, and three.js.
- 📄 **Offline PDF Brochures**: High-resolution specification sheets and catalogs stored under `images/brochure/kubota/`.
- ⚡ **Optimized Asset Pipeline**: Next.js optimized image URLs (`/_next/image?url=...`) are de-obfuscated to clean relative local paths.
- 🛡️ **Zero External Tracking**: External tracking scripts, analytics beacons, and tracking pixels are cleanly stripped or neutralized for privacy and offline reliability.

---

## 📂 Repository Structure

```text
.
├── .github/
│   ├── workflows/
│   │   └── deploy.yml            # Automated GitHub Pages CI/CD workflow
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md         # Issue template for bugs
│   │   └── feature_request.md    # Issue template for feature requests
│   └── pull_request_template.md  # Standard Pull Request template
├── assets/
│   ├── _next/static/             # Next.js stylesheets, media fonts, and JS chunks
│   ├── static/                   # Localized widget and API helper scripts
│   └── virtual-showroom/         # Pano2VR, Three.js, and Showroom video media
├── data/
│   └── dealer-states.json        # Offline dealer directory dataset
├── html/                         # 49 fully reconstructed offline HTML pages
│   ├── index.html                # Main English portal
│   ├── hi.html                   # Hindi portal
│   ├── virtual-showroom.html     # 3D interactive virtual showroom
│   ├── mu-series.html            # MU Series category page
│   ├── l-series.html             # L Series category page
│   ├── neostar-series.html       # NeoStar Series category page
│   └── ...                       # Individual tractor models (English & Hindi)
├── images/
│   ├── kubota/                   # Product imagery, banners, and thumbnails
│   ├── brochure/kubota/          # Downloadable PDF brochures
│   ├── icons/                    # UI icons and navigation graphics
│   ├── static/                   # Branding assets and metadata images
│   ├── logo.png                  # Main Kubota branding logo
│   └── favicon.ico               # Website favicon
├── _logs/
│   ├── manifest.json             # Reconstruction inventory and manifest stats
│   ├── missing-assets.json       # Audit verification (0 missing)
│   ├── missing-images.json       # Audit verification (0 missing)
│   └── remote-url-audit.json     # Audit verification (0 remote dependencies)
├── _next/                        # Next.js static routing compatibility structure
├── .gitattributes                # Git line ending and binary file configuration
├── .gitignore                    # Git file exclusion rules
├── CONTRIBUTING.md               # Contribution guidelines
├── index.html                    # Root entry point & GitHub Pages landing hub
├── LICENSE                       # MIT License & Content Disclaimer
├── log.md                        # Reconstruction changelog & audit report
├── package.json                  # Node metadata and development preview scripts
├── SECURITY.md                   # Security reporting guidelines
├── skill.md                      # Offline mirror specification
└── START_OFFLINE.html            # Standalone offline browser launcher
```

---

## 🛠️ Offline Architecture & Engineering

### 1. Next.js Client Hydration & Image Interception
Next.js applications render images dynamically via `next/image`, which normally queries an image optimization endpoint:
```text
/_next/image?url=https%3A%2F%2Fcorpapi.escortskubota.com%2Fimages%2Fkubota%2F...&w=1920&q=100
```
In this offline mirror:
1. All static HTML references have been rewritten to relative paths (`../images/...`).
2. A lightweight client-side runtime interrupter patches `HTMLImageElement.prototype.src`, `srcset`, and `Element.prototype.setAttribute`, backed by a `MutationObserver`.
3. Any dynamic URL requests generated during runtime hydration are intercepted and routed to the corresponding local image file.

### 2. Local Font & Media Hosting
All external web fonts (`WOFF2`, `TTF`, `OTF` including Helvetica, Eurostile, and Noto Sans Devanagari) have been downloaded and linked locally in the CSS bundle (`assets/_next/static/media/`).

### 3. Link Normalization
All internal routes (`/`, `/hi`, `/virtual-showroom`, `/mu-series`, etc.) are mapped to relative local HTML files (`index.html`, `hi.html`, `virtual-showroom.html`, `mu-series.html`), allowing standard browser navigation across the entire site.

---

## 🌐 GitHub Pages Deployment

This repository is pre-configured with a GitHub Actions workflow for zero-touch GitHub Pages hosting:

1. Push this repository to your GitHub account:
   ```bash
   git remote add origin https://github.com/<your-username>/kubota-offline-portal.git
   git push -u origin main
   ```
2. In your GitHub repository:
   - Navigate to **Settings** > **Pages**.
   - Under **Build and deployment** > **Source**, choose **GitHub Actions**.
3. The `.github/workflows/deploy.yml` workflow will automatically build and publish your site to `https://<your-username>.github.io/kubota-offline-portal/`.

---

## 📊 Audit & Quality Assurance

As verified by `_logs/manifest.json` and automated validation tests:
- **Total HTML Pages**: 49
- **Total Local Images**: 361
- **Total Local Assets**: 63
- **Missing Images**: `0`
- **Missing Assets**: `0`
- **Unresolved Remote URLs**: `0`

---

## 📄 License & Disclaimer

- **Code & Repository Infrastructure**: Released under the [MIT License](LICENSE).
- **Trademarks & Media Disclaimer**: All product names, logos, tractor designs, brochure documents, and brand trademarks are property of **Kubota Corporation** and **Escorts Kubota Limited**. This project is maintained for archival and educational demonstration purposes.
