'use strict';

const PING_INTERVAL_MS = 5000;
const DEBUG = new URLSearchParams(window.location.search).get('debug') === 'true';

// Persistent player identity — UUID survives page reloads for modality counterbalancing
function getOrCreatePlayerId() {
  let id = localStorage.getItem('bsh_player_id');
  if (!id) {
    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    localStorage.setItem('bsh_player_id', id);
  }
  return id;
}

const PLAYER_NUM = 1; // server assigns the real number after connect

const statusIcon  = document.getElementById('status-icon');
const statusLabel = document.getElementById('status-label');
const statusSub   = document.getElementById('status-sub');
const errorMsg    = document.getElementById('error-msg');
const permOverlay = document.getElementById('permission-overlay');
const permBtn     = document.getElementById('permission-btn');
const debugPanel  = document.getElementById('debug-panel');
const debugGamma  = document.getElementById('debug-gamma');
const debugBeta   = document.getElementById('debug-beta');
const debugState  = document.getElementById('debug-state');
const surveyOverlay  = document.getElementById('survey-overlay');
const surveyForm     = document.getElementById('survey-form');
const surveyThanks   = document.getElementById('survey-thanks');
const surveyTextarea = document.getElementById('survey-textarea');
const surveySubmit   = document.getElementById('survey-submit');
const surveySkip     = document.getElementById('survey-skip');

if (statusSub) statusSub.textContent = `Body Schema Hack · Player ${PLAYER_NUM}`;
if (DEBUG) debugPanel.style.display = 'block';

const PLAYER_COLOR = PLAYER_NUM === 1 ? '#00cfff' : '#ff6b35';
if (statusLabel) statusLabel.style.color = PLAYER_COLOR;

const STATE = {
  CONNECTING: 'CONNECTING',
  CONNECTED:  'CONNECTED',
  PLAYING:    'PLAYING',
  ERROR:      'ERROR',
};

let currentState = STATE.CONNECTING;
let currentGamma = 0;
let currentBeta  = 0;
let calibrateGamma = 0;   // tapped-to-recalibrate offsets
let calibrateBeta  = 0;
let gyroReady    = false;
let gyronormInstance = null;
let rafHandle    = null;
let assignedModality  = null;
let assignedPlayerNum = PLAYER_NUM;
let assignedPlayCount = 0;    // 0 = first ever session → show demographics

function setState(state) {
  currentState = state;
  switch (state) {
    case STATE.CONNECTING:
      statusIcon.textContent  = '○';
      statusLabel.textContent = 'Connecting…';
      break;
    case STATE.CONNECTED:
      statusIcon.textContent  = `P${PLAYER_NUM}`;
      statusLabel.textContent = `Player ${PLAYER_NUM} Ready`;
      break;
    case STATE.PLAYING:
      statusIcon.textContent  = '▶';
      statusLabel.textContent = 'Playing';
      break;
    case STATE.ERROR:
      statusIcon.textContent  = '✕';
      statusLabel.textContent = 'Error';
      break;
  }
  if (DEBUG && debugState) debugState.textContent = `state: ${state.toLowerCase()}`;
}

function showError(msg) {
  if (errorMsg) { errorMsg.style.display = 'block'; errorMsg.textContent = msg; }
  setState(STATE.ERROR);
}

// ─── Proximity feedback: haptic vibration ─────────────────────────────────────
let hapticTimer = null;

function setHapticLevel(level) {
  clearInterval(hapticTimer);
  hapticTimer = null;
  if (!navigator.vibrate) return;

  if (level === 0) { navigator.vibrate(0); return; }
  if (level === 4) { navigator.vibrate([200]); return; }

  // Levels 1–3: repeating pulse, faster and stronger as level increases
  const configs = [
    null,
    { pattern: [15], period: 500 },   // 1: NEAR  — light tick every 500ms
    { pattern: [35], period: 250 },   // 2: WARN  — medium pulse every 250ms
    { pattern: [70], period: 110 },   // 3: DANGER — heavy pulse every 110ms
  ];
  const cfg = configs[level];
  const fire = () => navigator.vibrate(cfg.pattern);
  fire();
  hapticTimer = setInterval(fire, cfg.period);
}

// ─── Proximity feedback: audio oscillator ─────────────────────────────────────
let audioCtx  = null;
let osc       = null;
let gainNode  = null;
let beepTimer = null;

