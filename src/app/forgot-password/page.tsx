import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Forgot your password?" subtitle="Enter your email and we will send you a link to choose a new one.">
      <ForgotForm />
      <p className="mt-4 text-center text-sm text-muted">
        <a className="underline" href="/login">
          Back to sign in
        </a>
      </p>
    </AuthCard>
  );
}
