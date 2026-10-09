/**
 * Sidebar navigation, in the demo's order and wording. An item without an `href` is a screen the demo shows that the
 * app has not built yet: it is listed, greyed out and marked "Soon", never linked to a page that does not exist.
 */
export type NavItem = {
  label: string;
  icon: string;
  href?: string;
  /** Path prefixes that make this item the current one. */
  match?: string[];
  /** Small note shown instead of "Soon", e.g. "Owner". */
  note?: string;
};

export function navItems({ guest, owner }: { guest: boolean; owner: boolean }): { main: NavItem[]; explore: NavItem[] } {
  const main: NavItem[] = [
    { label: "Owner overview", icon: "◫", href: "/dashboard", match: ["/dashboard"] },
    { label: "Compare versions", icon: "◧" },
    { label: "Data & update routine", icon: "⇅" },
    { label: "Products & suppliers", icon: "▦" },
    { label: "Sales & accounts", icon: "↗", href: "/accounts/all", match: ["/accounts"] },
    { label: "Inventory & supply", icon: "▦" },
    { label: "Finance & profitability", icon: "◉" },
    { label: "Management actions", icon: "✓" },
    owner && !guest
      ? { label: "Alpha ERP data", icon: "⇄", href: "/imports", match: ["/imports"] }
      : { label: "Alpha ERP data", icon: "⇄", note: "Owner" },
  ];
  const explore: NavItem[] = guest ? [] : [{ label: "Sample data", icon: "◇", href: "/sample", match: ["/sample"] }];
  return { main, explore };
}

/** Breadcrumb text for the current path. */
export function crumbFor(pathname: string, items: NavItem[]): string {
  const hit = items.find((i) => i.match?.some((m) => pathname === m || pathname.startsWith(`${m}/`)));
  return hit?.label ?? "Overview";
}
