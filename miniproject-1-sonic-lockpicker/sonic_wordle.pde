import processing.sound.*;
import oscP5.*;
import netP5.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Collections;
import java.io.File; // <-- ADDED: Needed to check if the save file exists!

// --- SONIC LOCKPICKER: PROGRESSIVE CHALLENGE ---

boolean enableTTS = false; 

int WORD_LENGTH = 3; 
String targetCode = "";
ArrayList<Guess> guesses = new ArrayList<Guess>();
boolean won = false;
int currentLevel = 1; 

// Speedrun Timer Variables
int startTime = 0;
int finishTime = 0;
int levelTransitionTimer = 0; 
int currentDisplayTime = 0; // Global timer for the secondary window to read

// Game States
int STATE_START_MENU = 0;
int STATE_PLAYING = 1;
int STATE_ENTER_NAME = 2;
int STATE_LEADERBOARD = 3;
int gameState = STATE_START_MENU;

String playerName = "";
boolean hardMode = false;
String currentTreasure = ""; 

HashMap<Character, Integer> digitMemory = new HashMap<Character, Integer>();
HashMap<String, String> numberMap = new HashMap<String, String>();
ArrayList<String> currentDigits = new ArrayList<String>(); 

// Assets
SoundFile chestSound;

// The Vault Treasure Bank
String[] treasures = {
  "a single, slightly used AAA battery.",
  "a post-it note that says 'Don't forget to buy milk'.",
  "the missing sock you lost in 2014.",
  "a jar of air labeled 'Premium Mountain Breeze'.",
  "a manual on how to open locks you've already opened.",
  "a USB drive containing only a picture of a potato.",
  "a paperclip bent into the shape of a tiny bicycle.",
  "a DVD of 'Shrek 2' with no disc inside.",
  "a rock that looks vaguely like a celebrity.",
  "a folder of memes that have already gone out of style.",
  "a trophy for 'Participation in Thinking'.",
  "a single grape that has turned into a very sad raisin.",
  "a map leading exactly to where you are standing right now.",
  "an invisible cloak that is actually just an empty hanger.",
  "a rubber chicken with a mysterious secret.",
  "a half-eaten sandwich belonging to the previous developer.",
  "a jar of 'Instant Water' (just add water).",
  "a floppy disk containing a 1-pixel image of the sun.",
  "the remote control you've been looking for since Tuesday.",
  "a 'World's Best Lockpicker' mug that leaks from the bottom.",
  "a spider named Dave who is very surprised to see you.",
  "a bag of 'Gamer Dust' (mostly Cheeto crumbs).",
  "the lost city of Atlantis, but it's just a small LEGO set.",
  "a box of 'Nostalgia' (it's empty, but it feels heavy).",
  "a smartphone with 1% battery and no charger.",
  "a golden ticket that only works for the local bus.",
  "a vintage collection of Pogs.",
  "a bottle of 'Wi-Fi Signal Strength' (highly volatile).",
  "an 'Infinite Loop' that is just a hula hoop.",
  "a legendary 24-karat gold paperclip.",
  "a handwritten apology from the guy who stole your lunch.",
  "a cloud-shaped marshmallow that never melts.",
  "the final boss's business card.",
  "a small mirror reflecting the face of a true hero.",
  "a secret code that gives you... absolutely nothing."
};

class Entry implements Comparable<Entry> {
  String name;
  int time;
  boolean isHard;
  Entry(String n, int t, boolean h) { name = n; time = t; isHard = h; }
  int compareTo(Entry other) { return this.time - other.time; }
}
ArrayList<Entry> leaderboard = new ArrayList<Entry>();

// Audio Engines
SinOsc evenPing;    
SqrOsc oddKnock;    
TriOsc triTone;     
SqrOsc sawTone; 
Env env;            

SinOsc[] histCorrect = new SinOsc[4];
TriOsc[] histMisplaced = new TriOsc[4];
SqrOsc[] histWrong = new SqrOsc[4];
Env[] histEnv = new Env[4];

OscP5 oscP5;
ContextWindow hudWindow; // The secondary window object

class Guess {
  String code;
  int[] statuses; 
  int level;
  Guess(String c, int[] s, int l) { code = c; statuses = s; level = l; }
}

