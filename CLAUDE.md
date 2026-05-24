# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**PathSense** is a single-player tilt-controlled tightrope balance game for proximity-feedback research. A participant connects via QR code on a provided Android phone and must keep a ball on a narrow pre-designed path by tilting with their **non-dominant hand**. Proximity warnings (haptic / audio / none) escalate as the ball nears the path edge; falls (ball-off-path events) are the primary outcome measure.

See [RESEARCH.md](RESEARCH.md) for the full study design, research questions, and hypotheses.

---

## Setup & Running

### Prerequisites
- Node.js v18+
- `package.json` exists — run `npm install` if `node_modules` is missing
- No build step, no lint/test runner — all JS is served statically as-is

### HTTPS Certificate (Required for gyroscope on phones)

```bash
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/CN=localhost"
```

To trust on phones: open `https://<ip>:3000/cert` on the phone and install it.
- iOS: Settings → General → VPN & Device Management → Trust
- Android: follow the install prompt

The server auto-detects `cert.pem`/`key.pem` in the project root. If missing, falls back to HTTP (gyroscope will not work on phones).

### Run

```bash
node server.js   # or: npm start
```

Three URLs are printed on boot:
- `https://localhost:3000/` — Game display (external monitor, full-screen)
- `https://localhost:3000/admin` — Researcher admin panel
- `https://<ip>:3000/controller` — Player phone URL (shown as QR on admin panel)

Kill server: `lsof -ti :3000 | xargs kill -9`

---

## Architecture

### Socket Roles
Three socket roles connect to the server via the `role` query param:

- **`pc`** — Game display (index.html + display.js). Hosts the Phaser game. Receives `GAME_START`, `GYRO_DATA`; emits `FEEDBACK_EVENT`, `PROXIMITY_UPDATE`, `ROUND_COMPLETE`, `EXPORT_RESULTS`.
- **`admin`** — Researcher panel (admin.html + admin.js). Emits `GAME_START`; receives `PLAYERS_UPDATE`, `ROUND_COMPLETE`, `PHASE_CHANGE`. `adminStartGame()` and `adminBackToLobby()` are globals called via HTML `onclick` attributes.
- **`controller`** — Phone (controller.html + controller.js). Emits `GYRO_DATA`; receives `VIBRATE` (haptic), `PLAY_AUDIO` (audio). Accepts `?debug=true` to show live tilt values. Uses the `GyroNorm` library (loaded in controller.html) for cross-platform gyroscope access, with fallback to raw `deviceorientation` events.

### Session State Machine (server.js)
- **LOBBY** — waiting for players; new controllers can join
- **GAME** — round in progress; new controllers are rejected

### Feedback Event Flow
```
MarbleScene (Phaser) detects ball-off-path (fall)
  → display.js callback: onWallHit(playerNum)
  → socket.emit('FEEDBACK_EVENT', { playerNum, feedbackType: 'wall_hit' })
  → server.routeFeedbackEvent()
  → routes to player's controller socket:
      haptic:  VIBRATE { duration }
      audio:   PLAY_AUDIO { sound }
      none:    (no event)

MarbleScene proximity detection (each frame):
  → onProximityChange(playerNum, level) callback
  → socket.emit('PROXIMITY_UPDATE', { playerNum, level })
  → server.routeProximity()
  → routes to player's controller socket:
      haptic:  HAPTIC_PROXIMITY { level }
      audio:   AUDIO_PROXIMITY { level }
```

All feedback modalities go to the **player's own phone**, not the display screen.

### Player Join Flow
1. Phone opens `/controller` → shows name entry screen
2. Player types name → `connectWithName(name)` creates socket with query params: `role=controller`, `playerName`, `playerId` (UUID from localStorage), `canVibrate`, `os`, `browser`, `screen_res`, `pixel_ratio`
3. Server assigns modality via `assignModality()` (counterbalanced by `playerId` history)
4. Phone receives `PLAYER_ASSIGNED { playerNum, color, modality }`

### Modality Assignment (server.js `assignModality()`)
Players tracked by `playerId` (UUID persisted in `localStorage` as `bsh_player_id`). On join:
1. Checks `data/players.json` for `modalitiesExperienced`
2. Assigns an untried modality from the pool
3. Once all modalities tried, picks randomly
4. Haptic excluded for non-vibrating devices (`canVibrate=false`)

### Game Engine (game.js — MarbleScene, scene key `'MazeScene'`)
> **Note:** The game was redesigned from an N-player obstacle-dodge maze to a single-player tightrope balance task. Some legacy naming (scene key `'MazeScene'`) was kept to avoid rewiring display.js.

