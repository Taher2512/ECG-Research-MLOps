"use client";

import { useEffect, useState } from "react";
import { ActivitySquare, Cable, RefreshCw, Server } from "lucide-react";
import { toast } from "sonner";

import { getErrorMessage, getHealth, type HealthResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const endpoints = [
  "GET /health",
  "POST /predict",
  "POST /batch",
];

interface HealthState {
  data: HealthResponse | null;
  latency: number | null;
  loading: boolean;
}

export function HealthDashboard() {
  const [state, setState] = useState<HealthState>({
    data: null,
    latency: null,
    loading: true,
  });

  async function loadHealth(options?: { showToast?: boolean; setLoading?: boolean }) {
    const { showToast = false, setLoading = true } = options || {};

    if (setLoading) {
      setState((current) => ({ ...current, loading: true }));
    }

    try {
      const startedAt = performance.now();
      const response = await getHealth();
      const latency = Math.round(performance.now() - startedAt);

      setState({
        data: response,
        latency,
        loading: false,
      });

      if (showToast) {
        toast.success("Health check refreshed.");
      }
    } catch (error) {
      setState({
        data: null,
        latency: null,
        loading: false,
      });
      toast.error("Health check failed", {
        description: getErrorMessage(error),
      });
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadHealth({ setLoading: false });
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const isOnline = state.data?.status === "ok";

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>
            Current availability of the connected inference service.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-black/15 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
                  Model status
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {state.loading ? "Checking..." : isOnline ? "Online" : "Offline"}
                </p>
              </div>
              <Server
                className={`h-8 w-8 ${isOnline ? "text-emerald-300" : "text-red-300"}`}
              />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Badge
                className={
                  isOnline
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                    : "border-red-500/30 bg-red-500/10 text-red-300"
                }
              >
                {isOnline ? "Model Online" : "Offline"}
              </Badge>
              <span className="text-sm text-slate-400">
                Version {state.data?.model_version || "Unavailable"}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-2 text-slate-300">
                <ActivitySquare className="h-4 w-4 text-blue-300" />
                <span className="text-sm font-medium">Response time</span>
              </div>
              <p className="mt-3 text-2xl font-semibold text-white">
                {state.latency !== null ? `${state.latency}ms` : "--"}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-2 text-slate-300">
                <Cable className="h-4 w-4 text-blue-300" />
                <span className="text-sm font-medium">API base</span>
              </div>
              <p className="mt-3 text-sm font-medium text-white">
                {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            className="w-full"
            disabled={state.loading}
            onClick={() => {
              void loadHealth({ showToast: true });
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh health check
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Available Endpoints</CardTitle>
            <CardDescription>
              Core API routes exposed by the FastAPI service.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {endpoints.map((endpoint) => (
              <div
                key={endpoint}
                className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 font-mono text-sm text-slate-200"
              >
                {endpoint}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Raw Health Payload</CardTitle>
            <CardDescription>
              The dashboard reads the live response and displays the model version directly from the backend.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-3xl border border-white/10 bg-black/20 p-5 font-mono text-xs leading-6 text-slate-300">
              {JSON.stringify(state.data, null, 2) || "null"}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
