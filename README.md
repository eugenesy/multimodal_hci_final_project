# Multimodal Human-Computer Interaction (MMHCI) Coursework

**Course:** Multimodal Human-Computer Interaction — CSIE7641, National Taiwan University (NTU), Spring 2026 (114-2)
**Author:** Eugene Lalis Sy

All coursework for MMHCI in one place: three miniprojects, a set of weekly exercises, and the final project. Each folder is self-contained with its own README, dependencies, and run instructions.

## Final Project

| Project | Description |
|---|---|
| [`final-project/`](final-project/) | **PathSense** — a smartphone tilt-control balance game comparing haptic, audio, and no-feedback proximity cues across 25 participants. |

## Weekly Exercises & Miniprojects (chronological)

| Week / Project | Description |
|---|---|
| [`week2-jnd/`](week2-jnd/) | Auditory just-noticeable-difference studies: panning, volume, waveform |
| [`week3-speech-recognition/`](week3-speech-recognition/) | Offline speech-to-text (Vosk + OSC) and macOS text-to-speech in Processing |
| [`miniproject-1-sonic-lockpicker/`](miniproject-1-sonic-lockpicker/) | **Sonic Lockpicker** — an audio-only, eyes-free Wordle-style lockpicking game using spatial audio and voice input |
| [`week5-fitts-law-gaze/`](week5-fitts-law-gaze/) | Head-controlled mouse (MediaPipe gaze tracking) + Fitts's Law pointing experiment |
| [`week6-gaze-tampermonkey/`](week6-gaze-tampermonkey/) | Webcam gaze tracking; Tampermonkey userscripts that hack live Google Search UI |
| [`miniproject-2-tiktok-face-interface/`](miniproject-2-tiktok-face-interface/) | **TikTok Face Interface Hack** — gaze/expression-driven navigation of the TikTok desktop feed |
| [`week9-haptic-mearm/`](week9-haptic-mearm/) | Haptic emoji recognition study using a MeArm robotic arm |
| [`miniproject-3-tactile-theater/`](miniproject-3-tactile-theater/) | **Tactile Theater** — ambient video paired with synchronized MeArm haptic choreography |

## Demos (hosted externally)

A few videos are too large to commit to git and are hosted on YouTube instead:

| File | Project | Link |
|---|---|---|
| `demo.mp4` (512 MB) | Tactile Theater (Miniproject 3) | _TODO: add link_ |
| `demo.mp4` (103 MB) | Week 9 haptic study | _TODO: add link_ |
| `data/rain.mp4` (65 MB) | Tactile Theater (Miniproject 3) | _TODO: add link_ |
| `data/skydiv.mp4` (65 MB) | Tactile Theater (Miniproject 3) | _TODO: add link_ |

## Notes on shared assets

- The **Vosk** offline speech-recognition model used by `miniproject-1-sonic-lockpicker` and `week3-speech-recognition` isn't committed (large binary, third-party). Download a [Vosk English model](https://alphacephei.com/vosk/models) and extract it into that project's `model/` folder.
- Several exercises share MediaPipe's `face_landmarker.task` model, committed directly per-project since it's small (~4 MB each).
