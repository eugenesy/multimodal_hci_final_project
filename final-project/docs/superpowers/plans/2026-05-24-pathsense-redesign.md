# PathSense UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark neon aesthetic across all three PathSense interfaces (controller, admin, display) with a Swiss/Bauhaus design system — cream background, near-black type, Bauhaus Red accent — while adding a calibration screen to the controller and moving demographics from the post-round survey to the join screen.

**Architecture:** No new routes or socket events beyond `CALIBRATION_DONE`. CSS lives in a shared `public/css/bauhaus.css` plus per-page `<style>` blocks. Phaser visual changes are drawing-style only (colors, no logic changes). All existing socket event names stay the same.

**Tech Stack:** Node.js/Express + Socket.IO (server), Phaser 3 (game engine, `public/js/game.js`), vanilla JS (controller/admin/display). Google Fonts CDN (Syne, Barlow, Barlow Condensed).

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `public/css/bauhaus.css` | **Create** | Shared CSS custom properties and utility classes |
| `server.js` | **Modify** | Read demographics from controller query; add `handedness` to `playersList()`; route `CALIBRATION_DONE` to PC socket |
| `public/controller.html` | **Modify** | Full layout redesign: 7 screens (join+demo, permission, ready, calibration, playing, survey, thanks) |
| `public/js/controller.js` | **Modify** | Demographics at join, calibration screen logic, simplified survey, remove dead code |
| `public/admin.html` | **Modify** | Full layout redesign: Swiss/Bauhaus 3-column |
| `public/js/admin.js` | **Modify** | Show handedness in player card; remove score from results |
| `public/index.html` | **Modify** | Full layout redesign: waiting, 2-col active (canvas + sidebar), Swiss results |
| `public/js/display.js` | **Modify** | Handle `CALIBRATION_DONE`; update sidebar polling; redesign waiting/results render; start Phaser paused |
| `public/js/game.js` | **Modify** | Phaser visual changes: red corridor edges, cream ball, cream checkpoints; use container dimensions; restyle HUD text |

---

## Task 1: Shared CSS (`public/css/bauhaus.css`)

**Files:**
- Create: `public/css/bauhaus.css`

- [ ] **Step 1: Create the shared CSS file**

```css
/* PathSense — Bauhaus Design System */
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@600;700&display=swap');

:root {
  --cream:  #f5f2ed;
  --black:  #1a1a1a;
  --red:    #c0392b;
  --rule:   #d0ccc6;
  --gray:   #888888;
  --dark:   #111111;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.bh-wordmark {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.bh-eyebrow {
  font-family: 'Barlow', sans-serif;
  font-size: 7px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--red);
}
.bh-rule        { height: 1.5px; background: var(--black); }
.bh-thin-rule   { height: 1px;   background: var(--rule); }
.bh-red-stripe  { height: 3px;   background: var(--red); }
.bh-topbar {
  background: var(--black);
  padding: 9px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.bh-badge {
  font-family: 'Syne', sans-serif;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 3px 10px;
  color: #fff;
}
.bh-badge-lobby { background: var(--rule);  color: var(--black); }
.bh-badge-game  { background: var(--red); }
.bh-btn-primary {
  display: block;
  width: 100%;
  background: var(--black);
  color: var(--cream);
  font-family: 'Syne', sans-serif;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  padding: 11px;
  text-align: center;
  border: none;
  cursor: pointer;
}
.bh-btn-secondary {
  display: block;
  width: 100%;
  background: transparent;
  color: var(--gray);
  font-family: 'Syne', sans-serif;
  font-size: 7.5px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 9px;
  text-align: center;
  border: 1px solid var(--rule);
  cursor: pointer;
}
.bh-chip {
  border: 1px solid var(--rule);
  padding: 4px 9px;
  font-family: 'Barlow', sans-serif;
  font-size: 8px;
  color: var(--gray);
  cursor: pointer;
  background: transparent;
  user-select: none;
}
.bh-chip.sel {
  border-color: var(--black);
  background: var(--black);
  color: var(--cream);
}
.bh-input {
  width: 100%;
  border: 1.5px solid var(--black);
  background: transparent;
  padding: 8px 10px;
  font-family: 'Barlow', sans-serif;
  font-size: 10px;
  color: var(--black);
  outline: none;
}
.bh-input::placeholder { color: var(--rule); }
.bh-field-label {
  font-family: 'Barlow', sans-serif;
  font-size: 7px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--black);
  display: block;
  margin-bottom: 4px;
  margin-top: 10px;
}
.bh-chip-row { display: flex; flex-wrap: wrap; gap: 4px; }
```

- [ ] **Step 2: Verify the file exists**

```bash
ls -la /Users/syeugene/Documents/body-schema-hack/public/css/bauhaus.css
```
Expected: file listed with non-zero size.

- [ ] **Step 3: Commit**

```bash
git add public/css/bauhaus.css
git commit -m "feat: add Bauhaus design system CSS tokens"
```

---

## Task 2: Server — Demographics + Calibration Routing (`server.js`)

**Files:**
- Modify: `server.js:102-117` (`playersList`), `server.js:343-366` (`handleControllerConnection` state setup), `server.js:369-376` (socket listeners)

**Changes needed:**
1. `playersList()` must include `handedness` so admin can display it
2. `handleControllerConnection()` must read and store `handedness`, `gaming_experience`, `tilt_experience`, `age`, `gender` from query params
3. Add `CALIBRATION_DONE` listener on controller socket that relays to `pcSocket`

- [ ] **Step 1: Update `playersList()` to include `handedness`**

In `server.js`, find the `playersList()` function (around line 102). Change:
```js
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
```
To:
```js
function playersList() {
  return [...players.values()].map(p => ({
    playerNum:   p.playerNum,
    playerName:  p.playerName,
    color:       p.color,
    modality:    p.modality,
    playCount:   p.playCount,
    playerId:    p.playerId,
    handedness:  p.handedness || '',
  }));
}
```

- [ ] **Step 2: Store demographics on the player state object**

In `handleControllerConnection`, find where the `state` object is constructed (around line 343). After the `canVibrate` line and before `const state = {`, add:
```js
const handedness        = q.handedness        || '';
const gaming_experience = q.gaming_experience || '';
const tilt_experience   = q.tilt_experience   || '';
const age               = q.age               || '';
const gender            = q.gender            || '';
```

Then add `handedness` to the `state` object:
```js
const state = {
  socket,
  socketId:         socket.id,
  playerNum,
  playerId,
  playerName,
  canVibrate,
  modality,
  color,
  playCount:        history.playCount,
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
```

- [ ] **Step 3: Add `CALIBRATION_DONE` listener in `handleControllerConnection`**

After the existing `socket.on('PING', ...)` listener (around line 376), add:
```js
socket.on('CALIBRATION_DONE', () => {
  if (pcSocket) pcSocket.emit('CALIBRATION_DONE', {});
  console.log(`[Controller] P${playerNum} calibration done`);
});
```

- [ ] **Step 4: Restart server and verify no syntax errors**

