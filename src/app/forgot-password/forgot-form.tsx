"use client";

import { useActionState } from "react";
import { requestResetAction, type ForgotState } from "@/server/actions/account";
import { ErrorNote, Field, InfoNote, buttonClass, fieldClass } from "@/components/auth-card";

export function ForgotForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(requestResetAction, {});
  if (state.status === "sent") {
    return (
      <div className="mt-5 space-y-3">
        <InfoNote>If an account exists for {state.email}, a reset link is on its way. It works once and expires in 60 minutes.</InfoNote>
        <p className="text-center text-sm text-muted">
          <a className="underline" href="/login">
            Back to sign in
          </a>
        </p>
      </div>
    );
  }
  return (
    <form action={action} className="mt-5 space-y-3" noValidate>
      <Field id="email" label="Email">
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={state.email} className={fieldClass} />
      </Field>
      {state.status === "invalid" ? <ErrorNote>Enter a valid email address.</ErrorNote> : null}
      {state.status === "notConfigured" ? (
        <ErrorNote>Password reset email is not set up on this site yet. Ask the administrator to reset your password.</ErrorNote>
      ) : null}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
