import cv2
import mediapipe as mp
import numpy as np
import json
import time
from collections import deque
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import LinearRegression
from filterpy.kalman import KalmanFilter


BaseOptions = mp.tasks.BaseOptions
FaceLandmarker = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode


model_path = 'face_landmarker.task'


options = FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=model_path),
    running_mode=VisionRunningMode.VIDEO
)


# Screen Resolution
SCREEN_W, SCREEN_H = 1770, 1107


# Load Calibration Data
try:
    with open("gaze_calibration.json", "r") as f:
        data = json.load(f)
except FileNotFoundError:
    print("Error: gaze_calibration.json not found. Run the calibration script first!")
    exit()


# Extract vectors and screen targets
gaze_vecs = np.array([d["gaze_vec"] for d in data])
screen_vecs = np.array([d["screen_pt"] for d in data])


draw_mode = False
paused = False  # ← NEW: pause state


# Initialize regression models
poly = PolynomialFeatures(degree=2)
gaze_features = poly.fit_transform(gaze_vecs)
model_x = LinearRegression()
model_y = LinearRegression()
model_x.fit(gaze_features, screen_vecs[:, 0])
model_y.fit(gaze_features, screen_vecs[:, 1])


# Initialize Kalman filter
kalman_filter = KalmanFilter(dim_x=4, dim_z=2)

dt = 1.0
kalman_filter.F = np.array([[1, 0, dt, 0],
                             [0, 1, 0, dt],
                             [0, 0, 1,  0],
                             [0, 0, 0,  1]], dtype=np.float32)
kalman_filter.H = np.array([[1, 0, 0, 0],
                             [0, 1, 0, 0]], dtype=np.float32)
kalman_filter.R = np.eye(2, dtype=np.float32) * 0.01
kalman_filter.Q = np.eye(4, dtype=np.float32) * 1e-4
kalman_filter.P = np.eye(4, dtype=np.float32) * 1.0
kalman_filter.x = np.zeros((4, 1), dtype=np.float32)


def get_eye_vector(landmarks):
    """Calculates the relative position of the iris center within eye corners."""
    l_iris  = np.array([landmarks[468].x, landmarks[468].y])
    l_inner = np.array([landmarks[133].x, landmarks[133].y])
    l_outer = np.array([landmarks[33].x,  landmarks[33].y])

    r_iris  = np.array([landmarks[473].x, landmarks[473].y])
    r_inner = np.array([landmarks[362].x, landmarks[362].y])
    r_outer = np.array([landmarks[263].x, landmarks[263].y])

    l_vec = l_iris - (l_inner + l_outer) / 2
    r_vec = r_iris - (r_inner + r_outer) / 2

    return (l_vec + r_vec) / 2


cap = cv2.VideoCapture(0)
cv2.namedWindow("Gaze Tracker", cv2.WND_PROP_FULLSCREEN)
cv2.setWindowProperty("Gaze Tracker", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

start_time = time.time()

# ← NEW: persistent canvas so pausing freezes the last drawn frame
screen_canvas = np.zeros((SCREEN_H, SCREEN_W, 3), dtype=np.uint8)

with FaceLandmarker.create_from_options(options) as landmarker:
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        frame = cv2.flip(frame, 1)

        # ─── Only process gaze when NOT paused ──────────────────────────
        if not paused:
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB,
                                data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            timestamp_ms = int((time.time() - start_time) * 1000)
            result = landmarker.detect_for_video(mp_image, timestamp_ms)

            if not draw_mode:
                screen_canvas = np.zeros((SCREEN_H, SCREEN_W, 3), dtype=np.uint8)

            if result.face_landmarks:
                vec = get_eye_vector(result.face_landmarks[0])

                features = poly.transform([[vec[0], vec[1]]])
                final_x = model_x.predict(features)[0]
                final_y = model_y.predict(features)[0]

                kalman_filter.predict()
                measurement = np.array([[final_x], [final_y]], dtype=np.float32)
                kalman_filter.update(measurement)

                final_x = int(kalman_filter.x[0, 0])
                final_y = int(kalman_filter.x[1, 0])

                final_x = np.clip(final_x, 0, SCREEN_W)
                final_y = np.clip(final_y, 0, SCREEN_H)

                cv2.circle(screen_canvas, (final_x, final_y), 30, (0, 255, 255), -1)

        # ─── Draw PAUSED overlay on a copy so canvas stays clean ────────
        display_frame = screen_canvas.copy()  # ← NEW
        if paused:
            cv2.putText(display_frame, "PAUSED",
                        (30, 70),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        2.0,
                        (0, 200, 255),  # amber-ish
                        3,
                        cv2.LINE_AA)

        cv2.imshow("Gaze Tracker", display_frame)  # ← show copy, not canvas

        key = cv2.waitKey(1) & 0xFF
        if key == 27:                    # ESC  → quit
            break
        elif key == ord(" "):            # SPACE → toggle draw mode
            draw_mode = not draw_mode
        elif key == ord("p"):            # P    → toggle pause  ← NEW
            paused = not paused


cap.release()
cv2.destroyAllWindows()