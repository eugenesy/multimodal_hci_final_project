import processing.serial.*;
import java.io.File;

Serial myPort;
String val;
String portName = "/dev/cu.usbmodem21301"; // CHANGE to your specific port (e.g., "/dev/tty.usbmodem...")

String participantName = "Participant_1";

enum State { IDLE, TRAINING, STUDY_PLAYING, STUDY_GUESSING, FINISHED }
State currentState = State.IDLE;

int[] trials = new int[15];
int currentTrialIndex = 0;
int[][] confusionMatrix = new int[5][5];

String[] emojiNames = {
  "1. Heartbeat (Steady double-taps)", 
  "2. Time Bomb (Accelerating taps to explosion)", 
  "3. Rain Cloud (Random gentle taps)", 
  "4. Magic Wand (Fast swoosh & rapid sparkles)", 
  "5. Yo-Yo (Slow drop & instant snap-back)"
};
int currentlyPlayingIndex = -1;

void setup() {
  // Auto-increment participant number based on existing files
  int pNum = 1;
  while (true) {
    File f = new File(sketchPath("Participant_" + pNum + "_confusion_matrix.csv"));
    if (f.exists()) {
      pNum++;
    } else {
      break;
    }
  }
  participantName = "Participant_" + pNum;

  size(600, 400);
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
  background(240);
  fill(0);
  textSize(20);
  textAlign(CENTER, CENTER);
  
  if (currentState == State.IDLE) {
    textSize(24);
    text("HAPTIC EMOJI RECOGNITION STUDY", width/2, 80);
    textSize(18);
    text("Press 'T' for Training Mode", width/2, 160);
    text("Press 'S' to Start Study (15 trials)", width/2, 200);
  } 
  else if (currentState == State.TRAINING) {
    text("TRAINING MODE", width/2, 50);
    textSize(16);
    text("Press 1-5 to play the corresponding haptic stroke:", width/2, 100);
    for(int i=0; i<5; i++) {
      text(emojiNames[i], width/2, 140 + i*30);
    }
    text("Press 'Q' to return to Menu", width/2, height - 50);
  } 
  else if (currentState == State.STUDY_PLAYING) {
    text("STUDY IN PROGRESS", width/2, 80);
    text("Trial " + (currentTrialIndex + 1) + " of 15", width/2, 140);
    text("Playing stroke... Please wait.", width/2, 200);
  } 
  else if (currentState == State.STUDY_GUESSING) {
    text("STUDY IN PROGRESS", width/2, 50);
    text("Trial " + (currentTrialIndex + 1) + " of 15", width/2, 100);
    text("What did you feel?", width/2, 150);
    textSize(16);
    for(int i=0; i<5; i++) {
      text(emojiNames[i], width/2, 190 + i*30);
    }
    text("Press 1, 2, 3, 4, or 5 to record answer.", width/2, height - 50);
  } 
  else if (currentState == State.FINISHED) {
    text("STUDY FINISHED!", width/2, 100);
    text("Check console for the Confusion Matrix.", width/2, 160);
    text("Press 'Q' to return to Menu.", width/2, 220);
  }
}

void keyPressed() {
  if (currentState == State.IDLE) {
    if (key == 't' || key == 'T') currentState = State.TRAINING;
    if (key == 's' || key == 'S') startStudy();
  } else if (currentState == State.TRAINING) {
    if (key == 'q' || key == 'Q') currentState = State.IDLE;
    if (key >= '1' && key <= '5') {
      playEmojiThread(key - '1');
    }
  } else if (currentState == State.STUDY_GUESSING) {
    if (key >= '1' && key <= '5') {
      recordGuessAndNext(key - '1');
    }
  } else if (currentState == State.FINISHED) {
    if (key == 'q' || key == 'Q') currentState = State.IDLE;
  }
}

void startStudy() {
  int index = 0;
  for (int i = 0; i < 5; i++) {
    for (int j = 0; j < 3; j++) {
      trials[index++] = i;
    }
  }
  for (int i = 0; i < 15; i++) {
    int swapIndex = (int)random(15);
    int temp = trials[i];
    trials[i] = trials[swapIndex];
    trials[swapIndex] = temp;
  }
  for (int i = 0; i < 5; i++) {
    for (int j = 0; j < 5; j++) {
      confusionMatrix[i][j] = 0;
    }
  }
  currentTrialIndex = 0;
  currentState = State.STUDY_PLAYING;
  playEmojiThread(trials[currentTrialIndex]);
}

void recordGuessAndNext(int guessedIndex) {
  int actualIndex = trials[currentTrialIndex];
  confusionMatrix[actualIndex][guessedIndex]++;
  
  currentTrialIndex++;
  if (currentTrialIndex >= 15) {
    currentState = State.FINISHED;
    printConfusionMatrix();
  } else {
    currentState = State.STUDY_PLAYING;
    playEmojiThread(trials[currentTrialIndex]);
  }
}

