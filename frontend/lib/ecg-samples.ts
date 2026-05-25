export type SampleBeatId = "normal" | "apc" | "vtach";

export interface SampleBeat {
  id: SampleBeatId;
  label: string;
  description: string;
  signal: number[];
  qrsPeak: number;
  borderClassName: string;
}

function roundValue(value: number) {
  return Number(value.toFixed(3));
}

function gaussian(index: number, center: number, width: number, amplitude: number) {
  return amplitude * Math.exp(-((index - center) ** 2) / (2 * width ** 2));
}

function baseline(index: number, scale = 0.018) {
  return (
    scale * Math.sin(index / 6.5) +
    scale * 0.5 * Math.cos(index / 10.5) +
    0.004 * Math.sin(index / 2.8)
  );
}

function createNormalSignal() {
  return Array.from({ length: 180 }, (_, index) =>
    roundValue(
      baseline(index) +
        gaussian(index, 21, 4.2, 0.34) +
        gaussian(index, 57, 1.6, -0.5) +
        gaussian(index, 60, 1.4, 3.05) +
        gaussian(index, 63, 1.7, -0.72) +
        gaussian(index, 102, 8.5, 0.58),
    ),
  );
}

function createApcSignal() {
  return Array.from({ length: 180 }, (_, index) =>
    roundValue(
      baseline(index, 0.016) +
        gaussian(index, 16, 3.2, 0.18) +
        gaussian(index, 42, 1.5, -0.42) +
        gaussian(index, 45, 1.9, 2.78) +
        gaussian(index, 48, 1.9, -0.48) +
        gaussian(index, 77, 8.5, -0.22) +
        gaussian(index, 110, 6.5, 0.08),
    ),
  );
}

function createVtachSignal() {
  return Array.from({ length: 180 }, (_, index) =>
    roundValue(
      baseline(index, 0.012) +
        gaussian(index, 52, 10.5, 2.3) +
        gaussian(index, 66, 7.6, 1.45) +
        gaussian(index, 80, 8.2, -1.15) +
        gaussian(index, 92, 7.5, 0.52),
    ),
  );
}

export const sampleBeats: SampleBeat[] = [
  {
    id: "normal",
    label: "Normal Beat",
    description: "Regular sinus morphology with a clean P-QRS-T sequence.",
    signal: createNormalSignal(),
    qrsPeak: 60,
    borderClassName: "border-emerald-400/40 hover:border-emerald-300/70",
  },
  {
    id: "apc",
    label: "APC Beat",
    description: "Premature atrial beat with an early QRS and muted T wave.",
    signal: createApcSignal(),
    qrsPeak: 45,
    borderClassName: "border-amber-400/40 hover:border-amber-300/70",
  },
  {
    id: "vtach",
    label: "VTach Beat",
    description: "Wide ventricular complex with no clear P wave.",
    signal: createVtachSignal(),
    qrsPeak: 64,
    borderClassName: "border-red-500/40 hover:border-red-400/80",
  },
];
