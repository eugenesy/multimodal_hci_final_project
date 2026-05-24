# PathSense UI Redesign — Design Spec

**Date:** 2026-05-24  
**Status:** Approved  
**Aesthetic direction:** Swiss / Bauhaus  

---

## Design Motivation

The existing UI uses a dark background + neon accent palette that reads as generic AI-generated tooling. The redesign replaces it with a Swiss/Bauhaus language: cream paper background, near-black type, Bauhaus Red accent, and a disciplined typographic grid. The result reads as a precision research instrument — authoritative, legible, and visually distinctive.

---

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--cream` | `#F5F2ED` | Primary background for all UI surfaces |
| `--black` | `#1A1A1A` | Primary type, borders, filled buttons |
| `--red` | `#C0392B` | Accent — eyebrows, stripes, badges, active states, fall counts |
| `--rule` | `#D0CCC6` | Hairline rules, borders, inactive states |
| `--dark` | `#111111` | Phaser game canvas background only |
| `--gray` | `#888888` | Secondary / muted text |

**Typography:**
- **Syne 700 / 800** — wordmarks, headlines, level numbers, stat values, button labels
- **Barlow 300 / 400 / 600** — body copy, metadata, labels, eyebrows (uppercase 0.22em tracking)
- **Barlow Condensed 600** — compact numeric readouts in results panel
- Loaded from Google Fonts CDN

**Structural motifs:**
- 3px horizontal red stripe immediately below every black top bar
- Black thick rule (1.5px) separating headline from body
- Small-caps eyebrows: 7–8px Barlow 600 · 0.22em tracking · all-caps · red
- Filled black buttons: Syne 700 · 8–9px · 0.18em tracking · all-caps

---

## Screens

### 1. Controller — Join + Demographics (`/controller`)

**State: pre-join**

The join screen collects all participant information in a single step before connecting.

Fields (in order):
1. **Your Name** — free text input
2. **Handedness** — chip selector: Right / Left / Either
3. **Gaming experience** — chip selector: None / Casual / Regular / Frequent
4. **Tilt game experience?** — chip selector: Yes / No
5. **Age** — numeric text input
6. **Gender** — chip selector: Man / Woman / Non-binary (+ Other via free text if needed)

Layout: black top bar with `PATHSENSE` wordmark + `STUDY` tag → 3px red stripe → scrollable form body. JOIN SESSION → CTA button at bottom. Privacy footnote: "UBC HCI Lab · Data used for research only".

**Implementation note:** `connectWithName()` must be called with all demographics fields bundled. The socket query should include `handedness`, `gaming_experience`, `tilt_experience`, `age`, `gender` in addition to existing params. Server stores demographics alongside player record.

---

### 2. Controller — Ready

Shown after join, before researcher starts the level.

Displays: player number, modality badge (HAPTIC / AUDIO / NONE), modality description, non-dominant hand instruction. Status line: "Waiting for researcher to start…"

---

### 3. Controller — Calibration

Shown immediately when `GAME_START` is received, before the round timer begins (or during a brief pre-round countdown if one is added). The player must hold the phone flat and tap to confirm neutral tilt before the round starts.

Screen content: instruction headline ("Hold Phone Flat"), short body copy ("Rest the phone on a flat surface or hold it horizontal. This sets your neutral tilt position."), and a large `CALIBRATE →` button. Tapping the button calls the existing `calibrateGamma` / `calibrateBeta` offset logic, then transitions to the Playing screen.

**Note:** The display screen can show a brief "Calibrating…" state or simply start the game only after receiving a `CALIBRATION_DONE` event from the controller. Simplest approach: controller calibrates and emits a ready signal; server relays it to the PC socket which then unpauses the Phaser game. If this adds complexity, an acceptable fallback is to show the calibration screen for a fixed 3 seconds and auto-confirm.

---

### 4. Controller — Playing

Shown during an active round.

**Minimal — player should focus on the game display, not the phone.** Shows only: level name in Syne 800 headline, modality badge, and a quiet one-line reminder ("Tilt with your non-dominant hand only"). No live stat grid. No score. Double-tap recalibration hint in small secondary text at bottom.