```bash
node server.js
```
Expected: Server starts, prints the URL table, no SyntaxError.
Kill with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "feat: read demographics at controller join; route CALIBRATION_DONE to display"
```

---

## Task 3: Controller HTML (`public/controller.html`)

**Files:**
- Modify: `public/controller.html`

Replace the entire file. The new HTML has 7 named screen divs. JavaScript in `controller.js` shows/hides them via a `_setState()` function. All inline styles from the old file are replaced with Bauhaus classes.

- [ ] **Step 1: Replace `public/controller.html` entirely**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>PathSense — Controller</title>
  <link rel="stylesheet" href="/css/bauhaus.css" />
  <style>
    html, body { height: 100%; background: var(--cream); color: var(--black); overflow: hidden; }
    body { font-family: 'Barlow', sans-serif; }

    /* ── Screen shell ── */
    .screen {
      display: none;
      position: fixed; inset: 0;
      flex-direction: column;
      background: var(--cream);
      overflow-y: auto;
    }
    .screen.active { display: flex; }

    /* ── Top bar (shared) ── */
    .ctrl-topbar {
      background: var(--black);
      padding: 9px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    .ctrl-wordmark {
      font-family: 'Syne', sans-serif;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.16em;
      color: var(--cream);
    }
    .ctrl-session {
      font-family: 'Barlow', sans-serif;
      font-size: 7.5px;
      font-weight: 300;
      color: var(--red);
      letter-spacing: 0.08em;
    }
    .ctrl-body { padding: 16px 14px 24px; flex: 1; }
    .ctrl-headline {
      font-family: 'Syne', sans-serif;
      font-weight: 800;
      color: var(--black);
      line-height: 1.0;
      font-size: 28px;
      margin: 6px 0 12px;
    }
    .ctrl-sub {
      font-family: 'Barlow', sans-serif;
      font-size: 9px;
      font-weight: 300;
      color: #666;
      line-height: 1.6;
    }
    .ctrl-badge {
      display: inline-block;
      background: var(--red);
      color: #fff;
      font-family: 'Syne', sans-serif;
      font-size: 7px;
      font-weight: 700;
      letter-spacing: 0.18em;
      padding: 3px 8px;
    }

    /* ── Stat grid (playing screen) ── */
    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 12px; }
    .stat-box { background: var(--black); padding: 8px 9px; }
    .stat-val { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; color: var(--cream); line-height: 1; }
    .stat-key { font-family: 'Barlow', sans-serif; font-size: 6.5px; color: #888; letter-spacing: 0.12em; text-transform: uppercase; margin-top: 3px; }

    /* ── Calibration center ── */
    .calib-center {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 32px 20px;
    }
    .calib-icon {
      width: 64px; height: 64px;
      border: 2.5px solid var(--black);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 16px;
    }
    .calib-icon svg { width: 32px; height: 32px; }

    /* ── Survey ── */
    .survey-textarea {
      width: 100%;
      min-height: 100px;
      border: 1.5px solid var(--rule);
      background: #fff;
      padding: 10px;
      font-family: 'Barlow', sans-serif;
      font-size: 9px;
      line-height: 1.6;
      color: var(--black);
      resize: none;
      outline: none;
      margin-bottom: 10px;
    }
    .survey-textarea:focus { border-color: var(--black); }
    .survey-textarea::placeholder { color: var(--rule); }

    /* ── Thanks ── */
    .thanks-center {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 40px 20px;
    }

    /* ── Error ── */
    #error-msg {
      display: none;
      position: fixed; bottom: 20px; left: 50%;
      transform: translateX(-50%);
      background: var(--red);
      color: #fff;
      font-family: 'Barlow', sans-serif;
      font-size: 10px;
      padding: 8px 16px;
      z-index: 999;
    }

    /* ── Debug panel ── */
    #debug-panel {
      display: none;
      position: fixed; bottom: 12px; left: 50%;
      transform: translateX(-50%);
      background: rgba(26,26,26,0.88);
      padding: 6px 14px;
      font-family: 'Barlow', sans-serif;
      font-size: 10px;
      color: var(--cream);
      z-index: 999;
    }
  </style>
</head>
<body>

  <!-- ══ SCREEN: JOIN + DEMOGRAPHICS ══════════════════════════════════════════ -->
  <div id="screen-join" class="screen active">
    <div class="ctrl-topbar">
      <span class="ctrl-wordmark">PATHSENSE</span>
      <span class="ctrl-session">STUDY</span>
    </div>
    <div class="bh-red-stripe"></div>
    <div class="ctrl-body">
      <div class="bh-eyebrow">Participant Setup</div>
      <div class="ctrl-headline">Join<br>Session</div>
      <div class="bh-rule" style="margin-bottom:14px"></div>

      <label class="bh-field-label" for="join-name">Your Name</label>
      <input id="join-name" class="bh-input" type="text" maxlength="20"
        placeholder="Enter name…" autocomplete="off" autocorrect="off"
        autocapitalize="words" spellcheck="false" />

      <label class="bh-field-label">Handedness</label>
      <div class="bh-chip-row" id="chips-hand">
        <div class="bh-chip" data-val="Right">Right</div>
        <div class="bh-chip" data-val="Left">Left</div>
        <div class="bh-chip" data-val="Either">Either</div>
      </div>

      <label class="bh-field-label">Gaming experience</label>
      <div class="bh-chip-row" id="chips-gaming">
        <div class="bh-chip" data-val="None">None</div>
        <div class="bh-chip" data-val="Casual">Casual</div>
        <div class="bh-chip" data-val="Regular">Regular</div>
        <div class="bh-chip" data-val="Frequent">Frequent</div>
      </div>

      <label class="bh-field-label">Tilt game experience?</label>
      <div class="bh-chip-row" id="chips-tilt">
        <div class="bh-chip" data-val="Yes">Yes</div>
        <div class="bh-chip" data-val="No">No</div>
      </div>

      <label class="bh-field-label" for="join-age">Age</label>
      <input id="join-age" class="bh-input" type="number" min="10" max="99"
        placeholder="—" style="width:80px" />

      <label class="bh-field-label">Gender</label>
      <div class="bh-chip-row" id="chips-gender">
        <div class="bh-chip" data-val="Man">Man</div>
        <div class="bh-chip" data-val="Woman">Woman</div>
        <div class="bh-chip" data-val="Non-binary">Non-binary</div>
        <div class="bh-chip" data-val="Prefer not to say">Prefer not to say</div>
      </div>

      <button id="join-btn" class="bh-btn-primary" style="margin-top:16px">
        JOIN SESSION →
      </button>
      <div style="margin-top:8px;font-family:'Barlow',sans-serif;font-size:7px;
                  color:var(--gray);letter-spacing:0.08em;text-align:center">
        UBC HCI Lab · Data used for research only
      </div>
    </div>
  </div>

  <!-- ══ SCREEN: PERMISSION (iOS gyro) ════════════════════════════════════════ -->
  <div id="screen-permission" class="screen">
    <div class="ctrl-topbar">
      <span class="ctrl-wordmark">PATHSENSE</span>
    </div>
    <div class="bh-red-stripe"></div>
    <div class="calib-center">
      <div class="bh-eyebrow" style="margin-bottom:10px">Motion Access</div>
      <div class="ctrl-headline" style="font-size:22px;text-align:center">Allow Tilt<br>Sensor</div>
      <div class="bh-rule" style="width:40px;margin:12px auto"></div>
      <div class="ctrl-sub" style="max-width:240px;margin-bottom:20px">
        This controller needs your device's tilt sensor to detect phone orientation.
      </div>
      <button id="permission-btn" class="bh-btn-primary" style="max-width:200px">
        ALLOW ACCESS →
      </button>
    </div>
  </div>

  <!-- ══ SCREEN: READY ═════════════════════════════════════════════════════════ -->
  <div id="screen-ready" class="screen">
    <div class="ctrl-topbar">
      <span class="ctrl-wordmark">PATHSENSE</span>
      <span class="ctrl-session" id="ready-session-tag">P1 · HAPTIC</span>
    </div>
    <div class="bh-red-stripe"></div>
    <div class="ctrl-body">
      <div class="bh-eyebrow">Waiting to start</div>
      <div class="ctrl-headline" id="ready-headline">Player 1<br>Ready</div>
      <div class="bh-rule" style="margin-bottom:12px"></div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span class="ctrl-badge" id="ready-badge">HAPTIC</span>
        <span class="ctrl-sub">Session feedback mode</span>
      </div>
      <div class="ctrl-sub" id="ready-modality-desc" style="margin-bottom:12px">
        Your phone will vibrate — pulses grow stronger as the ball nears the path edge.
      </div>
      <div class="bh-thin-rule" style="margin:10px 0"></div>
      <div style="font-family:'Barlow',sans-serif;font-size:9px;font-weight:600;
                  color:var(--black);margin-bottom:4px">
        Use your non-dominant hand only.
      </div>
      <div class="ctrl-sub" style="margin-bottom:12px">
        Hold and tilt this phone with your weaker hand. Dominant hand rests at your side.
      </div>
      <div class="bh-thin-rule" style="margin:10px 0"></div>
      <div class="ctrl-sub" style="color:#bbb">Waiting for researcher to start…</div>
    </div>
  </div>

  <!-- ══ SCREEN: CALIBRATION ═══════════════════════════════════════════════════ -->
  <div id="screen-calibration" class="screen">
    <div class="ctrl-topbar">
      <span class="ctrl-wordmark">PATHSENSE</span>
      <span class="ctrl-session" id="calib-session-tag">P1</span>
    </div>
    <div class="bh-red-stripe"></div>
    <div class="calib-center">
      <div class="calib-icon">
        <!-- Phone-flat icon (simplified) -->
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="11" width="20" height="13" rx="2" stroke="#1a1a1a" stroke-width="1.8"/>
          <line x1="6" y1="17" x2="26" y2="17" stroke="#1a1a1a" stroke-width="1"/>
          <circle cx="16" cy="21" r="1.5" fill="#1a1a1a"/>
        </svg>
      </div>
      <div class="bh-eyebrow" style="margin-bottom:8px">Calibrate</div>
      <div class="ctrl-headline" style="font-size:24px;text-align:center">Hold Phone<br>Flat</div>
      <div class="bh-rule" style="width:40px;margin:12px auto"></div>
      <div class="ctrl-sub" style="max-width:250px;margin-bottom:24px">
        Rest the phone on a flat surface or hold it level. This sets your neutral tilt.
      </div>
      <button id="calibrate-btn" class="bh-btn-primary" style="max-width:200px">
        CALIBRATE →
      </button>
    </div>
  </div>

  <!-- ══ SCREEN: PLAYING ════════════════════════════════════════════════════════ -->
  <div id="screen-playing" class="screen">
    <div class="ctrl-topbar">
      <span class="ctrl-wordmark">PATHSENSE</span>
      <span class="ctrl-session" id="playing-session-tag">P1 · HAPTIC</span>
    </div>
    <div class="bh-red-stripe"></div>
    <div class="ctrl-body">
      <div class="bh-eyebrow">Now Playing</div>
      <div class="ctrl-headline" id="playing-headline">LEVEL<br>ONE</div>
      <div class="bh-rule" style="margin-bottom:12px"></div>
      <div class="ctrl-sub" style="margin-bottom:12px">
        Tilt with your non-dominant hand only.
      </div>
      <span class="ctrl-badge" id="playing-badge">HAPTIC</span>
      <div class="ctrl-sub" style="margin-top:16px;color:#bbb;font-size:7.5px">
        Double-tap screen to recalibrate tilt
      </div>
    </div>
  </div>

  <!-- ══ SCREEN: SURVEY ════════════════════════════════════════════════════════ -->
  <div id="screen-survey" class="screen">
    <div class="ctrl-topbar">
      <span class="ctrl-wordmark">PATHSENSE</span>
      <span class="ctrl-session">FEEDBACK</span>
    </div>
    <div class="bh-red-stripe"></div>
    <div class="ctrl-body">
      <div class="bh-eyebrow">Session Complete</div>
      <div class="ctrl-headline" style="font-size:22px">Your<br>Feedback</div>
      <div class="bh-rule" style="margin-bottom:12px"></div>
      <div class="ctrl-sub" style="margin-bottom:12px">
        How did the task feel? Any comments on the feedback or difficulty?
      </div>
      <textarea id="survey-textarea" class="survey-textarea"
        placeholder="Write anything…"></textarea>
      <button id="survey-submit" class="bh-btn-primary">SUBMIT →</button>
      <button id="survey-skip" class="bh-btn-secondary" style="margin-top:6px">SKIP</button>
    </div>
  </div>

  <!-- ══ SCREEN: THANKS ════════════════════════════════════════════════════════ -->
  <div id="screen-thanks" class="screen">
    <div class="ctrl-topbar">
      <span class="ctrl-wordmark">PATHSENSE</span>
    </div>
    <div class="bh-red-stripe"></div>
    <div class="thanks-center">
      <div style="width:48px;height:48px;background:var(--red);
                  display:flex;align-items:center;justify-content:center;margin-bottom:14px">
        <span style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#fff">✓</span>
      </div>
      <div class="ctrl-headline" style="font-size:24px;text-align:center">Thanks!</div>
      <div class="ctrl-sub" style="margin-top:8px;text-align:center">Session data saved.</div>
    </div>
  </div>

  <!-- ══ SHARED ══ -->
  <div id="error-msg"></div>
  <div id="debug-panel">
    γ: <span id="debug-gamma">0.0°</span> &nbsp; β: <span id="debug-beta">0.0°</span>
    <span id="debug-state" style="margin-left:8px;color:#888">idle</span>
  </div>

  <script src="/socket.io/socket.io.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gyronorm@2.0.6/dist/gyronorm.complete.min.js"></script>
  <script src="/js/controller.js"></script>
</body>
</html>
```

