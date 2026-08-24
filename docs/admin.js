/* Admin tool: form-based editor that reads/writes data/*.json directly in
   the private GitHub repo via the GitHub Contents API. No server of ours
   involved — every request goes straight from this browser to api.github.com,
   authenticated with a token you provide. See index.html gate screen for
   token setup steps. */

const OWNER = 'UrbanIntelligence';
const REPO = 'WPI_PersonalSite';
const BRANCH = 'main';
const TOKEN_KEY = 'wpi_admin_gh_token';

function b64EncodeUnicode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (_, p1) {
    return String.fromCharCode('0x' + p1);
  }));
}
function b64DecodeUnicode(b64) {
  return decodeURIComponent(atob(b64).split('').map(function (c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
}

const GH = {
  token: null,
  headers() {
    return {
      'Authorization': 'Bearer ' + this.token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
  },
  async getFile(path) {
    const res = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
      { headers: this.headers() }
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Couldn't load ${path} (${res.status})`);
    const data = await res.json();
    return { sha: data.sha, text: b64DecodeUnicode(data.content) };
  },
  async putText(path, text, sha, message) {
    const body = { message, content: b64EncodeUnicode(text), branch: BRANCH };
    if (sha) body.sha = sha;
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
      method: 'PUT', headers: this.headers(), body: JSON.stringify(body)
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Couldn't save ${path} (${res.status}): ${t}`);
    }
    return res.json();
  },
  async putBase64(path, base64Content, sha, message) {
    const body = { message, content: base64Content, branch: BRANCH };
    if (sha) body.sha = sha;
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
      method: 'PUT', headers: this.headers(), body: JSON.stringify(body)
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Couldn't upload ${path} (${res.status}): ${t}`);
    }
    return res.json();
  },
  async whoAmI() {
    const res = await fetch('https://api.github.com/user', { headers: this.headers() });
    if (!res.ok) throw new Error('Token check failed (' + res.status + ')');
    return res.json();
  }
};

function publicationSummary(e) {
  if (e.title) {
    var authors = (e.authors || []).map(function (a) { return (a.first || '') + ' ' + (a.last || ''); }).join(', ');
    return e.year + ' · [' + e.tag + '] ' + e.title;
  }
  return e.year + ' · [' + e.tag + '] ' + (e.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70);
}

const SCHEMAS = {
  publications: {
    file: 'data/publications.json', type: 'array', label: 'Publications',
    /* Legacy fields: used only to edit pre-existing entries stored as a single
       HTML blob. New entries always use the structured form (openPublicationForm). */
    fields: [
      { name: 'year', label: 'Year', type: 'number', required: true },
      { name: 'tag', label: 'Venue badge text', type: 'text', required: true, help: "Shown on the badge, e.g. KDD'26" },
      { name: 'venue', label: 'Prestige venue (for filter + color)', type: 'select', nullable: true,
        options: ['NeurIPS', 'KDD', 'ICML', 'ICDM', 'SIGSPATIAL', 'AAAI', 'SDM', 'IJCAI', 'WWW', 'ICDE'],
        help: 'Leave as "(none)" for journals/workshops that shouldn\'t be filterable' },
      { name: 'html', label: 'Authors, title, details', type: 'textarea', required: true,
        help: 'HTML allowed: <b>bold</b>, <i>italic</i>, <a href="...">links</a>, <br> for line breaks (legacy entry format)' }
    ],
    summary: publicationSummary
  },
  talks: {
    file: 'data/talks.json', type: 'array', label: 'Talks',
    fields: [
      { name: 'tag', label: 'Label', type: 'text', help: 'e.g. "Invited Talk at MIT" (leave blank for none)' },
      { name: 'html', label: 'Description', type: 'textarea', required: true, help: 'HTML allowed, same as existing entries' }
    ],
    summary: e => (e.tag ? '[' + e.tag + '] ' : '') + (e.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70)
  },
  funding: {
    file: 'data/funding.json', type: 'array', label: 'Funding & Awards',
    fields: [
      { name: 'tag', label: 'Label', type: 'text', required: true, help: 'e.g. "NSF Grant", "Industry Grant", "Best Paper Award"' },
      { name: 'html', label: 'Description', type: 'textarea', required: true, help: 'HTML allowed, same as existing entries' }
    ],
    summary: e => '[' + e.tag + '] ' + (e.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
  },
  teaching: {
    file: 'data/teaching.json', type: 'array', label: 'Teaching',
    fields: [
      { name: 'course', label: 'Course', type: 'text', required: true },
      { name: 'offerings', label: 'Recent offerings', type: 'tags', required: true, help: 'Add each term separately, e.g. "2025 Fall"' }
    ],
    summary: e => e.course + ' — ' + (Array.isArray(e.offerings) ? e.offerings.join(', ') : e.offerings)
  },
  service: {
    file: 'data/service.json', type: 'array', label: 'Service',
    fields: [
      { name: 'html', label: 'Description', type: 'textarea', required: true, help: 'HTML allowed, same as existing entries' }
    ],
    summary: e => (e.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
  },
  team: {
    file: 'data/team.json', type: 'team-object', label: 'Team',
    sections: [
      { key: 'faculty', label: 'Faculty', person: true },
      { key: 'currentPhD', label: 'Current PhD Students', person: true },
      { key: 'pastPhD', label: 'Past PhD Students', person: true },
      { key: 'pastMastersInterns', label: 'Past Master/Intern Students', plainText: true }
    ]
  }
};

const PERSON_FIELDS = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'link', label: 'Personal page URL', type: 'text', nullable: true, help: 'Leave blank if none' },
  { name: 'img', label: 'Photo filename (in img/)', type: 'text', required: true, help: 'e.g. NewStudent.jpg — must match the uploaded file below' },
  { name: 'imgUpload', label: 'Upload / replace photo', type: 'file' },
  { name: 'bio', label: 'Bio lines', type: 'textarea', required: true, help: 'Separate lines with <br>' }
];

let state = { currentTab: 'publications', cache: {} };

function $(sel, root) { return (root || document).querySelector(sel); }
function el(tag, attrs, children) {
  const e = document.createElement(tag);
  if (attrs) Object.keys(attrs).forEach(function (k) {
    if (k === 'class') e.className = attrs[k];
    else if (k === 'html') e.innerHTML = attrs[k];
    else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), attrs[k]);
    else e.setAttribute(k, attrs[k]);
  });
  (children || []).forEach(function (c) { if (c) e.appendChild(c); });
  return e;
}
function text(s) { return document.createTextNode(s); }

