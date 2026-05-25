export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export type PredictionClass = "Normal" | "APC" | "VTach";

export interface PredictionResponse {
  predicted_class: PredictionClass;
  confidence: number;
  probabilities: {
    Normal: number;
    APC: number;
    VTach: number;
  };
  model_version: string;
}

export interface HealthResponse {
  status: string;
  model_version: string;
  model_path?: string;
  classes?: string[];
}

class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { detail?: string };
    return data.detail || `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while talking to the ECG API.";
}

export async function predictBeat(
  signal: number[],
): Promise<PredictionResponse> {
  return request<PredictionResponse>("/predict", {
    method: "POST",
    body: JSON.stringify({ signal }),
  });
}

export async function predictBatch(
  signals: number[][],
): Promise<PredictionResponse[]> {
  return request<PredictionResponse[]>("/batch", {
    method: "POST",
    body: JSON.stringify(signals.map((signal) => ({ signal }))),
  });
}

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}
