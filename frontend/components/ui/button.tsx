import * as React from "react";

import { cn } from "@/lib/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" &&
          "bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-400",
        variant === "secondary" &&
          "border border-white/10 bg-white/5 text-white hover:bg-white/10",
        variant === "ghost" &&
          "bg-transparent text-slate-300 hover:bg-white/5 hover:text-white",
        className,
      )}
      {...props}
    />
  );
}