---

### 5. Controller — Feedback (post-round survey)

**Free text only.** No rating scales, no demographic questions (already collected at join).

Prompt: "How did the task feel? Any comments on the feedback or difficulty?"  
Single `<textarea>` with tall min-height.  
Two buttons: `SUBMIT →` (primary, black) and `SKIP` (secondary, transparent border).

---

### 5. Admin Panel (`/admin`)

3-column layout after 3px red stripe:

**Column 1 — Participant (200px):**  
Player card with left red border, name in Syne 700, meta line (modality emoji, session number, handedness). Below: QR code box + URL text.

**Column 2 — Levels:**  
Three level buttons with large Syne number (1/2/3), title (Introductory / Moderate / Hard), descriptor (path shape · duration · corridor width). Active level shown with black fill. Below: "→ LOBBY" reset control.

**Column 3 — Results:**  
Round result rows with player name, checkpoint count, falls (red, Barlow Condensed). Aggregate stat boxes (Falls / Checkpoints). Two export buttons: `↓ CSV` and `↓ SURVEY`.

Status indicator in top bar: phase badge (LOBBY cream, GAME red).

---

### 6. Game Display — Waiting (`/`)

Full-width cream panel. Subtle grid lines overlay (4 vertical + 2 horizontal hairlines, `#D0CCC6 0.5px`). Centred: `PATHSENSE` in Syne 800 large, 40px red rule, subtitle, then player dot (red circle with P1 label), player name, modality.

Top bar: black · `PATHSENSE` wordmark left · `WAITING FOR PARTICIPANT` + `LOBBY` badge right.

---

### 7. Game Display — Active Round

Layout: black top bar → red level banner (level number + path descriptor) → two-column body.

**Left: Phaser canvas** (dark `#111111` background, fills available space)
- HUD overlay positioned absolutely at top of canvas: three pills (Falls | Timer | Checkpoints) with semi-transparent dark backgrounds
- Phaser draws: red corridor edge lines (`#C0392B`), subtle cream corridor fill (low-opacity gradient), cream ball with red outline, checkpoint markers, START/END markers
- The visual identity of the path itself (Bauhaus Red edges on dark canvas) is the primary game aesthetic

**Right sidebar (120px):** cream background, section title `LIVE STATS` in red eyebrow style, stat rows (Falls / Checkpoints) only. **No proximity level indicator** — showing SAFE/NEAR/WARN/DANGER on the display would provide uncontrolled visual feedback to participants in the `none` modality condition. The proximity system drives haptic/audio on the phone; the display sidebar is researcher-facing context only.

---

### 8. Game Display — Round Results

Two-column cream panel:

**Left:** round-complete eyebrow, `LEVEL ONE` headline in Syne 800, thick rule, player name in red, modality descriptor.

**Right:** 2×2 stat grid (Falls in red / Checkpoints / Duration / Time on path), spanning bottom bar with next level announcement and countdown.

---

## Data Flow Changes

### Demographics at join

`controller.js` `connectWithName()` must:
1. Collect demographics from the form (handedness, gaming_experience, tilt_experience, age, gender)
2. Include in socket connection query OR emit a separate `DEMOGRAPHICS` event immediately after connection
3. Recommended: pass as part of the initial socket query params (keeps server-side code simple)

`server.js` `handleControllerConnection()` must:
1. Read demographics from query params
2. Store on the player session object
3. Include in `PLAYERS_UPDATE` payload so admin panel can show handedness

### Survey (free text only)

`controller.js` survey form must only have one field: the free-text textarea. Remove any existing rating-scale questions.

`SURVEY_RESPONSE` payload structure (already fixed in B3): `{ response, playerNum, modality, timestamp, play_count, demographics }` — demographics here is the same object stored at join, carried forward so the JSONL row is self-contained.

### Calibration handshake

On `GAME_START`, controller shows calibration screen. When player taps `CALIBRATE →`:
1. Controller calls `calibrateGamma()` / `calibrateBeta()` to zero offsets
2. Controller emits `CALIBRATION_DONE { playerNum }` to server
3. Server forwards to PC socket
4. `display.js` unpauses the Phaser game (calls `scene.setPaused(false)` or equivalent)