void setup() {
  size(600, 800);
  initNumbers();
  
  // <-- ADDED: Load the saved leaderboard from previous sessions!
  loadLeaderboard(); 
  
  oscP5 = new OscP5(this, 12001);
  
  // Oscillators
  evenPing = new SinOsc(this);
  oddKnock = new SqrOsc(this);
  triTone = new TriOsc(this);
  sawTone = new SqrOsc(this); 
  env = new Env(this);

  for (int i = 0; i < 4; i++) {
    histCorrect[i] = new SinOsc(this);
    histMisplaced[i] = new TriOsc(this);
    histWrong[i] = new SqrOsc(this);
    histEnv[i] = new Env(this);
  }
  
  // Load External Audio
  try {
    chestSound = new SoundFile(this, "chest_opening.mp3");
  } catch (Exception e) {
    println("Warning: chest_opening.mp3 not found in data folder.");
  }

  // --- LAUNCH SECONDARY HUD WINDOW ---
  hudWindow = new ContextWindow();
  PApplet.runSketch(new String[]{"Player HUD"}, hudWindow);
}

void initNumbers() {
  numberMap.put("ZERO", "0"); numberMap.put("0", "0"); numberMap.put("OH", "0");
  numberMap.put("ONE", "1"); numberMap.put("1", "1");
  numberMap.put("TWO", "2"); numberMap.put("2", "2");
  numberMap.put("THREE", "3"); numberMap.put("3", "3");
  numberMap.put("FOUR", "4"); numberMap.put("4", "4");
  numberMap.put("FIVE", "5"); numberMap.put("5", "5");
  numberMap.put("SIX", "6"); numberMap.put("6", "6");
  numberMap.put("SEVEN", "7"); numberMap.put("7", "7");
  numberMap.put("EIGHT", "8"); numberMap.put("8", "8");
  numberMap.put("NINE", "9"); numberMap.put("9", "9");
}

void startRun(boolean hard) {
  hardMode = hard;
  WORD_LENGTH = hardMode ? 4 : 3;
  guesses.clear();
  currentLevel = 1;
  won = false;
  playerName = "";
  currentTreasure = "";
  currentDigits.clear();
  startTime = millis();
  generateNewTarget();
  gameState = STATE_PLAYING;
  thread("welcomeMessage");
}

void generateNewTarget() {
  ArrayList<Integer> pool = new ArrayList<Integer>();
  for(int i=0; i<10; i++) pool.add(i);
  
  targetCode = "";
  for(int i=0; i<WORD_LENGTH; i++) {
    int idx = (int)random(pool.size());
    targetCode += pool.get(idx);
    pool.remove(idx); 
  }
  for (char c = '0'; c <= '9'; c++) digitMemory.put(c, -1);
}

void welcomeMessage() {
  String digitCount = hardMode ? "four" : "three";
  waitSayForce("Guess " + digitCount + " numbers. Level 1. Listen to the sequence of sounds.");
}

void waitSayForce(String text) {
  try { Process p = Runtime.getRuntime().exec("say \"" + text + "\""); p.waitFor(); } catch (Exception e) {}
}

void playTutorial() {
  waitSayForce("Lockpicker tutorial.");
  waitSayForce("Correct position. Smooth high tone."); triggerNote(2, 1, 1.5, 3); delay(2000);
  waitSayForce("Wrong position. Flute like tone."); triggerNote(1, 1, 1.5, 3); delay(2000);
  waitSayForce("Wrong number. Low buzz."); triggerNote(0, 1, 1.5, 3); delay(2000);
}

void oscEvent(OscMessage msg) {
  if (!msg.checkAddrPattern("/speech") || !msg.checkTypetag("s")) return; 
  String t = msg.get(0).stringValue().toUpperCase().trim();
  if (t.length() == 0) return; 

  if (t.equals("RESET") || t.equals("RESTART")) { gameState = STATE_START_MENU; return; }
  
  if (gameState == STATE_PLAYING && !won) {
    if (t.equals("STATUS")) { thread("playStatus"); return; }
    
    if (t.length() == WORD_LENGTH && t.matches("\\d+")) {
      submitGuess(t);
    }
  }
}

