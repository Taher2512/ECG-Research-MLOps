"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      richColors
      theme="dark"
      toastOptions={{
        classNames: {
          toast: "!border-gray-800 !bg-gray-900 !text-white",
          description: "!text-slate-400",
        },
      }}
    />
  );
}