function showToast(msg, isError) {
  const t = el('div', { class: 'toast' + (isError ? ' error' : ''), html: msg });
  document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, isError ? 6000 : 3200);
}

function saveToken(tok) { localStorage.setItem(TOKEN_KEY, tok); }
function loadToken() { return localStorage.getItem(TOKEN_KEY); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

async function initApp() {
  const token = loadToken();
  if (!token) { renderGate(); return; }
  GH.token = token;
  try {
    const me = await GH.whoAmI();
    renderApp(me.login);
  } catch (err) {
    clearToken();
    renderGate('That token didn\'t work (' + err.message + '). Try again.');
  }
}

function renderGate(errorMsg) {
  document.body.innerHTML = '';
  const wrap = el('div', { class: 'gate' }, [
    el('h1', { html: 'Site editor' }),
    el('p', { html: 'Paste a GitHub token scoped to <code>' + OWNER + '/' + REPO + '</code> to continue.' }),
    errorMsg ? el('p', { style: 'color:#8f1d1d', html: errorMsg }) : null,
    el('input', { type: 'password', id: 'token-input', placeholder: 'github_pat_...' }),
    el('button', { class: 'primary', onclick: onTokenSubmit }, [text('Continue')]),
    el('div', { class: 'help', html:
      '<strong>First time on this device?</strong> Generate a token once from your GitHub account:' +
      '<ol>' +
      '<li>Go to <code>github.com/settings/personal-access-tokens/new</code></li>' +
      '<li>Name it anything (e.g. "WPI site editor")</li>' +
      '<li>Resource owner: <strong>' + OWNER + '</strong></li>' +
      '<li>Repository access: <strong>Only select repositories</strong> → choose <strong>' + REPO + '</strong></li>' +
      '<li>Permissions → Repository permissions → <strong>Contents: Read and write</strong></li>' +
      '<li>Generate token, copy it, paste it above</li>' +
      '</ol>' +
      'The token is saved only in this browser\'s local storage on this device &mdash; it is never sent anywhere except directly to GitHub.' }
    )
  ]);
  document.body.appendChild(wrap);
  $('#token-input').focus();
  $('#token-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') onTokenSubmit(); });
}

async function onTokenSubmit() {
  const tok = $('#token-input').value.trim();
  if (!tok) return;
  GH.token = tok;
  try {
    const me = await GH.whoAmI();
    saveToken(tok);
    renderApp(me.login);
  } catch (err) {
    renderGate('That token didn\'t work (' + err.message + '). Try again.');
  }
}

function renderApp(login) {
  document.body.innerHTML = '';
  const header = el('header', { class: 'top' }, [
    el('h1', {}, [text('Site editor')]),
    el('div', { style: 'display:flex;align-items:center;gap:14px;' }, [
      el('span', { class: 'meta' }, [text('Signed in as ' + login)]),
      el('button', { class: 'ghost', onclick: function () { clearToken(); location.reload(); } }, [text('Sign out')])
    ])
  ]);

  const tabsNav = el('nav', { class: 'tabs' });
  Object.keys(SCHEMAS).forEach(function (key) {
    const btn = el('button', {
      class: key === state.currentTab ? 'active' : '',
      onclick: function () { state.currentTab = key; renderApp(login); }
    }, [text(SCHEMAS[key].label)]);
    tabsNav.appendChild(btn);
  });

  const content = el('main', { class: 'content', id: 'content' });
  const layout = el('div', { class: 'layout' }, [tabsNav, content]);

  document.body.appendChild(header);
  document.body.appendChild(layout);

  loadAndRenderTab(state.currentTab, content);
}

async function loadAndRenderTab(key, content) {
  content.innerHTML = '<p class="loading-spinner">Loading&hellip;</p>';
  const schema = SCHEMAS[key];
  try {
    const file = await GH.getFile(schema.file);
    const data = file ? JSON.parse(file.text) : (schema.type === 'team-object' ? {} : []);
    state.cache[key] = { data, sha: file ? file.sha : null };
    if (schema.type === 'team-object') renderTeamSection(key, content);
    else renderListSection(key, content);
  } catch (err) {
    content.innerHTML = '';
    content.appendChild(el('p', { style: 'color:#8f1d1d' }, [text('Couldn\'t load: ' + err.message)]));
  }
}

function publicationDisplayRank(e) {
  if (e.venue) return 0;
  return e.kind === 'journal' ? 2 : 1;
}