- **Phaser 3**, no physics engine — all movement and collision done manually each frame
- **Arena**: open rectangle, `ARENA_M = 60px` margin from screen edges
- **Player**: single ball, tilt `gamma` → horizontal acceleration, `beta` → vertical. Velocity-proportional drag per difficulty level, speed capped
- **Path**: `PATHS` object — fractional waypoint coordinates scaled to arena px at runtime. Level 1: S-curve (4 checkpoints). Level 2: N-shape (4 checkpoints). Level 3: Zigzag (6 checkpoints)
- **Corridor**: `halfWidth` per difficulty level (80 / 55 / 35 px). Ball outside corridor triggers a fall
- **Fall**: ball-off-path event. Ball respawns at last checkpoint, `falls++`, `onWallHit()` callback fires
- **Checkpoints**: waypoints along the path. `checkpoints_passed` increments when ball reaches each one
- **Score**: `checkpoints_passed × 100 − falls × 25`
- **Proximity**: per-frame gap = distance from ball center to nearest path edge − BALL_R. Mapped to levels 0–3 via `PROX_T` thresholds with hysteresis band. Emits `onProximityChange` only on level change
- **Difficulty parameters**: halfWidth=80/55/35 px, drag=2.5/2.0/1.5, roundMs=90k/75k/60k
- **Public API**: `setTilt(playerNum, gamma, beta)`, `getStats()`, `setPaused(v)`, `createPhaserGame(containerId, initData)`

### Data Persistence
**`data/results_YYYYMMDD.csv`** — appended after every round:
```
session_id, round, difficulty_level, round_duration_ms,
player_id, player_name, modality,
checkpoints_passed, falls, score,
time_at_level_1_ms, time_at_level_2_ms, time_at_level_3_ms,
os, os_version, device_model, screen_res, pixel_ratio, browser, session_timestamp
```

**`data/players.json`** — updated after every round. Schema per `playerId`:
```json
{
  "playCount": 3,
  "modalitiesExperienced": ["haptic", "audio"],
  "devices": ["iOS iPhone 14 390x844"]
}
```

**`data/survey_responses.jsonl`** — one JSON object per line, written when player submits post-round survey. Exported via `/export-survey`.

---

## Key Constraints & Gotchas

1. **Hard-refresh the display after server restart.** The browser caches `game.js` aggressively. Always `Cmd+Shift+R` on `https://localhost:3000` after changing game code.
2. **HTTPS mandatory** for gyroscope. Use `?debug=true` on controller URL to test tilt without HTTPS.
3. **Haptic Android-only.** `canVibrate` sent by controller based on `navigator.vibrate` availability.
4. **No join during active round.** Controllers get `CONTROLLER_REJECTED` and disconnect. They reconnect after round ends.
5. **Gyro throttle**: server-side rate-limit 16ms per controller socket; controller uses `requestAnimationFrame` with 16ms guard.
6. **Double-tap recalibration**: players can double-tap the controller screen to zero the current tilt as neutral (calibrateGamma/calibrateBeta offsets).

---

## Known Bug — Immediate Round End

**Symptom**: Game starts, display immediately shows "Round Complete" without the Phaser game running.

**Root cause**: A JavaScript error in `MarbleScene.create()` prevents `this._roundStart` from being set. On the first `update()` call, `ROUND_MS - (time - undefined) = NaN`, `Math.max(0, NaN) = 0`, so `_endGame()` fires immediately.

**How to diagnose**: Open browser DevTools (F12) on the display page, check Console for red errors after clicking Start Game.

**Likely causes to check**:
- `Phaser.Display.Color.HexStringToColor(p.color)` failing on unexpected color format
- `Phaser.Math.Between(min, max)` called with invalid range (min > max) on small screens
- Any other exception in the `create()` method

**Mitigation already in place**: `this._roundStart` is initialized to `0` in `init()` and latched to `time` on the first `update()` frame, so a failed `create()` won't silently cause immediate game end — but the game will still not render correctly.

---

## Common Development Tasks

### Tune game feel
Key constants at the top of `game.js`: `BALL_ACCEL`, `DRAG_COEF`, `BALL_MAX_SPD`, `OBS_SPD_MIN/MAX`, `STUN_MS`, `ROUND_MS`.

### Add a New Modality
1. Add to `MODALITIES` array in `server.js`
2. Add socket event handler in `controller.js`
3. Add routing in `server.js` `routeFeedbackEvent()` and `routeProximity()`

### Adjust difficulty
- More/faster obstacles: increase `OBS_BASE` or `OBS_SPD_MAX` in `game.js`
- Larger proximity warning zone: increase `PROX_T` thresholds in `game.js`
- Shorter round: decrease `ROUND_MS`

---

## Troubleshooting

**Game immediately shows Round Complete** → Hard-refresh display page (`Cmd+Shift+R`). If persists, check browser console for JS errors in `create()`.

**Gyroscope not working on phone** → Server console says "Falling back to HTTP" → certs missing. Use `?debug=true` to verify tilt is being read.

**Phone can't reach server** → Must be on same Wi-Fi. Use IP from server console, not `localhost`.

**Player history not persisting** → `data/players.json` written after round completes. Mid-game Ctrl+C loses that round's history.

**Players showing as "Player" (no name)** → Browser served cached controller.js. Hard-refresh the phone browser.
