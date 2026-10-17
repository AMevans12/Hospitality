import threading

import cv2
import numpy as np
from django.conf import settings
from django.core.files.base import ContentFile

# ---- tuning knobs: adjust after a pilot with real staff ----
MIN_DET_SCORE = 0.60       # how sure the detector is that it really is a face
MIN_FACE_FRACTION = 0.20   # face width as a fraction of the photo's short side
MIN_SHARPNESS = 40.0       # blur check (higher = stricter)
SAME_PERSON = 0.50         # two photos of one person must be at least this similar
MIN_YAW_RANGE = 0.20       # how far the head must turn between photos (liveness)
MAX_SIDE = 1280            # big photos are shrunk before analysis


class FaceError(Exception):
    def __init__(self, detail, code):
        self.detail, self.code = detail, code


_app = None
_lock = threading.Lock()


def get_app():
    """Loads the face model once (the first call also downloads it)."""
    global _app
    with _lock:
        if _app is None:
            from insightface.app import FaceAnalysis
            app = FaceAnalysis(name=getattr(settings, 'FACE_MODEL', 'buffalo_l'),
                               root=str(settings.FACE_MODEL_DIR),
                               allowed_modules=['detection', 'recognition'],
                               providers=['CPUExecutionProvider'])
            app.prepare(ctx_id=-1, det_size=(640, 640))
            _app = app
    return _app


def _decode(upload):
    upload.seek(0)
    data = np.frombuffer(upload.read(), np.uint8)
    upload.seek(0)
    img = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if img is None:
        raise FaceError('That file is not a readable photo.', 'bad_image')
    h, w = img.shape[:2]
    if max(h, w) > MAX_SIDE:
        s = MAX_SIDE / max(h, w)
        img = cv2.resize(img, (int(w * s), int(h * s)))
    return img


def analyze(upload):
    """One photo -> face fingerprint + how far the head is turned. Raises FaceError if unusable."""
    img = _decode(upload)
    faces = get_app().get(img)
    if not faces:
        raise FaceError('No face found. Look straight at the camera in good light.', 'no_face')
    if len(faces) > 1:
        raise FaceError('More than one face in the photo. Only you should be in view.', 'multiple_faces')
    f = faces[0]
    h, w = img.shape[:2]
    x1, y1, x2, y2 = [int(v) for v in f.bbox]
    if f.det_score < MIN_DET_SCORE or (x2 - x1) < MIN_FACE_FRACTION * min(h, w):
        raise FaceError('Face is too small or unclear. Move closer and hold still.', 'poor_quality')
    crop = img[max(y1, 0):max(y2, 1), max(x1, 0):max(x2, 1)]
    gray = cv2.cvtColor(cv2.resize(crop, (112, 112)), cv2.COLOR_BGR2GRAY)
    if cv2.Laplacian(gray, cv2.CV_64F).var() < MIN_SHARPNESS:
        raise FaceError('Photo is blurry. Hold the phone steady and try again.', 'blurry')
    eye_l, eye_r, nose = f.kps[0], f.kps[1], f.kps[2]
    span = max(abs(float(eye_r[0] - eye_l[0])), 1e-6)
    yaw = float((nose[0] - (eye_l[0] + eye_r[0]) / 2) / span)     # about 0 = straight, grows as the head turns
    return {'embedding': f.normed_embedding, 'yaw': yaw, 'det': float(f.det_score)}


def enroll(emp, uploads):
    if emp.face_embedding:
        raise FaceError('Face is already enrolled. Ask HR to reset it first.', 'already_enrolled')
    if not 3 <= len(uploads) <= 6:
        raise FaceError('Send 3 to 6 photos.', 'bad_count')
    shots = [analyze(u) for u in uploads]
    embs = np.stack([s['embedding'] for s in shots])
    mean = embs.mean(axis=0)
    mean /= np.linalg.norm(mean)
    for e in embs:
        if float(np.dot(e, mean)) < SAME_PERSON:
            raise FaceError('The photos do not look like the same person. Please retake.', 'inconsistent')
    best = max(range(len(shots)), key=lambda i: shots[i]['det'] - abs(shots[i]['yaw']))
    uploads[best].seek(0)
    emp.face_embedding = [round(float(x), 6) for x in mean]
    emp.face_image.save(f'{emp.username}.jpg', ContentFile(uploads[best].read()), save=False)
    emp.save()


def verify(emp, uploads, min_score):
    """Is this the enrolled person, and are they live? Returns {'score', 'best'} or raises FaceError."""
    if not 2 <= len(uploads) <= 4:
        raise FaceError('Face photos are missing. Please retake.', 'bad_count')
    ref = np.array(emp.face_embedding, dtype=np.float32)
    shots = [analyze(u) for u in uploads]
    scores = [float(np.dot(s['embedding'], ref)) for s in shots]
    best = max(range(len(shots)), key=lambda i: scores[i])
    for s in shots:                                                  # all photos must be one person
        if float(np.dot(s['embedding'], shots[best]['embedding'])) < SAME_PERSON:
            raise FaceError('The photos do not look like the same person. Please retake.', 'inconsistent')
    yaws = [s['yaw'] for s in shots]
    if max(yaws) - min(yaws) < MIN_YAW_RANGE:                        # liveness: the head must move
        raise FaceError('Turn your head slightly to one side while the photos are taken.', 'no_movement')
    if scores[best] < min_score:
        raise FaceError('Face did not match. Try again in better light, looking at the camera.', 'face_mismatch')
    return {'score': round(scores[best], 3), 'best': best}