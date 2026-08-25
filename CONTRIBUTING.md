# Contributing to Kubota Offline Portal

Thank you for your interest in contributing to the **Kubota Offline Portal & Website Reconstruction** project!

## Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/kubota-offline-portal.git
   cd kubota-offline-portal
   ```
3. **Open the project** in your browser:
   - Double-click `START_OFFLINE.html` or `index.html`.
   - Or start a local static server:
     ```bash
     npm start
     # or
     python -m http.server 8000
     ```

## Code Guidelines

- **Offline-First Principle**: Every page, asset, image, script, and font must remain 100% functional locally without requiring an internet connection.
- **Relative Paths**: Always use relative paths (`../assets/...`, `../images/...`, `html/...`) to ensure compatibility with `file://` protocols and sub-path deployments.
- **Asset Integrity**: Avoid committing extraneous duplicates or oversized uncompressed files.

## Submitting Pull Requests

1. Create a descriptive branch:
   ```bash
   git checkout -b fix/image-path-resolution
   ```
2. Commit your changes with clear commit messages:
   ```bash
   git commit -m "fix: resolve relative asset path in tractor series listing"
   ```
3. Push to your branch and open a Pull Request using the provided PR template.

---

Thank you for helping keep this digital archive robust and accessible!
