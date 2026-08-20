# Personal website redesign implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild all 10 pages of https://users.wpi.edu/~yli15/ in a modern "crimson academic" static HTML/CSS design, preserving all existing content, with a filterable prestige-venue view on the publications page.

**Architecture:** Static HTML files, one shared `style.css`, no build step. Each page gets the same header/nav markup pasted at the top (no templating available on WPI static hosting). Content sourced from `site_source/*.html` (already fetched from the live site) — never invented.

**Tech Stack:** Plain HTML5, CSS3 (custom properties, flexbox/grid, media queries), vanilla JS (no dependencies) for the publications filter only.

## Global Constraints

- Homepage must be named `index.html`. All other filenames must stay identical to today's: `res.html`, `talk.html`, `proj.html`, `fund.html`, `team.html`, `teach.html`, `serve.html`, `REU.html`, `cv.html`.
- No server-side code, no build tooling — everything must work when copied as-is into `public_html`.
- All content (bio, news, publications, talks, projects, funding, team, teaching, service, REU, contact) must match `site_source/*.html` — restyled, not reworded or fabricated.
- Prestige venues (for publications highlighting + filter): `NeurIPS, KDD, ICML, ICDM, SIGSPATIAL, AAAI, SDM, IJCAI, WWW, ICDE`.

---

### Task 1: Shared stylesheet and nav partial