void printConfusionMatrix() {
  String[] shortNames = {"Beat", "Bomb", "Rain", "Wand", "Yo-Yo"};
  
  println("\n=======================================================");
  println("          CONFUSION MATRIX: " + participantName);
  println("=======================================================");
  
  // Create CSV data simultaneously
  String[] csvLines = new String[6];
  csvLines[0] = "Actual/Guessed,Beat,Bomb,Rain,Wand,Yo-Yo";
  
  print(String.format("%-12s |", "Actual\\Guess"));
  for (int i = 0; i < 5; i++) {
    print(String.format(" %-5s |", shortNames[i]));
  }
  println();
  println("-------------------------------------------------------");
  for (int i = 0; i < 5; i++) {
    print(String.format("%-12s |", shortNames[i]));
    
    String csvRow = shortNames[i];
    for (int j = 0; j < 5; j++) {
      print(String.format(" %-5d |", confusionMatrix[i][j]));
      csvRow += "," + confusionMatrix[i][j];
    }
    csvLines[i+1] = csvRow;
    println();
  }
  println("=======================================================\n");
  
  // Save CSV
  String filename = participantName + "_confusion_matrix.csv";
  saveStrings(filename, csvLines);
  println("Saved confusion matrix to: " + filename);
}

void playEmojiThread(int index) {
  currentlyPlayingIndex = index;
  thread("runEmojiPlayback");
}

public void runEmojiPlayback() {
  switch(currentlyPlayingIndex) {
    case 0: playHeartbeat(); break;
    case 1: playTimeBomb(); break;
    case 2: playRain(); break;
    case 3: playWand(); break;
    case 4: playYoYo(); break;
  }
  if (currentState == State.STUDY_PLAYING) {
    currentState = State.STUDY_GUESSING;
  }
}

void sendMoveCommand(float x, float y, float z) {
  String cmd = "move " + x + " " + y + " " + z + "\n";
  if (myPort != null) myPort.write(cmd);
  // println("Sent: " + cmd.trim()); // uncomment for debug
}

void sendClawCommand(int theta) {
  String cmd = "rotate " + theta + "\n";
  if (myPort != null) myPort.write(cmd);
}

void serialEvent(Serial myPort) {
  val = myPort.readStringUntil('\n');
}

// ==========================================
// HAPTIC STROKE CHOREOGRAPHIES
// ==========================================

void playHeartbeat() {
  sendMoveCommand(0, 110, 30); delay(500); // hover center
  sendClawCommand(0); // closed claw for a solid point
  
  // Lub-dub... Lub-dub... Lub-dub
  for(int i = 0; i < 3; i++) {
    // Lub
    sendMoveCommand(0, 110, 5); delay(100); // deep tap
    sendMoveCommand(0, 110, 20); delay(150); // lift slightly
    
    // Dub
    sendMoveCommand(0, 110, 5); delay(100); // deep tap
    sendMoveCommand(0, 110, 30); delay(800); // lift higher and pause
  }
  
  sendClawCommand(90); // reset
}

void playTimeBomb() {
  sendMoveCommand(0, 110, 30); delay(500);
  
  // Accelerating ticking
  int[] dlys = {800, 400, 200, 100};
  for(int d : dlys) {
    sendMoveCommand(0, 110, 10); 
    sendClawCommand(70); // tick squeeze
    delay(100);
    sendMoveCommand(0, 110, 25); 
    sendClawCommand(110); // tick release
    delay(d);
  }
  
  // Explosion: chaotic full-range motion in palm
  for(int i = 0; i < 4; i++) {
    sendMoveCommand(random(-20, 20), random(90, 130), 10);
    sendClawCommand(0); delay(80);
    sendMoveCommand(random(-20, 20), random(90, 130), 30);
    sendClawCommand(180); delay(80);
  }
  
  sendClawCommand(90); delay(100); // reset claw
  sendMoveCommand(0, 110, 30); delay(200);
}

void playRain() {
  sendMoveCommand(0, 110, 30); delay(500);
  
  // Random tapping in palm area
  for(int i = 0; i < 10; i++) {
    int x = (int)random(-20, 20);
    int y = (int)random(90, 130);
    sendMoveCommand(x, y, 30); delay(100);
    
    // As it hits the skin, close the claw slightly to mimic a drop splashing
    sendClawCommand(60); 
    sendMoveCommand(x, y, 10); delay(100);
    
    sendClawCommand(120);
    sendMoveCommand(x, y, 30); delay(100);
  }
  sendClawCommand(90);
}

void playWand() {
  sendMoveCommand(-20, 110, 30); delay(500);
  sendMoveCommand(-20, 110, 10); delay(200);
  sendClawCommand(0); // closed wand
  
  // Swoosh across palm!
  for(int x = -20; x <= 20; x += 8) {
     sendMoveCommand(x, 110, 10);
     delay(80);
  }
  sendMoveCommand(20, 110, 25); delay(200);
  
  // Fairy dust sparkles (rapid Z taps + claw flutters)
  for(int i = 0; i < 6; i++) {
    int rx = 20 + (int)random(-5, 5);
    int ry = 110 + (int)random(-5, 5);
    sendClawCommand((int)random(60, 120));
    sendMoveCommand(rx, ry, 10); delay(60);
    sendMoveCommand(rx, ry, 25); delay(60);
  }
  
  sendClawCommand(90);
  sendMoveCommand(20, 110, 30); delay(200);
}

void playYoYo() {
  sendMoveCommand(-20, 110, 30); delay(500);
  sendMoveCommand(-20, 110, 10); delay(200);
  
  // Slow drop across palm, claw unwinding
  for(int x = -20; x <= 20; x += 5) {
    int clawAngle = (int)map(x, -20, 20, 0, 180);
    sendClawCommand(clawAngle);
    sendMoveCommand(x, 110, 10);
    delay(150);
  }
  
  // Snap back!
  sendClawCommand(0);
  sendMoveCommand(-20, 110, 10); delay(300); 
  
  sendClawCommand(90);
  sendMoveCommand(-20, 110, 30); delay(200);
}
