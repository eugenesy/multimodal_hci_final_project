import sys
import queue
import json
import sounddevice as sd
from vosk import Model, KaldiRecognizer
from pythonosc.udp_client import SimpleUDPClient

import os

# 1. Initialize OSC Client
# We are sending data to our own computer (127.0.0.1) on port 12000
osc_client = SimpleUDPClient("127.0.0.1", 12000)

# 2. Initialize Vosk Model
# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(script_dir, "model") 

try:
    if not os.path.exists(model_path):
        print(f"Error: Model directory not found at {model_path}")
        sys.exit(1)
    model = Model(model_path)
except Exception as e:
    print(f"Failed to load model from '{model_path}'. Check the path.")
    sys.exit(1)

q = queue.Queue()

def audio_callback(indata, frames, time, status):
    if status:
        print(status, file=sys.stderr)
    q.put(bytes(indata))

print("Bridge active. Listening... Speak into your microphone.")

# 3. Start listening and processing audio
try:
    with sd.RawInputStream(samplerate=16000, blocksize=4000, dtype='int16',
                           channels=1, callback=audio_callback):
        
        grammar = '["yes", "no", "start", "stop", "[unk]", "up", "down", "left", "right"]'
        rec = KaldiRecognizer(model, 16000, grammar)
        # rec = KaldiRecognizer(model, 16000)
        
        while True:
            data = q.get()
            
            # AcceptWaveform returns True when a full sentence/pause is detected
            if rec.AcceptWaveform(data):
                result = json.loads(rec.Result())
                text = result.get("text", "")
                if text:
                    print(f"Final: {text}")
                    # Send the completed sentence to Processing at the address "/speech"
                    osc_client.send_message("/speech", text)
            else:
                # Send real-time partial words as they are being spoken
                partial_result = json.loads(rec.PartialResult())
                partial = partial_result.get("partial", "")
                if partial:
                    print(f"Partial: {partial}")
                    
                    # Extract and print the last word only
                    last_partial = partial.split()[-1]
                    print(f"Last Partial: {last_partial}")
                    
                    # Send partials to a different address
                    osc_client.send_message("/partial", partial)

except KeyboardInterrupt:
    print("\nBridge stopped.")
except Exception as e:
    print(type(e).__name__ + ': ' + str(e))

