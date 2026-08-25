/*
 * Kubota Portal - Client-side functionality
 * - Search with live results
 * - Dealer locator with state/district dropdowns
 * - Contact/enquiry modal form
 */
(function () {
  "use strict";

  // ---- Utility ----
  function fetchJSON(url, cb) {
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) { cb(null, data); })
      .catch(function (err) { cb(err); });
  }

  function postJSON(url, body, cb) {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) { cb(null, data); })
      .catch(function (err) { cb(err); });
  }

  function showToast(msg, type) {
    var toast = document.createElement("div");
    toast.className = "toast " + (type || "");
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add("active"); });
    setTimeout(function () {
      toast.classList.remove("active");
      setTimeout(function () { toast.remove(); }, 300);
    }, 3500);
  }

  // ---- Search functionality ----
  function initSearch() {
    var searchForms = document.querySelectorAll('form');
    searchForms.forEach(function (form) {
      var input = form.querySelector('input[type="text"]');
      if (!input || input.placeholder !== "SEARCH") return;

      var resultsContainer = document.createElement("div");
      resultsContainer.className = "search-results";
      form.style.position = "relative";
      form.appendChild(resultsContainer);

      var debounceTimer;
      input.addEventListener("input", function () {
        clearTimeout(debounceTimer);
        var q = input.value.trim();
        if (q.length < 2) {
          resultsContainer.classList.remove("active");
          return;
        }
        debounceTimer = setTimeout(function () {
          fetchJSON("/api/search?q=" + encodeURIComponent(q), function (err, data) {
            if (err || !data.results) return;
            if (data.results.length === 0) {
              resultsContainer.innerHTML = '<div class="search-no-results">No results found for "' + q + '"</div>';
            } else {
              resultsContainer.innerHTML = data.results.map(function (r) {
                return '<a class="search-result-item" href="' + r.url + '"><h4>' + r.title + '</h4><p>' + r.desc + '</p></a>';
              }).join("");
            }
            resultsContainer.classList.add("active");
          });
        }, 250);
      });

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var q = input.value.trim();
        if (q.length >= 2) {
          fetchJSON("/api/search?q=" + encodeURIComponent(q), function (err, data) {
            if (err || !data.results || data.results.length === 0) {
              showToast("No results found", "error");
              return;
            }
            if (data.results.length === 1) {
              window.location.href = data.results[0].url;
            } else {
              resultsContainer.classList.add("active");
            }
          });
        }
      });

      document.addEventListener("click", function (e) {
        if (!form.contains(e.target)) {
          resultsContainer.classList.remove("active");
        }
      });
    });
  }

  // ---- Dealer locator ----
  function initDealerLocator() {
    var forms = document.querySelectorAll('form');
    forms.forEach(function (form) {
      var selects = form.querySelectorAll("select");
      if (selects.length < 2) return;
      // Check if this looks like a dealer form
      var hasStatePlaceholder = false;
      selects.forEach(function (s) {
        var firstOpt = s.querySelector("option");
        if (firstOpt && firstOpt.textContent === "STATE") hasStatePlaceholder = true;
      });
      if (!hasStatePlaceholder) return;

      form.classList.add("dealer-form");
      var stateSelect = selects[0];
      var districtSelect = selects[1];
      var submitBtn = form.querySelector('button[type="button"]');

      // Create result container
      var resultDiv = document.createElement("div");
      resultDiv.className = "dealer-result";
      form.appendChild(resultDiv);

      var statesData = null;

      fetchJSON("/api/dealer-states", function (err, data) {
        if (err || !data.payload) return;
        statesData = data.payload;
        var stateNames = Object.keys(statesData).sort();
        stateSelect.innerHTML = '<option value="">STATE</option>' +
          stateNames.map(function (s) { return "<option>" + s + "</option>"; }).join("");
        stateSelect.disabled = false;
      });

      stateSelect.addEventListener("change", function () {
        var state = stateSelect.value;
        if (!state || !statesData || !statesData[state]) {
          districtSelect.innerHTML = '<option value="">DISTRICT</option>';
          districtSelect.disabled = true;
          if (submitBtn) submitBtn.disabled = true;
          return;
        }
        var districts = statesData[state];
        districtSelect.innerHTML = '<option value="">DISTRICT</option>' +
          districts.map(function (d) { return "<option>" + d + "</option>"; }).join("");
        districtSelect.disabled = false;
      });

      districtSelect.addEventListener("change", function () {
        if (submitBtn && stateSelect.value && districtSelect.value) {
          submitBtn.disabled = false;
        }
      });

      if (submitBtn) {
        submitBtn.addEventListener("click", function () {
          var state = stateSelect.value;
          var district = districtSelect.value;
          if (!state || !district) return;
          resultDiv.innerHTML =
            "<h3>Kubota Dealer - " + district + ", " + state + "</h3>" +
            "<p>Thank you for your interest in Kubota tractors.</p>" +
            '<p>To find the exact dealer address and contact details for <strong>' + district + ", " + state + "</strong>, please call our toll-free number <a href=\"tel:18003091694\">1800-309-1694</a> or submit an enquiry below.</p>" +
            '<button class="btn" style="margin-top:12px" onclick="window.kubotaOpenContact(\'' + state + "','" + district + '\')">Request Dealer Details</button>';
          resultDiv.classList.add("active");
          resultDiv.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }
    });
  }

  // ---- Contact modal ----
  function initContactModal() {
    var overlay = document.createElement("div");
    overlay.className = "contact-modal-overlay";
    overlay.innerHTML =
      '<div class="contact-modal" style="position:relative">' +
        '<button class="modal-close" aria-label="Close">&times;</button>' +
        "<h2>Get On-Road Price</h2>" +
        '<p class="modal-subtitle">Fill in your details and our team will get back to you.</p>' +
        '<div class="form-group"><label>Name *</label><input type="text" id="contact-name" placeholder="Your name"></div>' +
        '<div class="form-group"><label>Email *</label><input type="email" id="contact-email" placeholder="you@example.com"></div>' +
        '<div class="form-group"><label>Phone</label><input type="tel" id="contact-phone" placeholder="Your phone number"></div>' +
        '<div class="form-group"><label>State</label><input type="text" id="contact-state" placeholder="Your state"></div>' +
        '<div class="form-group"><label>District</label><input type="text" id="contact-district" placeholder="Your district"></div>' +
        '<div class="form-group"><label>Message *</label><textarea id="contact-message" placeholder="Tell us what you are interested in..."></textarea></div>' +
        '<div class="form-message" id="contact-form-message"></div>' +
        '<div class="modal-actions">' +
          '<button class="btn-cancel" id="contact-cancel">Cancel</button>' +
          '<button class="btn-submit" id="contact-submit">Submit Enquiry</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(overlay);

    function openModal(state, district) {
      overlay.classList.add("active");
      if (state) document.getElementById("contact-state").value = state;
      if (district) document.getElementById("contact-district").value = district;
      var productEl = document.querySelector("title");
      if (productEl) {
        document.getElementById("contact-message").value = "I am interested in " + productEl.textContent.trim() + ".";
      }
    }
    function closeModal() {
      overlay.classList.remove("active");
      document.getElementById("contact-form-message").className = "form-message";
      document.getElementById("contact-form-message").textContent = "";
    }

    window.kubotaOpenContact = openModal;

    overlay.querySelector(".modal-close").addEventListener("click", closeModal);
    document.getElementById("contact-cancel").addEventListener("click", closeModal);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });

    document.getElementById("contact-submit").addEventListener("click", function () {
      var name = document.getElementById("contact-name").value.trim();
      var email = document.getElementById("contact-email").value.trim();
      var phone = document.getElementById("contact-phone").value.trim();
      var state = document.getElementById("contact-state").value.trim();
      var district = document.getElementById("contact-district").value.trim();
      var message = document.getElementById("contact-message").value.trim();
      var msgEl = document.getElementById("contact-form-message");

      if (!name || !email || !message) {
        msgEl.className = "form-message error";
        msgEl.textContent = "Please fill in your name, email, and message.";
        return;
      }

      var btn = document.getElementById("contact-submit");
      btn.disabled = true;
      btn.textContent = "Submitting...";

      postJSON("/api/contact", {
        name: name, email: email, phone: phone,
        state: state, district: district, message: message,
        product: document.title.trim(),
      }, function (err, data) {
        btn.disabled = false;
        btn.textContent = "Submit Enquiry";
        if (err || (data && data.error)) {
          msgEl.className = "form-message error";
          msgEl.textContent = (data && data.error) ? data.error : "Something went wrong. Please try again.";
        } else {
          msgEl.className = "form-message success";
          msgEl.textContent = "Thank you! Your enquiry has been submitted. Our team will contact you soon.";
          showToast("Enquiry submitted successfully!", "success");
          setTimeout(function () {
            closeModal();
            ["contact-name","contact-email","contact-phone","contact-state","contact-district","contact-message"].forEach(function (id) {
              document.getElementById(id).value = "";
            });
          }, 2000);
        }
      });
    });

    // Wire up "Get on Road Price" buttons
    document.querySelectorAll('button').forEach(function (btn) {
      var text = btn.textContent.trim().toLowerCase();
      if (text.indexOf("get on road price") !== -1 || text === "get on road price") {
        btn.addEventListener("click", function () { openModal(); });
      }
    });
  }

  // ---- Init everything ----
  function init() {
    initSearch();
    initDealerLocator();
    initContactModal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
