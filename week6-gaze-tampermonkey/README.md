# Week 6 — Gaze Tracking & Browser-Hack Exercises

**Course:** Multimodal Human-Computer Interaction — Week 6 exercises
**Author:** Eugene Lalis Sy

## `gaze_example/`
Webcam gaze-tracking pipeline built on MediaPipe FaceLandmarker: `gaze_tracker.py` (and iterative variants `1_gaze_tracker.py`, `1_gaze_calibration.py`, `debug_res.py`) estimate gaze direction/screen-space gaze point from face landmarks, with a Kalman filter + polynomial regression for calibration smoothing (`gaze_calibration.py`, `gaze_calibration.json`).

Requires `mediapipe`, `opencv-python`, `numpy`, `scikit-learn`, `filterpy`.

## `tampermonkey_example/`
Three Tampermonkey userscripts that inject live modifications into google.com, exercising the browser as a multimodal input/output surface:

- `hack_google_big_button/` — enlarges and repositions the Google Search button
- `hack_google_logo_websocket/` — moves the Google logo in real time based on face position, streamed from the Python MediaPipe tracker over a WebSocket (`face_tracker_websocket.py` ↔ `hack_google_logo.js`)
- `hack_google_vertical_menu/` — replaces Google's horizontal results navigation with a vertical menu

Install via the [Tampermonkey](https://www.tampermonkey.net/) browser extension by adding each `.js` file as a new userscript.
