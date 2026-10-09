import { Suspense } from "react";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { getDb } from "@/db/client";
import { passwordResets } from "@/db/schema";
import { AuthCard } from "@/components/auth-card";
import { hashToken, resetState } from "@/lib/domain/account";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  return (
    <Suspense fallback={null}>
      <Body searchParams={searchParams} />
    </Suspense>
  );
}

async function Body({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  await connection();
  const token = (await searchParams).token ?? "";
  const [row] = token
    ? await getDb()
        .select({ expiresAt: passwordResets.expiresAt, usedAt: passwordResets.usedAt })
        .from(passwordResets)
        .where(eq(passwordResets.tokenHash, hashToken(token)))
        .limit(1)
    : [];
  const state = resetState(row, new Date());
  if (state !== "valid") {
    return (
      <AuthCard title="Link not valid" subtitle="This reset link is invalid, expired, or was already used.">
        <p className="mt-5 text-center text-sm">
          <a className="underline" href="/forgot-password">
            Request a new link
          </a>
        </p>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Choose a new password" subtitle="Pick a password you do not use anywhere else.">
      <ResetForm token={token} />
    </AuthCard>
  );
}
