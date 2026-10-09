import { describe, expect, it } from 'vitest';
import * as c from './calc';

const ASOF = '2026-10-08';

// Cases mirror the "Worked examples" sheet of Sadaf_inputs_workbook.xlsx.
describe('basic reports', () => {
  it('gross profit and margin', () => {
    expect(c.grossProfit(24000, 18000)).toBe(6000);
    expect(c.grossMargin(24000, 18000)).toBeCloseTo(0.25);
    expect(c.grossMargin(30000, 21000)).toBeCloseTo(0.3);
    expect(c.grossMargin(0, 0)).toBe('Data missing');
  });
  it('days overdue from contractual due date', () => {
    expect(c.daysOverdue(7200, '2026-09-28', ASOF)).toBe(10);
    expect(c.daysOverdue(9000, '2026-10-20', ASOF)).toBe(0);
    expect(c.daysOverdue(0, '2026-01-01', ASOF)).toBe(0);
    expect(c.daysOverdue(55500, '2026-06-18', ASOF)).toBe(112);
  });
  it('receivables aging keeps total, overdue and buckets consistent', () => {
    const r = c.receivablesAging(
      [
        { outstanding: 55500, dueDate: '2026-06-18' },
        { outstanding: 29500, dueDate: '2026-08-04' },
        { outstanding: 18000, dueDate: '2026-07-06' },
        { outstanding: 14500, dueDate: '2026-09-01' },
        { outstanding: 9000, dueDate: '2026-10-20' },
        { outstanding: 0, dueDate: '2026-01-01' },
      ],
      ASOF,
    );
    expect(r.total).toBe(126500);
    expect(r.overdue).toBe(117500);
    expect(r.buckets['90+']).toBe(73500);
    expect(r.buckets['Not due']).toBe(9000);
    expect(Object.values(r.buckets).reduce((a, b) => a + b, 0)).toBe(r.total);
  });
  it('stock value and cover', () => {
    expect(c.stockValue(600, 1.8)).toBeCloseTo(1080);
    expect(c.stockValue(80, 30)).toBe(2400);
    expect(c.stockCoverDays(600, 5)).toBe(120);
    expect(c.stockCoverDays(80, 0.8333333333333334)).toBeCloseTo(96);
    expect(c.stockCoverDays(10, 0)).toBe('No recent use');
  });
  it('expiry loss', () => {
    expect(c.unsoldAtExpiry(600, 5, '2027-12-31', ASOF)).toBe(0);
    const unsold = c.unsoldAtExpiry(80, 0.8333333333333334, '2026-12-15', ASOF);
    expect(unsold).toBe(24);
    expect(c.expiryLoss(unsold, 30)).toBe(720);
  });
  it('expiry loss is reproducible from stock value and cover months', () => {
    // dashboard SKU-401: 260 units, 19,500 at cost, 8.2 months cover, expires 2026-12-15
    const unsold = c.unsoldAtExpiry(260, c.dailyIssuesFromCover(260, 8.2), '2026-12-15', ASOF);
    expect(unsold).toBe(190);
    expect(c.expiryLoss(unsold, 19500 / 260)).toBe(14250);
  });
});

describe('advanced reports', () => {
  it('purchase gap, hospital A and B', () => {
    const a = c.purchaseGap({ activityCount: 120, consumablesPerActivity: 1, referencePrice: 3, purchasedQty: 80 });
    expect(a).toMatchObject({ expectedQty: 120, expectedValue: 360, purchasedValue: 240, gap: 120 });
    expect(a.capture).toBeCloseTo(2 / 3);
    const b = c.purchaseGap({ activityCount: 24, consumablesPerActivity: 1, referencePrice: 50, purchasedQty: 12 });
    expect(b.gap).toBe(600);
    expect(b.capture).toBeCloseTo(0.5);
    expect(c.purchaseGap({ activityCount: 0, consumablesPerActivity: 1, referencePrice: 1, purchasedQty: 3 }).capture).toBe('Data missing');
  });
  it('customer stock days and equipment use', () => {
    expect(c.customerStockDays(16, 120, 30)).toBe(4);
    expect(c.customerStockDays(6, 24, 30)).toBe(7.5);
    expect(c.equipmentUseRate(120, 160)).toBe(0.75);
    expect(c.equipmentUseRate(1, 0)).toBe('Data missing');
  });
  it('scenario', () => {
    expect(c.repeatScenario(120, 0.4, 0.3).extraSales).toBe(576);
    expect(c.repeatScenario(120, 0.4, 0.3).extraProfit).toBeCloseTo(172.8);
    expect(c.repeatScenario(600, 0.4, 0.3).extraProfit).toBeCloseTo(864);
    expect(c.repeatScenario(-50, 0.4, 0.3).extraSales).toBe(0);
  });
  it('tenders', () => {
    expect(c.plannedTenderProfit({ value: 24000, plannedCost: 18600 })).toBe(5400);
    expect(
      c.weightedTenderMargin([
        { value: 275000, plannedCost: 222750 },
        { value: 165000, plannedCost: 120450 },
        { value: 380000, plannedCost: 262200 },
        { value: 185000, plannedCost: 162800 },
      ]),
    ).toBeCloseTo(0.2356, 3);
    expect(c.weightedTenderMargin([])).toBe('Data missing');
  });
  it('tender cost split sums to the value', () => {
    const s = c.tenderCostSplit(185000, 0.25, 0.12);
    expect(s.productCost + s.fulfillment + s.contribution).toBeCloseTo(185000);
    expect(s.productCost).toBeCloseTo(138750);
  });
  it('agreements and age review', () => {
    expect(c.agreementStatus({ held: 'Yes', start: '2026-06-01', end: '2027-05-31' }, ASOF)).toBe('Active');
    expect(c.agreementStatus({ held: 'No' }, ASOF)).toBe('No contract');
    expect(c.agreementStatus({ held: 'Unknown' }, ASOF)).toBe('Data missing');
    expect(c.agreementStatus({ held: 'Yes', start: '2026-01-01', end: '2026-10-20' }, ASOF)).toBe('Renewal due');
    expect(c.agreementStatus({ held: 'Yes', start: '2025-01-01', end: '2026-09-01' }, ASOF)).toBe('Expired');
    expect(c.isCovered('Renewal due')).toBe(1);
    expect(c.isCovered('Data missing')).toBe('Data missing');
    expect(c.ageReview('2025-06-01', ASOF)).toBe('Below threshold');
    expect(c.ageReview('2020-09-15', ASOF)).toBe('Review age');
    expect(c.ageReview(undefined, ASOF)).toBe('Data missing');
  });
  it('attainment compares same scope only', () => {
    expect(c.attainment(26000, 26000)).toBe(1);
    expect(c.attainment(5, 0)).toBe('No target');
  });
});
