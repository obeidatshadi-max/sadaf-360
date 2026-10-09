/**
 * SYNTHETIC demonstration data for the guest (open-access) view. Not real company data.
 * Same dataset as the frozen promotional demo (demo/index.html); a test keeps the two in step.
 * Every figure shown in the app is derived from these records through src/core/calc.ts.
 */

export type LineName = "Equipment" | "Devices" | "Consumables";

export interface BusinessLine {
  name: LineName;
  /** Net sales YTD (JOD). */
  rev: number;
  /** Gross profit YTD (JOD): net sales less product cost. */
  gp: number;
  /** Direct fulfilment costs YTD (JOD): freight, installation, training, warranty. */
  cost: number;
  /** Cash collected YTD (JOD). */
  col: number;
  /** Recurring consumable sales YTD (JOD) linked to installed units. */
  rec: number;
}

export interface InstalledUnit {
  id: string;
  name: string;
  line: LineName;
  account: string;
  city: string;
  /** Estimated monthly consumable demand (JOD). */
  expected: number;
  /** Actual monthly consumable purchases (JOD). */
  actual: number;
  service: "Active" | "No contract" | "Expiring";
  util: number;
  warranty: string;
  installed: string;
  confidence: string;
  manufacturer: string;
  consumable: string;
}

export interface DemoTender {
  id: string;
  name: string;
  line: LineName;
  account: string;
  value: number;
  stage: string;
  /** Planned contribution margin, percent. */
  margin: number;
  due: string;
  owner: string;
  risk: string;
}

export interface StockLot {
  id: string;
  name: string;
  line: LineName;
  qty: number;
  /** Stock value at cost (JOD). */
  value: number;
  /** Months of demand the stock covers. */
  months: number;
  /** YYYY-MM-DD, or "Not applicable" for equipment. */
  expiry: string;
  risk: string;
  manufacturer: string;
}

export interface DemoInvoice {
  account: string;
  line: LineName;
  /** Outstanding amount (JOD). */
  value: number;
  /** Contractual due date. */
  due: string;
  owner: string;
}

/** Snapshot date of the synthetic data. */
export const DEMO_AS_OF = "2026-10-08";
/** Period covered by the year-to-date figures. */
export const DEMO_PERIOD = "Jan-Sep 2026";

export const lines: BusinessLine[] = [
  {
    name: "Equipment",
    rev: 1450000,
    gp: 362500,
    cost: 85000,
    col: 1180000,
    rec: 0
  },
  {
    name: "Devices",
    rev: 980000,
    gp: 313600,
    cost: 48000,
    col: 825000,
    rec: 0
  },
  {
    name: "Consumables",
    rev: 2100000,
    gp: 819000,
    cost: 56000,
    col: 1870000,
    rec: 1620000
  }
];

export const units: InstalledUnit[] = [
  {
    id: "EQ-104",
    name: "MEDIMA P300 volumetric infusion pump",
    line: "Equipment",
    account: "Demo Private Hospital A",
    city: "Amman",
    expected: 3200,
    actual: 2050,
    service: "No contract",
    util: 74,
    warranty: "30 Nov 2026",
    installed: "2022",
    confidence: "Medium",
    manufacturer: "MEDIMA Sp. z o.o.",
    consumable: "MEDIMA ST10 administration sets"
  },
  {
    id: "DV-208",
    name: "BOWA ARC 400 + ARC PLUS",
    line: "Devices",
    account: "Demo Surgical Center B",
    city: "Irbid",
    expected: 4800,
    actual: 2400,
    service: "Active",
    util: 61,
    warranty: "31 Mar 2027",
    installed: "2023",
    confidence: "Medium",
    manufacturer: "BOWA-electronic GmbH & Co. KG",
    consumable: "BOWA single-use argon probes"
  },
  {
    id: "EQ-109",
    name: "WASSENBURG WD440",
    line: "Equipment",
    account: "Demo University Hospital C",
    city: "Amman",
    expected: 2200,
    actual: 1980,
    service: "Active",
    util: 88,
    warranty: "31 Mar 2027",
    installed: "2021",
    confidence: "High",
    manufacturer: "Wassenburg Medical B.V.",
    consumable: "WASSENBURG EndoHigh GTA & Detergent"
  },
  {
    id: "DV-221",
    name: "Vapotherm Precision Flow",
    line: "Devices",
    account: "Demo Private Hospital A",
    city: "Amman",
    expected: 3600,
    actual: 3100,
    service: "Active",
    util: 83,
    warranty: "31 Mar 2027",
    installed: "2024",
    confidence: "Medium",
    manufacturer: "Vapotherm, Inc.",
    consumable: "Vapotherm PF-DPC-HIGH patient circuit"
  },
  {
    id: "EQ-133",
    name: "MolecuLight i:X",
    line: "Equipment",
    account: "Demo Wound Clinic D",
    city: "Zarqa",
    expected: 1400,
    actual: 800,
    service: "Expiring",
    util: 56,
    warranty: "31 Mar 2027",
    installed: "2020",
    confidence: "Low",
    manufacturer: "MolecuLight Inc.",
    consumable: "MolecuLight WoundStickers"
  },
  {
    id: "DV-247",
    name: "Somatics Thymatron System IV",
    line: "Devices",
    account: "Demo Hospital E",
    city: "Aqaba",
    expected: 2900,
    actual: 2650,
    service: "Active",
    util: 91,
    warranty: "31 Mar 2027",
    installed: "2025",
    confidence: "High",
    manufacturer: "Somatics, LLC.",
    consumable: "Somatics Thymapads EPAD-C"
  }
];

