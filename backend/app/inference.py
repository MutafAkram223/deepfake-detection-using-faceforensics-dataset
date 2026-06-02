from __future__ import annotations

from pathlib import Path
from typing import Dict, Any, List, Optional

import numpy as np
import torch

from .model_utils import load_model_bundle
from .video_utils import build_face_detector, process_video_frames


class DeepfakeVideoPredictor:
    
    # We ar e loading the trained Xception-TCNSC model once and reuses it for all predictions.

    def __init__(
        self,
        artifacts_dir: str | Path,
        device: Optional[torch.device] = None,
    ):
    
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")

        self.bundle = load_model_bundle(
            artifacts_dir=artifacts_dir,
            device=self.device
        )

        self.model = self.bundle.model
        self.transform = self.bundle.transform
        self.class_names = self.bundle.class_names
        self.original_class_idx = self.bundle.original_class_idx
        self.threshold = self.bundle.threshold
        self.image_size = self.bundle.image_size

        self.detector = build_face_detector(self.device)

        self.use_amp = (self.device.type == "cuda")
        self.amp_device = "cuda" if self.use_amp else "cpu"

    @torch.inference_mode()
    def predict_video(
        self,
        video_path: str,
        num_frames: int = 10,
        margin_ratio: float = 0.30,
        fallback_to_full_frame: bool = True,
        batch_size: int = 8,
    ) -> Dict[str, Any]:
        """
        Returns:
            {
              final_result: REAL / FAKE,
              fake_type: string or None,
              confidence: float,
              binary_fake_probability: float,
              binary_real_probability: float,
              final_class_idx: int,
              final_class_name: str,
              threshold: float,
              num_frames_used: int,
              skipped_frames: int,
              frame_results: [...]
            }
        """
        video_path = str(video_path)

        processed_items, skipped_count = process_video_frames(
            video_path=video_path,
            detector=self.detector,
            transform=self.transform,
            num_frames=num_frames,
            output_size=self.image_size,
            margin_ratio=margin_ratio,
            fallback_to_full_frame=fallback_to_full_frame,
        )

        if len(processed_items) == 0:
            raise ValueError("No usable frames were extracted from the video.")
        
        # Here, we are converting video frames into tensors
        tensors = [item["tensor"] for item in processed_items]
        tensors = torch.stack(tensors, dim=0).to(self.device)

        all_probs: List[np.ndarray] = []
        frame_results: List[Dict[str, Any]] = []

        for start in range(0, len(tensors), batch_size):
            batch = tensors[start:start + batch_size]

            with torch.amp.autocast(device_type=self.amp_device, enabled=self.use_amp):
                logits = self.model(batch)
                probs = torch.softmax(logits, dim=1)

            probs_np = probs.detach().cpu().numpy()
            all_probs.extend(probs_np)

            for i, prob_vec in enumerate(probs_np):
                pred_idx = int(np.argmax(prob_vec))
                pred_name = self.class_names[pred_idx]
                confidence = float(prob_vec[pred_idx])

                src = processed_items[start + i]
                frame_results.append({
                    "frame_index": int(src["frame_index"]),
                    "face_found": bool(src["face_found"]),
                    "face_confidence": None if src["face_confidence"] is None else float(src["face_confidence"]),
                    "prediction_index": pred_idx,
                    "prediction_name": pred_name,
                    "confidence": confidence,
                    "probabilities": {
                        self.class_names[j]: float(prob_vec[j])
                        for j in range(len(self.class_names))
                    },
                })

        avg_probs = np.mean(np.array(all_probs), axis=0)
        final_class_idx = int(np.argmax(avg_probs))
        final_class_name = self.class_names[final_class_idx]

        binary_real_probability = float(avg_probs[self.original_class_idx])
        binary_fake_probability = float(1.0 - binary_real_probability)

        if final_class_idx == self.original_class_idx:
            final_result = "REAL"
            fake_type = None
            confidence = binary_real_probability
        else:
            final_result = "FAKE"
            fake_type = final_class_name
            confidence = float(avg_probs[final_class_idx])

        return {
            "final_result": final_result,
            "fake_type": fake_type,
            "confidence": float(confidence),
            "binary_fake_probability": binary_fake_probability,
            "binary_real_probability": binary_real_probability,
            "final_class_idx": final_class_idx,
            "final_class_name": final_class_name,
            "threshold": float(self.threshold),
            "num_frames_used": len(processed_items),
            "skipped_frames": int(skipped_count),
            "frame_results": frame_results,
            "average_probabilities": {
                self.class_names[i]: float(avg_probs[i])
                for i in range(len(self.class_names))
            },
        }


# Optional singleton for app reuse
_predictor_instance: Optional[DeepfakeVideoPredictor] = None


def get_predictor(artifacts_dir: str | Path = "artifacts") -> DeepfakeVideoPredictor:
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = DeepfakeVideoPredictor(artifacts_dir=artifacts_dir)
    return _predictor_instance