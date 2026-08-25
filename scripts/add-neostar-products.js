#!/usr/bin/env node
// Adds the 4 missing NeoStar product cards to the neostar-series.html page.
const fs = require("fs");
const path = require("path");
const file = path.resolve(__dirname, "..", "html", "neostar-series.html");
let html = fs.readFileSync(file, "utf8");

// Find the "SUITABLE IMPLEMENTS" section - insert product cards before it
const marker = "SUITABLE IMPLEMENTS";
const idx = html.indexOf(marker);
if (idx === -1) { console.log("Marker not found!"); process.exit(1); }

// Find the section start before the marker (look backwards for the opening tag)
const insertPoint = html.lastIndexOf("<section", idx);

// Build product cards matching the existing style
const newCards = `
<section class="sm:p-5 py-5" style="padding: 20px; max-width: 1200px; margin: 0 auto;">
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-top: 24px;">
    <a href="neostar-series__neostar-a211n.html" style="display:block; border:1px solid #e5e5e5; border-radius:12px; overflow:hidden; transition:all 0.3s; background:#fff;" onmouseover="this.style.borderColor='#f26522';this.style.boxShadow='0 8px 25px rgba(242,101,34,0.15)';this.style.transform='translateY(-3px)'" onmouseout="this.style.borderColor='#e5e5e5';this.style.boxShadow='none';this.style.transform='none'">
      <div style="text-align:center; padding:20px 20px 10px;">
        <h2 style="font-size:1.5rem; color:#FF7F3E; margin-bottom:8px;">KUBOTA A211N</h2>
        <p style="color:#666; font-size:14px;">14.5 kW &bull; 21 HP Category &bull; 4WD</p>
      </div>
      <div style="background:#f8f8f8; padding:20px; text-align:center;">
        <img src="../images/kubota/compact-series/A211N.jpg" alt="Kubota A211N" style="max-width:100%; max-height:200px; object-fit:contain; margin:0 auto;">
      </div>
      <div style="padding:12px 20px; text-align:center; color:#f26522; font-weight:600; font-size:14px;">Know more &#10095;</div>
    </a>
    <a href="neostar-series__neostar-a211n-op.html" style="display:block; border:1px solid #e5e5e5; border-radius:12px; overflow:hidden; transition:all 0.3s; background:#fff;" onmouseover="this.style.borderColor='#f26522';this.style.boxShadow='0 8px 25px rgba(242,101,34,0.15)';this.style.transform='translateY(-3px)'" onmouseout="this.style.borderColor='#e5e5e5';this.style.boxShadow='none';this.style.transform='none'">
      <div style="text-align:center; padding:20px 20px 10px;">
        <h2 style="font-size:1.5rem; color:#FF7F3E; margin-bottom:8px;">KUBOTA A211N-OP</h2>
        <p style="color:#666; font-size:14px;">14.5 kW &bull; 21 HP Category &bull; Orchard Specialist</p>
      </div>
      <div style="background:#f8f8f8; padding:20px; text-align:center;">
        <img src="../images/kubota/compact-series/A211N-OP.jpg" alt="Kubota A211N-OP" style="max-width:100%; max-height:200px; object-fit:contain; margin:0 auto;">
      </div>
      <div style="padding:12px 20px; text-align:center; color:#f26522; font-weight:600; font-size:14px;">Know more &#10095;</div>
    </a>
    <a href="neostar-series__neostar-b2441.html" style="display:block; border:1px solid #e5e5e5; border-radius:12px; overflow:hidden; transition:all 0.3s; background:#fff;" onmouseover="this.style.borderColor='#f26522';this.style.boxShadow='0 8px 25px rgba(242,101,34,0.15)';this.style.transform='translateY(-3px)'" onmouseout="this.style.borderColor='#e5e5e5';this.style.boxShadow='none';this.style.transform='none'">
      <div style="text-align:center; padding:20px 20px 10px;">
        <h2 style="font-size:1.5rem; color:#FF7F3E; margin-bottom:8px;">KUBOTA B2441</h2>
        <p style="color:#666; font-size:14px;">16.3 kW &bull; 24 HP Category &bull; 4WD</p>
      </div>
      <div style="background:#f8f8f8; padding:20px; text-align:center;">
        <img src="../images/kubota/compact-series/B-2441.jpg" alt="Kubota B2441" style="max-width:100%; max-height:200px; object-fit:contain; margin:0 auto;">
      </div>
      <div style="padding:12px 20px; text-align:center; color:#f26522; font-weight:600; font-size:14px;">Know more &#10095;</div>
    </a>
    <a href="neostar-series__neostar-b2441n.html" style="display:block; border:1px solid #e5e5e5; border-radius:12px; overflow:hidden; transition:all 0.3s; background:#fff;" onmouseover="this.style.borderColor='#f26522';this.style.boxShadow='0 8px 25px rgba(242,101,34,0.15)';this.style.transform='translateY(-3px)'" onmouseout="this.style.borderColor='#e5e5e5';this.style.boxShadow='none';this.style.transform='none'">
      <div style="text-align:center; padding:20px 20px 10px;">
        <h2 style="font-size:1.5rem; color:#FF7F3E; margin-bottom:8px;">KUBOTA B2441N</h2>
        <p style="color:#666; font-size:14px;">16.3 kW &bull; 24 HP Category &bull; 4WD</p>
      </div>
      <div style="background:#f8f8f8; padding:20px; text-align:center;">
        <img src="../images/kubota/compact-series/B2441N.jpg" alt="Kubota B2441N" style="max-width:100%; max-height:200px; object-fit:contain; margin:0 auto;">
      </div>
      <div style="padding:12px 20px; text-align:center; color:#f26522; font-weight:600; font-size:14px;">Know more &#10095;</div>
    </a>
  </div>
</section>
`;

html = html.slice(0, insertPoint) + newCards + "\n" + html.slice(insertPoint);
fs.writeFileSync(file, html);
console.log("Added 4 missing NeoStar product cards to neostar-series.html");
