// ── Config ────────────────────────────────────────────────────────────────────
const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001/api'
  : 'https://spec-to-issues.onrender.com';

const ROLES = ['scripter', 'builder', 'ui_designer', '3d_artist', 'game_designer', 'sound_designer'];
const ROLE_LABELS = {
  scripter: '💻 Scripter', builder: '🏗️ Builder', ui_designer: '🎨 UI/UX',
  '3d_artist': '🗿 3D Art', game_designer: '🎮 Game Design', sound_designer: '🔊 Sound',
};

// ── State ─────────────────────────────────────────────────────────────────────
let state = {
  currentStep: 0,
  user: null,
  parsedContent: null,
  importMode: 'text',
  selectedRepo: null,
  issues: [],
  teamConfig: {
    members: [
      { name: 'Dorian (Lead)', github_handle: 'ABBADESSA', roles: ['scripter'], active: true },
    ],
    assignment_rules: {
      scripting: ['scripter'], building: ['builder'], design: ['ui_designer'],
      art: ['3d_artist'], game_design: ['game_designer'], sound: ['sound_designer'],
    },
  },
  newMemberRoles: [],
};

// ── Auth ──────────────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem('sti_token'); }

function initAuth() {
  const token = getToken();
  const login = localStorage.getItem('sti_login');
  const avatar = localStorage.getItem('sti_avatar');

  if (token && login) {
    state.user = { token, login, avatar_url: avatar };
    document.getElementById('userArea').innerHTML = `
      <img src="${avatar}" alt="${login}" class="user-avatar">
      <span class="user-login">@${login}</span>
      <button class="btn btn-ghost btn-sm" onclick="logout()">Déco</button>
    `;
    document.getElementById('authAlert') && (document.getElementById('authAlert').style.display = 'none');
  } else {
    document.getElementById('authAlert') && (document.getElementById('authAlert').style.display = 'flex');
  }
}

function logout() {
  localStorage.removeItem('sti_token');
  localStorage.removeItem('sti_login');
  localStorage.removeItem('sti_avatar');
  window.location.reload();
}

// ── Navigation ────────────────────────────────────────────────────────────────
function goTo(step) {
  document.getElementById(`step-${state.currentStep}`).classList.remove('active');
  state.currentStep = step;
  document.getElementById(`step-${step}`).classList.add('active');

  document.querySelectorAll('.step-item').forEach((el, i) => {
    el.classList.remove('active', 'done');
    if (i === step) el.classList.add('active');
    else if (i < step) el.classList.add('done');
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(mode) {
  state.importMode = mode;
  ['text', 'file', 'url'].forEach(m => {
    document.getElementById(`tab-${m}`).style.display = m === mode ? '' : 'none';
  });
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', ['text', 'file', 'url'][i] === mode);
  });
}

// ── Dropzone ──────────────────────────────────────────────────────────────────
function initDropzone() {
  const dz = document.getElementById('dropzone');
  const fi = document.getElementById('fileInput');

  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
  });
  fi.addEventListener('change', () => {
    if (fi.files[0]) handleFileUpload(fi.files[0]);
  });
}

async function handleFileUpload(file) {
  if (!state.user) return toast('⚠️ Connecte-toi d\'abord', 'warning');
  const dz = document.getElementById('dropzone');
  dz.innerHTML = `<div class="spinner" style="margin:0 auto 12px"></div><div class="dropzone-text">Upload de ${file.name}...</div>`;

  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetchAPI('/parse/file', { method: 'POST', body: form, noJson: true });
    state.parsedContent = res;
    dz.innerHTML = `<div style="font-size:24px;margin-bottom:8px">✅</div><div class="dropzone-text">${file.name} — ${res.char_count.toLocaleString()} caractères</div>`;
    toast(`Fichier importé !`, 'success');
  } catch (err) {
    dz.innerHTML = `<div class="dropzone-icon">📂</div><div class="dropzone-text">Erreur: ${err.message}</div>`;
    toast(err.message, 'error');
  }
}

