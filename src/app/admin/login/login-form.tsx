"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { LogoMark } from "@/components/logo";
import { login } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  const next = useSearchParams().get("next") ?? "/admin";

  return (
    <form action={action} className="grid gap-4">
      <LogoMark withName className="size-24 text-[38px]" />
      <p className="text-muted">Admin login</p>
      <input type="hidden" name="next" value={next} />
      <input
        name="password"
        type="password"
        placeholder="Password"
        autoComplete="current-password"
        required
        autoFocus
        className="rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-red"
      />
      {state?.error && <p className="text-sm text-red-hot">{state.error}</p>}
      <button disabled={pending} className="rounded-full bg-red py-3 font-semibold text-white disabled:opacity-60">
        {pending ? "Checking..." : "Log in"}
      </button>
    </form>
  );
}