void mousePressed() {
  if (gameState == STATE_START_MENU) {
    if (mouseX > width/2-150 && mouseX < width/2+150) {
      if (mouseY > 300 && mouseY < 360) startRun(false); 
      if (mouseY > 380 && mouseY < 440) startRun(true);  
      if (mouseY > 460 && mouseY < 520) thread("playTutorial");
    }
  }
}

void keyPressed() {
  if (gameState == STATE_PLAYING) {
    // Keyboard Debugging: Type numbers directly
    if (key >= '0' && key <= '9') {
      currentDigits.add(str(key));
      if (currentDigits.size() == WORD_LENGTH) {
        String code = "";
        for (String s : currentDigits) code += s;
        submitGuess(code);
        currentDigits.clear();
      }
    } else if (key == BACKSPACE && currentDigits.size() > 0) {
      currentDigits.remove(currentDigits.size() - 1);
    }
  } else if (gameState == STATE_ENTER_NAME) {
    if (key == ENTER || key == RETURN) {
      String trimmedName = playerName.trim();
      if (trimmedName.length() > 0) {
        leaderboard.add(new Entry(trimmedName, finishTime, hardMode));
        Collections.sort(leaderboard); 
        
        // <-- ADDED: Save the leaderboard to a file when a player hits ENTER!
        saveLeaderboard(); 
        
        gameState = STATE_LEADERBOARD;
      }
    } else if (key == BACKSPACE) {
      if (playerName.length() > 0) playerName = playerName.substring(0, playerName.length()-1);
    } else if (Character.isLetterOrDigit(key) || key == ' ') {
      if (playerName.length() < 12) playerName += Character.toUpperCase(key);
    }
  } else if (gameState == STATE_LEADERBOARD && key == ' ') {
    gameState = STATE_START_MENU;
  }
}

void submitGuess(String code) {
  int gLen = code.length();
  int[] s = new int[gLen];
  boolean[] tUsed = new boolean[gLen], gUsed = new boolean[gLen];
  
  for (int i=0; i<gLen; i++) {
    if (code.charAt(i) == targetCode.charAt(i)) { s[i]=2; tUsed[i]=true; gUsed[i]=true; }
  }
  for (int i=0; i<gLen; i++) {
    if (!gUsed[i]) {
      for (int j=0; j<gLen; j++) {
        if (!tUsed[j] && code.charAt(i) == targetCode.charAt(j)) { s[i]=1; tUsed[j]=true; break; }
      }
    }
  }
  
  for(int i=0; i<gLen; i++) {
    char c = code.charAt(i);
    if (s[i] > digitMemory.get(c)) digitMemory.put(c, s[i]);
  }

  guesses.add(new Guess(code, s, currentLevel));
  currentDigits.clear(); 
  
  if (code.equals(targetCode)) {
    if (currentLevel < 3) {
      levelTransitionTimer = millis();
      thread("nextLevelTransition");
    }
    else {
      won = true;
      finishTime = (millis() - startTime) / 1000;
      currentDisplayTime = finishTime;
      currentTreasure = treasures[(int)random(treasures.length)];
      gameState = STATE_ENTER_NAME; 
      thread("playFinalWinVoice");  
    }
  } else {
    thread("playLastGuess");
  }
}

void nextLevelTransition() {
  for(int i=0; i<WORD_LENGTH; i++) triggerNote(2, i, 1.5, WORD_LENGTH);
  delay(2000);
  
  currentLevel++;
  generateNewTarget();
  String mode = (currentLevel == 2 ? "Arpeggio" : "Concurrent");
  waitSayForce("Level " + currentLevel + ". Listen to the " + mode + ".");
}

void playFinalWinVoice() {
  if (chestSound != null) chestSound.play();
  for(int i=0; i<WORD_LENGTH; i++) triggerNote(2, i, 2.5, WORD_LENGTH);
  delay(1500); 
  waitSayForce("All levels cleared! Total speedrun time, " + finishTime + " seconds.");
  waitSayForce("The vault swings open. Inside you find... " + currentTreasure);
  waitSayForce("Congratulations. Please enter your name on the keyboard.");
}

