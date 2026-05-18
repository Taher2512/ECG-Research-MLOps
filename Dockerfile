FROM python:3.10-slim

WORKDIR /app

ARG TORCH_VERSION=2.2.1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==${TORCH_VERSION}

COPY app/ ./app/
COPY models/best_finetuned_model.pth ./models/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