function renderListSection(key, content) {
  const schema = SCHEMAS[key];
  const entry = state.cache[key];
  content.innerHTML = '';

  const card = el('div', { class: 'card' });
  card.appendChild(el('div', { class: 'section-title' }, [
    el('h2', {}, [text(schema.label + ' (' + entry.data.length + ')')]),
    el('button', { class: 'primary', onclick: function () { openAddOrEdit(key, null); } }, [text('+ Add new')])
  ]));

  if (entry.data.length === 0) {
    card.appendChild(el('p', { class: 'empty-state' }, [text('No entries yet.')]));
  } else {
    /* Show newest first (and, for publications, in the same prestige > conference >
       journal order the public page uses) so a just-added entry is visible without
       scrolling through the whole list. idx always refers to the real position in
       entry.data, which Edit/Delete need — only the display order is sorted. */
    var order = entry.data.map(function (item, idx) { return { item: item, idx: idx }; });
    if (key === 'publications') {
      order.sort(function (a, b) {
        var ay = a.item.year || 0, by = b.item.year || 0;
        if (by !== ay) return by - ay;
        return publicationDisplayRank(a.item) - publicationDisplayRank(b.item);
      });
    } else {
      order.reverse();
    }
    order.forEach(function (pair) {
      var item = pair.item, idx = pair.idx;
      const row = el('div', { class: 'entry-row' }, [
        el('span', { class: 'summary' }, [text(schema.summary(item))]),
        el('div', { class: 'actions' }, [
          el('button', { onclick: function () { openAddOrEdit(key, idx); } }, [text('Edit')]),
          el('button', { class: 'danger', onclick: function () { confirmDeleteEntry(key, idx); } }, [text('Delete')])
        ])
      ]);
      card.appendChild(row);
    });
  }
  content.appendChild(card);
}

/* Publications always use the rich structured form, for both Add and Edit.
   Pre-existing HTML-blob entries get auto-parsed into the structured fields
   on open (see parseLegacyPublicationHtml) — review before saving, since
   older entries used enough varied formatting that the split isn't always
   perfect. Every other page uses the generic form. */
function openAddOrEdit(key, idx) {
  if (key === 'publications') { openPublicationForm(idx); return; }
  openEditForm(key, idx);
}

function confirmDeleteEntry(key, idx) {
  if (!confirm('Delete this entry? This will commit the change to GitHub immediately.')) return;
  const entry = state.cache[key];
  entry.data.splice(idx, 1);
  saveArrayFile(key, 'Delete entry from ' + SCHEMAS[key].label);
}

function openEditForm(key, idx) {
  const schema = SCHEMAS[key];
  const entry = state.cache[key];
  const isNew = idx === null;
  const item = isNew ? {} : Object.assign({}, entry.data[idx]);

  const backdrop = el('div', { class: 'modal-backdrop', onclick: function (e) { if (e.target === backdrop) backdrop.remove(); } });
  const form = el('div', { class: 'modal' });
  form.appendChild(el('h3', {}, [text((isNew ? 'Add ' : 'Edit ') + schema.label.replace(/s$/, ''))]));

  const fieldEls = {};
  schema.fields.forEach(function (f) {
    fieldEls[f.name] = buildField(f, item[f.name]);
    form.appendChild(fieldEls[f.name].wrapper);
  });

  const actions = el('div', { class: 'modal-actions' }, [
    el('button', { onclick: function () { backdrop.remove(); } }, [text('Cancel')]),
    el('button', {
      class: 'primary',
      onclick: async function () {
        const newItem = {};
        for (const f of schema.fields) {
          const v = fieldEls[f.name].getValue();
          const isEmpty = Array.isArray(v) ? v.length === 0 : (v === '' || v === null || v === undefined);
          if (f.required && isEmpty) {
            showToast('Please fill in "' + f.label + '"', true);
            return;
          }
          newItem[f.name] = v;
        }
        if (key === 'publications') newItem.id = isNew ? nextPublicationId(entry.data) : item.id;
        if (isNew) entry.data.push(newItem); else entry.data[idx] = newItem;
        backdrop.remove();
        await saveArrayFile(key, (isNew ? 'Add' : 'Update') + ' entry in ' + schema.label);
      }
    }, [text('Save')])
  ]);
  form.appendChild(actions);
  backdrop.appendChild(form);
  document.body.appendChild(backdrop);
}

