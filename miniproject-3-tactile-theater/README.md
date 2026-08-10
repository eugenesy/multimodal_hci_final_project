# Tactile Theater

**Course:** Multimodal Human-Computer Interaction — Mini Project 3 (Haptics)
**Author:** Eugene Lalis Sy

## Overview

Tactile Theater pairs ambient video playback with synchronized haptic choreography delivered by a **MeArm** robotic arm (controlled over serial from Arduino). The viewer picks one of three "experiences" from a Processing menu; each plays a themed video while the arm performs a matching tactile motion against the viewer's skin:

| # | Video | Tactile choreography |
|---|-------|-----------------------|
| 1 | Rain | **Staccato Tap** (bubble wrap) — light random pecks that escalate into rapid-fire taps |
| 2 | Sky Diving | **Deep Compression** (sponge) — slow approach, plunge, sustained pressure hold, then release |
| 3 | Crawling Crabs | **Jittering Drag** (bumpy texture) — slow crawling motion with high-frequency jitter |

Each choreography is hand-timed to its video's narrative arc (see the comments in `miniproject_3.pde`).

## Hardware / Software

- **Processing 4.x** — `processing.serial` (Arduino communication) + `processing.video` (Movie playback)
- **Arduino + MeArm** — `Arduino_IK_serial/Arduino_IK_serial.ino`, inverse-kinematics serial control adapted from the York Hackspace MeArm library. Accepts `move X Y Z` and `rotate ANGLE` commands over serial.

## Directory Structure

```
miniproject_3.pde              # Processing sketch: menu + video playback + choreography
Arduino_IK_serial/
  Arduino_IK_serial.ino        # Arduino sketch driving the MeArm
data/
  crab.mp4                     # Crawling Crabs video
  rain.mp4                     # Rain video
  skydiv.mp4                   # Sky Diving video
```

The full demo recording (`demo.mp4`, 512 MB) is too large for GitHub and is hosted on YouTube instead: [youtu.be/RsMvON0JasU](https://youtu.be/RsMvON0JasU).

## How to Run

1. Wire the MeArm to the Arduino (base=pin 9, shoulder=7, elbow=8, claw=6) and flash `Arduino_IK_serial.ino`.
2. Open `miniproject_3.pde` in Processing, update `portName` to your Arduino's serial port, and click Run.
3. Press `1`, `2`, or `3` (or click a button) to start an experience; press `SPACE` to return to the menu.
