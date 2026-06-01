'use strict';

const express    = require('express');
const https      = require('https');
const http       = require('http');
const { Server } = require('socket.io');
const qrcode     = require('qrcode');
const os         = require('os');
const fs         = require('fs');
const path       = require('path');
const crypto   = require('crypto');
const zlib     = require('zlib');
const Database = require('better-sqlite3');

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

const DATA_DIR          = path.join(__dirname, 'data');
const ARCHIVES_DIR      = path.join(DATA_DIR, 'archives');
const HISTORY_PATH      = path.join(DATA_DIR, 'players.json');
const SURVEY_PATH       = path.join(DATA_DIR, 'survey_responses.jsonl');
const PARTICIPANT_PATH  = path.join(DATA_DIR, 'participant.json');

// ─── SQLite database ──────────────────────────────────────────────────────────
let db;
function initDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(path.join(DATA_DIR, 'study.db'));
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id        TEXT PRIMARY KEY,
      participant_name  TEXT,
      participant_id    TEXT,
      modality          TEXT,
      handedness        TEXT,
      gaming_experience TEXT,
      tilt_experience   TEXT,
      age               TEXT,
      gender            TEXT,
      os                TEXT,
      os_version        TEXT,
      device_model      TEXT,
      screen_res        TEXT,
      pixel_ratio       TEXT,
      browser           TEXT,
      created_at        TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      status            TEXT DEFAULT 'pending'
    );
    CREATE TABLE IF NOT EXISTS rounds (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id           TEXT NOT NULL,
      round                INTEGER NOT NULL,
      difficulty_level     INTEGER NOT NULL,
      round_duration_ms    REAL DEFAULT 0,
      checkpoints_passed   INTEGER DEFAULT 0,
      falls                INTEGER DEFAULT 0,
      score                INTEGER DEFAULT 0,
      time_at_level_1_ms   REAL DEFAULT 0,
      time_at_level_2_ms   REAL DEFAULT 0,
      time_at_level_3_ms   REAL DEFAULT 0,
      created_at           TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      UNIQUE(session_id, round)
    );
    CREATE TABLE IF NOT EXISTS trajectories (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id       TEXT NOT NULL,
      round            INTEGER NOT NULL,
      difficulty_level INTEGER NOT NULL,
      t_ms             INTEGER,
      x_frac           REAL,
      y_frac           REAL,
      proximity_level  INTEGER
    );
    CREATE TABLE IF NOT EXISTS surveys (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      response   TEXT,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
  `);
}

const _dbUpsertSession = () => db.prepare(`
  INSERT OR IGNORE INTO sessions
    (session_id,participant_name,participant_id,modality,handedness,gaming_experience,
     tilt_experience,age,gender,os,os_version,device_model,screen_res,pixel_ratio,browser)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`);

function dbSaveRound(row) {
  _dbUpsertSession().run(
    row.session_id, row.participant_name, row.player_id, row.modality,
    row.handedness||'', row.gaming_experience||'', row.tilt_experience||'',
    row.age||'', row.gender||'',
    row.os||'', row.os_version||'', row.device_model||'',
    row.screen_res||'', row.pixel_ratio||'', row.browser||''
  );
  db.prepare(`
    INSERT OR REPLACE INTO rounds
      (session_id,round,difficulty_level,round_duration_ms,checkpoints_passed,
       falls,score,time_at_level_1_ms,time_at_level_2_ms,time_at_level_3_ms)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(
    row.session_id, row.round, row.difficulty_level, row.round_duration_ms||0,
    row.checkpoints_passed||0, row.falls||0, row.score||0,
    row.time_at_level_1_ms||0, row.time_at_level_2_ms||0, row.time_at_level_3_ms||0
  );
}

function dbSaveTrajectories(points, meta) {
  if (!points?.length) return;
  const stmt = db.prepare(`
    INSERT INTO trajectories (session_id,round,difficulty_level,t_ms,x_frac,y_frac,proximity_level)
    VALUES (?,?,?,?,?,?,?)
  `);
  db.transaction(() => {
    for (const p of points)
      stmt.run(meta.session_id, meta.round, meta.difficulty_level, p.t_ms, p.x_frac, p.y_frac, p.proximity_level);
  })();
}

function dbSaveSurvey(session_id, response) {
  db.prepare(`INSERT INTO surveys (session_id, response) VALUES (?,?)`).run(session_id, response);
}

function dbSetSessionStatus(session_id, status) {
  db.prepare(`UPDATE sessions SET status=? WHERE session_id=?`).run(status, session_id);
}

