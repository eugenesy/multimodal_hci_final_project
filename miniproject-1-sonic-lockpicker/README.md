# Sonic Lockpicker 🎧🔓

**Course:** Multimodal Human-Computer Interaction - Mini Project 1 (Audio Only Game)
**Author:** D13949006 Eugene Lalis Sy

## Overview

**Sonic Lockpicker** is an audio-first, hands-free, eyes-free speedrun puzzle game inspired by Wordle mechanics. Players must crack a 3-digit (Easy Mode) or 4-digit (Hard Mode) lock by speaking numbers. The game responds with spatial audio and Text-to-Speech (TTS) to indicate correct, misplaced, or incorrect digits, and if a level is passed, respectively.

To teach the player how to interpret complex auditory scenes, the game features a **Progressive Challenge System**:

* **Level 1 (Sequence):** Feedback notes play one-by-one.
* **Level 2 (Arpeggio):** Notes build up into a chord.
* **Level 3 (Concurrent):** All notes play simultaneously, requiring the player to decode a spatially panned chord in real-time.


## Prerequisites & Dependencies

### Operating System
* **macOS** is required (the game uses the native macOS `say` command for TTS).

### Python Environment (The Audio Bridge)
* Python 3.x
* `vosk` (Offline speech recognition)
* `sounddevice` (Audio streaming)
* `python-osc` (UDP communication)

Install dependencies via:
`pip3 install vosk sounddevice python-osc`

*Note: You must download a Vosk English language model and extract it into a folder named `model` in the root directory.*

### Processing Environment (The Game Engine)
* Processing 4.x
* **Libraries required:** `Sound`, `oscP5`, `netP5`

## Directory Structure

Ensure your folder is structured exactly like this before running:

    sonic_wordle/
    ├── sonic_wordle.pde            # The main Processing game sketch
    ├── speech_reg_osc.py           # The Python Vosk-to-OSC bridge
    ├── data/                       
    │   └── chest_opening.mp3       # MP3 asset for the victory screen
    └── model/                      
        ├── am/
        ├── conf/
        ├── graph/
        └── ... (Vosk model files)

## How to Run

1. **Start the Speech Bridge:** Open your terminal, navigate to the project folder, and run:
   python3 speech_reg_osc.py

   *Wait until the terminal says "Speak digits clearly..."*

2. **Start the Game:** Open `sonic_wordle.pde` in Processing and click the **Run** (Play) button.

3. **Start a Run:** From the main menu, you can either click **EASY MODE** / **HARD MODE**, or simply say **"Easy"** or **"Hard"** to start the game completely hands-free. 

4. **Eyes-Free Mode:** Click the **HIDE UI** button in the top right to black out the screen and simulate a pure audio environment.

## How to Play (Voice Commands)

Speak clearly into your microphone. The dynamic buffer will wait for you to finish your sequence before sending it to the game.

* **"Easy" / "Hard":** Speak these on the main menu to start a run. The TTS will instruct you on how many digits to guess.
* **"Zero" to "Nine" (or "Oh"):** Speak a sequence of 3 numbers (Easy) or 4 numbers (Hard) to submit a guess. Do not repeat numbers in a single guess.
* **"Status":** The TTS will read out all currently known "Correct" and "Misplaced" numbers.
* **"Reset" / "Restart":** Aborts the current run and returns to the main menu.

*(Note: For debugging purposes, keyboard number entry 0-9, Backspace, and Enter are also supported).*

## Audio Design & Perception Mechanics

The game uses careful audio design principles to ensure the player can decode multiple overlapping sounds (Principle #3 of the grading rubric):

* **Spatial Panning:** Digits are panned Left-to-Right corresponding to their position in the lock (e.g., the first digit is in the left ear, the last is in the right ear).
* **Correct (Green):** 1100Hz Sine Wave. Smooth, bright, and sustains for a long time.
* **Misplaced (Yellow):** 523Hz Triangle Wave. Flute-like, medium sustain.
* **Wrong (Gray):** 120Hz Square Wave. A low, hollow, percussive buzz that drops out immediately.

**The "Chord-Scan" Technique:** Because the "Wrong" guesses drop out instantly and the "Correct" guesses ring out the longest, the player can listen to the "tail" of the Level 3 chord to pinpoint exactly which spatial positions are correct.

## Vault Treasures

Upon completing Level 3, the timer stops, a chest opening sound plays, and the TTS will announce a randomly selected "digital junk" treasure (e.g., "a floppy disk containing a 1-pixel image of the sun") before asking for your name for the Leaderboard.