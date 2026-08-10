import cv2
import mediapipe as mp
import numpy as np
import json
import time

BaseOptions = mp.tasks.BaseOptions
FaceLandmarker = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

model_path = 'face_landmarker.task'

options = FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=model_path),
    running_mode=VisionRunningMode.VIDEO)

def get_eye_vector(landmarks):
    # (保持不變)
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

# --- 設定校準點 (5點模式) ---
w, h = 1770, 1107
margin = 60 # 邊角留一點餘裕，不要完全貼齊螢幕邊緣
points = [
    (margin, margin),         # 左上
    (w - margin, margin),     # 右上
    (w // 2, h // 2),         # 中間
    (margin, h - margin),     # 左下
    (w - margin, h - margin)  # 右下
]
# --------------------------

calib_data = []
current_pt = 0

cap = cv2.VideoCapture(0) # 如果是外部攝影機請試試 0 或 1
cv2.namedWindow("Calibration", cv2.WND_PROP_FULLSCREEN)
cv2.setWindowProperty("Calibration", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

start_time = time.time()

with FaceLandmarker.create_from_options(options) as landmarker:
    while current_pt < len(points):
        ret, frame = cap.read()
        if not ret: break
        frame = cv2.flip(frame, 1)
        
        canvas = np.zeros((h, w, 3), dtype=np.uint8)
        target = points[current_pt]
        tx, ty = int(target[0]), int(target[1])
        
        # 繪製目標點
        cv2.circle(canvas, (tx, ty), 30, (0, 0, 255), -1)
        cv2.circle(canvas, (tx, ty), 10, (255, 255, 255), -1) # 增加中心點方便對焦
        
        # 顯示指令
        cv2.putText(canvas, f"Point {current_pt+1}/5: Focus on the RED dot and press SPACE", (w//2-450, 100), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

        # 處理 MediaPipe
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        timestamp_ms = int((time.time() - start_time) * 1000)
        result = landmarker.detect_for_video(mp_image, timestamp_ms)
        
        # --- 偵測提示 (Debug 用) ---
        if result.face_landmarks:
            status_txt = "FACE DETECTED"
            color = (0, 255, 0) # 綠色
        else:
            status_txt = "NO FACE (Adjust lighting/distance)"
            color = (0, 0, 255) # 紅色
        cv2.putText(canvas, status_txt, (50, h-50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
        
        # 把攝像頭畫面縮小放在右上角確認位置
        small_f = cv2.resize(frame, (240, 150))
        canvas[0:150, w-240:w] = small_f
        # --------------------------

        cv2.imshow("Calibration", canvas)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
            
        # 按下空白鍵 且 有偵測到人臉
        if key == 32: # Space key
            if result.face_landmarks:
                vec = get_eye_vector(result.face_landmarks[0])
                if vec is not None:
                    calib_data.append({"gaze_vec": vec, "screen_pt": target})
                    current_pt += 1
                    print(f"Captured {current_pt}/5: {vec}")
                else:
                    print("Error: Your model might not support IRIS landmarks (468+)")
            else:
                print("No face detected! Please adjust your position.")

if calib_data:
    with open("gaze_calibration.json", "w") as f:
        json.dump(calib_data, f)
    print(f"Successfully saved {len(calib_data)} calibration points.")

cap.release()
cv2.destroyAllWindows()