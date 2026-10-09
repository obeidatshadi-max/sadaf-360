import { GLOSSARY, PAGE_TERMS } from "@/core/glossary";

/** Short list of the business terms used on a screen, in simple words. */
export function Glossary({ page }: { page: keyof typeof PAGE_TERMS }) {
  const terms = PAGE_TERMS[page] ?? [];
  if (terms.length === 0) return null;
  return (
    <section aria-label="Business terms in simple words" className="mt-8 rounded-[9px] border border-line bg-white p-4">
      <h2 className="text-sm font-semibold">Business terms in simple words</h2>
      <dl className="mt-2 grid gap-x-8 gap-y-1.5 text-xs md:grid-cols-2">
        {terms.map((t) => (
          <div key={t}>
            <dt className="inline font-semibold">{t}: </dt>
            <dd className="inline text-muted">{GLOSSARY[t]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
