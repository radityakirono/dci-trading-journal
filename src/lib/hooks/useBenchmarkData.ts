"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchIhsgBenchmark } from "@/lib/api-client";
import type { BenchmarkPoint } from "@/lib/benchmark";

interface UseBenchmarkDataResult {
  benchmarkSeries: BenchmarkPoint[];
  isLoading: boolean;
  error: string;
}

export function useBenchmarkData(
  period1?: string,
  period2?: string
): UseBenchmarkDataResult {
  const [benchmarkSeries, setBenchmarkSeries] = useState<BenchmarkPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const key = useMemo(() => `${period1 ?? ""}:${period2 ?? ""}`, [period1, period2]);

  useEffect(() => {
    if (!period1) {
      setBenchmarkSeries([]);
      setError("");
      return;
    }

    let mounted = true;
    const startDate = period1;

    async function loadBenchmark() {
      setIsLoading(true);
      setError("");

      try {
        const nextSeries = await fetchIhsgBenchmark(startDate, period2);
        if (!mounted) return;
        setBenchmarkSeries(nextSeries);
      } catch (loadError) {
        if (!mounted) return;
        setBenchmarkSeries([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load benchmark data."
        );
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadBenchmark();

    return () => {
      mounted = false;
    };
  }, [key, period1, period2]);

  return {
    benchmarkSeries,
    isLoading,
    error,
  };
}
