"use client";

import { TapikLogo } from "@/components/brand/tapik-logo";
import { useRouter } from "next/navigation";
import { ArrowRight, MailCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDB } from "@/lib/services/data";
import { requestSignInLink } from "@/lib/services/invites";
import { WORKSPACE } from "@/lib/mock/workspace";
import { isFirebaseMode, signInAsClient, useSession } from "@/lib/services/session";
import { validateEmail } from "@/lib/validate";
import { Button, LinkButton } from "@/components/ui/button";
import { buttonClass } from "@/components/ui/button-styles";
import { Field, Input } from "@/components/ui/field";

const COOLDOWN = 30;

/**
 * Client sign-in by magic link. The "Check your email" message is the same
 * whether or not the address has an account, so the page never reveals who
 * is a client. TODO(backend): Supabase Auth signInWithOtp.
 */
export function SignIn() {
  const router = useRouter();
  const { db, hydrated } = useDB();
  const session = useSession();
  const [email, setEmail] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resent, setResent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  /** Emulators only: the link the email would carry, for the demo box. */
  const [devLink, setDevLink] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  const check = validateEmail(email);
  const error = !tried ? null : !email.trim() ? "Enter the email your invite was sent to." : !check.ok ? check.message : null;

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (sentTo) heading.current?.focus();
  }, [sentTo]);

  const send = async (to: string) => {
    setBusy(true);
    setSendError(null);
    const res = await requestSignInLink(to);
    setBusy(false);
    if (res.ok) {
      setSentTo(to);
      setCooldown(COOLDOWN);
      setDevLink(res.data.devLink ?? null);
    } else setSendError(res.error);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!email.trim() || !check.ok) return;
    void send(check.value);
  };

  // Demo only: the mock has no inbox, so an active client's link can be opened here.
  const demoClient = !isFirebaseMode && sentTo && hydrated ? db.clients.find((c) => c.status === "active" && c.email.toLowerCase() === sentTo.toLowerCase()) : undefined;
  const signedInAs = session.role === "client" ? db.clients.find((c) => c.id === session.clientId) : undefined;

  return (
    <main className="flex min-h-dvh flex-col items-center bg-studio-bg px-4 pt-10 pb-16 sm:justify-center sm:py-12">
      <div className="flex w-full max-w-[420px] flex-col gap-7">
        <TapikLogo size="lg" className="text-studio-ink" />

        {!sentTo ? (
          <form noValidate onSubmit={submit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em]">Sign in to edit your card</h1>
              <p className="text-base text-studio-ink-2">We’ll email you a link. No password needed.</p>
            </div>
            <Field label="Email" error={error}>
              {(p) => (
                <Input
                  id={p.id}
                  aria-describedby={p.describedBy}
                  invalid={p.invalid}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.ph"
                />
              )}
            </Field>
            <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
              {busy ? "Sending" : "Email me a sign-in link"}
            </Button>
            {sendError && (
              <p role="alert" className="rounded-lg bg-studio-danger-soft px-3 py-2 text-sm text-studio-danger-ink">
                {sendError}
              </p>
            )}
            {signedInAs && (
              <p className="rounded-xl bg-studio-raised px-4 py-3 text-sm text-studio-ink-2">
                You’re already signed in as {signedInAs.name}.{" "}
                <LinkButton href="/portal" variant="ghost" size="sm" className="-ml-1 inline-flex text-studio-action-ink">
                  Go to my card
                </LinkButton>
              </p>
            )}
            <p className="text-sm text-studio-ink-3">
              New here? Use the invite email from {WORKSPACE.company}. Lost it? Email{" "}
              <a href={`mailto:${WORKSPACE.replyTo}`} className="font-semibold text-studio-action-ink underline underline-offset-2">
                {WORKSPACE.replyTo}
              </a>
              .
            </p>
          </form>
        ) : (
          <div className="flex flex-col gap-6">
            <div role="status" className="flex flex-col gap-3">
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-studio-action-soft text-studio-action-ink">
                <MailCheck aria-hidden className="size-6" />
              </span>
              <h1 ref={heading} tabIndex={-1} className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] focus:outline-none">
                Check your email
              </h1>
              <p className="text-base text-studio-ink-2 [overflow-wrap:anywhere]">
                If <span className="font-semibold text-studio-ink">{sentTo}</span> has a card with {WORKSPACE.company}, a sign-in link is on its way. It works once and expires after a few hours.
              </p>
              {resent && <p className="text-sm text-studio-success">Sent again.</p>}
            </div>

            {demoClient && (
              <div className="flex flex-col gap-2 rounded-xl border border-dashed border-studio-line-strong p-4">
                <p className="text-2xs font-semibold text-studio-ink-3">Demo only: there’s no real inbox in this build</p>
                <Button
                  variant="primary"
                  size="lg"
                  icon={<ArrowRight aria-hidden className="size-4" />}
                  onClick={() => {
                    signInAsClient(demoClient.id);
                    router.push("/portal");
                  }}
                >
                  Open the sign-in link
                </Button>
              </div>
            )}
            {devLink && (
              <div className="flex flex-col gap-2 rounded-xl border border-dashed border-studio-line-strong p-4">
                <p className="text-2xs font-semibold text-studio-ink-3">Emulators only: the link from the email</p>
                <a href={devLink} className={buttonClass("primary", "lg")}>
                  <ArrowRight aria-hidden className="size-4" />
                  Open the sign-in link
                </a>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button
                size="lg"
                loading={busy}
                disabled={cooldown > 0}
                onClick={async () => {
                  await send(sentTo);
                  setResent(true);
                }}
                className="w-full"
              >
                {cooldown > 0 ? `Send again in ${cooldown}s` : "Send the link again"}
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setSentTo(null);
                  setResent(false);
                  setTried(false);
                }}
              >
                Use a different email
              </Button>
            </div>
            <p className="text-sm text-studio-ink-3">Nothing after a few minutes? Check your spam folder, or make sure it’s the address your invite was sent to.</p>
          </div>
        )}
      </div>
    </main>
  );
}
