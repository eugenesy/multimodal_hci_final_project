'use strict';

// ─── State machine ────────────────────────────────────────────────────────────
const STATE = {
  WAITING:       'WAITING',
  CALIBRATING:   'CALIBRATING',
  ROUND_ACTIVE:  'ROUND_ACTIVE',
  ROUND_RESULTS: 'ROUND_RESULTS',
};

const LEVEL_META = {
  1: { label: 'LEVEL 1', desc: 'Gentle S-curve · 90 s', name: 'LEVEL<br>ONE' },
  2: { label: 'LEVEL 2', desc: 'N-shape · 75 s',        name: 'LEVEL<br>TWO' },
  3: { label: 'LEVEL 3', desc: 'Tight zigzag · 60 s',   name: 'LEVEL<br>THREE' },
};

let currentState = STATE.WAITING;
let players      = [];
let sessionId    = '';
let roundResults = [];
let currentRound = 0;
let currentLevel = 1;

let phaserGame      = null;
let activeMazeScene = null;
let sbInterval      = null;
let rrTimer         = null;

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
  if (!activeMazeScene && phaserGame) activeMazeScene = phaserGame.scene.getScene('MazeScene');
  if (activeMazeScene) activeMazeScene.setTilt(player, gamma, beta || 0);
});

socket.on('GAME_START', ({ level } = {}) => {
  currentRound++;
  currentLevel = Math.min(3, Math.max(1, Number(level) || 1));
  _destroyPhaser();

  // Update level banner
  const meta = LEVEL_META[currentLevel] || LEVEL_META[1];
  const lbLevel = document.getElementById('lb-level');
  const lbDesc  = document.getElementById('lb-desc');
  if (lbLevel) lbLevel.textContent = meta.label;
  if (lbDesc)  lbDesc.textContent  = meta.desc;

  // Update topbar
  const p = players[0];
  const statusTag  = document.getElementById('display-status-tag');
  const phaseBadge = document.getElementById('display-phase-badge');
  if (statusTag)  statusTag.textContent  = p ? `${p.playerName} · ${(p.modality || '').toUpperCase()}` : '';
  if (phaseBadge) { phaseBadge.textContent = 'GAME'; phaseBadge.style.background = 'var(--red)'; phaseBadge.style.color = '#fff'; }

  // Show game view NOW so phaser-wrap has real layout dimensions
  _transitionTo(STATE.ROUND_ACTIVE);
  _showCalibOverlay(true);

  // Build Phaser after one animation frame so the browser computes layout
  const playerList = players.map(pl => ({ playerNum: pl.playerNum, color: pl.color, name: pl.playerName }));
  requestAnimationFrame(() => {
    phaserGame = window.createPhaserGame('phaser-wrap', {
      players:           playerList,
      level:             currentLevel,
      startPaused:       true,
      onWallHit:         _onWallHit,
      onGameEnd:         _onGameEnd,
      onProximityChange: _onProximityChange,
      onReady:           (scene) => { activeMazeScene = scene; },
    });
  });
});

socket.on('CALIBRATION_DONE', () => {
  _showCalibOverlay(false);
  if (!activeMazeScene && phaserGame) activeMazeScene = phaserGame.scene.getScene('MazeScene');
  if (activeMazeScene) activeMazeScene.setPaused(false);
});

// ─── State helpers ────────────────────────────────────────────────────────────
function _transitionTo(state) {
  console.log(`[Display] ${currentState} → ${state}`);
  currentState = state;

  // Hide all views
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  // Hide level banner by default
  const banner = document.getElementById('level-banner');
  if (banner) banner.classList.remove('active');

  if (state === STATE.WAITING) {
    document.getElementById('view-waiting')?.classList.add('active');
  } else if (state === STATE.ROUND_ACTIVE) {
    document.getElementById('view-game')?.classList.add('active');
    if (banner) banner.classList.add('active');
  } else if (state === STATE.ROUND_RESULTS) {
    document.getElementById('view-results')?.classList.add('active');
  }
}

function _showCalibOverlay(show) {
  const el = document.getElementById('calib-overlay');
  if (!el) return;
  if (show) el.classList.add('active');
  else el.classList.remove('active');
}

