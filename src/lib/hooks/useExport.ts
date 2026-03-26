"use client";

import { useState } from "react";

import { useToast } from "@/components/ui/toast-provider";
import {
  buildReportData,
  type BuildReportDataInput,
  type ExportOptions,
} from "@/lib/reports/data";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function useExport(input: BuildReportDataInput) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string>("");
  const { showToast } = useToast();

  async function generateExport(options: ExportOptions) {
    setIsExporting(true);
    setExportError("");

    try {
      const reportData = buildReportData(input, options);
      const blob =
        options.format === "PDF"
          ? await (await import("@/lib/reports/generatePDF")).generatePDF(reportData)
          : await (await import("@/lib/reports/generateExcel")).generateExcel(reportData);

      const extension = options.format === "PDF" ? "pdf" : "xlsx";
      triggerDownload(blob, `${reportData.fileBaseName}.${extension}`);
      showToast({
        tone: "success",
        title: "Report generated",
        description: `${reportData.fileBaseName}.${extension} has started downloading.`,
      });
      return { reportData };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate export.";
      setExportError(message);
      showToast({
        tone: "error",
        title: "Export failed",
        description: message,
      });
      throw error;
    } finally {
      setIsExporting(false);
    }
  }

  return {
    isExporting,
    exportError,
    clearExportError: () => setExportError(""),
    generateExport,
  };
}
