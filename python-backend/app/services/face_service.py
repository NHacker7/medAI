import cv2
import numpy as np
import face_recognition


def generate_face_encoding(file_bytes: bytes):
    nparr = np.frombuffer(file_bytes, np.uint8)

    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Invalid image.")

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    encodings = face_recognition.face_encodings(rgb)

    if len(encodings) == 0:
        raise ValueError("No face detected.")

    return encodings[0].tolist()