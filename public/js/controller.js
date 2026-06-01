'use strict';

// ─── Globals (referenced by debug panel in HTML) ──────────────────────────────
let currentGamma = 0;
let currentBeta  = 0;

// ─── State ────────────────────────────────────────────────────────────────────
let socket         = null;
let gyroStarted    = false;
let calibGamma     = 0;
let calibBeta      = 0;
let _playerNum     = null;
let _modality      = '';
let _playCount     = 0;
let _demographics  = {};   // collected at join; included in survey payload

const MODALITY_DESC = {
  haptic: 'Your phone will vibrate — pulses grow stronger as the ball nears the path edge.',
  audio:  'Your phone will beep — tones grow faster as the ball nears the path edge.',
  none:   'No proximity feedback — keep the ball on the path using only vision.',
};

const urlParams = new URLSearchParams(window.location.search);
const DEBUG     = urlParams.get('debug') === 'true';

// ─── Screen management ────────────────────────────────────────────────────────
function _setState(name) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  const el = document.getElementById(`screen-${name}`);
  if (el) el.classList.add('active');
  const dbg = document.getElementById('debug-state');
  if (dbg) dbg.textContent = name;
}

// ─── Chip selectors ───────────────────────────────────────────────────────────
function _initChips(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.addEventListener('click', e => {
    const chip = e.target.closest('.bh-chip');
    if (!chip) return;
    container.querySelectorAll('.bh-chip').forEach(c => c.classList.remove('sel'));
    chip.classList.add('sel');
  });
}

function _chipVal(containerId) {
  const sel = document.querySelector(`#${containerId} .bh-chip.sel`);
  return sel ? sel.dataset.val : '';
}

// ─── Device parser ────────────────────────────────────────────────────────────
function _parseDevice(ua) {
  // Android: try full "Android X.X; MODEL Build" first, fall back to version-only
  const androidFull = ua.match(/Android\s([\d.]+);\s([^)]+?)\sBuild/);
  if (androidFull) return { os_version: androidFull[1], device_model: androidFull[2].trim() };
  const androidVer = ua.match(/Android\s([\d.]+)/);
  if (androidVer) return { os_version: androidVer[1], device_model: 'Android' };
  const ios = ua.match(/CPU (?:iPhone )?OS ([\d_]+)/);
  if (ios) return { os_version: ios[1].replace(/_/g, '.'), device_model: 'iPhone' };
  return { os_version: '', device_model: '' };
}

// ─── Join ─────────────────────────────────────────────────────────────────────
function connectWithName() {
  _demographics = {
    handedness:        _chipVal('chips-hand'),
    gaming_experience: _chipVal('chips-gaming'),
    tilt_experience:   _chipVal('chips-tilt'),
    age:               document.getElementById('join-age')?.value || '',
    gender:            _chipVal('chips-gender'),
  };

  const playerId   = _getOrCreatePlayerId();
  const canVibrate = !!navigator.vibrate;
  const { os_version, device_model } = _parseDevice(navigator.userAgent);

  socket = io({
    query: {
      role:              'controller',
      playerId,
      canVibrate:        String(canVibrate),
      os:                navigator.platform || '',
      os_version,
      device_model,
      browser:           navigator.userAgent.slice(0, 80),
      screen_res:        `${screen.width}x${screen.height}`,
      pixel_ratio:       String(window.devicePixelRatio || 1),
      handedness:        _demographics.handedness,
      gaming_experience: _demographics.gaming_experience,
      tilt_experience:   _demographics.tilt_experience,
      age:               _demographics.age,
      gender:            _demographics.gender,
    },
  });

  _bindSocketEvents();
}

function _getOrCreatePlayerId() {
  let id = localStorage.getItem('bsh_player_id');
  if (!id) { id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; localStorage.setItem('bsh_player_id', id); }
  return id;
}

