"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { BRAND } from "@/lib/brand";
import { isFirebaseMode, signInAdmin } from "@/lib/services/session";
import { validateEmail } from "@/lib/validate";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { TapikLogo } from "@/components/brand/tapik-logo";

/** Only send people back inside the studio (never to another site). */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/admin") || raw.startsWith("//") || raw.startsWith("/admin/sign-in")) return "/admin";
  return raw;
}

/**
 * Tapik Studio sign-in: email and password. Accounts are created by the owner
 * (scripts/make-admin.ts); there is no sign-up and no password reset by email
 * here on purpose, so the screen offers nothing to someone guessing addresses.
 */
export function AdminSignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = validateEmail(email);
  const emailError = !tried ? null : !email.trim() ? "Enter your email." : !check.ok ? check.message : null;
  const passwordError = tried && !password ? "Enter your password." : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    setError(null);
    if (!email.trim() || !check.ok || !password) return;
    setBusy(true);
    const r = await signInAdmin(check.value, password);
    if (r.ok) {
      router.replace(next);
      return;
    }
    setBusy(false);
    setError(r.error);
  };

  return (
    <main className="flex min-h-dvh flex-col items-center bg-studio-bg px-4 pt-10 pb-16 sm:justify-center sm:py-12">
      <div className="flex w-full max-w-[420px] flex-col gap-7">
        <TapikLogo size="lg" app="admin" className="text-studio-ink" />
        <form noValidate onSubmit={submit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em]">Sign in to {BRAND.adminAppName}</h1>
            <p className="text-base text-studio-ink-2">For the team that builds and publishes cards.</p>
          </div>
          <Field label="Email" error={emailError}>
            {(p) => (
              <Input
                id={p.id}
                aria-describedby={p.describedBy}
                invalid={p.invalid}
                type="email"
                inputMode="email"
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>
          <Field label="Password" error={passwordError}>
            {(p) => (
              <div className="relative">
                <Input
                  id={p.id}
                  aria-describedby={p.describedBy}
                  invalid={p.invalid}
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Hide password" : "Show password"}
                  aria-pressed={show}
                  className="absolute top-0 right-0 inline-flex size-11 cursor-pointer items-center justify-center rounded-lg text-studio-ink-3 hover:text-studio-ink"
                >
                  {show ? <EyeOff aria-hidden className="size-[18px]" /> : <Eye aria-hidden className="size-[18px]" />}
                </button>
              </div>
            )}
          </Field>
          {error && (
            <p role="alert" className="rounded-lg bg-studio-danger-soft px-3 py-2 text-sm text-studio-danger-ink">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
            {busy ? "Signing in" : "Sign in"}
          </Button>
          <p className="text-sm text-studio-ink-3">
            {isFirebaseMode
              ? `Forgot your password or need an account? Ask the ${BRAND.name} owner. Clients sign in from the link in their invite email.`
              : "Demo build: there are no accounts yet, so Sign in opens the studio."}
          </p>
        </form>
      </div>
    </main>
  );
}
