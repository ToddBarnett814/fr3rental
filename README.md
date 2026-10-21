# Barnett Motorhome Rentals — website

The live site is https://fr3rental.netlify.app

Two things live in here:

- **The website itself** — the pages, styles, photos.
- **An editor at `/admin`** — where Todd changes text, prices and booked dates
  without touching any files.

---

## How it fits together

All the words, prices and dates on the site live in the **`content/`** folder - one file per section of the editor.

The `templates/` folder holds the page layouts with blanks in them, like
`{{home_headline}}`. `build.py` fills the blanks from `content.json` and writes
the finished pages.

Nobody runs `build.py` by hand. Netlify runs it automatically every time
anything changes. Edit in `/admin` → save → site updates in about a minute.

---

## Setup — do these once

### 1. Put this folder on GitHub

1. Go to github.com and sign in (create an account if needed).
2. Click **+** at the top right → **New repository**.
3. Name it `fr3rental`, leave it **Private**, click **Create repository**.
4. On the next page click **uploading an existing file**.
5. Drag everything in this folder into the browser. Click **Commit changes**.

### 2. Point Netlify at the repo instead of drag-and-drop

1. In Netlify open the **fr3rental** project (team: Pruetts).
2. **Project configuration → Build & deploy → Link repository**.
3. Choose GitHub, authorise it, pick the `fr3rental` repo.
4. Netlify reads `netlify.toml` and fills in the build settings itself —
   build command `python3 build.py`, publish directory `.`.
5. Deploy.

From now on, no more zips. A change in GitHub updates the site by itself.

### 3. Turn on logins for the editor

1. In Netlify: **Project configuration → Access control → OAuth**.
2. **Install provider → GitHub**, and follow the prompts.
3. Visit https://fr3rental.netlify.app/admin and click **Login with GitHub**.

Todd needs a free GitHub account, and you need to invite him to the repo:
**GitHub → the repo → Settings → Collaborators → Add people**.

---

## Using the editor

Go to `/admin`, log in, and you get eight sections:

| Section | What's in it |
|---|---|
| Phone, email and footer | Contact details, used everywhere on the site |
| Home page | Headline, intro, the stats, the three cards, the four steps |
| The RV page | Headings and intro paragraphs |
| Rates and fees | The three nightly rates, cleaning fee, deposit, pet fee, and the add-on list with prices |
| **Booked dates** | Add a row per booked trip — shows as unavailable on the calendar |
| Availability page and requirements | The booking page text and the six requirement cards |
| Contact page | Contact page text |
| Legal page | Rental terms, cancellation policy, privacy |
| Advanced | Website address and the Outdoorsy link — rarely touched |

Change something, click **Publish**. The site rebuilds and updates in about a
minute.

### The phone number is two fields

`Phone number (as shown on the site)` is what people read — `(661) 733-5757`.
`Phone number for call/text buttons` is what the buttons dial — `+16617335757`.
Change both or the buttons will dial the old number.

---

## What the editor can't do

- Add new pages, or move sections around. It edits what's there.
- Change the photo gallery on The RV page. The hero photo and the three
  home-page card photos can be swapped; the 14 gallery shots are fixed.
- Change the FAQ questions, the spec sheet or the equipment list. Those are
  still in `templates/`.

Any of that can be added later — it's the same pattern, just more fields.

---

## Still outstanding on the site itself

- **The rates page numbers are invented.** $225/$275/$325, the $150 cleaning
  fee, the $500 deposit and the worked example were placeholders from the
  original build and were never replaced with Todd's real figures. His
  Outdoorsy listing says $959/night.
- **The add-on prices all say "Ask."** These are editable now — Rates and fees
  → Add-ons.
- **The hero photo is an AI-generated image of a different motorhome.** Every
  other photo on the site is the real RV.
- **The booked dates currently in `content.json` are made up.** Replace them
  with real ones or clear them out — a calendar showing wrong availability is
  worse than no calendar.
- **The legal page's deposit and cancellation terms were written as a starting
  point, not from Todd's actual rental agreement.** Editable now — Legal page.

---

## Files

```
content/          every word, price and date on the site — the editor writes these
templates/        page layouts with {{blanks}} in them
build.py          fills the blanks, writes the finished pages
admin/            the editor (config.yml says which repo and what the fields are)
netlify.toml      tells Netlify how to build
styles.css        the design
assets/images/    photos
index.html …      generated pages — don't edit these by hand, they get overwritten
```

## Running it on your own machine

```bash
python3 build.py
python3 -m http.server 8000
```

Then open http://localhost:8000