// Parking-sensor style: pulsed beeps that increase in rate and pitch with proximity
const BEEP_FREQS   = [0,  220,  360,  540, 800];   // Hz per level
const BEEP_GAINS   = [0, 0.25, 0.45, 0.70, 0.9];   // amplitude per level
const BEEP_PERIODS = [0, 1000,  333,  125];          // ms between beep starts, levels 1–3

function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0;
      gainNode.connect(audioCtx.destination);
      osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = BEEP_FREQS[1];
      osc.connect(gainNode);
      osc.start();
    } catch (e) { /* audio not available */ }
  } else if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function setAudioLevel(level) {
  clearInterval(beepTimer); beepTimer = null;
  if (!audioCtx || !osc || !gainNode) return;
  const l = Math.max(0, Math.min(4, level));
  const t = audioCtx.currentTime;

  if (l === 0) {
    gainNode.gain.setTargetAtTime(0, t, 0.05);
    return;
  }

  osc.frequency.setTargetAtTime(BEEP_FREQS[l], t, 0.02);

  if (l === 4) {
    // Continuous burst on hit
    gainNode.gain.setTargetAtTime(BEEP_GAINS[4], t, 0.02);
    return;
  }

  // Levels 1–3: pulsed beeps at increasing rate
  const fire = () => {
    if (!audioCtx || !gainNode) return;
    const now = audioCtx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(BEEP_GAINS[l], now);
    gainNode.gain.setTargetAtTime(0, now + 0.06, 0.02);
  };
  fire();
  beepTimer = setInterval(fire, BEEP_PERIODS[l]);
}

function stopAllFeedback() {
  setHapticLevel(0);
  setAudioLevel(0);
  clearInterval(beepTimer); beepTimer = null;
}

// ─── Device info from user-agent ─────────────────────────────────────────────
function _parseDevice(ua) {
  const android = ua.match(/Android\s([\d.]+);\s([^)]+?)\sBuild/);
  if (android) return { os_version: android[1], device_model: android[2].trim() };
  const ios = ua.match(/CPU (?:iPhone )?OS ([\d_]+)/);
  if (ios) return { os_version: ios[1].replace(/_/g, '.'), device_model: 'iPhone' };
  return { os_version: '', device_model: '' };
}

// ─── Join screen — collect name then connect ──────────────────────────────────
const joinOverlay = document.getElementById('join-overlay');
const joinNameEl  = document.getElementById('join-name');
const joinBtn     = document.getElementById('join-btn');

// Pre-fill saved name if returning player
const savedName = localStorage.getItem('bsh_player_name') || '';
if (joinNameEl && savedName) joinNameEl.value = savedName;

let socket = null;

function connectWithName(name) {
  name = name.trim().slice(0, 20) || 'Player';
  localStorage.setItem('bsh_player_name', name);
  if (joinOverlay) joinOverlay.style.display = 'none';

  const canVibrate = !!navigator.vibrate;
  const { os_version, device_model } = _parseDevice(navigator.userAgent);
  socket = io({
    query: {
      role:        'controller',
      playerName:  name,
      playerId:    getOrCreatePlayerId(),
      canVibrate:  String(canVibrate),
      os:          navigator.platform || '',
      os_version,
      device_model,
      browser:     navigator.userAgent.slice(0, 80),
      screen_res:  `${screen.width}x${screen.height}`,
      pixel_ratio: String(window.devicePixelRatio || 1),
    },
  });
  _bindSocketEvents();
}

if (joinBtn) {
  joinBtn.addEventListener('click', () => connectWithName(joinNameEl?.value || ''));
}
if (joinNameEl) {
  joinNameEl.addEventListener('keydown', e => { if (e.key === 'Enter') connectWithName(joinNameEl.value); });
  // Focus the input on load
  setTimeout(() => joinNameEl.focus(), 100);
}

