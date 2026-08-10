import cv2
import numpy as np

cv2.namedWindow("Test", cv2.WND_PROP_FULLSCREEN)
cv2.setWindowProperty("Test", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

for i in range(20):
    cv2.waitKey(50)
    rect = cv2.getWindowImageRect("Test")
    print(f"Iteration {i}: {rect}")

cv2.destroyAllWindows()
