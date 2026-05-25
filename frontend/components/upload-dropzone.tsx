"use client";

import { useId, useState } from "react";
import { FileUp, UploadCloud } from "lucide-react";

import { cn } from "@/lib/cn";

interface UploadDropzoneProps {
  accept: string;
  description: string;
  multiple?: boolean;
  onFiles: (files: FileList) => void;
}

export function UploadDropzone({
  accept,
  description,
  multiple = false,
  onFiles,
}: UploadDropzoneProps) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      className={cn(
        "rounded-3xl border border-dashed px-5 py-8 text-center transition",
        isDragging
          ? "border-blue-400/60 bg-blue-500/10"
          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);

        if (event.dataTransfer.files.length) {
          onFiles(event.dataTransfer.files);
        }
      }}
    >
      <div className="mx-auto flex max-w-md flex-col items-center gap-3">
        {isDragging ? (
          <FileUp className="h-10 w-10 text-blue-300" />
        ) : (
          <UploadCloud className="h-10 w-10 text-slate-400" />
        )}
        <div className="space-y-1">
          <p className="text-base font-medium text-white">
            Drag and drop your CSV here
          </p>
          <p className="text-sm leading-6 text-slate-400">{description}</p>
        </div>
        <label
          htmlFor={inputId}
          className="cursor-pointer rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          Browse files
        </label>
        <input
          id={inputId}
          className="hidden"
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(event) => {
            if (event.target.files?.length) {
              onFiles(event.target.files);
            }
          }}
        />
      </div>
    </div>
  );
}
