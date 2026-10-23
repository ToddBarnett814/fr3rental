#!/usr/bin/env python3
"""
Barnett Motorhome Rentals - site builder.

Reads content.json, fills in the templates, writes the finished pages.
Nobody needs to run this by hand: Netlify runs it on every change.

    python3 build.py
"""

import json
import os
import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATES = os.path.join(HERE, "templates")

PAGES = [
    "index.html", "the-rv.html", "rates.html", "book.html", "faq.html",
    "contact.html", "legal.html", "thanks.html", "404.html", "script.js",
    "edit.js", "agreement.html", "agreement.js",
]

# pages listed in sitemap.xml (not 404 / thanks / the script)
SITEMAP_PAGES = [
    "index.html", "the-rv.html", "rates.html", "book.html",
    "faq.html", "contact.html", "legal.html",
]


def load_content():
    """Every file in content/ is one section of the editor. Merge them."""
    folder = os.path.join(HERE, "content")
    flat = {}
    for name in sorted(os.listdir(folder)):
        if not name.endswith(".json"):
            continue
        with open(os.path.join(folder, name), encoding="utf-8") as f:
            section = json.load(f)
        if isinstance(section, dict):
            flat.update(section)
    return flat


def num(v):
    """'2.50' -> 2.5, anything unparseable -> 0."""
    try:
        return float(str(v).replace("$", "").replace(",", "").strip())
    except (TypeError, ValueError):
        return 0.0


def derived(content):
    """Fields that are built from a list the editor manages."""
    out = {}

    rows = content.get("addons") or []

    UNIT_LABEL = {
        "each": "",
        "person": "per person",
        "person-day": "per person, per day",
        "flat": "",
    }

    def money(v):
        try:
            f = float(v)
        except (TypeError, ValueError):
            return str(v)
        return ("$%.2f" % f).replace(".00", "")

    # the printed list on the rates page
    lines = []
    for r in rows:
        price = money(r.get("price", ""))
        if str(r.get("price", "")).strip() in ("0", "0.00", ""):
            price = "Included"
        unit = UNIT_LABEL.get(r.get("unit", "flat"), "")
        lines.append('        <li>%s<b>%s%s</b></li>'
                     % (r.get("name", ""), price, (" " + unit) if unit else ""))
    out["addons_html"] = "\n".join(lines)

    # tick boxes on the booking form
    boxes = []
    for r in rows:
        name = r.get("name", "")
        if str(r.get("price", "")).strip() in ("0", "0.00", ""):
            continue  # free, nothing to request
        price = money(r.get("price", ""))
        unit = UNIT_LABEL.get(r.get("unit", "flat"), "")
        tail = ' <span class="p">%s%s</span>' % (price, (" " + unit) if unit else "")
        boxes.append(
            '            <label><input type="checkbox" name="addons" value="%s">'
            '<span>%s</span>%s</label>'
            % (name.replace('"', "&quot;"), name, tail)
        )
    out["addons_checkboxes"] = "\n".join(boxes)

    # everything the price calculator needs, as one blob
    keys = ("rate_day", "fee_insurance_day", "fee_prep", "fee_dump", "fee_cleaning",
            "fee_deposit", "fee_pet", "fee_delivery_mile",
            "miles_per_day", "miles_extra", "gen_hours_per_day", "gen_extra",
            "fuel_gal", "propane_gal", "fee_late", "fee_excess_clean")
    out["rates_json"] = json.dumps({
        "nums": {k: num(content.get(k)) for k in keys},
        "addons": [
            {"name": r.get("name", ""), "price": num(r.get("price")),
             "unit": r.get("unit", "flat"), "note": r.get("note", "")}
            for r in rows
        ],
    })

    for key in ("legal_terms", "legal_cancellation", "legal_privacy"):
        text = content.get(key, "")
        paras = [p.strip() for p in text.split("\n\n") if p.strip()]
        out[key] = "\n    ".join("<p>%s</p>" % p.replace("\n", " ") for p in paras)

    return out


def render(template, content):
    """Replace every {{key}} with its value from content.json."""
    out = template
    missing = []
    for key, value in content.items():
        if key == "booked_ranges":
            # editor stores {start, end}; the calendar wants ["start", "end"]
            value = json.dumps([[r["start"], r["end"]] for r in value])
        elif isinstance(value, (list, dict)):
            value = json.dumps(value)
        out = out.replace("{{%s}}" % key, str(value))
    # anything still unresolved is a typo somewhere - surface it loudly
    start = 0
    while True:
        i = out.find("{{", start)
        if i == -1:
            break
        j = out.find("}}", i)
        if j == -1:
            break
        missing.append(out[i + 2:j])
        start = j + 2
    return out, missing


def write_sitemap(content):
    today = datetime.date.today().isoformat()
    base = content.get("site_url", "").rstrip("/")
    urls = "".join(
        "  <url><loc>%s/%s</loc><lastmod>%s</lastmod></url>\n" % (base, p, today)
        for p in SITEMAP_PAGES
    )
    with open(os.path.join(HERE, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n'
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                + urls + "</urlset>\n")

    with open(os.path.join(HERE, "robots.txt"), "w", encoding="utf-8") as f:
        f.write("User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n" % base)


def main():
    content = load_content()
    content.update(derived(content))
    problems = []

    for name in PAGES:
        src = os.path.join(TEMPLATES, name)
        if not os.path.exists(src):
            problems.append("missing template: %s" % name)
            continue
        with open(src, encoding="utf-8") as f:
            template = f.read()
        out, missing = render(template, content)
        if missing:
            problems.append("%s has unfilled fields: %s" % (name, ", ".join(sorted(set(missing)))))
        with open(os.path.join(HERE, name), "w", encoding="utf-8") as f:
            f.write(out)
        print("wrote", name)

    write_sitemap(content)
    print("wrote sitemap.xml, robots.txt")

    if problems:
        print("\nPROBLEMS:")
        for p in problems:
            print("  -", p)
        raise SystemExit(1)

    print("\nDone. %d fields filled in." % len(content))


if __name__ == "__main__":
    main()
