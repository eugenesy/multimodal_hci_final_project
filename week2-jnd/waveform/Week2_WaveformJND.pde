import processing.sound.*;

SinOsc sinOsc;
SqrOsc sqrOsc;

// Core Study Variables
float testFrequency = 800; 
float difference = 0.50;   // Blend ratio difference
float step = 0.08;         // Blend ratio step
int reversal_count = 0;
int total_reversals = 0;   
char last_response = ' ';
float[] reversal_point_diff = {0.0, 0.0, 0.0, 0.0};
float final_threshold = 0.0; 

// History arrays for graphing
float[] historyDiff = new float[1000];
int[] historyReversal = new int[1000];
int historyCount = 0;

// State Machine variables
int STATE_IDLE = 0;
int STATE_DELAY = 1;
int STATE_PLAYING_REF = 2;
int STATE_INTER_DELAY = 3;
int STATE_PLAYING_COMP = 4;
int STATE_WAIT_RESPONSE = 5;
int STATE_DONE = 6;
int currentState = STATE_IDLE;

// Timing variables
int timerStart = 0;
int delayDuration = 0;
int toneDurationRef = 300;
int toneDurationComp = 300;

void setup(){
  size(800, 600);
  
  sinOsc = new SinOsc(this);
  sqrOsc = new SqrOsc(this);
  sinOsc.freq(testFrequency); 
  sqrOsc.freq(testFrequency); 
}

void draw(){
  // 1. START SCREEN
  if (currentState == STATE_IDLE) {
    background(255);
    fill(0);
    textAlign(CENTER, CENTER);
    
    textSize(28);
    text("Waveform Harmonic Blend JND Study", width/2, height/2 - 100);
    
    textSize(18);
    text("Instructions:", width/2, height/2 - 40);
    text("1. You will hear TWO sounds separated by a brief pause.", width/2, height/2 - 10);
    text("2. Did the second sound have a different texture from the first?", width/2, height/2 + 20);
    text("3. Press 'Y' for Yes, 'N' for No.", width/2, height/2 + 50);
    
    textSize(20);
    fill(0, 100, 200);
    text("Press the SPACEBAR to begin.", width/2, height/2 + 120);
  } 
  
  // 2. END SCREEN (THE REPORT)
  else if (currentState == STATE_DONE) {
    background(240, 240, 240); 
    fill(0);
    textAlign(LEFT, TOP); 
    
    textSize(28);
    text("Test Complete - Results Report", 40, 40);
    
    textSize(18);
    text("Parameter Tested: Square Wave Blend Ratio", 40, 90);
    text("Frequency: " + int(testFrequency) + " Hz", 40, 130);
    text("Terminating Condition: Step size < 0.005", 40, 170);
    text("Total Reversals Logged: " + total_reversals, 40, 210);
    
    textSize(22);
    fill(200, 0, 0); 
    text("JND Threshold: " + nf(final_threshold, 1, 4), 40, 260);
    
    textSize(14);
    fill(100);
    text("(Average of the last 4 reversal points)", 40, 290);
    
    drawGraph();
  } 
  
  // 3. ONGOING TEST SCREEN
  else {
    background(150, 220, 150);
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(36);
    text("Ongoing test...", width/2, height/2 - 40);
    
    // Debug info
    // textAlign(LEFT, TOP);
    // textSize(12);
    // text("Debug Blend: " + nf(difference, 1, 4), 10, 10);
    // text("Step: " + nf(step, 1, 4), 10, 25);
    
    int elapsed = millis() - timerStart;

    if (currentState == STATE_DELAY) {
      if (elapsed >= delayDuration) {
        playReference();
        currentState = STATE_PLAYING_REF;
        timerStart = millis(); 
      }
    } 
    else if (currentState == STATE_PLAYING_REF) {
      if (elapsed >= toneDurationRef) {
        stopReference();
        currentState = STATE_INTER_DELAY;
        timerStart = millis(); 
      }
    }
    else if (currentState == STATE_INTER_DELAY) {
      if (elapsed >= 500) {
        playComparison();
        currentState = STATE_PLAYING_COMP;
        timerStart = millis();
      }
    }
    else if (currentState == STATE_PLAYING_COMP) {
      if (elapsed >= toneDurationComp) {
        stopComparison();
        currentState = STATE_WAIT_RESPONSE;
        timerStart = millis(); 
      }
    }
    else if (currentState == STATE_WAIT_RESPONSE) {
      textAlign(CENTER, CENTER);
      textSize(24);
      text("Did these sound different?", width/2, height/2 + 20);
      textSize(18);
      text("Press Y for Yes, N for No", width/2, height/2 + 60);
    }
  }
}

void playReference() {
  sinOsc.amp(1.0); 
  sqrOsc.amp(0.0);
  sinOsc.play();
  sqrOsc.play();
}

void stopReference() {
  sinOsc.stop(); 
  sqrOsc.stop();
}

void playComparison() {
  sinOsc.amp(1.0 - difference);
  sqrOsc.amp(difference);
  sinOsc.play();
  sqrOsc.play();
}

void stopComparison() {
  sinOsc.stop();
  sqrOsc.stop();
}

