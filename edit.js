/* ------------------------------------------------------------------
   Edit mode.

   Visiting any page with ?edit on the end turns on a small button in
   the bottom-right corner. The button lists what is editable on that
   page and links straight to that section of the editor.

   It stays on for the rest of that browser tab and is invisible to
   everyone else. Nothing here changes the site itself.
   ------------------------------------------------------------------ */
(function () {
  var KEY = "bmrEditMode";
  var ADMIN = "/admin/#/collections/website/entries/";
  var asked = /[?&]edit(=|&|$)/.test(location.search);
  var on = asked;

  try {
    if (asked) sessionStorage.setItem(KEY, "1");
    on = sessionStorage.getItem(KEY) === "1";
  } catch (e) { /* private browsing - fall back to the query string */ }

  if (!on) return;

  /* which editor sections belong to which page */
  var SECTIONS = {
    "index":   [["home", "Home page text"]],
    "the-rv":  [["rv", "The RV page text"]],
    "rates":   [["rates", "Rates, fees and add-ons"]],
    "book":    [["book", "Availability page text"], ["availability", "Booked dates"]],
    "contact": [["contactpage", "Contact page text"]],
    "legal":   [["legal", "Legal page text"]],
    "faq":     []
  };

  var page = location.pathname.replace(/\/+$/, "").split("/").pop().replace(/\.html$/, "");
  if (!page) page = "index";

  var items = (SECTIONS[page] || []).concat([["contact", "Phone, email and footer"]]);

  /* ---------------------------------------------------------------- markup */
  var wrap = document.createElement("div");
  wrap.id = "bmr-edit";

  var css = document.createElement("style");
  css.textContent =
    "#bmr-edit{position:fixed;left:16px;bottom:16px;z-index:2147483646;" +
      "font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}" +
    "#bmr-edit-btn{display:flex;align-items:center;gap:7px;" +
      "background:#22392e;color:#fff;border:0;border-radius:999px;cursor:pointer;" +
      "padding:11px 18px;font-size:.92rem;font-weight:600;letter-spacing:.01em;" +
      "box-shadow:0 2px 6px rgba(25,23,19,.18),0 14px 34px rgba(25,23,19,.22)}" +
    "#bmr-edit-btn:hover{background:#16261e}" +
    "#bmr-edit-panel{display:none;margin-bottom:10px;background:#fff;border-radius:14px;" +
      "box-shadow:0 2px 6px rgba(25,23,19,.08),0 18px 44px rgba(25,23,19,.18);" +
      "overflow:hidden;min-width:258px;max-width:min(320px,calc(100vw - 32px))}" +
    "#bmr-edit.open #bmr-edit-panel{display:block}" +
    "#bmr-edit-panel .hd{padding:13px 16px 10px;font-size:.72rem;font-weight:700;" +
      "letter-spacing:.09em;text-transform:uppercase;color:rgba(25,23,19,.5);" +
      "border-bottom:1px solid rgba(25,23,19,.08)}" +
    "#bmr-edit-panel a{display:block;padding:12px 16px;color:#191713;text-decoration:none;" +
      "font-size:.95rem;border-bottom:1px solid rgba(25,23,19,.07)}" +
    "#bmr-edit-panel a:hover{background:#faf6f0}" +
    "#bmr-edit-panel .note{padding:11px 16px;font-size:.82rem;line-height:1.45;" +
      "color:rgba(25,23,19,.56);border-bottom:1px solid rgba(25,23,19,.07)}" +
    "#bmr-edit-panel .off{padding:11px 16px;font-size:.84rem;color:rgba(25,23,19,.56);cursor:pointer}" +
    "#bmr-edit-panel .off:hover{background:#faf6f0;color:#191713}" +
    "@media print{#bmr-edit{display:none}}";

  var panel = document.createElement("div");
  panel.id = "bmr-edit-panel";

  var html = '<div class="hd">Edit this page</div>';
  for (var i = 0; i < items.length; i++) {
    html += '<a href="' + ADMIN + items[i][0] + '">' + items[i][1] + "</a>";
  }
  if (page === "faq") {
    html += '<div class="note">The FAQ questions are not editable yet &mdash; ask Cole.</div>';
  }
  html += '<div class="off" id="bmr-edit-off">Turn off edit mode</div>';
  panel.innerHTML = html;

  var btn = document.createElement("button");
  btn.id = "bmr-edit-btn";
  btn.type = "button";
  btn.innerHTML = "<span>&#9998;</span><span>Edit</span>";

  wrap.appendChild(panel);
  wrap.appendChild(btn);

  function start() {
    document.head.appendChild(css);
    document.body.appendChild(wrap);

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      wrap.classList.toggle("open");
    });

    document.addEventListener("click", function (e) {
      if (!wrap.contains(e.target)) wrap.classList.remove("open");
    });

    document.getElementById("bmr-edit-off").addEventListener("click", function () {
      try { sessionStorage.removeItem(KEY); } catch (e) { /* nothing to clear */ }
      location.href = location.pathname;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
