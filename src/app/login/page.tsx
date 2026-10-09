import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { ensureBootstrapOwner } from "@/server/bootstrap-owner";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Sadaf 360</p>
        <h1 className="mt-1 text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-muted">Business control tower. Access is by invitation.</p>
        <LoginForm />
        <Suspense fallback={null}>
          <Bootstrap />
        </Suspense>
      </div>
    </main>
  );
}

/** Runs at request time (not build time) so BOOTSTRAP_OWNER_* variables are read per deployment. */
async function Bootstrap() {
  await connection();
  await ensureBootstrapOwner();
  return null;
}
