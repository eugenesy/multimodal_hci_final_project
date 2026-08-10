import processing.serial.*;
import processing.video.*;

Serial myPort;
Movie currentMovie;
String portName = "/dev/cu.usbmodem11201"; // CHANGE to your specific port

// UI States
enum UIState { MENU, PLAYING }
UIState currentState = UIState.MENU;

int selectedMotion = -1; // 1, 2, or 3
boolean isPlaying = false;

// Button dimensions
int buttonWidth = 150;
int buttonHeight = 100;
int buttonSpacing = 50;

void setup() {
  size(900, 600);
  
  // Try to connect to Arduino
  printArray(Serial.list());
  try {
    myPort = new Serial(this, portName, 9600);
    myPort.bufferUntil('\n');
    println("Connected to " + portName);
  } catch (Exception e) {
    println("Could not connect to " + portName + ". Running without hardware.");
  }
}

void draw() {
  background(30);
  
  if (currentState == UIState.MENU) {
    drawMenu();
  } else if (currentState == UIState.PLAYING) {
    drawPlayingScreen();
  }
}

void drawMenu() {
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(48);
  text("TACTILE THEATER - Mini Project 3", width/2, 80);
  
  textSize(24);
  text("Select an experience:", width/2, 160);
  
  // Calculate button positions
  int startX = width/2 - (3 * buttonWidth + 2 * buttonSpacing) / 2;
  
  // Button 1: Rain
  drawButton(startX, 250, buttonWidth, buttonHeight, "1\nRain", 1);
  
  // Button 2: Sky Diving
  drawButton(startX + buttonWidth + buttonSpacing, 250, buttonWidth, buttonHeight, "2\nSky Diving", 2);
  
  // Button 3: Crawling Crabs
  drawButton(startX + 2 * (buttonWidth + buttonSpacing), 250, buttonWidth, buttonHeight, "3\nCrawling Crabs", 3);
  
  // Instructions
  textSize(16);
  fill(150);
  text("Press 1, 2, or 3 | or click buttons", width/2, height - 50);
}

void drawButton(int x, int y, int w, int h, String label, int buttonNum) {
  // Button background
  fill(60);
  stroke(100);
  strokeWeight(2);
  rect(x, y, w, h, 10);
  
  // Button hover effect
  if (mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h) {
    fill(100);
    rect(x, y, w, h, 10);
  }
  
  // Button text
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(14);
  text(label, x + w/2, y + h/2);
}

void drawPlayingScreen() {
  // Draw video
  if (currentMovie != null) {
    image(currentMovie, 0, 0, width, height);
  } else {
    fill(50);
    rect(0, 0, width, height - 100);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(32);
    text("VIDEO LOADING...", width/2, height/2);
  }
  
  // Bottom UI
  fill(30);
  rect(0, height - 100, width, 100);
  
  fill(255);
  textSize(20);
  textAlign(CENTER, CENTER);
  
  switch(selectedMotion) {
    case 1:
      text("Motion 1: Staccato Tap (Bubble Wrap)", width/2, height - 70);
      break;
    case 2:
      text("Motion 2: Deep Compression (Sponge)", width/2, height - 70);
      break;
    case 3:
      text("Motion 3: Jittering Drag (Bumpy Texture)", width/2, height - 70);
      break;
  }
  
  textSize(16);
  fill(150);
  text("Press SPACE to return to menu", width/2, height - 30);
}

void keyPressed() {
  if (currentState == UIState.MENU) {
    if (key == '1') {
      startMotion(1);
    } else if (key == '2') {
      startMotion(2);
    } else if (key == '3') {
      startMotion(3);
    }
  } else if (currentState == UIState.PLAYING) {
    if (key == ' ') {
      stopMotion();
    }
  }
}

void mousePressed() {
  if (currentState == UIState.MENU) {
    int startX = width/2 - (3 * buttonWidth + 2 * buttonSpacing) / 2;
    
    // Check button 1
    if (mouseX > startX && mouseX < startX + buttonWidth && 
        mouseY > 250 && mouseY < 250 + buttonHeight) {
      startMotion(1);
    }
    
    // Check button 2
    if (mouseX > startX + buttonWidth + buttonSpacing && 
        mouseX < startX + 2 * buttonWidth + buttonSpacing && 
        mouseY > 250 && mouseY < 250 + buttonHeight) {
      startMotion(2);
    }
    
    // Check button 3
    if (mouseX > startX + 2 * (buttonWidth + buttonSpacing) && 
        mouseX < startX + 3 * buttonWidth + 2 * buttonSpacing && 
        mouseY > 250 && mouseY < 250 + buttonHeight) {
      startMotion(3);
    }
  }
}

