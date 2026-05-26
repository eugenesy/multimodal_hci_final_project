'use strict';

const express    = require('express');
const https      = require('https');
const http       = require('http');
const { Server } = require('socket.io');
const qrcode     = require('qrcode');
const os         = require('os');
const fs         = require('fs');
const path       = require('path');
const crypto     = require('crypto');

const PORT = 3000;

const CERT_PATH = path.join(__dirname, 'cert.pem');
const KEY_PATH  = path.join(__dirname, 'key.pem');

let useHttps = false;
let serverOptions = null;
if (fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH)) {
  serverOptions = { key: fs.readFileSync(KEY_PATH), cert: fs.readFileSync(CERT_PATH) };
  useHttps = true;
  console.log('[HTTPS] Certificate found — serving over HTTPS ✓');
} else {
  console.warn('[HTTPS] cert.pem / key.pem not found — falling back to HTTP (gyro will NOT work on phones).');
}

// ─── Constants ────────────────────────────────────────────────────────────────
const COLORS     = ['#00cfff','#ff6b35','#00ff88','#cc44ff','#ffdd00','#ff4455','#ff88cc','#e0e0e0'];
const MODALITIES = ['haptic', 'audio', 'none'];

const DATA_DIR     = path.join(__dirname, 'data');
const HISTORY_PATH = path.join(DATA_DIR, 'players.json');
const SURVEY_PATH  = path.join(DATA_DIR, 'survey_responses.jsonl');

// ─── CSV helpers ──────────────────────────────────────────────────────────────
// RFC 4180: wrap field in quotes if it contains comma, double-quote, or newline.
function csvField(v) {
  const s = String(v ?? '');
  return (s.includes(',') || s.includes('"') || s.includes('\n'))
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
}

// ─── Session state ────────────────────────────────────────────────────────────
let pcSocket    = null;
let adminSocket = null;
const players         = new Map();  // socketId → PlayerState
const lastGyroTime    = new Map();  // socketId → timestamp
const _exportedRounds = new Set();  // "sessionId:round:playerId" dedup keys
let playerHistory     = {};         // playerId → { playCount, modalitiesExperienced, devices }
let session           = { phase: 'LOBBY', round: 0, sessionId: '' };

// ─── Player history persistence ───────────────────────────────────────────────
function loadPlayerHistory() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(HISTORY_PATH)) {
      playerHistory = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('[History] Load failed:', e.message);
    playerHistory = {};
  }
}

async function savePlayerHistory() {
  try {
    await fs.promises.mkdir(DATA_DIR, { recursive: true });
    const tmp = HISTORY_PATH + '.tmp';
    await fs.promises.writeFile(tmp, JSON.stringify(playerHistory, null, 2), 'utf8');
    await fs.promises.rename(tmp, HISTORY_PATH);
  } catch (e) {
    console.error('[History] Save failed:', e.message);
  }
}

function getOrInitHistory(playerId) {
  if (!playerHistory[playerId]) {
    playerHistory[playerId] = { playCount: 0, modalitiesExperienced: [], devices: [] };
  }
  return playerHistory[playerId];
}

async function updateHistoryOnRoundComplete(playerId, modality) {
  const h = getOrInitHistory(playerId);
  h.playCount++;
  if (!h.modalitiesExperienced.includes(modality)) h.modalitiesExperienced.push(modality);
  await savePlayerHistory();
}

// ─── Player assignment helpers ────────────────────────────────────────────────
function assignPlayerNum() {
  const taken = new Set([...players.values()].map(p => p.playerNum));
  for (let n = 1; n <= 8; n++) { if (!taken.has(n)) return n; }
  return null;
}

function assignColor(playerNum) {
  return COLORS[(playerNum - 1) % COLORS.length];
}