// ─── Socket.io event bindings (called after connect) ─────────────────────────
function _bindSocketEvents() {

socket.on('connect',       () => { setState(STATE.CONNECTED); startPingLoop(); initGyro(); });
socket.on('disconnect',    () => { setState(STATE.CONNECTING); stopGyroStream(); stopAllFeedback(); });
socket.on('connect_error', () => setState(STATE.CONNECTING));

socket.on('CONTROLLER_REJECTED', ({ message }) => {
  showError(message || 'Connection rejected. Please wait for the current round to end.');
});

const MODALITY_BRIEFING = {
  haptic: { icon: '📳', label: 'Haptic', desc: 'Your phone will vibrate — pulses grow faster and stronger as your ball gets closer to the path edge.' },
  audio:  { icon: '🔊', label: 'Audio',  desc: 'You will hear a tone — it increases in pitch and rate as your ball approaches the path edge.' },
  none:   { icon: '—',  label: 'None',   desc: 'No proximity warning. You will rely on visual information only.' },
};

socket.on('PLAYER_ASSIGNED', ({ playerNum, color, modality, playCount }) => {
  assignedPlayerNum = playerNum;
  assignedModality  = modality;
  assignedPlayCount = playCount || 0;
  if (statusLabel) { statusLabel.textContent = `Player ${playerNum} Ready`; statusLabel.style.color = color; }
  if (statusSub)   statusSub.textContent = `Body Schema Hack · Player ${playerNum}`;
  const bubble    = document.getElementById('tilt-bubble');
  const rationale = document.getElementById('tilt-rationale');
  if (bubble) bubble.style.color = color;
  if (rationale) {
    const b = MODALITY_BRIEFING[modality] || MODALITY_BRIEFING.none;
    rationale.innerHTML =
      `<div style="font-size:13px;color:#aaa;margin-bottom:8px;letter-spacing:2px">` +
        `${b.icon}&nbsp; THIS SESSION: <strong style="color:#e0e0e0">${b.label}</strong>` +
      `</div>` +
      `<div style="color:#888;font-size:11px;line-height:1.7">${b.desc}</div>` +
      `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #1a1a2a;` +
           `color:#00ff88;font-size:11px;line-height:1.8;font-weight:bold">` +
        `Use your non-dominant hand only.` +
      `</div>` +
      `<div style="color:#666;font-size:10px;line-height:1.7;margin-top:4px">` +
        `Hold and tilt this phone with your weaker hand.<br>` +
        `Your dominant hand should rest at your side.<br>` +
        `Double-tap screen to recalibrate tilt neutral.` +
      `</div>`;
    rationale.style.display = 'block';
  }
});

socket.on('GAME_START', () => {
  _hideSurvey();
  calibrateGamma = 0;
  calibrateBeta  = 0;
  setState(STATE.PLAYING);
  ensureAudio();
  startGyroStream();
  const rationale = document.getElementById('tilt-rationale');
  if (rationale) rationale.style.display = 'none';
});

socket.on('GAME_END', () => {
  stopGyroStream();
  stopAllFeedback();
  setState(STATE.CONNECTED);
  _showSurvey();
});

// ─── Proximity feedback events ────────────────────────────────────────────────
socket.on('HAPTIC_PROXIMITY',  ({ level }) => setHapticLevel(level));
socket.on('AUDIO_PROXIMITY',   ({ level }) => setAudioLevel(level));
} // end _bindSocketEvents

// ─── Gyroscope ─────────────────────────────────────────────────────────────────
async function initGyro() {
  if (!window.DeviceOrientationEvent) {
    showError('Motion sensors not available on this device.');
    return;
  }
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    permOverlay.classList.add('visible');
    permBtn.addEventListener('click', async () => {
      try {
        const perm = await DeviceOrientationEvent.requestPermission();
        permOverlay.classList.remove('visible');
        ensureAudio();
        if (perm === 'granted') startGyronorm();
        else showError('Tilt permission denied. Reload and tap Allow.');
      } catch (err) {
        permOverlay.classList.remove('visible');
        showError('Permission error: ' + err.message);
      }
    });
    return;
  }
  startGyronorm();
}

function startGyronorm() {
  gyronormInstance = new GyroNorm();
  gyronormInstance.init({ frequency: 60, gravityNormalized: true, orientationBase: GyroNorm.WORLD })
    .then(() => {
      gyroReady = true;
      gyronormInstance.start((data) => {
        currentGamma = data.do.gamma;
        currentBeta  = data.do.beta;
        if (DEBUG) {
          if (debugGamma) debugGamma.textContent = currentGamma.toFixed(1) + '°';
          if (debugBeta)  debugBeta.textContent  = currentBeta.toFixed(1) + '°';
        }
      });
    })
    .catch(() => {
      window.addEventListener('deviceorientation', (e) => {
        if (e.gamma !== null) currentGamma = e.gamma;
        if (e.beta  !== null) currentBeta  = e.beta;
        if (DEBUG) {
          if (debugGamma) debugGamma.textContent = currentGamma.toFixed(1) + '°';
          if (debugBeta)  debugBeta.textContent  = currentBeta.toFixed(1) + '°';
        }
      });
      gyroReady = true;
    });
}

