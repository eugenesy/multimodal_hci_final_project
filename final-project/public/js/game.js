'use strict';

// ─── Fixed constants ──────────────────────────────────────────────────────────
const BALL_R       = 14;    // px — ball collision radius
const BALL_ACCEL   = 40;    // px/s² per degree of tilt
const BALL_MAX_SPD = 120;   // px/s — capped low; precision task, not a speed game
const STUN_MS      = 1200;  // ms — stun on fall (longer than maze hit to feel like a penalty)
const ARENA_M      = 60;    // px — margin from screen edge
// Proximity thresholds as fraction of halfWidth — scales with corridor width so
// there is always a feedback-free safe zone in the centre of the corridor.
// Gap = halfWidth − distToPath: 0 at edge, halfWidth at centreline.
// Level fires when gap < PROX_T_PCT[i] * halfWidth.
// 0.50 → outer 50% of half-corridor triggers NEAR (safe zone = inner 50%)
// 0.28 → outer 28% triggers WARN
// 0.12 → outer 12% triggers DANGER
const PROX_T_PCT  = [0.50, 0.28, 0.12];
const PROX_HYST_PCT = 0.08; // hysteresis as fraction of halfWidth (~8%)

// ─── Per-level difficulty configs ─────────────────────────────────────────────
// Only halfWidth (corridor width), drag (ball inertia), and round duration vary.
// Narrower halfWidth + higher drag = requires more precise and anticipatory tilt.
// Level 1 = practice round (same difficulty as L2, no feedback routed by server).
// Levels 2–4 = experimental rounds with assigned modality.
const LEVEL_CONFIG = {
  1: { halfWidth: 80, drag: 2.5, roundMs: 90_000 },  // practice (easy, recorded silently)
  2: { halfWidth: 80, drag: 2.5, roundMs: 90_000 },  // experimental easy
  3: { halfWidth: 55, drag: 2.0, roundMs: 75_000 },  // experimental medium
  4: { halfWidth: 35, drag: 1.5, roundMs: 60_000 },  // experimental hard
};

// ─── Pre-designed paths ───────────────────────────────────────────────────────
// Waypoints as fractions of arena dimensions. Scaled to px in create().
// Index 0 = START (spawn), all subsequent indices are checkpoints, last = END.
// L1 (practice) and L2 (easy) share the same path — participant knows the route,
// isolating feedback as the only variable between those two rounds.
const PATHS = {
  1: [ // gentle S-curve — shared by practice (L1) and easy (L2)
    {fx:0.10,fy:0.50}, {fx:0.28,fy:0.20}, {fx:0.50,fy:0.50},
    {fx:0.72,fy:0.80}, {fx:0.90,fy:0.50},
  ],
  2: [ // N-shape — medium (L3)
    {fx:0.10,fy:0.80}, {fx:0.10,fy:0.15}, {fx:0.40,fy:0.80},
    {fx:0.60,fy:0.15}, {fx:0.90,fy:0.80},
  ],
  3: [ // tight zigzag — hard (L4)
    {fx:0.10,fy:0.85}, {fx:0.10,fy:0.15}, {fx:0.33,fy:0.15},
    {fx:0.33,fy:0.85}, {fx:0.56,fy:0.85}, {fx:0.78,fy:0.15},
    {fx:0.90,fy:0.15},
  ],
};

// Maps game level → path index (L1 and L2 share path 1)
const LEVEL_PATH = { 1: 1, 2: 1, 3: 2, 4: 3 };

// ─── TightropeScene ───────────────────────────────────────────────────────────
// Scene key kept as 'MazeScene' to avoid rewiring display.js references.
class MarbleScene extends Phaser.Scene {
  constructor() { super({ key: 'MazeScene' }); }

  init(data) {
    this._players    = data.players || [];
    this._cbs        = {
      onWallHit:         data.onWallHit         || (() => {}),
      onGameEnd:         data.onGameEnd          || (() => {}),
      onProximityChange: data.onProximityChange  || (() => {}),
      onReady:           data.onReady            || (() => {}),
    };
    this._cfg        = LEVEL_CONFIG[data.level] || LEVEL_CONFIG[1];
    this._pathDef    = PATHS[LEVEL_PATH[data.level]] || PATHS[1];
    this._tilt              = {};
    this._state             = {};
    this._paused            = !!data.startPaused;
    this._ended             = false;
    this._roundStart        = 0;
    this._lastTime          = 0;
    this._trajectory        = [];
    this._lastTrajectoryMs  = 0;
  }

