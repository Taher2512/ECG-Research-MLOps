"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Layers3 } from "lucide-react";
import { toast } from "sonner";

import { type PredictionResponse, getErrorMessage, predictBatch } from "@/lib/api";
import { classDetails } from "@/lib/class-config";
import { parseCsvText, type ParsedCsvRow } from "@/lib/csv";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";

interface BatchRow extends ParsedCsvRow {
  rowNumber: number;
}

export function BatchDashboard() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [results, setResults] = useState<PredictionResponse[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const validRows = useMemo(() => rows.filter((row) => row.valid), [rows]);
  const invalidRows = useMemo(() => rows.filter((row) => !row.valid), [rows]);

  const summary = useMemo(() => {
    const initial = { Normal: 0, APC: 0, VTach: 0 };

    if (!results) {
      return initial;
    }

    return results.reduce((counts, result) => {
      counts[result.predicted_class] += 1;
      return counts;
    }, initial);
  }, [results]);

  async function handleBatchUpload(files: FileList) {
    const file = files[0];

    if (!file) {
      return;
    }

    try {
      const parsedRows = parseCsvText(await file.text()).map((row, index) => ({
        ...row,
        rowNumber: index + 1,
      }));

      setFileName(file.name);
      setRows(parsedRows);
      setResults(null);

      if (!parsedRows.length) {
        toast.error("CSV is empty", {
          description: "Add one beat per row with 180 values each.",
        });
        return;
      }

      if (parsedRows.some((row) => !row.valid)) {
        toast.warning("Some rows need attention", {
          description: "Each row must contain exactly 180 numeric values before batch analysis can run.",
        });
      } else {
        toast.success("Batch CSV loaded successfully.");
      }
    } catch (error) {
      toast.error("Upload failed", {
        description: getErrorMessage(error),
      });
    }
  }

  async function handleAnalyzeAll() {
    if (!validRows.length || invalidRows.length) {
      toast.error("Batch is not ready", {
        description: "Resolve invalid rows before running analysis.",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const payload = validRows.map((row) => row.values);
      const response = await predictBatch(payload);
      setResults(response);
      toast.success("Batch analysis complete", {
        description: `${response.length} beats analyzed successfully.`,
      });
    } catch (error) {
      toast.error("Batch prediction failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsAnalyzing(false);
    }
  }

  function exportResults() {
    if (!results) {
      return;
    }

    const header = "Beat #,Predicted Class,Confidence,Risk Level";
    const lines = results.map((result, index) => {
      const confidence = `${(result.confidence * 100).toFixed(1)}%`;
      const risk = classDetails[result.predicted_class].riskLabel;
      return `${index + 1},${result.predicted_class},${confidence},"${risk}"`;
    });

    const blob = new Blob([[header, ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ecg-batch-results.csv";
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Results exported as CSV.");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Batch Prediction Workflow</CardTitle>
          <CardDescription>
            Upload a CSV with one ECG beat per row. Each row must contain exactly 180 normalized sample values.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UploadDropzone
            accept=".csv,text/csv"
            description="Multiple rows supported. Every row is validated before analysis."
            onFiles={handleBatchUpload}
          />
          {fileName && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
              <div className="flex items-center gap-2 text-slate-200">
                <FileSpreadsheet className="h-4 w-4 text-blue-300" />
                <span>{fileName}</span>
              </div>
              <span className="font-mono text-xs text-slate-400">
                {rows.length} rows detected
              </span>
            </div>
          )}
          <Button
            className="h-11"
            disabled={!rows.length || !!invalidRows.length || isAnalyzing}
            onClick={() => {
              void handleAnalyzeAll();
            }}
          >
            {isAnalyzing ? "Analyzing..." : "Analyze All"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload Preview</CardTitle>
          <CardDescription>
            Review incoming rows before sending them to the backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {rows.length ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Row #</TableHeaderCell>
                  <TableHeaderCell>First 5 Values</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.rowNumber}>
                    <TableCell className="font-mono">{row.rowNumber}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-300">
                      {row.values.slice(0, 5).map((value) => value.toFixed(3)).join(", ")}
                      {row.values.length > 5 ? " ..." : ""}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          row.valid
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                            : "border-red-500/30 bg-red-500/10 text-red-300"
                        }
                      >
                        {row.valid ? "Ready" : row.error}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-slate-400">
              No batch loaded yet. Drop a CSV here to preview each row.
            </p>
          )}
        </CardContent>
      </Card>

      {results && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="md:col-span-3">
              <CardContent className="flex h-full flex-wrap items-center gap-4 p-6">
                <div className="flex items-center gap-3">
                  <Layers3 className="h-5 w-5 text-blue-300" />
                  <span className="text-sm font-medium text-slate-200">
                    {summary.Normal} Normal, {summary.APC} APC, {summary.VTach} VTach
                  </span>
                </div>
                <span className="text-sm text-slate-400">
                  out of {results.length} total beats
                </span>
              </CardContent>
            </Card>
            <Button
              className="h-full min-h-16"
              onClick={exportResults}
            >
              <Download className="mr-2 h-4 w-4" />
              Export results as CSV
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Prediction Results</CardTitle>
              <CardDescription>
                Each row is color-coded by the predicted rhythm class.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Beat #</TableHeaderCell>
                    <TableHeaderCell>Predicted Class</TableHeaderCell>
                    <TableHeaderCell>Confidence</TableHeaderCell>
                    <TableHeaderCell>Risk Level</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow
                      key={`${result.predicted_class}-${index}`}
                      className={cn(classDetails[result.predicted_class].rowClassName)}
                    >
                      <TableCell className="font-mono">{index + 1}</TableCell>
                      <TableCell>
                        <Badge
                          className={classDetails[result.predicted_class].badgeClassName}
                        >
                          {classDetails[result.predicted_class].badgeLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(result.confidence * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell>{classDetails[result.predicted_class].riskLabel}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