// ─── Waiting screen ───────────────────────────────────────────────────────────
function _renderWaiting() {
  const playerWrap = document.getElementById('waiting-player');
  const dotLabel   = document.getElementById('waiting-dot-label');
  const playerName = document.getElementById('waiting-player-name');
  const playerMod  = document.getElementById('waiting-player-mod');
  const statusTag  = document.getElementById('display-status-tag');
  const phaseBadge = document.getElementById('display-phase-badge');

  if (phaseBadge) { phaseBadge.textContent = 'LOBBY'; phaseBadge.style.background = 'var(--rule)'; phaseBadge.style.color = 'var(--black)'; }

  const ml = { haptic: '📳 HAPTIC', audio: '🔊 AUDIO', none: '— NONE' };

  if (!players.length) {
    if (statusTag)  statusTag.textContent  = 'WAITING FOR PARTICIPANT';
    if (playerWrap) playerWrap.style.display = 'none';
    return;
  }

  const p = players[0];
  if (statusTag)   statusTag.textContent = `${p.playerName} · ${(p.modality || '').toUpperCase()}`;
  if (playerWrap)  playerWrap.style.display = 'flex';
  if (dotLabel)    dotLabel.textContent    = `P${p.playerNum}`;
  if (playerName)  playerName.textContent  = p.playerName;
  if (playerMod)   playerMod.textContent   = `${ml[p.modality] || ''} · Session ${(p.playCount || 0) + 1}`;
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
}

function _exportRoundCsv({ round, level, round_duration_ms, rankings, playerSnapshot }) {
  const ts = new Date().toISOString();
  rankings.forEach(entry => {
    const p = playerSnapshot.find(pl => pl.playerNum === entry.playerNum);
    if (!p) return;
    socket.emit('EXPORT_RESULTS', {
      session_id:         sessionId,
      round,
      difficulty_level:   level,
      round_duration_ms:  round_duration_ms || 0,
      player_id:          p.playerId   || '',
      player_name:        p.playerName || '',
      modality:           p.modality   || 'none',
      checkpoints_passed: entry.checkpoints || 0,
      falls:              entry.falls        || 0,
      score:              entry.score        || 0,
      time_at_level_1_ms: entry.time_at_level_1_ms || 0,
      time_at_level_2_ms: entry.time_at_level_2_ms || 0,
      time_at_level_3_ms: entry.time_at_level_3_ms || 0,
      session_timestamp:  ts,
    });
  });
}

// ─── Round results screen ─────────────────────────────────────────────────────
function _renderRoundResults({ level, round_duration_ms, rankings, playerSnapshot }) {
  const meta  = LEVEL_META[level] || LEVEL_META[1];
  const entry = rankings[0];
  const p     = playerSnapshot.find(pl => pl.playerNum === entry?.playerNum);
  const ml    = { haptic: '📳 Haptic', audio: '🔊 Audio', none: '— None' };
  const secs_taken = ((round_duration_ms || 0) / 1000).toFixed(1);

  document.getElementById('res-title').innerHTML      = meta.name;
  document.getElementById('res-player').textContent   = p?.playerName || '—';
  document.getElementById('res-modality').textContent = ml[p?.modality] || '—';
  document.getElementById('rstat-duration').textContent = `${secs_taken}s`;

  const nextTxt = document.getElementById('res-next-txt');
  const cd      = document.getElementById('res-countdown');
  if (level < 3) {
    if (nextTxt) nextTxt.textContent = 'Next round in';
  } else {
    if (nextTxt) nextTxt.textContent = 'Session complete in';
  }

  let secs = 5;
  if (cd) cd.textContent = secs;

  rrTimer = setInterval(() => {
    secs--;
    if (cd) cd.textContent = secs > 0 ? secs : '';
    if (secs <= 0) {
      clearInterval(rrTimer);
      if (level < 3) {
        socket.emit('AUTO_NEXT_LEVEL', { level: level + 1 });
      } else {
        _backToWaiting();
      }
    }
  }, 1000);
}

function _backToWaiting() {
  clearInterval(rrTimer);
  _destroyPhaser();
  _renderWaiting();
  _transitionTo(STATE.WAITING);
}

// ─── Notification toast ───────────────────────────────────────────────────────
function _showNotification(msg, color) {
  const el = document.getElementById('notification');
  if (!el) return;
  el.textContent       = msg;
  el.style.borderColor = color || 'var(--red)';
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
  console.log('[Display] Ready — waiting for admin to start');
})();
