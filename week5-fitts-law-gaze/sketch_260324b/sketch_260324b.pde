float targetX, targetY;
float targetSize;
long startTime;
int mouseStartX, mouseStartY;
int trialCount = 0;
Table table;

void setup() {
  size(800, 600);
  table = new Table();
  table.addColumn("trial");
  table.addColumn("targetWidth");
  table.addColumn("targetDistance");
  table.addColumn("reactionTime_ms");
}

void draw() {
  background(255);
  fill(255, 0, 0);
  noStroke();
  ellipse(targetX, targetY, targetSize, targetSize);
}
  
void spawnTarget() {
  targetSize = random(10, 60);
  targetX = random(targetSize, width - targetSize);
  targetY = random(targetSize, height - targetSize);
  startTime = millis();
  mouseStartX = mouseX;
  mouseStartY = mouseY;
}

void keyPressed() {
  if (key == ' ') {
    spawnTarget();
  }
}

void mousePressed() {
  float d = dist(mouseX, mouseY, targetX, targetY);
  if (d < targetSize / 2) {
    long reactionTime = millis() - startTime;
    float distance = dist(mouseStartX,mouseStartY,targetX,targetY);

    TableRow newRow = table.addRow();
    newRow.setInt("trial", trialCount);
    newRow.setFloat("targetWidth", targetSize);
    newRow.setFloat("targetDistance", distance);
    newRow.setFloat("reactionTime_ms", reactionTime);
    saveTable(table, "reaction_data.csv");

    println(str(reactionTime) + " ms");
    println(str(distance) + " pixels");
    println("Hit!");
    trialCount++;
    spawnTarget(); 
  }
}