function buildField(f, value) {
  const wrapper = el('div', { class: 'field' });
  wrapper.appendChild(el('label', {}, [text(f.label)]));
  let input, getValue;

  if (f.type === 'textarea') {
    input = el('textarea', {});
    input.value = value || '';
    getValue = function () { return input.value; };
  } else if (f.type === 'select') {
    input = el('select', {});
    if (f.nullable) input.appendChild(el('option', { value: '' }, [text('(none)')]));
    (f.options || []).forEach(function (opt) {
      const o = el('option', { value: opt }, [text(opt)]);
      if (value === opt) o.selected = true;
      input.appendChild(o);
    });
    getValue = function () { return input.value || null; };
  } else if (f.type === 'number') {
    input = el('input', { type: 'number' });
    input.value = (value === undefined || value === null) ? '' : value;
    getValue = function () { return input.value === '' ? null : Number(input.value); };
  } else if (f.type === 'tags') {
    const list = Array.isArray(value) ? value.slice() : [];
    const chipsWrap = el('div', { style: 'display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px;' });
    function renderChips() {
      chipsWrap.innerHTML = '';
      list.forEach(function (tagText, i) {
        const chip = el('span', {
          style: 'display:inline-flex; align-items:center; gap:6px; background:var(--bg-page); border:1px solid var(--border); border-radius:20px; padding:4px 6px 4px 12px; font-size:0.85rem;'
        });
        chip.appendChild(text(tagText));
        chip.appendChild(el('button', {
          type: 'button',
          style: 'padding:0 6px; font-size:0.8rem; line-height:1.6; border:none; background:transparent; cursor:pointer; color:var(--text-muted);',
          onclick: function () { list.splice(i, 1); renderChips(); }
        }, [text('×')]));
        chipsWrap.appendChild(chip);
      });
    }
    renderChips();
    const addRow = el('div', { style: 'display:flex; gap:6px;' });
    const addInput = el('input', { type: 'text', placeholder: f.placeholder || 'Add one and press Enter', style: 'flex:1;' });
    function addFromInput() {
      const v = addInput.value.trim();
      if (!v) return;
      list.push(v);
      addInput.value = '';
      renderChips();
    }
    addInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addFromInput(); } });
    const addBtn = el('button', { type: 'button', onclick: addFromInput }, [text('+ Add')]);
    addRow.appendChild(addInput);
    addRow.appendChild(addBtn);
    input = el('div', {}, [chipsWrap, addRow]);
    getValue = function () { return list; };
  } else {
    input = el('input', { type: 'text' });
    input.value = (value === undefined || value === null) ? '' : value;
    getValue = function () {
      const v = input.value.trim();
      if (f.nullable && v === '') return null;
      return v;
    };
  }
  wrapper.appendChild(input);
  if (f.help) wrapper.appendChild(el('div', { class: 'help' }, [text(f.help)]));
  return { wrapper, getValue };
}

async function saveArrayFile(key, message) {
  const schema = SCHEMAS[key];
  const entry = state.cache[key];
  try {
    const text = JSON.stringify(entry.data, null, 2) + '\n';
    const result = await GH.putText(schema.file, text, entry.sha, message);
    entry.sha = result.content.sha;
    showToast('Saved to GitHub.');
    renderListSection(key, $('#content'));
  } catch (err) {
    showToast(err.message, true);
  }
}

/* --- Team page (nested object with 3 person-list sections + 1 plain-text list) --- */

function renderTeamSection(key, content) {
  const schema = SCHEMAS.team;
  const entry = state.cache.team;
  content.innerHTML = '';

  schema.sections.forEach(function (section) {
    const list = entry.data[section.key] || (entry.data[section.key] = []);
    const card = el('div', { class: 'card' });
    card.appendChild(el('div', { class: 'section-title' }, [
      el('h2', {}, [text(section.label + ' (' + list.length + ')')]),
      el('button', { class: 'primary', onclick: function () { openTeamEditForm(section, null); } }, [text('+ Add')])
    ]));

    if (list.length === 0) {
      card.appendChild(el('p', { class: 'empty-state' }, [text('No entries yet.')]));
    } else {
      list.forEach(function (item, idx) {
        const summary = section.plainText
          ? String(item).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
          : (item.name + ' — ' + String(item.bio || '').replace(/<[^>]+>/g, ' ').slice(0, 50));
        card.appendChild(el('div', { class: 'entry-row' }, [
          el('span', { class: 'summary' }, [text(summary)]),
          el('div', { class: 'actions' }, [
            el('button', { onclick: function () { openTeamEditForm(section, idx); } }, [text('Edit')]),
            el('button', { class: 'danger', onclick: function () {
              if (!confirm('Delete this entry?')) return;
              list.splice(idx, 1);
              saveTeamFile();
            } }, [text('Delete')])
          ])
        ]));
      });
    }
    content.appendChild(card);
  });
}

function openTeamEditForm(section, idx) {
  const entry = state.cache.team;
  const list = entry.data[section.key];
  const isNew = idx === null;

  const backdrop = el('div', { class: 'modal-backdrop', onclick: function (e) { if (e.target === backdrop) backdrop.remove(); } });
  const form = el('div', { class: 'modal' });
  form.appendChild(el('h3', {}, [text((isNew ? 'Add to ' : 'Edit in ') + section.label)]));

  if (section.plainText) {
    const current = isNew ? '' : list[idx];
    const f = buildField({ name: 'text', label: 'Entry', type: 'textarea', required: true, help: 'HTML allowed, e.g. Name, then → what they are doing now.' }, current);
    form.appendChild(f.wrapper);
    form.appendChild(el('div', { class: 'modal-actions' }, [
      el('button', { onclick: function () { backdrop.remove(); } }, [text('Cancel')]),
      el('button', { class: 'primary', onclick: async function () {
        const v = f.getValue();
        if (!v) { showToast('Please fill this in', true); return; }
        if (isNew) list.push(v); else list[idx] = v;
        backdrop.remove();
        await saveTeamFile();
      } }, [text('Save')])
    ]));
  } else {
    const item = isNew ? {} : Object.assign({}, list[idx]);
    const fieldEls = {};
    let uploadedImageBase64 = null, uploadedImageName = null;
    PERSON_FIELDS.forEach(function (f) {
      if (f.type === 'file') {
        const wrapper = el('div', { class: 'field' });
        wrapper.appendChild(el('label', {}, [text(f.label)]));
        const input = el('input', { type: 'file', accept: 'image/*' });
        input.addEventListener('change', function () {
          const file = input.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = function () {
            uploadedImageBase64 = reader.result.split(',')[1];
            uploadedImageName = file.name;
            fieldEls.img.setValue(file.name);
          };
          reader.readAsDataURL(file);
        });
        wrapper.appendChild(input);
        wrapper.appendChild(el('div', { class: 'help' }, [text(f.help)]));
        form.appendChild(wrapper);
        return;
      }
      const built = buildField(f, item[f.name]);
      built.setValue = function (v) { built.wrapper.querySelector('input,textarea,select').value = v; };
      fieldEls[f.name] = built;
      form.appendChild(built.wrapper);
    });

    form.appendChild(el('div', { class: 'modal-actions' }, [
      el('button', { onclick: function () { backdrop.remove(); } }, [text('Cancel')]),
      el('button', { class: 'primary', onclick: async function () {
        const newItem = {};
        for (const f of PERSON_FIELDS) {
          if (f.type === 'file') continue;
          const v = fieldEls[f.name].getValue();
          if (f.required && !v) { showToast('Please fill in "' + f.label + '"', true); return; }
          newItem[f.name] = v;
        }
        if (isNew) list.push(newItem); else list[idx] = newItem;
        backdrop.remove();
        if (uploadedImageBase64) {
          try {
            const existing = await GH.getFile('img/' + uploadedImageName);
            await GH.putBase64('img/' + uploadedImageName, uploadedImageBase64, existing ? existing.sha : null, 'Add/update photo ' + uploadedImageName);
            showToast('Photo uploaded.');
          } catch (err) {
            showToast('Photo upload failed: ' + err.message, true);
          }
        }
        await saveTeamFile();
      } }, [text('Save')])
    ]));
  }

  backdrop.appendChild(form);
  document.body.appendChild(backdrop);
}

