export const fieldClass = "mt-1 block w-full rounded-md border border-line bg-white px-3 py-2 text-sm";
export const buttonClass = "w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-brand-ink disabled:opacity-60";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Sadaf 360</p>
        <h1 className="mt-1 text-xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        {children}
      </div>
    </main>
  );
}

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-md bg-bad-soft px-3 py-2 text-sm text-bad">
      {children}
    </p>
  );
}

export function InfoNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md bg-brand-soft px-3 py-2 text-sm text-brand">{children}</p>;
}
