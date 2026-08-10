# Week 2 — Auditory Just-Noticeable-Difference (JND) Studies

**Course:** Multimodal Human-Computer Interaction — Week 2 exercises
**Author:** Eugene Lalis Sy

Three small Processing sketches, each an adaptive-staircase JND study (`processing.sound`, PEST-style 2-down-1-up reversal tracking) measuring perceptual sensitivity to a different audio dimension. All three follow the same procedure: play a reference tone, play a comparison tone that differs along one dimension, ask yes/no whether a difference was perceived, and step the difference size down after each response reversal until convergence.

| Folder | Dimension tested | Sketch |
|--------|-------------------|--------|
| `pan/` | Stereo panning (spatial position, L/R) | `Week2_PanJND.pde` |
| `volume/` | Loudness (amplitude) | `Week2_VolumeJND.pde` |
| `waveform/` | Timbre (sine vs. square wave blend) | `Week2_WaveformJND.pde` |

## How to Run

Requires Processing 4.x with the **Sound** library. Open any `.pde` in Processing, run it, put on headphones, and follow the on-screen instructions (press `SPACE` to start a trial, `Y`/`N` to respond). Each sketch reports a final JND threshold and a reversal-history graph at the end of the run.