function assignModality(canVibrate, modalitiesExperienced) {
  const pool = canVibrate
    ? MODALITIES
    : MODALITIES.filter(m => m !== 'haptic');
  const untried = pool.filter(m => !modalitiesExperienced.includes(m));
  const candidates = untried.length ? untried : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ─── Broadcast helpers ────────────────────────────────────────────────────────
function playersList() {
  return [...players.values()].map(p => ({
    playerNum:  p.playerNum,
    playerName: p.playerName,
    color:      p.color,
    modality:   p.modality,
    playCount:  p.playCount,
    playerId:   p.playerId,
    handedness: p.handedness || '',
  }));
}

function broadcastPlayersUpdate() {
  const list = playersList();
  if (pcSocket)    pcSocket.emit('PLAYERS_UPDATE',    { players: list });
  if (adminSocket) adminSocket.emit('PLAYERS_UPDATE', { players: list });
}

function getPlayerByNum(playerNum) {
  for (const p of players.values()) { if (p.playerNum === playerNum) return p; }
  return null;
}

// ─── Proximity / feedback routing ─────────────────────────────────────────────
function routeProximity(playerNum, level) {
  const p = getPlayerByNum(playerNum);
  if (!p) return;
  const evtMap = { haptic: 'HAPTIC_PROXIMITY', audio: 'AUDIO_PROXIMITY' };
  const evt = evtMap[p.modality];
  if (evt) p.socket.emit(evt, { level });
}

function routeFeedbackEvent(playerNum, feedbackType) {
  const p = getPlayerByNum(playerNum);
  if (!p) return;
  if (feedbackType === 'wall_hit') routeProximity(playerNum, 4);
}

// ─── Round validation ─────────────────────────────────────────────────────────
function validateRoundRow(row) {
  const errors = [];
  const nonNegFields = ['falls', 'checkpoints_passed', 'round_duration_ms',
    'time_at_level_1_ms', 'time_at_level_2_ms', 'time_at_level_3_ms'];
  for (const f of nonNegFields) {
    const v = Number(row[f]);
    if (!Number.isFinite(v) || v < 0) errors.push(`${f}=${row[f]}`);
  }
  if (!Number.isFinite(Number(row.score))) errors.push(`score=${row.score}`);
  if (![1, 2, 3].includes(Number(row.difficulty_level))) errors.push(`difficulty_level=${row.difficulty_level}`);
  if (!row.player_id)  errors.push('player_id empty');
  if (!row.session_id) errors.push('session_id empty');
  if (!['haptic', 'audio', 'none'].includes(row.modality)) errors.push(`modality=${row.modality}`);
  return { valid: errors.length === 0, errors };
}

// ─── CSV paths & headers ──────────────────────────────────────────────────────
function csvPath() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  return path.join(DATA_DIR, `results_${stamp}.csv`);
}

function trajectoryCsvPath() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  return path.join(DATA_DIR, `trajectories_${stamp}.csv`);
}

const CSV_HEADERS = 'session_id,round,difficulty_level,round_duration_ms,' +
  'player_id,player_name,modality,' +
  'checkpoints_passed,falls,score,' +
  'time_at_level_1_ms,time_at_level_2_ms,time_at_level_3_ms,' +
  'os,os_version,device_model,screen_res,pixel_ratio,browser,session_timestamp\n';

const TRAJECTORY_HEADERS = 'session_id,round,difficulty_level,player_id,t_ms,x_frac,y_frac,proximity_level\n';

// ─── CSV writers ──────────────────────────────────────────────────────────────
async function appendResultsToCsv(row) {
  try {
    await fs.promises.mkdir(DATA_DIR, { recursive: true });
    const p = csvPath();
    try { await fs.promises.access(p); } catch { await fs.promises.writeFile(p, CSV_HEADERS, 'utf8'); }
    const line = [
      row.session_id,
      row.round                ?? 0,
      row.difficulty_level     ?? 1,
      row.round_duration_ms    ?? 0,
      row.player_id,
      row.player_name          || '',
      row.modality             || 'none',
      row.checkpoints_passed   ?? 0,
      row.falls                ?? 0,
      row.score                ?? 0,
      row.time_at_level_1_ms   ?? 0,
      row.time_at_level_2_ms   ?? 0,
      row.time_at_level_3_ms   ?? 0,
      row.os                   || '',
      row.os_version           || '',
      row.device_model         || '',
      row.screen_res           || '',
      row.pixel_ratio          || '',
      row.browser              || '',
      row.session_timestamp    || new Date().toISOString(),
    ].map(csvField).join(',') + '\n';
    await fs.promises.appendFile(p, line, 'utf8');
  } catch (e) {
    console.error('[CSV] Write failed:', e.message);
  }
}

