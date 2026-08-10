import cv2
import mediapipe as mp
import numpy as np
import json
import time
from sklearn.svm import SVR
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

# Simple Kalman filter for 1D smoothing
class KalmanFilter:
    def __init__(self, process_noise=0.03, measurement_noise=0.8, initial_error=1.0):
        self.q = process_noise
        self.r = measurement_noise
        self.p = initial_error
        self.x = None

    def update(self, measurement):
        if self.x is None:
            self.x = measurement
            return self.x
        
        # Prediction
        self.p = self.p + self.q
        # Measurement update
        k = self.p / (self.p + self.r)
        self.x = self.x + k * (measurement - self.x)
        self.p = (1 - k) * self.p
        return self.x

# Load and Setup Face Landmarker
BaseOptions = mp.tasks.BaseOptions
FaceLandmarker = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

model_path = 'face_landmarker.task' 
options = FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=model_path),
    running_mode=VisionRunningMode.VIDEO
)

# Load Calibration Data
try:
    with open("gaze_calibration.json", "r") as f:
        data = json.load(f)
except FileNotFoundError:
    print("Error: gaze_calibration.json not found. Run the calibration script first!")
    exit()

def get_eye_vector(landmarks):
    """Calculates the relative position of the iris center within eye corners."""
    # Left Eye: Iris center (468), Inner corner (133), Outer corner (33)
    l_iris = np.array([landmarks[468].x, landmarks[468].y])
    l_inner = np.array([landmarks[133].x, landmarks[133].y])
    l_outer = np.array([landmarks[33].x, landmarks[33].y])
    # Right Eye: Iris center (473), Inner corner (362), Outer corner (263)
    r_iris = np.array([landmarks[473].x, landmarks[473].y])
    r_inner = np.array([landmarks[362].x, landmarks[362].y])
    r_outer = np.array([landmarks[263].x, landmarks[263].y])

    # Relative offset: Iris position relative to the center of the eye socket
    l_vec = l_iris - (l_inner + l_outer) / 2
    r_vec = r_iris - (r_inner + r_outer) / 2
    return (l_vec + r_vec) / 2

# Train Regression Models
gaze_vecs = np.array([d["gaze_vec"] for d in data])
screen_pts = np.array([d["screen_pt"] for d in data])

# SVR (Support Vector Regression) with StandardScaler pipeline for non-linear mapping
model_x = make_pipeline(StandardScaler(), SVR(C=1.0, epsilon=0.01))
model_y = make_pipeline(StandardScaler(), SVR(C=1.0, epsilon=0.01))

print("Training gaze mapping models...")
model_x.fit(gaze_vecs, screen_pts[:, 0])
model_y.fit(gaze_vecs, screen_pts[:, 1])
print("Gaze mapping ready.")

# Kalman filters for X and Y coordinates
kf_x = KalmanFilter(process_noise=0.05, measurement_noise=0.5)
kf_y = KalmanFilter(process_noise=0.05, measurement_noise=0.5)

cap = cv2.VideoCapture(0)
cv2.namedWindow("Gaze Tracker", cv2.WND_PROP_FULLSCREEN)
cv2.setWindowProperty("Gaze Tracker", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

# Detect screen resolution
w, h = 0, 0

# Method 1: AppKit (most reliable on Mac)
try:
    from AppKit import NSScreen
    frame = NSScreen.mainScreen().frame()
    w, h = int(frame.size.width), int(frame.size.height)
except:
    pass

# Method 2: tkinter (good universal fallback)
if w <= 0:
    try:
        import tkinter
        root = tkinter.Tk()
        w, h = root.winfo_screenwidth(), root.winfo_screenheight()
        root.destroy()
    except:
        pass

# Method 3: cv2 window inspection
if w <= 0:
    for _ in range(30):
        cv2.waitKey(20)
        _, _, window_w, window_h = cv2.getWindowImageRect("Gaze Tracker")
        if window_w > 0:
            w, h = window_w, window_h
            break

# Final fallback for your specific Mac
if w <= 0:
    w, h = 1800, 1169

print(f"Detected Resolution: {w}x{h}")

t = 0
with FaceLandmarker.create_from_options(options) as landmarker:
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break
        frame = cv2.flip(frame, 1) # Mirror for natural interaction
        
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        t += 1
        result = landmarker.detect_for_video(mp_image, t)
        
        # DYNAMIC CANVAS: Query actual window size every frame
        _, _, win_w, win_h = cv2.getWindowImageRect("Gaze Tracker")
        if win_w > 0 and win_h > 0:
            w, h = win_w, win_h

        screen_canvas = np.zeros((h, w, 3), dtype=np.uint8)

        if result.face_landmarks:
            vec = get_eye_vector(result.face_landmarks[0])

            # Predict raw screen coordinates
            raw_x = model_x.predict([vec])[0]
            raw_y = model_y.predict([vec])[0]

            # Apply Kalman filter smoothing
            final_x = int(kf_x.update(raw_x))
            final_y = int(kf_y.update(raw_y))
         
            # Clamp values to screen boundaries
            final_x = np.clip(final_x, 0, w - 1)
            final_y = np.clip(final_y, 0, h - 1)

            # Draw the gaze "cursor" (crosshair)
            cv2.drawMarker(screen_canvas, (final_x, final_y), (0, 255, 0), cv2.MARKER_CROSS, 40, 2)
            cv2.circle(screen_canvas, (final_x, final_y), 15, (0, 255, 255), 2)
            
        cv2.imshow("Gaze Tracker", screen_canvas)
        if cv2.waitKey(1) & 0xFF == 27: # ESC to quit
            break

cap.release()
cv2.destroyAllWindows()