// ── Import ────────────────────────────────────────────────────────────────────
async function handleImport() {
  if (!state.user) return toast('Connecte-toi avec GitHub d\'abord', 'warning');

  const btn = document.getElementById('btnImport');

  if (state.importMode === 'file') {
    if (!state.parsedContent) return toast('Upload un fichier d\'abord', 'warning');
    loadRepos();
    goTo(1);
    return;
  }

  if (state.importMode === 'text') {
    const text = document.getElementById('textInput').value.trim();
    if (!text) return toast('Colle du contenu d\'abord', 'warning');
    state.parsedContent = { content: text, source: 'text', char_count: text.length };
    loadRepos();
    goTo(1);
    return;
  }

  if (state.importMode === 'url') {
    const url = document.getElementById('urlInput').value.trim();
    if (!url) return toast('Entre une URL valide', 'warning');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Import...';
    try {
      state.parsedContent = await fetchAPI('/parse/url', { method: 'POST', body: { url } });
      loadRepos();
      goTo(1);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Continuer →';
    }
  }
}

// ── Repos ─────────────────────────────────────────────────────────────────────
async function loadRepos() {
  const grid = document.getElementById('repoGrid');
  grid.innerHTML = '<div class="text-muted">Chargement...</div>';
  try {
    const repos = await fetchAPI('/github/repos');
    if (!repos.length) { grid.innerHTML = '<div class="text-muted">Aucun repo trouvé.</div>'; return; }
    grid.innerHTML = repos.map(r => `
      <div class="repo-item ${state.selectedRepo?.id === r.id ? 'selected' : ''}"
           onclick="selectRepo(${r.id}, '${r.name}', '${r.full_name}', '${r.owner}')">
        <div class="repo-name">${r.name}</div>
        <div class="repo-full">${r.full_name}</div>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = `<div class="text-muted">Erreur: ${err.message}</div>`;
  }
}

function selectRepo(id, name, full_name, owner) {
  state.selectedRepo = { id, name, full_name, owner };
  document.querySelectorAll('.repo-item').forEach(el => el.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
}

// ── Team ──────────────────────────────────────────────────────────────────────
function renderMembers() {
  const list = document.getElementById('memberList');
  list.innerHTML = state.teamConfig.members.map((m, idx) => `
    <div class="member-item">
      <div class="member-info">
        <div class="member-name">${m.name} <span class="member-handle">@${m.github_handle}</span></div>
        <div class="member-roles">
          ${ROLES.map(r => `
            <span class="badge badge-role ${m.roles.includes(r) ? 'on' : ''}"
                  onclick="toggleRole(${idx}, '${r}')">
              ${ROLE_LABELS[r]}
            </span>
          `).join('')}
        </div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="removeMember(${idx})">✕</button>
    </div>
  `).join('');
}

function renderNewMemberRoles() {
  document.getElementById('newMemberRoles').innerHTML = ROLES.map(r => `
    <span class="badge badge-role ${state.newMemberRoles.includes(r) ? 'on' : ''}"
          onclick="toggleNewRole('${r}')">
      ${ROLE_LABELS[r]}
    </span>
  `).join('');
}

function toggleRole(idx, role) {
  const m = state.teamConfig.members[idx];
  m.roles = m.roles.includes(role) ? m.roles.filter(r => r !== role) : [...m.roles, role];
  renderMembers();
}

function toggleNewRole(role) {
  state.newMemberRoles = state.newMemberRoles.includes(role)
    ? state.newMemberRoles.filter(r => r !== role)
    : [...state.newMemberRoles, role];
  renderNewMemberRoles();
}

function addMember() {
  const name = document.getElementById('newMemberName').value.trim();
  const handle = document.getElementById('newMemberHandle').value.trim().replace('@', '');
  if (!name || !handle) return toast('Nom et handle requis', 'warning');
  state.teamConfig.members.push({ name, github_handle: handle, roles: [...state.newMemberRoles], active: true });
  document.getElementById('newMemberName').value = '';
  document.getElementById('newMemberHandle').value = '';
  state.newMemberRoles = [];
  renderMembers();
  renderNewMemberRoles();
}

function removeMember(idx) {
  state.teamConfig.members.splice(idx, 1);
  renderMembers();
}

// ── Generate ──────────────────────────────────────────────────────────────────
async function handleGenerate() {
  if (!state.parsedContent) return toast('Aucun contenu importé', 'warning');
  if (!state.selectedRepo) return toast('Sélectionne un repository', 'warning');

  const btn = document.getElementById('btnGenerate');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Génération IA...';

  try {
    const result = await fetchAPI('/generate', {
      method: 'POST',
      body: {
        content: state.parsedContent.content,
        team_config: state.teamConfig,
        project_name: document.getElementById('projectName').value,
        project_type: document.getElementById('projectType').value,
      },
    });
    state.issues = result.issues;
    renderIssues();
    document.getElementById('reviewSub').textContent = `${result.issues.length} issues · ${state.selectedRepo.full_name}`;
    toast(`${result.total} issues générées !`, 'success');
    goTo(2);
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✨ Générer les issues';
  }
}

// ── Issues ────────────────────────────────────────────────────────────────────
function renderIssues() {
  const list = document.getElementById('issueList');
  if (!state.issues.length) {
    list.innerHTML = '<div class="card" style="text-align:center;color:var(--muted);padding:48px">Aucune issue.</div>';
    return;
  }
  list.innerHTML = state.issues.map((issue, idx) => `
    <div class="issue-card" id="ic-${idx}">
      <div class="issue-header">
        <div class="priority-dot ${issue.priority}"></div>
        <div class="issue-title" contenteditable="false"
             onclick="this.contentEditable='true';this.focus()"
             onblur="updateIssueTitle(${idx}, this.textContent);this.contentEditable='false'"
        >${esc(issue.title)}</div>
        <div class="issue-actions">
          <button class="btn btn-ghost btn-sm" onclick="toggleIssue(${idx})">▾</button>
          <button class="btn btn-danger btn-sm" onclick="removeIssue(${idx})">✕</button>
        </div>
      </div>
      <div class="issue-meta">
        <span class="badge ${issue.priority === 'haute' ? 'badge-high' : issue.priority === 'moyenne' ? 'badge-mid' : 'badge-low'}">${issue.priority}</span>
        ${issue.labels.map(l => `<span class="badge badge-label">${esc(l)}</span>`).join('')}
        ${issue.assignees.map(a => `<span class="badge" style="background:rgba(255,255,255,0.05);color:var(--muted)">@${esc(a)}</span>`).join('')}
        ${issue.estimated_effort ? `<span class="text-muted">⏱ ${esc(issue.estimated_effort)}</span>` : ''}
      </div>
      <div class="issue-expand" id="ie-${idx}">
        <div class="input-label" style="margin-bottom:6px">Description</div>
        <textarea class="input" style="min-height:100px;font-size:12px" onchange="state.issues[${idx}].body=this.value">${esc(issue.body)}</textarea>
        <div class="input-label" style="margin-top:12px;margin-bottom:6px">Critères d'acceptation</div>
        <div id="criteria-${idx}">
          ${issue.acceptance_criteria.map((c, ci) => `
            <div style="display:flex;gap:6px;margin-bottom:4px">
              <input type="text" class="input" style="font-size:12px" value="${esc(c)}"
                     onchange="state.issues[${idx}].acceptance_criteria[${ci}]=this.value">
              <button class="btn btn-danger btn-sm" onclick="removeCriteria(${idx},${ci})">✕</button>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-ghost btn-sm mt-2" onclick="addCriteria(${idx})">+ Critère</button>
      </div>
    </div>
  `).join('');
}

function toggleIssue(idx) {
  document.getElementById(`ie-${idx}`).classList.toggle('open');
}
function updateIssueTitle(idx, val) { state.issues[idx].title = val.trim(); }
function removeIssue(idx) { state.issues.splice(idx, 1); renderIssues(); }
function removeCriteria(idx, ci) { state.issues[idx].acceptance_criteria.splice(ci, 1); renderIssues(); }
function addCriteria(idx) { state.issues[idx].acceptance_criteria.push(''); renderIssues(); }

// ── Create ────────────────────────────────────────────────────────────────────
async function handleCreate() {
  const isDry = document.getElementById('dryRunCheck').checked;
  if (!state.selectedRepo) return toast('Aucun repo sélectionné', 'warning');
  if (!state.issues.length) return toast('Aucune issue à créer', 'warning');

  const btn = document.getElementById('btnCreate');
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${isDry ? 'Dry-run...' : 'Création...'}`;

  try {
    if (isDry) {
      const result = await fetchAPI('/github/dry-run', { method: 'POST', body: { issues: state.issues } });
      toast(`Dry-run : ${result.total} issues prêtes (aucune créée)`, 'success');
    } else {
      const result = await fetchAPI('/github/create-issues', {
        method: 'POST',
        body: { owner: state.selectedRepo.owner, repo: state.selectedRepo.name, issues: state.issues },
      });
      renderResults(result);
      goTo(3);
    }
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = isDry ? '👁 Dry-run' : '🚀 Créer les issues';
  }
}

// ── Results ───────────────────────────────────────────────────────────────────
function renderResults(result) {
  document.getElementById('resultTitle').textContent = `${result.total_created} issues créées !`;
  document.getElementById('resultSub').textContent = `Sur ${state.selectedRepo.full_name}`;

  document.getElementById('createdList').innerHTML = `
    <div class="card-title">✅ Issues créées (${result.created.length})</div>
    ${result.created.map(i => `
      <a href="${i.url}" target="_blank" class="result-item">
        <span class="result-number">#${i.number}</span>
        <span class="result-title">${esc(i.title)}</span>
        <span class="result-link">↗ Voir</span>
      </a>
    `).join('')}
    <div style="margin-top:16px">
      <a href="https://github.com/${state.selectedRepo.full_name}/issues" target="_blank" class="btn btn-ghost btn-sm">
        Voir toutes les issues GitHub ↗
      </a>
    </div>
  `;

  if (result.failed.length) {
    document.getElementById('failedList').style.display = '';
    document.getElementById('failedList').innerHTML = `
      <div class="card-title" style="color:var(--red)">❌ Échecs (${result.failed.length})</div>
      ${result.failed.map(i => `
        <div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
          <div style="color:var(--text)">${esc(i.title)}</div>
          <div style="color:var(--muted);font-size:11px;margin-top:2px">${esc(i.error)}</div>
        </div>
      `).join('')}
    `;
  }
}

// ── Reset ─────────────────────────────────────────────────────────────────────
function reset() {
  state.parsedContent = null;
  state.selectedRepo = null;
  state.issues = [];
  document.getElementById('textInput').value = '';
  document.getElementById('urlInput').value = '';
  document.getElementById('fileInput').value = '';
  document.getElementById('dropzone').innerHTML = `
    <div class="dropzone-icon">📂</div>
    <div class="dropzone-text">Glisse-dépose ton fichier ici ou clique pour parcourir</div>
    <div class="dropzone-sub">PDF · Markdown · DOCX · TXT · max 20MB</div>
  `;
  switchTab('text');
  goTo(0);
}

// ── API helper ────────────────────────────────────────────────────────────────
async function fetchAPI(path, { method = 'GET', body, noJson } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let fetchBody;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    fetchBody = JSON.stringify(body);
  } else {
    fetchBody = body;
  }

  const res = await fetch(`${API}${path}`, { method, headers, body: fetchBody });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  const colors = { success: '#00e096', error: '#ff3d6b', warning: '#ffd166', info: '#00e5ff' };
  el.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:9999;
    background:#0e1318; border:1px solid ${colors[type]}44;
    color:${colors[type]}; padding:12px 20px; border-radius:10px;
    font-family:'Syne',sans-serif; font-size:13px; font-weight:600;
    box-shadow:0 4px 24px rgba(0,0,0,0.4);
    animation:fadeUp 0.2s ease;
    max-width:320px;
  `;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initDropzone();
  renderMembers();
  renderNewMemberRoles();

  // Load team config from localStorage if saved
  const saved = localStorage.getItem('sti_team');
  if (saved) {
    try { state.teamConfig = JSON.parse(saved); renderMembers(); } catch {}
  }

  // Save team config on page unload
  window.addEventListener('beforeunload', () => {
    localStorage.setItem('sti_team', JSON.stringify(state.teamConfig));
  });
});