async function appendTrajectoryCsv(rows, meta) {
  try {
    await fs.promises.mkdir(DATA_DIR, { recursive: true });
    const p = trajectoryCsvPath();
    try { await fs.promises.access(p); } catch { await fs.promises.writeFile(p, TRAJECTORY_HEADERS, 'utf8'); }
    const lines = rows.map(r =>
      [meta.session_id, meta.round, meta.difficulty_level, meta.player_id,
       r.t_ms, r.x_frac, r.y_frac, r.proximity_level]
      .map(csvField).join(',') + '\n'
    ).join('');
    await fs.promises.appendFile(p, lines, 'utf8');
  } catch (e) {
    console.error('[Trajectory] Write failed:', e.message);
  }
}

// ─── Express ──────────────────────────────────────────────────────────────────
const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.get('/',           (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin',      (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/controller', (req, res) => res.sendFile(path.join(__dirname, 'public', 'controller.html')));

app.get('/cert', async (req, res) => {
  try { await fs.promises.access(CERT_PATH); } catch { return res.status(404).send('No cert found.'); }
  res.setHeader('Content-Type', 'application/x-x509-ca-cert');
  res.setHeader('Content-Disposition', 'attachment; filename="bsh.crt"');
  res.sendFile(CERT_PATH);
});

app.get('/qr', async (req, res) => {
  const ip    = getLocalIp();
  const proto = useHttps ? 'https' : 'http';
  const url   = `${proto}://${ip}:${PORT}/controller`;
  try {
    const qr = await qrcode.toDataURL(url, { width: 300, margin: 2 });
    res.json({ url, qr });
  } catch (e) {
    res.status(500).json({ error: 'QR generation failed', url });
  }
});

app.get('/export-csv', async (req, res) => {
  const p = csvPath();
  try { await fs.promises.access(p); } catch { return res.status(404).send('No data yet.'); }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(p)}"`);
  res.sendFile(p);
});

app.get('/export-survey', async (req, res) => {
  try { await fs.promises.access(SURVEY_PATH); } catch { return res.status(404).send('No survey responses yet.'); }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="survey_responses.jsonl"');
  res.sendFile(SURVEY_PATH);
});

// ─── Socket.io ────────────────────────────────────────────────────────────────
const server = useHttps ? https.createServer(serverOptions, app) : http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

// ─── Session advance (single owner of session.round++) ────────────────────────
// Generates a new session UUID only when starting fresh (sessionId is empty).
function _advanceRound(level) {
  session.phase = 'GAME';
  session.round++;
  if (!session.sessionId) session.sessionId = crypto.randomUUID();
  const lvl = Math.min(3, Math.max(1, Number(level) || 1));
  if (pcSocket) pcSocket.emit('GAME_START', { level: lvl, sessionId: session.sessionId });
  io.to('game').emit('GAME_START', { level: lvl, sessionId: session.sessionId });
  if (adminSocket) adminSocket.emit('PHASE_CHANGE', { phase: 'GAME', round: session.round, level: lvl });
  console.log(`[Session] Round ${session.round} started (Level ${lvl}) session=${session.sessionId}`);
}

io.on('connection', (socket) => {
  const role = socket.handshake.query.role;
  if      (role === 'pc')         handlePcConnection(socket);
  else if (role === 'admin')      handleAdminConnection(socket);
  else if (role === 'controller') handleControllerConnection(socket);
  else                             socket.disconnect(true);
});

