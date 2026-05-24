'use strict';

// ─── State machine ────────────────────────────────────────────────────────────
const STATE = {
  WAITING:       'WAITING',
  ROUND_ACTIVE:  'ROUND_ACTIVE',
  ROUND_RESULTS: 'ROUND_RESULTS',
};

let currentState = STATE.WAITING;
let players      = [];    // [{playerNum, playerName, color, modality, playCount, playerId}]
let sessionId    = `S${Date.now()}`;
let roundResults = [];
let currentRound = 0;
let currentLevel = 1;

let phaserGame       = null;
let activeMazeScene  = null;
let lbInterval       = null;
let rrCountdownTimer = null;

// ─── Socket ───────────────────────────────────────────────────────────────────
const socket = io({ query: { role: 'pc' } });

socket.on('connect',    () => console.log('[Display] Connected:', socket.id));
socket.on('disconnect', () => console.log('[Display] Disconnected'));

socket.on('SESSION_RESTORE', ({ players: list }) => {
  if (list?.length) { players = list; _renderWaiting(); }
});

socket.on('PLAYERS_UPDATE', ({ players: list }) => {
  players = list || [];
  if (players.length && currentState === STATE.WAITING) sessionId = `S${Date.now()}`;
  if (currentState === STATE.WAITING) _renderWaiting();
});

socket.on('CONTROLLER_DISCONNECTED', ({ playerNum, playerName, color }) => {
  players = players.filter(p => p.playerNum !== playerNum);
  if (currentState === STATE.WAITING) _renderWaiting();
  if (currentState === STATE.ROUND_ACTIVE) {
    _showNotification(`${playerName || `P${playerNum}`} disconnected`, color || '#ff4455');
  }
});

socket.on('GYRO_DATA', ({ gamma, beta, player }) => {
  if (activeMazeScene) activeMazeScene.setTilt(player, gamma, beta || 0);
});


// Admin triggers GAME_START → server forwards here
socket.on('GAME_START', ({ level } = {}) => {
  currentRound++;
  currentLevel = Math.min(3, Math.max(1, Number(level) || 1));
  _transitionTo(STATE.ROUND_ACTIVE);
  _destroyPhaser();

  const playerList = players.map(p => ({ playerNum: p.playerNum, color: p.color, name: p.playerName }));

  phaserGame = window.createPhaserGame('game-container', {
    players:           playerList,
    level:             currentLevel,
    onWallHit:         _onWallHit,
    onGameEnd:         _onGameEnd,
    onProximityChange: _onProximityChange,
  });

  phaserGame.events.once('ready', () => {
    activeMazeScene = phaserGame.scene.getScene('MazeScene');
  });
});

// ─── State helpers ────────────────────────────────────────────────────────────
function _transitionTo(state) {
  console.log(`[Display] ${currentState} → ${state}`);
  currentState = state;
  document.querySelectorAll('.view, #game-container').forEach(el => el.classList.remove('active'));
  const map = {
    [STATE.WAITING]:       'view-waiting',
    [STATE.ROUND_ACTIVE]:  'game-container',
    [STATE.ROUND_RESULTS]: 'view-round-results',
  };
  document.getElementById(map[state])?.classList.add('active');

  const lb = document.getElementById('live-lb');
  if (state === STATE.ROUND_ACTIVE) {
    lb?.classList.add('visible');
    lbInterval = setInterval(_updateLiveLb, 500);
  } else {
    lb?.classList.remove('visible');
    clearInterval(lbInterval); lbInterval = null;
  }
}

// ─── Waiting screen ───────────────────────────────────────────────────────────
function _renderWaiting() {
  const dots  = document.getElementById('waiting-player-dots');
  const count = document.getElementById('waiting-player-count');
  if (!dots) return;

  dots.innerHTML = '';
  players.forEach(p => {
    const wrap = document.createElement('div');
    wrap.className = 'waiting-dot-wrap';
    const dot = document.createElement('div');
    dot.className = 'waiting-dot';
    dot.style.background  = p.color;
    dot.style.boxShadow   = `0 0 16px ${p.color}66`;
    const lbl = document.createElement('div');
    lbl.className    = 'waiting-dot-label';
    lbl.style.color  = p.color;
    lbl.textContent  = _esc(p.playerName.slice(0, 10));
    wrap.appendChild(dot);
    wrap.appendChild(lbl);
    dots.appendChild(wrap);
  });

  if (count) count.textContent = players.length
    ? `${players.length} player${players.length > 1 ? 's' : ''} connected`
    : 'Waiting for players to scan the QR code…';
}

// ─── Callbacks from game ──────────────────────────────────────────────────────
function _onWallHit(playerNum) {
  socket.emit('FEEDBACK_EVENT', { playerNum, feedbackType: 'wall_hit' });
}


function _onProximityChange(playerNum, level) {
  socket.emit('PROXIMITY_UPDATE', { playerNum, level });
}

