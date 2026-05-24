'use strict';

let players          = [];
let currentPhase     = 'LOBBY';
let currentRound     = 0;
let allResults       = [];   // [{round, level, rankings}]
let completedLevels  = new Set();   // levels finished this session

// ─── Socket ───────────────────────────────────────────────────────────────────
const socket = io({ query: { role: 'admin' } });

socket.on('connect',    () => { console.log('[Admin] Connected:', socket.id); });
socket.on('disconnect', () => { console.log('[Admin] Disconnected'); _setPhase('LOBBY'); });

socket.on('SESSION_RESTORE', ({ players: list, phase, round }) => {
  players      = list || [];
  currentRound = round || 0;
  _setPhase(phase || 'LOBBY');
  _renderPlayers();
  _loadQrCode();
});

socket.on('PLAYERS_UPDATE', ({ players: list }) => {
  players = list || [];
  _renderPlayers();
});

socket.on('CONTROLLER_DISCONNECTED', ({ playerName, color }) => {
  _showToast(`${playerName || 'Player'} disconnected`, color || '#ff4455');
});

let currentLevel = 0;

socket.on('PHASE_CHANGE', ({ phase, round, level }) => {
  if (round !== undefined) currentRound = round;
  if (level !== undefined) currentLevel = level;
  _setPhase(phase);
  _renderLevelButtons();
});

socket.on('ROUND_COMPLETE', ({ rankings, round }) => {
  allResults.push({ round, level: currentLevel, rankings });
  if (currentLevel) completedLevels.add(currentLevel);
  _renderResults();
  _renderLevelButtons();
});

// ─── Controls ─────────────────────────────────────────────────────────────────
function adminStartLevel(level) {
  if (currentPhase !== 'LOBBY' || players.length < 1) return;
  socket.emit('GAME_START', { level });
}

function adminBackToLobby() {
  socket.emit('BACK_TO_LOBBY');
}

// ─── QR code ─────────────────────────────────────────────────────────────────
async function _loadQrCode() {
  try {
    const r = await fetch('/qr').then(r => r.json());
    const img = document.getElementById('qr-single');
    if (img) img.src = r.qr;
    const url = document.getElementById('url-single');
    if (url) url.textContent = r.url;
  } catch (e) {
    console.error('[Admin] QR load failed:', e);
  }
}

// ─── Phase UI ─────────────────────────────────────────────────────────────────
function _setPhase(phase) {
  currentPhase = phase;

  const badge    = document.getElementById('phase-badge');
  const lobbyBtn = document.getElementById('lobby-btn');
  const roundLbl = document.getElementById('round-label');

  if (badge) {
    badge.textContent = phase === 'GAME' ? `In Game — Level ${currentLevel}` : 'Lobby';
    badge.className   = phase === 'GAME' ? 'game' : 'lobby';
  }
  if (roundLbl) roundLbl.textContent = `Round ${currentRound}`;
  if (lobbyBtn) lobbyBtn.style.display = phase === 'GAME' ? 'block' : 'none';

  _renderLevelButtons();
}

function _renderLevelButtons() {
  const container = document.getElementById('level-btns');
  if (!container) return;
  container.innerHTML = '';
  [1, 2, 3].forEach(lvl => {
    const btn = document.createElement('button');
    const done = completedLevels.has(lvl);
    btn.textContent = done ? `✓ Level ${lvl}` : `▶ Level ${lvl}`;
    btn.className   = done ? 'level-btn done' : 'level-btn';
    btn.disabled    = currentPhase !== 'LOBBY' || players.length < 1;
    btn.addEventListener('click', () => adminStartLevel(lvl));
    container.appendChild(btn);
  });
}

// ─── Player list ──────────────────────────────────────────────────────────────
function _renderPlayers() {
  const list  = document.getElementById('player-list');
  const count = document.getElementById('player-count');
  if (!list) return;

  if (count) count.textContent = `${players.length} / 1`;

  if (!players.length) {
    list.innerHTML = '<div class="player-empty">No players connected yet</div>';
    _setPhase(currentPhase);
    return;
  }

  const ml = { haptic:'📳 Haptic', audio:'🔊 Audio', none:'— None' };
  list.innerHTML = '';
  for (const p of players) {
    const row = document.createElement('div');
    row.className = 'player-row';
    row.style.borderLeftColor = p.color;
    row.innerHTML = `
      <span class="pr-num" style="color:${_esc(p.color)}">P${p.playerNum}</span>
      <span class="pr-name" style="color:${_esc(p.color)}">${_esc(p.playerName)}</span>
      <span class="pr-mod">${ml[p.modality] || p.modality}</span>
      <span class="pr-session">S${(p.playCount || 0) + 1}</span>`;
    list.appendChild(row);
  }

  _setPhase(currentPhase);
}

// ─── Results panel ────────────────────────────────────────────────────────────
function _renderResults() {
  const panel = document.getElementById('results-panel');
  if (!panel) return;

  if (!allResults.length) {
    panel.innerHTML = '<div class="results-empty">Results will appear here after each round</div>';
    return;
  }

  const ml = { haptic:'📳', audio:'🔊', none:'—' };
  panel.innerHTML = '';

  // Show most recent rounds first
  for (const { round, rankings } of [...allResults].reverse()) {
    const section = document.createElement('div');
    section.className = 'result-round';

    const lbl = document.createElement('div');
    lbl.className   = 'result-round-label';
    lbl.textContent = `Round ${round}`;
    section.appendChild(lbl);

    for (let i = 0; i < rankings.length; i++) {
      const entry = rankings[i];
      const p     = players.find(pl => pl.playerNum === entry.playerNum);
      const color = p?.color || '#888';
      const name  = _esc(p?.playerName || `P${entry.playerNum}`);

      const row = document.createElement('div');
      row.className = 'result-row';
      row.innerHTML = `
        <span class="rr-rank">🏆</span>
        <span class="rr-name" style="color:${color}">${name}</span>
        <span class="rr-score">${entry.score}pt · ${entry.falls ?? 0}f</span>
        <span class="rr-mod">${ml[p?.modality] || '—'}</span>`;
      section.appendChild(row);
    }

    panel.appendChild(section);
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function _showToast(msg, color) {
  const el = document.getElementById('notification');
  if (!el) return;
  el.textContent       = msg;
  el.style.borderColor = color || '#555';
  el.style.display     = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, 3000);
}

function _esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
_loadQrCode();
console.log('[Admin] Ready');