// ─── Socket events ────────────────────────────────────────────────────────────
function _bindSocketEvents() {
  socket.on('connect', () => {
    console.log('[Controller] Connected:', socket.id);
    if (DEBUG) document.getElementById('debug-panel').style.display = 'block';
  });

  socket.on('disconnect', () => {
    console.log('[Controller] Disconnected');
    _showError('Disconnected from server. Please refresh.');
  });

  socket.on('CONTROLLER_REJECTED', ({ message } = {}) => {
    _showError(message || 'Connection rejected.');
    socket.disconnect();
  });

  socket.on('PLAYER_ASSIGNED', ({ playerNum, color, modality, playCount, playerName } = {}) => {
    _playerNum = playerNum;
    _modality  = modality;
    _playCount = playCount || 0;

    // Show assigned participant ID on the join screen (visible briefly before transition)
    const pidEl = document.getElementById('join-participant-id');
    if (pidEl && playerName) pidEl.textContent = `ID: ${playerName}`;

    const sessionTag = `P${playerNum} · ${modality.toUpperCase()}`;
    const badgeText  = modality.toUpperCase();
    const monoDesc   = MODALITY_DESC[modality] || '';

    ['ready', 'playing', 'calib'].forEach(prefix => {
      const st = document.getElementById(`${prefix}-session-tag`);
      if (st) st.textContent = sessionTag;
    });
    const rb = document.getElementById('ready-badge');
    const rh = document.getElementById('ready-headline');
    const rd = document.getElementById('ready-modality-desc');
    const pb = document.getElementById('playing-badge');
    if (rb) rb.textContent = badgeText;
    if (rh) rh.innerHTML  = `Player ${playerNum}<br>Ready`;
    if (rd) rd.textContent = monoDesc;
    if (pb) pb.textContent = badgeText;

    _requestGyroPermission();
  });

  socket.on('GAME_START', ({ level } = {}) => {
    stopAllFeedback();
    const lvl = Math.min(4, Math.max(1, Number(level) || 1));
    const names = ['PRACTICE<br>ROUND', 'LEVEL<br>ONE', 'LEVEL<br>TWO', 'LEVEL<br>THREE'];
    const ph = document.getElementById('playing-headline');
    if (ph) ph.innerHTML = names[lvl - 1];
    _setState('calibration');
    _startAutoCalib();
  });

  socket.on('FORCE_RELOAD', () => window.location.reload());

  socket.on('GAME_END', () => {
    _gyroPhase = 'idle';
    stopAllFeedback();
    _setState('survey');
  });

  // Proximity feedback — repeats within each level; rate increases with danger
  socket.on('HAPTIC_PROXIMITY', ({ level } = {}) => _setHapticLevel(level));
  socket.on('AUDIO_PROXIMITY',  ({ level } = {}) => _setAudioLevel(level));

  socket.on('PING', () => socket.emit('PONG', {}));
}

// ─── Gyro system ─────────────────────────────────────────────────────────────
// _gyroPhase: 'idle' | 'calibrating' | 'sending'
let _gyroPhase   = 'idle';
let _calibSamples = [];
let _calibTimer  = null;
let _lastSent    = 0;

function _requestGyroPermission() {
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    _setState('permission');
    document.getElementById('permission-btn')?.addEventListener('click', () => {
      DeviceOrientationEvent.requestPermission().then(state => {
        if (state === 'granted') { _setState('ready'); }
        else { _showError('Motion permission denied. Please allow tilt access in browser settings.'); }
      }).catch(() => _showError('Failed to request motion permission.'));
    }, { once: true });
  } else {
    _setState('ready');
  }
}

function _startAutoCalib() {
  _gyroPhase    = 'calibrating';
  _calibSamples = [];

  if (!gyroStarted) {
    gyroStarted = true;
    _initGyro();
  }

  let count = 3;
  const el = document.getElementById('calib-countdown');
  if (el) el.textContent = count;

  clearInterval(_calibTimer);
  _calibTimer = setInterval(() => {
    count--;
    if (el) el.textContent = count > 0 ? count : '';
    if (count <= 0) {
      clearInterval(_calibTimer);
      _finishCalib();
    }
  }, 1000);
}

