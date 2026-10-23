/* ------------------------------------------------------------------
   Rental agreement.

   The owner fills in dates and the agreed rate, copies the link, and
   sends it to the renter. The renter fills in the rest and the
   agreement below fills itself in as they go. They print it and both
   sign at handoff.
   ------------------------------------------------------------------ */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var N = RATES.nums, ADD = RATES.addons || [];
  var UNIT = { each: "", person: "per person", "person-day": "per person, per day", flat: "" };

  function usd(n) {
    var d = n % 1 === 0 ? 0 : 2;
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function pretty(iso, time) {
    if (!iso) return "";
    var p = iso.split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    var s = d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    return time ? s + ", " + hhmm(time) : s;
  }
  function hhmm(t) {
    var p = t.split(":"), h = +p[0], m = p[1];
    var ap = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    return h + ":" + m + " " + ap;
  }
  /* rental days are counted inclusive: the 24th to the 28th is 5 days */
  function dayCount(a, b) {
    if (!a || !b) return 0;
    var d = (new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000;
    return d >= 0 ? Math.round(d) + 1 : 0;
  }

  /* ---------------------------------------------------------- owner link */
  var q = new URLSearchParams(location.search);
  var PARAMS = {
    h: "#aHandoff", ht: "#aHandoffT", r: "#aReturn", rt: "#aReturnT",
    f: "#aFrom", t: "#aTo", rate: "#aRate", gen: "#aGen", mi: "#aMi", n: "#aNotes"
  };
  Object.keys(PARAMS).forEach(function (k) {
    if (q.get(k)) $(PARAMS[k]).value = q.get(k);
  });
  if (q.get("h") && q.get("r")) $("#agSetup").style.display = "none";

  /* charged dates default to the handoff dates */
  function syncCharged() {
    if (!$("#aFrom").value) $("#aFrom").value = $("#aHandoff").value;
    if (!$("#aTo").value) $("#aTo").value = $("#aReturn").value;
  }
  $("#aHandoff").addEventListener("change", function () {
    if (!q.get("f")) $("#aFrom").value = this.value;
  });
  $("#aReturn").addEventListener("change", function () {
    if (!q.get("t")) $("#aTo").value = this.value;
  });
  syncCharged();

  $("#aLink").addEventListener("click", function () {
    syncCharged();
    var u = location.origin + location.pathname +
            "?h=" + $("#aHandoff").value + "&ht=" + $("#aHandoffT").value +
            "&r=" + $("#aReturn").value + "&rt=" + $("#aReturnT").value +
            "&f=" + $("#aFrom").value + "&t=" + $("#aTo").value +
            "&rate=" + $("#aRate").value +
            "&gen=" + $("#aGen").value + "&mi=" + $("#aMi").value +
            "&n=" + encodeURIComponent($("#aNotes").value);
    if (navigator.clipboard) navigator.clipboard.writeText(u);
    var m = $("#aLinkMsg");
    m.textContent = "Link copied: " + u;
    m.style.display = "block";
  });

  /* ---------------------------------------------------------- add-ons */
  ADD.forEach(function (a, i) {
    if (!a.price) return;
    var row = document.createElement("label");
    row.className = "calc-add";
    var unit = UNIT[a.unit] || "";
    row.innerHTML =
      '<span class="n">' + a.name + (a.note ? '<span class="sub">' + a.note + "</span>" : "") + "</span>" +
      '<span class="pr">' + usd(a.price) + (unit ? " " + unit : "") + "</span>";
    row.innerHTML += a.unit === "each"
      ? '<input type="number" class="qty" min="0" max="' + (a.max || 20) + '" value="0" data-i="' + i + '">'
      : '<input type="checkbox" class="tick" data-i="' + i + '">';
    $("#aAddons").appendChild(row);
  });

  function lineFor(a, on, days, people) {
    if (!a.price || !on) return 0;
    if (a.unit === "each") return a.price * on;
    if (a.unit === "person") return a.price * people;
    if (a.unit === "person-day") return a.price * people * days;
    return a.price;
  }

  /* ---------------------------------------------------------- fill it in */
  function render() {
    var handoff = $("#aHandoff").value, ret = $("#aReturn").value;
    syncCharged();
    var from = $("#aFrom").value || handoff, to = $("#aTo").value || ret;

    var heldDays = dayCount(handoff, ret);        // how long they have it
    var days = dayCount(from, to) || heldDays;    // what he is charging for

    /* nothing is worth showing until the dates make sense */
    if (!heldDays) {
      $("#dTable").querySelector("tbody").innerHTML =
        "<tr><td colspan='3' class='n'>" +
        (handoff && ret ? "The return date is before the handoff date."
                        : "Fill in the handoff and return dates above.") +
        "</td></tr>";
      ["#dCharged", "#dNote", "#dIncl"].forEach(function (id) { $(id).textContent = ""; });
      $("#dReturnFees").innerHTML = "";
      return;
    }

    var freeDays = Math.max(0, heldDays - days);
    var overcharged = days > heldDays;

    var rate = parseFloat($("#aRate").value) || N.rate_day;
    var genDay = parseFloat($("#aGen").value);
    if (isNaN(genDay)) genDay = N.gen_hours_per_day;
    var miDay = parseFloat($("#aMi").value);
    if (isNaN(miDay)) miDay = N.miles_per_day;
    var people = Math.max(1, parseInt($("#aPpl").value, 10) || 1);
    var pets = $("#aPets").value === "1";
    var miles = Math.max(0, parseInt($("#aMiles").value, 10) || 0);

    var name = $("#aName").value.trim();
    $("#dName").textContent = name || "—";
    $("#dName2").textContent = name || "the Renter";

    var dates = handoff && ret
      ? "HANDOFF: " + pretty(handoff, $("#aHandoffT").value) +
        "   ·   RETURN: " + pretty(ret, $("#aReturnT").value)
      : "—";
    $("#dDates").textContent = dates;
    $("#dDates2").textContent = handoff && ret
      ? pretty(handoff) + " to " + pretty(ret) : "the dates above";

    $("#dCharged").textContent =
      overcharged
        ? "CHECK THESE DATES: charging " + days + " days but the RV is only out for " + heldDays + "."
      : freeDays
        ? "CHARGED: " + pretty(from) + " to " + pretty(to) + "   \u00b7   " + days +
          " rental day" + (days === 1 ? "" : "s") + ".   " + freeDays + " day" +
          (freeDays === 1 ? "" : "s") + " at no charge."
        : "";
    $("#dCharged").style.color = overcharged ? "#b0562f" : "";
    $("#dCharged").style.fontWeight = overcharged ? "700" : "";

    $("#dIncl").textContent = days + " rental day" + (days === 1 ? " includes " : "s include ") +
      (days * miDay) + " miles and " + (days * genDay) + " generator hours." +
      (freeDays ? " The " + freeDays + " extra day" + (freeDays === 1 ? "" : "s") +
       " of possession carry no charge and no additional allowance." : "");

    /* ---- the table ---- */
    var rows = [], subtotal = 0;
    function line(label, note, amount) {
      rows.push("<tr><td>" + label + "</td><td class='n'>" + (note || "") +
                "</td><td class='a'>" + (amount === null ? "" : usd(amount)) + "</td></tr>");
    }

    subtotal += rate * days;
    line("Rate", usd(rate) + "/day &times; " + days, rate * days);

    if (freeDays) {
      line("Early pickup / late return", freeDays + " day" + (freeDays === 1 ? "" : "s") +
           " of possession, not charged", 0);
    }

    subtotal += N.fee_insurance_day * days;
    line("Insurance", usd(N.fee_insurance_day) + "/day &times; " + days + ", $500,000 policy", N.fee_insurance_day * days);

    subtotal += N.fee_prep; line("Prep fee", "", N.fee_prep);
    subtotal += N.fee_dump;  line("Dump and flush", "", N.fee_dump);
    subtotal += N.fee_cleaning; line("Cleaning", "Refundable if returned clean", N.fee_cleaning);

    if (pets) { subtotal += N.fee_pet; line("Dogs", "Limit 2. Cleaning only — damage is separate", N.fee_pet); }
    if (miles) {
      subtotal += N.fee_delivery_mile * miles;
      line("Delivery", usd(N.fee_delivery_mile) + "/mile &times; " + miles + " round trip", N.fee_delivery_mile * miles);
    }

    var chosen = [];
    $$(".calc-add .qty, .calc-add .tick", $("#aAddons")).forEach(function (inp) {
      var a = ADD[+inp.dataset.i];
      var on = inp.type === "checkbox" ? (inp.checked ? 1 : 0) : (parseInt(inp.value, 10) || 0);
      var amt = lineFor(a, on, days, people);
      if (!amt) return;
      subtotal += amt;
      var note = a.unit === "each" ? on + " × " + usd(a.price)
               : a.unit === "person" ? usd(a.price) + " × " + people + " people"
               : a.unit === "person-day" ? usd(a.price) + " × " + people + " × " + days + " days"
               : "";
      line(a.name, note, amt);
      chosen.push(a.name + (a.unit === "each" ? " x" + on : ""));
    });

    var hold = Math.floor((rate / 2) * days);
    var balance = subtotal + N.fee_deposit - hold;

    rows.push("<tr class='sum'><td>Initial subtotal</td><td class='n'>Not including the security deposit</td><td class='a'>" + usd(subtotal) + "</td></tr>");
    rows.push("<tr><td>Security deposit</td><td class='n'>Refundable</td><td class='a'>" + usd(N.fee_deposit) + "</td></tr>");
    rows.push("<tr><td>Reservation deposit</td><td class='n'>Half the daily rate &times; " + days + ", nonrefundable, applied to the subtotal</td><td class='a'>− " + usd(hold) + "</td></tr>");
    rows.push("<tr class='sum big'><td>Due at handoff</td><td class='n'>Including the security deposit</td><td class='a'>" + usd(balance) + "</td></tr>");

    $("#dTable").querySelector("tbody").innerHTML = rows.join("");

    var note = $("#aNotes").value.trim();
    $("#dNote").textContent = note ? "Note: " + note : "";
    $("#dNote").style.display = note ? "block" : "none";

    /* ---- settled on return ---- */
    $("#dReturnFees").innerHTML = [
      "Fuel at " + usd(N.fuel_gal) + " a gallon for what is used.",
      "Propane at " + usd(N.propane_gal) + " a gallon for what is used.",
      "Miles over " + (days * miDay) + " at " + usd(N.miles_extra) + " a mile.",
      "Generator hours over " + (days * genDay) + " at " + usd(N.gen_extra) + " an hour.",
      "Toll roads, recorded by the transponder.",
      "Late return, " + usd(N.fee_late) + ". Excess cleaning, " + usd(N.fee_excess_clean) + ", if needed.",
    ].map(function (t) { return "<li>" + t + "</li>"; }).join("");

    /* ---- what gets emailed ---- */
    $("#hDates").value = dates;
    $("#hRate").value = usd(rate) + "/day x " + days + " days" +
      (freeDays ? " (plus " + freeDays + " free)" : "");
    $("#hAddons").value = chosen.join(", ") || "none";
    $("#hNotes").value = note;
    $("#hSubtotal").value = usd(subtotal);
    $("#hHold").value = usd(hold);
    $("#hBalance").value = usd(balance);
  }

  document.addEventListener("input", render);
  document.addEventListener("change", render);
  $("#agPrint").addEventListener("click", function () { window.print(); });
  render();
})();