void triggerNote(int status, int pos, float sustainTime, int totalLen) {
  float pan = map(pos, 0, totalLen-1, -1.0, 1.0); 

  if (status == 2) { 
    histCorrect[pos].play(); 
    histCorrect[pos].freq(1100); 
    histCorrect[pos].pan(pan);
    histCorrect[pos].amp(0.08); 
    histEnv[pos].play(histCorrect[pos], 0.05, sustainTime, 0.4, 0.8); 
  } else if (status == 1) { 
    histMisplaced[pos].play(); 
    histMisplaced[pos].freq(523); 
    histMisplaced[pos].pan(pan);
    histMisplaced[pos].amp(0.1); 
    histEnv[pos].play(histMisplaced[pos], 0.05, sustainTime * 0.5, 0.2, 0.4); 
  } else { 
    histWrong[pos].play(); 
    histWrong[pos].freq(120); 
    histWrong[pos].pan(pan);
    histWrong[pos].amp(0.06); 
    histEnv[pos].play(histWrong[pos], 0.01, sustainTime * 0.15, 0.1, 0.1); 
  }
}

void playProgressiveFeedback(Guess g, int level) {
  int len = g.code.length();
  if (level == 1) { 
    for (int j = 0; j < len; j++) { triggerNote(g.statuses[j], j, 0.6, len); delay(800); }
  } else if (level == 2) { 
    for (int j = 0; j < len; j++) { triggerNote(g.statuses[j], j, 1.5, len); delay(400); }
    delay(1500);
  } else { 
    for (int j = 0; j < len; j++) triggerNote(g.statuses[j], j, 1.5, len);
    delay(2200); 
  }
}

void playLastGuess() {
  if (guesses.size() == 0) return;
  Guess g = guesses.get(guesses.size() - 1);
  StringBuilder sb = new StringBuilder();
  for(int i=0; i<g.code.length(); i++) sb.append(g.code.charAt(i)).append(". ");
  waitSay(sb.toString());
  playProgressiveFeedback(g, g.level);
}

void playStatus() {
  String correct = "", misplaced = "";
  for(char c='0'; c<='9'; c++) {
    int s = digitMemory.get(c);
    if (s == 2) correct += c + " ";
    else if (s == 1) misplaced += c + " ";
  }
  waitSay("Correct numbers: " + (correct.equals("") ? "none" : correct));
  waitSay("Misplaced numbers: " + (misplaced.equals("") ? "none" : misplaced));
}

void waitSay(String text) {
  if (!enableTTS) return;
  try { Process p = Runtime.getRuntime().exec("say \"" + text + "\""); p.waitFor(); } catch (Exception e) {}
}

