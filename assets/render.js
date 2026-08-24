/* Shared data-driven page renderer.
   Fetches a JSON file from /data and renders it into the page using the
   same CSS classes as the rest of the site, so styling never has to be
   hand-written when adding new content. See HOW_TO_UPDATE.md for the
   per-page JSON format and copy-paste examples. */
var SiteRender = (function () {
  function classifyTag(label) {
    if (!label) return 'tag-tpc';
    var l = label.toLowerCase();
    if (l.indexOf('nsf') !== -1) return 'tag-grant-nsf';
    if (l.indexOf('industry') !== -1) return 'tag-grant-industry';
    if (l.indexOf('wpi') !== -1 || l.indexOf('seed') !== -1) return 'tag-grant-wpi';
    if (l.indexOf('impact') !== -1 || l.indexOf('best paper') !== -1) return 'tag-honor';
    if (l.indexOf('award') !== -1) return 'tag-award';
    if (l.indexOf('student') !== -1) return 'tag-students';
    if (l.indexOf('invited') !== -1 || l.indexOf('talk') !== -1) return 'tag-talk';
    if (l.indexOf('paper') !== -1) return 'tag-paper';
    return 'tag-tpc';
  }

  function tagBadge(label, forceClass) {
    if (!label) return '';
    var cls = forceClass || classifyTag(label);
    return '<span class="tag ' + cls + '">' + label + '</span> ';
  }

  function fetchJSON(url) {
    /* 'no-cache' forces the browser to revalidate with the server (a
       304 still returns fast if unchanged) rather than silently serving
       a possibly-stale cached copy of the data file. */
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('Failed to load ' + url + ' (' + r.status + ')');
      return r.json();
    });
  }

  function showError(container, err) {
    container.innerHTML = '<li class="pub-loading">Couldn\'t load this content &mdash; try refreshing the page.</li>';
    console.error(err);
  }

  /* Simple item list: talks.json, service.json (ul/ol of <li>, optional tag badge) */
  function renderSimpleList(containerId, jsonUrl, opts) {
    opts = opts || {};
    var container = document.getElementById(containerId);
    fetchJSON(jsonUrl)
      .then(function (items) {
        container.innerHTML = '';
        items.forEach(function (item) {
          var li = document.createElement('li');
          var badge = tagBadge(item.tag, opts.forceTagClass);
          li.innerHTML = badge + item.html;
          container.appendChild(li);
        });
      })
      .catch(function (err) { showError(container, err); });
  }

  function newsItemHtml(e) {
    var badge = tagBadge(e.tag);
    var dateHtml = e.date ? '<span class="news-date">' + e.date + ':</span> ' : '';
    return '<li>' + badge + dateHtml + e.html + '</li>';
  }

  /* Full news archive (news.html): news.json grouped by year, newest first. */
  function renderNewsArchive(containerId, jsonUrl) {
    var container = document.getElementById(containerId);
    fetchJSON(jsonUrl)
      .then(function (entries) {
        var byYear = {};
        var yearOrder = [];
        entries.forEach(function (e) {
          if (!byYear[e.year]) { byYear[e.year] = []; yearOrder.push(e.year); }
          byYear[e.year].push(e);
        });
        yearOrder.sort(function (a, b) { return b - a; });

        var html = '';
        yearOrder.forEach(function (year) {
          html += '<h2 class="year-heading">' + year + '</h2><ul class="news-list">';
          byYear[year].forEach(function (e) { html += newsItemHtml(e); });
          html += '</ul>';
        });
        container.innerHTML = html;
      })
      .catch(function (err) { showError(container, err); });
  }

  /* Homepage News card: the N newest entries from news.json (by year;
     entries are stored/edited newest-year-first, so this is stable
     without needing exact dates), flat list, no year headers — always
     exactly N items regardless of how many fall in any given year, so
     the card doesn't shrink or balloon as the news list grows. Same
     source news.html's full archive reads, so nothing to keep in sync
     by hand. */
  function renderRecentNews(containerId, jsonUrl, count) {
    var container = document.getElementById(containerId);
    fetchJSON(jsonUrl)
      .then(function (entries) {
        var sorted = entries.slice().sort(function (a, b) { return (b.year || 0) - (a.year || 0); });
        var shown = sorted.slice(0, count);
        container.innerHTML = shown.map(newsItemHtml).join('');
      })
      .catch(function (err) { showError(container, err); });
  }

  /* Teaching table: teaching.json. "offerings" is an array of term strings
     (e.g. "2019 Fall"), each rendered as its own tag. Old data where
     offerings was still a single comma-separated string is also accepted. */
  function renderTeachingTable(tbodyId, jsonUrl) {
    var tbody = document.getElementById(tbodyId);
    fetchJSON(jsonUrl)
      .then(function (rows) {
        tbody.innerHTML = '';
        rows.forEach(function (row) {
          var tr = document.createElement('tr');
          var list = Array.isArray(row.offerings)
            ? row.offerings
            : String(row.offerings || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          var offeringsHtml = list.map(function (o) { return '<span class="tag tag-term">' + o + '</span>'; }).join('');
          tr.innerHTML = '<td>' + row.course + '</td><td>' + offeringsHtml + '</td>';
          tbody.appendChild(tr);
        });
      })
      .catch(function (err) {
        tbody.innerHTML = '<tr><td colspan="2">Couldn\'t load this content &mdash; try refreshing the page.</td></tr>';
        console.error(err);
      });
  }

  /* Team page: team.json (faculty / currentPhD / pastPhD / pastMastersInterns) */
  function personCardHtml(person) {
    var img = person.img ? '<img src="img/' + person.img + '" alt="' + person.name + '">' : '';
    var nameHtml = person.link
      ? '<a href="' + person.link + '">' + person.name + '</a>'
      : person.name;
    return (
      '<div class="person">' + img +
      '<div><h4>' + nameHtml + '</h4><p>' + person.bio + '</p></div>' +
      '</div>'
    );
  }

  function renderTeam(ids, jsonUrl) {
    var facultyEl = document.getElementById(ids.faculty);
    var currentEl = document.getElementById(ids.currentPhD);
    var pastEl = document.getElementById(ids.pastPhD);
    var mastersEl = document.getElementById(ids.pastMastersInterns);
    fetchJSON(jsonUrl)
      .then(function (data) {
        facultyEl.innerHTML = data.faculty.map(personCardHtml).join('');
        currentEl.innerHTML = data.currentPhD.map(personCardHtml).join('');
        pastEl.innerHTML = data.pastPhD.map(personCardHtml).join('');
        mastersEl.innerHTML = data.pastMastersInterns
          .map(function (html) { return '<li>' + html + '</li>'; })
          .join('');
      })
      .catch(function (err) {
        [facultyEl, currentEl, pastEl].forEach(function (el) {
          el.innerHTML = '<p class="pub-loading">Couldn\'t load this content &mdash; try refreshing the page.</p>';
        });
        mastersEl.innerHTML = '';
        console.error(err);
      });
  }

  /* --- Structured publication entries (v2 schema) --- */

  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  function formatDateRange(startISO, endISO) {
    if (!startISO) return '';
    var s = new Date(startISO + 'T00:00:00');
    if (!endISO || endISO === startISO) {
      return MONTH_NAMES[s.getMonth()] + ' ' + s.getDate() + ', ' + s.getFullYear();
    }
    var e = new Date(endISO + 'T00:00:00');
    if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
      return MONTH_NAMES[s.getMonth()] + ' ' + s.getDate() + ' - ' + e.getDate() + ', ' + s.getFullYear();
    }
    if (s.getFullYear() === e.getFullYear()) {
      return MONTH_NAMES[s.getMonth()] + ' ' + s.getDate() + ' - ' +
        MONTH_NAMES[e.getMonth()] + ' ' + e.getDate() + ', ' + s.getFullYear();
    }
    return MONTH_NAMES[s.getMonth()] + ' ' + s.getDate() + ', ' + s.getFullYear() + ' - ' +
      MONTH_NAMES[e.getMonth()] + ' ' + e.getDate() + ', ' + e.getFullYear();
  }

  function formatAuthorsHtml(authors) {
    var names = (authors || []).map(function (a) {
      var full = ((a.first || '') + ' ' + (a.last || '')).trim();
      return a.isMe ? '<b>' + full + '</b>' : full;
    }).filter(function (n) { return n; });
    if (names.length === 0) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return names[0] + ' and ' + names[1];
    return names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
  }

  function acceptanceRatioText(accepted, submitted) {
    if (accepted == null || !submitted) return null;
    var pct = (accepted / submitted * 100).toFixed(1);
    return pct + '%=' + accepted + '/' + submitted + ' Acceptance Ratio';
  }

  /* Returns { badge, html } for either a v2 structured entry (has .title) or
     a legacy entry (has .html only, pre-existing content). */
  function composePublicationEntry(e) {
    if (!e.title) return { html: e.html };

    var authorsHtml = formatAuthorsHtml(e.authors);
    var fileHtml = e.fileUrl ? '[<a href="' + e.fileUrl + '">PDF</a>]' : '[To be available soon]';
    var titleHtml = '<b>' + e.title + '.</b>' + fileHtml;

    var detailsHtml = '';
    if (e.kind === 'journal' && e.journal) {
      var j = e.journal;
      var statusText = j.status === 'Published' ? 'Published' : 'Accepted for publication';
      detailsHtml = [j.fullName, statusText, ((j.statusMonth || '') + ' ' + (j.statusYear || '')).trim()]
        .filter(Boolean).join(', ');
    } else if (e.conference) {
      var c = e.conference;
      var loc = c.isUS
        ? [c.city, c.state, 'USA'].filter(Boolean).join(', ')
        : [c.city, c.country].filter(Boolean).join(', ');
      var dates = formatDateRange(c.startDate, c.endDate);
      var parenParts = [];
      if (c.track) parenParts.push(c.track);
      var ratio = acceptanceRatioText(c.accepted, c.submitted);
      if (ratio) parenParts.push(ratio);
      var paren = parenParts.length ? ' (' + parenParts.join(', ') + ')' : '';
      detailsHtml = [c.fullName, loc, dates].filter(Boolean).join(', ') + paren;
    }

    var html = (authorsHtml ? authorsHtml + ',<br>' : '') + titleHtml +
      (detailsHtml ? '<br><i>' + detailsHtml + '</i>' : '');
    return { html: html };
  }

  /* Sort rank within a year: prestige venue first (0), then regular
     conference papers (1), then journal papers (2). Legacy entries without
     an explicit "kind" are treated as conference-bucket, same as before. */
  function publicationRank(e) {
    if (e.venue) return 0;
    return e.kind === 'journal' ? 2 : 1;
  }

  function getPublicationTitle(e) {
    if (e.title) return e.title;
    var div = document.createElement('div');
    div.innerHTML = e.html || '';
    var bolds = div.querySelectorAll('b');
    var best = null;
    bolds.forEach(function (b) {
      var t = b.textContent.trim();
      if (t === 'Yanhua Li') return;
      if (!best || t.length > best.length) best = t;
    });
    return best || div.textContent.trim().slice(0, 140);
  }

  /* Publications page: publications.json, with venue filter + year grouping */
  function renderPublications(containerId, filterContainerId, jsonUrl) {
    var container = document.getElementById(containerId);
    var filterContainer = document.getElementById(filterContainerId);

    fetchJSON(jsonUrl)
      .then(function (entries) {
        entries.sort(function (a, b) {
          if (b.year !== a.year) return b.year - a.year;
          return publicationRank(a) - publicationRank(b);
        });

        var counts = {};
        entries.forEach(function (e) {
          if (e.venue) counts[e.venue] = (counts[e.venue] || 0) + 1;
        });
        var venues = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });

        var chipsHtml = '<button type="button" class="venue-chip all active" data-venue="all">All (' + entries.length + ')</button>';
        venues.forEach(function (v) {
          chipsHtml += '<button type="button" class="venue-chip prestige" data-venue="' + v + '">' + v + ' (' + counts[v] + ')</button>';
        });
        filterContainer.innerHTML = chipsHtml;

        var byYear = {};
        var yearOrder = [];
        entries.forEach(function (e) {
          if (!byYear[e.year]) { byYear[e.year] = []; yearOrder.push(e.year); }
          byYear[e.year].push(e);
        });

        var html = '';
        yearOrder.forEach(function (year) {
          html += '<h2 class="year-heading" data-year="' + year + '">' + year + '</h2><ul class="plain">';
          byYear[year].forEach(function (e) {
            var cls = 'pub-entry' + (e.venue ? ' prestige' : '');
            var dataVenue = e.venue ? ' data-venue="' + e.venue + '"' : '';
            var badgeCls = 'venue-badge' + (e.venue ? ' prestige v-' + e.venue.toLowerCase() : '');
            var composed = composePublicationEntry(e);
            html += '<li id="' + e.id + '" class="' + cls + '" data-year="' + year + '"' + dataVenue + '>' +
              '<span class="' + badgeCls + '">' + e.tag + '</span> ' + composed.html + '</li>';
          });
          html += '</ul>';
        });
        container.innerHTML = html;

        filterContainer.querySelectorAll('.venue-chip').forEach(function (chip) {
          chip.addEventListener('click', function () { filterVenue(chip.dataset.venue); });
        });

        function filterVenue(venue) {
          filterContainer.querySelectorAll('.venue-chip').forEach(function (chip) {
            var isTarget = (venue === 'all' && chip.classList.contains('all')) || chip.dataset.venue === venue;
            chip.classList.toggle('active', isTarget);
          });
          container.querySelectorAll('.pub-entry').forEach(function (entry) {
            entry.style.display = (venue === 'all' || entry.dataset.venue === venue) ? '' : 'none';
          });
          container.querySelectorAll('.year-heading').forEach(function (heading) {
            var next = heading.nextElementSibling;
            var anyVisible = false;
            if (next && next.tagName === 'UL') {
              next.querySelectorAll('.pub-entry').forEach(function (e) {
                if (e.style.display !== 'none') anyVisible = true;
              });
            }
            heading.style.display = anyVisible ? '' : 'none';
          });
        }
      })
      .catch(function (err) { showError(container, err); });
  }

  return {
    renderSimpleList: renderSimpleList,
    renderTeachingTable: renderTeachingTable,
    renderTeam: renderTeam,
    renderPublications: renderPublications,
    composePublicationEntry: composePublicationEntry,
    publicationRank: publicationRank,
    getPublicationTitle: getPublicationTitle,
    renderNewsArchive: renderNewsArchive,
    renderRecentNews: renderRecentNews,
    fetchJSON: fetchJSON
  };
})();