void keyPressed(){
  if (key == ' ' && currentState == STATE_IDLE) {
    startNextTrial();
  } 
  else if (key == 'y' || key == 'Y') {
    if (currentState == STATE_WAIT_RESPONSE || currentState == STATE_PLAYING_COMP || currentState == STATE_PLAYING_REF || currentState == STATE_INTER_DELAY) {
      if (currentState == STATE_PLAYING_COMP || currentState == STATE_PLAYING_REF) stopComparison();
      processResponse('y');
    }
  }
  else if (key == 'n' || key == 'N') {
    if (currentState == STATE_WAIT_RESPONSE || currentState == STATE_PLAYING_COMP || currentState == STATE_PLAYING_REF || currentState == STATE_INTER_DELAY) {
      if (currentState == STATE_PLAYING_COMP || currentState == STATE_PLAYING_REF) stopComparison();
      processResponse('n');
    }
  }
}

void startNextTrial() {
  if (reversal_count > 2) {
    if (step < 0.005) { 
      calculateThreshold(); 
      currentState = STATE_DONE;
      return;
    }
    step = step / 2.0;
    reversal_count = 0;
  }

  if (last_response == 'n') {
    difference += step;
  } else if (last_response == 'y') {
    difference -= step;
  }
  
  difference = constrain(difference, 0.0, 1.0); 
  
  delayDuration = int(random(1000, 3000));
  currentState = STATE_DELAY;
  timerStart = millis();
}

void processResponse(char resp) {
  if (historyCount < historyDiff.length) {
    historyDiff[historyCount] = difference;
    historyReversal[historyCount] = 0; 
  }

  if (resp == 'y') {
    if (last_response == 'n') {
      reversal_count += 1;
      total_reversals += 1;
      add_to_queue(difference);
      if (historyCount < historyDiff.length) historyReversal[historyCount] = 1; 
    }
    last_response = 'y';
  } 
  else if (resp == 'n') {
    if (last_response == 'y') {
      reversal_count += 1;
      total_reversals += 1;
      add_to_queue(difference);
      if (historyCount < historyDiff.length) historyReversal[historyCount] = 1;
    }
    last_response = 'n';
  }
  
  if (historyCount < historyDiff.length) historyCount++;
  
  startNextTrial();
}

void add_to_queue(float v){
  arrayCopy(reversal_point_diff, 1, reversal_point_diff, 0, 3);
  reversal_point_diff[3] = v;
}

void calculateThreshold() {
  float sum = 0;
  for (int i = 0; i < 4; i++) {
    sum += reversal_point_diff[i];
  }
  final_threshold = sum / 4.0;
}

void drawGraph() {
  if (historyCount == 0) return;
  
  float graphX = 80;
  float graphY = 320;
  float graphW = width - 120;
  float graphH = height - 380;
  
  stroke(0);
  strokeWeight(2);
  line(graphX, graphY, graphX, graphY + graphH);
  line(graphX, graphY + graphH, graphX + graphW, graphY + graphH);
  
  float minDiff = historyDiff[0];
  float maxDiff = historyDiff[0];
  for(int i=0; i<historyCount; i++){
    if(historyDiff[i] < minDiff) minDiff = historyDiff[i];
    if(historyDiff[i] > maxDiff) maxDiff = historyDiff[i];
  }
  
  float padding = (maxDiff - minDiff) * 0.1;
  if (padding == 0) padding = 0.05;
  float yMin = max(0, minDiff - padding);
  float yMax = maxDiff + padding;
  
  float threshY = map(final_threshold, yMin, yMax, graphY + graphH, graphY);
  stroke(100, 100, 255);
  strokeWeight(2);
  for(float x = graphX; x < graphX + graphW; x += 15) {
    line(x, threshY, x + 8, threshY);
  }
  
  stroke(0);
  strokeWeight(2);
  noFill();
  beginShape();
  for(int i=0; i<historyCount; i++) {
    float px = map(i+1, 1, historyCount, graphX, graphX + graphW);
    float py = map(historyDiff[i], yMin, yMax, graphY + graphH, graphY);
    vertex(px, py);
  }
  endShape();
  
  for(int i=0; i<historyCount; i++) {
    float px = map(i+1, 1, historyCount, graphX, graphX + graphW);
    float py = map(historyDiff[i], yMin, yMax, graphY + graphH, graphY);
    if (historyReversal[i] == 1) {
      fill(255, 0, 0);
      noStroke();
      circle(px, py, 10);
    } else {
      fill(0);
      noStroke();
      circle(px, py, 5);
    }
  }
  
  fill(0);
  textSize(14);
  textAlign(CENTER, TOP);
  text("Trial Number", graphX + graphW/2, graphY + graphH + 10);
  
  textAlign(RIGHT, CENTER);
  text(nf(yMax, 1, 3), graphX - 10, graphY);
  text(nf(yMin, 1, 3), graphX - 10, graphY + graphH);
  
  pushMatrix();
  translate(graphX - 55, graphY + graphH/2);
  rotate(-HALF_PI);
  textAlign(CENTER, CENTER);
  text("Square Wave Blend Ratio", 0, 0);
  popMatrix();
}
