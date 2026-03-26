export interface BenchmarkPoint {
  date: string;
  close: number;
}

function sortSeries(points: BenchmarkPoint[]) {
  return [...points].sort((left, right) => left.date.localeCompare(right.date));
}

function findPointOnOrBefore(points: BenchmarkPoint[], date: string) {
  let match: BenchmarkPoint | null = null;

  for (const point of points) {
    if (point.date > date) break;
    match = point;
  }

  return match;
}

function findPointOnOrAfter(points: BenchmarkPoint[], date: string) {
  return points.find((point) => point.date >= date) ?? null;
}

function resolveStartPoint(points: BenchmarkPoint[], date: string) {
  return findPointOnOrBefore(points, date) ?? findPointOnOrAfter(points, date);
}

export function getBenchmarkReturn(
  points: BenchmarkPoint[],
  startDate: string,
  endDate: string
) {
  if (points.length === 0) return null;

  const sorted = sortSeries(points);
  const startPoint = resolveStartPoint(sorted, startDate);
  const endPoint = findPointOnOrBefore(sorted, endDate) ?? findPointOnOrAfter(sorted, endDate);

  if (!startPoint || !endPoint || startPoint.close <= 0 || endPoint.date < startPoint.date) {
    return null;
  }

  return (endPoint.close - startPoint.close) / startPoint.close;
}

export function buildNormalizedBenchmarkSeries(
  equityPoints: Array<{ date: string }>,
  benchmarkPoints: BenchmarkPoint[]
) {
  if (equityPoints.length === 0 || benchmarkPoints.length === 0) {
    return equityPoints.map((point) => ({
      date: point.date,
      benchmarkClose: null,
      benchmarkReturn: null,
    }));
  }

  const sortedBenchmark = sortSeries(benchmarkPoints);
  const basePoint = resolveStartPoint(sortedBenchmark, equityPoints[0].date);

  if (!basePoint || basePoint.close <= 0) {
    return equityPoints.map((point) => ({
      date: point.date,
      benchmarkClose: null,
      benchmarkReturn: null,
    }));
  }

  return equityPoints.map((point) => {
    const match = findPointOnOrBefore(sortedBenchmark, point.date);

    if (!match || match.close <= 0) {
      return {
        date: point.date,
        benchmarkClose: null,
        benchmarkReturn: null,
      };
    }

    return {
      date: point.date,
      benchmarkClose: match.close,
      benchmarkReturn: (match.close - basePoint.close) / basePoint.close,
    };
  });
}

export function formatBenchmarkValue(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "N/A";

  return value.toLocaleString("id-ID", {
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  });
}
