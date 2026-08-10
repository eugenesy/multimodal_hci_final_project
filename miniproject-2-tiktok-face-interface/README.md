# TikTok Face Interface Hack

This project hacks the live TikTok desktop feed with a Tampermonkey userscript and local face tracker data.

## What this version does

1. Removes the left sidebar UI.
2. Adds large gaze-dwell navigation controls just outside the active video frame, split into upper/lower regions.
3. Uses an adaptive round cursor with magnetic snapping behavior.
4. Maps smile-with-teeth to heart action (like).
5. Maps tongue-out to unheart action (unlike only).
6. Uses jaw-open hold to toggle comments panel open/close and switch Feed/Comments mode.
7. Shows dedicated comment scroll pads (top and bottom) when comments are open.
8. Restarts in-page calibration when both eyes stay closed for about 1 second.
9. Adds in-page Tools panel for onboarding and gaze bias calibration.
10. During in-page calibration, pauses video playback and shows a clean white calibration scene with instructions.

## Project files

- `tiktok_face_gaze.user.js`: Tampermonkey script for live TikTok.
- `tracker/main.py`: Local face tracker + WebSocket broadcaster.
- `tracker/gaze_calibration.py`: Calibration tool.

## Tracker relocation

The tracker has been moved into this folder at `Miniproject 2.4/tracker`.

## Setup

1. Install tracker dependencies:

```bash
cd '/Users/eugene/Processing/Miniproject 2.4/tracker'
pip install -r requirements.txt
```

2. Run calibration (recommended before first use):

```bash
cd '/Users/eugene/Processing/Miniproject 2.4/tracker'
python gaze_calibration.py
```

- Choose 5-point (faster) or 9-point (better accuracy).
- First, center your face inside the on-screen box and press Space.
- Look at each target dot and press Space to collect samples.
- During sample collection, the solid white center shrinks inside the dot to show progress.
- The target dot glides to the next position between points.
- Calibration writes to `tracker/gaze_calibration.json`.

3. Start tracker:

```bash
cd '/Users/eugene/Processing/Miniproject 2.4/tracker'
python main.py
```

4. Install userscript:
- Open Tampermonkey.
- Create a new script.
- Paste content from `tiktok_face_gaze.user.js`.
- Save and enable.

5. Open TikTok desktop feed:
- `https://www.tiktok.com/`

## Controls

- Dwell on upper left region (`^`): previous video.
- Dwell on lower left region (`v`): next video.
- Video previous/next pads always control video feed navigation and force-close comments first.
- When comments are open, use the dedicated comments pads on the left side of the comments panel.
- Dwell the top comments pad: scroll comments up.
- Dwell the bottom comments pad: scroll comments down.
- Smile with teeth: heart (like).
- Tongue out: unheart (unlike).
- Hold jaw open (~0.9s): toggle comments open/close and switch Feed/Comments mode.
- Close both eyes for ~1 second: restart in-page calibration.
- Click `Tools` (top-right): open in-page utility panel.
- In `Tools`, choose `Start gaze calibration`.
- While calibrating, the page is isolated into a white calibration scene and videos are paused.
- Calibration screen is minimal (no progress bar and no camera preview overlay).
- Calibration uses red dots only (no arrows).
- Step 1: top-left dot.
- Step 2: top-right dot.
- Step 3: center dot.
- Step 4: left dot.
- Step 5: right dot.
- Step 6: bottom-left dot.
- Step 7: bottom-right dot.
- At each step, look at the red dot and press Space.
- Press Esc at any time to cancel calibration.

## Quick checks

- Console should show: `[TFG] userscript injected ...`
- Top-right beacon should show: `TFG on`
- HUD should move from `Disconnected` to `Connected` when tracker is running.

## Troubleshooting

1. If nothing appears, confirm Tampermonkey loaded the latest script version.
2. If HUD shows disconnected, make sure tracker is running from `Miniproject 2.4/tracker`.
3. If smile/tongue does nothing, verify tracker confidence is high and exaggerate expression briefly.
4. If comments do not toggle on jaw hold, keep jaw open for about one second while facing camera.
5. If navigation is inconsistent, refresh the TikTok page once and try again after feed loads.
6. If cursor/targets feel offset, run in-page calibration from `Tools`.
7. If tracking remains poor, rerun `python gaze_calibration.py` in `tracker/`.
