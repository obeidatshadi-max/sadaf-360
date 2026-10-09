import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthCard title="Create your account" subtitle="Free to start. You become the owner of your company's workspace.">
      <SignupForm />
      <p className="mt-4 text-center text-sm text-muted">
        Already have an account?{" "}
        <a className="underline" href="/login">
          Sign in
        </a>
      </p>
    </AuthCard>
  );
}
