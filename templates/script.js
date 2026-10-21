/* ============================================================
   {{business_name}} — site behavior
   ============================================================ */

// ---- EDIT THESE TWO ----------------------------------------
var OWNER_EMAIL = "{{email}}";
var OWNER_PHONE = "{{phone_link}}";

/* Dates already booked. Format: ["YYYY-MM-DD","YYYY-MM-DD"] (inclusive).
   Update this list by hand as trips get booked, then redeploy. */
var BOOKED_RANGES = {{booked_ranges}};
// -------------------------------------------------------------

(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- year ---------- */
  var y = $("#year");
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- mobile nav ---------- */
  var toggle = $("#navToggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$("#mainNav a").forEach(function (a) {
      a.addEventListener("click", function () { document.body.classList.remove("nav-open"); });
    });
  }

  /* ---------- header shadow ---------- */
  var header = $(".site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- reveal on scroll ---------- */
  var reveals = $$(".reveal");
  if (reveals.length) {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
      reveals.forEach(function (el) { io.observe(el); });
      // safety net: never leave content invisible
      setTimeout(function () { reveals.forEach(function (el) { el.classList.add("in"); }); }, 3000);
    } else {
      reveals.forEach(function (el) { el.classList.add("in"); });
    }
  }

  /* ---------- gallery filter + lightbox ---------- */
  var grid = $("#galGrid");
  if (grid) {
    var items = $$(".gal-item", grid);

    $$("#galFilters button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$("#galFilters button").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var f = btn.dataset.filter;
        items.forEach(function (it) {
          it.classList.toggle("hide", f !== "all" && it.dataset.cat !== f);
        });
      });
    });

    var lb = document.createElement("div");
    lb.className = "lightbox";
    lb.innerHTML =
      '<button class="lb-btn lb-close" aria-label="Close">&times;</button>' +
      '<button class="lb-btn lb-prev" aria-label="Previous">&#8249;</button>' +
      '<img alt="">' +
      '<button class="lb-btn lb-next" aria-label="Next">&#8250;</button>' +
      '<p class="lb-cap"></p>';
    document.body.appendChild(lb);

    var lbImg = $("img", lb), lbCap = $(".lb-cap", lb), idx = 0;

    function visible() { return items.filter(function (i) { return !i.classList.contains("hide"); }); }

    function show(i) {
      var list = visible();
      if (!list.length) return;
      idx = (i + list.length) % list.length;
      var el = list[idx];
      lbImg.src = el.dataset.full;
      lbImg.alt = el.dataset.cap || "";
      lbCap.textContent = (idx + 1) + " / " + list.length + " · " + (el.dataset.cap || "");
    }

    function open(i) { show(i); lb.classList.add("open"); document.body.style.overflow = "hidden"; }
    function close() { lb.classList.remove("open"); document.body.style.overflow = ""; }

    items.forEach(function (el) {
      el.addEventListener("click", function () { open(visible().indexOf(el)); });
    });
    $(".lb-close", lb).addEventListener("click", close);
    $(".lb-next", lb).addEventListener("click", function (e) { e.stopPropagation(); show(idx + 1); });
    $(".lb-prev", lb).addEventListener("click", function (e) { e.stopPropagation(); show(idx - 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target === lbImg) close(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") show(idx + 1);
      if (e.key === "ArrowLeft") show(idx - 1);
    });
  }

  /* ---------- FAQ accordion ---------- */
  $$(".faq-item").forEach(function (item) {
    var q = $(".faq-q", item), a = $(".faq-a", item);
    q.addEventListener("click", function () {
      var isOpen = item.classList.contains("open");
      $$(".faq-item.open").forEach(function (other) {
        other.classList.remove("open");
        $(".faq-a", other).style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add("open");
        a.style.maxHeight = a.scrollHeight + "px";
      }
    });
  });

  /* ---------- availability calendar ---------- */
  var calGrid = $("#calGrid");
  if (calGrid) {
    var calLabel = $("#calLabel"), calDow = $("#calDow"), readout = $("#calReadout"),
        textBtn = $("#calTextBtn");
    var view = new Date(); view.setDate(1);
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var start = null, end = null;

    var booked = {};
    function block(from, to) {
      var d = new Date(from + "T00:00:00"), stop = new Date(to + "T00:00:00");
      while (d <= stop) { booked[key(d)] = true; d.setDate(d.getDate() + 1); }
    }
    BOOKED_RANGES.forEach(function (r) { block(r[0], r[1]); });

    /* Bookings made on Outdoorsy, pulled in live. If this fails for any
       reason the calendar still shows the dates entered by hand. */
    if (window.fetch) {
      fetch("/.netlify/functions/outdoorsy")
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
          if (!data || !data.ranges || !data.ranges.length) return;
          data.ranges.forEach(function (r) { block(r[0], r[1]); });
          // a date the visitor already picked may have just become unavailable
          if (start && booked[key(start)]) { start = null; end = null; }
          if (end && booked[key(end)]) { end = null; }
          render();
          update();
        })
        .catch(function () { /* keep the hand-entered dates */ });
    }

    function key(d) {
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }
    function fmt(d) {
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    }

    ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].forEach(function (d) {
      var s = document.createElement("div"); s.className = "cal-dow"; s.textContent = d; calDow.appendChild(s);
    });

    function render() {
      calGrid.innerHTML = "";
      calLabel.textContent = view.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      var first = new Date(view.getFullYear(), view.getMonth(), 1);
      var days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();

      for (var i = 0; i < first.getDay(); i++) {
        var pad = document.createElement("div"); pad.className = "cal-day empty"; calGrid.appendChild(pad);
      }
      for (var n = 1; n <= days; n++) {
        var d = new Date(view.getFullYear(), view.getMonth(), n);
        var cell = document.createElement("div");
        cell.className = "cal-day";
        cell.textContent = n;
        cell.dataset.date = key(d);

        if (d < today) cell.classList.add("past");
        else if (booked[key(d)]) cell.classList.add("booked");
        else {
          if (start && key(d) === key(start)) cell.classList.add("sel");
          if (end && key(d) === key(end)) cell.classList.add("sel");
          if (start && end && d > start && d < end) cell.classList.add("inrange");
          cell.addEventListener("click", pick);
        }
        calGrid.appendChild(cell);
      }
    }

    function pick(e) {
      var d = new Date(e.currentTarget.dataset.date + "T00:00:00");
      if (!start || (start && end)) { start = d; end = null; }
      else if (d <= start) { start = d; }
      else {
        // reject a range that crosses a booked night
        var probe = new Date(start), clean = true;
        while (probe <= d) { if (booked[key(probe)]) { clean = false; break; } probe.setDate(probe.getDate() + 1); }
        if (!clean) { start = d; end = null; }
        else end = d;
      }
      render();
      update();
    }

    function update() {
      if (start && end) {
        var nights = Math.round((end - start) / 86400000);
        readout.innerHTML = fmt(start) + " → " + fmt(end) + " <span>· " + nights + " night" + (nights === 1 ? "" : "s") + "</span>";
        if (textBtn) {
          textBtn.href = "sms:" + OWNER_PHONE + "?&body=" + encodeURIComponent(
            "Hi! Is the FR3 available " + fmt(start) + " to " + fmt(end) + " (" + nights + " nights)?"
          );
        }
        var bs = $("#bStart"), be = $("#bEnd");
        if (bs) bs.value = key(start);
        if (be) be.value = key(end);
      } else if (start) {
        readout.innerHTML = fmt(start) + " <span>· now pick your return date</span>";
      } else {
        readout.innerHTML = "<span>Pick your pickup and return dates above.</span>";
      }
    }

    $("#calPrev").addEventListener("click", function () { view.setMonth(view.getMonth() - 1); render(); });
    $("#calNext").addEventListener("click", function () { view.setMonth(view.getMonth() + 1); render(); });
    render(); update();
  }

  /* forms post directly to Netlify Forms — no JS needed */
})();
