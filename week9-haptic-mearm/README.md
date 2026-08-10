# Week 9 — Haptic Emoji Recognition Study

**Course:** Multimodal Human-Computer Interaction — Week 9 exercise
**Author:** Eugene Lalis Sy

A perceptual study measuring how well participants can distinguish five distinct haptic "strokes" delivered by a MeArm robotic arm to the palm, without visual or audio cues. Reuses the same MeArm + Arduino serial setup as [`miniproject-3-tactile-theater`](../miniproject-3-tactile-theater) (`Arduino_IK_serial.ino`).

## The five strokes
1. **Heartbeat** — steady double-taps
2. **Time Bomb** — accelerating taps building to a chaotic "explosion"
3. **Rain Cloud** — random gentle taps
4. **Magic Wand** — fast swoosh + rapid sparkle taps
5. **Yo-Yo** — slow drop across the palm with an instant snap-back

## Procedure
`Processing_mearm_serial.pde` runs a training mode (press `1`–`5` to feel each stroke) followed by a 15-trial study (3 reps × 5 strokes, randomized order): the arm plays a stroke, the participant guesses which of the five it was, and a confusion matrix is logged and auto-saved to `Participant_N_confusion_matrix.csv`.

`Participant_1_confusion_matrix.csv` and `Participant_2_confusion_matrix.csv` are the two collected pilot runs.

## How to Run
Wire the MeArm (base=pin 9, shoulder=7, elbow=8, claw=6), flash `Arduino_IK_serial.ino` from the Miniproject 3 folder, update `portName` in `Processing_mearm_serial.pde`, then run it in Processing. Press `T` for training, `S` to start the study.
