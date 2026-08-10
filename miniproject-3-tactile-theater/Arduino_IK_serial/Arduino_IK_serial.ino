/* MeArm IK Serial - modified from library by York Hackspace May 2014

Serial commands:

position: move X Y Z
end effector: rotate ANGLE

 */
#include "meArm.h"
#include <Servo.h>

// change these if you use different pins
int basePin = 9;
int shoulderPin = 7;
int elbowPin = 8;
int clawPin = 6; // end effector

MeArm arm;

void setup() {
  Serial.begin(9600);
  arm.begin(basePin, shoulderPin, elbowPin, clawPin);
  delay(100);
  Serial.println("IK_serial ready");
}

void loop() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    if (command.length() > 0) {
      handleSerialCommand(command);
    }
  }
}

void handleSerialCommand(String command) {
  command.trim();
  String lowerCommand = command;
  lowerCommand.toLowerCase();

  if (lowerCommand.startsWith("move ")) {
    moveToXYZCommand(lowerCommand.substring(5));
  } else if (lowerCommand.startsWith("rotate ")) {
    controlClawCommand(lowerCommand.substring(7));
  } else {
    Serial.print("Unknown command: ");
    Serial.println(command);
  }
}

void moveToXYZCommand(String params) {
  params.trim();
  int firstSpace = params.indexOf(' ');
  int secondSpace = params.indexOf(' ', firstSpace + 1);

  if (firstSpace < 0 || secondSpace < 0) {
    Serial.println("Usage: move x y z");
    return;
  }

  int x = params.substring(0, firstSpace).toInt();
  int y = params.substring(firstSpace + 1, secondSpace).toInt();
  int z = params.substring(secondSpace + 1).toInt();

  Serial.print("Moving to: ");
  Serial.print(x);
  Serial.print(", ");
  Serial.print(y);
  Serial.print(", ");
  Serial.println(z);

  // note: moveToXYZ results in jittering
  arm.snapToXYZ(x, y, z);
}

void controlClawCommand(String params) {
  params.trim();
  int spaceIndex = params.indexOf(' ');
  if (params.length() == 0 || spaceIndex >= 0) {
    Serial.println("Usage: rotate angle (0-180)");
    return;
  }

  String angleText = params;
  for (int i = 0; i < angleText.length(); i++) {
    if (!isDigit(angleText.charAt(i))) {
      Serial.println("Usage: rotate angle (0-180)");
      return;
    }
  }

  int angle = angleText.toInt();
  if (angle > 180) {
    Serial.println("Usage: rotate angle (0-180)");
    return;
  }

  Serial.print("Setting claw angle: ");
  Serial.println(angle);
  // convert degrees to radians
  arm.controlClaw(float(angle)*PI/180);
}
