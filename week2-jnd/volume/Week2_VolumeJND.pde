import processing.sound.*;

SinOsc sinOsc;

// Core Study Variables
float testFrequency = 800; // Stored as a variable for the report
float volume = 0.5;
float step = 0.05;
int reversal_count = 0;
int total_reversals = 0;   // Track total reversals for the report
char last_response = ' ';
float[] reversal_point_volume = {0.0, 0.0, 0.0, 0.0};
float final_threshold = 0.0; // Stored for the report

// State Machine variables
int STATE_IDLE = 0;
int STATE_DELAY = 1;
int STATE_PLAYING = 2;
int STATE_WAIT_RESPONSE = 3;
int STATE_DONE = 4;
int currentState = STATE_IDLE;

// Timing variables
int timerStart = 0;
int delayDuration = 0;
int toneDuration = 300;     // Tone plays for 300ms
int responseWindow = 2000;  // 2 seconds to press 'y'

void setup(){
  size(600, 400); // Increased size to fit the final report comfortably
  
  sinOsc = new SinOsc(this);
  sinOsc.freq(testFrequency); // Use the variable here
  sinOsc.amp(0.5);
}

void draw(){
  // 1. START SCREEN
  if (currentState == STATE_IDLE) {
    background(255);
    fill(0);
    textAlign(CENTER, CENTER);
    
    textSize(28);
    text("Auditory Detection Study", width/2, 60);
    
    textSize(18);
    text("Instructions:", width/2, 120);
    text("1. A tone will play at random intervals.", width/2, 150);
    text("2. If you hear the tone, press 'Y'.", width/2, 180);
    text("3. If you hear nothing, do NOT press anything.", width/2, 210);
    
    textSize(20);
    fill(0, 100, 200);
    text("Press the SPACEBAR to begin.", width/2, 300);
  } 
  
  // 2. END SCREEN (THE REPORT)
  else if (currentState == STATE_DONE) {
    background(240, 240, 240); // Light gray background for the report
    fill(0);
    textAlign(LEFT, TOP); // Left-aligned for readability
    
    textSize(28);
    text("Test Complete - Results Report", 40, 40);
    
    textSize(18);
    text("Frequency Tested: " + int(testFrequency) + " Hz", 40, 110);
    text("Computer Master Volume: [Record Manually]", 40, 150);
    text("Terminating Condition: Step size < 0.0001", 40, 190);
    text("Total Reversals Logged: " + total_reversals, 40, 230);
    
    // Bold-like effect for the final result
    textSize(22);
    fill(200, 0, 0); // Red text to make it stand out
    text("Absolute Detection Threshold: " + nf(final_threshold, 1, 5), 40, 290);
    
    textSize(14);
    fill(100);
    text("(Average of the last 4 reversal points)", 40, 320);
  } 
  
  // 3. ONGOING TEST SCREEN
  else {
    background(150, 220, 150);
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(36);
    text("Ongoing test...", width/2, height/2);
    
    // Debug info (comment out for actual participants)
    textAlign(LEFT, TOP);
    textSize(12);
    text("Debug Vol: " + nf(volume, 1, 4), 10, 10);
    
    int elapsed = millis() - timerStart;

    if (currentState == STATE_DELAY) {
      if (elapsed >= delayDuration) {
        sinOsc.amp(volume);
        sinOsc.play();
        currentState = STATE_PLAYING;
        timerStart = millis(); 
      }
    } 
    else if (currentState == STATE_PLAYING) {
      if (elapsed >= toneDuration) {
        sinOsc.stop();
        currentState = STATE_WAIT_RESPONSE;
        timerStart = millis(); 
      }
    }
    else if (currentState == STATE_WAIT_RESPONSE) {
      if (elapsed >= responseWindow) {
        processResponse('n');
      }
    }
  }
}

void keyPressed(){
  if (key == ' ' && currentState == STATE_IDLE) {
    startNextTrial();
  } 
  else if (key == 'y' || key == 'Y') {
    if (currentState == STATE_WAIT_RESPONSE || currentState == STATE_PLAYING) {
      if (currentState == STATE_PLAYING) {
        sinOsc.stop();
      }
      processResponse('y');
    }
  }
}

void startNextTrial() {
  if (reversal_count > 2) {
    if (step < 0.0001) {
      calculateThreshold(); // Calculate the final result
      currentState = STATE_DONE;
      return;
    }
    step = step / 2.0;
    reversal_count = 0;
  }

  if (last_response == 'n') {
    volume += step;
  } else if (last_response == 'y') {
    volume -= step;
  }
  
  volume = constrain(volume, 0.0, 1.0);
  
  delayDuration = int(random(1000, 3000));
  currentState = STATE_DELAY;
  timerStart = millis();
}

void processResponse(char resp) {
  if (resp == 'y') {
    if (last_response == 'n') {
      reversal_count += 1;
      total_reversals += 1; // Track for the report
      add_to_queue(volume);
    }
    last_response = 'y';
  } 
  else if (resp == 'n') {
    if (last_response == 'y') {
      reversal_count += 1;
      total_reversals += 1; // Track for the report
      add_to_queue(volume);
    }
    last_response = 'n';
  }
  
  startNextTrial();
}

void add_to_queue(float v){
  arrayCopy(reversal_point_volume, 1, reversal_point_volume, 0, 3);
  reversal_point_volume[3] = v;
}

// Function to calculate the average of the last 4 reversals
void calculateThreshold() {
  float sum = 0;
  for (int i = 0; i < 4; i++) {
    sum += reversal_point_volume[i];
  }
  final_threshold = sum / 4.0;
}