void startMotion(int motionNum) {
  selectedMotion = motionNum;
  currentState = UIState.PLAYING;
  isPlaying = true;
  
  // Load and play video
  String videoFile = "";
  if (motionNum == 1) videoFile = "rain.mp4";
  else if (motionNum == 2) videoFile = "skydiv.mp4";
  else if (motionNum == 3) videoFile = "crab.mp4";
  
  try {
    currentMovie = new Movie(this, videoFile);
    currentMovie.play();
  } catch (Exception e) {
    println("Could not load video: " + videoFile);
  }
  
  // Start tactile motion on separate thread
  thread("runTactileMotion");
}

void stopMotion() {
  if (currentMovie != null) {
    currentMovie.stop();
    currentMovie = null;
  }
  isPlaying = false;
  currentState = UIState.MENU;
}

void runTactileMotion() {
  switch(selectedMotion) {
    case 1:
      playStaccartoTap();
      break;
    case 2:
      playDeepCompression();
      break;
    case 3:
      playJitteringDrag();
      break;
  }
}

void movieEvent(Movie m) {
  m.read();
}

void sendMoveCommand(float x, float y, float z) {
  String cmd = "move " + x + " " + y + " " + z + "\n";
  if (myPort != null) myPort.write(cmd);
}

void sendClawCommand(int theta) {
  String cmd = "rotate " + theta + "\n";
  if (myPort != null) myPort.write(cmd);
}

// ==========================================
// TACTILE MOTION CHOREOGRAPHIES
// ==========================================

void playStaccartoTap() {
  // THE TACTILE MOTION (The Staccato Tap) - BUBBLE WRAP
  // Total duration: ~60 seconds
  // Start (0:00 - 0:12): Light, randomized, infrequent pecks
  // Escalation (0:12 - 0:48): Rapid, erratic tapping as intensity increases
  // Climax (0:48 - 1:00): Rapid-fire taps
  
  sendMoveCommand(0, 110, 30); delay(500); // hover center
  sendClawCommand(180); // bubble wrap face position (rotated 90 degrees completely)
  
  // PHASE 1: Start with infrequent, light taps (12 seconds)
  for(int i = 0; i < 7; i++) {
    int rx = (int)random(-10, 10);
    int ry = (int)random(100, 120);
    sendMoveCommand(rx, ry, 25); delay(50);
    sendMoveCommand(rx, ry, 8); delay(80);   // quick light tap
    sendMoveCommand(rx, ry, 25); delay(1500); // long pause
  }
  
  // PHASE 2: Escalation - increase frequency and force (36 seconds)
  // Gradually decrease inter-tap delays
  int[] escalationDelays = {1200, 1000, 800, 600, 400, 300, 200, 150};
  for(int d : escalationDelays) {
    int stageDuration = 4500; // 4.5 seconds per delay stage
    int loopCount = stageDuration / (100 + d);
    for(int j = 0; j < loopCount; j++) {
      int rx = (int)random(-15, 15);
      int ry = (int)random(100, 120);
      sendMoveCommand(rx, ry, 22); delay(40);
      sendMoveCommand(rx, ry, 5); delay(60);   // faster, more forceful taps
      sendMoveCommand(rx, ry, 25); delay(d);
    }
  }
  
  // PHASE 3: Climax - Rapid-fire taps (12 seconds)
  for(int i = 0; i < 120; i++) {
    int rx = (int)random(-15, 15);
    int ry = (int)random(100, 120);
    sendMoveCommand(rx, ry, 8); delay(50);
    sendMoveCommand(rx, ry, 22); delay(50);
  }
  
  sendClawCommand(90); // reset
  sendMoveCommand(0, 110, 30); delay(200);
}

