from __future__ import annotations
from typing import List, Tuple, Optional, Dict, Any

import cv2
import numpy as np
from PIL import Image

from facenet_pytorch import MTCNN

# It will return face detected from image -> MTCNN Algo is used here
def build_face_detector(device):
    return MTCNN(keep_all=False, device=device, post_process=False)


# Instead of full video, we will extract 10 frames for each video -> PIL RGB images
def sample_video_frames(video_path: str, num_frames: int = 10) -> List[Tuple[int, Image.Image]]:
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frames: List[Tuple[int, Image.Image]] = []

    if total_frames > 0:
        sample_count = min(num_frames, total_frames)
        indices = np.linspace(0, total_frames - 1, sample_count, dtype=int).tolist()

        for frame_idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            success, frame_bgr = cap.read()
            if not success:
                continue

            frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            frame_pil = Image.fromarray(frame_rgb)
            frames.append((int(frame_idx), frame_pil))
    else:
        # Fallback if frame count is unavailable
        step = 1
        if num_frames > 0:
            step = 10

        idx = 0
        while True:
            success, frame_bgr = cap.read()
            if not success:
                break

            if idx % step == 0:
                frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
                frame_pil = Image.fromarray(frame_rgb)
                frames.append((idx, frame_pil))

            idx += 1
            if len(frames) >= num_frames:
                break

    cap.release()
    return frames


# By default, ai has detected face tightly, so we are increasing cropped size (by margin of 0.30 factor)
def _expand_box(box: np.ndarray, image_width: int, image_height: int, margin_ratio: float = 0.30) -> Tuple[int, int, int, int]:
    x1, y1, x2, y2 = box.astype(float)

    w = x2 - x1
    h = y2 - y1

    mx = w * margin_ratio
    my = h * margin_ratio

    left = max(0, int(x1 - mx))
    top = max(0, int(y1 - my))
    right = min(image_width, int(x2 + mx))
    bottom = min(image_height, int(y2 + my))

    # Avoid invalid crop
    if right <= left:
        right = min(image_width, left + 1)
    if bottom <= top:
        bottom = min(image_height, top + 1)

    return left, top, right, bottom


# It will detected and crop face from our frame
def detect_and_crop_face(frame_pil: Image.Image, detector: MTCNN, output_size: int = 299, margin_ratio: float = 0.30,
    fallback_to_full_frame: bool = True,):
    boxes, probs = detector.detect(frame_pil)

    if boxes is None or len(boxes) == 0:
        if not fallback_to_full_frame:
            return None, False, None

        resized = frame_pil.resize((output_size, output_size))
        return resized, False, None

    # Pick the best face
    if probs is not None and len(probs) > 0:
        best_idx = int(np.argmax(probs))
        confidence = float(probs[best_idx])
    else:
        best_idx = 0
        confidence = None

    box = boxes[best_idx]
    left, top, right, bottom = _expand_box(
        box,
        image_width=frame_pil.width,
        image_height=frame_pil.height,
        margin_ratio=margin_ratio,
    )

    cropped = frame_pil.crop((left, top, right, bottom))
    cropped = cropped.resize((output_size, output_size))

    return cropped, True, confidence

# It will take frames from video -> detect and crop faces -> convert them into tensors.
def process_video_frames(video_path: str, detector: MTCNN, transform, num_frames: int = 10, output_size: int = 299,
    margin_ratio: float = 0.30, fallback_to_full_frame: bool = True,):

    sampled_frames = sample_video_frames(video_path, num_frames=num_frames)

    processed_items: List[Dict[str, Any]] = []
    skipped_count = 0

    for frame_index, frame_pil in sampled_frames:
        face_img, face_found, face_conf = detect_and_crop_face(
            frame_pil=frame_pil,
            detector=detector,
            output_size=output_size,
            margin_ratio=margin_ratio,
            fallback_to_full_frame=fallback_to_full_frame,
        )

        if face_img is None:
            skipped_count += 1
            continue

        tensor = transform(face_img)

        processed_items.append({
            "frame_index": frame_index,
            "tensor": tensor,
            "face_found": face_found,
            "face_confidence": face_conf,
        })

    return processed_items, skipped_count