function _initGyro() {
  try {
    const gn = new GyroNorm();
    gn.init({ frequency: 60, gravityNormalized: true, orientationBase: GyroNorm.GAME, decimalCount: 2 })
      .then(() => { gn.start(data => _onRawGyro(data.do.gamma ?? 0, data.do.beta ?? 0)); })
      .catch(() => _fallbackGyro());
  } catch (_) { _fallbackGyro(); }
}

function _fallbackGyro() {
  window.addEventListener('deviceorientation', e => _onRawGyro(e.gamma ?? 0, e.beta ?? 0));
}

const _tiltBall = document.getElementById('tilt-ball');
const _TILT_R   = 40; // max px offset inside ring (ring radius = 65, ball radius = 11)

function _updateTiltIndicator(g, b) {
  if (!_tiltBall) return;
  const MAX_DEG = 28;
  let nx = g / MAX_DEG, ny = b / MAX_DEG;
  const len = Math.hypot(nx, ny);
  if (len > 1) { nx /= len; ny /= len; }
  // Ring is 130px, radius 65px. Ball stays within _TILT_R px from center.
  _tiltBall.style.left = (50 + nx * (_TILT_R / 65) * 50) + '%';
  _tiltBall.style.top  = (50 + ny * (_TILT_R / 65) * 50) + '%';
}

function _onRawGyro(raw_g, raw_b) {
  if (_gyroPhase === 'calibrating') {
    _calibSamples.push({ g: raw_g, b: raw_b });
  } else if (_gyroPhase === 'sending') {
    currentGamma = raw_g - calibGamma;
    currentBeta  = raw_b - calibBeta;
    _updateTiltIndicator(currentGamma, currentBeta);
    const now = Date.now();
    if (now - _lastSent < 16) return;
    _lastSent = now;
    if (DEBUG) {
      const dg = document.getElementById('debug-gamma');
      const db = document.getElementById('debug-beta');
      if (dg) dg.textContent = currentGamma.toFixed(1) + '°';
      if (db) db.textContent = currentBeta.toFixed(1)  + '°';
    }
    socket?.emit('GYRO_DATA', { gamma: currentGamma, beta: currentBeta });
  }
}

function _finishCalib() {
  if (_calibSamples.length > 0) {
    calibGamma = _calibSamples.reduce((s, v) => s + v.g, 0) / _calibSamples.length;
    calibBeta  = _calibSamples.reduce((s, v) => s + v.b, 0) / _calibSamples.length;
  }
  _gyroPhase = 'sending';
  socket?.emit('CALIBRATION_DONE', {});
  _setState('playing');
}

// ─── Double-tap recalibration ─────────────────────────────────────────────────
document.addEventListener('dblclick', () => {
  calibGamma += currentGamma;
  calibBeta  += currentBeta;
});

// ─── Audio tones ──────────────────────────────────────────────────────────────
let _audioCtx = null;

// iOS/Android gate AudioContext on a user gesture. The join button is the
// earliest definitive gesture — play a silent 1-sample buffer there to unlock
// the context permanently. The touchstart listener below is a belt-and-suspenders
// fallback for devices that need a later touch.
function _unlockAudioCtx() {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
    const buf = _audioCtx.createBuffer(1, 1, 22050);
    const src = _audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(_audioCtx.destination);
    src.start(0);
  } catch (_) {}
}

document.addEventListener('touchstart', function _touchUnlock() {
  _unlockAudioCtx();
  document.removeEventListener('touchstart', _touchUnlock);
}, { passive: true, once: true });

function _playTone(level) {
  if (level === 0) return;
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (_audioCtx.state !== 'running') _audioCtx.resume();
    const freq = AUDIO_FREQS[level] || 440;
    const dur  = AUDIO_DURS[level]  || 0.1;
    const osc  = _audioCtx.createOscillator();
    const gain = _audioCtx.createGain();
    osc.connect(gain); gain.connect(_audioCtx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.75, _audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + dur);
    osc.start(); osc.stop(_audioCtx.currentTime + dur);
  } catch (_) {}
}

