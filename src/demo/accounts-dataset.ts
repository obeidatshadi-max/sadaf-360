/**
 * SYNTHETIC account-level data: tender (public-sector) accounts versus private accounts.
 * Eight accounts add up exactly to the business-line totals in ./dataset, and a test enforces it.
 * Not real company data.
 */
import type { LineName } from "./dataset";

export type Segment = "Tender" | "Private";

export interface AccountSeed {
  id: string;
  /** Unique; invoices, installed units and tenders in ./dataset refer to accounts by this name. */
  name: string;
  /** Tender = public-sector body that buys through formal tenders. Private = private hospital, centre or clinic buying by quotation or PO. */
  segment: Segment;
  type: string;
  city: string;
  manager: string;
  /** Agreed payment terms, days. */
  termsDays: number;
  /** Approved credit limit (JOD). */
  creditLimit: number;
  /** YTD sales target (JOD). */
  target: number;
  /** Same period last year (JOD). */
  priorSales: number;
  priorGrossProfit: number;
  /** Cash received YTD (JOD). Opening receivables are assumed nil in this synthetic data. */
  collected: number;
  /** Unpaid at the snapshot date (JOD), overdue or not. */
  outstanding: number;
  lastOrder: string;
  ordersYtd: number;
  /** YTD figures by business line (JOD). Gross profit = net sales less product cost. */
  byLine: Record<LineName, { sales: number; grossProfit: number; directCosts: number }>;
}

export const accounts: AccountSeed[] = [
  {
    id: "T-01", name: "Demo Public Hospital Group", segment: "Tender", type: "Public hospital group", city: "Amman", manager: "Tender manager",
    termsDays: 120, creditLimit: 250000, target: 750000, priorSales: 700000, priorGrossProfit: 210000,
    collected: 580000, outstanding: 190000, lastOrder: "2026-09-30", ordersYtd: 24,
    byLine: {
      Equipment: { sales: 150000, grossProfit: 31500, directCosts: 6000 },
      Devices: { sales: 60000, grossProfit: 16800, directCosts: 2000 },
      Consumables: { sales: 560000, grossProfit: 190400, directCosts: 14000 },
    },
  },
  {
    id: "T-02", name: "Demo University Hospital C", segment: "Tender", type: "University hospital", city: "Amman", manager: "Tender manager",
    termsDays: 90, creditLimit: 200000, target: 800000, priorSales: 800000, priorGrossProfit: 224000,
    collected: 610000, outstanding: 140000, lastOrder: "2026-08-20", ordersYtd: 9,
    byLine: {
      Equipment: { sales: 420000, grossProfit: 92400, directCosts: 24000 },
      Devices: { sales: 140000, grossProfit: 40600, directCosts: 6500 },
      Consumables: { sales: 190000, grossProfit: 68400, directCosts: 4500 },
    },
  },
  {
    id: "T-03", name: "Demo Hospital E", segment: "Tender", type: "Government hospital", city: "Aqaba", manager: "Tender manager",
    termsDays: 90, creditLimit: 200000, target: 550000, priorSales: 520000, priorGrossProfit: 135200,
    collected: 420000, outstanding: 150000, lastOrder: "2026-09-10", ordersYtd: 6,
    byLine: {
      Equipment: { sales: 360000, grossProfit: 72000, directCosts: 30000 },
      Devices: { sales: 90000, grossProfit: 24300, directCosts: 4000 },
      Consumables: { sales: 120000, grossProfit: 42000, directCosts: 3000 },
    },
  },
  {
    id: "T-04", name: "Demo Military Medical Center F", segment: "Tender", type: "Military medical services", city: "Amman", manager: "Tender manager",
    termsDays: 90, creditLimit: 100000, target: 480000, priorSales: 400000, priorGrossProfit: 116000,
    collected: 400000, outstanding: 60000, lastOrder: "2026-07-28", ordersYtd: 4,
    byLine: {
      Equipment: { sales: 200000, grossProfit: 46000, directCosts: 12000 },
      Devices: { sales: 170000, grossProfit: 51000, directCosts: 9500 },
      Consumables: { sales: 90000, grossProfit: 33300, directCosts: 2500 },
    },
  },
  {
    id: "P-01", name: "Demo Private Hospital A", segment: "Private", type: "Private hospital", city: "Amman", manager: "Sales rep A",
    termsDays: 60, creditLimit: 80000, target: 650000, priorSales: 600000, priorGrossProfit: 216000,
    collected: 645000, outstanding: 45000, lastOrder: "2026-10-02", ordersYtd: 38,
    byLine: {
      Equipment: { sales: 150000, grossProfit: 57000, directCosts: 6000 },
      Devices: { sales: 160000, grossProfit: 56000, directCosts: 7500 },
      Consumables: { sales: 380000, grossProfit: 163400, directCosts: 9000 },
    },
  },
  {
    id: "P-02", name: "Demo Surgical Center B", segment: "Private", type: "Surgical center", city: "Irbid", manager: "Sales rep B",
    termsDays: 60, creditLimit: 60000, target: 640000, priorSales: 640000, priorGrossProfit: 224000,
    collected: 580000, outstanding: 40000, lastOrder: "2026-09-29", ordersYtd: 31,
    byLine: {
      Equipment: { sales: 90000, grossProfit: 32400, directCosts: 3500 },
      Devices: { sales: 230000, grossProfit: 80500, directCosts: 11000 },
      Consumables: { sales: 300000, grossProfit: 126000, directCosts: 7000 },
    },
  },
  {
    id: "P-03", name: "Demo Wound Clinic D", segment: "Private", type: "Specialist clinic", city: "Zarqa", manager: "Sales rep A",
    termsDays: 45, creditLimit: 30000, target: 300000, priorSales: 310000, priorGrossProfit: 114700,
    collected: 268000, outstanding: 22000, lastOrder: "2026-08-14", ordersYtd: 22,
    byLine: {
      Equipment: { sales: 40000, grossProfit: 16000, directCosts: 1500 },
      Devices: { sales: 50000, grossProfit: 18000, directCosts: 3000 },
      Consumables: { sales: 200000, grossProfit: 88000, directCosts: 7500 },
    },
  },
  {
    id: "P-04", name: "Demo Private Hospital G", segment: "Private", type: "Private hospital", city: "Amman", manager: "Sales rep C",
    termsDays: 60, creditLimit: 25000, target: 350000, priorSales: 300000, priorGrossProfit: 108000,
    collected: 372000, outstanding: 8000, lastOrder: "2026-10-05", ordersYtd: 26,
    byLine: {
      Equipment: { sales: 40000, grossProfit: 15200, directCosts: 2000 },
      Devices: { sales: 80000, grossProfit: 26400, directCosts: 4500 },
      Consumables: { sales: 260000, grossProfit: 107500, directCosts: 8500 },
    },
  },
];