export const tenders: DemoTender[] = [
  {
    id: "TN-041",
    name: "MEDIMA P300 infusion pump project",
    line: "Equipment",
    account: "Demo University Hospital C",
    value: 275000,
    stage: "Preparing",
    margin: 19,
    due: "2026-10-18",
    owner: "Tender manager",
    risk: "Technical documents incomplete"
  },
  {
    id: "TN-052",
    name: "BOWA ARC 400 surgical systems",
    line: "Devices",
    account: "Demo Military Medical Center F",
    value: 165000,
    stage: "Submitted",
    margin: 27,
    due: "2026-10-24",
    owner: "Tender manager",
    risk: "Award pending"
  },
  {
    id: "TN-061",
    name: "Vapotherm patient-circuit framework",
    line: "Consumables",
    account: "Demo Public Hospital Group",
    value: 380000,
    stage: "Won · delivery",
    margin: 31,
    due: "2026-11-10",
    owner: "Operations manager",
    risk: "Supplier lead-time risk"
  },
  {
    id: "TN-033",
    name: "WASSENBURG WD440 installation",
    line: "Equipment",
    account: "Demo Hospital E",
    value: 185000,
    stage: "Delivered",
    margin: 12,
    due: "2026-09-10",
    owner: "Finance manager",
    risk: "Collection overdue"
  }
];

export const stock: StockLot[] = [
  {
    id: "SKU-401",
    name: "Vapotherm PF-DPC-HIGH patient circuit",
    line: "Consumables",
    qty: 260,
    value: 19500,
    months: 8.2,
    expiry: "2026-12-15",
    risk: "Expiry risk",
    manufacturer: "Vapotherm, Inc."
  },
  {
    id: "SKU-512",
    name: "BOWA single-use argon probes",
    line: "Consumables",
    qty: 800,
    value: 28800,
    months: 1.1,
    expiry: "2028-02-01",
    risk: "Running-out risk",
    manufacturer: "BOWA-electronic GmbH & Co. KG"
  },
  {
    id: "SKU-230",
    name: "Somatics Thymatron System IV",
    line: "Devices",
    qty: 6,
    value: 42000,
    months: 9,
    expiry: "Not applicable",
    risk: "Slow moving",
    manufacturer: "Somatics, LLC."
  },
  {
    id: "SKU-110",
    name: "MEDIMA P300 volumetric infusion pump",
    line: "Equipment",
    qty: 2,
    value: 26000,
    months: 14,
    expiry: "Not applicable",
    risk: "Demo asset idle",
    manufacturer: "MEDIMA Sp. z o.o."
  },
  {
    id: "SKU-420",
    name: "WASSENBURG EndoHigh GTA & Detergent",
    line: "Consumables",
    qty: 140,
    value: 14700,
    months: 6.4,
    expiry: "2027-01-12",
    risk: "Overstock",
    manufacturer: "Wassenburg Medical B.V."
  },
  {
    id: "SKU-530",
    name: "MEDIMA ST10 administration sets",
    line: "Consumables",
    qty: 2400,
    value: 4320,
    months: 2.1,
    expiry: "2028-08-01",
    risk: "Healthy",
    manufacturer: "MEDIMA Sp. z o.o."
  }
];

export const invoices: DemoInvoice[] = [
  {
    account: "Demo Hospital E",
    line: "Equipment",
    value: 55500,
    due: "2026-06-18",
    owner: "Finance manager"
  },
  {
    account: "Demo Surgical Center B",
    line: "Devices",
    value: 29500,
    due: "2026-08-04",
    owner: "Sales manager"
  },
  {
    account: "Demo Wound Clinic D",
    line: "Consumables",
    value: 18000,
    due: "2026-07-06",
    owner: "Finance manager"
  },
  {
    account: "Demo Private Hospital A",
    line: "Consumables",
    value: 14500,
    due: "2026-08-31",
    owner: "Sales manager"
  }
];
