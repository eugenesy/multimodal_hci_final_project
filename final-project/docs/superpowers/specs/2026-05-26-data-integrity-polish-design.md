# Data Integrity Polish — Design Spec
Date: 2026-05-26  
Scope: pre-study targeted fixes + ball trajectory recording  
Files touched: `server.js`, `public/js/game.js`, `public/js/display.js`

---

## Problem Summary

Seven issues threaten research data validity before the study begins:

| # | Issue | Risk |
|---|-------|------|
| 1 | No CSV field quoting | Player name with comma silently corrupts every row |
| 2 | Session ID generated client-side | Refresh before round end → duplicate or missing IDs |
| 3 | No server-side validation of `EXPORT_RESULTS` | NaN / negative / missing fields written to CSV |
| 4 | Synchronous file I/O in socket handlers | Blocks event loop; partial writes under concurrent events |
| 5 | `session.round++` in two handlers | Double-increment if both code paths trigger |
| 6 | No deduplication guard on `EXPORT_RESULTS` | Network retry appends duplicate row |
| 7 | No ball trajectory data | Can't reconstruct path, fall locations, or dwell time per zone |

---

## Fix 1 — RFC 4180 CSV Quoting

**File:** `server.js`

Add a `csvField(v)` helper:
- Coerces value to string
- Wraps in double-quotes if value contains `,`, `"`, or `\n`
- Escapes embedded double-quotes as `""`
- Applied to every field in `appendResultsToCsv` and the new trajectory writer

No new dependencies.

---

## Fix 2 — Server-Minted Session ID

**File:** `server.js`, `public/js/display.js`

- `session` object gains a `sessionId` field (initially `''`)
- On `GAME_START` (admin-triggered), generate `session.sessionId = crypto.randomUUID()` (Node built-in, no dep)
- Session ID is included in the `GAME_START` payload sent to the display: `{ level, sessionId }`
- `display.js` removes its own `sessionId = \`S${Date.now()}\`` and reads from the event payload instead
- Session ID resets on `BACK_TO_LOBBY`

---

## Fix 3 — Server-Side Round Row Validation

**File:** `server.js`

Add `validateRoundRow(row)` called before any CSV write in the `EXPORT_RESULTS` handler:

- `falls`, `checkpoints_passed`, `score`, `round_duration_ms`, `time_at_level_1_ms`, `time_at_level_2_ms`, `time_at_level_3_ms` — must be non-negative finite numbers
- `difficulty_level` — must be 1, 2, or 3
- `player_id`, `session_id` — must be non-empty strings
- `modality` — must be one of `'haptic'`, `'audio'`, `'none'`

On validation failure: log offending fields, drop row, do not write to CSV.

---

## Fix 4 — Async File Writes

**File:** `server.js`

Replace all `fs.appendFileSync` / `fs.writeFileSync` / `fs.existsSync` / `fs.readFileSync` calls in socket event handlers and route handlers with `fs.promises.*` equivalents:

- `appendResultsToCsv` → `async function`, uses `fs.promises.appendFile`
- `savePlayerHistory` → `async function`, uses `fs.promises.writeFile` + `fs.promises.rename` (atomic pattern preserved)
- `SURVEY_RESPONSE` handler → awaits async write
- Route handlers (`/export-csv`, `/cert`) already use `res.sendFile` which is async — only the `fs.existsSync` guard needs replacing with `fs.promises.access`

All async writes wrapped in `try/catch` with `console.error` logging.

---

## Fix 5 — Single-Owner Round Increment

**File:** `server.js`

Extract a private `_advanceRound(level)` helper:
```
function _advanceRound(level) {
  session.phase = 'GAME';
  session.round++;
  // emit GAME_START, PHASE_CHANGE, log
}
```

Both `GAME_START` (admin) and `AUTO_NEXT_LEVEL` (display) call `_advanceRound(level)`. Neither touches `session.round` directly. Round counter has exactly one write path.

---

## Fix 6 — Export Deduplication Guard

**File:** `server.js`

Add `const _exportedRounds = new Set()` at module level.

In the `EXPORT_RESULTS` handler:
1. Construct key `"${row.session_id}:${row.round}:${row.player_id}"`
2. If key is in `_exportedRounds`: log warning, return early
3. Otherwise: add key, proceed to validate and write

Clear `_exportedRounds` in `BACK_TO_LOBBY` handler.

---

## Fix 7 — Ball Trajectory Recording (10Hz)

### `game.js`

- Add `_trajectory = []` array, cleared in `init()`
- In `update()`, when round is active and not paused: every 100ms (tracked via `_lastTrajectoryMs`), push:
  ```js
  {
    t_ms: Math.round(time - this._roundStart),
    x_frac: +((ball.x - AX) / AW).toFixed(4),
    y_frac: +((ball.y - AY) / AH).toFixed(4),
    proximity_level: this._proxLevel,
  }
  ```
  where `AX`, `AY`, `AW`, `AH` are arena origin and dimensions (computed in `create()`, stored as instance vars)
- Include `trajectory: this._trajectory` in the `onGameEnd` callback payload

### `display.js`

- `_onGameEnd({ rankings, round_duration_ms, trajectory })` — destructure `trajectory`
- Pass `trajectory` into `_exportRoundCsv`
- Emit `EXPORT_RESULTS` with `trajectory` field included

### `server.js`

New async function `appendTrajectoryCsv(rows, meta)`:
- File: `trajectories_YYYYMMDD.csv` (same date-stamp logic as results CSV)
- Headers: `session_id,round,difficulty_level,player_id,t_ms,x_frac,y_frac,proximity_level`
- Writes one CSV row per trajectory sample, all fields passed through `csvField()`
- Called from `EXPORT_RESULTS` handler after the main row is written

---

## New Output Files

| File | Existing? | Change |
|------|-----------|--------|
| `data/results_YYYYMMDD.csv` | Yes | Fields now properly quoted; session_id is server-authoritative |
| `data/trajectories_YYYYMMDD.csv` | **New** | 10Hz ball position per round |
| `data/players.json` | Yes | Writes now async |
| `data/survey_responses.jsonl` | Yes | Writes now async |

### Trajectory CSV schema
```
session_id,round,difficulty_level,player_id,t_ms,x_frac,y_frac,proximity_level
"S-uuid-...",1,1,"p_1234_abc",0,0.1000,0.5000,0
"S-uuid-...",1,1,"p_1234_abc",100,0.1023,0.4981,0
...
```

`x_frac` and `y_frac` are 0–1 fractions of arena width/height (origin = top-left of arena).  
`proximity_level` is 0 (safe) – 3 (danger).

---

## Non-Goals

- No write queue (write volume is too low to justify)
- No SQLite migration
- No changes to feedback routing, modality assignment, or game mechanics
- No changes to survey schema
