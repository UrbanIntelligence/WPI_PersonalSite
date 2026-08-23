# How to update Publications, Talks, Funding & Awards, Team, Teaching, and Service

These six pages no longer contain hand-written HTML lists. Each one reads its content from a small JSON file in `data/`, and a shared script (`assets/render.js`) turns that data into the styled page automatically.

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

## Publications — `data/publications.json`

Used by `res.html` (with the venue filter) **and** the homepage's "Recent Publications" (auto-pulls the latest 3 years in ICDM/ICML/NeurIPS/KDD from this same file — nothing extra to update there).

```json
{
  "id": "pub-146",
  "year": 2026,
  "tag": "KDD'26",
  "venue": "KDD",
  "html": "Author One, Author Two, <b>Yanhua Li</b>, and Author Three,<br><b>Your Paper Title Goes Here.</b>[PDF]<br><i>the 32nd SIGKDD conference on Knowledge Discovery and Data Mining, August 2026.</i>"
}
```

- `id`: must be unique across the whole file. Easiest: use the next number after the last `pub-N` in the file (check the bottom of the file for the highest number so far).
- `tag`: the short badge text shown on the entry, e.g. `"KDD'26"`, `"TKDE"`, `"AAAI'27"`.
- `venue`: one of `"NeurIPS"`, `"KDD"`, `"ICML"`, `"ICDM"`, `"SIGSPATIAL"`, `"AAAI"`, `"SDM"`, `"IJCAI"`, `"WWW"`, `"ICDE"` if this is one of those top-tier venues (it'll get the colored badge and show up in the filter chips and counts automatically) — or `null` (no quotes) if it's a journal/workshop/other venue that shouldn't be highlighted or filterable.
- `html`: authors, bolded title, links, and italicized venue details — same style as every existing entry. Copy one that's close to what you need and edit the text.

New entries can go anywhere in the file — they get grouped and sorted by `year` automatically, newest year first.

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

Every item on this page always shows with the same red "award" badge, so `tag` is just the label text (e.g. `"NSF Grant"`, `"Industry Grant"`, `"Best Paper Award"`) — no color to think about.

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
  "offerings": "2027 Fall"
}
```

To add a new semester to an existing course, just edit that course's `offerings` string and add the new term to the end (e.g. `"...2026 Fall, 2027 Fall"`).

---

## Service — `data/service.json`

```json
{
  "html": "Technical Program Committee, <a href=\"https://example.com\">SomeConf 2027: The 1st Conference on Something</a>."
}
```

Simplest of the six — just one field, no tag/badge. Add a new `{ "html": "..." }` block anywhere in the list.

---

## Publishing your changes

After editing any `data/*.json` file (or images in `img/`), copy the changed files onto `public_html` the same way described in `PUBLISH.md` — just the files you actually changed need to go over; you don't need to re-copy the whole site each time.