// ─── PC (game display) connection ─────────────────────────────────────────────
function handlePcConnection(socket) {
  console.log(`[PC] Display connected: ${socket.id}`);
  pcSocket = socket;

  socket.emit('SESSION_RESTORE', { players: playersList(), phase: session.phase });

  socket.on('GAME_END', () => {
    session.phase = 'LOBBY';
    io.to('game').emit('GAME_END', {});
    if (adminSocket) adminSocket.emit('PHASE_CHANGE', { phase: 'LOBBY' });
    console.log('[Session] Game ended (Level 3 complete) → LOBBY');
  });

  socket.on('ROUND_END', () => {
    session.phase = 'LOBBY';
    if (adminSocket) adminSocket.emit('PHASE_CHANGE', { phase: 'LOBBY' });
    console.log('[Session] Round ended (mid-session) → LOBBY');
  });

  socket.on('ROUND_COMPLETE', ({ rankings }) => {
    Promise.all(
      (rankings || []).map(entry => {
        const p = getPlayerByNum(entry.playerNum);
        return p ? updateHistoryOnRoundComplete(p.playerId, p.modality) : Promise.resolve();
      })
    ).catch(e => console.error('[History] Update failed:', e.message));
    if (adminSocket) adminSocket.emit('ROUND_COMPLETE', { rankings, round: session.round });
  });

  socket.on('EXPORT_RESULTS', async (row) => {
    // Augment with server-side device info (not sent to display)
    for (const p of players.values()) {
      if (p.playerId === row.player_id) { row = { ...row, ...p.deviceInfo }; break; }
    }

    // Ensure session_id is server-authoritative
    row.session_id = session.sessionId || row.session_id || '';

    // Dedup guard — prevent duplicate rows from network retries
    const dedupKey = `${row.session_id}:${row.round}:${row.player_id}`;
    if (_exportedRounds.has(dedupKey)) {
      console.warn(`[CSV] Duplicate export ignored (${dedupKey})`);
      return;
    }
    _exportedRounds.add(dedupKey);

    // Validate before writing
    const { valid, errors } = validateRoundRow(row);
    if (!valid) {
      console.error('[CSV] Invalid round row — dropped:', errors.join(', '));
      return;
    }

    await appendResultsToCsv(row);

    if (Array.isArray(row.trajectory) && row.trajectory.length > 0) {
      await appendTrajectoryCsv(row.trajectory, {
        session_id:       row.session_id,
        round:            row.round,
        difficulty_level: row.difficulty_level,
        player_id:        row.player_id,
      });
    }
  });

  socket.on('PROXIMITY_UPDATE', ({ playerNum, level }) => routeProximity(playerNum, level));
  socket.on('FEEDBACK_EVENT',   ({ playerNum, feedbackType }) => routeFeedbackEvent(playerNum, feedbackType));

  socket.on('AUTO_NEXT_LEVEL', ({ level }) => {
    if (session.phase !== 'LOBBY') return;
    _advanceRound(level);
  });

  socket.on('disconnect', () => {
    console.log('[PC] Display disconnected');
    if (pcSocket === socket) pcSocket = null;
  });
}

// ─── Admin connection ─────────────────────────────────────────────────────────
function handleAdminConnection(socket) {
  console.log(`[Admin] Connected: ${socket.id}`);
  adminSocket = socket;

  socket.emit('SESSION_RESTORE', { players: playersList(), phase: session.phase, round: session.round });

  socket.on('GAME_START', ({ level } = {}) => {
    if (session.phase !== 'LOBBY') return;
    _advanceRound(level);
  });

  socket.on('BACK_TO_LOBBY', () => {
    session.phase     = 'LOBBY';
    session.round     = 0;
    session.sessionId = '';
    _exportedRounds.clear();
    if (adminSocket) adminSocket.emit('PHASE_CHANGE', { phase: 'LOBBY', round: 0 });
  });

  socket.on('disconnect', () => {
    console.log('[Admin] Disconnected');
    if (adminSocket === socket) adminSocket = null;
  });
}

