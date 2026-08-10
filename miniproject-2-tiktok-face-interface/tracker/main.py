import cv2
import mediapipe as mp
import numpy as np
import json
import time
import asyncio
import threading
from pathlib import Path
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import LinearRegression
from filterpy.kalman import KalmanFilter
from transport_ws import TrackerBroadcastServer

BaseOptions = mp.tasks.BaseOptions
FaceLandmarker = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "face_landmarker.task"
CALIBRATION_PATH = BASE_DIR / "gaze_calibration.json"

options = FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=str(MODEL_PATH)),
    running_mode=VisionRunningMode.VIDEO,
    output_face_blendshapes=True
)

SCREEN_W, SCREEN_H = 1770, 1107
SMILE_ON_THRESHOLD = 0.52
SMILE_OFF_THRESHOLD = 0.30
SMILE_TEETH_MIN = 0.16
SMILE_EMA_ALPHA = 0.34
SMILE_GESTURE_COOLDOWN_MS = 900
# MediaPipe Face Landmarker exposes 52 blendshapes; tongue-out is often missing.
# Use a robust tongue proxy from mouth color + mouth-shape cues.
ANGRY_ON_THRESHOLD = 0.11
ANGRY_OFF_THRESHOLD = 0.05
ANGRY_TONGUE_MIN = 0.08
ANGRY_SIGNAL_MIN = 0.035
ANGRY_JAW_SUPPRESS_FACTOR = 0.18
ANGRY_DIRECT_TONGUE_BYPASS = 0.16
TONGUE_COLOR_GATE_MIN = 0.16
TONGUE_MODEL_GATE_MIN = 0.12
ANGRY_EMA_ALPHA = 0.5
ANGRY_GESTURE_COOLDOWN_MS = 900
WINK_ON_THRESHOLD = 0.68
WINK_OFF_THRESHOLD = 0.34
WINK_OTHER_EYE_MAX = 0.44
WINK_ASYMMETRY_MIN = 0.22
WINK_GESTURE_COOLDOWN_MS = 900
BLINK_EMA_ALPHA = 0.36

INNER_MOUTH_INDICES = [
    78, 95, 88, 178, 87, 14, 317, 402, 318, 324,
    308, 415, 310, 311, 312, 13, 82, 81, 80, 191,
]

# Load Calibration Data
try:
    with CALIBRATION_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)
except FileNotFoundError:
    print(f"Error: calibration file not found at {CALIBRATION_PATH}. Run calibration first!")
    exit()

gaze_vecs = np.array([d["gaze_vec"] for d in data])
screen_vecs = np.array([d["screen_pt"] for d in data])

# Initialize regression
poly = PolynomialFeatures(degree=2)
gaze_features = poly.fit_transform(gaze_vecs)
model_x = LinearRegression()
model_y = LinearRegression()
model_x.fit(gaze_features, screen_vecs[:, 0])
model_y.fit(gaze_features, screen_vecs[:, 1])

# Kalman filter
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
    l_iris  = np.array([landmarks[468].x, landmarks[468].y])
    l_inner = np.array([landmarks[133].x, landmarks[133].y])
    l_outer = np.array([landmarks[33].x,  landmarks[33].y])
    r_iris  = np.array([landmarks[473].x, landmarks[473].y])
    r_inner = np.array([landmarks[362].x, landmarks[362].y])
    r_outer = np.array([landmarks[263].x, landmarks[263].y])
    l_vec = l_iris - (l_inner + l_outer) / 2
    r_vec = r_iris - (r_inner + r_outer) / 2
    return (l_vec + r_vec) / 2


def compute_tongue_color_score(frame_bgr, landmarks):
    h, w = frame_bgr.shape[:2]
    if h <= 0 or w <= 0:
        return 0.0

    points = []
    for idx in INNER_MOUTH_INDICES:
        if idx >= len(landmarks):
            continue
        px = int(np.clip(landmarks[idx].x * w, 0, w - 1))
        py = int(np.clip(landmarks[idx].y * h, 0, h - 1))
        points.append([px, py])

    if len(points) < 6:
        return 0.0

    polygon = np.array([points], dtype=np.int32)
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.fillPoly(mask, polygon, 255)

    # Reduce lip-border bleed by keeping the lower half of the inner mouth mask.
    y_mid = int(np.mean(polygon[0, :, 1]))
    lower_half = np.zeros((h, w), dtype=np.uint8)
    lower_half[max(0, y_mid):, :] = 255
    mask = cv2.bitwise_and(mask, lower_half)
    mask = cv2.erode(mask, np.ones((3, 3), dtype=np.uint8), iterations=1)

    mouth_area = cv2.countNonZero(mask)
    if mouth_area < 40:
        return 0.0

    hsv = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2HSV)
    warm_red = cv2.inRange(hsv, (0, 35, 35), (20, 255, 255))
    pink_red = cv2.inRange(hsv, (150, 20, 35), (179, 255, 255))
    red_mask = cv2.bitwise_or(warm_red, pink_red)
    red_mask = cv2.bitwise_and(red_mask, mask)

    red_ratio = cv2.countNonZero(red_mask) / float(mouth_area)
    # Map practical observed red-ratio range into [0, 1].
    return float(np.clip((red_ratio - 0.06) / 0.24, 0.0, 1.0))

