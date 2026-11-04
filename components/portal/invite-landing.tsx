"use client";

import { TapikLogo } from "@/components/brand/tapik-logo";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import { use, useEffect, useId, useRef, useState } from "react";
import { WORKSPACE } from "@/lib/mock/workspace";
import { type InviteView, type SignInMethod, acceptClientInvite, markInviteOpened, useInvite } from "@/lib/services/invites";
import { isFirebaseMode } from "@/lib/services/mode";
import type { CardBundle } from "@/lib/types";
import { cn, formatDate, greetingName } from "@/lib/utils";
import { Button, LinkButton } from "@/components/ui/button";
import { buttonClass } from "@/components/ui/button-styles";
import { Field, Input } from "@/components/ui/field";
import { TemplateThumbnail } from "@/components/templates/template-thumbnail";
import { PortalNotice, PortalSkeleton } from "./gates";

const MIN_PASSWORD = 8;

function AskForLink({ subject }: { subject: string }) {
  return (
    <a href={`mailto:${WORKSPACE.replyTo}?subject=${encodeURIComponent(subject)}`} className={buttonClass("primary", "lg")}>
      <Mail aria-hidden className="size-4" />
      Ask {WORKSPACE.company} for a new link
    </a>
  );
}

export function InviteLanding({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const found = useInvite(token);
  const hydrated = found.state !== "loading";
  const [accepting, setAccepting] = useState(false);
  const opened = useRef(false);

  // First view of a valid link marks the invite "Opened" for the admin.
  useEffect(() => {
    if (!hydrated || opened.current || found.state !== "valid") return;
    opened.current = true;
    markInviteOpened(token);
  }, [hydrated, found.state, token]);

  if (found.state === "loading") return <PortalSkeleton />;
  if (accepting) {
    return (
      <PortalNotice title="Opening your card…">
        <p role="status">Setting things up. This takes a second.</p>
      </PortalNotice>
    );
  }

  switch (found.state) {
    case "invalid":
      return (
        <PortalNotice title="This invite link doesn’t work" actions={<AskForLink subject="My card invite link doesn’t work" />}>
          It may have been cut off when it was copied. Open the link straight from the email, or ask {WORKSPACE.company} to send it again.
        </PortalNotice>
      );
    case "expired":
      return (
        <PortalNotice
          title="This link has expired"
          actions={
            <>
              <AskForLink subject={`New card invite link for ${found.client.name}`} />
              <LinkButton href="/portal/sign-in" size="lg">
                I’ve set up before: sign in
              </LinkButton>
            </>
          }
        >
          Invite links work for 7 days, and this one ended on {formatDate(found.invite.expiresAt)}. {WORKSPACE.company} can send you a fresh one in a minute.
        </PortalNotice>
      );
    case "revoked":
      return (
        <PortalNotice title="This link was turned off" actions={<AskForLink subject={`Card invite for ${found.client.name}`} />}>
          {WORKSPACE.company} turned off this invite, usually because they sent a newer one. Look for the latest email from {WORKSPACE.senderEmail}, or ask them for a new link.
        </PortalNotice>
      );
    case "accepted":
      return (
        <PortalNotice
          title="You’ve already set up your card"
          actions={
            <LinkButton href="/portal/sign-in" variant="primary" size="lg" icon={<ArrowRight aria-hidden className="size-4" />}>
              Sign in
            </LinkButton>
          }
        >
          This invite was used{found.invite.acceptedAt ? ` on ${formatDate(found.invite.acceptedAt)}` : ""}. Sign in with {found.client.email} to edit your card.
        </PortalNotice>
      );
    case "valid":
      return <Welcome token={token} client={found.client} bundle={found.bundle ?? null} expiresAt={found.invite.expiresAt} onAccepting={setAccepting} />;
  }
}

type InviteClient = Extract<InviteView, { client: unknown }>["client"];

function Welcome({ token, client, bundle, expiresAt, onAccepting }: { token: string; client: InviteClient; bundle: CardBundle | null; expiresAt: string; onAccepting: (v: boolean) => void }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (step === 2) heading.current?.focus();
  }, [step]);

  return (
    <main className="flex min-h-dvh flex-col items-center bg-studio-bg px-4 pt-8 pb-16 sm:justify-center sm:py-12">
      <div className="flex w-full max-w-[440px] flex-col gap-7">
        <div className="flex items-center justify-between gap-3">
          <TapikLogo size="lg" className="text-studio-ink" />
          {!isFirebaseMode && <span className="text-2xs font-semibold text-studio-ink-3 tabular-nums">Step {step} of 2</span>}
        </div>

        {step === 1 ? (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] [text-wrap:balance]">Hi {greetingName(client.name)}, your card is ready</h1>
              <p className="text-base text-studio-ink-2">
                {WORKSPACE.company} set it up for you. Add your photo, socials and anything else people should see. It takes about five minutes, and you can come back any time.
              </p>
            </div>
            {bundle && (
              <div className="flex justify-center rounded-[28px] bg-studio-sunken px-6 pt-6">
                <div className="overflow-hidden rounded-t-[26px] bg-[#141614] p-[6px] pb-0">
                  <div className="overflow-hidden rounded-t-[20px]">
                    <TemplateThumbnail bundle={bundle} width={390} height={620} scale={0.52} eager />
                  </div>
                </div>
              </div>
            )}
            {error && (
              <p role="alert" className="rounded-lg bg-studio-danger-soft px-3 py-2 text-sm text-studio-danger-ink">
                {error}
              </p>
            )}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              loading={busy}
              icon={<ArrowRight aria-hidden className="size-4" />}
              onClick={async () => {
                if (!isFirebaseMode) return setStep(2);
                // Passwordless: the invite link already proves the email, so one click signs them in.
                setError(null);
                setBusy(true);
                const res = await acceptClientInvite(token, "magic-link");
                if (res.ok) {
                  router.push("/portal");
                  return;
                }
                setBusy(false);
                setError(res.error);
              }}
            >
              {isFirebaseMode ? (busy ? "Opening your card" : "Open my card editor") : "Continue"}
            </Button>
            <p className="text-center text-2xs text-studio-ink-3">This invite is for {client.email} and works until {formatDate(expiresAt)}.</p>
          </>
        ) : (
          <SignInChoice
            client={client}
            headingRef={heading}
            onBack={() => setStep(1)}
            onAccept={async (method, password) => {
              onAccepting(true);
              const res = await acceptClientInvite(token, method, password);
              if (res.ok) router.push("/portal");
              else onAccepting(false);
              return res.ok ? null : res.error;
            }}
          />
        )}
      </div>
    </main>
  );
}