- [ ] **Step 2: Open `https://localhost:3000/controller` (or use `?debug=true` on a phone simulator)**

Verify the join screen renders with cream background, Syne headline, chip selectors, and JOIN SESSION → button. No dark background should be visible.

- [ ] **Step 3: Commit**

```bash
git add public/controller.html
git commit -m "feat: controller HTML — Bauhaus layout with 7 screens"
```

---

## Task 4: Controller JS (`public/js/controller.js`)

**Files:**
- Modify: `public/js/controller.js`

Key changes:
- `_setState(name)` shows/hides the 7 screens
- `connectWithName()` reads demographics from the join form and includes them in socket query
- `GAME_START` handler shows calibration screen instead of immediately going to playing
- Calibrate button zeros offsets, emits `CALIBRATION_DONE`, transitions to playing
- `ROUND_COMPLETE` (or survey trigger) shows survey screen (free text only)
- Module-level `_demographics` object holds the join-time data for inclusion in survey payload
- Remove: tilt bubble, tilt rationale, demographics from survey, old flash code (already removed)

- [ ] **Step 1: Read the current controller.js to understand exact line numbers**

Open `public/js/controller.js` and identify:
- The `connectWithName()` function
- The `GAME_START` socket handler
- The `ROUND_COMPLETE` / survey display logic
- The `survey-submit` click handler
- The calibration (`calibrateGamma`, `calibrateBeta`) logic

- [ ] **Step 2: Replace `public/js/controller.js` entirely**

```js
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

const LEVEL_NAMES = { 1: 'LEVEL\nONE', 2: 'LEVEL\nTWO', 3: 'LEVEL\nTHREE' };
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

    const sessionTag  = `P${playerNum} · ${modality.toUpperCase()}`;
    const badgeText   = modality.toUpperCase();
    const monoDesc    = MODALITY_DESC[modality] || '';

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
    const names = ['LEVEL\nONE', 'LEVEL\nTWO', 'LEVEL\nTHREE'];
    const ph = document.getElementById('playing-headline');
    if (ph) ph.innerHTML = names[lvl - 1].replace('\n', '<br>');
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

  let lastSent = 0;
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
  let lastSent = 0;
  window.addEventListener('deviceorientation', e => {
    const now = Date.now();
    if (now - lastSent < 16) return;
    lastSent = now;
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
let _lastTap = 0;
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
    response:    text,
    playerNum:   _playerNum,
    modality:    _modality,
    timestamp:   new Date().toISOString(),
    play_count:  _playCount,
    demographics: _demographics,
  });
  _setState('thanks');
});

document.getElementById('survey-skip')?.addEventListener('click', () => {
  socket?.emit('SURVEY_RESPONSE', {
    response:    '',
    playerNum:   _playerNum,
    modality:    _modality,
    timestamp:   new Date().toISOString(),
    play_count:  _playCount,
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
```