If calibration is not done within 10 seconds, auto-confirm with current tilt as neutral (failsafe).

---

## Phaser Visual Changes (game.js)

The Phaser scene (`MarbleScene`) needs:

1. **Canvas background:** already `#111111` set by Phaser config — no change needed if it matches
2. **Corridor rendering:** edge polylines drawn in `#C0392B` (Bauhaus Red), `lineWidth=2`; corridor fill as a low-opacity cream polygon (`#F5F2ED`, alpha ~0.06)
3. **Ball:** cream fill `#F5F2ED`, red outline `#C0392B`, `lineWidth=2`
4. **Checkpoint markers:** small hollow circles, cream `#F5F2ED` at 30% alpha
5. **Start/End markers:** hollow circle, cream at 50% alpha, slightly larger
6. **HUD text** (if rendered inside Phaser): Syne font via web font loader, cream color — but HUD is handled in HTML overlay, so Phaser only renders the game objects

---

## Files to Change

| File | Changes |
|------|---------|
| `public/controller.html` | Full layout redesign: join + demographics form, ready state, playing state, feedback state |
| `public/css/controller.css` *(new or inline)* | Swiss/Bauhaus styles: cream bg, Syne + Barlow, chip selectors, stat boxes |
| `public/js/controller.js` | Demographics collection on join; calibration screen + `CALIBRATION_DONE` emit; removed survey rating questions; removed live stats from playing screen; pass demographics in socket query |
| `public/admin.html` | Full layout redesign: 3-column admin, Bauhaus header |
| `public/css/admin.css` *(new or inline)* | Admin panel styles |
| `public/js/admin.js` | Minor: show handedness from player meta |
| `public/index.html` | Full layout redesign: waiting / active / results states in Swiss/Bauhaus |
| `public/css/display.css` *(new or inline)* | Display screen styles |
| `public/js/display.js` | Render waiting/playing/results HTML panels in Bauhaus style; handle `CALIBRATION_DONE` to unpause Phaser game |
| `public/js/game.js` | Phaser rendering: red corridor edges, cream ball, cream checkpoint markers |
| `server.js` | Store demographics from query params; include in PLAYERS_UPDATE; forward `CALIBRATION_DONE` from controller to PC socket |

**Note on CSS architecture:** Existing CSS is inline in HTML or in a single `public/css/style.css`. Add Bauhaus styles either as separate per-page CSS files or inline `<style>` blocks in each HTML file. Do not break the existing `style.css` wholesale — add a new file or scoped overrides.

---

## Constraints

- No build step — all CSS/JS served statically
- Google Fonts CDN must be the only external dependency added (Syne, Barlow, Barlow Condensed)
- Phaser 3 game canvas stays inside its container; visual changes are drawing-style only
- All existing socket event names and server routes remain unchanged
- The research study must not be disrupted: all CSV fields continue to be populated correctly; demographics now come from join-time query params rather than post-round survey

---

## Research-First Design Constraints

The following UI decisions are driven by study validity, not UX convention. When in doubt, the RQs and study design override best practices.

| Decision | Rationale |
|----------|-----------|
| No live stats on controller during play | Prevents participants from attending to the phone instead of the display; eliminates uncontrolled visual feedback channel in all modality conditions |
| No score displayed anywhere | Prevents participants from optimising a composite metric; score is recorded in CSV as secondary DV but not shown |
| No proximity level indicator on display | Display is visible to all participants including `none` condition — any visual proximity cue would contaminate the control group |
| Demographics on join, not survey | Collected once, before any performance data; not confounded by modality experience or fatigue |
| Calibration per level | Zeroes tilt origin before each round to reduce inter-level measurement noise in `falls` |
| Controller is a sensor + haptic/audio output only | Not a feedback display; phone face-down or unused during gameplay is the ideal state |

---

## Non-Goals

- No new font loading infrastructure (CDN link tag is sufficient)
- No CSS preprocessor or build tooling
- No changes to game logic, paths, difficulty, or scoring
- No animation library (CSS transitions only for micro-interactions)
