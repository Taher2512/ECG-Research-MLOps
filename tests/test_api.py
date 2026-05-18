import importlib
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


@pytest.fixture
def client(monkeypatch):
    import app.model

    class DummyModel:
        pass

    monkeypatch.setattr(app.model, "load_model", lambda _: DummyModel())

    main = importlib.import_module("app.main")
    main = importlib.reload(main)

    def fake_predict(model, signal):
        return 1, 0.91, [0.05, 0.91, 0.04]

    monkeypatch.setattr(main, "predict", fake_predict)

    from fastapi.testclient import TestClient

    return TestClient(main.app)


def test_health_returns_200(client):
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["classes"] == ["Normal", "APC", "VTach"]


def test_predict_accepts_180_sample_signal(client):
    payload = {"signal": [0.0] * 180}

    response = client.post("/predict", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["predicted_class"] in {"Normal", "APC", "VTach"}
    assert 0.0 <= body["confidence"] <= 1.0
    assert set(body["probabilities"]) == {"Normal", "APC", "VTach"}


def test_predict_rejects_wrong_length_signal(client):
    payload = {"signal": [0.0] * 179}

    response = client.post("/predict", json=payload)

    assert response.status_code == 400
    assert "180 samples" in response.json()["detail"]