// ─── Session state ────────────────────────────────────────────────────────────
let pcSocket         = null;
let adminSocket      = null;
let participantCounter = 1;         // auto-assigned participant number (P001, P002…)
const players         = new Map();  // socketId → PlayerState
const lastGyroTime    = new Map();  // socketId → timestamp
const _exportedRounds = new Set();  // "sessionId:round:playerId" dedup keys
let playerHistory     = {};         // playerId → { playCount, modalitiesExperienced, devices }
let session           = { phase: 'LOBBY', round: 0, sessionId: '', level: 0 };

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

function loadParticipantCounter() {
  try {
    if (fs.existsSync(PARTICIPANT_PATH)) {
      const d = JSON.parse(fs.readFileSync(PARTICIPANT_PATH, 'utf8'));
      participantCounter = Number(d.current) || 1;
    }
  } catch (e) { console.error('[Participant] Load failed:', e.message); }
}

async function saveParticipantCounter() {
  try {
    await fs.promises.mkdir(DATA_DIR, { recursive: true });
    await fs.promises.writeFile(PARTICIPANT_PATH, JSON.stringify({ current: participantCounter }), 'utf8');
  } catch (e) { console.error('[Participant] Save failed:', e.message); }
}

function currentParticipantName() {
  return `P${String(participantCounter).padStart(3, '0')}`;
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

  // Count accepted sessions per modality so assignment fills the smallest bucket first
  let counts = {};
  try {
    const rows = db.prepare(
      `SELECT modality, COUNT(*) as n FROM sessions WHERE status='accepted' GROUP BY modality`
    ).all();
    for (const r of rows) counts[r.modality] = r.n;
  } catch (_) {}

  const untried    = pool.filter(m => !modalitiesExperienced.includes(m));
  const candidates = untried.length ? untried : pool;

  // Pick the candidate with the fewest accepted sessions; break ties randomly
  const minCount = Math.min(...candidates.map(m => counts[m] || 0));
  const tied     = candidates.filter(m => (counts[m] || 0) === minCount);
  return tied[Math.floor(Math.random() * tied.length)];
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
  if (session.level < 2) return;  // practice round — no feedback
  const p = getPlayerByNum(playerNum);
  if (!p) return;
  const evtMap = { haptic: 'HAPTIC_PROXIMITY', audio: 'AUDIO_PROXIMITY' };
  const evt = evtMap[p.modality];
  if (evt) p.socket.emit(evt, { level });
}

function routeFeedbackEvent(playerNum, feedbackType) {
  if (session.level < 2) return;  // practice round — no feedback
  const p = getPlayerByNum(playerNum);
  if (!p) return;
  if (feedbackType === 'wall_hit') {
    // Audio: send a distinct level-4 hit cue (different tone = clear "fell" signal)
    // Haptic: skip — level-3 continuous buzz already communicates danger; a second
    //         pulse arriving right after respawn feels like a double-hit glitch.
    if (p.modality === 'audio') p.socket.emit('AUDIO_PROXIMITY', { level: 4 });
  }
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
  if (![1, 2, 3, 4].includes(Number(row.difficulty_level))) errors.push(`difficulty_level=${row.difficulty_level}`);
  if (!row.player_id)  errors.push('player_id empty');
  if (!row.session_id) errors.push('session_id empty');
  if (!['haptic', 'audio', 'none'].includes(row.modality)) errors.push(`modality=${row.modality}`);
  return { valid: errors.length === 0, errors };
}

// ─── Express ──────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
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

// ─── Pure-Node ZIP builder ────────────────────────────────────────────────────
function _crc32(buf) {
  if (!_crc32._t) {
    _crc32._t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      _crc32._t[i] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = (_crc32._t[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xffffffff) >>> 0;
}

async function buildZip(entries) {
  // entries: [{ name: string, path: string }]
  const now = new Date();
  const dt  = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const tm  = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const parts = [], cdParts = [];
  let offset = 0;

  for (const { name, path: fp } of entries) {
    const raw  = await fs.promises.readFile(fp);
    const comp = zlib.deflateRawSync(raw, { level: 6 });
    const useDef = comp.length < raw.length;
    const data   = useDef ? comp : raw;
    const method = useDef ? 8 : 0;
    const crc    = _crc32(raw);
    const nb     = Buffer.from(name, 'utf8');

    const lh = Buffer.alloc(30 + nb.length);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4);  lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(method, 8);     lh.writeUInt16LE(tm, 10); lh.writeUInt16LE(dt, 12);
    lh.writeUInt32LE(crc, 14);       lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(nb.length, 26); lh.writeUInt16LE(0, 28);
    nb.copy(lh, 30);

    const cd = Buffer.alloc(46 + nb.length);
    cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4);  cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);          cd.writeUInt16LE(method, 10); cd.writeUInt16LE(tm, 12);
    cd.writeUInt16LE(dt, 14);        cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(data.length, 20); cd.writeUInt32LE(raw.length, 24);
    cd.writeUInt16LE(nb.length, 28); cd.writeUInt16LE(0, 30); cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);         cd.writeUInt16LE(0, 36); cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);
    nb.copy(cd, 46);

    parts.push(lh, data);
    cdParts.push(cd);
    offset += lh.length + data.length;
  }

  const cdBuf = Buffer.concat(cdParts);
  const eocd  = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(0, 4);  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(cdParts.length, 8); eocd.writeUInt16LE(cdParts.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12); eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...parts, cdBuf, eocd]);
}

