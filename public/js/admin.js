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
    badge.textContent = phase === 'GAME' ? `GAME — L${currentLevel}` : 'LOBBY';
    badge.className   = phase === 'GAME' ? 'game' : '';
  }
  if (roundLbl) roundLbl.textContent = `Round ${currentRound}`;
  if (lobbyBtn) lobbyBtn.style.display = phase === 'GAME' ? 'flex' : 'none';

  _renderLevelButtons();
}

const LEVEL_META = {
  1: { title: 'Introductory', desc: 'S-curve · 90 s · ±80 px' },
  2: { title: 'Moderate',     desc: 'N-shape · 75 s · ±55 px' },
  3: { title: 'Hard',         desc: 'Zigzag · 60 s · ±35 px' },
};

function _renderLevelButtons() {
  const container = document.getElementById('level-btns');
  if (!container) return;
  container.innerHTML = '';
  [1, 2, 3].forEach(lvl => {
    const done = completedLevels.has(lvl);
    const meta = LEVEL_META[lvl];
    const btn  = document.createElement('button');
    btn.className = `level-btn${done ? ' done' : ''}`;
    btn.disabled  = currentPhase !== 'LOBBY' || players.length < 1;
    btn.innerHTML = `
      <div class="lvl-num">${done ? '✓' : lvl}</div>
      <div>
        <div class="lvl-title">${meta.title}</div>
        <div class="lvl-desc">${meta.desc}</div>
      </div>`;
    btn.addEventListener('click', () => adminStartLevel(lvl));
    container.appendChild(btn);
  });
}

// ─── Player list ──────────────────────────────────────────────────────────────
function _renderPlayers() {
  const list = document.getElementById('player-list');
  if (!list) return;

  if (!players.length) {
    list.innerHTML = '<div class="player-empty">No player connected yet</div>';
    _setPhase(currentPhase);
    return;
  }

  const ml = { haptic: '📳 Haptic', audio: '🔊 Audio', none: '— None' };
  list.innerHTML = '';
  for (const p of players) {
    const card = document.createElement('div');
    card.className = 'player-card';
    const handStr = p.handedness ? ` · ${p.handedness}-handed` : '';
    card.innerHTML = `
      <div class="player-name">${_esc(p.playerName)}</div>
      <div class="player-meta">${ml[p.modality] || p.modality} · Session ${(p.playCount || 0) + 1}${handStr}</div>`;
    list.appendChild(card);
  }

  _setPhase(currentPhase);
}

// ─── Results panel ────────────────────────────────────────────────────────────
function _renderResults() {
  const panel = document.getElementById('results-panel');
  if (!panel) return;

  if (!allResults.length) {
    panel.innerHTML = '<div class="results-empty">Results appear here after each round</div>';
    return;
  }

  const ml = { haptic: '📳', audio: '🔊', none: '—' };
  panel.innerHTML = '';

  for (const { round, level, rankings } of [...allResults].reverse()) {
    const section = document.createElement('div');
    section.style.marginBottom = '14px';

    const lbl = document.createElement('div');
    lbl.className   = 'result-round-label';
    lbl.textContent = `Round ${round} — Level ${level}`;
    section.appendChild(lbl);

    for (const entry of rankings) {
      const p    = players.find(pl => pl.playerNum === entry.playerNum);
      const name = _esc(p?.playerName || `P${entry.playerNum}`);

      const row = document.createElement('div');
      row.className = 'result-entry';
      row.innerHTML = `
        <div>
          <div class="re-name">${name}</div>
          <div class="re-meta">${ml[p?.modality] || '—'} · ${entry.checkpoints ?? entry.checkpoints_passed ?? 0} checkpoints</div>
        </div>
        <div style="text-align:right">
          <div class="re-falls">${entry.falls ?? 0} falls</div>
        </div>`;
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
