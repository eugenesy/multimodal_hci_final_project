import cv2
import mediapipe as mp
import numpy as np
import json
import time

t = 0

BaseOptions = mp.tasks.BaseOptions
FaceLandmarker = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

model_path = 'face_landmarker.task'

options = FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=model_path),
    running_mode=VisionRunningMode.VIDEO)

def get_eye_vector(landmarks):
    """Calculates the relative position of the iris center within the eye corners."""
    # Left Eye: Iris center (468), Inner corner (133), Outer corner (33)
    l_iris = np.array([landmarks[468].x, landmarks[468].y])
    l_inner = np.array([landmarks[133].x, landmarks[133].y])
    l_outer = np.array([landmarks[33].x, landmarks[33].y])
    
    # Right Eye: Iris center (473), Inner corner (362), Outer corner (263)
    r_iris = np.array([landmarks[473].x, landmarks[473].y])
    r_inner = np.array([landmarks[362].x, landmarks[362].y])
    r_outer = np.array([landmarks[263].x, landmarks[263].y])

    # Relative offset: (Iris - Midpoint of corners)
    l_vec = l_iris - (l_inner + l_outer) / 2
    r_vec = r_iris - (r_inner + r_outer) / 2
    
    avg_vec = (l_vec + r_vec) / 2
    return avg_vec.tolist()

# Define 9 Calibration Points (normalized ratios 0.0 to 1.0)
ratio_points = []
for i in [0.1, 0.5, 0.9]:
    for j in [0.1, 0.5, 0.9]:
        ratio_points.append((j, i))

calib_data = []
current_pt = 0
samples_per_point = 10
current_samples = []

# Initial size placeholders
w, h = 1800, 1169 

# Webcam and window initialization
cap = cv2.VideoCapture(0)
cv2.namedWindow("Calibration", cv2.WND_PROP_FULLSCREEN)
cv2.setWindowProperty("Calibration", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

with FaceLandmarker.create_from_options(options) as landmarker:
    while current_pt < len(ratio_points):
        ret, frame = cap.read()
        if not ret: break
        frame = cv2.flip(frame, 1)
        
        # DYNAMIC CANVAS: Query actual window size every frame
        _, _, win_w, win_h = cv2.getWindowImageRect("Calibration")
        if win_w > 0 and win_h > 0:
            w, h = win_w, win_h
            
        canvas = np.zeros((h, w, 3), dtype=np.uint8)
        
        # Calculate target pixel position based on current window size
        target_ratio = ratio_points[current_pt]
        tx, ty = int(target_ratio[0] * w), int(target_ratio[1] * h)
        
        # Landmark detection
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        t += 1
        result = landmarker.detect_for_video(mp_image, t)
        
        face_detected = (result.face_landmarks is not None and len(result.face_landmarks) > 0)
        
        # UI Text and Status
        cv2.putText(canvas, f"Point {current_pt+1}/{len(ratio_points)}", (50, 50), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        
        status_color = (0, 255, 0) if face_detected else (0, 0, 255)
        status_text = "FACE DETECTED" if face_detected else "NO FACE DETECTED"
        cv2.putText(canvas, status_text, (50, 100), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2)

        # Instructions
        instr = "Focus on the red dot and press SPACE to start capture" if not current_samples else f"Capturing... {len(current_samples)}/{samples_per_point}"
        cv2.putText(canvas, instr, (w//2-400, h - 50), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

        # Draw target
        color = (0, 0, 255) if not current_samples else (0, 255, 255)
        cv2.circle(canvas, (tx, ty), 30, color, -1)
        if current_samples:
            progress = len(current_samples) / samples_per_point
            cv2.ellipse(canvas, (tx, ty), (40, 40), 0, 0, 360 * progress, (0, 255, 0), 5)
        
        cv2.imshow("Calibration", canvas)
        key = cv2.waitKey(1)
        
        if key == 27: # ESC
            print("Calibration cancelled.")
            break
            
        if face_detected:
            if key == ord(' ') or (current_samples and len(current_samples) < samples_per_point):
                vec = get_eye_vector(result.face_landmarks[0])
                current_samples.append(vec)
                
                if len(current_samples) == samples_per_point:
                    avg_vec = np.mean(current_samples, axis=0).tolist()
                    # Store absolute pixel coordinate at time of capture
                    calib_data.append({"gaze_vec": avg_vec, "screen_pt": [tx, ty]})
                    print(f"Captured Point {current_pt+1}: {avg_vec}")
                    current_pt += 1
                    current_samples = []

if current_pt == len(ratio_points):
    with open("gaze_calibration.json", "w") as f:
        json.dump(calib_data, f)
    print(f"Calibration successful! Saved {len(ratio_points)} points to gaze_calibration.json")

cap.release()
cv2.destroyAllWindows()