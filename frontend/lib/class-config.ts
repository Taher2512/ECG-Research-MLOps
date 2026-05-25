import type { PredictionClass } from "@/lib/api";

export const classDetails: Record<
  PredictionClass,
  {
    badgeLabel: string;
    badgeClassName: string;
    accentClassName: string;
    accentHex: string;
    chartHex: string;
    riskLabel: string;
    meaning: string;
    rowClassName: string;
  }
> = {
  Normal: {
    badgeLabel: "NORMAL",
    badgeClassName:
      "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    accentClassName: "text-emerald-300",
    accentHex: "#34d399",
    chartHex: "#34d399",
    riskLabel: "Low Risk - No intervention required",
    meaning:
      "A normal sinus beat shows a regular P-QRS-T pattern. No action required.",
    rowClassName: "border-emerald-400/15 bg-emerald-400/5",
  },
  APC: {
    badgeLabel: "APC",
    badgeClassName: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    accentClassName: "text-amber-300",
    accentHex: "#fbbf24",
    chartHex: "#fbbf24",
    riskLabel: "Moderate Risk - Monitor recommended",
    meaning:
      "An Atrial Premature Contraction is an early heartbeat originating in the atria. Usually benign but worth monitoring if frequent.",
    rowClassName: "border-amber-400/15 bg-amber-400/5",
  },
  VTach: {
    badgeLabel: "VTACH",
    badgeClassName: "border-red-500/30 bg-red-500/10 text-red-300",
    accentClassName: "text-red-300",
    accentHex: "#ef4444",
    chartHex: "#ef4444",
    riskLabel: "HIGH RISK - Immediate attention required",
    meaning:
      "Ventricular Tachycardia originates in the ventricles and can be life-threatening. Seek immediate medical evaluation.",
    rowClassName: "border-red-500/15 bg-red-500/5",
  },
};
