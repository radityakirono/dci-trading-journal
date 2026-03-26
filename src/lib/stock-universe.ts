/**
 * IDX80 stock universe
 * Effective period: 2 February 2026 - 30 April 2026
 * Source: IDX major evaluation (January 2026)
 */

export interface Stock {
  ticker: string;
  name: string;
  sector: string;
}

export const sectorColors: Record<string, string> = {
  Mining: "#d97706",
  Energy: "#f59e0b",
  Banking: "#2563eb",
  "Financial Services": "#3b82f6",
  Consumer: "#22c55e",
  Healthcare: "#10b981",
  Retail: "#14b8a6",
  Property: "#8b5cf6",
  Telco: "#06b6d4",
  Infrastructure: "#64748b",
  Technology: "#ec4899",
  Media: "#f43f5e",
  Industrial: "#7c3aed",
  Agriculture: "#84cc16",
  Materials: "#f97316",
  Construction: "#6366f1",
};

export const stockUniverse: Stock[] = [
  { ticker: "AADI", name: "Adaro Andalan Indonesia Tbk", sector: "Mining" },
  { ticker: "ADMR", name: "Alamtri Minerals Indonesia Tbk", sector: "Mining" },
  { ticker: "AMMN", name: "Amman Mineral Internasional Tbk", sector: "Mining" },
  { ticker: "ANTM", name: "Aneka Tambang Tbk", sector: "Mining" },
  { ticker: "BRMS", name: "Bumi Resources Minerals Tbk", sector: "Mining" },
  { ticker: "BUMI", name: "Bumi Resources Tbk", sector: "Mining" },
  { ticker: "HRUM", name: "Harum Energy Tbk", sector: "Mining" },
  { ticker: "INCO", name: "Vale Indonesia Tbk", sector: "Mining" },
  { ticker: "ITMG", name: "Indo Tambangraya Megah Tbk", sector: "Mining" },
  { ticker: "MBMA", name: "Merdeka Battery Materials Tbk", sector: "Mining" },
  { ticker: "MDKA", name: "Merdeka Copper Gold Tbk", sector: "Mining" },
  { ticker: "NCKL", name: "Trimegah Bangun Persada Tbk", sector: "Mining" },
  { ticker: "PTBA", name: "Bukit Asam Tbk", sector: "Mining" },
  { ticker: "PTRO", name: "Petrosea Tbk", sector: "Mining" },
  { ticker: "ADRO", name: "Alamtri Resources Indonesia Tbk", sector: "Energy" },
  { ticker: "BREN", name: "Barito Renewables Energy Tbk", sector: "Energy" },
  { ticker: "BRPT", name: "Barito Pacific Tbk", sector: "Energy" },
  { ticker: "ELSA", name: "Elnusa Tbk", sector: "Energy" },
  { ticker: "ENRG", name: "Energi Mega Persada Tbk", sector: "Energy" },
  { ticker: "ESSA", name: "Essa Industries Indonesia Tbk", sector: "Energy" },
  { ticker: "INDY", name: "Indika Energy Tbk", sector: "Energy" },
  { ticker: "MEDC", name: "Medco Energi Internasional Tbk", sector: "Energy" },
  { ticker: "PGAS", name: "Perusahaan Gas Negara Tbk", sector: "Energy" },
  { ticker: "PGEO", name: "Pertamina Geothermal Energy Tbk", sector: "Energy" },
  { ticker: "RAJA", name: "Rukun Raharja Tbk", sector: "Energy" },
  { ticker: "RATU", name: "Raharja Energi Cepu Tbk", sector: "Energy" },
  { ticker: "ARTO", name: "Bank Jago Tbk", sector: "Banking" },
  { ticker: "BBCA", name: "Bank Central Asia Tbk", sector: "Banking" },
  { ticker: "BBNI", name: "Bank Negara Indonesia Tbk", sector: "Banking" },
  { ticker: "BBRI", name: "Bank Rakyat Indonesia Tbk", sector: "Banking" },
  { ticker: "BBTN", name: "Bank Tabungan Negara Tbk", sector: "Banking" },
  { ticker: "BMRI", name: "Bank Mandiri Tbk", sector: "Banking" },
  { ticker: "BTPS", name: "Bank BTPN Syariah Tbk", sector: "Banking" },
  { ticker: "PNLF", name: "Panin Financial Tbk", sector: "Financial Services" },
  { ticker: "CMRY", name: "Cisarua Mountain Dairy Tbk", sector: "Consumer" },
  { ticker: "CPIN", name: "Charoen Pokphand Indonesia Tbk", sector: "Consumer" },
  { ticker: "HRTA", name: "Hartadinata Abadi Tbk", sector: "Consumer" },
  { ticker: "ICBP", name: "Indofood CBP Sukses Makmur Tbk", sector: "Consumer" },
  { ticker: "INDF", name: "Indofood Sukses Makmur Tbk", sector: "Consumer" },
  { ticker: "MYOR", name: "Mayora Indah Tbk", sector: "Consumer" },
  { ticker: "UNVR", name: "Unilever Indonesia Tbk", sector: "Consumer" },
  { ticker: "HEAL", name: "Medikaloka Hermina Tbk", sector: "Healthcare" },
  { ticker: "KLBF", name: "Kalbe Farma Tbk", sector: "Healthcare" },
  { ticker: "MIKA", name: "Mitra Keluarga Karyasehat Tbk", sector: "Healthcare" },
  { ticker: "SIDO", name: "Industri Jamu & Farmasi Sido Muncul Tbk", sector: "Healthcare" },
  { ticker: "ACES", name: "Aspirasi Hidup Indonesia Tbk", sector: "Retail" },
  { ticker: "AMRT", name: "Sumber Alfaria Trijaya Tbk", sector: "Retail" },
  { ticker: "ERAA", name: "Erajaya Swasembada Tbk", sector: "Retail" },
  { ticker: "MAPA", name: "MAP Aktif Adiperkasa Tbk", sector: "Retail" },
  { ticker: "MAPI", name: "Mitra Adiperkasa Tbk", sector: "Retail" },
  { ticker: "BSDE", name: "Bumi Serpong Damai Tbk", sector: "Property" },
  { ticker: "CTRA", name: "Ciputra Development Tbk", sector: "Property" },
  { ticker: "KIJA", name: "Jababeka Tbk", sector: "Property" },
  { ticker: "KPIG", name: "MNC Tourism Tbk", sector: "Property" },
  { ticker: "PANI", name: "Pantai Indah Kapuk Dua Tbk", sector: "Property" },
  { ticker: "PWON", name: "Pakuwon Jati Tbk", sector: "Property" },
  { ticker: "SMRA", name: "Summarecon Agung Tbk", sector: "Property" },
  { ticker: "SSIA", name: "Surya Semesta Internusa Tbk", sector: "Property" },
  { ticker: "EXCL", name: "XL Axiata Tbk", sector: "Telco" },
  { ticker: "ISAT", name: "Indosat Tbk", sector: "Telco" },
  { ticker: "JSMR", name: "Jasa Marga Tbk", sector: "Infrastructure" },
  { ticker: "MTEL", name: "Dayamitra Telekomunikasi Tbk", sector: "Telco" },
  { ticker: "TLKM", name: "Telkom Indonesia Tbk", sector: "Telco" },
  { ticker: "TOWR", name: "Sarana Menara Nusantara Tbk", sector: "Telco" },
  { ticker: "WIFI", name: "Solusi Sinergi Digital Tbk", sector: "Technology" },
  { ticker: "BUKA", name: "Bukalapak.com Tbk", sector: "Technology" },
  { ticker: "EMTK", name: "Elang Mahkota Teknologi Tbk", sector: "Technology" },
  { ticker: "GOTO", name: "GoTo Gojek Tokopedia Tbk", sector: "Technology" },
  { ticker: "SCMA", name: "Surya Citra Media Tbk", sector: "Media" },
  { ticker: "AKRA", name: "AKR Corporindo Tbk", sector: "Industrial" },
  { ticker: "ASII", name: "Astra International Tbk", sector: "Industrial" },
  { ticker: "CUAN", name: "Petrindo Jaya Kreasi Tbk", sector: "Industrial" },
  { ticker: "DSSA", name: "Dian Swastatika Sentosa Tbk", sector: "Industrial" },
  { ticker: "UNTR", name: "United Tractors Tbk", sector: "Industrial" },
  { ticker: "DSNG", name: "Dharma Satya Nusantara Tbk", sector: "Agriculture" },
  { ticker: "JPFA", name: "JAPFA Comfeed Indonesia Tbk", sector: "Agriculture" },
  { ticker: "TAPG", name: "Triputra Agro Persada Tbk", sector: "Agriculture" },
  { ticker: "INKP", name: "Indah Kiat Pulp & Paper Tbk", sector: "Materials" },
  { ticker: "INTP", name: "Indocement Tunggal Prakarsa Tbk", sector: "Construction" },
  { ticker: "SMGR", name: "Semen Indonesia (Persero) Tbk", sector: "Construction" },
];

export const stockUniverseAlphabetical = [...stockUniverse].sort((left, right) =>
  left.ticker.localeCompare(right.ticker)
);

export const stockUniverseMap = new Map<string, Stock>(
  stockUniverse.map((stock) => [stock.ticker, stock] as const)
);

export const idxTickers = stockUniverse.map((stock) => stock.ticker);
export const sectors = [...new Set(stockUniverse.map((stock) => stock.sector))].sort();

export function normalizeTicker(input: string) {
  return input.trim().toUpperCase().replace(/\.JK$/, "");
}

export function getStockByTicker(ticker: string) {
  return stockUniverseMap.get(normalizeTicker(ticker));
}

export function getSectorColor(sector: string) {
  return sectorColors[sector] ?? "#64748b";
}

export function groupBySector(stocks: Stock[]): Record<string, Stock[]> {
  const grouped: Record<string, Stock[]> = {};
  for (const stock of stocks) {
    (grouped[stock.sector] ??= []).push(stock);
  }
  return grouped;
}