function _onGameEnd({ rankings, round_duration_ms }) {
  socket.emit('GAME_END');
  socket.emit('ROUND_COMPLETE', { rankings });

  const result = { round: currentRound, level: currentLevel, round_duration_ms, rankings, playerSnapshot: [...players] };
  roundResults.push(result);
  _exportRoundCsv(result);

  _transitionTo(STATE.ROUND_RESULTS);
  _renderRoundResults(result);

  let secs = currentLevel < 3 ? 20 : 30;
  const cd = document.getElementById('rr-countdown');
  rrCountdownTimer = setInterval(() => {
    secs--;
    if (secs > 0 && cd) {
      cd.textContent = currentLevel < 3
        ? `Ready for Level ${currentLevel + 1} — returning in ${secs}s`
        : `Session complete — returning in ${secs}s`;
    }
    if (secs <= 0) { clearInterval(rrCountdownTimer); _backToWaiting(); }
  }, 1000);
}

function _exportRoundCsv({ round, level, round_duration_ms, rankings, playerSnapshot }) {
  const ts = new Date().toISOString();
  rankings.forEach((entry) => {
    const p = playerSnapshot.find(pl => pl.playerNum === entry.playerNum);
    if (!p) return;
    socket.emit('EXPORT_RESULTS', {
      session_id:          sessionId,
      round,
      difficulty_level:    level,
      round_duration_ms:   round_duration_ms || 0,
      player_id:           p.playerId   || '',
      player_name:         p.playerName || '',
      modality:            p.modality   || 'none',
      checkpoints_passed:  entry.checkpoints || 0,
      falls:               entry.falls       || 0,
      score:               entry.score,
      time_at_level_1_ms:  entry.time_at_level_1_ms || 0,
      time_at_level_2_ms:  entry.time_at_level_2_ms || 0,
      time_at_level_3_ms:  entry.time_at_level_3_ms || 0,
      session_timestamp:   ts,
    });
  });
}

// ─── Round results ────────────────────────────────────────────────────────────
function _renderRoundResults({ level, rankings, playerSnapshot }) {
  const title = document.getElementById('rr-title');
  const levelLabel = level < 3 ? `Level ${level} Complete` : 'All Levels Complete';
  if (title) title.textContent = levelLabel;

  const tbody = document.getElementById('rr-rankings');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!rankings.length) return;
  const entry = rankings[0];
  const p     = playerSnapshot.find(pl => pl.playerNum === entry.playerNum);
  const color = p?.color || '#00cfff';
  const name  = _esc(p?.playerName || 'Player');
  const ml    = { haptic: '📳 Haptic', audio: '🔊 Audio', none: '— None' };

  const fmt = ms => `${(ms / 1000).toFixed(1)}s`;

  tbody.innerHTML = `
    <tr>
      <td colspan="2" style="color:${color};font-size:1.4em;font-weight:bold;padding-bottom:8px">${name}</td>
    </tr>
    <tr>
      <td class="rr-unit">Score</td>
      <td style="color:${color};font-weight:bold">${entry.score} pts</td>
    </tr>
    <tr>
      <td class="rr-unit">Checkpoints</td>
      <td>${entry.checkpoints} / ${entry.totalCheckpoints || '?'}</td>
    </tr>
    <tr>
      <td class="rr-unit">Falls</td>
      <td>${entry.falls}</td>
    </tr>
    <tr>
      <td class="rr-unit">Feedback</td>
      <td>${ml[p?.modality] || '—'}</td>
    </tr>
    <tr><td colspan="2" style="padding-top:10px;color:#555;font-size:0.8em">Proximity exposure</td></tr>
    <tr>
      <td class="rr-unit">Near (L1)</td>
      <td>${fmt(entry.time_at_level_1_ms)}</td>
    </tr>
    <tr>
      <td class="rr-unit">Warn (L2)</td>
      <td>${fmt(entry.time_at_level_2_ms)}</td>
    </tr>
    <tr>
      <td class="rr-unit">Danger (L3)</td>
      <td>${fmt(entry.time_at_level_3_ms)}</td>
    </tr>`;

  const cd = document.getElementById('rr-countdown');
  if (cd) cd.textContent = level < 3 ? `Ready for Level ${level + 1}` : 'Session complete — returning…';
}

function _backToWaiting() {
  clearInterval(rrCountdownTimer);
  _destroyPhaser();
  _renderWaiting();
  _transitionTo(STATE.WAITING);
}

// ─── Live score HUD ───────────────────────────────────────────────────────────
function _updateLiveLb() {
  if (!activeMazeScene) return;
  const stats  = activeMazeScene.getStats();
  const lbList = document.getElementById('live-lb-list');
  if (!lbList) return;

  const p = players[0];
  const s = p ? stats[p.playerNum] : null;
  if (!s) { lbList.innerHTML = ''; return; }

  const color = p?.color || '#00cfff';
  lbList.innerHTML =
    `<div class="lb-row" style="color:${color}">` +
      `${_esc((p?.playerName || 'Player').slice(0, 9))}: ${s.score} pts` +
      ` &nbsp;· Falls: ${s.falls}` +
    `</div>`;
}

// ─── Notification toast ───────────────────────────────────────────────────────
function _showNotification(msg, color) {
  const el = document.getElementById('notification');
  if (!el) return;
  el.textContent       = msg;
  el.style.borderColor = color || '#555';
  el.style.display     = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, 3000);
}

// ─── Phaser lifecycle ─────────────────────────────────────────────────────────
function _destroyPhaser() {
  if (phaserGame) { phaserGame.destroy(true); phaserGame = null; }
  activeMazeScene = null;
}

function _esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
(function init() {
  _renderWaiting();
  console.log('[Display] Ready — waiting for admin to start game');
})();