- [ ] **Step 3: Verify join → ready flow**

1. `node server.js`
2. Open `https://localhost:3000/controller` on a phone or browser
3. Fill in name + chip selections → tap JOIN SESSION →
4. Screen should transition to READY screen showing P1 and modality

- [ ] **Step 4: Verify calibration → playing flow**

1. In admin panel, click ▶ Level 1
2. Controller should show CALIBRATION screen
3. Tap CALIBRATE → → controller shows PLAYING screen
4. In server terminal: `[Controller] P1 calibration done` should print

- [ ] **Step 5: Verify survey**

After game ends, controller shows SURVEY screen (free text only, no demographics section).
Submit → THANKS screen.
Check `data/survey_responses.jsonl` for a line with `demographics` key populated.

- [ ] **Step 6: Commit**

```bash
git add public/js/controller.js
git commit -m "feat: controller JS — demographics at join, calibration screen, simplified survey"
```

---

## Task 5: Admin Panel (`public/admin.html` + `public/js/admin.js`)

**Files:**
- Modify: `public/admin.html`
- Modify: `public/js/admin.js`

### 5a — `admin.html`

- [ ] **Step 1: Replace `public/admin.html` entirely**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PathSense — Admin</title>
  <link rel="stylesheet" href="/css/bauhaus.css" />
  <style>
    html, body { height: 100%; background: var(--cream); color: var(--black); overflow: hidden; }
    body { font-family: 'Barlow', sans-serif; display: flex; flex-direction: column; }

    /* ── Top bar ── */
    #topbar {
      background: var(--black);
      padding: 11px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    #topbar-wordmark {
      font-family: 'Syne', sans-serif;
      font-size: 13px;
      font-weight: 800;
      color: var(--cream);
      letter-spacing: 0.16em;
    }
    #topbar-wordmark span {
      font-family: 'Barlow', sans-serif;
      font-size: 9px;
      font-weight: 300;
      color: var(--gray);
      letter-spacing: 0.1em;
      margin-left: 10px;
    }
    #topbar-right { display: flex; align-items: center; gap: 12px; }
    #round-label {
      font-family: 'Barlow', sans-serif;
      font-size: 8px;
      font-weight: 300;
      color: var(--gray);
      letter-spacing: 0.1em;
    }
    #phase-badge {
      font-family: 'Syne', sans-serif;
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      padding: 3px 10px;
      color: var(--black);
      background: var(--rule);
    }
    #phase-badge.game { background: var(--red); color: #fff; }

    /* ── Red stripe ── */
    .bh-red-stripe { height: 3px; background: var(--red); flex-shrink: 0; }

    /* ── 3-column body ── */
    #main {
      flex: 1;
      display: grid;
      grid-template-columns: 210px 1fr 1fr;
      overflow: hidden;
    }
    .admin-col {
      padding: 14px 16px;
      border-right: 1px solid var(--rule);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .admin-col:last-child { border-right: none; }
    .col-title {
      font-family: 'Barlow', sans-serif;
      font-size: 7px;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--red);
      margin-bottom: 2px;
    }

    /* ── Participant card ── */
    .player-card {
      border-left: 3px solid var(--red);
      padding: 8px 10px;
      background: #ede9e2;
    }
    .player-name {
      font-family: 'Syne', sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: var(--black);
    }
    .player-meta {
      font-family: 'Barlow', sans-serif;
      font-size: 7.5px;
      font-weight: 300;
      color: var(--gray);
      margin-top: 2px;
    }
    .player-empty {
      font-family: 'Barlow', sans-serif;
      font-size: 9px;
      color: #bbb;
      letter-spacing: 0.08em;
    }

    /* ── QR ── */
    #qr-single {
      width: 90px; height: 90px;
      image-rendering: pixelated;
      background: #eee;
      display: block;
    }
    #url-single {
      font-family: 'Barlow', sans-serif;
      font-size: 7px;
      color: var(--gray);
      word-break: break-all;
      margin-top: 4px;
    }

    /* ── Level buttons ── */
    .level-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      border: 1.5px solid var(--black);
      padding: 8px 10px;
      cursor: pointer;
      background: transparent;
      width: 100%;
      text-align: left;
      transition: background 0.1s;
    }
    .level-btn:hover:not(:disabled) { background: #ede9e2; }
    .level-btn:disabled { border-color: var(--rule); cursor: not-allowed; }
    .level-btn.done { border-color: var(--rule); }
    .lvl-num {
      font-family: 'Syne', sans-serif;
      font-size: 20px;
      font-weight: 800;
      color: var(--black);
      line-height: 1;
      min-width: 22px;
    }
    .level-btn.done .lvl-num { color: var(--rule); }
    .lvl-title {
      font-family: 'Syne', sans-serif;
      font-size: 9.5px;
      font-weight: 700;
      color: var(--black);
    }
    .lvl-desc {
      font-family: 'Barlow', sans-serif;
      font-size: 7.5px;
      font-weight: 300;
      color: var(--gray);
      margin-top: 1px;
    }
    .level-btn.done .lvl-title,
    .level-btn.done .lvl-desc { color: var(--rule); }

    #lobby-btn {
      border: 1px solid var(--rule);
      padding: 7px 10px;
      background: transparent;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
    }
    #lobby-btn-label {
      font-family: 'Barlow', sans-serif;
      font-size: 8px;
      color: var(--gray);
    }
    #lobby-btn-action {
      font-family: 'Syne', sans-serif;
      font-size: 8px;
      font-weight: 700;
      color: var(--red);
      letter-spacing: 0.1em;
    }

    /* ── Results ── */
    .result-round-label {
      font-family: 'Barlow', sans-serif;
      font-size: 7px;
      color: var(--gray);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .result-entry {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 7px 0;
      border-bottom: 1px solid var(--rule);
    }
    .result-entry:last-child { border-bottom: none; }
    .re-name {
      font-family: 'Syne', sans-serif;
      font-size: 11px;
      font-weight: 700;
      color: var(--black);
    }
    .re-meta {
      font-family: 'Barlow', sans-serif;
      font-size: 7.5px;
      color: var(--gray);
    }
    .re-falls {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 14px;
      font-weight: 600;
      color: var(--red);
    }
    .re-checks {
      font-family: 'Barlow', sans-serif;
      font-size: 8px;
      color: var(--gray);
    }
    .results-empty {
      font-family: 'Barlow', sans-serif;
      font-size: 9px;
      color: #bbb;
      letter-spacing: 0.08em;
    }

    /* ── Export ── */
    .export-btn {
      border: 1.5px solid var(--black);
      padding: 7px;
      text-align: center;
      cursor: pointer;
      text-decoration: none;
      display: block;
      font-family: 'Syne', sans-serif;
      font-size: 8px;
      font-weight: 700;
      color: var(--black);
      letter-spacing: 0.1em;
    }
    .export-btn:hover { background: #ede9e2; }

    /* ── Toast ── */
    #notification {
      display: none; position: fixed; bottom: 20px; left: 50%;
      transform: translateX(-50%); background: var(--black);
      color: var(--cream); border: 1px solid var(--red);
      padding: 8px 18px; font-family: 'Barlow', sans-serif;
      font-size: 11px; z-index: 500; pointer-events: none;
    }
  </style>
</head>
<body>

  <div id="topbar">
    <div id="topbar-wordmark">PATHSENSE <span>RESEARCHER PANEL</span></div>
    <div id="topbar-right">
      <div id="round-label">Round 0</div>
      <div id="phase-badge">LOBBY</div>
    </div>
  </div>
  <div class="bh-red-stripe"></div>

  <div id="main">

    <!-- Col 1: Participant + QR -->
    <div class="admin-col">
      <div class="col-title">Participant</div>
      <div id="player-list"><div class="player-empty">No player connected yet</div></div>

      <div class="bh-thin-rule"></div>

      <div class="col-title">Controller QR</div>
      <img id="qr-single" src="" alt="QR" />
      <div id="url-single"></div>
    </div>

    <!-- Col 2: Levels -->
    <div class="admin-col">
      <div class="col-title">Levels</div>
      <div id="level-btns" style="display:flex;flex-direction:column;gap:6px;"></div>
      <div id="lobby-btn" onclick="adminBackToLobby()" style="display:none">
        <div id="lobby-btn-label">Session reset</div>
        <div id="lobby-btn-action">→ LOBBY</div>
      </div>
    </div>

    <!-- Col 3: Results + Export -->
    <div class="admin-col">
      <div class="col-title">Results</div>
      <div id="results-panel">
        <div class="results-empty">Results appear here after each round</div>
      </div>
      <div style="display:flex;gap:5px;margin-top:auto;padding-top:10px">
        <a href="/export-csv"    download class="export-btn" style="flex:1">↓ CSV</a>
        <a href="/export-survey" download class="export-btn" style="flex:1">↓ SURVEY</a>
      </div>
    </div>

  </div>

  <div id="notification"></div>

  <script src="/socket.io/socket.io.js"></script>
  <script src="/js/admin.js"></script>
</body>
</html>
```

### 5b — `admin.js`

- [ ] **Step 2: Update `_setPhase()` in `public/js/admin.js`**

Find and replace the `_setPhase` function:
```js
function _setPhase(phase) {
  currentPhase = phase;

  const badge    = document.getElementById('phase-badge');
  const lobbyBtn = document.getElementById('lobby-btn');
  const roundLbl = document.getElementById('round-label');

  if (badge) {
    badge.textContent = phase === 'GAME' ? `GAME — L${currentLevel}` : 'LOBBY';
    badge.className   = phase === 'GAME' ? 'game' : '';
  }
  if (roundLbl) roundLbl.textContent = `Round ${currentRound}`;
  if (lobbyBtn) lobbyBtn.style.display = phase === 'GAME' ? 'flex' : 'none';

  _renderLevelButtons();
}
```

- [ ] **Step 3: Update `_renderLevelButtons()` in `public/js/admin.js`**

Replace the `_renderLevelButtons` function:
```js
const LEVEL_META = {
  1: { title: 'Introductory', desc: 'S-curve · 90 s · ±80 px' },
  2: { title: 'Moderate',     desc: 'N-shape · 75 s · ±55 px' },
  3: { title: 'Hard',         desc: 'Zigzag · 60 s · ±35 px' },
};

function _renderLevelButtons() {
  const container = document.getElementById('level-btns');
  if (!container) return;
  container.innerHTML = '';
  [1, 2, 3].forEach(lvl => {
    const done = completedLevels.has(lvl);
    const meta = LEVEL_META[lvl];
    const btn  = document.createElement('button');
    btn.className = `level-btn${done ? ' done' : ''}`;
    btn.disabled  = currentPhase !== 'LOBBY' || players.length < 1;
    btn.innerHTML = `
      <div class="lvl-num">${done ? '✓' : lvl}</div>
      <div>
        <div class="lvl-title">${meta.title}</div>
        <div class="lvl-desc">${meta.desc}</div>
      </div>`;
    btn.addEventListener('click', () => adminStartLevel(lvl));
    container.appendChild(btn);
  });
}
```

- [ ] **Step 4: Update `_renderPlayers()` in `public/js/admin.js` to show handedness**

Replace the `_renderPlayers` function:
```js
function _renderPlayers() {
  const list  = document.getElementById('player-list');
  const count = document.getElementById('player-count');
  if (!list) return;

  if (!players.length) {
    list.innerHTML = '<div class="player-empty">No player connected yet</div>';
    _setPhase(currentPhase);
    return;
  }

  const ml = { haptic: '📳 Haptic', audio: '🔊 Audio', none: '— None' };
  list.innerHTML = '';
  for (const p of players) {
    const card = document.createElement('div');
    card.className = 'player-card';
    const handStr = p.handedness ? ` · ${p.handedness}-handed` : '';
    card.innerHTML = `
      <div class="player-name">${_esc(p.playerName)}</div>
      <div class="player-meta">${ml[p.modality] || p.modality} · Session ${(p.playCount || 0) + 1}${handStr}</div>`;
    list.appendChild(card);
  }

  _setPhase(currentPhase);
}
```

- [ ] **Step 5: Update `_renderResults()` in `public/js/admin.js` to remove score**

Replace the `_renderResults` function:
```js
function _renderResults() {
  const panel = document.getElementById('results-panel');
  if (!panel) return;

  if (!allResults.length) {
    panel.innerHTML = '<div class="results-empty">Results appear here after each round</div>';
    return;
  }

  const ml = { haptic: '📳', audio: '🔊', none: '—' };
  panel.innerHTML = '';

  for (const { round, level, rankings } of [...allResults].reverse()) {
    const section = document.createElement('div');
    section.style.marginBottom = '14px';

    const lbl = document.createElement('div');
    lbl.className   = 'result-round-label';
    lbl.textContent = `Round ${round} — Level ${level}`;
    section.appendChild(lbl);

    for (const entry of rankings) {
      const p    = players.find(pl => pl.playerNum === entry.playerNum);
      const name = _esc(p?.playerName || `P${entry.playerNum}`);

      const row = document.createElement('div');
      row.className = 'result-entry';
      row.innerHTML = `
        <div>
          <div class="re-name">${name}</div>
          <div class="re-meta">${ml[p?.modality] || '—'} · ${entry.checkpoints ?? entry.checkpoints_passed ?? 0} checkpoints</div>
        </div>
        <div style="text-align:right">
          <div class="re-falls">${entry.falls ?? 0} falls</div>
        </div>`;
      section.appendChild(row);
    }

    panel.appendChild(section);
  }
}
```

- [ ] **Step 6: Verify admin panel visually**

1. `node server.js`
2. Open `https://localhost:3000/admin`
3. Confirm: cream background, black top bar, red stripe, 3-column layout, LOBBY badge visible, QR image loads in col 1, level buttons in col 2

- [ ] **Step 7: Commit**

```bash
git add public/admin.html public/js/admin.js
git commit -m "feat: admin panel — Bauhaus redesign, handedness in player card, no score"
```

---

## Task 6: Game Display HTML + JS (`public/index.html` + `public/js/display.js`)

**Files:**
- Modify: `public/index.html`
- Modify: `public/js/display.js`

### 6a — `index.html`

The new layout has three views plus a 2-column active-game layout (Phaser canvas left, stats sidebar right).

- [ ] **Step 1: Replace `public/index.html` entirely**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PathSense — Display</title>
  <link rel="stylesheet" href="/css/bauhaus.css" />
  <style>
    html, body { height: 100%; background: var(--cream); color: var(--black); overflow: hidden; }
    body { font-family: 'Barlow', sans-serif; display: flex; flex-direction: column; }

    /* ── Top bar ── */
    #display-topbar {
      background: var(--black);
      padding: 9px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    #display-wordmark {
      font-family: 'Syne', sans-serif;
      font-size: 14px;
      font-weight: 800;
      color: var(--cream);
      letter-spacing: 0.18em;
    }
    #display-topbar-right {
      display: flex;
      align-items: center;
      gap: 14px;
      font-family: 'Barlow', sans-serif;
      font-size: 9px;
      font-weight: 300;
      letter-spacing: 0.1em;
    }
    #display-status-tag { color: var(--red); }

    /* ── Views ── */
    .view { display: none; flex: 1; overflow: hidden; }
    .view.active { display: flex; }

    /* ── Waiting ── */
    #view-waiting {
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--cream);
      position: relative;
      overflow: hidden;
    }
    #waiting-grid {
      position: absolute; inset: 0; pointer-events: none;
    }
    #waiting-title {
      font-family: 'Syne', sans-serif;
      font-size: clamp(40px, 6vw, 80px);
      font-weight: 800;
      color: var(--black);
      letter-spacing: 0.04em;
      line-height: 1;
      position: relative; z-index: 1;
    }
    #waiting-red-rule {
      width: 48px; height: 3px; background: var(--red);
      margin: 12px 0; position: relative; z-index: 1;
    }
    #waiting-sub {
      font-family: 'Barlow', sans-serif;
      font-size: 10px; font-weight: 300;
      color: #bbb; letter-spacing: 0.12em;
      text-transform: uppercase;
      position: relative; z-index: 1;
      margin-bottom: 28px;
    }
    #waiting-player {
      position: relative; z-index: 1;
      display: flex; flex-direction: column;
      align-items: center; gap: 6px;
    }
    #waiting-dot {
      width: 56px; height: 56px; background: var(--red); border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
    }
    #waiting-dot-label {
      font-family: 'Syne', sans-serif;
      font-size: 11px; font-weight: 800; color: #fff; letter-spacing: 0.1em;
    }
    #waiting-player-name {
      font-family: 'Barlow', sans-serif;
      font-size: 12px; font-weight: 400; color: var(--black); letter-spacing: 0.06em;
    }
    #waiting-player-mod {
      font-family: 'Barlow', sans-serif;
      font-size: 9px; color: var(--gray); margin-top: -2px;
    }

    /* ── Level banner (shown above game during active round) ── */
    #level-banner {
      background: var(--red);
      padding: 5px 20px;
      display: none;
      align-items: center;
      gap: 14px;
      flex-shrink: 0;
    }
    #level-banner.active { display: flex; }
    .lb-txt {
      font-family: 'Syne', sans-serif;
      font-size: 9px; font-weight: 700;
      letter-spacing: 0.16em; color: #fff;
    }
    .lb-sep { width: 1px; height: 14px; background: rgba(255,255,255,0.3); }

    /* ── Active round layout ── */
    #view-game {
      flex-direction: row;
    }
    #phaser-wrap {
      flex: 1;
      background: var(--dark);
      position: relative;
      overflow: hidden;
    }
    #game-sidebar {
      width: 130px;
      background: var(--cream);
      border-left: 1.5px solid var(--rule);
      padding: 14px 12px;
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .gs-title {
      font-family: 'Barlow', sans-serif;
      font-size: 7px; font-weight: 600;
      letter-spacing: 0.2em; text-transform: uppercase;
      color: var(--red); margin-bottom: 10px;
    }
    .gs-stat {
      border-top: 1px solid var(--rule);
      padding: 10px 0;
    }
    .gs-val {
      font-family: 'Syne', sans-serif;
      font-size: 26px; font-weight: 800;
      color: var(--black); line-height: 1;
    }
    .gs-key {
      font-family: 'Barlow', sans-serif;
      font-size: 7px; color: var(--gray);
      letter-spacing: 0.1em; text-transform: uppercase;
      margin-top: 2px;
    }

    /* ── Round results ── */
    #view-results {
      background: var(--cream);
      display: grid;
      grid-template-columns: 1fr 1fr;
      align-items: center;
      padding: 40px 60px;
      gap: 48px;
    }
    #res-eyebrow {
      font-family: 'Barlow', sans-serif;
      font-size: 9px; font-weight: 600;
      letter-spacing: 0.22em; text-transform: uppercase;
      color: var(--red); margin-bottom: 8px;
    }
    #res-title {
      font-family: 'Syne', sans-serif;
      font-size: clamp(32px, 4vw, 56px);
      font-weight: 800; color: var(--black);
      line-height: 1; margin-bottom: 12px;
    }
    #res-rule { height: 1.5px; background: var(--black); width: 48px; margin-bottom: 14px; }
    #res-player {
      font-family: 'Syne', sans-serif;
      font-size: 18px; font-weight: 700;
      color: var(--red); margin-bottom: 4px;
    }
    #res-modality {
      font-family: 'Barlow', sans-serif;
      font-size: 10px; font-weight: 300; color: var(--gray);
    }
    #res-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      align-content: start;
    }
    .res-stat-box { border: 1.5px solid var(--rule); padding: 12px 14px; }
    .res-stat-val {
      font-family: 'Syne', sans-serif;
      font-size: 32px; font-weight: 800;
      color: var(--black); line-height: 1;
    }
    .res-stat-val.red { color: var(--red); }
    .res-stat-key {
      font-family: 'Barlow', sans-serif;
      font-size: 8px; color: var(--gray);
      letter-spacing: 0.1em; text-transform: uppercase; margin-top: 4px;
    }
    #res-next {
      grid-column: 1 / -1;
      background: var(--black);
      padding: 11px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #res-next-txt {
      font-family: 'Syne', sans-serif;
      font-size: 9px; font-weight: 700;
      letter-spacing: 0.12em; color: var(--cream);
    }
    #res-countdown {
      font-family: 'Barlow', sans-serif;
      font-size: 9px; font-weight: 300; color: var(--gray);
    }

    /* ── Toast ── */
    #notification {
      display: none; position: fixed; bottom: 24px; left: 50%;
      transform: translateX(-50%); background: var(--black);
      color: var(--cream); border: 1px solid var(--red);
      padding: 10px 22px; font-family: 'Barlow', sans-serif;
      font-size: 12px; letter-spacing: 0.06em;
      z-index: 500; pointer-events: none;
    }
  </style>
