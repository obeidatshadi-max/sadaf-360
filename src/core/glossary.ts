/**
 * Business terms in simple words, for readers whose first language is not English. One short sentence each.
 * Shared by the app and the demo, so both explain a term the same way.
 */
export const GLOSSARY = {
  "Gross profit": "Sales minus the cost of the products you sold.",
  "Gross margin": "Gross profit as a percent of sales. It does not include running costs such as salaries and rent.",
  "Year to date": "From 1 January until today.",
  Receivables: "Money that customers owe you for invoices they have not paid yet.",
  Overdue: "Not paid after the due date.",
  "Due date": "The last day the customer should pay the invoice.",
  Aging: "Sorting unpaid invoices by how many days late they are.",
  "Cash collected": "Money you actually received from customers.",
  "Unlinked cash": "Money received that is not matched to an invoice yet.",
  "Owned stock": "Stock that your company bought and owns. Stock kept for other companies is left out.",
  "Unit cost": "What it cost to buy one unit.",
  "Stock cover": "How many days the stock will last at the current speed of sales.",
  "Slow stock": "Stock that sells very slowly, or not at all.",
  "Expiry loss": "The value of stock that may pass its expiry date before it is sold. This is an estimate.",
  Estimate: "A careful guess from past data. It is not a fact.",
  "Days between orders": "The usual number of days between two orders from the same customer.",
  Tender: "A bid for a contract. It usually comes from a government body or a public hospital.",
  "Customer type": "Tender (public buyers) or Private (private buyers).",
  "Therapeutic area": "The medical field where a product is used, for example breathing care.",
  "Product range": "The products you offer in one area.",
} as const;

export type Term = keyof typeof GLOSSARY;

/** Terms to explain on each screen. Keys are the app's page names. */
export const PAGE_TERMS: Record<string, Term[]> = {
  overview: ["Year to date", "Gross margin", "Cash collected", "Overdue", "Slow stock", "Expiry loss", "Estimate"],
  finance: ["Year to date", "Gross profit", "Gross margin", "Cash collected", "Unlinked cash", "Receivables", "Overdue", "Due date", "Aging"],
  inventory: ["Owned stock", "Unit cost", "Stock cover", "Slow stock", "Expiry loss", "Estimate"],
  opportunities: ["Estimate", "Days between orders", "Overdue", "Receivables"],
  portfolio: ["Therapeutic area", "Customer type", "Tender", "Product range", "Year to date", "Estimate"],
  weekly: ["Cash collected", "Overdue", "Receivables", "Year to date"],
};
