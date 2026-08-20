# Personal website redesign — design spec

Date: 2026-08-19

## Goal

Modernize Yanhua Li's WPI personal website (https://users.wpi.edu/~yli15/) from its current dated, dense, plain-HTML look into a clean, professional, mobile-friendly academic site — while preserving all existing content exactly (bio, news, publications, talks, projects, funding, team, teaching, service, REU program, contact) and staying compatible with WPI's static-hosting constraints (plain HTML/CSS/JS served from `public_html`, homepage must be `index.html`).

## Constraints

- WPI userspace hosting only serves static files — no server-side templating, no build step assumed at deploy time. Every HTML page must be a complete, self-contained file (though they may all `<link>` the same shared `style.css`/`site.js`).
- Publishing requires mounting `smb://users.wpi.edu/personalweb/public_html` (or SSH) with WPI credentials — a credential-entry step only the user can perform. This project produces the finished files locally; the user copies them over.
- File names for existing pages must stay the same (`index.html`, `res.html`, `talk.html`, `proj.html`, `fund.html`, `team.html`, `teach.html`, `serve.html`, `REU.html`, `cv.html`) so existing external links (Google Scholar, DBLP, co-author sites, etc.) keep working.
- Content must not be invented or altered — all bio text, news items, publication entries, talks, project descriptions, funding/awards, team members, teaching history, service records, and contact info are carried over from the current live site (already captured in `site_source/*.html`) verbatim, only restructured/restyled.

## Visual direction

"Crimson academic" — chosen from 3 mocked-up directions.

- WPI crimson (`#7f1d1d`-family) header bar and accent color.
- White content cards on a light neutral-gray page background.
- Clear type hierarchy: larger heading weight for section titles, clean sans-serif body text, generous whitespace (replacing the current cramped table-based layout).
- Pill-style tags for News/Openings-style badges.
- Fully responsive: single-column collapse on mobile (current site has no mobile support at all).
- Shared sticky nav bar across all pages, same 9 links as today (Publications, Talks, Projects, Funding&Awards, Team, Teaching, Service, REU projects, Contact) plus name/home link.

## Architecture

- `style.css` — one shared stylesheet (CSS variables for crimson palette, spacing, type scale; responsive breakpoints).
- `nav.js` or inline shared header markup — since there's no templating, the nav bar HTML is duplicated at the top of each page (small, low-risk duplication; acceptable for a 10-page static site).
- Each existing page rebuilt into the new visual system, preserving its content:
  - `index.html` — bio, openings, news, research interests, professional service summary, media coverage, appointments, education.
  - `res.html` — Publications, see special behavior below.
  - `talk.html`, `proj.html`, `fund.html`, `team.html`, `teach.html`, `serve.html`, `REU.html`, `cv.html` — same restyle treatment, structure preserved (e.g. team → member cards, teaching → course list, service → committee/PC table).

## Publications page special behavior

- All ~100+ existing entries (2009–2026) preserved verbatim, grouped by year as today.
- **Prestige tier**: top-tier venues get a distinct highlight color (red/purple accent per user request) and are the only venues included in the filter UI. Prestige venue list (by abbreviation matched against each entry's venue tag):
  `NeurIPS, KDD, ICML, ICDM, SIGSPATIAL (incl. "SIGSPATIAL GIS"), AAAI, SDM, IJCAI, WWW, ICDE`.
- Non-prestige venues (TIST, TKDE, journals, workshops, etc.) render normally, not included in filter chips, not counted.
- **Filter UI**: row of clickable venue chips at the top of the page, one per prestige venue, each labeled `VENUE (count)` — count = number of entries for that venue across all years. Clicking a chip filters the visible publication list to just that venue; clicking again (or an "All" chip) clears the filter. Implemented with a small vanilla JS snippet in `res.html` (data-venue attributes on entries, JS toggles visibility) — no build tooling needed, matches static-hosting constraint.
- Entries themselves are not reordered; filtering only shows/hides.

## Delivery workflow

1. Build all files in this project folder (`/Users/yli15/Documents/ClaudeCode/WPI_Personal_Website/`), using `site_source/*.html` as the verified content source.
2. User reviews locally (open `index.html` etc. in a browser, or via the in-app browser preview).
3. Once approved, user copies the finished files into their `public_html` folder via the WPI-documented method (mapped SMB drive drag-and-drop, or SFTP/SSH) — this step requires the user's own WPI credentials and is not something Claude performs.

## Out of scope

- No CMS, no server-side code, no build pipeline.
- No changes to WPI's own department/profile pages (those are managed separately by Marketing & Communications per the KB article).
- No new content sections beyond what exists today, other than the publications filter UI.