</head>
<body>

  <!-- ══ Top bar ═══════════════════════════════════════════════════════════════ -->
  <div id="display-topbar">
    <div id="display-wordmark">PATHSENSE</div>
    <div id="display-topbar-right">
      <span id="display-status-tag">WAITING FOR PARTICIPANT</span>
      <span id="display-phase-badge" style="
        font-family:'Syne',sans-serif;font-size:8px;font-weight:700;
        letter-spacing:0.14em;padding:3px 10px;
        background:var(--rule);color:var(--black);">LOBBY</span>
    </div>
  </div>
  <div class="bh-red-stripe"></div>

  <!-- Level banner (shown during active round, hidden otherwise) -->
  <div id="level-banner">
    <span class="lb-txt" id="lb-level">LEVEL 1</span>
    <div class="lb-sep"></div>
    <span class="lb-txt" id="lb-desc" style="font-weight:400;letter-spacing:0.1em;opacity:0.8">
      Gentle S-curve · 90 s
    </span>
  </div>

  <!-- ══ Views ══════════════════════════════════════════════════════════════════ -->

  <!-- Waiting -->
  <div id="view-waiting" class="view active">
    <svg id="waiting-grid" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="25%" y1="0" x2="25%" y2="100%" stroke="#d0ccc6" stroke-width="0.5"/>
      <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#d0ccc6" stroke-width="0.5"/>
      <line x1="75%" y1="0" x2="75%" y2="100%" stroke="#d0ccc6" stroke-width="0.5"/>
      <line x1="0" y1="33%" x2="100%" y2="33%" stroke="#d0ccc6" stroke-width="0.5"/>
      <line x1="0" y1="66%" x2="100%" y2="66%" stroke="#d0ccc6" stroke-width="0.5"/>
    </svg>
    <div id="waiting-title">PATHSENSE</div>
    <div id="waiting-red-rule"></div>
    <div id="waiting-sub">Tilt-controlled tightrope · Non-dominant hand study</div>
    <div id="waiting-player" style="display:none">
      <div id="waiting-dot"><div id="waiting-dot-label">P1</div></div>
      <div id="waiting-player-name"></div>
      <div id="waiting-player-mod"></div>
    </div>
  </div>

  <!-- Active game (Phaser canvas + sidebar) -->
  <div id="view-game" class="view">
    <div id="phaser-wrap"></div>
    <div id="game-sidebar">
      <div class="gs-title">Live Stats</div>
      <div class="gs-stat">
        <div class="gs-val" id="sb-falls">0</div>
        <div class="gs-key">Falls</div>
      </div>
      <div class="gs-stat">
        <div class="gs-val" id="sb-checkpoints">—</div>
        <div class="gs-key">Checkpoints</div>
      </div>
    </div>
  </div>

  <!-- Round results -->
  <div id="view-results" class="view">
    <div id="res-left">
      <div id="res-eyebrow">Round Complete</div>
      <div id="res-title">LEVEL<br>ONE</div>
      <div id="res-rule"></div>
      <div id="res-player">—</div>
      <div id="res-modality"></div>
    </div>
    <div id="res-stats">
      <div class="res-stat-box">
        <div class="res-stat-val red" id="rstat-falls">0</div>
        <div class="res-stat-key">Falls</div>
      </div>
      <div class="res-stat-box">
        <div class="res-stat-val" id="rstat-checkpoints">—</div>
        <div class="res-stat-key">Checkpoints</div>
      </div>
      <div class="res-stat-box">
        <div class="res-stat-val" id="rstat-duration">—</div>
        <div class="res-stat-key">Duration</div>
      </div>
      <div class="res-stat-box">
        <div class="res-stat-val" id="rstat-near">—</div>
        <div class="res-stat-key">Time Near Edge</div>
      </div>
      <div id="res-next">
        <div id="res-next-txt">NEXT → LEVEL 2</div>
        <div id="res-countdown">Continuing in 20s…</div>
      </div>
    </div>
  </div>

  <!-- ══ Toast ══════════════════════════════════════════════════════════════════ -->
  <div id="notification"></div>

  <script src="/socket.io/socket.io.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>
  <script src="/js/game.js"></script>
  <script src="/js/display.js"></script>
