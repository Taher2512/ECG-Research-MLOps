"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Clock3,
  Heart,
  Stethoscope,
  Upload,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import type { PredictionClass, PredictionResponse } from "@/lib/api";
import { getErrorMessage, predictBeat } from "@/lib/api";
import { classDetails } from "@/lib/class-config";
import { parseCsvText } from "@/lib/csv";
import { sampleBeats, type SampleBeat, type SampleBeatId } from "@/lib/ecg-samples";
import { cn } from "@/lib/cn";
import { UploadDropzone } from "@/components/upload-dropzone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const sampleIcons: Record<SampleBeatId, typeof Heart> = {
  normal: Heart,
  apc: Activity,
  vtach: AlertTriangle,
};

interface PredictionState {
  latency: number;
  result: PredictionResponse;
}

function createSignalChartData(signal: number[]) {
  return signal.map((value, index) => ({ index, value }));
}

function renderSparkline(sample: SampleBeat) {
  return (
    <ResponsiveContainer width="100%" height={56}>
      <LineChart data={createSignalChartData(sample.signal)}>
        <Line
          type="monotone"
          dataKey="value"
          dot={false}
          strokeWidth={2}
          stroke={
            sample.id === "normal"
              ? "#34d399"
              : sample.id === "apc"
                ? "#fbbf24"
                : "#ef4444"
          }
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function HomeDashboard() {
  const defaultSample = sampleBeats[0];
  const [selectedSampleId, setSelectedSampleId] = useState<SampleBeatId | null>(
    defaultSample.id,
  );
  const [activeSignal, setActiveSignal] = useState<number[]>(defaultSample.signal);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedRowCount, setUploadedRowCount] = useState<number | null>(null);
  const [prediction, setPrediction] = useState<PredictionState | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const selectedSample = useMemo(
    () =>
      selectedSampleId
        ? sampleBeats.find((sample) => sample.id === selectedSampleId) ?? null
        : null,
    [selectedSampleId],
  );

  const signalChartData = useMemo(
    () => createSignalChartData(activeSignal),
    [activeSignal],
  );

  const predictedClass = prediction?.result.predicted_class;

  const probabilityData = useMemo(() => {
    if (!prediction) {
      return [];
    }

    return (Object.entries(prediction.result.probabilities) as Array<
      [PredictionClass, number]
    >).map(([name, value]) => ({
      name,
      percentage: Number((value * 100).toFixed(1)),
      label: `${(value * 100).toFixed(1)}%`,
      fill: classDetails[name].chartHex,
    }));
  }, [prediction]);

  async function handleSampleSelect(sample: SampleBeat) {
    setSelectedSampleId(sample.id);
    setActiveSignal(sample.signal);
    setValidationError(null);
    setUploadedFileName(null);
    setUploadedRowCount(null);
    setPrediction(null);
  }

  async function handleSingleUpload(files: FileList) {
    const file = files[0];

    if (!file) {
      return;
    }

    try {
      const rows = parseCsvText(await file.text());
      setUploadedFileName(file.name);
      setUploadedRowCount(rows.length);
      setPrediction(null);

      if (!rows.length) {
        setSelectedSampleId(null);
        setValidationError("CSV file is empty.");
        return;
      }

      const firstRow = rows[0];

      if (!firstRow.valid) {
        setSelectedSampleId(null);
        setValidationError(firstRow.error || "CSV validation failed.");
        return;
      }

      setActiveSignal(firstRow.values);
      setSelectedSampleId(null);
      setValidationError(null);

      if (rows.length > 1) {
        toast.info("Loaded the first beat from a multi-row CSV.", {
          description: `${rows.length} rows were detected in ${file.name}.`,
        });
      } else {
        toast.success("Custom ECG beat loaded.");
      }
    } catch (error) {
      setValidationError("Unable to read the CSV file.");
      toast.error("Upload failed", {
        description: getErrorMessage(error),
      });
    }
  }

  async function handleAnalyze() {
    if (activeSignal.length !== 180 || validationError) {
      toast.error("ECG beat is not ready", {
        description: validationError || "Signal must contain exactly 180 values.",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const startedAt = performance.now();
      const result = await predictBeat(activeSignal);
      const latency = Math.round(performance.now() - startedAt);

      setPrediction({ result, latency });
      toast.success("Beat classification complete", {
        description: `${result.predicted_class} detected with ${(result.confidence * 100).toFixed(1)}% confidence.`,
      });
    } catch (error) {
      toast.error("Prediction failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsAnalyzing(false);
    }
  }

  const signalColor = predictedClass
    ? classDetails[predictedClass].chartHex
    : "#60a5fa";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Select a Sample Beat</CardTitle>
            <CardDescription>
              Choose a representative waveform to prefill the model input, or use it as a reference before uploading your own signal.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {sampleBeats.map((sample) => {
              const Icon = sampleIcons[sample.id];
              const active = selectedSampleId === sample.id;

              return (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => {
                    void handleSampleSelect(sample);
                  }}
                  className={cn(
                    "rounded-3xl border bg-black/10 p-4 text-left transition",
                    sample.borderClassName,
                    active
                      ? "scale-[1.01] bg-white/[0.04] shadow-lg"
                      : "opacity-90 hover:opacity-100",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{sample.label}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {sample.description}
                      </p>
                    </div>
                    <Icon className="mt-0.5 h-4 w-4 text-slate-200" />
                  </div>
                  <div className="mt-4">{renderSparkline(sample)}</div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Or Upload Your Own</CardTitle>
            <CardDescription>
              CSV format: single row, 180 comma-separated float values. The first row will be used if multiple rows are present.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <UploadDropzone
              accept=".csv,text/csv"
              description="Expected layout: one beat per row with 180 normalized samples."
              onFiles={handleSingleUpload}
            />
            {(uploadedFileName || validationError) && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                {uploadedFileName && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-200">
                      <Upload className="h-4 w-4 text-blue-300" />
                      <span>{uploadedFileName}</span>
                    </div>
                    <span className="font-mono text-xs text-slate-400">
                      {uploadedRowCount ?? 0} row(s)
                    </span>
                  </div>
                )}
                {validationError && (
                  <p className="mt-3 text-sm text-red-300">{validationError}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Signal Preview</CardTitle>
            <CardDescription>
              Active input window of 180 samples. Line color updates to reflect the predicted class after analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="h-[220px] rounded-3xl border border-white/5 bg-black/20 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={signalChartData} margin={{ top: 16, right: 20, left: 8, bottom: 12 }}>
                  <CartesianGrid className="chart-grid" vertical={false} />
                  <XAxis
                    dataKey="index"
                    className="chart-axis"
                    tickMargin={8}
                    minTickGap={24}
                    label={{
                      value: "Sample (0-179)",
                      position: "insideBottom",
                      offset: -6,
                    }}
                  />
                  <YAxis
                    className="chart-axis"
                    width={48}
                    tickMargin={8}
                    label={{
                      value: "Amplitude (normalized)",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip
                    cursor={{ stroke: "rgba(148,163,184,0.2)" }}
                    contentStyle={{
                      background: "#020617",
                      border: "1px solid rgba(148,163,184,0.18)",
                      borderRadius: "14px",
                    }}
                    formatter={(value: number) => [value.toFixed(3), "Amplitude"]}
                    labelFormatter={(label) => `Sample ${label}`}
                  />
                  {selectedSample && (
                    <ReferenceLine
                      x={selectedSample.qrsPeak}
                      stroke="rgba(226,232,240,0.4)"
                      strokeDasharray="4 4"
                      label={{
                        value: "QRS",
                        fill: "#e2e8f0",
                        fontSize: 12,
                        position: "insideTopRight",
                      }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="value"
                    dot={false}
                    stroke={signalColor}
                    strokeWidth={2.4}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <Button
              className="h-12 w-full text-base"
              disabled={isAnalyzing || !!validationError || activeSignal.length !== 180}
              onClick={() => {
                void handleAnalyze();
              }}
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Beat"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {!prediction ? (
          <Card className="flex min-h-[520px] items-center justify-center">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Stethoscope className="h-12 w-12 text-slate-500" />
              <h2 className="mt-5 text-xl font-semibold text-white">
                Submit an ECG beat to see results
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                The model output, confidence breakdown, and clinical context will appear here after inference completes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card
              className={cn(
                prediction.result.predicted_class === "VTach" && "vtach-alert",
              )}
            >
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <Badge
                      className={
                        classDetails[prediction.result.predicted_class].badgeClassName
                      }
                    >
                      {classDetails[prediction.result.predicted_class].badgeLabel}
                    </Badge>
                    <div>
                      <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
                        Diagnosis Confidence
                      </p>
                      <p className="mt-2 text-5xl font-semibold text-white">
                        {(prediction.result.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <Clock3 className="h-5 w-5 text-slate-300" />
                  </div>
                </div>
                <div
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm font-medium",
                    classDetails[prediction.result.predicted_class].badgeClassName,
                  )}
                >
                  {classDetails[prediction.result.predicted_class].riskLabel}
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Probability Breakdown</CardTitle>
                <CardDescription>
                  Relative model confidence across all three rhythm classes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={probabilityData}
                      layout="vertical"
                      margin={{ top: 10, right: 34, left: 8, bottom: 10 }}
                    >
                      <CartesianGrid className="chart-grid" horizontal={false} />
                      <XAxis
                        type="number"
                        className="chart-axis"
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <YAxis
                        type="category"
                        className="chart-axis"
                        width={70}
                        dataKey="name"
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        contentStyle={{
                          background: "#020617",
                          border: "1px solid rgba(148,163,184,0.18)",
                          borderRadius: "14px",
                        }}
                        formatter={(value: number) => [`${value.toFixed(1)}%`, "Probability"]}
                      />
                      <Bar dataKey="percentage" radius={[0, 12, 12, 0]}>
                        {probabilityData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                        <LabelList
                          dataKey="label"
                          position="right"
                          fill="#e2e8f0"
                          fontSize={12}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prediction Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  ["Model Version", prediction.result.model_version],
                  ["Inference Time", `${prediction.latency}ms`],
                  ["Beat Window", "180 samples (0.5s at 360Hz)"],
                  ["Classification", prediction.result.predicted_class],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/10 px-4 py-3 text-sm"
                  >
                    <span className="text-slate-400">{label}</span>
                    <span className="font-medium text-white">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What this means</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-slate-300">
                  {classDetails[prediction.result.predicted_class].meaning}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
