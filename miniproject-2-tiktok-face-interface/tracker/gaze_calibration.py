import cv2
import mediapipe as mp
import numpy as np
import json
import time
import sys
from pathlib import Path

BaseOptions = mp.tasks.BaseOptions
FaceLandmarker = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "face_landmarker.task"
CALIBRATION_PATH = BASE_DIR / "gaze_calibration.json"

options = FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=str(MODEL_PATH)),
    running_mode=VisionRunningMode.VIDEO)

def get_eye_vector(landmarks):
    try:
        l_iris = np.array([landmarks[468].x, landmarks[468].y])
        l_inner = np.array([landmarks[133].x, landmarks[133].y])
        l_outer = np.array([landmarks[33].x, landmarks[33].y])
        r_iris = np.array([landmarks[473].x, landmarks[473].y])
        r_inner = np.array([landmarks[362].x, landmarks[362].y])
        r_outer = np.array([landmarks[263].x, landmarks[263].y])
        l_vec = l_iris - (l_inner + l_outer) / 2
        r_vec = r_iris - (r_inner + r_outer) / 2
        avg_vec = (l_vec + r_vec) / 2
        return avg_vec.tolist()
    except IndexError:
        return None

w, h = 1770, 1107
margin = 60

# Grid configurations
grid_5point = [
    (margin, margin),
    (w - margin, margin),
    (w // 2, h // 2),
    (margin, h - margin),
    (w - margin, h - margin)
]

grid_9point = [
    (margin, margin), (w // 2, margin), (w - margin, margin),
    (margin, h // 2), (w // 2, h // 2), (w - margin, h // 2),
    (margin, h - margin), (w // 2, h - margin), (w - margin, h - margin)
]

# Ask user for grid type
print("Choose calibration grid:")
print("1) 5-point (faster, basic)")
print("2) 9-point (slower, better accuracy)")
choice = input("Enter choice (1 or 2): ").strip()
points = grid_9point if choice == "2" else grid_5point
print(f"Using {len(points)}-point grid calibration")

def reject_outliers_iqr(samples):
    """Remove outliers using Interquartile Range method"""
    if len(samples) < 4:
        return samples
    
    samples = np.array(samples)
    q1 = np.percentile(samples, 25, axis=0)
    q3 = np.percentile(samples, 75, axis=0)
    iqr = q3 - q1
    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr
    
    mask = np.all((samples >= lower) & (samples <= upper), axis=1)
    filtered = samples[mask]
    
    return filtered if len(filtered) > 0 else samples


def clamp01(value):
    return max(0.0, min(1.0, float(value)))


def lerp(current, target, alpha):
    return current + (target - current) * alpha


def draw_centered_text(canvas, text, y, scale=1.0, color=(255, 255, 255), thickness=2):
    (text_w, _), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, scale, thickness)
    x = max(20, (canvas.shape[1] - text_w) // 2)
    cv2.putText(canvas, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, scale, color, thickness, cv2.LINE_AA)


def draw_target_dot(canvas, center, outer_color, outer_radius, collecting, progress):
    cv2.circle(canvas, center, outer_radius, outer_color, -1, lineType=cv2.LINE_AA)

    if collecting:
        p = clamp01(progress)
        max_inner = max(6, outer_radius - 8)
        min_inner = max(2, int(round(max_inner * 0.18)))
        inner_radius = int(round(max_inner - (max_inner - min_inner) * p))
        cv2.circle(canvas, center, inner_radius, (255, 255, 255), -1, lineType=cv2.LINE_AA)
    else:
        cv2.circle(canvas, center, max(3, outer_radius // 4), (255, 255, 255), -1, lineType=cv2.LINE_AA)

calib_data = []
current_pt = 0
collecting = False
collected_samples = []
collection_start = 0
sample_target = 15
sample_timeout_s = 1.0
dot_move_alpha = 0.24

cap = cv2.VideoCapture(0)
cv2.namedWindow("Calibration", cv2.WND_PROP_FULLSCREEN)
cv2.setWindowProperty("Calibration", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

start_time = time.time()

with FaceLandmarker.create_from_options(options) as landmarker:
    centered_face_box_w = int(w * 0.22)
    centered_face_box_h = int(h * 0.40)
    centered_face_left = (w - centered_face_box_w) // 2
    centered_face_top = (h - centered_face_box_h) // 2
    centered_face_right = centered_face_left + centered_face_box_w
    centered_face_bottom = centered_face_top + centered_face_box_h

    face_box_norm = (
        centered_face_left / w,
        centered_face_top / h,
        centered_face_right / w,
        centered_face_bottom / h,
    )

    aborted = False
    alignment_ready = False

    while not alignment_ready:
        ret, frame = cap.read()
        if not ret:
            aborted = True
            break
        frame = cv2.flip(frame, 1)

        canvas = cv2.resize(frame, (w, h), interpolation=cv2.INTER_LINEAR)

        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        timestamp_ms = int((time.time() - start_time) * 1000)
        result = landmarker.detect_for_video(mp_image, timestamp_ms)

        face_centered = False
        face_detected = False
        if result.face_landmarks:
            face_detected = True
            landmarks = result.face_landmarks[0]
            center_x = float(np.mean([lm.x for lm in landmarks]))
            center_y = float(np.mean([lm.y for lm in landmarks]))
            face_centered = (
                face_box_norm[0] <= center_x <= face_box_norm[2]
                and face_box_norm[1] <= center_y <= face_box_norm[3]
            )

        if face_centered:
            box_color = (84, 224, 84)
            hint = "Face centered. Press SPACE to begin."
        elif face_detected:
            box_color = (130, 200, 255)
            hint = "Move your face into the center box."
        else:
            box_color = (180, 180, 180)
            hint = "Show your face in the center box."

        draw_centered_text(canvas, "Step 0: Align Face", 110, scale=1.1)
        draw_centered_text(canvas, hint, 160, scale=0.85)
        cv2.rectangle(
            canvas,
            (centered_face_left, centered_face_top),
            (centered_face_right, centered_face_bottom),
            box_color,
            3,
            lineType=cv2.LINE_AA,
        )

        cv2.imshow("Calibration", canvas)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            aborted = True
            break

        if key == 32:
            if face_centered:
                alignment_ready = True
                print("Face aligned. Starting point calibration...")
            else:
                print("Center your face inside the box before starting.")

    if not aborted and points:
        dot_x = float(points[0][0])
        dot_y = float(points[0][1])

    while not aborted and current_pt < len(points):
        ret, frame = cap.read()
        if not ret:
            break
        frame = cv2.flip(frame, 1)

        canvas = np.zeros((h, w, 3), dtype=np.uint8)
        target = points[current_pt]
        dot_x = lerp(dot_x, target[0], dot_move_alpha)
        dot_y = lerp(dot_y, target[1], dot_move_alpha)
        tx, ty = int(round(dot_x)), int(round(dot_y))

        draw_centered_text(canvas, f"Point {current_pt+1}/{len(points)}", 95, scale=1.05)
        instr = "Hold gaze while white center shrinks" if collecting else "Focus on red dot and press SPACE"
        draw_centered_text(canvas, instr, 145, scale=0.85)

        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        timestamp_ms = int((time.time() - start_time) * 1000)
        result = landmarker.detect_for_video(mp_image, timestamp_ms)

        if collecting:
            sample_progress = len(collected_samples) / sample_target
            time_progress = (time.time() - collection_start) / sample_timeout_s
            progress = clamp01(max(sample_progress, time_progress))
        else:
            progress = 0.0

        draw_target_dot(
            canvas,
            (tx, ty),
            outer_color=(0, 0, 255),
            outer_radius=30,
            collecting=collecting,
            progress=progress,
        )

        cv2.imshow("Calibration", canvas)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            aborted = True
            break

        # Start collection on SPACE
        if key == 32 and not collecting:
            if result.face_landmarks:
                collecting = True
                collected_samples = []
                collection_start = time.time()
                print(f"Starting collection for point {current_pt+1}/{len(points)}...")
            else:
                print("No face detected! Please adjust your position.")

        # Collect samples while in collecting mode
        if collecting:
            if result.face_landmarks:
                vec = get_eye_vector(result.face_landmarks[0])
                if vec is not None:
                    collected_samples.append(vec)

            # Stop collection after sample target or timeout
            if len(collected_samples) >= sample_target or time.time() - collection_start > sample_timeout_s:
                if len(collected_samples) > 0:
                    # Apply IQR outlier rejection
                    filtered = reject_outliers_iqr(collected_samples)
                    avg_vec = np.mean(filtered, axis=0).tolist()

                    calib_data.append({"gaze_vec": avg_vec, "screen_pt": target})
                    current_pt += 1

                    print(f"Point {current_pt}/{len(points)} done: {len(collected_samples)} samples, {len(filtered)} after filtering")
                    print(f"  Average gaze vector: {avg_vec}")
                else:
                    print("No samples collected for this point. Try again.")

                collecting = False
                collected_samples = []

if calib_data:
    with CALIBRATION_PATH.open("w", encoding="utf-8") as f:
        json.dump(calib_data, f)
    print(f"\n✅ Successfully saved {len(calib_data)} calibration points.")
    
    # VALIDATION PHASE
    print("\n" + "="*60)
    print("VALIDATION PHASE: Testing calibration accuracy")
    print("="*60)
    
    # Load model and validation data
    from sklearn.preprocessing import PolynomialFeatures
    from sklearn.linear_model import LinearRegression
    
    gaze_vecs = np.array([d["gaze_vec"] for d in calib_data])
    screen_vecs = np.array([d["screen_pt"] for d in calib_data])
    
    poly = PolynomialFeatures(degree=2)
    gaze_features = poly.fit_transform(gaze_vecs)
    model_x = LinearRegression()
    model_y = LinearRegression()
    model_x.fit(gaze_features, screen_vecs[:, 0])
    model_y.fit(gaze_features, screen_vecs[:, 1])
    
    # Validation points (different from calibration)
    val_margin = 100
    validation_points = [
        (val_margin, val_margin),
        (w - val_margin, h - val_margin),
        (w // 4, h // 4),
        (3 * w // 4, 3 * h // 4),
    ]
    
    errors = []
    val_idx = 0
    validation_collecting = False
    val_samples = []
    val_collection_start = 0
    val_start_time = time.time()
    val_dot_x = float(validation_points[0][0])
    val_dot_y = float(validation_points[0][1])
    val_sample_target = 5
    val_sample_timeout_s = 0.5
    
    print(f"\nFocus on {len(validation_points)} validation points to measure accuracy...")
    
    with FaceLandmarker.create_from_options(options) as val_landmarker:
        while val_idx < len(validation_points):
            ret, frame = cap.read()
            if not ret:
                break
            frame = cv2.flip(frame, 1)
            
            canvas = np.zeros((h, w, 3), dtype=np.uint8)
            target = validation_points[val_idx]
            val_dot_x = lerp(val_dot_x, target[0], dot_move_alpha)
            val_dot_y = lerp(val_dot_y, target[1], dot_move_alpha)
            tx, ty = int(round(val_dot_x)), int(round(val_dot_y))

            draw_centered_text(canvas, f"Validation {val_idx+1}/{len(validation_points)}", 95, scale=1.05)
            instr = "Hold gaze while white center shrinks" if validation_collecting else "Focus on cyan dot and press SPACE"
            draw_centered_text(canvas, instr, 145, scale=0.85)
            
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            timestamp_ms = int((time.time() - val_start_time) * 1000)
            result = val_landmarker.detect_for_video(mp_image, timestamp_ms)

            if validation_collecting:
                val_sample_progress = len(val_samples) / val_sample_target
                val_time_progress = (time.time() - val_collection_start) / val_sample_timeout_s
                val_progress = clamp01(max(val_sample_progress, val_time_progress))
            else:
                val_progress = 0.0

            draw_target_dot(
                canvas,
                (tx, ty),
                outer_color=(0, 255, 255),
                outer_radius=25,
                collecting=validation_collecting,
                progress=val_progress,
            )
            
            cv2.imshow("Calibration", canvas)
            
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            
            if key == 32 and not validation_collecting:
                if result.face_landmarks:
                    validation_collecting = True
                    val_samples = []
                    val_collection_start = time.time()
                else:
                    print("No face detected!")
            
            if validation_collecting:
                if result.face_landmarks:
                    vec = get_eye_vector(result.face_landmarks[0])
                    if vec is not None:
                        val_samples.append(vec)
                
                if len(val_samples) >= val_sample_target or time.time() - val_collection_start > val_sample_timeout_s:
                    if len(val_samples) > 0:
                        filtered = reject_outliers_iqr(val_samples)
                        avg_vec = np.mean(filtered, axis=0)
                        
                        # Predict screen position
                        features = poly.transform([avg_vec])
                        pred_x = int(model_x.predict(features)[0])
                        pred_y = int(model_y.predict(features)[0])
                        
                        # Calculate error in pixels and degrees (~1 degree ≈ 60 pixels on this screen)
                        error_px = np.sqrt((pred_x - target[0])**2 + (pred_y - target[1])**2)
                        error_deg = error_px / 60.0
                        errors.append(error_px)
                        
                        print(f"  Point {val_idx+1}: Predicted ({pred_x}, {pred_y}) vs Actual ({target[0]}, {target[1]})")
                        print(f"    Error: {error_px:.1f}px ({error_deg:.2f}°)")
                    
                    val_idx += 1
                    validation_collecting = False
                    val_samples = []
    
    if errors:
        mean_error = np.mean(errors)
        max_error = np.max(errors)
        print(f"\n📊 VALIDATION RESULTS:")
        print(f"  Mean error: {mean_error:.1f} pixels ({mean_error/60:.2f}°)")
        print(f"  Max error:  {max_error:.1f} pixels ({max_error/60:.2f}°)")
        if mean_error < 60:
            print("  ✅ GOOD: Error < 1° (excellent for gaze interaction)")
        elif mean_error < 120:
            print("  ⚠️  ACCEPTABLE: Error 1-2° (usable for dwell interaction)")
        else:
            print("  ❌ POOR: Error > 2° (recalibrate with better positioning)")
    
    print("="*60)

cap.release()
cv2.destroyAllWindows()
