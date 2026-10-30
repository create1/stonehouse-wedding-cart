(function () {
  "use strict";

  var priceRaw = Number(document.body.getAttribute("data-price-per-cord"));
  var price = Number.isInteger(priceRaw) && priceRaw > 0 ? priceRaw : 700;
  var money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });

  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  var toggleLabel = toggle ? toggle.querySelector(".nav-toggle-label") : null;
  var desktopNav = window.matchMedia("(min-width: 960px)");

  function setNav(open) {
    if (!nav || !toggle) return;
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (toggleLabel) toggleLabel.textContent = open ? "Close" : "Menu";
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setNav(!nav.classList.contains("is-open"));
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setNav(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        setNav(false);
        toggle.focus();
      }
    });

    document.addEventListener("click", function (event) {
      if (header && !header.contains(event.target) && nav.classList.contains("is-open")) {
        setNav(false);
      }
    });

    function clearMobileNav() {
      if (desktopNav.matches) setNav(false);
    }

    if (desktopNav.addEventListener) desktopNav.addEventListener("change", clearMobileNav);
    else if (desktopNav.addListener) desktopNav.addListener(clearMobileNav);
  }

  var form = document.getElementById("order-form");
  if (!form) return;

  form.noValidate = true;

  var cordsInput = document.getElementById("cords");
  var dec = document.getElementById("cord-dec");
  var inc = document.getElementById("cord-inc");
  var totalValue = document.getElementById("wood-total");
  var totalNote = document.getElementById("wood-note");
  var formErrors = document.getElementById("form-errors");
  var ready = document.getElementById("request-ready");
  var requestText = document.getElementById("request-text");
  var emailDraft = document.getElementById("email-draft");
  var copyButton = document.getElementById("copy-request");
  var copyStatus = document.getElementById("copy-status");

  var fields = [
    {
      input: document.getElementById("customer-name"),
      error: document.getElementById("name-error"),
      validate: function (value) {
        return value.trim() ? "" : "Enter your name.";
      }
    },
    {
      input: document.getElementById("customer-email"),
      error: document.getElementById("email-error"),
      validate: function (value) {
        if (!value.trim()) return "Enter your email.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Enter an email address like name@example.com.";
        return "";
      }
    },
    {
      input: document.getElementById("customer-phone"),
      error: document.getElementById("phone-error"),
      validate: function (value) {
        if (!value.trim()) return "";
        var digits = value.replace(/\D/g, "");
        if (digits.length < 7 || digits.length > 15) return "Use a phone number with 7 to 15 digits, or leave it blank.";
        return "";
      }
    },
    {
      input: cordsInput,
      error: document.getElementById("cords-error"),
      validate: function (value) {
        return parseCords(value) === null ? "Enter a whole number of cords, from 1 to 99." : "";
      }
    },
    {
      input: document.getElementById("delivery-spot"),
      error: document.getElementById("spot-error"),
      validate: function (value) {
        return value.trim().length >= 2 ? "" : "Enter where the wood should go.";
      }
    }
  ];

  function parseCords(value) {
    if (typeof value !== "string" || !/^\d+$/.test(value.trim())) return null;
    var n = Number(value.trim());
    if (!Number.isInteger(n) || n < 1 || n > 99) return null;
    return n;
  }

  function orderEmail() {
    var link = document.getElementById("order-email");
    if (!link) return "you@example.com";
    var href = link.getAttribute("href") || "";
    var fromHref = href.replace(/^mailto:/i, "").split("?")[0].trim();
    return fromHref || link.textContent.trim();
  }

  function serviceArea() {
    var el = document.getElementById("service-area");
    return el ? el.textContent.trim() : "Your town";
  }

  function cordSentence(n) {
    var noun = n === 1 ? "full cord" : "full cords";
    return n + " " + noun + " at " + money.format(price) + " each. Delivery is not included.";
  }

  function updateTotal() {
    var n = parseCords(cordsInput.value);
    if (dec) dec.disabled = n !== null && n <= 1;
    if (inc) inc.disabled = n !== null && n >= 99;
    if (n === null) {
      totalValue.textContent = "—";
      totalNote.textContent = "Enter a whole number of cords, from 1 to 99.";
      return;
    }
    totalValue.textContent = money.format(n * price);
    totalNote.textContent = cordSentence(n);
  }

  function clearDraft() {
    if (!ready || ready.hidden) return;
    ready.hidden = true;
    if (copyStatus) copyStatus.textContent = "";
  }

  function clearField(field) {
    field.input.removeAttribute("aria-invalid");
    field.error.hidden = true;
    field.error.textContent = "";
  }

  function markField(field, message) {
    field.input.setAttribute("aria-invalid", "true");
    field.error.hidden = false;
    field.error.textContent = message;
  }

  function fieldFor(target) {
    for (var i = 0; i < fields.length; i += 1) {
      if (fields[i].input === target) return fields[i];
    }
    return null;
  }

  function step(delta) {
    var n = parseCords(cordsInput.value);
    var next = n === null ? 1 : Math.min(99, Math.max(1, n + delta));
    cordsInput.value = String(next);
    updateTotal();
    clearDraft();
    var field = fieldFor(cordsInput);
    if (field) clearField(field);
  }

  if (dec) dec.addEventListener("click", function () { step(-1); });
  if (inc) inc.addEventListener("click", function () { step(1); });

  cordsInput.addEventListener("blur", function () {
    var n = parseCords(cordsInput.value);
    if (n !== null) cordsInput.value = String(n);
  });

  form.addEventListener("input", function (event) {
    var field = fieldFor(event.target);
    if (field && field.input.getAttribute("aria-invalid") === "true") {
      var message = field.validate(field.input.value);
      if (!message) clearField(field);
    }
    if (event.target === cordsInput) updateTotal();
    if (!formErrors.hidden && !fields.some(function (item) {
      return item.input.getAttribute("aria-invalid") === "true";
    })) {
      formErrors.hidden = true;
      formErrors.textContent = "";
    }
    clearDraft();
  });

  function buildRequest() {
    var name = document.getElementById("customer-name").value.trim();
    var email = document.getElementById("customer-email").value.trim();
    var phone = document.getElementById("customer-phone").value.trim();
    var notes = document.getElementById("customer-notes").value.trim();
    var spot = document.getElementById("delivery-spot").value.trim();
    var n = parseCords(cordsInput.value);
    return [
      "Firewood Company — Madrone cord request",
      "",
      "Name: " + name,
      "Email: " + email,
      "Phone: " + (phone || "(none)"),
      "Full cords: " + n,
      "Wood total: " + money.format(n * price),
      "Price: " + money.format(price) + " per full cord",
      "Delivery is not included in this total.",
      "",
      "Delivery spot: " + spot,
      "Notes: " + (notes || "(none)"),
      "",
      "Service area named on the site: " + serviceArea()
    ].join("\n");
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    updateTotal();
    var firstInvalid = null;

    fields.forEach(function (field) {
      var message = field.validate(field.input.value);
      if (message) {
        markField(field, message);
        if (!firstInvalid) firstInvalid = field.input;
      } else {
        clearField(field);
      }
    });

    if (firstInvalid) {
      formErrors.hidden = false;
      formErrors.textContent = "Check the fields marked below before preparing the request.";
      ready.hidden = true;
      firstInvalid.focus();
      return;
    }

    formErrors.hidden = true;
    formErrors.textContent = "";
    var text = buildRequest();
    requestText.textContent = text;
    var email = orderEmail();
    emailDraft.href = "mailto:" + email + "?subject=" + encodeURIComponent("Madrone cord request") + "&body=" + encodeURIComponent(text);
    ready.hidden = false;
    ready.focus();
  });

  if (copyButton) {
    copyButton.addEventListener("click", function () {
      var text = requestText.textContent || "";
      copyText(text).then(function () {
        copyStatus.textContent = "Copied. Paste it into an email to " + orderEmail() + ".";
      }, function () {
        copyStatus.textContent = "Could not copy automatically. Select the request text and copy it yourself.";
      });
    });
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      try {
        var ok = document.execCommand("copy");
        document.body.removeChild(area);
        if (ok) resolve();
        else reject(new Error("copy failed"));
      } catch (error) {
        document.body.removeChild(area);
        reject(error);
      }
    });
  }

  updateTotal();
})();
