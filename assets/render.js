/* Shared data-driven page renderer.
   Fetches a JSON file from /data and renders it into the page using the
   same CSS classes as the rest of the site, so styling never has to be
   hand-written when adding new content. See HOW_TO_UPDATE.md for the
   per-page JSON format and copy-paste examples. */
var SiteRender = (function () {
  function classifyTag(label) {
    if (!label) return 'tag-tpc';
    var l = label.toLowerCase();
    if (l.indexOf('award') !== -1 || l.indexOf('impact') !== -1) return 'tag-award';
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
    return fetch(url).then(function (r) {
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

  /* Teaching table: teaching.json */
  function renderTeachingTable(tbodyId, jsonUrl) {
    var tbody = document.getElementById(tbodyId);
    fetchJSON(jsonUrl)
      .then(function (rows) {
        tbody.innerHTML = '';
        rows.forEach(function (row) {
          var tr = document.createElement('tr');
          tr.innerHTML = '<td>' + row.course + '</td><td>' + row.offerings + '</td>';
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

  /* Publications page: publications.json, with venue filter + year grouping */
  function renderPublications(containerId, filterContainerId, jsonUrl) {
    var container = document.getElementById(containerId);
    var filterContainer = document.getElementById(filterContainerId);

    fetchJSON(jsonUrl)
      .then(function (entries) {
        entries.sort(function (a, b) { return b.year - a.year; });

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
            html += '<li id="' + e.id + '" class="' + cls + '" data-year="' + year + '"' + dataVenue + '>' +
              '<span class="' + badgeCls + '">' + e.tag + '</span> ' + e.html + '</li>';
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
    fetchJSON: fetchJSON
  };
})();
