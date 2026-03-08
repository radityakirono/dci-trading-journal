import type {
  CashFlowEntry,
  EquityPoint,
  SignalNotification,
  Transaction,
} from "@/lib/types";

const STARTING_EQUITY = 420_000_000;

export const stockUniverse = [
  { ticker: "BBCA", name: "Bank Central Asia Tbk." },
  { ticker: "BBRI", name: "Bank Rakyat Indonesia Tbk." },
  { ticker: "BMRI", name: "Bank Mandiri (Persero) Tbk." },
  { ticker: "TLKM", name: "Telkom Indonesia (Persero) Tbk." },
  { ticker: "ASII", name: "Astra International Tbk." },
  { ticker: "ADRO", name: "Alamtri Resources Indonesia Tbk." },
  { ticker: "ICBP", name: "Indofood CBP Sukses Makmur Tbk." },
  { ticker: "UNVR", name: "Unilever Indonesia Tbk." },
  { ticker: "GOTO", name: "GoTo Gojek Tokopedia Tbk." },
  { ticker: "INDF", name: "Indofood Sukses Makmur Tbk." },
] as const;

export const idxTickers = stockUniverse.map((stock) => stock.ticker);

export const marketPrices: Record<string, number> = {
  BBCA: 9_300,
  BBRI: 5_775,
  TLKM: 4_140,
  ASII: 5_675,
  ADRO: 2_710,
  ICBP: 11_025,
};

export const initialTransactions: Transaction[] = [
  {
    id: "tx-001",
    date: "2026-01-15",
    ticker: "BBCA",
    side: "BUY",
    quantity: 50,
    price: 8_950,
    fee: 67_125,
    note: "Accumulation on pullback.",
  },
  {
    id: "tx-002",
    date: "2026-01-20",
    ticker: "BBRI",
    side: "BUY",
    quantity: 80,
    price: 5_420,
    fee: 65_040,
    note: "Banking momentum setup.",
  },
  {
    id: "tx-003",
    date: "2026-02-03",
    ticker: "TLKM",
    side: "BUY",
    quantity: 70,
    price: 3_980,
    fee: 41_790,
    note: "Defensive allocation with yield support.",
  },
  {
    id: "tx-004",
    date: "2026-02-19",
    ticker: "BBCA",
    side: "SELL",
    quantity: 20,
    price: 9_260,
    fee: 46_300,
    note: "Partial profit taking.",
  },
  {
    id: "tx-005",
    date: "2026-02-25",
    ticker: "ASII",
    side: "BUY",
    quantity: 60,
    price: 5_380,
    fee: 48_420,
    note: "Entry near support zone.",
  },
  {
    id: "tx-006",
    date: "2026-03-02",
    ticker: "ADRO",
    side: "BUY",
    quantity: 90,
    price: 2_640,
    fee: 35_640,
    note: "Energy trend continuation.",
  },
];

export const initialCashJournal: CashFlowEntry[] = [
  {
    id: "cf-001",
    date: "2026-01-02",
    type: "DEPOSIT",
    amount: 120_000_000,
    note: "Top up awal tahun.",
  },
  {
    id: "cf-002",
    date: "2026-01-27",
    type: "WITHDRAWAL",
    amount: 20_000_000,
    note: "Realisasi profit bulanan.",
  },
  {
    id: "cf-003",
    date: "2026-02-14",
    type: "DEPOSIT",
    amount: 70_000_000,
    note: "Tambahan modal untuk swing.",
  },
  {
    id: "cf-004",
    date: "2026-02-28",
    type: "ADJUSTMENT",
    amount: -3_250_000,
    note: "Penyesuaian biaya data & platform.",
  },
];

export const initialSignalNotifications: SignalNotification[] = [
  {
    id: "sig-001",
    createdAt: "2026-03-09T08:20:00.000Z",
    ticker: "BBCA",
    type: "BUY",
    message: "Breakout above consolidation range with rising volume.",
    source: "Signal Engine A",
    confidence: 0.82,
    isRead: false,
  },
  {
    id: "sig-002",
    createdAt: "2026-03-09T03:35:00.000Z",
    ticker: "TLKM",
    type: "HOLD",
    message: "Momentum flattening. Keep position and wait for confirmation.",
    source: "Signal Engine A",
    confidence: 0.64,
    isRead: false,
  },
  {
    id: "sig-003",
    createdAt: "2026-03-08T07:50:00.000Z",
    ticker: "ADRO",
    type: "SELL",
    message: "Take-profit zone reached near resistance.",
    source: "Signal Engine B",
    confidence: 0.78,
    isRead: true,
  },
  {
    id: "sig-004",
    createdAt: "2026-03-07T02:10:00.000Z",
    ticker: "BBRI",
    type: "ALERT",
    message: "Unusual volume spike detected in opening session.",
    source: "Signal Engine B",
    confidence: 0.71,
    isRead: true,
  },
];

export const initialEquitySeries: EquityPoint[] = buildEquitySeries(180);

function buildEquitySeries(days: number): EquityPoint[] {
  const points: EquityPoint[] = [];
  const start = new Date("2025-09-10T00:00:00.000Z");
  let equity = STARTING_EQUITY;

  for (let index = 0; index < days; index += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);

    const trend = 315_000;
    const wave = Math.sin(index / 8) * 1_750_000;
    const pullback = index % 27 === 0 ? -3_200_000 : 0;
    const breakout = index % 41 === 0 ? 2_750_000 : 0;
    const dailyPnl = Math.round(trend + wave + pullback + breakout);

    equity = Math.max(220_000_000, equity + dailyPnl);

    points.push({
      date: date.toISOString().slice(0, 10),
      equity: Number(equity.toFixed(0)),
      pnl: Number((equity - STARTING_EQUITY).toFixed(0)),
      dailyPnl,
    });
  }

  return points;
}
