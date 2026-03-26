export interface MarketPriceSnapshot {
  price: number;
  change: number;
  changePct: number;
  prevClose: number | null;
  updatedAt: string;
  isDelayed: boolean;
  source: "cache" | "yahoo" | "fallback";
}

export function getJakartaMarketStatus(nowMs = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(nowMs));

  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const totalMinutes = hour * 60 + minute;
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  const isOpen = isWeekday && totalMinutes >= 540 && totalMinutes <= 990;

  return {
    isOpen,
    label: isOpen ? "Market Open" : "Market Closed",
    refreshIntervalMs: isOpen ? 60_000 : 600_000,
  };
}

export function formatRelativeMarketUpdate(updatedAtMs: number | null, nowMs = Date.now()) {
  if (!updatedAtMs) return "Waiting for price sync";
  const seconds = Math.max(0, Math.floor((nowMs - updatedAtMs) / 1000));
  if (seconds < 60) return `Last updated ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `Last updated ${minutes}m ago`;
}
