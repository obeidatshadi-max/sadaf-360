/** Page title block from the demo: small green eyebrow, large light heading, grey sub-line. */
export function PageHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <p className="text-[10px] font-bold uppercase tracking-[2px] text-brand">{eyebrow}</p>
      <h1 className="mt-1.5 text-[25px] font-medium tracking-[-0.8px] md:text-[30px]">{title}</h1>
      {sub ? <p className="mt-1.5 max-w-2xl text-xs text-muted">{sub}</p> : null}
    </div>
  );
}
