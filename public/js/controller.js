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
  const android = ua.match(/Android\s([\d.]+);\s([^)]+?)\sBuild/);
  if (android) return { os_version: android[1], device_model: android[2].trim() };
  const ios = ua.match(/CPU (?:iPhone )?OS ([\d_]+)/);
  if (ios) return { os_version: ios[1].replace(/_/g, '.'), device_model: 'iPhone' };
  return { os_version: '', device_model: '' };
}

// ─── Join ─────────────────────────────────────────────────────────────────────
function connectWithName() {
  const name = (document.getElementById('join-name')?.value || '').trim();
  if (!name) {
    _showError('Please enter your name.');
    return;
  }

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
      playerName:        name,
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

  socket.on('PLAYER_ASSIGNED', ({ playerNum, color, modality, playCount } = {}) => {
    _playerNum = playerNum;
    _modality  = modality;
    _playCount = playCount || 0;

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
    const lvl = Math.min(3, Math.max(1, Number(level) || 1));
    const names = ['LEVEL<br>ONE', 'LEVEL<br>TWO', 'LEVEL<br>THREE'];
    const ph = document.getElementById('playing-headline');
    if (ph) ph.innerHTML = names[lvl - 1];
    _setState('calibration');
  });

  socket.on('GAME_END', () => {
    stopAllFeedback();
    _setState('survey');
  });

  // Proximity feedback
  socket.on('HAPTIC_PROXIMITY', ({ level } = {}) => {
    if (!navigator.vibrate) return;
    const patterns = { 0: [], 1: [30], 2: [30, 80, 30], 3: [40, 50, 40, 50, 40] };
    const p = patterns[level] || [];
    if (p.length) navigator.vibrate(p);
  });

  socket.on('AUDIO_PROXIMITY', ({ level } = {}) => {
    _playTone(level);
  });

  socket.on('PING', () => socket.emit('PONG', {}));
}

// ─── Calibration ──────────────────────────────────────────────────────────────
document.getElementById('calibrate-btn')?.addEventListener('click', () => {
  calibGamma = currentGamma;
  calibBeta  = currentBeta;
  socket?.emit('CALIBRATION_DONE', {});
  startGyroStream();
  _setState('playing');
});

// ─── Gyro ─────────────────────────────────────────────────────────────────────
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

function startGyroStream() {
  if (gyroStarted) return;
  gyroStarted = true;
  let gn;
  try {
    gn = new GyroNorm();
    gn.init({ frequency: 60, gravityNormalized: true, orientationBase: GyroNorm.GAME, decimalCount: 2 })
      .then(() => {
        gn.start(data => {
          const raw_g = data.do.gamma ?? 0;
          const raw_b = data.do.beta  ?? 0;
          currentGamma = raw_g - calibGamma;
          currentBeta  = raw_b - calibBeta;
          _sendTilt(currentGamma, currentBeta);
        });
      })
      .catch(() => _fallbackGyro());
  } catch (_) {
    _fallbackGyro();
  }
}

function _fallbackGyro() {
  window.addEventListener('deviceorientation', e => {
    currentGamma = (e.gamma ?? 0) - calibGamma;
    currentBeta  = (e.beta  ?? 0) - calibBeta;
    _sendTilt(currentGamma, currentBeta);
  });
}

let _lastSent = 0;
function _sendTilt(gamma, beta) {
  const now = Date.now();
  if (now - _lastSent < 16) return;
  _lastSent = now;
  if (DEBUG) {
    const dg = document.getElementById('debug-gamma');
    const db = document.getElementById('debug-beta');
    if (dg) dg.textContent = gamma.toFixed(1) + '°';
    if (db) db.textContent = beta.toFixed(1)  + '°';
  }
  socket?.emit('GYRO_DATA', { gamma, beta });
}

// ─── Double-tap recalibration ─────────────────────────────────────────────────
document.addEventListener('dblclick', () => {
  calibGamma = currentGamma + calibGamma;
  calibBeta  = currentBeta  + calibBeta;
});

// ─── Audio tones ──────────────────────────────────────────────────────────────
let _audioCtx = null;
function _playTone(level) {
  if (level === 0) return;
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const freqs = { 1: 330, 2: 440, 3: 660 };
    const durs  = { 1: 0.08, 2: 0.12, 3: 0.18 };
    const osc = _audioCtx.createOscillator();
    const gain = _audioCtx.createGain();
    osc.connect(gain); gain.connect(_audioCtx.destination);
    osc.frequency.value = freqs[level] || 440;
    gain.gain.setValueAtTime(0.25, _audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + (durs[level] || 0.1));
    osc.start(); osc.stop(_audioCtx.currentTime + (durs[level] || 0.1));
  } catch (_) {}
}

// ─── Feedback stop ────────────────────────────────────────────────────────────
function stopAllFeedback() {
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
document.getElementById('join-btn')?.addEventListener('click', connectWithName);
document.getElementById('join-name')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') connectWithName();
});

// ─── Chip init ────────────────────────────────────────────────────────────────
_initChips('chips-hand');
_initChips('chips-gaming');
_initChips('chips-tilt');
_initChips('chips-gender');

console.log('[Controller] Ready');
