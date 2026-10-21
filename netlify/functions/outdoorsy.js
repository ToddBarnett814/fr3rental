/* ------------------------------------------------------------------
   Reads Todd's Outdoorsy calendar and hands the website the dates
   that are already booked.

   The calendar link is private - anyone with it can see the booking
   dates - so it is NOT in this repository. It lives in Netlify under
   Project configuration > Environment variables, named:

       OUTDOORSY_ICAL_URL

   If it is missing, or Outdoorsy is down, this returns an empty list
   and the website just falls back to the dates typed in by hand.
   ------------------------------------------------------------------ */

const CACHE_SECONDS = 900; // Outdoorsy only refreshes every 2 hours anyway

exports.handler = async function (event) {
  const url = process.env.OUTDOORSY_ICAL_URL;
  if (!url) return reply({ ranges: [], note: "OUTDOORSY_ICAL_URL is not set" });

  let text;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "barnett-motorhome-rentals-website" },
    });
    if (!res.ok) return reply({ ranges: [], note: "outdoorsy returned " + res.status });
    text = await res.text();
  } catch (err) {
    return reply({ ranges: [], note: "could not reach outdoorsy" });
  }

  const ranges = parse(text);
  const body = { ranges: ranges };
  if (event && event.queryStringParameters && event.queryStringParameters.debug) {
    body.events = countEvents(text);
    body.bytes = text.length;
  }
  return reply(body);
};

function reply(body) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=" + CACHE_SECONDS,
    },
    body: JSON.stringify(body),
  };
}

function countEvents(ics) {
  const m = ics.match(/BEGIN:VEVENT/g);
  return m ? m.length : 0;
}

/* Turn the calendar file into [["2026-06-10","2026-06-14"], ...] -
   first night booked through last night booked, inclusive. */
function parse(ics) {
  // unfold: a line starting with a space or tab continues the one before it
  const lines = ics.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");

  const out = [];
  let inEvent = false, start = null, end = null;

  for (const line of lines) {
    if (line.indexOf("BEGIN:VEVENT") === 0) { inEvent = true; start = end = null; continue; }
    if (line.indexOf("END:VEVENT") === 0) {
      if (start) {
        // DTEND in a calendar file is the morning they leave, so the last
        // night booked is the day before it
        let last = end ? shift(end, -1) : start;
        if (last < start) last = start;
        out.push([start, last]);
      }
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;
    if (line.indexOf("DTSTART") === 0) start = dateOf(line);
    else if (line.indexOf("DTEND") === 0) end = dateOf(line);
  }
  return out;
}

/* "DTSTART;VALUE=DATE:20260610" or "DTSTART:20260610T160000Z" -> "2026-06-10" */
function dateOf(line) {
  const i = line.indexOf(":");
  if (i === -1) return null;
  const raw = line.slice(i + 1).trim();
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? m[1] + "-" + m[2] + "-" + m[3] : null;
}

function shift(iso, days) {
  const p = iso.split("-");
  const d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// exported for the test script
exports._parse = parse;