void draw() {
  background(25);
  
  if (gameState == STATE_PLAYING && !won) {
    currentDisplayTime = (millis() - startTime) / 1000;
  }
  
  if (gameState == STATE_START_MENU) {
    float pulse = 1.0 + 0.05 * sin(frameCount * 0.05);
    pushMatrix();
    translate(width/2, 160);
    scale(pulse);
    fill(255); textSize(45); textAlign(CENTER, CENTER); text("SONIC LOCKPICKER", 0, 0);
    popMatrix();
    
    textSize(20); fill(150); text("Progressive Speedrun Challenge", width/2, 210);
    
    drawBtn(width/2, 330, "EASY MODE (3 Digits)", color(83, 141, 78));
    drawBtn(width/2, 410, "HARD MODE (4 Digits)", color(181, 159, 59));
    drawBtn(width/2, 490, "LEARN SOUNDS", color(58, 58, 60));
  } else if (gameState == STATE_PLAYING) {
    
    if (millis() - levelTransitionTimer < 1000 && levelTransitionTimer > 0) {
      fill(83, 141, 78, 150); rect(0, 0, width, height);
      fill(255); textSize(60); textAlign(CENTER, CENTER); text("LEVEL CLEARED!", width/2, height/2);
    } else {
      fill(255); textSize(30); textAlign(CENTER, TOP); 
      text("LEVEL " + currentLevel + " (" + (hardMode?"Hard":"Easy") + ") | " + currentDisplayTime + "s", width/2, 30);
      
      int boxSize = 65; int spacing = 10;
      int startY = 120;
      int maxRows = 8;
      int startIdx = max(0, guesses.size() - (maxRows - 1));
      
      for (int i = 0; i < maxRows; i++) {
        int idx = startIdx + i;
        if (idx > guesses.size()) break; 
        
        float rowW = (WORD_LENGTH * boxSize) + ((WORD_LENGTH-1) * spacing);
        float startX = width/2 - rowW/2;
        
        if (idx < guesses.size()) {
          Guess g = guesses.get(idx);
          for (int j = 0; j < g.statuses.length; j++) {
            float x = startX + j*(boxSize+spacing); float y = startY + i*(boxSize+spacing);
            if (g.statuses[j] == 2) fill(83, 141, 78);      
            else if (g.statuses[j] == 1) fill(181, 159, 59); 
            else fill(58, 58, 60);                           
            rect(x, y, boxSize, boxSize, 12);
            fill(255); textSize(30); textAlign(CENTER, CENTER); text(g.code.charAt(j), x+boxSize/2, y+boxSize/2);
          }
        } else if (idx == guesses.size() && !won) {
          for (int j = 0; j < WORD_LENGTH; j++) {
            float x = startX + j*(boxSize+spacing); float y = startY + i*(boxSize+spacing);
            noFill(); stroke(100); strokeWeight(2);
            rect(x, y, boxSize, boxSize, 12);
            if (j < currentDigits.size()) {
              fill(255); textSize(30); textAlign(CENTER, CENTER);
              text(currentDigits.get(j), x+boxSize/2, y+boxSize/2);
            }
          }
        }
      }
    }
  } else if (gameState == STATE_ENTER_NAME) {
    fill(83, 141, 78); textAlign(CENTER, CENTER); textSize(46); text("VAULT OPENED!", width/2, height/2 - 200);
    fill(255); textSize(24); text("Inside you found:", width/2, height/2 - 130);
    fill(181, 159, 59); textSize(28); text(currentTreasure, width/2, height/2 - 90);
    fill(255); textSize(22); text("Speedrun Time: " + finishTime + " seconds", width/2, height/2 - 20);
    fill(150); textSize(20); text("Enter your name:", width/2, height/2 + 60);
    fill(255); textSize(40); text(playerName + "_", width/2, height/2 + 105);
    fill(100); textSize(16); text("Press ENTER to submit to Leaderboard", width/2, height/2 + 180);
  } else if (gameState == STATE_LEADERBOARD) {
    fill(255, 200, 0); textSize(40); textAlign(CENTER, TOP); text("LEADERBOARD", width/2, 60);
    textSize(22);
    for (int i = 0; i < min(10, leaderboard.size()); i++) {
      Entry e = leaderboard.get(i);
      textAlign(LEFT); text((i+1) + ". " + e.name + (e.isHard?" [H]":""), 100, 150 + i*45);
      textAlign(RIGHT); text(e.time + "s", width-100, 150 + i*45);
    }
    fill(100); textAlign(CENTER, BOTTOM); text("Press SPACEBAR for Menu", width/2, height-50);
  }
}

void drawBtn(float x, float y, String label, color col) {
  boolean isHover = (mouseX > x-150 && mouseX < x+150 && mouseY > y-30 && mouseY < y+30);
  noStroke(); fill(0, 50); rect(x-146, y-26, 300, 60, 12);
  color finalCol = col; float scaleFactor = 1.0;
  if (isHover) { finalCol = color(red(col) + 30, green(col) + 30, blue(col) + 30); scaleFactor = 1.05; }
  pushMatrix(); translate(x, y); scale(scaleFactor);
  fill(finalCol); rect(-150, -30, 300, 60, 10);
  fill(255); textSize(20); textAlign(CENTER, CENTER); text(label, 0, 0);
  popMatrix();
}

// =========================================================
// ADDED: FILE SAVE AND LOAD FUNCTIONS FOR LEADERBOARD
// =========================================================

void loadLeaderboard() {
  File f = new File(dataPath("leaderboard.csv"));
  if (f.exists()) {
    Table table = loadTable("leaderboard.csv", "header");
    for (TableRow row : table.rows()) {
      String n = row.getString("name");
      int t = row.getInt("time");
      boolean h = row.getInt("isHard") == 1;
      leaderboard.add(new Entry(n, t, h));
    }
    Collections.sort(leaderboard);
  }
}

