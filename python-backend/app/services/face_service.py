import cv2
import numpy as np
import face_recognition


def improve_lighting(image):
    """
    Improve a dark image before face detection.
    Uses CLAHE on the brightness channel.
    """

    # Convert BGR to LAB
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)

    # Split channels
    l_channel, a_channel, b_channel = cv2.split(lab)

    # Improve local contrast/brightness
    clahe = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8)
    )

    l_channel = clahe.apply(l_channel)

    # Merge channels
    enhanced_lab = cv2.merge(
        (l_channel, a_channel, b_channel)
    )

    # Convert back to BGR
    enhanced_image = cv2.cvtColor(
        enhanced_lab,
        cv2.COLOR_LAB2BGR
    )

    return enhanced_image


def generate_face_encoding(file_bytes: bytes):

    # --------------------------------------------------
    # 1. Convert uploaded bytes into an OpenCV image
    # --------------------------------------------------

    nparr = np.frombuffer(
        file_bytes,
        np.uint8
    )

    image = cv2.imdecode(
        nparr,
        cv2.IMREAD_COLOR
    )

    if image is None:
        raise ValueError("Invalid image.")


    # --------------------------------------------------
    # 2. Improve lighting
    # --------------------------------------------------

    enhanced_image = improve_lighting(image)


    # --------------------------------------------------
    # 3. Convert BGR -> RGB
    # --------------------------------------------------

    rgb = cv2.cvtColor(
        enhanced_image,
        cv2.COLOR_BGR2RGB
    )


    # --------------------------------------------------
    # 4. Detect faces
    # --------------------------------------------------

    face_locations = face_recognition.face_locations(
        rgb,
        number_of_times_to_upsample=2,
        model="hog"
    )


    # --------------------------------------------------
    # 5. Check face count
    # --------------------------------------------------

    if len(face_locations) == 0:
        raise ValueError(
            "No face detected. Please improve lighting and position your face clearly."
        )

    if len(face_locations) > 1:
        raise ValueError(
            "Multiple faces detected. Please keep only one person in the frame."
        )


    # --------------------------------------------------
    # 6. Generate 128-dimensional face encoding
    # --------------------------------------------------

    encodings = face_recognition.face_encodings(
        rgb,
        known_face_locations=face_locations
    )

    if len(encodings) == 0:
        raise ValueError(
            "Could not generate face encoding."
        )


    # --------------------------------------------------
    # 7. Return encoding
    # --------------------------------------------------

    return encodings[0].tolist()


def compare_face(
    uploaded_encoding,
    stored_encoding
):

    # No stored encoding
    if not stored_encoding:
        return False, 999.0


    # Convert to NumPy arrays
    uploaded = np.array(
        uploaded_encoding,
        dtype=np.float64
    )

    stored = np.array(
        stored_encoding,
        dtype=np.float64
    )


    # Validate encoding dimensions
    if uploaded.shape != (128,):
        return False, 999.0

    if stored.shape != (128,):
        return False, 999.0


    # --------------------------------------------------
    # Calculate face distance
    # --------------------------------------------------

    distance = face_recognition.face_distance(
        [stored],
        uploaded
    )[0]

    distance = float(distance)


    # --------------------------------------------------
    # Recognition threshold
    # --------------------------------------------------

    match = distance < 0.50


    return match, distance