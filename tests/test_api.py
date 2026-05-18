import importlib
import sys
import types
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def _install_torch_stub(monkeypatch):
    fake_torch = types.ModuleType("torch")
    fake_nn = types.ModuleType("torch.nn")
    fake_nn.Module = object
    fake_torch.nn = fake_nn

    monkeypatch.setitem(sys.modules, "torch", fake_torch)
    monkeypatch.setitem(sys.modules, "torch.nn", fake_nn)


@pytest.fixture
def client(monkeypatch):
    _install_torch_stub(monkeypatch)

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


def test_batch_predict_returns_one_result_per_input(client):
    payload = [{"signal": [0.0] * 180}, {"signal": [0.1] * 180}]

    response = client.post("/batch", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert all(item["predicted_class"] in {"Normal", "APC", "VTach"} for item in body)
