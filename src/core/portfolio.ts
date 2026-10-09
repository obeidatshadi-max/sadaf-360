/**
 * Portfolio growth by therapeutic area and customer type. Pure: aggregated rows in, figures out.
 *
 * It points at where demand is growing and how thin the product range is there. It is a signal to investigate, not a
 * forecast, and it never decides on its own that a new supplier is needed:
 *  - growth is year to date against the same dates last year;
 *  - an area must be big enough (share of sales) and have a last-year base before it is judged;
 *  - growth that rests on one customer is called out, because one tender or one large order is not a trend;
 *  - sales on products with no area are kept in their own "Area not set" row, never spread over the others.
 */
import { roundJod, type Unavailable } from "./calc";
import { yoyGrowth } from "./accounts";

export const NOT_SET = "Area not set";
export const NOT_CLASSIFIED = "Not classified";
/** Year-on-year growth that counts as growing or declining. */
export const GROWTH_THRESHOLD = 0.15;
/** An area below this share of current sales is too small to judge. */
export const MIN_SHARE = 0.02;
/** If one customer is more than this share of an area's sales, growth is attributed to that customer. */
export const CONCENTRATION_LIMIT = 0.5;
/** Fewer active products than this, or a single supplier, counts as thin coverage. */
export const THIN_PRODUCTS = 3;

export interface SalesRow {
  /** Therapeutic area, or null when the product has none. */
  area: string | null;
  /** Tender / Private, or null when the customer is not classified. */
  segment: string | null;
  customer: string;
  period: "current" | "prior";
  sales: number;
}

export interface AreaCoverage {
  area: string;
  activeProducts: number;
  suppliers: number;
}

export type Signal = "Growing" | "Growth comes from one customer" | "Declining" | "Stable" | "Too small to judge" | "No sales last year";

export interface SegmentFigures {
  segment: string;
  sales: number;
  priorSales: number;
  growth: number | Unavailable;
  delta: number;
}

export interface AreaFigures {
  area: string;
  sales: number;
  priorSales: number;
  delta: number;
  growth: number | Unavailable;
  share: number;
  customers: number;
  topCustomer: string;
  topCustomerShare: number;
  signal: Signal;
  activeProducts: number | null;
  suppliers: number | null;
  thinCoverage: boolean;
  bySegment: SegmentFigures[];
}

export interface PortfolioReport {
  totalSales: number;
  totalPrior: number;
  areas: AreaFigures[];
  /** Share of current sales on products with no therapeutic area. */
  unclassifiedShare: number;
  /** Growing areas with thin coverage, largest increase first: where a new product or supplier may help. */
  lookHere: AreaFigures[];
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function buildPortfolio(rows: SalesRow[], coverage: AreaCoverage[]): PortfolioReport {
  const cur = rows.filter((r) => r.period === "current");
  const prior = rows.filter((r) => r.period === "prior");
  const totalSales = sum(cur.map((r) => r.sales));
  const totalPrior = sum(prior.map((r) => r.sales));
  const areaOf = (r: SalesRow) => r.area ?? NOT_SET;
  const names = [...new Set(rows.map(areaOf))];
  const cov = new Map(coverage.map((c) => [c.area, c]));

  const areas: AreaFigures[] = names.map((area) => {
    const c = cur.filter((r) => areaOf(r) === area);
    const p = prior.filter((r) => areaOf(r) === area);
    const sales = sum(c.map((r) => r.sales));
    const priorSales = sum(p.map((r) => r.sales));

    const perCustomer = new Map<string, number>();
    for (const r of c) perCustomer.set(r.customer, (perCustomer.get(r.customer) ?? 0) + r.sales);
    const [topCustomer, topSales] = [...perCustomer.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? ["", 0];
    const topCustomerShare = sales > 0 ? topSales / sales : 0;

    const share = totalSales > 0 ? sales / totalSales : 0;
    const growth = yoyGrowth(sales, priorSales);
    let signal: Signal;
    if (area === NOT_SET || share < MIN_SHARE) signal = "Too small to judge";
    else if (typeof growth !== "number") signal = "No sales last year";
    else if (growth >= GROWTH_THRESHOLD) signal = topCustomerShare > CONCENTRATION_LIMIT ? "Growth comes from one customer" : "Growing";
    else if (growth <= -GROWTH_THRESHOLD) signal = "Declining";
    else signal = "Stable";
    if (area === NOT_SET) signal = "Too small to judge";

    const segs = [...new Set([...c, ...p].map((r) => r.segment ?? NOT_CLASSIFIED))];
    const bySegment: SegmentFigures[] = segs
      .map((segment) => {
        const s = sum(c.filter((r) => (r.segment ?? NOT_CLASSIFIED) === segment).map((r) => r.sales));
        const ps = sum(p.filter((r) => (r.segment ?? NOT_CLASSIFIED) === segment).map((r) => r.sales));
        return { segment, sales: roundJod(s), priorSales: roundJod(ps), growth: yoyGrowth(s, ps), delta: roundJod(s - ps) };
      })
      .sort((a, b) => b.delta - a.delta || a.segment.localeCompare(b.segment));

    const k = cov.get(area);
    const activeProducts = k?.activeProducts ?? null;
    const suppliers = k?.suppliers ?? null;
    return {
      area,
      sales: roundJod(sales),
      priorSales: roundJod(priorSales),
      delta: roundJod(sales - priorSales),
      growth,
      share,
      customers: perCustomer.size,
      topCustomer,
      topCustomerShare,
      signal,
      activeProducts,
      suppliers,
      thinCoverage: k !== undefined && (k.activeProducts < THIN_PRODUCTS || k.suppliers <= 1),
      bySegment,
    };
  });
  areas.sort((a, b) => b.sales - a.sales || a.area.localeCompare(b.area));

  const unclassified = areas.find((a) => a.area === NOT_SET);
  return {
    totalSales: roundJod(totalSales),
    totalPrior: roundJod(totalPrior),
    areas,
    unclassifiedShare: unclassified ? unclassified.share : 0,
    lookHere: areas.filter((a) => a.signal === "Growing" && a.thinCoverage).sort((a, b) => b.delta - a.delta),
  };
}

/**
 * One plain suggestion per signal. These are prompts for the owner to check, never a decision: the app has no data
 * on suppliers it does not already work with.
 */
export function nextStep(a: Pick<AreaFigures, "signal" | "thinCoverage">): string {
  switch (a.signal) {
    case "Growing":
      return a.thinCoverage
        ? "Ask current suppliers for more products in this area, and look for a second supplier. Confirm need, margin and fit first."
        : "Keep stock and supply secure. The range looks sufficient.";
    case "Growth comes from one customer":
      return "Check whether this customer's demand will repeat before adding range.";
    case "Declining":
      return "Find out why: price, stock-outs or a lost customer.";
    case "No sales last year":
      return "Wait for a full comparison period before judging.";
    case "Too small to judge":
      return "No action yet.";
    default:
      return "Keep monitoring.";
  }
}
