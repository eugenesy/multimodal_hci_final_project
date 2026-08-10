# Week 3 — Speech Input & Output Examples

**Course:** Multimodal Human-Computer Interaction — Week 3 exercises
**Author:** Eugene Lalis Sy

Two small examples exploring speech as an I/O modality in Processing:

## `processing_audio_input_example/`
Offline speech-to-text using [Vosk](https://alphacephei.com/vosk/) piped into Processing over OSC. `speech_reg_osc.py` listens to the mic, runs Vosk recognition, and forwards recognized digits/words as OSC messages to `processing_audio_input/processing_audio_input.pde`, which displays them.

This reuses the same Vosk model as [`miniproject-1-sonic-lockpicker`](../miniproject-1-sonic-lockpicker) — download a Vosk English model and extract it into a `model/` folder here (see that project's README for the exact steps) rather than duplicating the ~70 MB model in both places.

Run: `python3 speech_reg_osc.py`, then run `processing_audio_input.pde` in Processing.

## `processing_text_to_speech_mac/`
Minimal example of macOS speech synthesis from Processing, using `exec()` to shell out to the native `say` command, including inline `[[rate ..]]` / `[[pbas ..]]` embedded speech commands for prosody control.

Run: open `processing_text_to_speech_mac.pde` in Processing and click Run (macOS only).