async function saveTeamFile() {
  const entry = state.cache.team;
  try {
    const text = JSON.stringify(entry.data, null, 2) + '\n';
    const result = await GH.putText(SCHEMAS.team.file, text, entry.sha, 'Update team page');
    entry.sha = result.content.sha;
    showToast('Saved to GitHub.');
    renderTeamSection('team', $('#content'));
  } catch (err) {
    showToast(err.message, true);
  }
}

/* --- Structured publication form (new entries + editing new-format entries) --- */

const PRESTIGE_VENUES = ['NeurIPS', 'KDD', 'ICML', 'ICDM', 'SIGSPATIAL', 'AAAI', 'SDM', 'IJCAI', 'WWW', 'ICDE'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function nextPublicationId(data) {
  var max = 0;
  data.forEach(function (e) {
    var m = /^pub-(\d+)$/.exec(e.id || '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return 'pub-' + (max + 1);
}

function labeledField(labelText, required, helpText, inputEl) {
  var wrapper = el('div', { class: 'field' });
  wrapper.appendChild(el('label', {}, [text(labelText + (required ? ' *' : ''))]));
  wrapper.appendChild(inputEl);
  if (helpText) wrapper.appendChild(el('div', { class: 'help' }, [text(helpText)]));
  return wrapper;
}
function textInput(value, onChange, placeholder) {
  var input = el('input', { type: 'text' });
  input.value = value || '';
  if (placeholder) input.placeholder = placeholder;
  input.addEventListener('input', function () { onChange(input.value); });
  return input;
}
function numberInput(value, onChange) {
  var input = el('input', { type: 'number' });
  input.value = (value === null || value === undefined) ? '' : value;
  input.addEventListener('input', function () { onChange(input.value === '' ? null : Number(input.value)); });
  return input;
}
function dateInput(value, onChange) {
  var input = el('input', { type: 'date' });
  input.value = value || '';
  input.addEventListener('input', function () { onChange(input.value); });
  return input;
}
function selectInput(value, options, onChange) {
  var select = el('select', {});
  options.forEach(function (opt) {
    var o = el('option', { value: opt[0] }, [text(opt[1])]);
    if (opt[0] === value) o.selected = true;
    select.appendChild(o);
  });
  select.addEventListener('change', function () { onChange(select.value); });
  return select;
}

/* Best-effort conversion of an old single-HTML-blob entry into the
   structured fields, so Edit can open the same rich form for every entry.
   Authors/title/file are extracted reliably (the original generator always
   used the same "authors,<br><b>title.</b>[file]<br><i>details</i>" shape).
   Journal-shaped details ("..., Accepted for publication, June 2021") are
   split into the journal fields too. Conference-shaped details vary too
   much across 15 years of formats to safely split into city/date/track/
   ratio automatically, so the *entire* details sentence is kept intact in
   "Conference full name" — nothing is lost, and the rendered page looks
   identical unless you choose to break it apart further yourself. */
function parseLegacyPublicationHtml(html) {
  var result = {
    authors: [{ first: 'Yanhua', last: 'Li', isMe: true }],
    title: '', fileUrl: null, kind: 'conference',
    conference: { fullName: '', startDate: '', endDate: '', isUS: true, city: '', state: '', country: '', track: '', accepted: null, submitted: null },
    journal: { fullName: '', status: 'Accepted', statusMonth: '', statusYear: null },
    parsed: false
  };
  try {
    var div = document.createElement('div');
    div.innerHTML = html || '';

    var bolds = Array.from(div.querySelectorAll('b'));
    var titleEl = null;
    bolds.forEach(function (b) {
      var t = b.textContent.trim();
      if (t === 'Yanhua Li') return;
      if (!titleEl || t.length > titleEl.textContent.trim().length) titleEl = b;
    });
    if (!titleEl) return result;
    result.title = titleEl.textContent.trim().replace(/\.$/, '');

    // Authors: everything in the DOM before the title <b>, as plain text.
    var beforeTitleHtml = '';
    var tmp = document.createElement('div');
    for (var i = 0; i < div.childNodes.length; i++) tmp.appendChild(div.childNodes[i].cloneNode(true));
    var idxOfTitle = tmp.innerHTML.indexOf(titleEl.outerHTML);
    beforeTitleHtml = idxOfTitle >= 0 ? tmp.innerHTML.slice(0, idxOfTitle) : '';
    var authorsDiv = document.createElement('div');
    authorsDiv.innerHTML = beforeTitleHtml;
    var authorsText = authorsDiv.textContent.replace(/,\s*$/, '').trim();
    if (authorsText) {
      var tokens = authorsText.replace(/\s+and\s+/gi, ', ').split(',').map(function (s) { return s.trim().replace(/\*$/, ''); }).filter(Boolean);
      result.authors = tokens.map(function (nameStr) {
        var parts = nameStr.split(/\s+/);
        var last = parts.length > 1 ? parts.pop() : '';
        var first = parts.join(' ');
        var isMe = nameStr === 'Yanhua Li';
        return { first: first, last: last || nameStr, isMe: isMe };
      });
      if (!result.authors.some(function (a) { return a.isMe; })) {
        var me = result.authors.find(function (a) { return (a.first + ' ' + a.last).trim() === 'Yanhua Li'; });
        if (me) me.isMe = true;
      }
    }

    // Text after the title's closing </b>: strip every leading [link] group
    // (papers often chain several, e.g. [PDF][GitHub][Bibtex]) — keep the
    // first href found (normally the PDF) as fileUrl.
    var afterHtml = tmp.innerHTML.slice(idxOfTitle + titleEl.outerHTML.length);
    var linkRe = /^\s*\[(?:<a[^>]*href="([^"]*)"[^>]*>[^<]*<\/a>|[^\]]*)\]/;
    var linkMatch;
    while ((linkMatch = linkRe.exec(afterHtml))) {
      if (linkMatch[1] && !result.fileUrl) result.fileUrl = linkMatch[1];
      afterHtml = afterHtml.slice(linkMatch[0].length);
    }
    afterHtml = afterHtml.replace(/^(<br\s*\/?>)+/i, '');
    var detailsDiv = document.createElement('div');
    detailsDiv.innerHTML = afterHtml;
    var detailsText = detailsDiv.textContent.trim();

    var journalMatch = /^(.*?),\s*(Accepted(?:\s+for\s+publication)?|Published)\.?,?\s*([A-Za-z]+\.?)?\s*(\d{4})\.?\s*$/i.exec(detailsText);
    if (journalMatch) {
      result.kind = 'journal';
      result.journal.fullName = journalMatch[1].trim();
      result.journal.status = /published/i.test(journalMatch[2]) ? 'Published' : 'Accepted';
      var monthGuess = (journalMatch[3] || '').replace(/\.$/, '');
      var monthFull = MONTHS.find(function (m) { return m.toLowerCase().indexOf(monthGuess.toLowerCase()) === 0 && monthGuess; });
      result.journal.statusMonth = monthFull || '';
      result.journal.statusYear = parseInt(journalMatch[4], 10);
    } else {
      result.kind = 'conference';
      result.conference.fullName = detailsText;
    }
    result.parsed = true;
  } catch (err) {
    console.error('legacy publication parse failed', err);
  }
  return result;
}

function openPublicationForm(idx) {
  const entry = state.cache.publications;
  const isNew = idx === null;
  const original = isNew ? null : entry.data[idx];
  const isLegacy = !isNew && !!original.html && !original.title;
  const parsed = isLegacy ? parseLegacyPublicationHtml(original.html) : null;

  const st = {
    id: isNew ? nextPublicationId(entry.data) : original.id,
    year: isNew ? new Date().getFullYear() : original.year,
    tag: isNew ? '' : (original.tag || ''),
    venue: isNew ? null : (original.venue || null),
    title: isNew ? '' : (isLegacy ? parsed.title : (original.title || '')),
    fileUrl: isNew ? null : (isLegacy ? parsed.fileUrl : (original.fileUrl || null)),
    uploadFile: null,
    kind: isNew ? 'conference' : (isLegacy ? parsed.kind : (original.kind || 'conference')),
    conference: Object.assign(
      { fullName: '', startDate: '', endDate: '', isUS: true, city: '', state: '', country: '', track: '', accepted: null, submitted: null },
      isLegacy ? parsed.conference : ((original && original.conference) || {})
    ),
    journal: Object.assign(
      { fullName: '', status: 'Accepted', statusMonth: '', statusYear: null },
      isLegacy ? parsed.journal : ((original && original.journal) || {})
    ),
    authors: isNew
      ? [{ first: 'Yanhua', last: 'Li', isMe: true }]
      : (isLegacy ? parsed.authors : (original.authors ? original.authors.map(function (a) { return Object.assign({}, a); }) : [{ first: 'Yanhua', last: 'Li', isMe: true }]))
  };

  const backdrop = el('div', { class: 'modal-backdrop', onclick: function (e) { if (e.target === backdrop) backdrop.remove(); } });
  const modal = el('div', { class: 'modal', style: 'max-width:720px;' });
  modal.appendChild(el('h3', {}, [text((isNew ? 'Add publication' : 'Edit publication') + (isNew ? '' : ' (' + st.id + ')'))]));

  if (isLegacy) {
    modal.appendChild(el('div', {
      style: 'background:#fdf3e5; border:1px solid #e8c98a; border-radius:8px; padding:10px 14px; margin-bottom:16px; font-size:0.85rem; color:#6b4a12;'
    }, [text('This entry was auto-converted from its original text. Older entries used varied formatting, so please double-check the fields below — especially the venue details — before saving.')]));
  }
  const body = el('div', {});
  modal.appendChild(body);

  function renderAuthorsList(container) {
    container.innerHTML = '';
    st.authors.forEach(function (a, i) {
      var row = el('div', {
        draggable: 'true',
        style: 'display:flex; gap:8px; align-items:center; padding:6px 0; border-bottom:1px solid var(--border);'
      });

      var handle = el('span', { style: 'cursor:grab; color:var(--text-muted); user-select:none;' }, [text('⠿')]);
      var first = el('input', { type: 'text', placeholder: 'First name', style: 'width:130px;' });
      first.value = a.first || '';
      first.addEventListener('input', function () { a.first = first.value; });
      var last = el('input', { type: 'text', placeholder: 'Last name', style: 'width:130px;' });
      last.value = a.last || '';
      last.addEventListener('input', function () { a.last = last.value; });

      var meLabel = el('label', { style: 'display:flex; align-items:center; gap:4px; font-size:0.82rem; color:var(--text-secondary); white-space:nowrap;' });
      var meCheck = el('input', { type: 'checkbox' });
      meCheck.checked = !!a.isMe;
      meCheck.addEventListener('change', function () {
        st.authors.forEach(function (x) { x.isMe = false; });
        a.isMe = meCheck.checked;
        renderAuthorsList(container);
      });
      meLabel.appendChild(meCheck);
      meLabel.appendChild(text('This is me'));

      var removeBtn = el('button', {
        onclick: function () { st.authors.splice(i, 1); renderAuthorsList(container); },
        style: 'padding:3px 8px; font-size:0.8rem;'
      }, [text('Remove')]);

      row.appendChild(handle);
      row.appendChild(first);
      row.appendChild(last);
      row.appendChild(meLabel);
      row.appendChild(removeBtn);

      row.addEventListener('dragstart', function (ev) {
        ev.dataTransfer.setData('text/plain', String(i));
        ev.dataTransfer.effectAllowed = 'move';
      });
      row.addEventListener('dragover', function (ev) { ev.preventDefault(); });
      row.addEventListener('drop', function (ev) {
        ev.preventDefault();
        var from = parseInt(ev.dataTransfer.getData('text/plain'), 10);
        if (isNaN(from) || from === i) return;
        var moved = st.authors.splice(from, 1)[0];
        st.authors.splice(i, 0, moved);
        renderAuthorsList(container);
      });

      container.appendChild(row);
    });
  }

  function renderKindFields(container) {
    container.innerHTML = '';
    if (st.kind === 'conference') {
      var c = st.conference;
      container.appendChild(labeledField('Conference full name', true,
        'e.g. "the 33rd ACM SIGKDD Conference on Knowledge Discovery and Data Mining"',
        textInput(c.fullName, function (v) { c.fullName = v; })));

      var dateRow = el('div', { class: 'field' }, [
        el('div', { style: 'display:flex; gap:12px;' }, [
          el('div', { style: 'flex:1' }, [el('label', {}, [text('Start date')]), dateInput(c.startDate, function (v) { c.startDate = v; })]),
          el('div', { style: 'flex:1' }, [el('label', {}, [text('End date')]), dateInput(c.endDate, function (v) { c.endDate = v; })])
        ])
      ]);
      container.appendChild(dateRow);

      container.appendChild(labeledField('Location', false, null,
        selectInput(c.isUS ? 'us' : 'intl', [['us', 'United States'], ['intl', 'International']],
          function (v) { c.isUS = (v === 'us'); renderKindFields(container); })));

      var locRow = el('div', { class: 'field' }, [
        el('div', { style: 'display:flex; gap:12px;' }, [
          el('div', { style: 'flex:1' }, [el('label', {}, [text('City')]), textInput(c.city, function (v) { c.city = v; })]),
          c.isUS
            ? el('div', { style: 'flex:1' }, [el('label', {}, [text('State')]), textInput(c.state, function (v) { c.state = v; }, 'e.g. CA')])
            : el('div', { style: 'flex:1' }, [el('label', {}, [text('Country')]), textInput(c.country, function (v) { c.country = v; })])
        ])
      ]);
      container.appendChild(locRow);

      container.appendChild(labeledField('Track (optional)', false, 'e.g. "Research Track"',
        textInput(c.track, function (v) { c.track = v; })));

      var ratioPreview = el('div', { class: 'help' }, [text('')]);
      function updateRatioPreview() {
        if (c.accepted != null && c.submitted) {
          var pct = (c.accepted / c.submitted * 100).toFixed(1);
          ratioPreview.textContent = 'Will show: ' + pct + '%=' + c.accepted + '/' + c.submitted + ' Acceptance Ratio';
        } else {
          ratioPreview.textContent = '';
        }
      }
      var statsRow = el('div', { class: 'field' }, [
        el('div', { style: 'display:flex; gap:12px;' }, [
          el('div', { style: 'flex:1' }, [el('label', {}, [text('# Accepted (optional)')]), numberInput(c.accepted, function (v) { c.accepted = v; updateRatioPreview(); })]),
          el('div', { style: 'flex:1' }, [el('label', {}, [text('# Submitted (optional)')]), numberInput(c.submitted, function (v) { c.submitted = v; updateRatioPreview(); })])
        ]),
        ratioPreview
      ]);
      container.appendChild(statsRow);
      updateRatioPreview();
    } else {
      var j = st.journal;
      container.appendChild(labeledField('Journal full name', true, 'e.g. "Knowledge and Information Systems"',
        textInput(j.fullName, function (v) { j.fullName = v; })));
      container.appendChild(labeledField('Status', true, null,
        selectInput(j.status, [['Accepted', 'Accepted'], ['Published', 'Published']], function (v) { j.status = v; })));
      container.appendChild(el('div', { class: 'field' }, [
        el('div', { style: 'display:flex; gap:12px;' }, [
          el('div', { style: 'flex:1' }, [el('label', {}, [text('Month')]),
            selectInput(j.statusMonth, [['', '(choose)']].concat(MONTHS.map(function (m) { return [m, m]; })), function (v) { j.statusMonth = v; })],
          ),
          el('div', { style: 'flex:1' }, [el('label', {}, [text('Year')]), numberInput(j.statusYear, function (v) { j.statusYear = v; })])
        ])
      ]));
    }
  }

  function renderBody() {
    body.innerHTML = '';

    body.appendChild(labeledField('Title', true, null, textInput(st.title, function (v) { st.title = v; })));

    body.appendChild(el('label', { style: 'display:block; font-size:0.85rem; font-weight:600; color:var(--text-secondary); margin-bottom:4px;' }, [text('Authors')]));
    var authorsContainer = el('div', { style: 'margin-bottom:6px;' });
    body.appendChild(authorsContainer);
    renderAuthorsList(authorsContainer);
    body.appendChild(el('button', {
      onclick: function () { st.authors.push({ first: '', last: '', isMe: false }); renderAuthorsList(authorsContainer); },
      style: 'margin:6px 0 18px;'
    }, [text('+ Add author')]));
    body.appendChild(el('div', { class: 'help', style: 'margin:-14px 0 16px;' }, [text('Drag rows by the handle to reorder.')]));

    var fileWrap = el('div', { class: 'field' });
    fileWrap.appendChild(el('label', {}, [text('Paper file (optional)')]));
    if (st.fileUrl && !st.uploadFile) {
      fileWrap.appendChild(el('div', { class: 'help' }, [text('Current file is linked. ')]));
      fileWrap.appendChild(el('button', { onclick: function () { st.fileUrl = null; renderBody(); } }, [text('Remove file (show "To be available soon")')]));
    } else {
      var fileInput = el('input', { type: 'file', accept: 'application/pdf' });
      fileInput.addEventListener('change', function () {
        var f = fileInput.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          st.uploadFile = { name: f.name, base64: reader.result.split(',')[1] };
          showToast('File ready: ' + f.name + ' (uploads when you Save)');
        };
        reader.readAsDataURL(f);
      });
      fileWrap.appendChild(fileInput);
      fileWrap.appendChild(el('div', { class: 'help' }, [text('If left empty, the entry shows "[To be available soon]" like other unpublished papers.')]));
    }
    body.appendChild(fileWrap);

    body.appendChild(labeledField('Venue type', true, null,
      selectInput(st.kind, [['conference', 'Conference paper'], ['journal', 'Journal paper']],
        function (v) { st.kind = v; renderBody(); })));

    var kindContainer = el('div', {});
    body.appendChild(kindContainer);
    renderKindFields(kindContainer);

    body.appendChild(labeledField('Venue badge text', true, "Shown on the badge, e.g. \"KDD'27\"",
      textInput(st.tag, function (v) { st.tag = v; })));
    body.appendChild(labeledField('Prestige venue (for filter + color)', false,
      'Choose if this is one of the top-tier venues; leave as "(none)" otherwise',
      selectInput(st.venue || '', [['', '(none)']].concat(PRESTIGE_VENUES.map(function (v) { return [v, v]; })),
        function (v) { st.venue = v || null; })));
    body.appendChild(labeledField('Year', true, 'Used to group and sort the entry on the page', numberInput(st.year, function (v) { st.year = v; })));
  }

  renderBody();

  modal.appendChild(el('div', { class: 'modal-actions' }, [
    el('button', { onclick: function () { backdrop.remove(); } }, [text('Cancel')]),
    el('button', {
      class: 'primary',
      onclick: async function () {
        if (!st.title.trim()) { showToast('Title is required', true); return; }
        if (!st.tag.trim()) { showToast('Venue badge text is required', true); return; }
        if (!st.year) { showToast('Year is required', true); return; }
        if (st.authors.filter(function (a) { return a.first || a.last; }).length === 0) { showToast('Add at least one author', true); return; }
        if (st.kind === 'conference' && !st.conference.fullName.trim()) { showToast('Conference full name is required', true); return; }
        if (st.kind === 'journal' && !st.journal.fullName.trim()) { showToast('Journal full name is required', true); return; }

        backdrop.remove();

        if (st.uploadFile) {
          try {
            var path = 'papers/' + st.uploadFile.name;
            var existing = await GH.getFile(path);
            await GH.putBase64(path, st.uploadFile.base64, existing ? existing.sha : null, 'Add/update paper file ' + st.uploadFile.name);
            st.fileUrl = 'https://users.wpi.edu/~yli15/' + path;
            showToast('File uploaded.');
          } catch (err) {
            showToast('File upload failed: ' + err.message, true);
            return;
          }
        }

        var newEntry = {
          id: st.id,
          year: Number(st.year),
          tag: st.tag.trim(),
          venue: st.venue || null,
          title: st.title.trim(),
          fileUrl: st.fileUrl || null,
          authors: st.authors.filter(function (a) { return a.first || a.last; }),
          kind: st.kind
        };
        if (st.kind === 'conference') newEntry.conference = st.conference;
        else newEntry.journal = st.journal;

        if (isNew) entry.data.push(newEntry); else entry.data[idx] = newEntry;
        await saveArrayFile('publications', (isNew ? 'Add' : 'Update') + ' publication: ' + newEntry.title);
      }
    }, [text('Save')])
  ]));

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
}

initApp();
