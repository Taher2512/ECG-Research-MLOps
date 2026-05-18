import os

from fastapi import FastAPI, HTTPException

from app.model import CLASS_NAMES, SIGNAL_LENGTH, load_model, predict
from app.schemas import ECGInput, PredictionOutput

MODEL_PATH = os.getenv("MODEL_PATH", "ecg-mlops/models/best_finetuned_model.pth")
MODEL_VERSION = os.getenv("MODEL_VERSION", "v3")

app = FastAPI(title="ECG Arrhythmia Detection API", version="1.0")
model = load_model(MODEL_PATH)


def _predict_single(signal: list[float]) -> PredictionOutput:
    if len(signal) != SIGNAL_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Signal must be exactly {SIGNAL_LENGTH} samples",
        )

    pred_class, confidence, probs = predict(model, signal)
    return PredictionOutput(
        predicted_class=CLASS_NAMES[pred_class],
        confidence=round(confidence, 4),
        probabilities={
            CLASS_NAMES[i]: round(float(prob), 4) for i, prob in enumerate(probs)
        },
        model_version=MODEL_VERSION,
    )


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "model_version": MODEL_VERSION,
        "model_path": MODEL_PATH,
        "classes": CLASS_NAMES,
    }


@app.post("/predict", response_model=PredictionOutput)
def predict_beat(data: ECGInput) -> PredictionOutput:
    return _predict_single(data.signal)


@app.post("/batch", response_model=list[PredictionOutput])
def predict_batch(signals: list[ECGInput]) -> list[PredictionOutput]:
    return [_predict_single(item.signal) for item in signals]
