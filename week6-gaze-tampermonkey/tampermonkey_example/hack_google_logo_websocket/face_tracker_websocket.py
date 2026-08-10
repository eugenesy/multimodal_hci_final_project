import cv2
import mediapipe as mp
import asyncio
import websockets
import json
import time

BaseOptions = mp.tasks.BaseOptions
FaceLandmarker = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

# Nose offset
current_offset = 0

def result_callback(result, output_image, timestamp_ms):
    global current_offset
    if result.face_landmarks:
        # Landmark 4 is the nose tip
        nose = result.face_landmarks[0][4]
        # Calculate horizontal offset (-0.5 to 0.5 range mapped to pixels)
        current_offset = (nose.x - 0.5) * 800

async def head_tracker_server(websocket):
    global current_offset
    print("Tampermonkey connected!")
    
    # Configure Landmarker for Live Stream
    options = FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path='face_landmarker.task'),
        running_mode=VisionRunningMode.LIVE_STREAM,
        result_callback=result_callback
    )

    cap = cv2.VideoCapture(0)
    
    with FaceLandmarker.create_from_options(options) as landmarker:
        try:
            while cap.isOpened():
                success, frame = cap.read()
                if not success: continue

                # Tasks API expects RGB and mp.Image format
                frame = cv2.flip(frame, 1)
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
                
                # Send to landmarker (non-blocking)
                timestamp = int(time.time() * 1000)
                landmarker.detect_async(mp_image, timestamp)

                # Send data to Tampermonkey
                await websocket.send(json.dumps({"offset": current_offset}))
                
                # Small sleep to match frame rate (~30fps)
                await asyncio.sleep(0.03)

        except websockets.ConnectionClosed:
            print("Tampermonkey disconnected.")
        finally:
            cap.release()

async def main():
    async with websockets.serve(head_tracker_server, "localhost", 8765):
        print("Server running on ws://localhost:8765")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