void playDeepCompression() {
  // THE TACTILE MOTION (The Deep Compression) - SPONGE
  // Timeline aligned to video:
  // - Approach / falling: 0:00 - 0:24 (arm prepares, light approaches)
  // - Impact / enter cloud: ~0:24 (rotate to sponge, start plunge)
  // - Plunge / compression: 0:24 - 0:54 (steady pressure)
  //   * brief partial clear around 0:41-0:42 (release for ~1s)
  // - Exit / release: 0:54 - 1:00 (slow retract, clear by 1:00)

  // START: gentle approach for ~24s
  sendMoveCommand(0, 110, 30);
  int approachLoops = 6; // 6 * ~4s = ~24s
  for (int i = 0; i < approachLoops; i++) {
    int rx = (int)random(-10, 10);
    int ry = 115 + (int)random(-5, 5);
    sendMoveCommand(rx, ry, 28);
    delay(500);
    sendMoveCommand(rx, ry, 22);
    delay(3500);
  }

  // IMPACT at ~24s: rotate to sponge face and prepare to plunge
  sendClawCommand(90); // sponge face position
  delay(500);

  // Begin plunge: gradual descent over ~8.5s
  sendMoveCommand(0, 110, 25); delay(500);
  int descentSteps = 24; // from ~25 -> 2 (deeper compression)
  int descentDelay = 350; // ms per step -> ~8.4s total
  for (int s = 0; s < descentSteps; s++) {
    int z = 25 - s; // step down
    sendMoveCommand(0, 110, z);
    delay(descentDelay);
  }

  // HOLD phase: remaining plunge time until ~54s (approx 21.5s)
  int holdTargetMs = 21540; // ~21.54 seconds
  int heldMs = 0;
  int microHoldDelay = 1500; // baseline hold chunk
  boolean didBriefClear = false;

  while (heldMs < holdTargetMs) {
    // Hold at max compression
    sendMoveCommand(0, 110, 2);
    delay(1200);
    heldMs += 1200;

    // small micro-compression
    sendMoveCommand(0, 110, 5); delay(300);
    sendMoveCommand(0, 110, 2);  delay(200);
    heldMs += 500;

    // At approx 17s into plunge (video ~0:41) do a brief release for ~1s
    if (!didBriefClear && heldMs >= 8000) {
      // brief partial clear
      sendMoveCommand(0, 110, 10); // ease pressure
      delay(1000);
      // reapply compression
      sendMoveCommand(0, 110, 2);
      delay(300);
      heldMs += 1300;
      didBriefClear = true;
    }
  }

  // EXIT: slow retract from 2 up to 30 over ~6s (0:54 - 1:00)
  int exitSteps = 28;
  int exitDelay = 210; // ~28 * 210ms = ~5880ms
  for (int z = 2; z <= 30; z++) {
    sendMoveCommand(0, 110, z);
    delay(exitDelay);
  }

  sendClawCommand(90); // reset
  delay(200);
}

void playJitteringDrag() {
  // THE TACTILE MOTION (The Jittering Drag) - BUMPY FLOWER TEXTURE
  // Total duration: ~60 seconds
  // The Landing (~3s): Rotate to bumpy, make firm contact
  // The Crawl (~57s): Slow drag with high-frequency jitter
  
  sendMoveCommand(0, 110, 30); delay(500); // hover center
  
  // THE LANDING: Rotate to bumpy flower face and make firm contact
  sendClawCommand(0); // bumpy flower face position (rotated 90 degrees completely)
  delay(2500);
  
  sendMoveCommand(-25, 110, 15); delay(1000); // approach from left side
  
  // THE CRAWL: Multiple slow passes with high-frequency jitter (~57 seconds)
  // Multiple forward and backward passes over ~57 seconds
  
  // Pass 1: Slow crawl left to right with intense jitter (20 seconds)
  for(int x = -25; x <= 25; x += 1) {
    sendMoveCommand(x, 110, 10);
    delay(200); // slower base movement
    
    // High-frequency jitter: rapid micro-oscillations
    for(int j = 0; j < 4; j++) {
      int jitterX = x + (int)random(-3, 3);
      int jitterZ = 10 + (int)random(-2, 2);
      sendMoveCommand(jitterX, 110, jitterZ);
      delay(25); // rapid micro-movements
    }
  }
  
  // Pass 2: Reverse crawl right to left (20 seconds)
  for(int x = 25; x >= -25; x -= 1) {
    sendMoveCommand(x, 110, 10);
    delay(200);
    
    for(int j = 0; j < 4; j++) {
      int jitterX = x + (int)random(-4, 4);
      int jitterZ = 10 + (int)random(-2, 2);
      sendMoveCommand(jitterX, 110, jitterZ);
      delay(25);
    }
  }
  
  // Pass 3: Final slow crawl with maximum jitter intensity (17 seconds)
  for(int x = -25; x <= 20; x += 1) {
    sendMoveCommand(x, 110, 10);
    delay(240);
    
    for(int j = 0; j < 5; j++) {
      int jitterX = x + (int)random(-5, 5);
      int jitterZ = 10 + (int)random(-3, 3);
      sendMoveCommand(jitterX, 110, jitterZ);
      delay(20); // very rapid jitter
    }
  }
  
  sendClawCommand(90); // reset
  sendMoveCommand(0, 110, 30); delay(200);
}
