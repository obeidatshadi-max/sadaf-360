import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { AuthCard, InfoNote } from "@/components/auth-card";
import { ensureBootstrapOwner } from "@/server/bootstrap-owner";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  return (
    <AuthCard title="Sign in" subtitle="Business control tower for medical equipment, devices and consumables distributors.">
      <Suspense fallback={null}>
        <ResetNotice searchParams={searchParams} />
      </Suspense>
      <LoginForm />
      <div className="mt-4 flex items-center justify-between text-sm text-muted">
        <a className="underline" href="/forgot-password">
          Forgot password?
        </a>
        <a className="underline" href="/signup">
          Create an account
        </a>
      </div>
      <Suspense fallback={null}>
        <Bootstrap />
      </Suspense>
    </AuthCard>
  );
}

/** Shown after a successful password reset. */
async function ResetNotice({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const { reset } = await searchParams;
  return reset === "1" ? (
    <div className="mt-4">
      <InfoNote>Password changed. Sign in with your new password.</InfoNote>
    </div>
  ) : null;
}

/** Runs at request time (not build time) so BOOTSTRAP_OWNER_* variables are read per deployment. */
async function Bootstrap() {
  await connection();
  await ensureBootstrapOwner();
  return null;
}
