from typing import Dict, List

from pydantic import BaseModel, Field


class ECGInput(BaseModel):
    signal: List[float] = Field(
        ...,
        description="Normalized 180-point ECG beat.",
        examples=[[0.02, -0.11, 0.08, 0.31]],
    )


class PredictionOutput(BaseModel):
    predicted_class: str = Field(
        ...,
        description='Predicted label, for example "Normal", "APC", or "VTach".',
    )
    confidence: float = Field(..., description="Top-class confidence score.")
    probabilities: Dict[str, float] = Field(
        ...,
        description='Per-class probabilities such as {"Normal": 0.94, "APC": 0.04, "VTach": 0.02}.',
    )
    model_version: str = Field(..., description="Served model version tag.")
