import cv2
import mediapipe as mp
import time
import numpy as np
import pyautogui

# Disable pyautogui fail-safe and set pause to 0
pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0

BaseOptions = mp.tasks.BaseOptions
FaceLandmarker = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

class SmoothingFilter:
    def __init__(self, alpha=0.15):
        self.alpha = alpha
        self.value = None

    def update(self, next_val):
        if self.value is None:
            self.value = next_val
        else:
            self.value = self.alpha * next_val + (1 - self.alpha) * self.value
        return self.value

class HeadMouseController:
    def __init__(self, model_path='face_landmarker.task'):
        options = FaceLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=model_path),
            running_mode=VisionRunningMode.VIDEO,
            output_face_blendshapes=True,
            output_facial_transformation_matrixes=True,
            num_faces=1
        )
        self.landmarker = FaceLandmarker.create_from_options(options)
        self.screen_w, self.screen_h = pyautogui.size()
        
        # Responsive alpha (0.3)
        self.filter_x = SmoothingFilter(alpha=0.3)
        self.filter_y = SmoothingFilter(alpha=0.3)
        
        # Sensitivity settings (radians)
        self.yaw_range = 0.5   
        self.pitch_range = 0.4 
        
        # Gesture state (High conviction, fast response)
        self.pucker_threshold = 0.9
        self.is_puckering = False
        
        # Display settings
        self.show_landmarks = True

    def process_frame(self, frame, timestamp):
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        
        result = self.landmarker.detect_for_video(mp_image, timestamp)
        h, w, _ = frame.shape

        if result.face_landmarks:
            landmarks = result.face_landmarks[0]
            # Calculate bounding box center
            xs = [l.x for l in landmarks]
            ys = [l.y for l in landmarks]
            cx_face = (min(xs) + max(xs)) / 2
            cy_face = (min(ys) + max(ys)) / 2
            
            # Map face center (2D) to screen space (0.3 range)
            face_range_x = 0.3
            face_range_y = 0.3
            
            norm_x = (cx_face - 0.5) / face_range_x + 0.5
            norm_y = (cy_face - 0.5) / face_range_y + 0.5
            
            norm_x = np.clip(norm_x, 0, 1)
            norm_y = np.clip(norm_y, 0, 1)
            
            # Target screen coordinates with smoothing
            target_x = self.filter_x.update(norm_x * self.screen_w)
            target_y = self.filter_y.update(norm_y * self.screen_h)
            
            # Move cursor immediately
            pyautogui.moveTo(target_x, target_y, duration=0)

        # Handle "Nguso" (Pucker) Gesture for clicking
        if result.face_blendshapes:
            blendshapes = {b.category_name: b.score for b in result.face_blendshapes[0]}
            pucker_score = blendshapes.get('mouthPucker', 0)
            
            # Immediate click on high threshold
            if pucker_score > self.pucker_threshold:
                if not self.is_puckering:
                    pyautogui.click()
                    self.is_puckering = True
                    print(f"CLICK | Nguso detected (score: {pucker_score:.2f})")
            else:
                self.is_puckering = False

            # Visual feedback on frame
            color = (0, 255, 0) if self.is_puckering else (0, 0, 255)
            cv2.putText(frame, f"Nguso Pucker: {pucker_score:.2f}", (30, 50), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
            
            if result.face_landmarks:
                # Draw marker at the face center
                nx, ny = int(cx_face * w), int(cy_face * h)
                cv2.drawMarker(frame, (nx, ny), color, cv2.MARKER_CROSS, 20, 2)

        return frame

    def start(self):
        cap = cv2.VideoCapture(0)
        cv2.namedWindow('Head Mouse (Nguso to Click)', cv2.WINDOW_NORMAL)
        
        while cap.isOpened():
            success, frame = cap.read()
            if not success: break
            
            frame = cv2.flip(frame, 1)
            timestamp = int(time.time() * 1000)
            frame = self.process_frame(frame, timestamp)
            
            cv2.imshow('Head Mouse (Nguso to Click)', frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        cap.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    controller = HeadMouseController()
    controller.start()
