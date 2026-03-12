/**
 * IDX80 Stock Universe
 * Full list of stocks used by the DCI signal engine.
 * Each entry includes ticker, company name, and GICS sector.
 */

export interface Stock {
  ticker: string;
  name: string;
  sector: string;
}

export const stockUniverse: Stock[] = [
  // ── Financials ──────────────────────────────────────
  { ticker: "BBCA", name: "Bank Central Asia Tbk.", sector: "Financials" },
  { ticker: "BBRI", name: "Bank Rakyat Indonesia Tbk.", sector: "Financials" },
  { ticker: "BMRI", name: "Bank Mandiri (Persero) Tbk.", sector: "Financials" },
  { ticker: "BBNI", name: "Bank Negara Indonesia Tbk.", sector: "Financials" },
  { ticker: "BRIS", name: "Bank Syariah Indonesia Tbk.", sector: "Financials" },
  { ticker: "BBTN", name: "Bank Tabungan Negara Tbk.", sector: "Financials" },
  { ticker: "BNGA", name: "Bank CIMB Niaga Tbk.", sector: "Financials" },
  { ticker: "BDMN", name: "Bank Danamon Indonesia Tbk.", sector: "Financials" },
  { ticker: "NISP", name: "Bank OCBC NISP Tbk.", sector: "Financials" },
  { ticker: "PNBN", name: "Bank Pan Indonesia Tbk.", sector: "Financials" },
  { ticker: "MEGA", name: "Bank Mega Tbk.", sector: "Financials" },
  { ticker: "BJBR", name: "Bank Pembangunan Daerah Jawa Barat Tbk.", sector: "Financials" },
  { ticker: "ARTO", name: "Bank Jago Tbk.", sector: "Financials" },
  { ticker: "ADMF", name: "Adira Dinamika Multi Finance Tbk.", sector: "Financials" },
  { ticker: "BFIN", name: "BFI Finance Indonesia Tbk.", sector: "Financials" },

  // ── Consumer Staples ─────────────────────────────────
  { ticker: "ICBP", name: "Indofood CBP Sukses Makmur Tbk.", sector: "Consumer Staples" },
  { ticker: "INDF", name: "Indofood Sukses Makmur Tbk.", sector: "Consumer Staples" },
  { ticker: "UNVR", name: "Unilever Indonesia Tbk.", sector: "Consumer Staples" },
  { ticker: "MYOR", name: "Mayora Indah Tbk.", sector: "Consumer Staples" },
  { ticker: "CPIN", name: "Charoen Pokphand Indonesia Tbk.", sector: "Consumer Staples" },
  { ticker: "AMRT", name: "Sumber Alfaria Trijaya Tbk.", sector: "Consumer Staples" },
  { ticker: "KLBF", name: "Kalbe Farma Tbk.", sector: "Consumer Staples" },
  { ticker: "SIDO", name: "Industri Jamu Sido Muncul Tbk.", sector: "Consumer Staples" },
  { ticker: "HMSP", name: "H.M. Sampoerna Tbk.", sector: "Consumer Staples" },
  { ticker: "GGRM", name: "Gudang Garam Tbk.", sector: "Consumer Staples" },

  // ── Energy ───────────────────────────────────────────
  { ticker: "ADRO", name: "Alamtri Resources Indonesia Tbk.", sector: "Energy" },
  { ticker: "PTBA", name: "Bukit Asam Tbk.", sector: "Energy" },
  { ticker: "ITMG", name: "Indo Tambangraya Megah Tbk.", sector: "Energy" },
  { ticker: "MEDC", name: "Medco Energi Internasional Tbk.", sector: "Energy" },
  { ticker: "AKRA", name: "AKR Corporindo Tbk.", sector: "Energy" },
  { ticker: "ELSA", name: "Elnusa Tbk.", sector: "Energy" },

  // ── Industrials ──────────────────────────────────────
  { ticker: "ASII", name: "Astra International Tbk.", sector: "Industrials" },
  { ticker: "UNTR", name: "United Tractors Tbk.", sector: "Industrials" },
  { ticker: "SGER", name: "Semen Indonesia (Persero) Tbk.", sector: "Industrials" },
  { ticker: "INTP", name: "Indocement Tunggal Prakarsa Tbk.", sector: "Industrials" },
  { ticker: "SMGR", name: "Semen Indonesia (Persero) Tbk.", sector: "Industrials" },
  { ticker: "WIKA", name: "Wijaya Karya (Persero) Tbk.", sector: "Industrials" },
  { ticker: "PTPP", name: "PP (Persero) Tbk.", sector: "Industrials" },
  { ticker: "JSMR", name: "Jasa Marga (Persero) Tbk.", sector: "Industrials" },

  // ── Telecommunications ───────────────────────────────
  { ticker: "TLKM", name: "Telkom Indonesia (Persero) Tbk.", sector: "Telecommunications" },
  { ticker: "EXCL", name: "XL Axiata Tbk.", sector: "Telecommunications" },
  { ticker: "ISAT", name: "Indosat Tbk.", sector: "Telecommunications" },
  { ticker: "TOWR", name: "Sarana Menara Nusantara Tbk.", sector: "Telecommunications" },
  { ticker: "TBIG", name: "Tower Bersama Infrastructure Tbk.", sector: "Telecommunications" },
  { ticker: "MTEL", name: "Dayamitra Telekomunikasi Tbk.", sector: "Telecommunications" },

  // ── Technology ───────────────────────────────────────
  { ticker: "GOTO", name: "GoTo Gojek Tokopedia Tbk.", sector: "Technology" },
  { ticker: "BUKA", name: "Bukalapak.com Tbk.", sector: "Technology" },
  { ticker: "EMTK", name: "Elang Mahkota Teknologi Tbk.", sector: "Technology" },
  { ticker: "DCII", name: "DCI Indonesia Tbk.", sector: "Technology" },

  // ── Materials ────────────────────────────────────────
  { ticker: "ANTM", name: "Aneka Tambang Tbk.", sector: "Materials" },
  { ticker: "INCO", name: "Vale Indonesia Tbk.", sector: "Materials" },
  { ticker: "TPIA", name: "Chandra Asri Pacific Tbk.", sector: "Materials" },
  { ticker: "BRPT", name: "Barito Pacific Tbk.", sector: "Materials" },
  { ticker: "INKP", name: "Indah Kiat Pulp & Paper Tbk.", sector: "Materials" },
  { ticker: "TKIM", name: "Pabrik Kertas Tjiwi Kimia Tbk.", sector: "Materials" },
  { ticker: "MDKA", name: "Merdeka Copper Gold Tbk.", sector: "Materials" },

  // ── Consumer Discretionary ───────────────────────────
  { ticker: "ACES", name: "Aspirasi Hidup Indonesia Tbk.", sector: "Consumer Discretionary" },
  { ticker: "ERAA", name: "Erajaya Swasembada Tbk.", sector: "Consumer Discretionary" },
  { ticker: "MAPI", name: "Mitra Adiperkasa Tbk.", sector: "Consumer Discretionary" },
  { ticker: "RALS", name: "Ramayana Lestari Sentosa Tbk.", sector: "Consumer Discretionary" },

  // ── Healthcare ───────────────────────────────────────
  { ticker: "HEAL", name: "Medikaloka Hermina Tbk.", sector: "Healthcare" },
  { ticker: "MIKA", name: "Mitra Keluarga Karyasehat Tbk.", sector: "Healthcare" },
  { ticker: "SILO", name: "Siloam International Hospitals Tbk.", sector: "Healthcare" },

  // ── Real Estate ──────────────────────────────────────
  { ticker: "BSDE", name: "Bumi Serpong Damai Tbk.", sector: "Real Estate" },
  { ticker: "CTRA", name: "Ciputra Development Tbk.", sector: "Real Estate" },
  { ticker: "SMRA", name: "Summarecon Agung Tbk.", sector: "Real Estate" },
  { ticker: "PWON", name: "Pakuwon Jati Tbk.", sector: "Real Estate" },

  // ── Utilities ────────────────────────────────────────
  { ticker: "PGAS", name: "Perusahaan Gas Negara Tbk.", sector: "Utilities" },
  { ticker: "PGEO", name: "Pertamina Geothermal Energy Tbk.", sector: "Utilities" },

  // ── Transportation ───────────────────────────────────
  { ticker: "AVIA", name: "Garuda Indonesia (Persero) Tbk.", sector: "Transportation" },
  { ticker: "BIRD", name: "Blue Bird Tbk.", sector: "Transportation" },

  // ── Infrastructure ───────────────────────────────────
  { ticker: "PJAA", name: "Pembangunan Jaya Ancol Tbk.", sector: "Infrastructure" },
];

export const idxTickers = stockUniverse.map((s) => s.ticker);

/** Sector list derived from universe */
export const sectors = [...new Set(stockUniverse.map((s) => s.sector))].sort();

/** Group stocks by sector */
export function groupBySector(stocks: Stock[]): Record<string, Stock[]> {
  const map: Record<string, Stock[]> = {};
  for (const s of stocks) {
    (map[s.sector] ??= []).push(s);
  }
  return map;
}