  preload() {}

  create() {
    const W  = this.scale.width;
    const H  = this.scale.height;
    const AX = ARENA_M, AY = ARENA_M, AR = W - ARENA_M, AB = H - ARENA_M;
    const AW = AR - AX, AH = AB - AY;
    this._AX = AX; this._AY = AY; this._AW = AW; this._AH = AH;

    // Scale fractional path coordinates to real px
    this._pathPts = this._pathDef.map(({fx, fy}) => ({
      x: AX + fx * AW,
      y: AY + fy * AH,
    }));

    const hw  = this._cfg.halfWidth;
    const pts = this._pathPts;

    // ── Draw corridor ──────────────────────────────────────────────────────────
    const g = this.add.graphics();

    // 1. Filled segment rectangles
    g.fillStyle(0x1e1a16, 1.0);
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i].x,   ay = pts[i].y;
      const bx = pts[i+1].x, by = pts[i+1].y;
      const dx = bx - ax,    dy = by - ay;
      const len = Math.hypot(dx, dy);
      if (len === 0) continue;
      const nx = -dy/len * hw, ny = dx/len * hw;
      g.beginPath();
      g.moveTo(ax + nx, ay + ny); g.lineTo(bx + nx, by + ny);
      g.lineTo(bx - nx, by - ny); g.lineTo(ax - nx, ay - ny);
      g.closePath(); g.fillPath();
    }
    // 2. Filled circles at internal junctions — close the triangular gaps between segments
    for (let i = 1; i < pts.length - 1; i++) {
      g.fillCircle(pts[i].x, pts[i].y, hw);
    }

    // 3. Edge lines per segment
    g.lineStyle(3, 0xc0392b, 1.0);
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i].x,   ay = pts[i].y;
      const bx = pts[i+1].x, by = pts[i+1].y;
      const dx = bx - ax,    dy = by - ay;
      const len = Math.hypot(dx, dy);
      if (len === 0) continue;
      const nx = -dy/len * hw, ny = dx/len * hw;
      g.beginPath(); g.moveTo(ax+nx, ay+ny); g.lineTo(bx+nx, by+ny); g.strokePath();
      g.beginPath(); g.moveTo(ax-nx, ay-ny); g.lineTo(bx-nx, by-ny); g.strokePath();
    }
    // 4. Stroke circles at internal junctions — matches dark fill circles, no triangle artifacts
    g.lineStyle(3, 0xc0392b, 1.0);
    for (let i = 1; i < pts.length - 1; i++) {
      g.strokeCircle(pts[i].x, pts[i].y, hw);
    }

    // Center guide line (subtle)
    g.lineStyle(1, 0xf5f2ed, 0.12);
    g.beginPath();
    pts.forEach((p, i) => i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y));
    g.strokePath();

    // ── Start / End zone boxes (Mario Kart style stripe across the corridor) ─────
    const zoneG = this.add.graphics();
    const ZD = 18; // half-depth of zone stripe along path

    const _drawZone = (ptIdx, color) => {
      const isStart = ptIdx === 0;
      const p0 = pts[isStart ? 0 : pts.length - 2];
      const p1 = pts[isStart ? 1 : pts.length - 1];
      const anchor = pts[isStart ? 0 : pts.length - 1];
      const dx = p1.x - p0.x, dy = p1.y - p0.y;
      const len = Math.hypot(dx, dy);
      if (len === 0) return;
      const dirx = dx/len, diry = dy/len;
      const nx = -diry * (hw - 3), ny = dirx * (hw - 3);
      const sign = isStart ? 1 : -1;
      zoneG.fillStyle(color, 0.75);
      zoneG.beginPath();
      zoneG.moveTo(anchor.x + nx - dirx*ZD*sign, anchor.y + ny - diry*ZD*sign);
      zoneG.lineTo(anchor.x - nx - dirx*ZD*sign, anchor.y - ny - diry*ZD*sign);
      zoneG.lineTo(anchor.x - nx + dirx*ZD*sign, anchor.y - ny + diry*ZD*sign);
      zoneG.lineTo(anchor.x + nx + dirx*ZD*sign, anchor.y + ny + diry*ZD*sign);
      zoneG.closePath();
      zoneG.fillPath();
    };
    _drawZone(0, 0xc0392b);               // red start zone
    _drawZone(pts.length - 1, 0x27ae60); // green end zone
    zoneG.setDepth(3);

    // Labels
    this.add.text(pts[0].x, pts[0].y + hw + 8, 'START', {
      fontSize: '11px', fontFamily: 'Barlow', color: '#c0392b',
    }).setOrigin(0.5, 0).setDepth(6);
    this.add.text(pts[pts.length-1].x, pts[pts.length-1].y + hw + 8, 'END', {
      fontSize: '11px', fontFamily: 'Barlow', color: '#27ae60',
    }).setOrigin(0.5, 0).setDepth(6);

    // ── Player ball ────────────────────────────────────────────────────────────
    this._players.forEach((p) => {
      const start = pts[0];

      const ball = this.add.graphics();
      ball.fillStyle(0xf5f2ed, 1.0);
      ball.fillCircle(0, 0, BALL_R);
      ball.lineStyle(2.5, 0xc0392b, 0.8);
      ball.strokeCircle(0, 0, BALL_R);
      ball.setDepth(10);
      ball.x = start.x;
      ball.y = start.y;

      this._state[p.playerNum] = {
        ball,
        vx: 0, vy: 0,
        falls:     0,
        stunUntil: 0,
        proxLevel: 0,
        proxMs:    { 1: 0, 2: 0, 3: 0 },
      };
    });

    // ── HUD timer ──────────────────────────────────────────────────────────────
    const _initMins = Math.floor(this._cfg.roundMs / 60000);
    const _initSecs = Math.floor((this._cfg.roundMs % 60000) / 1000);
    this._timerText = this.add.text(W / 2, ARENA_M / 2,
      `${_initMins}:${String(_initSecs).padStart(2,'0')}`, {
      fontSize: '18px', fontFamily: 'Barlow', color: '#f5f2ed', alpha: 0.7,
    }).setOrigin(0.5, 0.5).setDepth(20);

    this._cbs.onReady(this);
  }

  // ─── Update ──────────────────────────────────────────────────────────────────
  update(time, delta) {
    if (this._paused || this._ended) return;
    this._lastTime = time;
    if (this._roundStart === 0) this._roundStart = time;
    const dt  = delta / 1000;
    const pts = this._pathPts;
    const hw  = this._cfg.halfWidth;

    // Round countdown
    const left = Math.max(0, this._cfg.roundMs - (time - this._roundStart));
    const mins = Math.floor(left / 60000);
    const secs = Math.floor((left % 60000) / 1000);
    this._timerText.setText(`${mins}:${String(secs).padStart(2, '0')}`);
    if (left <= 0) { this._endGame(); return; }

    // Trajectory sampling at 10Hz (every 100ms)
    const t_ms = Math.round(time - this._roundStart);
    if (t_ms - this._lastTrajectoryMs >= 100 && this._players.length > 0) {
      this._lastTrajectoryMs = t_ms;
      const p0 = this._players[0];
      const s0 = this._state[p0.playerNum];
      if (s0) {
        const tilt = this._tilt[p0.playerNum] || { gamma: 0, beta: 0 };
        this._trajectory.push({
          t_ms,
          x_frac: +((s0.ball.x - this._AX) / this._AW).toFixed(4),
          y_frac: +((s0.ball.y - this._AY) / this._AH).toFixed(4),
          proximity_level: s0.proxLevel,
          gamma: +tilt.gamma.toFixed(2),
          beta: +tilt.beta.toFixed(2),
        });
      }
    }

    for (const p of this._players) {
      const s       = this._state[p.playerNum];
      const tilt    = this._tilt[p.playerNum] || { gamma: 0, beta: 0 };
      const stunned = time < s.stunUntil;

      // Acceleration from tilt (reduced while stunned so ball doesn't escape checkpoint)
      const accelMult = stunned ? 0.1 : 1.0;
      s.vx += tilt.gamma * BALL_ACCEL * accelMult * dt;
      s.vy += tilt.beta  * BALL_ACCEL * accelMult * dt;

      // Velocity-proportional drag
      s.vx -= s.vx * this._cfg.drag * dt;
      s.vy -= s.vy * this._cfg.drag * dt;

      // Speed cap
      const spd = Math.hypot(s.vx, s.vy);
      if (spd > BALL_MAX_SPD) { s.vx = s.vx/spd * BALL_MAX_SPD; s.vy = s.vy/spd * BALL_MAX_SPD; }

      s.ball.x += s.vx * dt;
      s.ball.y += s.vy * dt;

      // ── Fall detection ──────────────────────────────────────────────────────
      const dist = this._distToPath(s.ball.x, s.ball.y);
      if (dist > hw && !stunned) {
        s.falls++;
        this._cbs.onWallHit(p.playerNum);
        s.ball.x = pts[0].x;
        s.ball.y = pts[0].y;
        s.vx = 0; s.vy = 0;
        s.stunUntil = time + STUN_MS;
        this.tweens.add({
          targets: s.ball, alpha: 0.15, duration: 80, yoyo: true, repeat: 4,
          onComplete: () => { if (s.ball) s.ball.alpha = 1; },
        });
      }

      // ── End detection — check distance to END point every frame ────────────
      if (!stunned) {
        const endPt = pts[pts.length - 1];
        if (Math.hypot(s.ball.x - endPt.x, s.ball.y - endPt.y) < hw + 15) {
          this._endGame(); return;
        }
      }

      // ── Proximity ───────────────────────────────────────────────────────────
      const gap      = hw - dist;  // positive = inside corridor, 0 = at edge
      const newLevel = this._proxLevel(gap, s.proxLevel);
      if (newLevel !== s.proxLevel) {
        s.proxLevel = newLevel;
        this._cbs.onProximityChange(p.playerNum, newLevel);
      }
      if (newLevel > 0) s.proxMs[newLevel] += delta;

    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  _distToPath(x, y) {
    // Minimum distance from point (x,y) to any segment of the path centerline
    let minDist = Infinity;
    const pts   = this._pathPts;
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i].x,   ay = pts[i].y;
      const bx = pts[i+1].x, by = pts[i+1].y;
      const dx = bx - ax,    dy = by - ay;
      const lenSq = dx*dx + dy*dy;
      const t  = lenSq > 0 ? Math.max(0, Math.min(1, ((x-ax)*dx + (y-ay)*dy) / lenSq)) : 0;
      const cx = ax + t*dx, cy = ay + t*dy;
      const d  = Math.hypot(x - cx, y - cy);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  _proxLevel(gap, current) {
    const hw = this._cfg.halfWidth;
    const t1 = PROX_T_PCT[0] * hw, t2 = PROX_T_PCT[1] * hw, t3 = PROX_T_PCT[2] * hw;
    const h  = PROX_HYST_PCT * hw;
    // Ascending: immediate entry into higher danger levels
    if (gap < t3) return 3;
    if (gap < t2 && current < 2) return 2;
    if (gap < t1 && current < 1) return 1;
    // Descending: hysteresis prevents rapid toggling
    if (current === 3 && gap > t3 + h) return 2;
    if (current === 2 && gap > t2 + h) return 1;
    if (current === 1 && gap > t1 + h) return 0;
    return current;
  }

  _endGame() {
    if (this._ended) return;
    this._ended = true;
    const elapsed = this._roundStart > 0
      ? (this._lastTime - this._roundStart)
      : this._cfg.roundMs;
    const rankings = this._players.map(p => {
      const s = this._state[p.playerNum];
      return {
        playerNum:           p.playerNum,
        falls:               s.falls,
        score:               Math.max(0, 1000 - s.falls * 100),
        time_at_level_1_ms:  s.proxMs[1],
        time_at_level_2_ms:  s.proxMs[2],
        time_at_level_3_ms:  s.proxMs[3],
      };
    });
    this._cbs.onGameEnd({ rankings, round_duration_ms: elapsed, trajectory: this._trajectory });
  }

  // ─── Public API (called by display.js) ───────────────────────────────────────
  setTilt(playerNum, gamma, beta) {
    this._tilt[playerNum] = { gamma, beta };
  }

  getStats() {
    const out = {};
    for (const p of this._players) {
      const s = this._state[p.playerNum];
      if (s) out[p.playerNum] = { falls: s.falls, score: Math.max(0, 1000 - s.falls * 100) };
    }
    return out;
  }

  setPaused(v) { this._paused = !!v; }
}

// ─── Factory (called by display.js) ──────────────────────────────────────────
function createPhaserGame(containerId, initData) {
  const el = document.getElementById(containerId);
  const config = {
    type:            Phaser.AUTO,
    parent:          containerId,
    width:           el ? el.offsetWidth  : window.innerWidth,
    height:          el ? el.offsetHeight : window.innerHeight,
    backgroundColor: '#111111',
    scene:           MarbleScene,
  };
  const game = new Phaser.Game(config);
  game.scene.start('MazeScene', initData);
  return game;
}