</body>
</html>
```

### 6b — `display.js`

- [ ] **Step 2: Replace `public/js/display.js` entirely**

```js
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
  if (activeMazeScene) activeMazeScene.setTilt(player, gamma, beta || 0);
});

socket.on('GAME_START', ({ level } = {}) => {
  currentRound++;
  currentLevel = Math.min(3, Math.max(1, Number(level) || 1));
  _transitionTo(STATE.CALIBRATING);
  _destroyPhaser();

  // Update level banner
  const meta = LEVEL_META[currentLevel] || LEVEL_META[1];
  const lbLevel = document.getElementById('lb-level');
  const lbDesc  = document.getElementById('lb-desc');
  if (lbLevel) lbLevel.textContent = meta.label;
  if (lbDesc)  lbDesc.textContent  = meta.desc;

  // Build Phaser with game paused, waiting for CALIBRATION_DONE
  const p = players[0];
  const playerList = players.map(pl => ({ playerNum: pl.playerNum, color: pl.color, name: pl.playerName }));

  phaserGame = window.createPhaserGame('phaser-wrap', {
    players:           playerList,
    level:             currentLevel,
    startPaused:       true,
    onWallHit:         _onWallHit,
    onGameEnd:         _onGameEnd,
    onProximityChange: _onProximityChange,
  });

  phaserGame.events.once('ready', () => {
    activeMazeScene = phaserGame.scene.getScene('MazeScene');
  });

  // Update topbar for active session
  const statusTag = document.getElementById('display-status-tag');
  const phaseBadge = document.getElementById('display-phase-badge');
  if (statusTag)  statusTag.textContent  = p ? `${p.playerName} · ${(p.modality || '').toUpperCase()}` : '';
  if (phaseBadge) { phaseBadge.textContent = 'GAME'; phaseBadge.style.background = 'var(--red)'; phaseBadge.style.color = '#fff'; }
});