/** First and last day of the year-to-date figures (inclusive). */
export const DEMO_PERIOD_START = "2026-01-01";
export const DEMO_PERIOD_END = "2026-09-30";

export interface TenderProgress {
  /** Share of the contract delivered, percent. */
  deliveredPct: number;
  /** Invoiced so far (JOD). */
  invoiced: number;
  /** Cash received against those invoices (JOD). */
  collected: number;
  guarantee: { kind: "Bid bond" | "Performance bond"; amount: number; expires: string };
}

/** Delivery, billing and guarantee detail for the tenders listed in ./dataset. */
export const tenderProgress: Record<string, TenderProgress> = {
  "TN-041": { deliveredPct: 0, invoiced: 0, collected: 0, guarantee: { kind: "Bid bond", amount: 5500, expires: "2027-01-18" } },
  "TN-052": { deliveredPct: 0, invoiced: 0, collected: 0, guarantee: { kind: "Bid bond", amount: 3300, expires: "2026-12-24" } },
  "TN-061": { deliveredPct: 35, invoiced: 133000, collected: 90000, guarantee: { kind: "Performance bond", amount: 38000, expires: "2027-05-31" } },
  "TN-033": { deliveredPct: 100, invoiced: 185000, collected: 129500, guarantee: { kind: "Performance bond", amount: 18500, expires: "2026-12-10" } },
};

/** Tender outcomes this year (number of tenders, values in JOD). Pending = submitted, no decision yet. */
export const tenderHistory = { submitted: 14, won: 6, lost: 5, pending: 3, valueSubmitted: 3900000, valueWon: 1650000 };