function startGyroStream() {
  if (rafHandle) return;
  let lastSendTime = 0;
  const send = (now) => {
    if (gyroReady && now - lastSendTime >= 16) {
      socket.volatile.emit('GYRO_DATA', {
        gamma: currentGamma - calibrateGamma,
        beta:  currentBeta  - calibrateBeta,
      });
      lastSendTime = now;
    }
    rafHandle = requestAnimationFrame(send);
  };
  rafHandle = requestAnimationFrame(send);
}

function stopGyroStream() {
  if (rafHandle) { cancelAnimationFrame(rafHandle); rafHandle = null; }
}

function startPingLoop() {
  setInterval(() => { if (socket.connected) socket.emit('PING', {}); }, PING_INTERVAL_MS);
}

// ─── Tap-to-recalibrate ───────────────────────────────────────────────────────
// Double-tap anywhere during play zeros the current tilt as the new neutral
let lastTap = 0;
document.addEventListener('touchend', (e) => {
  if (currentState !== STATE.PLAYING) return;
  // Ignore taps inside the survey overlay
  if (surveyOverlay && surveyOverlay.contains(e.target)) return;
  const now = Date.now();
  if (now - lastTap < 300) {
    calibrateGamma = currentGamma;
    calibrateBeta  = currentBeta;
  }
  lastTap = now;
}, { passive: true });

// ─── Post-round survey ────────────────────────────────────────────────────────
function _showSurvey() {
  if (!surveyOverlay) return;
  surveyForm.style.display       = 'flex';
  surveyForm.style.flexDirection = 'column';
  surveyThanks.style.display     = 'none';
  surveyTextarea.value           = '';

  // Show demographics only on the participant's very first session
  const demoSection = document.getElementById('demographics-section');
  if (demoSection) {
    demoSection.style.display = assignedPlayCount === 0 ? 'block' : 'none';
    // Clear previous answers
    document.querySelectorAll('#demographics-section input').forEach(el => { el.checked = false; el.value = el.type === 'number' ? '' : el.value; });
    const ageEl = document.getElementById('demo-age');
    if (ageEl) ageEl.value = '';
  }

  surveyOverlay.classList.add('visible');
}

function _hideSurvey() {
  if (!surveyOverlay) return;
  surveyOverlay.classList.remove('visible');
}

function _collectDemographics() {
  const radio = (name) => { const el = document.querySelector(`input[name="${name}"]:checked`); return el ? el.value : null; };
  const ageEl = document.getElementById('demo-age');
  return {
    age:              ageEl && ageEl.value ? Number(ageEl.value) : null,
    gender:           radio('demo-gender'),
    handedness:       radio('demo-hand'),
    gaming_experience: radio('demo-gaming'),
    tilt_experience:  radio('demo-tilt'),
  };
}

function _submitSurvey() {
  const payload = {
    response:   surveyTextarea.value.trim(),
    playerNum:  assignedPlayerNum,
    modality:   assignedModality,
    play_count: assignedPlayCount,
    timestamp:  new Date().toISOString(),
  };
  if (assignedPlayCount === 0) payload.demographics = _collectDemographics();
  socket.emit('SURVEY_RESPONSE', payload);
  surveyForm.style.display   = 'none';
  surveyThanks.style.display = 'flex';
  setTimeout(_hideSurvey, 2000);
}

if (surveySubmit) surveySubmit.addEventListener('click', _submitSurvey);
if (surveySkip)   surveySkip.addEventListener('click',   _hideSurvey);

// ─── AudioContext unlock on first touch ──────────────────────────────────────
document.body.addEventListener('touchstart', ensureAudio, { once: true });

// Keep screen awake during gameplay
if ('wakeLock' in navigator) {
  navigator.wakeLock.request('screen').catch(() => {});
}
