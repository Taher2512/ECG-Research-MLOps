"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { getErrorMessage, getHealth } from "@/lib/api";
import { cn } from "@/lib/cn";

interface StatusState {
  status: "loading" | "online" | "offline";
  modelVersion: string;
}

export function SystemStatusPill() {
  const [state, setState] = useState<StatusState>({
    status: "loading",
    modelVersion: "Checking",
  });

  useEffect(() => {
    let active = true;

    async function loadHealth() {
      try {
        const response = await getHealth();

        if (!active) {
          return;
        }

        setState({
          status: response.status === "ok" ? "online" : "offline",
          modelVersion: response.model_version,
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setState({
          status: "offline",
          modelVersion: "Unavailable",
        });
        toast.error("Unable to reach the ECG API", {
          description: getErrorMessage(error),
        });
      }
    }

    void loadHealth();

    return () => {
      active = false;
    };
  }, []);

  const offline = state.status === "offline";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-full border px-4 py-2 text-sm shadow-lg backdrop-blur",
        offline
          ? "border-red-500/30 bg-red-500/10 text-red-200"
          : "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
      )}
    >
      {offline ? (
        <AlertTriangle className="h-4 w-4 text-red-300" />
      ) : (
        <Activity className="h-4 w-4 text-emerald-300" />
      )}
      <span className="font-medium">
        {offline ? "Offline" : state.status === "loading" ? "Checking..." : "Model Online"}
      </span>
      <span className="text-xs uppercase tracking-[0.14em] text-slate-300/90">
        {state.modelVersion}
      </span>
    </div>
  );
}
