import processing.sound.*;
import oscP5.*;
import netP5.*;

AudioIn mic;
Amplitude amp;
FFT fft;

int cursor_x = 20;
int cursor_y = 200;

int bands = 1024; // Resolution of the FFT (higher = more accurate frequency, but slower)
float[] spectrum = new float[bands];
float sampleRate = 44100; // Standard audio sample rate

OscP5 oscP5;
String finalSpeech = "";
String partialSpeech = "";

void setup() {
  size(600, 400);

  
  // 1. Initialize the microphone input
  mic = new AudioIn(this, 0); 
  mic.start();
  
  // 2. Initialize the Amplitude (Volume) analyzer and attach it to the mic
  amp = new Amplitude(this);
  amp.input(mic);
  
  // 3. Initialize the FFT (Pitch) analyzer and attach it to the mic
  fft = new FFT(this, bands);
  fft.input(mic);
  
  // Start oscP5, listening for incoming messages on port 12000
  oscP5 = new OscP5(this, 12000);
}

void draw() {
  background(0);
  fill(255);
  ellipse(cursor_x,cursor_y,30,30);
  
  // --- ANALYZE VOLUME ---
  // analyze() returns a value between 0.0 and 1.0
  float volume = amp.analyze();
  
  // --- ANALYZE PITCH (FREQUENCY) ---
  fft.analyze(spectrum);
  
  // Loop through the frequency bands to find the one with the highest amplitude
  float maxAmp = 0;
  int maxIndex = 0;
  
  for (int i = 0; i < bands; i++) {
    if (spectrum[i] > maxAmp) {
      maxAmp = spectrum[i];
      maxIndex = i;
    }
  }
  
  // Convert the index of the highest band to a frequency in Hertz (Hz)
  // Formula: Index * (Nyquist Frequency) / Total Bands
  float dominantFreq = maxIndex * (sampleRate / 2.0f) / bands;  
  
  // --- DRAW GRAPHICS ---
  
  // 1. Draw Volume Indicator (Central Pulse)
  float diameter = map(volume, 0, 0.5, 50, 300);
  noStroke();
  fill(0, 150, 255, 100);
  ellipse(width/2, height/2 - 50, diameter, diameter);
  fill(0, 150, 255, 200);
  ellipse(width/2, height/2 - 50, diameter * 0.6, diameter * 0.6);

  // 2. Draw Pitch/Frequency Visualization (Bottom Spectrum)
  stroke(255, 100);
  for (int i = 0; i < bands/4; i++) { // Only draw the first quarter (audible range mostly)
    float x = map(i, 0, bands/4, 0, width);
    float h = map(spectrum[i], 0, 0.1, 0, 150);
    line(x, height - 100, x, height - 100 - h);
  }

  // 3. Draw Labels
  fill(255);
  textAlign(LEFT, TOP);
  textSize(14);
  text("VOLUME: " + nfc(volume, 3), 20, 20);
  text("PITCH: " + nfc(dominantFreq, 1) + " Hz", 20, 40);

  // 4. Draw Speech Output
  textAlign(CENTER, CENTER);
  
  // Partial speech (faded)
  if (partialSpeech.length() > 0) {
    textSize(22);
    fill(255, 150);
    text(partialSpeech, width/2, height - 60);
  }
  
  // Final speech (bright and bold)
  if (finalSpeech.length() > 0) {
    textSize(28);
    fill(255, 255, 255);
    text(finalSpeech, width/2, height - 30);
  }
}

// This function fires automatically whenever an OSC message arrives
void oscEvent(OscMessage msg) {
  
  // Check if the message was sent to the "/speech" address (completed sentences)
  if (msg.checkAddrPattern("/speech")) {
    if (msg.checkTypetag("s")) { // "s" means it expects a String argument
      finalSpeech = msg.get(0).stringValue();
      partialSpeech = ""; // Clear the partial text buffer
      println("Final: " + finalSpeech);
    }
  } 
  
  // Check if the message was sent to the "/partial" address (mid-sentence)
  else if (msg.checkAddrPattern("/partial")) {
    if (msg.checkTypetag("s")) {
      partialSpeech = msg.get(0).stringValue();
      //println("Partial: " + partialSpeech);
      if (partialSpeech.equals("right")) {
        cursor_x += 10;
      } else if (partialSpeech.equals("left")){
        cursor_x -= 10;
      }
    }
  }
}
