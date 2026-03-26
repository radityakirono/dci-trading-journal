"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import { ExportModal } from "@/components/export/export-modal";
import { Button } from "@/components/ui/button";
import type { ExportOptions } from "@/lib/reports/data";

interface ExportButtonProps {
  onGenerate: (options: ExportOptions) => Promise<unknown>;
  isExporting?: boolean;
  error?: string;
}

export function ExportButton({
  onGenerate,
  isExporting = false,
  error = "",
}: ExportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="px-2.5 sm:px-4"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Download className="size-4" />
        <span className="hidden sm:inline">Export</span>
      </Button>

      <ExportModal
        open={open}
        onOpenChange={setOpen}
        onGenerate={onGenerate}
        isExporting={isExporting}
        error={error}
      />
    </>
  );
}
