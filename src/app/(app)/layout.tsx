import { Suspense } from "react";
import { requireUser } from "@/lib/auth/current-user";
import { logoutAction } from "@/server/actions/auth";
import { DashboardUpdateStatus } from "@/components/dashboard-update-status";
import { DEMO_AS_OF } from "@/demo/dataset";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted">Loading…</div>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh">
      {user.guest ? (
        <p className="bg-brand-soft px-5 py-2 text-center text-xs text-brand">
          Open access: you are browsing as a guest. No company data is shown. <a className="underline" href="/login">Sign in</a>
        </p>
      ) : null}
      <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-5 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">Sadaf 360</p>
          <p className="text-sm font-medium">{user.companyName}</p>
        </div>
        {user.guest ? (
          <a href="/login" className="rounded-md border border-line px-3 py-1.5 text-sm">
            Sign in
          </a>
        ) : (
          <form action={logoutAction} className="flex items-center gap-3 text-sm">
            <span className="text-muted">
              {user.fullName} · {user.role}
            </span>
            <button type="submit" className="rounded-md border border-line px-3 py-1.5">
              Sign out
            </button>
          </form>
        )}
      </header>
      <DashboardUpdateStatus sampleAsOf={user.guest ? DEMO_AS_OF : undefined} />
      <nav aria-label="Main" className="flex gap-1 border-b border-line bg-surface px-4 text-sm">
        {[
          ["/dashboard", "Overview"],
          ["/accounts/all", "Accounts"],
          ...(user.guest ? [] : [["/sample", "Sample data"]]),
          ...(!user.guest && user.role === "owner" ? [["/imports", "Import data"]] : []),
        ].map(([href, label]) => (
          <a key={href} href={href} className="rounded-t-md px-3 py-2.5 text-muted hover:text-ink">
            {label}
          </a>
        ))}
      </nav>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
