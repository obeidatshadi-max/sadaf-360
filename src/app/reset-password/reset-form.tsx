"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ResetState } from "@/server/actions/account";
import { ErrorNote, Field, buttonClass, fieldClass } from "@/components/auth-card";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPasswordAction, {});
  return (
    <form action={action} className="mt-5 space-y-3" noValidate>
      <input type="hidden" name="token" value={token} />
      <Field id="password" label="New password" hint="At least 10 characters.">
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required className={fieldClass} />
      </Field>
      <Field id="confirm" label="Repeat new password">
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required className={fieldClass} />
      </Field>
      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
