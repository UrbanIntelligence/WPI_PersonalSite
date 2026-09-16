# How to update News, Publications, Talks, Funding & Awards, Team, Teaching, and Service

These pages no longer contain hand-written HTML lists. Each one reads its content from a small JSON file in `data/`, and a shared script (`assets/render.js`) turns that data into the styled page automatically.

## Easiest way: the web editor

**[urbanintelligence.github.io/WPI_PersonalSite](https://urbanintelligence.github.io/WPI_PersonalSite/)** — a form-based editor (add / edit / delete, no JSON or HTML to write) that saves straight to the GitHub repo. Works on any of your devices; the first time on a new device you'll need a GitHub access token (steps are shown right on the page).

After saving there, the change is committed to GitHub immediately. To make it live on `users.wpi.edu`, either ask Claude Code to pull the latest and redeploy, or copy the changed `data/*.json` file(s) (and any new `img/` files) onto `public_html` yourself, same as `PUBLISH.md` describes.

## Manual way: editing the JSON directly

If you'd rather edit the files directly (or the web editor is unavailable), each file follows a simple format. **To add something new this way, you edit a JSON file, not the HTML.**

General rules for all the files below:
- Each item is one `{ ... }` block inside a list `[ ... ]`.
- To add an item: copy an existing block (including its `{` and `}`), paste it as a new entry, and edit the text inside the quotes.
- Keep the commas between items. The **last** item in a list has no trailing comma after its closing `}`.
- Links: write them as `<a href="https://...">text</a>` — same as any webpage link.
- Bold: `<b>text</b>`. Italics: `<i>text</i>`.
- After saving, open the page locally (or just redeploy) to check it looks right — a JSON syntax mistake (like a missing comma or quote) will make the whole list fail to load, showing a "couldn't load" message instead of crashing the rest of the page.
- Any online "JSON validator" (search that phrase) will catch syntax mistakes if a list stops working — paste the file contents in and it'll point at the exact error.

---

## News — `data/news.json`

Used by both `news.html` (the full archive, grouped by year) **and** the homepage's News card (auto-shows the 10 newest entries from this same file — always exactly 10, regardless of how many fall in any given year — nothing extra to update there, same pattern as Recent Publications).

```json
{
  "tag": "Paper",
  "date": "08/2026",
  "year": 2026,
  "html": "One paper was accepted by <a href=\"https://example.com\">SomeConf 2026</a>."
}
```

- `tag`: optional short label — `"Award"`, `"Paper"`, `"TPC"`, `"Talk"`, `"Students"`, or leave blank/`null` for no badge. Color is picked automatically from the word, same logic as everywhere else on the site.
- `date`: shown exactly as typed, e.g. `"08/2026"` or `"Nov. 2016"`.
- `year`: a plain number, used to group entries on the archive page and to determine the 10 newest for the homepage — keep it in sync with `date`.
- `html`: the description, links allowed.

New entries can go anywhere in the file — sorted automatically, newest year first.

---

## Publications — `data/publications.json`

Used by `res.html` (with the venue filter) **and** the homepage's "Recent Publications" (auto-pulls the latest 3 years in ICDM/ICML/NeurIPS/KDD from this same file — nothing extra to update there).

**In the web editor**, new publications use real form fields — a repeatable, drag-to-reorder author list (you're pre-filled in and bolded by default), a required title, an optional PDF upload (shows "[To be available soon]" until one is provided), and a Conference/Journal switch with the matching fields for each (dates, location, track, accepted/submitted counts with a live-computed acceptance ratio for conferences; journal name, status, and month/year for journals). The ID is generated for you. Within each year, entries are always ordered prestige venues first, then other conference papers, then journal papers — automatic, nothing to set.

That form saves a **structured** entry like this (you never need to write this by hand — this is just what ends up in the file):

```json
{
  "id": "pub-146",
  "year": 2026,
  "tag": "KDD'26",
  "venue": "KDD",
  "title": "Your Paper Title Goes Here",
  "fileUrl": null,
  "authors": [
    { "first": "Author", "last": "One" },
    { "first": "Yanhua", "last": "Li", "isMe": true },
    { "first": "Author", "last": "Three" }
  ],
  "kind": "conference",
  "conference": {
    "fullName": "the 32nd SIGKDD conference on Knowledge Discovery and Data Mining",
    "startDate": "2026-08-09",
    "endDate": "2026-08-13",
    "isUS": false,
    "city": "Jeju",
    "country": "Korea",
    "track": "",
    "accepted": null,
    "submitted": null
  }
}
```

A journal entry looks the same except `"kind": "journal"` and a `"journal"` block instead of `"conference"`:

```json
"journal": { "fullName": "Knowledge and Information Systems", "status": "Accepted", "statusMonth": "June", "statusYear": 2023 }
```

Notes if editing this by hand instead of the form:
- `authors`: the person with `"isMe": true` is bolded on the page; order in the array is the display order.
- `fileUrl`: a link, or `null` to show "[To be available soon]".
- `venue`: one of `"NeurIPS"`, `"KDD"`, `"ICML"`, `"ICDM"`, `"SIGSPATIAL"`, `"AAAI"`, `"SDM"`, `"IJCAI"`, `"WWW"`, `"ICDE"` for a top-tier venue (colored badge + filterable), or `null` otherwise.
- The **145 pre-existing entries** (from before this structured format existed) still use the old single-`html`-field format (`{ "id", "year", "tag", "venue", "html" }`) and keep working exactly as before — the web editor recognizes those and edits them with a simple text form instead. You never need to convert them.

New entries can go anywhere in the file — they get grouped by `year` and sorted automatically (prestige first, then conference, then journal within each year), newest year first.

---

## Talks — `data/talks.json`

```json
{
  "tag": "Invited Talk at MIT",
  "html": "Title of the talk, Department of Something, at MIT, Jan 2027, Cambridge, MA."
}
```

- `tag`: short label. Anything containing "invited" or "talk" gets the purple talk badge, "award" gets the red award badge, otherwise it gets a neutral blue badge — you don't need to pick a color, just describe it.
- `html`: the talk description with any links, same as existing entries.

---

## Funding & Awards — `data/funding.json`

```json
{
  "tag": "NSF Grant",
  "html": "PI, $500,000, NSF ABC Program, <a href=\"https://www.nsf.gov/...\">CNS-1234567</a>, Jan 1, 2027–Dec 31, 2029."
}
```

`tag` is the label text, and its color is picked automatically from keywords in the text — you don't choose a color directly:

| Contains | Color | Example |
| --- | --- | --- |
| "NSF" | blue | `"NSF Grant"` |
| "Industry" | teal | `"Industry Grant"`, `"Industry Support"` |
| "WPI" or "Seed" | purple | `"WPI Seed Grant"` |
| "Impact" or "Best Paper" | gold | `"10-Year Impact Award"`, `"Best Paper Award"` |
| "Award" (anything else) | red | `"Travel Award"` |
| none of the above | blue-gray | falls back to a neutral tag |

This same color logic is reused for the `[NSF]` / `[Industry]` tags on the homepage's Research Projects section, so both pages always stay visually consistent — no separate place to update.

---

## Team — `data/team.json`

This one is a single object with four lists instead of one flat list:

```json
{
  "faculty": [ { "img": "yll.jpg", "name": "Yanhua Li", "link": null, "bio": "..." } ],
  "currentPhD": [
    { "img": "NewStudent.jpg", "name": "New Student", "link": "http://users.wpi.edu/~newstudent/", "bio": "PhD Student, Data Science, WPI<br>M.S., Somewhere, 2024<br>B.S., Somewhere Else, 2022" }
  ],
  "pastPhD": [ ... ],
  "pastMastersInterns": [ "Plain text entry with a name and what happened to them &rarr; now at Some Company." ]
}
```

To add a new current PhD student: add a `{ ... }` block to the `currentPhD` list.
- `img`: filename only, must already exist in the `img/` folder (drop the photo file into `img/` first, same folder as the other student photos).
- `link`: their personal page URL in quotes, or `null` (no quotes) if they don't have one.
- `bio`: lines separated by `<br>`, same style as existing entries.

When a current student graduates, move their `{ ... }` block from `currentPhD` to `pastPhD` and update the `bio` text (e.g. add "Now at ..." and their defense year), same as today.

`pastMastersInterns` is just a list of plain text strings (with `&rarr;` for the arrow, same as today), not objects.

---

## Teaching — `data/teaching.json`

```json
{
  "course": "CS599: New Course Title",
  "offerings": ["2027 Fall"]
}
```

`offerings` is a list of terms — each one renders as its own tag on the page. **In the web editor**, each term shows as a small removable chip with an "×", plus a box to type a new one and press Enter to add it — no commas or JSON to edit by hand. Editing the JSON directly works the same way: add a new string to the list, e.g. `["2026 Fall", "2027 Fall"]`.

---

## Service — `data/service.json` (+ `data/service-venues.json`)

**In the web editor**, Role and Venue are both dropdowns built from whatever values already exist in the data — pick one, or choose "+ Add new..." to type one that isn't there yet. For a handful of recurring venues (AAAI, KDD, NeurIPS, SIGSPATIAL, IJCAI, UrbComp, ICDE, ICDCS, ICCCN, INFOCOM, ICDIM, MobiGIS — auto-detected from your history), picking the venue and typing a year auto-suggests the right wording, including the correct edition number (e.g. picking KDD + 2027 suggests "the 33rd ACM SIGKDD Conference..." automatically) — a "Regenerate" button recomputes it if you change the year. You can still edit the suggested text freely, or type it from scratch for a venue with no known pattern yet.

That produces an entry like this (you don't need to write this by hand):

```json
{
  "role": "Technical Program Committee",
  "venue": "KDD",
  "year": 2027,
  "url": "https://kdd2027.org",
  "detail": "the 33rd ACM SIGKDD Conference on Knowledge Discovery and Data Mining"
}
```

- `role`: shown as a colored badge, and used to group entries — all your Program Chair roles together, all your Technical Program Committee roles together, etc. Groups are ordered by that role's most recent year (whichever role you've been most recently active in leads).
- `venue`: the recurring conference/workshop short name. Used to find a wording template if one is known.
- `year`: sorts entries within a role, newest first.
- `url` / `detail`: the specific link and description for that year. Composed into `<a href="url">venue year: detail</a>.` when the page renders.

For a one-off item that doesn't belong to a recurring venue (like an NSF panel summary), leave Venue as "(none)" — it falls back to a plain `{ "role": "...", "year": ..., "html": "..." }` shape instead, same as the other simple pages.

`data/service-venues.json` holds the auto-detected wording templates (one entry per recurring venue, with the pattern and a reference year/edition number to compute future years from). It's derived from your existing history rather than something you'd typically hand-edit — adding a brand-new venue through the web editor just adds a plain dropdown option with no template, which is expected since there's no history yet to learn a pattern from.

---

## Sync Log — `data/sync-log.json`

The **Sync Log** tab in the [web editor](https://urbanintelligence.github.io/WPI_PersonalSite/) is read-only — it shows every time `Sync to WPI.app` (or `sync-to-wpi.sh`) has been run, on any of your Macs: timestamp, machine name, a ✅/➖/❌ status, and an expandable full log. Each run appends its own entry automatically; there's nothing to edit here yourself.

## Publishing your changes

After editing any `data/*.json` file (or images in `img/`), copy the changed files onto `public_html` the same way described in `PUBLISH.md` — just the files you actually changed need to go over; you don't need to re-copy the whole site each time.
