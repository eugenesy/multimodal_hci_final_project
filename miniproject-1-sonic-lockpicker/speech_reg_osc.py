import sys
import queue
import json
import sounddevice as sd
from vosk import Model, KaldiRecognizer
from pythonosc.udp_client import SimpleUDPClient
import os
import time

# 1. Initialize OSC Client
osc_client = SimpleUDPClient("127.0.0.1", 12001)

# 2. Initialize Vosk Model
script_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(script_dir, "model") 

try:
    if not os.path.exists(model_path):
        print(f"Error: Model directory not found at {model_path}")
        sys.exit(1)
    model = Model(model_path)
except Exception as e:
    print(f"Failed to load model. Check path: {e}")
    sys.exit(1)

q = queue.Queue()

def audio_callback(indata, frames, time, status):
    if status:
        print(status, file=sys.stderr)
    q.put(bytes(indata))

# Lockpicker Vocabulary (Numerical strings for recognition)
NUMBERS_MAP = {
    "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4", 
    "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9", "oh": "0"
}

COMMANDS = [
]

VOCAB = COMMANDS + list(NUMBERS_MAP.keys())
grammar = json.dumps(VOCAB)

# --- DYNAMIC BUFFER LOGIC ---
digit_buffer = []
last_digit_time = 0
TIMEOUT_SECONDS = 1.0  # Pause required to send a 3-digit sequence
STALE_TIMEOUT = 3.0    # Clear partial entries if silence persists

print(f"--- SONIC LOCKPICKER: DYNAMIC BRIDGE ---")
print(f"Speak digits clearly. Sequences of 3 or 4 will be sent to the game.")

try:
    with sd.RawInputStream(samplerate=16000, blocksize=4000, dtype='int16',
                           channels=1, callback=audio_callback):
        
        rec = KaldiRecognizer(model, 16000, grammar)
        
        while True:
            now = time.time()
            if digit_buffer:
                # 4 Digits: Send immediately (Maximum length for Hard Mode)
                if len(digit_buffer) == 4:
                    full_code = "".join(digit_buffer)
                    print(f"\n[OSC] SENDING 4-DIGIT CODE: {full_code}")
                    osc_client.send_message("/speech", full_code)
                    digit_buffer = []
                
                # 3 Digits: Wait for a pause to ensure it's not a 4-digit attempt
                elif len(digit_buffer) == 3 and (now - last_digit_time > TIMEOUT_SECONDS):
                    full_code = "".join(digit_buffer)
                    print(f"\n[OSC] SENDING 3-DIGIT CODE: {full_code}")
                    osc_client.send_message("/speech", full_code)
                    digit_buffer = []
                
                # Cleanup: Clear if user stops mid-sequence
                elif now - last_digit_time > STALE_TIMEOUT:
                    print(f"\n[CLEARED] Incomplete sequence: {digit_buffer}")
                    digit_buffer = []

            try:
                data = q.get(timeout=0.1)
            except queue.Empty:
                continue

            if rec.AcceptWaveform(data):
                result = json.loads(rec.Result())
                text = result.get("text", "").lower().strip()
                
                if not text:
                    continue

                words = text.split()
                for word in words:
                    if word in COMMANDS:
                        digit_buffer = [] 
                        print(f"\n[COMMAND] {word.upper()}")
                        osc_client.send_message("/speech", word)
                    
                    elif word in NUMBERS_MAP:
                        digit = NUMBERS_MAP[word]
                        digit_buffer.append(digit)
                        last_digit_time = time.time()
                        print(f" Buffered: {digit_buffer}", end="\r")

except KeyboardInterrupt:
    print("\nBridge stopped.")
except Exception as e:
    print(f"Error: {e}")