# Global WebSocket server
server = None

async def run_server():
    """Run WebSocket server in background"""
    global server
    server = TrackerBroadcastServer(port=8765)
    await server.start()

def start_server_thread():
    """Start WebSocket server in a daemon thread"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(run_server())
    loop.run_forever()  # Keep event loop alive

print("Starting WebSocket server...")
server_thread = threading.Thread(target=start_server_thread, daemon=True)
server_thread.start()
time.sleep(1)  # Give server time to start
print("WebSocket server ready on ws://127.0.0.1:8765")

cap = cv2.VideoCapture(0)
cv2.namedWindow("Week6 Tracker", cv2.WND_PROP_FULLSCREEN)
cv2.setWindowProperty("Week6 Tracker", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

start_time = time.time()
screen_canvas = np.zeros((SCREEN_H, SCREEN_W, 3), dtype=np.uint8)
draw_mode = False
paused = False
smile_active = False
smile_ema = 0.0
last_smile_event_ts = -100000
angry_active = False
angry_ema = 0.0
last_angry_event_ts = -100000
wink_active = False
blink_left_ema = 0.0
blink_right_ema = 0.0
last_wink_event_ts = -100000
reported_blendshapes = False

with FaceLandmarker.create_from_options(options) as landmarker:
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        frame = cv2.flip(frame, 1)

        if not paused:
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB,
                                data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            timestamp_ms = int((time.time() - start_time) * 1000)
            result = landmarker.detect_for_video(mp_image, timestamp_ms)

            if not draw_mode:
                screen_canvas = np.zeros((SCREEN_H, SCREEN_W, 3), dtype=np.uint8)

            gaze_x, gaze_y = 0.5, 0.5
            face_detected = False
            tracking_confidence = 0.0
            smile_raw_score = 0.0
            smile_score = 0.0
            smile_threshold = SMILE_ON_THRESHOLD
            teeth_visibility_score = 0.0
            angry_raw_score = 0.0
            angry_score = 0.0
            angry_threshold = ANGRY_ON_THRESHOLD
            brow_down_score = 0.0
            tongue_out_score = 0.0
            tongue_blendshape_score = 0.0
            tongue_color_score = 0.0
            tongue_shape_score = 0.0
            tongue_signal_score = 0.0
            jaw_open_score = 0.0
            brow_raise_score = 0.0
            blink_left_score = 0.0
            blink_right_score = 0.0
            emit_smile_heart = False
            emit_angry_unheart = False
            
            if result.face_landmarks:
                face_detected = True
                landmarks = result.face_landmarks[0]
                
                # Calculate tracking confidence from landmark visibility scores
                if len(landmarks) > 0:
                    # Use visibility of key landmarks (eyes, nose) for confidence
                    key_indices = [33, 133, 263, 362, 468, 473, 1, 5, 8]  # Eyes, nose, mouth corners
                    visibilities = [landmarks[i].visibility for i in key_indices if i < len(landmarks) and landmarks[i].visibility is not None]
                    tracking_confidence = float(np.mean(visibilities)) if visibilities else 0.5
                
                vec = get_eye_vector(landmarks)
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
                
                # Normalize to [0,1] for Silk
                gaze_x = final_x / SCREEN_W
                gaze_y = final_y / SCREEN_H

                # Blendshape scores from MediaPipe tasks (0..1)
                if result.face_blendshapes:
                    score_map = {}
                    for category in result.face_blendshapes[0]:
                        score_map[category.category_name] = float(category.score)

                    if not reported_blendshapes:
                        print(f"[Tracker] blendshape_count={len(score_map)} tongueOut_key={('tongueOut' in score_map)}")
                        reported_blendshapes = True

                    jaw_open_score = score_map.get("jawOpen", 0.0)
                    smile_left_score = score_map.get("mouthSmileLeft", 0.0)
                    smile_right_score = score_map.get("mouthSmileRight", 0.0)
                    upper_lip_up_score = 0.5 * (
                        score_map.get("mouthUpperUpLeft", 0.0)
                        + score_map.get("mouthUpperUpRight", 0.0)
                    )
                    smile_raw_score = 0.5 * (smile_left_score + smile_right_score)
                    teeth_visibility_score = max(upper_lip_up_score, jaw_open_score * 0.55)

                    brow_down_score = 0.5 * (
                        score_map.get("browDownLeft", 0.0)
                        + score_map.get("browDownRight", 0.0)
                    )

                    # Build tongue proxy: model score (if available) + mouth color + mouth shape.
                    tongue_blendshape_score = float(np.clip(score_map.get("tongueOut", 0.0), 0.0, 1.0))
                    mouth_lower_down_score = 0.5 * (
                        score_map.get("mouthLowerDownLeft", 0.0)
                        + score_map.get("mouthLowerDownRight", 0.0)
                    )
                    mouth_roll_lower_score = score_map.get("mouthRollLower", 0.0)
                    mouth_close_score = score_map.get("mouthClose", 0.0)
                    mouth_pucker_score = score_map.get("mouthPucker", 0.0)

                    tongue_color_score = compute_tongue_color_score(frame, landmarks)
                    tongue_shape_score = float(np.clip(
                        (0.58 * mouth_lower_down_score)
                        + (0.44 * mouth_roll_lower_score)
                        + (0.18 * max(jaw_open_score - 0.18, 0.0))
                        - (0.34 * mouth_close_score)
                        - (0.22 * mouth_pucker_score),
                        0.0,
                        1.0,
                    ))

                    tongue_proxy_score = max(
                        tongue_blendshape_score,
                        (0.72 * tongue_color_score) + (0.28 * tongue_shape_score),
                    )
                    tongue_out_score = float(np.clip(tongue_proxy_score, 0.0, 1.0))

                    # Debias tongue proxy against jaw-only activation.
                    tongue_signal_score = float(np.clip(
                        tongue_out_score - (jaw_open_score * ANGRY_JAW_SUPPRESS_FACTOR),
                        0.0,
                        1.0,
                    ))
                    angry_raw_score = tongue_signal_score

                    brow_raise_score = max(
                        score_map.get("browInnerUp", 0.0),
                        score_map.get("browOuterUpLeft", 0.0),
                        score_map.get("browOuterUpRight", 0.0),
                    )
                    blink_left_raw = score_map.get("eyeBlinkLeft", 0.0)
                    blink_right_raw = score_map.get("eyeBlinkRight", 0.0)

                    if blink_left_ema <= 0.0:
                        blink_left_ema = blink_left_raw
                    else:
                        blink_left_ema = (BLINK_EMA_ALPHA * blink_left_raw) + ((1.0 - BLINK_EMA_ALPHA) * blink_left_ema)

                    if blink_right_ema <= 0.0:
                        blink_right_ema = blink_right_raw
                    else:
                        blink_right_ema = (BLINK_EMA_ALPHA * blink_right_raw) + ((1.0 - BLINK_EMA_ALPHA) * blink_right_ema)

                    blink_left_score = float(blink_left_ema)
                    blink_right_score = float(blink_right_ema)

                if smile_ema <= 0.0:
                    smile_ema = smile_raw_score
                else:
                    smile_ema = (SMILE_EMA_ALPHA * smile_raw_score) + ((1.0 - SMILE_EMA_ALPHA) * smile_ema)
                smile_score = float(smile_ema)

                if angry_ema <= 0.0:
                    angry_ema = angry_raw_score
                else:
                    angry_ema = (ANGRY_EMA_ALPHA * angry_raw_score) + ((1.0 - ANGRY_EMA_ALPHA) * angry_ema)
                angry_score = float(angry_ema)

                # Smile-with-teeth trigger for heart.
                smile_with_teeth_candidate = (
                    smile_score >= SMILE_ON_THRESHOLD
                    and teeth_visibility_score >= SMILE_TEETH_MIN
                )

                if smile_active:
                    if smile_score <= SMILE_OFF_THRESHOLD:
                        smile_active = False
                else:
                    if smile_with_teeth_candidate and (timestamp_ms - last_smile_event_ts) >= SMILE_GESTURE_COOLDOWN_MS:
                        smile_active = True
                        last_smile_event_ts = timestamp_ms
                        emit_smile_heart = True

                # Tongue-out trigger for unheart (keeps legacy event name for compatibility).
                tongue_color_gate = tongue_color_score >= TONGUE_COLOR_GATE_MIN
                tongue_model_gate = tongue_blendshape_score >= TONGUE_MODEL_GATE_MIN
                angry_candidate = (
                    max(angry_score, angry_raw_score) >= ANGRY_ON_THRESHOLD
                    and tongue_out_score >= ANGRY_TONGUE_MIN
                    and (tongue_color_gate or tongue_model_gate)
                    and (
                        tongue_signal_score >= ANGRY_SIGNAL_MIN
                        or tongue_out_score >= ANGRY_DIRECT_TONGUE_BYPASS
                    )
                )

                if angry_active:
                    if angry_score <= ANGRY_OFF_THRESHOLD:
                        angry_active = False
                else:
                    if angry_candidate and (timestamp_ms - last_angry_event_ts) >= ANGRY_GESTURE_COOLDOWN_MS:
                        angry_active = True
                        last_angry_event_ts = timestamp_ms
                        emit_angry_unheart = True

                # Wink detection: one eye strongly closed while the other stays mostly open.
                left_wink_candidate = (
                    blink_left_score >= WINK_ON_THRESHOLD
                    and blink_right_score <= WINK_OTHER_EYE_MAX
                    and (blink_left_score - blink_right_score) >= WINK_ASYMMETRY_MIN
                )
                right_wink_candidate = (
                    blink_right_score >= WINK_ON_THRESHOLD
                    and blink_left_score <= WINK_OTHER_EYE_MAX
                    and (blink_right_score - blink_left_score) >= WINK_ASYMMETRY_MIN
                )

                if wink_active:
                    if max(blink_left_score, blink_right_score) <= WINK_OFF_THRESHOLD:
                        wink_active = False
                else:
                    if (timestamp_ms - last_wink_event_ts) >= WINK_GESTURE_COOLDOWN_MS:
                        if left_wink_candidate or right_wink_candidate:
                            wink_active = True
                            last_wink_event_ts = timestamp_ms
                
                cv2.circle(screen_canvas, (final_x, final_y), 30, (0, 255, 255), -1)
            else:
                smile_active = False
                angry_active = False
                wink_active = False
            
            # Send to Silk
            if server and server.loop:
                payload = {
                    "type": "tracking_state",
                    "ts": timestamp_ms,
                    "faceDetected": face_detected,
                    "trackingConfidence": tracking_confidence,
                    "gaze": {"x": gaze_x, "y": gaze_y},
                    "gestures": {
                        "smileScore": smile_score,
                        "smileRawScore": smile_raw_score,
                        "smileThreshold": smile_threshold,
                        "teethVisibilityScore": teeth_visibility_score,
                        "angryScore": angry_score,
                        "angryRawScore": angry_raw_score,
                        "angryThreshold": angry_threshold,
                        "browDownScore": brow_down_score,
                        "tongueOutScore": tongue_out_score,
                        "tongueBlendshapeScore": tongue_blendshape_score,
                        "tongueColorScore": tongue_color_score,
                        "tongueShapeScore": tongue_shape_score,
                        "tongueSignalScore": tongue_signal_score,
                        "jawOpenScore": jaw_open_score,
                        "browRaiseScore": brow_raise_score,
                        "winkLeftScore": blink_left_score,
                        "winkRightScore": blink_right_score,
                    },
                }
                try:
                    asyncio.run_coroutine_threadsafe(
                        server.broadcast(payload),
                        server.loop
                    )
                except:
                    pass

                if emit_smile_heart:
                    gesture_payload = {
                        "type": "gesture_event",
                        "ts": timestamp_ms,
                        "gesture": "smile_teeth_heart",
                        "score": smile_score,
                        "threshold": smile_threshold,
                        "teeth": teeth_visibility_score,
                    }
                    try:
                        asyncio.run_coroutine_threadsafe(
                            server.broadcast(gesture_payload),
                            server.loop
                        )
                    except:
                        pass

                if emit_angry_unheart:
                    gesture_payload = {
                        "type": "gesture_event",
                        "ts": timestamp_ms,
                        "gesture": "angry_unheart",
                        "score": angry_score,
                        "threshold": angry_threshold,
                        "tongueOutScore": tongue_out_score,
                        "tongueBlendshapeScore": tongue_blendshape_score,
                        "tongueColorScore": tongue_color_score,
                        "tongueShapeScore": tongue_shape_score,
                        "tongueSignalScore": tongue_signal_score,
                        "jawOpenScore": jaw_open_score,
                    }
                    try:
                        asyncio.run_coroutine_threadsafe(
                            server.broadcast(gesture_payload),
                            server.loop
                        )
                    except:
                        pass

        display_frame = screen_canvas.copy()
        if paused:
            cv2.putText(display_frame, "PAUSED",
                        (30, 70),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        2.0,
                        (0, 200, 255),
                        3,
                        cv2.LINE_AA)

        cv2.imshow("Week6 Tracker", display_frame)

        key = cv2.waitKey(1) & 0xFF
        if key == 27:
            break
        elif key == ord(" "):
            draw_mode = not draw_mode
        elif key == ord("p"):
            paused = not paused

cap.release()
cv2.destroyAllWindows()
