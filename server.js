'use strict';

const express    = require('express');
const https      = require('https');
const http       = require('http');
const { Server } = require('socket.io');
const qrcode     = require('qrcode');
const os         = require('os');
const fs         = require('fs');
const path       = require('path');

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

const DATA_DIR      = path.join(__dirname, 'data');
const HISTORY_PATH  = path.join(DATA_DIR, 'players.json');
const SURVEY_PATH   = path.join(DATA_DIR, 'survey_responses.jsonl');

// ─── Session state ────────────────────────────────────────────────────────────
let pcSocket    = null;
let adminSocket = null;
const players      = new Map();   // socketId → PlayerState
const lastGyroTime = new Map();   // socketId → timestamp
let playerHistory  = {};          // playerId → { playCount, modalitiesExperienced, devices }
let session        = { phase: 'LOBBY', round: 0 };

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

function savePlayerHistory() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = HISTORY_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(playerHistory, null, 2), 'utf8');
    fs.renameSync(tmp, HISTORY_PATH);
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

function updateHistoryOnRoundComplete(playerId, modality) {
  const h = getOrInitHistory(playerId);
  h.playCount++;
  if (!h.modalitiesExperienced.includes(modality)) h.modalitiesExperienced.push(modality);
  savePlayerHistory();
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
  if (feedbackType === 'wall_hit') {
    routeProximity(playerNum, 4);
  }
}

// ─── CSV ──────────────────────────────────────────────────────────────────────
function csvPath() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  return path.join(DATA_DIR, `results_${stamp}.csv`);
}

const CSV_HEADERS = 'session_id,round,difficulty_level,round_duration_ms,' +
  'player_id,player_name,modality,' +
  'checkpoints_passed,falls,score,' +
  'time_at_level_1_ms,time_at_level_2_ms,time_at_level_3_ms,' +
  'os,os_version,device_model,screen_res,pixel_ratio,browser,session_timestamp\n';

function appendResultsToCsv(row) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const p = csvPath();
    if (!fs.existsSync(p)) fs.writeFileSync(p, CSV_HEADERS, 'utf8');
    const line = [
      row.session_id           || '',
      row.round                || 0,
      row.difficulty_level     || 1,
      row.round_duration_ms    || 0,
      row.player_id            || '',
      row.player_name          || '',
      row.modality             || 'none',
      row.checkpoints_passed   || 0,
      row.falls                || 0,
      row.score                || 0,
      row.time_at_level_1_ms   || 0,
      row.time_at_level_2_ms   || 0,
      row.time_at_level_3_ms   || 0,
      row.os                   || '',
      row.os_version           || '',
      row.device_model         || '',
      row.screen_res           || '',
      row.pixel_ratio          || '',
      row.browser              || '',
      row.session_timestamp    || new Date().toISOString(),
    ].join(',') + '\n';
    fs.appendFileSync(p, line, 'utf8');
  } catch (e) {
    console.error('[CSV] Write failed:', e.message);
  }
}

// ─── Express ──────────────────────────────────────────────────────────────────
const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.get('/',            (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin',       (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/controller',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'controller.html')));

app.get('/cert', (req, res) => {
  if (!fs.existsSync(CERT_PATH)) return res.status(404).send('No cert found.');
  res.setHeader('Content-Type', 'application/x-x509-ca-cert');
  res.setHeader('Content-Disposition', 'attachment; filename="bsh.crt"');
  res.sendFile(CERT_PATH);
});

app.get('/qr', async (req, res) => {
  const ip       = getLocalIp();
  const proto    = useHttps ? 'https' : 'http';
  const url      = `${proto}://${ip}:${PORT}/controller`;
  try {
    const qr = await qrcode.toDataURL(url, { width: 300, margin: 2 });
    res.json({ url, qr });
  } catch (e) {
    res.status(500).json({ error: 'QR generation failed', url });
  }
});

app.get('/export-csv', (req, res) => {
  const p = csvPath();
  if (!fs.existsSync(p)) return res.status(404).send('No data yet.');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(p)}"`);
  res.sendFile(p);
});

app.get('/export-survey', (req, res) => {
  if (!fs.existsSync(SURVEY_PATH)) return res.status(404).send('No survey responses yet.');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="survey_responses.jsonl"');
  res.sendFile(SURVEY_PATH);
});

// ─── Socket.io ────────────────────────────────────────────────────────────────
const server = useHttps ? https.createServer(serverOptions, app) : http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

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
    console.log('[Session] Game ended → LOBBY');
  });

  socket.on('ROUND_COMPLETE', ({ rankings }) => {
    // Update history for each player
    for (const entry of rankings) {
      const p = getPlayerByNum(entry.playerNum);
      if (p) updateHistoryOnRoundComplete(p.playerId, p.modality);
    }
    if (adminSocket) adminSocket.emit('ROUND_COMPLETE', { rankings, round: session.round });
  });

  socket.on('EXPORT_RESULTS', (row) => {
    // Augment with device info held server-side (not sent to display)
    for (const p of players.values()) {
      if (p.playerId === row.player_id) {
        row = { ...row, ...p.deviceInfo };
        break;
      }
    }
    appendResultsToCsv(row);
  });

  socket.on('PROXIMITY_UPDATE', ({ playerNum, level }) => routeProximity(playerNum, level));

  socket.on('FEEDBACK_EVENT', ({ playerNum, feedbackType }) => routeFeedbackEvent(playerNum, feedbackType));

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
    session.phase = 'GAME';
    session.round++;
    const lvl = Math.min(3, Math.max(1, Number(level) || 1));
    if (pcSocket) pcSocket.emit('GAME_START', { level: lvl });
    io.to('game').emit('GAME_START', { level: lvl });
    if (adminSocket) adminSocket.emit('PHASE_CHANGE', { phase: 'GAME', round: session.round, level: lvl });
    console.log(`[Session] Round ${session.round} started (Level ${lvl})`);
  });

  socket.on('BACK_TO_LOBBY', () => {
    session.phase = 'LOBBY';
    if (adminSocket) adminSocket.emit('PHASE_CHANGE', { phase: 'LOBBY' });
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
  const history    = getOrInitHistory(playerId);

  const playerNum = assignPlayerNum();
  const color     = assignColor(playerNum);
  const modality  = assignModality(canVibrate, history.modalitiesExperienced);

  // Persist device info
  const device = `${q.os||'?'} ${q.device_model||''} ${q.screen_res||''}`.trim();
  if (!history.devices.includes(device)) history.devices.push(device);
  savePlayerHistory();

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

  socket.on('SURVEY_RESPONSE', (payload) => {
    const { response, playerNum, modality, timestamp, play_count, demographics } = payload || {};
    if (!response) return;
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      const entry = JSON.stringify({
        timestamp:    timestamp || new Date().toISOString(),
        session_id:   session.round > 0 ? `round_${session.round}` : 'lobby',
        playerNum,
        modality:     modality || 'unknown',
        play_count:   play_count ?? null,
        demographics: demographics || null,
        response,
      });
      fs.appendFileSync(SURVEY_PATH, entry + '\n', 'utf8');
      console.log(`[Survey] P${playerNum} (${modality}): ${response.slice(0, 60)}${response.length > 60 ? '…' : ''}`);
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
