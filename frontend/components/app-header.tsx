"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";
import { SystemStatusPill } from "@/components/system-status-pill";

const navItems = [
  { href: "/", label: "Predict" },
  { href: "/batch", label: "Batch" },
  { href: "/health", label: "Health" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="relative z-10 border-b border-white/5">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
              ECG Arrhythmia Detector
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                AI-powered cardiac beat classification
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
                Normal · APC · VTach decision support, built for fast clinical review and connected to the live FastAPI inference service.
              </p>
            </div>
          </div>
          <SystemStatusPill />
        </div>
        <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition",
                  active
                    ? "border-blue-400/40 bg-blue-500/15 text-white"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
