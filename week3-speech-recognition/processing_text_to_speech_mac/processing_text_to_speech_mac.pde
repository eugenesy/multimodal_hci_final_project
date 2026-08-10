String macText = "Hello there! I can speak [[rate 90]] very slowly, [[slnc 500]] [[rate 190]] or I can [[pbas +20]] raise my pitch significantly!";

void setup() {
  size(400, 200);
  thread("speakMacTags");
}

void draw() {
  background(255);
  fill(0);
  textAlign(CENTER, CENTER);
  text("Listening to macOS Embedded Commands...", width/2, height/2);
}

void speakMacTags() {
  // macOS 'say' command parses these brackets natively
  String[] cmd = {"say", macText};
  exec(cmd);
}
