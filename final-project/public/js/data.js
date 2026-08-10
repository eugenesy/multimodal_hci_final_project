'use strict';

let allSessions = [];

async function loadData() {
  try {
    const resp = await fetch('/api/sessions');
    allSessions = await resp.json();
    applyFilter();
  } catch (e) {
    console.error('[Data] Load failed:', e);
  }
}

function applyFilter() {
  const status = document.getElementById('filter-status').value;
  const rows = status ? allSessions.filter(s => s.status === status) : allSessions;
  renderTable(rows);
}

const modalityLabel = { haptic: '📳 Haptic', audio: '🔊 Audio', none: '— None' };
const modalityClass = { haptic: 'badge-haptic', audio: 'badge-audio', none: 'badge-none' };
const statusClass   = { accepted: 'badge-accepted', discarded: 'badge-discarded', pending: 'badge-pending' };

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderTable(sessions) {
  const tbody = document.getElementById('table-body');
  const empty = document.getElementById('empty-msg');
  const count = document.getElementById('count-label');

  count.textContent = `${sessions.length} session${sessions.length !== 1 ? 's' : ''}`;

  if (!sessions.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = sessions.map(s => {
    const roundBoxes = (s.rounds || []).map(r => `
      <div class="round-box">
        <div class="rb-lvl">L${r.difficulty_level}</div>
        <div class="rb-falls">${r.falls} falls</div>
        <div class="rb-cp">${r.checkpoints_passed} cp</div>
      </div>`).join('');

    const date = s.created_at
      ? new Date(s.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
      : '—';

    const survey = s.survey ? `<div class="survey-text" title="${esc(s.survey)}">${esc(s.survey)}</div>` : '<span style="color:#ccc">—</span>';

    const deviceStr = [s.device_model, s.os, s.browser].filter(Boolean).join(' · ') || '—';

    return `<tr>
      <td>
        <div class="cell-name">${esc(s.participant_name || '—')}</div>
        <div class="cell-meta">${esc(s.handedness ? s.handedness + '-handed' : '')}${s.age ? ' · age ' + esc(s.age) : ''}${s.gender ? ' · ' + esc(s.gender) : ''}</div>
      </td>
      <td><span class="badge ${modalityClass[s.modality] || ''}">${esc(s.modality || '—')}</span></td>
      <td><span class="badge ${statusClass[s.status] || 'badge-pending'}">${esc(s.status || 'pending')}</span></td>
      <td><div class="round-cell">${roundBoxes || '<span style="color:#ccc">—</span>'}</div></td>
      <td><div class="cell-meta">${esc(deviceStr)}</div></td>
      <td>${survey}</td>
      <td><div class="cell-meta">${esc(date)}</div></td>
    </tr>`;
  }).join('');
}

loadData();