// ─── Controller connection ────────────────────────────────────────────────────
function handleControllerConnection(socket) {
  const q = socket.handshake.query;

  if (session.phase !== 'LOBBY') {
    socket.emit('CONTROLLER_REJECTED', { message: 'A game is in progress. Please wait for the current round to end.' });
    socket.disconnect(true);
    return;
  }
  if (players.size >= 1) {
    socket.emit('CONTROLLER_REJECTED', { message: 'A player is already connected. This is a single-player study.' });
    socket.disconnect(true);
    return;
  }

  const playerId   = q.playerId   || `anon_${socket.id}`;
  const playerName = (q.playerName || 'Player').slice(0, 20);
  const canVibrate = q.canVibrate === 'true';
  const handedness        = q.handedness        || '';
  const gaming_experience = q.gaming_experience || '';
  const tilt_experience   = q.tilt_experience   || '';
  const age               = q.age               || '';
  const gender            = q.gender            || '';
  const history    = getOrInitHistory(playerId);

  const playerNum = assignPlayerNum();
  const color     = assignColor(playerNum);
  const modality  = assignModality(canVibrate, history.modalitiesExperienced);

  const device = `${q.os||'?'} ${q.device_model||''} ${q.screen_res||''}`.trim();
  if (!history.devices.includes(device)) history.devices.push(device);
  savePlayerHistory().catch(e => console.error('[History] Device save failed:', e.message));

  const state = {
    socket,
    socketId:   socket.id,
    playerNum,
    playerId,
    playerName,
    canVibrate,
    modality,
    color,
    playCount:  history.playCount,
    handedness,
    gaming_experience,
    tilt_experience,
    age,
    gender,
    deviceInfo: {
      os:           q.os           || '',
      os_version:   q.os_version   || '',
      device_model: q.device_model || '',
      screen_res:   q.screen_res   || '',
      pixel_ratio:  q.pixel_ratio  || '',
      browser:      q.browser      || '',
    },
  };
  players.set(socket.id, state);
  socket.join('game');

  socket.emit('PLAYER_ASSIGNED', { playerNum, color, modality, playCount: history.playCount });
  broadcastPlayersUpdate();
  console.log(`[Controller] P${playerNum} "${playerName}" connected (${modality})`);

  socket.on('GYRO_DATA', ({ gamma, beta }) => {
    const now = Date.now();
    if ((now - (lastGyroTime.get(socket.id) || 0)) < 16) return;
    lastGyroTime.set(socket.id, now);
    if (pcSocket) pcSocket.volatile.emit('GYRO_DATA', { gamma, beta: beta || 0, player: playerNum });
  });

  socket.on('PING', () => socket.emit('PONG', {}));

  socket.on('CALIBRATION_DONE', () => {
    if (pcSocket) pcSocket.emit('CALIBRATION_DONE', {});
    console.log(`[Controller] P${playerNum} calibration done`);
  });

  socket.on('SURVEY_RESPONSE', async (payload) => {
    const { response, playerNum: pNum, modality: pMod, timestamp, play_count, demographics } = payload || {};
    if (!response) return;
    try {
      await fs.promises.mkdir(DATA_DIR, { recursive: true });
      const entry = JSON.stringify({
        timestamp:    timestamp || new Date().toISOString(),
        session_id:   session.sessionId || '',
        playerNum:    pNum,
        modality:     pMod || 'unknown',
        play_count:   play_count ?? null,
        demographics: demographics || null,
        response,
      });
      await fs.promises.appendFile(SURVEY_PATH, entry + '\n', 'utf8');
      console.log(`[Survey] P${pNum} (${pMod}): ${response.slice(0, 60)}${response.length > 60 ? '…' : ''}`);
    } catch (e) {
      console.error('[Survey] Save failed:', e.message);
    }
  });

  socket.on('disconnect', () => {
    const p = players.get(socket.id);
    players.delete(socket.id);
    lastGyroTime.delete(socket.id);
    if (p) {
      console.log(`[Controller] P${p.playerNum} "${p.playerName}" disconnected`);
      if (pcSocket)    pcSocket.emit('CONTROLLER_DISCONNECTED',    { playerNum: p.playerNum, playerName: p.playerName, color: p.color });
      if (adminSocket) adminSocket.emit('CONTROLLER_DISCONNECTED', { playerNum: p.playerNum, playerName: p.playerName, color: p.color });
    }
    broadcastPlayersUpdate();
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
loadPlayerHistory();

server.listen(PORT, () => {
  const ip    = getLocalIp();
  const proto = useHttps ? 'https' : 'http';
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║              Body Schema Hack — Study Platform              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Game Display : ${proto}://localhost:${PORT}                      ║`);
  console.log(`║  Admin Panel  : ${proto}://localhost:${PORT}/admin                ║`);
  console.log(`║  Controller   : ${proto}://${ip}:${PORT}/controller         ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
});
