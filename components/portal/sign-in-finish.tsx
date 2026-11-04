"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { completeEmailLinkSignIn, isFirebaseMode, isSignInLink, rememberedSignInEmail } from "@/lib/services/session";
import { validateEmail } from "@/lib/validate";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PortalNotice } from "./gates";

type State = { kind: "working" } | { kind: "confirm" } | { kind: "error"; message: string } | { kind: "bad-link" };

/**
 * Where the sign-in email's link lands. Same device: signs in straight away
 * with the email saved when the link was requested. Another device: asks for
 * the email first (Firebase requires it, so a forwarded link alone isn't enough).
 */
export function SignInFinish() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "working" });
  const [email, setEmail] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  const finish = async (address: string) => {
    setBusy(true);
    const r = await completeEmailLinkSignIn(address, window.location.href);
    if (r.ok) {
      router.replace("/portal");
      return;
    }
    setBusy(false);
    setState({ kind: "error", message: r.error });
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!isFirebaseMode) {
      router.replace("/portal/sign-in");
      return;
    }
    void (async () => {
      if (!(await isSignInLink(window.location.href))) {
        setState({ kind: "bad-link" });
        return;
      }
      const saved = rememberedSignInEmail();
      if (saved) await finish(saved);
      else setState({ kind: "confirm" });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once for the link in the address bar
  }, []);

  const newLink = (
    <LinkButton href="/portal/sign-in" variant="primary" size="lg">
      Send me a new link
    </LinkButton>
  );

  if (state.kind === "bad-link") {
    return (
      <PortalNotice title="This sign-in link doesn’t work" actions={newLink}>
        It may have been cut off when it was copied. Open it straight from the email, or ask for a new one.
      </PortalNotice>
    );
  }
  if (state.kind === "error") {
    return (
      <PortalNotice title="We couldn’t sign you in" actions={newLink}>
        <p role="alert">{state.message} Sign-in links work once and expire after a few hours.</p>
      </PortalNotice>
    );
  }
  if (state.kind === "confirm") {
    const check = validateEmail(email);
    const error = !tried ? null : !email.trim() ? "Enter the email the link was sent to." : !check.ok ? check.message : null;
    return (
      <PortalNotice title="Confirm your email">
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            setTried(true);
            if (email.trim() && check.ok) void finish(check.value);
          }}
        >
          <p>You opened the link on a different device or browser. Enter the email it was sent to, to finish signing in.</p>
          <Field label="Email" error={error}>
            {(p) => (
              <Input id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} type="email" inputMode="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
            )}
          </Field>
          <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
            {busy ? "Signing in" : "Sign in"}
          </Button>
        </form>
      </PortalNotice>
    );
  }
  return (
    <PortalNotice title="Signing you in…">
      <p role="status">Checking your link. This takes a second.</p>
    </PortalNotice>
  );
}
