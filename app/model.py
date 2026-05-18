from __future__ import annotations

from pathlib import Path
from typing import Sequence

import numpy as np
import torch
import torch.nn as nn

SIGNAL_LENGTH = 180
NUM_CLASSES = 3
CLASS_NAMES = ["Normal", "APC", "VTach"]


class ECGClassifier(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Conv1d(1, 32, 7, padding=3),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.MaxPool1d(2),
            nn.Conv1d(32, 64, 5, padding=2),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.MaxPool1d(2),
            nn.Conv1d(64, 128, 3, padding=1),
            nn.BatchNorm1d(128),
            nn.ReLU(),
        )
        self.pool = nn.AdaptiveAvgPool1d(1)
        self.fc = nn.Sequential(
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, NUM_CLASSES),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x.unsqueeze(1)
        x = self.encoder(x)
        x = self.pool(x).squeeze(-1)
        return self.fc(x)


def _project_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _resolve_model_path(model_path: str | Path) -> Path:
    path = Path(model_path)
    if path.is_absolute():
        return path
    return (_project_root() / path).resolve()


def _load_state_dict(model_path: Path, device: torch.device) -> dict[str, torch.Tensor]:
    try:
        return torch.load(model_path, map_location=device, weights_only=True)
    except TypeError:
        return torch.load(model_path, map_location=device)


def load_model(
    model_path: str | Path,
    device: str | torch.device | None = None,
) -> ECGClassifier:
    resolved_model_path = _resolve_model_path(model_path)
    if not resolved_model_path.exists():
        raise FileNotFoundError(f"Model checkpoint not found: {resolved_model_path}")

    target_device = torch.device(
        device if device is not None else ("cuda" if torch.cuda.is_available() else "cpu")
    )
    model = ECGClassifier().to(target_device)
    state_dict = _load_state_dict(resolved_model_path, target_device)
    model.load_state_dict(state_dict)
    model.eval()
    return model


def _preprocess_signal(signal: Sequence[float] | np.ndarray) -> np.ndarray:
    array = np.asarray(signal, dtype=np.float32)
    if array.ndim != 1:
        raise ValueError(f"Expected a 1D ECG beat, got shape {tuple(array.shape)}")
    if array.shape[0] != SIGNAL_LENGTH:
        raise ValueError(
            f"Expected ECG beat of length {SIGNAL_LENGTH}, got {array.shape[0]}"
        )
    return array


def predict(
    model: ECGClassifier,
    signal: Sequence[float] | np.ndarray,
) -> tuple[int, float, list[float]]:
    processed_signal = _preprocess_signal(signal)
    device = next(model.parameters()).device
    inputs = torch.from_numpy(processed_signal).unsqueeze(0).to(device)

    with torch.no_grad():
        logits = model(inputs)
        probabilities = torch.softmax(logits, dim=1).squeeze(0).cpu().tolist()

    predicted_index = int(np.argmax(probabilities))
    confidence = float(probabilities[predicted_index])
    return predicted_index, confidence, probabilities