socket.on('CALIBRATION_DONE', () => {
  if (activeMazeScene) activeMazeScene.setPaused(false);
  _transitionTo(STATE.ROUND_ACTIVE);
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

  if (state === STATE.WAITING || state === STATE.CALIBRATING) {
    document.getElementById('view-waiting')?.classList.add('active');
    clearInterval(sbInterval); sbInterval = null;
  } else if (state === STATE.ROUND_ACTIVE) {
    document.getElementById('view-game')?.classList.add('active');
    if (banner) banner.classList.add('active');
    // Poll sidebar every 500ms
    sbInterval = setInterval(_updateSidebar, 500);
  } else if (state === STATE.ROUND_RESULTS) {
    document.getElementById('view-results')?.classList.add('active');
    clearInterval(sbInterval); sbInterval = null;
  }
}

// ─── Waiting screen ───────────────────────────────────────────────────────────
function _renderWaiting() {
  const playerWrap   = document.getElementById('waiting-player');
  const dotLabel     = document.getElementById('waiting-dot-label');
  const playerName   = document.getElementById('waiting-player-name');
  const playerMod    = document.getElementById('waiting-player-mod');
  const statusTag    = document.getElementById('display-status-tag');
  const phaseBadge   = document.getElementById('display-phase-badge');

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

// ─── Sidebar polling ──────────────────────────────────────────────────────────
function _updateSidebar() {
  if (!activeMazeScene) return;
  const stats = activeMazeScene.getStats();
  const p     = players[0];
  if (!p) return;
  const s = stats[p.playerNum];
  if (!s) return;

  const sbFalls = document.getElementById('sb-falls');
  const sbCp    = document.getElementById('sb-checkpoints');
  if (sbFalls) sbFalls.textContent = s.falls;
  if (sbCp)    sbCp.textContent    = s.checkpoints;
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
  const fmt   = ms => `${(ms / 1000).toFixed(0)}s`;

  document.getElementById('res-title').innerHTML    = meta.name;
  document.getElementById('res-player').textContent = p?.playerName || '—';
  document.getElementById('res-modality').textContent = ml[p?.modality] || '—';
  document.getElementById('rstat-falls').textContent        = entry?.falls ?? 0;
  document.getElementById('rstat-checkpoints').textContent  = entry ? `${entry.checkpoints}/${entry.totalCheckpoints}` : '—';
  document.getElementById('rstat-duration').textContent     = fmt(round_duration_ms || 0);
  document.getElementById('rstat-near').textContent         = fmt(entry?.time_at_level_2_ms || 0);

  const nextTxt = document.getElementById('res-next-txt');
  const cd      = document.getElementById('res-countdown');
  if (level < 3) {
    if (nextTxt) nextTxt.textContent = `NEXT → LEVEL ${level + 1}`;
  } else {
    if (nextTxt) nextTxt.textContent = 'SESSION COMPLETE';
  }

  let secs = level < 3 ? 20 : 30;
  if (cd) cd.textContent = `Continuing in ${secs}s…`;

  rrTimer = setInterval(() => {
    secs--;
    if (secs > 0 && cd) cd.textContent = `Continuing in ${secs}s…`;
    if (secs <= 0) {
      clearInterval(rrTimer);
      _backToWaiting();
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
  clearInterval(sbInterval); sbInterval = null;
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
```

- [ ] **Step 3: Verify display — Waiting state**

1. Open `https://localhost:3000/` 
2. Should show: cream background, PATHSENSE wordmark (top bar), grid lines overlay, centred PATHSENSE heading in Syne 800, red rule below it, no player dot (no one connected)

- [ ] **Step 4: Verify display — After player joins**

1. Open `https://localhost:3000/controller` in another tab, enter name + demographics, join
2. Display: P1 red circle dot appears with player name below it

- [ ] **Step 5: Commit**

```bash
git add public/index.html public/js/display.js
git commit -m "feat: display — Bauhaus waiting/active/results, CALIBRATION_DONE unpause, sidebar stats"
```

---

## Task 7: Phaser Visual Redesign (`public/js/game.js`)

**Files:**
- Modify: `public/js/game.js`

Changes:
1. `createPhaserGame()` — use container element dimensions (not window size); accept `startPaused` flag
2. Corridor fill — cream `#F5F2ED` at 6% alpha instead of navy
3. Edge lines — Bauhaus Red `#C0392B` instead of blue
4. Center guide — cream at 15% alpha
5. Checkpoint markers — cream at 30% alpha, no text labels
6. START marker — hollow cream circle, no text
7. END marker — hollow cream circle, no text
8. Ball — cream fill, red outline (not player color)
9. Ball name label — remove (player name shown in topbar, not Phaser)
10. HUD timer text — cream color
11. HUD falls/cp text — remove (now in HTML sidebar/stats)
12. `init()` — set `this._paused` from `initData.startPaused`

- [ ] **Step 1: Update `createPhaserGame()` to use container dimensions and `startPaused`**

Find `createPhaserGame` at the bottom of `game.js` (line ~349) and replace:
```js
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
```

- [ ] **Step 2: Update `init()` to support `startPaused`**

Find `init(data)` in `MarbleScene` (line ~49). Change the `this._paused` line:
```js
// was: this._paused = false;
this._paused = !!data.startPaused;
```

- [ ] **Step 3: Update corridor fill color (line ~87)**

Find the `g.fillStyle(0x0d1a2e, 1.0)` line. Replace:
```js
g.fillStyle(0xf5f2ed, 0.06);
```

- [ ] **Step 4: Update corridor edge line color (line ~111)**

Find the `g.lineStyle(2, 0x2266cc, 0.9)` lines. There are two (one per edge). Replace both with:
```js
g.lineStyle(2, 0xc0392b, 0.85);
```

- [ ] **Step 5: Update center guide color (line ~117)**

Find `g.lineStyle(1, 0x334466, 0.4)`. Replace:
```js
g.lineStyle(1, 0xf5f2ed, 0.12);
```

- [ ] **Step 6: Update checkpoint marker rendering (lines ~122–144)**

Find the `pts.forEach((p, i) => {` block that draws START/END/checkpoint markers. Replace the entire block:
```js
const cpG = this.add.graphics();
pts.forEach((p, i) => {
  if (i === 0) {
    // START: hollow cream circle, slightly larger
    cpG.lineStyle(2, 0xf5f2ed, 0.6);
    cpG.strokeCircle(p.x, p.y, 20);
  } else if (i === pts.length - 1) {
    // END: hollow cream circle
    cpG.lineStyle(2, 0xf5f2ed, 0.4);
    cpG.strokeCircle(p.x, p.y, 20);
  } else {
    // Checkpoint: small hollow cream circle
    cpG.lineStyle(1.5, 0xf5f2ed, 0.3);
    cpG.strokeCircle(p.x, p.y, 10);
  }
});
```

- [ ] **Step 7: Update ball rendering (lines ~147–163)**

Find the `this._players.forEach((p) => {` block that creates the ball. Replace:
```js
this._players.forEach((p) => {
  const start = pts[0];

  const ball = this.add.graphics();
  ball.fillStyle(0xf5f2ed, 1.0);       // cream fill
  ball.fillCircle(0, 0, BALL_R);
  ball.lineStyle(2.5, 0xc0392b, 0.8);  // red outline
  ball.strokeCircle(0, 0, BALL_R);
  ball.setDepth(10);
  ball.x = start.x;
  ball.y = start.y;

  this._state[p.playerNum] = {
    ball,
    vx: 0, vy: 0,
    falls:         0,
    checkpointIdx: 0,
    stunUntil:     0,
    proxLevel:     0,
    proxMs:        { 1: 0, 2: 0, 3: 0 },
  };
});
```

- [ ] **Step 8: Update HUD text — keep timer, remove falls and checkpoints**

Find the HUD block (lines ~176–188). Replace:
```js
// Timer only — falls/checkpoints shown in HTML sidebar
this._timerText = this.add.text(W / 2, ARENA_M / 2, '1:30', {
  fontSize: '18px', fontFamily: 'Barlow', color: '#f5f2ed', alpha: 0.7,
}).setOrigin(0.5, 0.5).setDepth(20);

this.game.events.emit('ready');
```

- [ ] **Step 9: Update the `update()` HUD label section (lines ~264–272)**

Find the block that updates `_fallsText` and `_cpText` and the `nameLabel`. Remove references to `nameLabel` (it no longer exists) and the falls/cp text updates. Keep only the timer and the `nameLabel` move. The block around line 264 should become:

```js
// Update timer
if (p === this._players[0]) {
  // (timer updated above via _timerText.setText)
}
```

Find the `s.nameLabel.x = ...` and `s.nameLabel.y = ...` lines (around line 265). Remove them — `nameLabel` no longer exists in `_state`.

Find `this._fallsText.setText(...)` and `this._cpText.setText(...)`. Remove both lines.

- [ ] **Step 10: Restart server and do a full end-to-end visual test**

1. `node server.js`
2. Hard-refresh display: `Cmd+Shift+R` at `https://localhost:3000`
3. Open `https://localhost:3000/admin`
4. Open `https://localhost:3000/controller` on the phone
5. Enter name + demographics → JOIN SESSION →
6. Display: cream waiting screen, P1 dot appears
7. Admin: click ▶ Level 1
8. Controller: shows CALIBRATION screen
9. Tap CALIBRATE →
10. Display: transitions to active round, dark canvas, **red** corridor edges, cream ball, falls/checkpoints in sidebar
11. Tilt phone — ball moves, stays cream with red outline
12. Let timer run to 0 (or hard-refresh to test results)
13. Results screen: Swiss/Bauhaus layout, falls in red, no score shown

- [ ] **Step 11: Commit**

```bash
git add public/js/game.js
git commit -m "feat: Phaser visuals — Bauhaus Red edges, cream ball, calibration pause support"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Swiss/Bauhaus tokens: cream, black, red, Syne, Barlow | T1 |
| Demographics at join (not survey) | T3, T4 |
| Calibration screen between READY and PLAYING | T4, T6b |
| CALIBRATION_DONE socket routing | T2, T4, T6b |
| Handedness visible in admin player card | T2, T5b |
| No score in any UI | T5b, T6b |
| No proximity indicator on display (research constraint) | T6a (sidebar shows falls/checkpoints only) |
| Admin: 3-col layout, export buttons | T5a |
| Controller: free-text survey only | T4 |
| Phaser: red corridor edges, cream ball, cream checkpoints | T7 |
| Phaser: use container dimensions (for sidebar layout) | T7 |
| Game starts paused until CALIBRATION_DONE | T7, T6b |
| Demographics passed in SURVEY_RESPONSE | T4 |

**Placeholder scan:** None found — all code blocks are complete.

**Type consistency:**
- `CALIBRATION_DONE` event name used consistently in server.js (T2), controller.js (T4), display.js (T6b)
- `activeMazeScene.setPaused(false)` matches `setPaused(v)` API in game.js:345
- `activeMazeScene.getStats()` returns `{ [playerNum]: { falls, checkpoints } }` — sidebar reads `s.falls`, `s.checkpoints` — matches game.js:333
- `startPaused` key passed in `initData` and read in `init(data)` — consistent

---

Plan complete and saved to `docs/superpowers/plans/2026-05-24-pathsense-redesign.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