// ─── Archive + Reset ──────────────────────────────────────────────────────────
async function nextParticipantNum() {
  try {
    await fs.promises.mkdir(ARCHIVES_DIR, { recursive: true });
    const files = await fs.promises.readdir(ARCHIVES_DIR);
    const nums  = files
      .filter(f => /^p\d+\.zip$/.test(f))
      .map(f => parseInt(f.slice(1, -4), 10));
    return nums.length ? Math.max(...nums) + 1 : 1;
  } catch { return 1; }
}

app.post('/archive', async (req, res) => {
  try {
    await fs.promises.mkdir(ARCHIVES_DIR, { recursive: true });
    const num      = await nextParticipantNum();
    const filename = `p${String(num).padStart(4, '0')}.zip`;
    const outPath  = path.join(ARCHIVES_DIR, filename);

    // Collect all data files: every results_*.csv, trajectories_*.csv, plus survey
    const dataFiles = await fs.promises.readdir(DATA_DIR);
    const toZip = dataFiles
      .filter(f => /^(results|trajectories)_\d+\.csv$/.test(f))
      .map(f => path.join(DATA_DIR, f));
    try { await fs.promises.access(SURVEY_PATH); toZip.push(SURVEY_PATH); } catch {}

    if (!toZip.length) return res.status(404).json({ error: 'No data files to archive.' });

    const entries = toZip.map(fp => ({ name: path.basename(fp), path: fp }));
    const zipBuf  = await buildZip(entries);
    await fs.promises.writeFile(outPath, zipBuf);

    console.log(`[Archive] Created ${filename} with ${toZip.length} files`);
    res.json({ filename });
  } catch (e) {
    console.error('[Archive] Failed:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/download-archive/:filename', async (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!/^p\d+\.zip$/.test(filename)) return res.status(400).send('Invalid filename.');
  const p = path.join(ARCHIVES_DIR, filename);
  try { await fs.promises.access(p); } catch { return res.status(404).send('Archive not found.'); }
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.sendFile(p);
});

function _resetAllState() {
  session.phase     = 'LOBBY';
  session.round     = 0;
  session.sessionId = '';
  session.level     = 0;
  _exportedRounds.clear();
  for (const p of players.values()) { try { p.socket.disconnect(true); } catch {} }
  players.clear();
  lastGyroTime.clear();
  io.emit('FORCE_RELOAD');
  pcSocket    = null;
  adminSocket = null;
}

app.post('/reset-all', (req, res) => {
  _resetAllState();
  console.log('[Reset] Manual full reset — FORCE_RELOAD broadcast');
  res.json({ ok: true });
});

// Called by admin after each session — success increments participant counter + archives,
// failure keeps the same participant number for a retry.
app.post('/confirm-session', async (req, res) => {
  const { success } = req.body || {};
  const sid  = session.sessionId;
  const name = currentParticipantName();

  try {
    if (sid) dbSetSessionStatus(sid, success ? 'accepted' : 'discarded');
  } catch (e) { console.error('[DB] Status update failed:', e.message); }

  if (success) {
    participantCounter++;
    await saveParticipantCounter();
    console.log(`[Session] Accepted ${name} — next: ${currentParticipantName()}`);
  } else {
    console.log(`[Session] Discarded — retrying as ${name}`);
  }

  _resetAllState();
  res.json({ ok: true, next: currentParticipantName() });
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
  const lvl = Math.min(4, Math.max(1, Number(level) || 1));
  session.level = lvl;
  if (pcSocket) pcSocket.emit('GAME_START', { level: lvl, sessionId: session.sessionId });
  io.to('game').emit('GAME_START', { level: lvl, sessionId: session.sessionId });
  if (adminSocket) adminSocket.emit('PHASE_CHANGE', { phase: 'GAME', round: session.round, level: lvl });
  const label = lvl === 1 ? 'Practice' : `Level ${lvl - 1}`;
  console.log(`[Session] Round ${session.round} started (${label}) session=${session.sessionId}`);
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
    const pName = playersList()[0]?.playerName || currentParticipantName();
    if (adminSocket) {
      adminSocket.emit('PHASE_CHANGE', { phase: 'LOBBY' });
      adminSocket.emit('SESSION_COMPLETE', { participantName: pName });
    }
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

  socket.on('EXPORT_RESULTS', (row) => {
    // Augment with server-authoritative fields
    row.session_id = session.sessionId || row.session_id || '';
    for (const p of players.values()) {
      if (p.playerId === row.player_id) {
        row = { ...row, ...p.deviceInfo,
          participant_name:  p.playerName,
          handedness:        p.handedness,
          gaming_experience: p.gaming_experience,
          tilt_experience:   p.tilt_experience,
          age:               p.age,
          gender:            p.gender,
        };
        break;
      }
    }

    // Dedup guard
    const dedupKey = `${row.session_id}:${row.round}:${row.player_id}`;
    if (_exportedRounds.has(dedupKey)) { console.warn(`[DB] Duplicate ignored (${dedupKey})`); return; }
    _exportedRounds.add(dedupKey);

    const { valid, errors } = validateRoundRow(row);
    if (!valid) { console.error('[DB] Invalid round — dropped:', errors.join(', ')); return; }

    try {
      dbSaveRound(row);
      dbSaveTrajectories(row.trajectory, {
        session_id: row.session_id, round: row.round, difficulty_level: row.difficulty_level,
      });
      console.log(`[DB] Round ${row.round} (L${row.difficulty_level}) saved — ${row.falls} falls`);
    } catch (e) {
      console.error('[DB] Write failed:', e.message);
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
    session.level     = 0;
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
  const playerName = currentParticipantName();  // server-assigned, e.g. P001
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

  socket.emit('PLAYER_ASSIGNED', { playerNum, color, modality, playCount: history.playCount, playerName });
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

  socket.on('SURVEY_RESPONSE', (payload) => {
    const { response, playerNum: pNum } = payload || {};
    if (!response?.trim()) return;
    const sid = session.sessionId || '';
    try {
      dbSaveSurvey(sid, response.trim());
      console.log(`[DB] Survey P${pNum}: ${response.slice(0, 60)}`);
    } catch (e) {
      console.error('[DB] Survey save failed:', e.message);
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

// ─── Data viewer API ──────────────────────────────────────────────────────────
app.get('/data', (req, res) => res.sendFile(path.join(__dirname, 'public', 'data.html')));

app.get('/api/sessions', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        s.session_id, s.participant_name, s.modality, s.handedness,
        s.gaming_experience, s.tilt_experience, s.age, s.gender,
        s.os, s.device_model, s.browser, s.created_at, s.status,
        r.round, r.difficulty_level, r.round_duration_ms,
        r.checkpoints_passed, r.falls, r.score,
        sv.response AS survey
      FROM sessions s
      LEFT JOIN rounds r ON r.session_id = s.session_id
      LEFT JOIN surveys sv ON sv.session_id = s.session_id
      ORDER BY s.created_at DESC, r.round ASC
    `).all();

    // Group by session_id
    const sessionMap = new Map();
    for (const row of rows) {
      if (!sessionMap.has(row.session_id)) {
        sessionMap.set(row.session_id, {
          session_id:       row.session_id,
          participant_name: row.participant_name,
          modality:         row.modality,
          handedness:       row.handedness,
          gaming_experience:row.gaming_experience,
          tilt_experience:  row.tilt_experience,
          age:              row.age,
          gender:           row.gender,
          os:               row.os,
          device_model:     row.device_model,
          browser:          row.browser,
          created_at:       row.created_at,
          status:           row.status,
          survey:           row.survey || '',
          rounds:           [],
        });
      }
      if (row.round != null) {
        sessionMap.get(row.session_id).rounds.push({
          round:             row.round,
          difficulty_level:  row.difficulty_level,
          round_duration_ms: row.round_duration_ms,
          checkpoints_passed:row.checkpoints_passed,
          falls:             row.falls,
          score:             row.score,
        });
      }
    }
    res.json([...sessionMap.values()]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/download-db', (req, res) => {
  const dbPath = path.join(DATA_DIR, 'study.db');
  if (!fs.existsSync(dbPath)) return res.status(404).send('No database yet.');
  res.setHeader('Content-Disposition', 'attachment; filename="study.db"');
  res.sendFile(dbPath);
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
loadPlayerHistory();
loadParticipantCounter();
initDb();

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
