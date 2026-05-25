# ECG Arrhythmia Detector Frontend

Clinical ECG arrhythmia detection dashboard built with Next.js App Router, Bun, Tailwind CSS, Recharts, and shadcn-style UI primitives. The frontend connects to the FastAPI backend at `http://localhost:8000`.

## Setup

```bash
bun install
bun run dev
```

Create `frontend/.env.local` with:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Open `http://localhost:3000` after the dev server starts.

## Routes

- `/` single-beat prediction dashboard
- `/batch` batch CSV analysis workflow
- `/health` backend system status view

## Features

- Hardcoded representative Normal, APC, and VTach sample beats
- Drag-and-drop CSV uploads for single-beat and batch workflows
- Recharts waveform and probability visualizations
- Live FastAPI health checks with model version display
- Toast-based error handling for failed API calls

## API Expectations

- `GET /health`
- `POST /predict` with `{ "signal": number[180] }`
- `POST /batch` with `[{ "signal": number[180] }]`

Probabilities returned by the backend are expected to sum to `1.0` and use the keys `Normal`, `APC`, and `VTach`.