void saveLeaderboard() {
  Table table = new Table();
  table.addColumn("name");
  table.addColumn("time");
  table.addColumn("isHard");
  
  for (Entry e : leaderboard) {
    TableRow row = table.addRow();
    row.setString("name", e.name);
    row.setInt("time", e.time);
    row.setInt("isHard", e.isHard ? 1 : 0);
  }
  
  // Saves automatically inside your sketch's /data folder
  saveTable(table, "data/leaderboard.csv"); 
}

// =========================================================
// SECONDARY WINDOW CLASS: LARGE WINDOW HUD & LEADERBOARD
// =========================================================
class ContextWindow extends PApplet {
  
  public void settings() {
    size(1300, 900); 
  }
  
  public void setup() {
    surface.setTitle("Player HUD & Leaderboard");
  }
  
  public void draw() {
    background(20);
    
    float scaleFactor = min((float)width / 650.0f, (float)height / 450.0f);
    
    pushMatrix();
    translate(width/2.0f - (650.0f * scaleFactor)/2.0f, height/2.0f - (450.0f * scaleFactor)/2.0f);
    scale(scaleFactor);
    
    // ==========================================
    // LEFT PANE: STATUS & RULES (Width: 350)
    // ==========================================
    int leftCenter = 175; 
    
    fill(255, 200, 0);
    textAlign(CENTER, TOP);
    textSize(24);
    text("CURRENT STATUS", leftCenter, 20);
    
    fill(255);
    textSize(18);
    if (gameState == STATE_START_MENU) {
      text("Waiting in Main Menu...", leftCenter, 60);
    } else if (gameState == STATE_PLAYING) {
      text("Mode: " + (hardMode ? "Hard (4 Digits)" : "Easy (3 Digits)"), leftCenter, 55);
      text("Level: " + currentLevel + " / 3", leftCenter, 80);
      text("Timer: " + currentDisplayTime + " seconds", leftCenter, 105);
    } else if (gameState == STATE_ENTER_NAME || gameState == STATE_LEADERBOARD) {
      text("Run Finished: " + finishTime + "s", leftCenter, 60);
    }
    
    stroke(100); strokeWeight(1);
    line(20, 140, 330, 140);
    
    textAlign(LEFT, TOP);
    int y = 160;
    
    fill(150); textSize(14);
    text("VOICE COMMANDS:", 20, y); y += 22;
    fill(200);
    text("• Say \"Status\" to review known digits.", 20, y); y += 20;
    text("• Say \"Reset\" to abort the run.", 20, y); y += 35;
    
    fill(150);
    text("AUDIO CLUES:", 20, y); y += 25;
    
    fill(83, 141, 78); // Green
    text("■ High Tone: Correct digit & spot", 20, y); y += 25;
    
    fill(181, 159, 59); // Yellow
    text("■ Mid Tone: Wrong spot", 20, y); y += 25;
    
    fill(100); // Gray
    text("■ Low Buzz: Number not in lock", 20, y); y += 35;
    
    fill(150);
    text("LEVELS:", 20, y); y += 22;
    fill(200);
    text("1. Sequence  ->  2. Arpeggio  ->  3. Concurrent", 20, y);

    // ==========================================
    // VERTICAL DIVIDER LINE
    // ==========================================
    stroke(100); strokeWeight(1);
    line(350, 20, 350, 430);

    // ==========================================
    // RIGHT PANE: LIVE LEADERBOARD
    // ==========================================
    int rightCenter = 350 + (650 - 350) / 2;
    int listStartX = 380;
    int listEndX = 620;
    
    fill(255, 200, 0);
    textAlign(CENTER, TOP);
    textSize(24);
    text("LEADERBOARD", rightCenter, 20);
    
    int boardY = 70;
    textSize(16);
    
    if (leaderboard.size() == 0) {
      fill(150);
      textAlign(CENTER, TOP);
      text("No entries yet.", rightCenter, boardY);
    } else {
      for (int i = 0; i < min(10, leaderboard.size()); i++) {
        Entry e = leaderboard.get(i);
        
        fill(255);
        textAlign(LEFT, TOP);
        text((i + 1) + ". " + e.name + (e.isHard ? " [H]" : ""), listStartX, boardY);
        
        textAlign(RIGHT, TOP);
        text(e.time + "s", listEndX, boardY);
        
        boardY += 30; 
      }
    }
    popMatrix(); 
  }
}
