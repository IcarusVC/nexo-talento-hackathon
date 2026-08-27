"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CvDropzoneProps {
  /** Currently staged file (controlled by the parent). */
  file: File | null;
  onFileSelected: (file: File | null) => void;
  disabled?: boolean;
}

/** Drag-and-drop + click-to-browse PDF picker with inline validation. */
export function CvDropzone({ file, onFileSelected, disabled }: CvDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function accept(candidate: File | undefined) {
    if (!candidate) return;
    if (candidate.type !== "application/pdf") {
      toast.error("Solo se aceptan archivos PDF.");
      return;
    }
    if (candidate.size > 4 * 1024 * 1024) {
      toast.error("El archivo supera los 4 MB. Sube un PDF más liviano.");
      return;
    }
    onFileSelected(candidate);
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled) return;
          accept(e.dataTransfer.files?.[0]);
        }}
        aria-label="Subir CV en PDF: arrastra el archivo o haz clic para elegirlo"
        className={cn(
          "flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50",
          dragging
            ? "border-brand-coral bg-brand-coral/5"
            : "border-border bg-white hover:border-brand-navy/40"
        )}
      >
        <UploadCloud className="size-7 text-brand-coral" />
        {file ? (
          <span className="text-sm font-bold text-brand-navy">{file.name}</span>
        ) : (
          <>
            <span className="text-sm font-bold text-brand-navy">
              Arrastra tu CV aquí o haz clic para elegirlo
            </span>
            <span className="text-xs text-brand-navy/50">Solo PDF, hasta 4 MB.</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => accept(e.target.files?.[0] ?? undefined)}
      />
    </div>
  );
}
