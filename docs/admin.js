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

const SCHEMAS = {
  publications: {
    file: 'data/publications.json', type: 'array', label: 'Publications',
    fields: [
      { name: 'id', label: 'ID', type: 'text', required: true, help: 'Unique, e.g. pub-146 (one more than the highest existing number)' },
      { name: 'year', label: 'Year', type: 'number', required: true },
      { name: 'tag', label: 'Venue badge text', type: 'text', required: true, help: "Shown on the badge, e.g. KDD'26" },
      { name: 'venue', label: 'Prestige venue (for filter + color)', type: 'select', nullable: true,
        options: ['NeurIPS', 'KDD', 'ICML', 'ICDM', 'SIGSPATIAL', 'AAAI', 'SDM', 'IJCAI', 'WWW', 'ICDE'],
        help: 'Leave as "(none)" for journals/workshops that shouldn\'t be filterable' },
      { name: 'html', label: 'Authors, title, details', type: 'textarea', required: true,
        help: 'HTML allowed: <b>bold</b>, <i>italic</i>, <a href="...">links</a>, <br> for line breaks' }
    ],
    summary: e => `${e.year} · [${e.tag}] ` + (e.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70)
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
      { name: 'offerings', label: 'Recent offerings', type: 'text', required: true, help: 'Comma-separated, e.g. "2025 Fall, 2026 Spring"' }
    ],
    summary: e => e.course + ' — ' + e.offerings
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

function renderListSection(key, content) {
  const schema = SCHEMAS[key];
  const entry = state.cache[key];
  content.innerHTML = '';

  const card = el('div', { class: 'card' });
  card.appendChild(el('div', { class: 'section-title' }, [
    el('h2', {}, [text(schema.label + ' (' + entry.data.length + ')')]),
    el('button', { class: 'primary', onclick: function () { openEditForm(key, null); } }, [text('+ Add new')])
  ]));

  if (entry.data.length === 0) {
    card.appendChild(el('p', { class: 'empty-state' }, [text('No entries yet.')]));
  } else {
    entry.data.forEach(function (item, idx) {
      const row = el('div', { class: 'entry-row' }, [
        el('span', { class: 'summary' }, [text(schema.summary(item))]),
        el('div', { class: 'actions' }, [
          el('button', { onclick: function () { openEditForm(key, idx); } }, [text('Edit')]),
          el('button', { class: 'danger', onclick: function () { confirmDeleteEntry(key, idx); } }, [text('Delete')])
        ])
      ]);
      card.appendChild(row);
    });
  }
  content.appendChild(card);
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
          if (f.required && (v === '' || v === null || v === undefined)) {
            showToast('Please fill in "' + f.label + '"', true);
            return;
          }
          newItem[f.name] = v;
        }
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

initApp();