// ─── Repeating proximity feedback ────────────────────────────────────────────
// Feedback fires immediately on level entry, then repeats at a level-specific
// Haptic: each vibration starts before the previous one ends → feels continuous.
// Audio:  short tone repeated at a rate shorter than silence between levels.
// Both are driven by a polling interval independent of level-change events.
let _hapticInterval = null;
let _audioInterval  = null;

// Vibration duration per level (ms). Re-issued every HAPTIC_RATE ms.
// dur > rate at L3 means overlapping calls → continuous buzz feel.
const HAPTIC_DUR  = { 1: 100, 2: 150, 3: 250, 4: 500 };
const HAPTIC_RATE = { 1: 400, 2: 200, 3: 80 };  // ms between re-issues

// Audio: short tones at increasing rate. L3 gap = RATE − DUR*1000 ≈ 20ms.
const AUDIO_FREQS = { 1: 440, 2: 700, 3: 1200, 4: 880 };
const AUDIO_DURS  = { 1: 0.09, 2: 0.08, 3: 0.06, 4: 0.25 };
const AUDIO_RATE  = { 1: 550, 2: 230, 3: 80 };  // ms between tones

function _setHapticLevel(level) {
  if (_hapticInterval) { clearInterval(_hapticInterval); _hapticInterval = null; }
  if (!navigator.vibrate) return;
  if (level === 0) { navigator.vibrate(0); return; }
  const dur = HAPTIC_DUR[level] ?? 100;
  const go  = () => navigator.vibrate([dur]);
  go();
  if (level !== 4) _hapticInterval = setInterval(go, HAPTIC_RATE[level] ?? 200);
}

function _setAudioLevel(level) {
  if (_audioInterval) { clearInterval(_audioInterval); _audioInterval = null; }
  if (level === 0) return;
  _playTone(level);
  if (level !== 4) _audioInterval = setInterval(() => _playTone(level), AUDIO_RATE[level] ?? 200);
}

// ─── Feedback stop ────────────────────────────────────────────────────────────
function stopAllFeedback() {
  if (_hapticInterval) { clearInterval(_hapticInterval); _hapticInterval = null; }
  if (_audioInterval)  { clearInterval(_audioInterval);  _audioInterval  = null; }
  if (navigator.vibrate) navigator.vibrate(0);
}

// ─── Survey ───────────────────────────────────────────────────────────────────
document.getElementById('survey-submit')?.addEventListener('click', () => {
  const text = document.getElementById('survey-textarea')?.value.trim() || '';
  socket?.emit('SURVEY_RESPONSE', {
    response:     text,
    playerNum:    _playerNum,
    modality:     _modality,
    timestamp:    new Date().toISOString(),
    play_count:   _playCount,
    demographics: _demographics,
  });
  _setState('thanks');
});

document.getElementById('survey-skip')?.addEventListener('click', () => {
  socket?.emit('SURVEY_RESPONSE', {
    response:     '',
    playerNum:    _playerNum,
    modality:     _modality,
    timestamp:    new Date().toISOString(),
    play_count:   _playCount,
    demographics: _demographics,
  });
  _setState('thanks');
});

// ─── Error toast ──────────────────────────────────────────────────────────────
function _showError(msg) {
  const el = document.getElementById('error-msg');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ─── Join button ──────────────────────────────────────────────────────────────
document.getElementById('join-btn')?.addEventListener('click', () => {
  _unlockAudioCtx();  // unlock audio on the earliest user gesture
  connectWithName();
});

// ─── Chip init ────────────────────────────────────────────────────────────────
_initChips('chips-hand');
_initChips('chips-gaming');
_initChips('chips-tilt');
_initChips('chips-gender');

console.log('[Controller] Ready');
