from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms

try:
    import timm
except ImportError as e:
    raise ImportError(
        "timm is required for Xception. Install it with: pip install timm"
    ) from e


DEFAULT_CLASS_NAMES = [
    "Original",
    "Deepfakes",
    "Face2Face",
    "FaceShifter",
    "FaceSwap",
    "NeuralTextures",
]

DEFAULT_IMAGE_SIZE = 299
DEFAULT_MEAN = [0.485, 0.456, 0.406]
DEFAULT_STD = [0.229, 0.224, 0.225]


class TCNSCModel(nn.Module):
    """
    Xception + TCNSC style:
    - shared encoder
    - multi-class classifier head
    - similarity projector head
    """

    def __init__(self, num_classes: int = 6):
        super().__init__()

        # We load pretrained=False here because weights will be loaded from .pth
        self.encoder = timm.create_model("xception", pretrained=False, num_classes=0, global_pool="avg",)

        self.feature_dim = self.encoder.num_features

        self.classifier = nn.Sequential(
            nn.Linear(self.feature_dim, 512),
            nn.BatchNorm1d(512),
            nn.SiLU(),
            nn.Dropout(0.4),
            nn.Linear(512, 256),
            nn.BatchNorm1d(256),
            nn.SiLU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes),
        )

        self.projector = nn.Sequential(
            nn.Linear(self.feature_dim, 256),
            nn.BatchNorm1d(256),
            nn.SiLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 128),
        )

    def extract_features(self, x: torch.Tensor) -> torch.Tensor:
        feat = self.encoder(x)
        if feat.dim() == 4:
            feat = F.adaptive_avg_pool2d(feat, 1)
            feat = torch.flatten(feat, 1)
        return feat

    def forward(self, x_hq: torch.Tensor, x_lq: Optional[torch.Tensor] = None):
        feat_hq = self.extract_features(x_hq)
        class_output = self.classifier(feat_hq)

        if x_lq is not None:
            feat_lq = self.extract_features(x_lq)

            proj_hq = self.projector(feat_hq)
            proj_lq = self.projector(feat_lq)

            proj_hq = F.normalize(proj_hq, dim=1)
            proj_lq = F.normalize(proj_lq, dim=1)

            return class_output, proj_hq, proj_lq

        return class_output


# It act as a container that will store all important variables that are required for inference
@dataclass
class ModelBundle:
    model: nn.Module
    class_names: List[str]
    class_to_idx: Dict[str, int]
    idx_to_class: Dict[int, str]
    original_class_idx: int
    threshold: float
    image_size: int
    mean: List[float]
    std: List[float]
    config: Dict[str, Any]
    meta: Dict[str, Any]
    transform: transforms.Compose


# Here, below 5 functions starting with _ (underscore) are internal functions which means tehy will be required by files
# and we will not call them in code any where.
def _load_json(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _strip_module_prefix(state_dict: Dict[str, torch.Tensor]) -> Dict[str, torch.Tensor]:
    cleaned = {}
    for k, v in state_dict.items():
        new_key = k.replace("module.", "", 1) if k.startswith("module.") else k
        cleaned[new_key] = v
    return cleaned


def _load_checkpoint(path: Path, map_location: str | torch.device):
    try:
        # Newer PyTorch versions support this safely for weights-only files.
        return torch.load(path, map_location=map_location, weights_only=True)
    except TypeError:
        return torch.load(path, map_location=map_location)
    except Exception:
        # Fallback for older / mixed checkpoint formats.
        return torch.load(path, map_location=map_location)


def _extract_state_dict(loaded_obj: Any) -> Dict[str, torch.Tensor]:
    if isinstance(loaded_obj, dict) and "model_state_dict" in loaded_obj:
        loaded_obj = loaded_obj["model_state_dict"]

    if not isinstance(loaded_obj, dict):
        raise ValueError("Checkpoint does not look like a PyTorch state_dict.")

    return _strip_module_prefix(loaded_obj)


def _extract_class_names(class_map_data: Dict[str, Any]) -> List[str]:
    # Expected formats:
    # 1) {"class_names": [...]}
    # 2) {"idx_to_class": {"0":"Original", ...}}
    # 3) {"class_to_idx": {"Original":0, ...}}
    if "class_names" in class_map_data and isinstance(class_map_data["class_names"], list):
        return list(class_map_data["class_names"])

    if "idx_to_class" in class_map_data and isinstance(class_map_data["idx_to_class"], dict):
        items = class_map_data["idx_to_class"].items()
        return [v for k, v in sorted(items, key=lambda kv: int(kv[0]))]

    if "class_to_idx" in class_map_data and isinstance(class_map_data["class_to_idx"], dict):
        inv = {int(v): k for k, v in class_map_data["class_to_idx"].items()}
        return [inv[i] for i in sorted(inv.keys())]

    return DEFAULT_CLASS_NAMES


def build_inference_transform(image_size: int = DEFAULT_IMAGE_SIZE, mean: Optional[List[float]] = None,
    std: Optional[List[float]] = None,) -> transforms.Compose:
    mean = mean or DEFAULT_MEAN
    std = std or DEFAULT_STD

    return transforms.Compose([transforms.Resize((image_size, image_size)), transforms.ToTensor(),
        transforms.Normalize(mean=mean, std=std),])


def load_model_bundle(artifacts_dir: str | Path, device: Optional[torch.device] = None,) -> ModelBundle:
    artifacts_dir = Path(artifacts_dir)
    device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")

    meta_path = artifacts_dir / "best_tcnsc_model_meta.json"
    config_path = artifacts_dir / "best_tcnsc_model_config.json"
    class_map_path = artifacts_dir / "class_mapping.json"
    weights_path = artifacts_dir / "best_tcnsc_model_state_dict.pth"

    meta = _load_json(meta_path)
    config = _load_json(config_path)
    class_map_data = _load_json(class_map_path)

    class_names = _extract_class_names(class_map_data)
    if not class_names:
        class_names = DEFAULT_CLASS_NAMES

    class_to_idx = {name: idx for idx, name in enumerate(class_names)}
    idx_to_class = {idx: name for name, idx in class_to_idx.items()}

    original_class_idx = int(config.get("original_class_idx", 0))
    image_size = int(config.get("image_size", DEFAULT_IMAGE_SIZE))
    mean = config.get("normalize_mean", DEFAULT_MEAN)
    std = config.get("normalize_std", DEFAULT_STD)

    threshold = float(
        meta.get(
            "best_threshold",
            config.get("threshold_default", 0.5)
        )
    )

    model = TCNSCModel(num_classes=len(class_names))
    loaded_obj = _load_checkpoint(weights_path, map_location=device)
    state_dict = _extract_state_dict(loaded_obj)

    model.load_state_dict(state_dict, strict=True)
    model.to(device)
    model.eval()

    transform = build_inference_transform(image_size=image_size, mean=mean, std=std)

    return ModelBundle(
        model=model,
        class_names=class_names,
        class_to_idx=class_to_idx,
        idx_to_class=idx_to_class,
        original_class_idx=original_class_idx,
        threshold=threshold,
        image_size=image_size,
        mean=mean,
        std=std,
        config=config,
        meta=meta,
        transform=transform,
    )