**Files:**
- Create: `style.css`
- Create: `nav.html.inc` (reference snippet only, not served directly — copy-pasted into each page's `<header>`)

**Interfaces:**
- Produces: CSS custom properties `--crimson`, `--crimson-dark`, `--bg-page`, `--bg-card`, `--text-primary`, `--text-secondary`, `--border`, `--radius`; classes `.site-header`, `.site-nav`, `.card`, `.tag`, `.pill`, `.container`, `.grid`, `.venue-chip`, `.venue-chip.prestige`.

- [ ] **Step 1:** Write `style.css` with: CSS variables for crimson palette (`#7f1d1d` primary, `#5c1414` dark, light gray page bg, white card bg), base typography (system sans-serif stack, 16px body, scaled headings), `.site-header`/`.site-nav` (sticky, crimson bg, flex nav links, hamburger-free responsive wrap under 700px), `.container` (max-width 960px, centered, padding), `.card` (white bg, border-radius, padding, subtle border), `.tag`/`.pill` (rounded badges), `.grid` (responsive `repeat(auto-fit,minmax(240px,1fr))`), `.venue-chip` (button-like pill) and `.venue-chip.prestige` (red/purple accent border+text), a `@media (max-width: 700px)` block collapsing nav to stacked column and reducing container padding.
- [ ] **Step 2:** Write `nav.html.inc` containing the exact `<header class="site-header">...</header>` markup with the 10 nav links (Home/name + Publications + Talks + Projects + Funding&Awards + Team + Teaching + Service + REU projects + Contact), `href`s pointing at the real filenames, with `aria-current="page"` left as a placeholder comment noting each page sets it on its own link.
- [ ] **Step 3:** Open `style.css` in a text check (`cat` or Read) to confirm no syntax typos (unbalanced braces) — static CSS has no compiler, so a manual re-read is the verification step here.

---

### Task 2: Homepage (`index.html`)

**Files:**
- Create: `index.html`
- Reference: `site_source/index.html` (source content — bio, openings, news list, research interests, professional service, media coverage, appointments, education)

**Interfaces:**
- Consumes: `style.css`, header markup from Task 1's `nav.html.inc`.

- [ ] **Step 1:** Extract all text content and links from `site_source/index.html` (bio paragraph, "Openings" paragraph, full News list with dates/tags/links, Research Projects on-going/completed lists, Recent Publications list, Sponsors, Research Interests, Recent Professional Service table, Media Coverage, Professional Appointments table, Education table) — do not paraphrase, copy verbatim.
- [ ] **Step 2:** Write `index.html`: `<head>` with title "Yanhua Li", meta viewport, `<link rel="stylesheet" href="style.css">`; header nav from Task 1 with Home marked current; a hero `.card` with photo (reuse existing photo `Includes/...` path found in `site_source/index.html`'s `<img>` tag), bio text, and the Openings callout styled as a `.card` with crimson-tinted left border; a News section as a scrollable/stacked list of `.pill`-tagged entries (`[Award]`, `[Paper]`, `[TPC]`, `[Students]`, `[Talk]`) each with its date and links preserved; a two-column `.grid` for Research Interests + Recent Professional Service; Media Coverage and Professional Appointments/Education as simple tables or definition lists styled with `.card`.
- [ ] **Step 3:** Open `index.html` in the browser preview tool and visually confirm: nav renders, photo loads (or graceful broken-image fallback if the source image wasn't copied yet — note for Task 9), all news items present, all links clickable.
- [ ] **Step 4:** Diff the visible text against `site_source/index.html`'s extracted text (spot-check 5 random news items and the full bio paragraph) to confirm nothing was dropped or altered.

---

### Task 3: Publications page (`res.html`) with prestige filter

**Files:**
- Create: `res.html`
- Reference: `site_source/res.html` (100+ entries, 2009–2026, grouped by year)

**Interfaces:**
- Consumes: `style.css` `.venue-chip`/`.venue-chip.prestige`.
- Produces: `data-venue="KDD"` (etc.) attributes on each `<li class="pub-entry">`, and a `<script>` block defining `filterVenue(venue)` used by chip `onclick` handlers.

- [ ] **Step 1:** Parse every entry from `site_source/res.html` preserving: venue tag (e.g. `[KDD'25]`), full author list, title, links (`[PDF]`, `[GitHub]`, etc. with original hrefs), venue/conference full name + date/location, acceptance ratio text, and any award notes (e.g. "Best Paper Award"). Group under year headings exactly as today (2026 down to 2009).
- [ ] **Step 2:** For each entry, determine its venue key by matching the bracket tag against the prestige list (`NeurIPS, KDD, ICML, ICDM, SIGSPATIAL, AAAI, SDM, IJCAI, WWW, ICDE`) using a normalized match (e.g. `[SIGSPATIAL GIS'25]` → `SIGSPATIAL`, `[ICML'26 Spotlight]` → `ICML`). Non-matching entries (TIST, TKDE, journals, workshops, book chapters, non-prestige confs) get no `data-venue` and are excluded from filtering/highlighting.
- [ ] **Step 3:** Write `res.html`: header nav (Publications current), an intro line, a `<div class="venue-filter">` containing one `.venue-chip.prestige` button per prestige venue reading `VENUE (count)` where count = total matched entries for that venue across all years (computed by hand from the parsed data in Step 1-2), plus an `"All"` chip; then the year-grouped `<ul>`/`<li>` list of every publication (prestige entries get `class="pub-entry prestige"` and `data-venue="KDD"` etc.; non-prestige entries get `class="pub-entry"` with no `data-venue`).
- [ ] **Step 4:** Add inline `<script>` at the bottom of `res.html`:
```html
<script>
function filterVenue(venue) {
  document.querySelectorAll('.venue-chip').forEach(function(chip) {
    chip.classList.toggle('active', chip.dataset.venue === venue);
  });
  document.querySelectorAll('.pub-entry').forEach(function(entry) {
    var show = venue === 'all' || entry.dataset.venue === venue;
    entry.style.display = show ? '' : 'none';
  });
  document.querySelectorAll('.year-heading').forEach(function(heading) {
    var next = heading.nextElementSibling;
    var anyVisible = false;
    while (next && !next.classList.contains('year-heading')) {
      if (next.classList.contains('pub-entry') && next.style.display !== 'none') anyVisible = true;
      next = next.nextElementSibling;
    }
    heading.style.display = anyVisible ? '' : 'none';
  });
}
</script>
```
Wire each chip's `onclick="filterVenue('KDD')"` (and the All chip to `filterVenue('all')`), with each `.year-heading` element (e.g. `<h2 class="year-heading">2024</h2>`) placed directly before that year's entries so the hide-empty-year logic works.
- [ ] **Step 5:** Open `res.html` in the browser preview, click 2-3 prestige chips and confirm the list filters correctly and year headings with zero remaining visible entries hide themselves; click "All" and confirm everything reappears.
- [ ] **Step 6:** Spot-check the printed count on 3 chips (e.g. count actual `KDD` entries by searching `site_source/res.html` for `[KDD` occurrences) to confirm the counts in Step 3 are accurate.

---

### Task 4: Remaining content pages (Talks, Projects, Funding&Awards, Team, Teaching, Service, REU, Contact)

**Files:**
- Create: `talk.html`, `proj.html`, `fund.html`, `team.html`, `teach.html`, `serve.html`, `REU.html`, `cv.html`
- Reference: matching files in `site_source/`

**Interfaces:**
- Consumes: `style.css`, Task 1 nav markup (each page marks its own link current).

- [ ] **Step 1:** For each of the 8 files, extract full text/links/structure from its `site_source/*.html` counterpart (do not skip entries).
- [ ] **Step 2:** Rebuild each page with the shared header/nav, page title, and content wrapped in `.card`/`.grid` markup appropriate to its content type: `talk.html` as a dated list, `proj.html` and `fund.html` as project/grant cards (title, funder, dates, role), `team.html` as member cards (name, role, links if present), `teach.html` as a course list/table, `serve.html` as a role/venue/year table (mirroring the "Full list of professional service" table already on the live site), `REU.html` as a program description + any listed items, `cv.html` as contact details + any CV/download link present in source.
- [ ] **Step 3:** Open each rebuilt page in the browser preview and confirm nav links work (clicking each nav item lands on the right page) and content renders without missing sections.

---

### Task 5: Cross-page QA pass

**Files:**
- Modify: any of the 10 HTML files if issues found

- [ ] **Step 1:** From `index.html`, click through all 9 nav links in the browser preview tool, confirming each page loads, shares the same header/nav styling, and highlights the correct current-page nav item.
- [ ] **Step 2:** Resize the preview to a mobile width (e.g. 375px) on `index.html` and `res.html` and confirm the nav collapses/wraps cleanly and no horizontal scrollbar appears.
- [ ] **Step 3:** Verify every external link present in `site_source/*.html` (co-author pages, conference sites, PDF links, Google Scholar/DBLP, admission page) still exists with the same `href` in the new pages — spot check at least 10 across different pages.
- [ ] **Step 4:** Commit is not applicable (no git repo in this project) — instead, list the final file tree with `ls` and confirm all 10 HTML files + `style.css` are present at the project root, ready for copy to `public_html`.

---

### Task 6: Publish instructions handoff

**Files:**
- Create: `PUBLISH.md` — short copy-paste-ready instructions

- [ ] **Step 1:** Write `PUBLISH.md` summarizing the WPI KB article's mapped-drive steps (map `smb://users.wpi.edu/personalweb/public_html` on macOS via Finder → Go → Connect to Server, or Windows via Map Network Drive to `\\users.wpi.edu\personalweb\public_html`, sign in with WPI credentials), then: copy all files from this project root (`index.html`, `res.html`, `talk.html`, `proj.html`, `fund.html`, `team.html`, `teach.html`, `serve.html`, `REU.html`, `cv.html`, `style.css`, and the existing `Includes/` image folder if referenced) into the mounted `public_html` folder, overwriting the old versions, and note that folder/file permission bits (0701/0744) are already set correctly by the server and don't need manual changes.
- [ ] **Step 2:** Present `PUBLISH.md` to the user as the final deliverable alongside the built site.