/**
 * Both sign-in designs, side by side as two choices. The magic link is the
 * default: clients edit their card a few times a year, so a password is one
 * more thing to forget, and the email address was just proven by this invite.
 */
function SignInChoice({
  client,
  headingRef,
  onBack,
  onAccept,
}: {
  client: InviteClient;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onAccept: (method: SignInMethod, password?: string) => Promise<string | null>;
}) {
  const [method, setMethod] = useState<SignInMethod>("magic-link");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const name = useId();
  const pwError = method === "password" && tried && password.length < MIN_PASSWORD ? `Use at least ${MIN_PASSWORD} characters.` : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (method === "password" && password.length < MIN_PASSWORD) return;
    setBusy(true);
    const err = await onAccept(method, method === "password" ? password : undefined);
    setBusy(false);
    setError(err);
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 ref={headingRef} tabIndex={-1} className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] focus:outline-none">
          How do you want to sign in next time?
        </h1>
        <p className="text-base text-studio-ink-2">You can change this later.</p>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Sign-in method</legend>
        <Choice
          name={name}
          checked={method === "magic-link"}
          onChange={() => setMethod("magic-link")}
          icon={<Mail aria-hidden className="size-5" />}
          title="Email me a sign-in link each time"
          badge="Recommended"
          body={`Nothing to remember. We send a link to ${client.email} whenever you want to edit.`}
        />
        <Choice
          name={name}
          checked={method === "password"}
          onChange={() => setMethod("password")}
          icon={<KeyRound aria-hidden className="size-5" />}
          title="Set a password"
          body="Sign in with your email and a password, without waiting for an email."
        >
          {method === "password" && (
            <Field label="New password" error={pwError} hint={`At least ${MIN_PASSWORD} characters.`} className="pt-1">
              {(p) => (
                <div className="relative">
                  <Input
                    id={p.id}
                    aria-describedby={p.describedBy}
                    invalid={p.invalid}
                    type={show ? "text" : "password"}
                    autoComplete="new-password"
                    autoFocus
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
          )}
        </Choice>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-lg bg-studio-danger-soft px-3 py-2 text-sm text-studio-danger-ink">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
          {method === "password" ? "Set password and open my card" : "Open my card"}
        </Button>
        <Button size="lg" variant="ghost" onClick={onBack} className="w-full">
          Back
        </Button>
      </div>
    </form>
  );
}

function Choice({
  name,
  checked,
  onChange,
  icon,
  title,
  badge,
  body,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-studio-surface p-4 transition-[border-color,box-shadow]",
        checked ? "border-studio-action shadow-[0_0_0_1px_var(--studio-action)]" : "border-studio-line hover:border-studio-line-strong",
      )}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-1 size-5 shrink-0 cursor-pointer accent-[var(--studio-action)]" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-studio-ink-3">{icon}</span>
            <span className="text-base font-semibold text-studio-ink">{title}</span>
            {badge && <span className="inline-flex h-6 items-center rounded-full bg-studio-action-soft px-2 text-2xs font-semibold text-studio-action-ink">{badge}</span>}
          </span>
          <span className="text-sm text-studio-ink-2 [overflow-wrap:anywhere]">{body}</span>
        </span>
      </label>
      {children}
    </div>
  );
}
