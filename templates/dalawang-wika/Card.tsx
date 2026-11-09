"use client";

import { ArrowRight, Navigation, Phone, UserPlus } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { directionsUrl } from "@/lib/services/card-utils";
import { visibleSections } from "@/lib/design/sections";
import type { CardBundle, ReorderableSection } from "@/lib/types";
import { cn, initials } from "@/lib/utils";
import { MessageIcon, ShareButton, useContactActions } from "@/components/card/actions";
import { CardContext, useCard, type CardMode } from "@/components/card/context";
import { usePrimaryCta, type PrimaryCta } from "@/components/card/extras";
import { LabelsProvider } from "@/components/card/labels";
import { AgentPhoto, Logo, NameText } from "@/components/card/primitives";
import { CardFooter, ContactList, OrgChartBlock, PhotoAlbum, SectionStyle, SocialLinks, StyledMap, T, type HeadingProps } from "@/components/card/sections";
import { useScrollRoot } from "@/components/ui/device-preview";
import type { TemplateProps } from "../types";

/**
 * N — Dalawang Wika. A blue band with a sun in the corner, a white identity
 * card over it, and an EN / FIL switch that turns every label and the card's
 * own words (title, quote, about, services) into the visitor's language.
 * On wide screens the identity card holds a left column beside the sections.
 */

type Lang = "en" | "fil";

/* ------------------------------------------------------------ Words */

/** The template's own words. Shared blocks (Copy, Phone, Share…) read the shared EN / FIL labels. */
const WORDS = {
  en: {
    language: "Language",
    call: "Call",
    message: "Message",
    cta: "Book a free consultation",
    ctaShort: "Book a consultation",
    about: "About me",
    services: "Services",
    readMore: "Read more",
    showLess: "Show less",
    photos: "Photos",
    office: "Office",
    directions: "Directions",
    team: "Team",
    contact: "Contact",
    save: "Save to contacts",
    saveShort: "Save contact",
    socials: "Find me online",
    newTab: "(opens in a new tab)",
  },
  fil: {
    language: "Wika",
    call: "Tumawag",
    message: "Mag-message",
    cta: "Mag-book ng libreng konsultasyon",
    ctaShort: "Mag-book ng konsulta",
    about: "Tungkol sa akin",
    services: "Mga serbisyo",
    readMore: "Magbasa pa",
    showLess: "Paikliin",
    photos: "Mga Larawan",
    office: "Opisina",
    directions: "Direksyon",
    team: "Ang Team",
    contact: "Makipag-ugnayan",
    save: "I-save ang contact",
    saveShort: "I-save",
    socials: "Sa social media",
    newTab: "(magbubukas sa bagong tab)",
  },
} satisfies Record<Lang, Record<string, string>>;

type Words = (typeof WORDS)["en"];

/* --------------------------------------------- Remembered language */

const KEY = "tapik:lang";
const listeners = new Set<() => void>();
let memory: Lang | null = null;

function readLang(): Lang {
  if (memory) return memory;
  try {
    return window.localStorage.getItem(KEY) === "fil" ? "fil" : "en";
  } catch {
    return "en";
  }
}

function writeLang(l: Lang) {
  memory = l;
  try {
    window.localStorage.setItem(KEY, l);
  } catch {
    /* Private mode or blocked storage: the choice lasts for this visit only. */
  }
  listeners.forEach((f) => f());
}

function subscribe(f: () => void) {
  listeners.add(f);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    memory = null;
    f();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(f);
    window.removeEventListener("storage", onStorage);
  };
}

const serverLang = (): Lang => "en";

/**
 * Public cards remember the visitor's language (localStorage) and set <html lang>.
 * The server and the first client render are English; the stored choice applies right after hydration.
 * Previews and thumbnails keep their own state and never touch the document.
 */
function useLanguage(mode: CardMode): [Lang, (l: Lang) => void] {
  const stored = useSyncExternalStore(subscribe, readLang, serverLang);
  const [local, setLocal] = useState<Lang>("en");
  const isPublic = mode === "public";
  const lang = isPublic ? stored : local;

  useEffect(() => {
    if (!isPublic) return;
    const html = document.documentElement;
    const prev = html.getAttribute("lang");
    html.setAttribute("lang", lang);
    return () => {
      if (prev === null) html.removeAttribute("lang");
      else html.setAttribute("lang", prev);
    };
  }, [isPublic, lang]);

  return [lang, isPublic ? writeLang : setLocal];
}

/* ------------------------------------------------- Card's own words */

const filled = (s?: string) => (s?.trim() ? s : undefined);

/** Filipino service names pair with the English ones by position; an empty one falls back to English. */
function mergeChips(en: string[] = [], fil: string[] = []): string[] {
  const out: string[] = [];
  for (let i = 0; i < Math.max(en.length, fil.length); i++) {
    const s = (fil[i]?.trim() || en[i]?.trim()) ?? "";
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

/** The bundle in the shown language, so every shared block and the vCard read the same words. */
function translate(b: CardBundle, lang: Lang): CardBundle {
  const fil = b.card.translations?.fil;
  if (lang === "en" || !fil) return b;
  return {
    ...b,
    card: {
      ...b.card,
      title: filled(fil.title) ?? b.card.title,
      quote: filled(fil.quote) ?? b.card.quote,
      description: filled(fil.description) ?? b.card.description,
      services: mergeChips(b.card.services, fil.chips),
    },
  };
}

/* ------------------------------------------------------------- Card */

export default function DalawangWikaCard({ bundle, tokens, mode }: TemplateProps) {
  const ctx = useCard();
  const [lang, setLang] = useLanguage(mode);
  const shown = useMemo(() => translate(bundle, lang), [bundle, lang]);
  const value = useMemo(() => ({ ...ctx, bundle: shown }), [ctx, shown]);
  return (
    <CardContext.Provider value={value}>
      <LabelsProvider lang={lang}>
        <Layout bundle={shown} tokens={tokens} mode={mode} lang={lang} setLang={setLang} />
      </LabelsProvider>
    </CardContext.Provider>
  );
}

type Key = ReorderableSection | "about";

function Layout({ bundle, tokens, mode, lang, setLang }: TemplateProps & { lang: Lang; setLang: (l: Lang) => void }) {
  const { card } = bundle;
  const W = WORDS[lang];
  const actionsRef = useRef<HTMLDivElement>(null);
  const cta = usePrimaryCta(W.cta);

  // About gathers the quote, the bio and the service chips, at whichever of About or Quote comes first.
  const visible = new Set(visibleSections(bundle));
  const chips = (card.services ?? []).map((s) => s.trim()).filter(Boolean);
  const parts = { quote: visible.has("quote"), bio: visible.has("about"), chips: chips.length > 0 && !card.hiddenSections.includes("about") };
  const order: Key[] = [];
  for (const k of card.sectionOrder) {
    if (k === "quote" || k === "about") {
      const has = k === "quote" ? parts.quote : parts.bio || parts.chips;
      if (has && !order.includes("about")) order.push("about");
    } else if (visible.has(k)) order.push(k);
  }

  const render: Record<Key, () => ReactNode> = {
    about: () => <About W={W} showQuote={parts.quote} showBio={parts.bio} chips={parts.chips ? chips : []} />,
    quote: () => null,
    photos: () => <PhotoAlbum tone="background" layout="grid" title={W.photos} />,
    map: () => <Office W={W} />,
    orgChart: () => (
      <div className="rounded-[18px] bg-c-surface p-4 pt-5 text-c-text @4xl:p-6">
        <OrgChartBlock tone="surface" title={W.team} />
      </div>
    ),
    contact: () => <Contact W={W} />,
    socials: () => <Socials W={W} />,
  };

  return (
    <SectionStyle.Provider value={{ renderHeading: (p) => <Heading {...p} /> }}>
      <div lang={lang} className="relative min-h-[var(--c-vh)] overflow-clip bg-c-bg text-c-on-bg">
        {/* Band */}
        <div className="relative h-[228px] overflow-hidden bg-c-primary text-c-on-primary @4xl:h-[320px]">
          <span aria-hidden className="absolute -top-[92px] -left-[64px] size-[184px] rounded-full bg-c-accent @4xl:-top-[150px] @4xl:-left-[110px] @4xl:size-[320px]" />
          <header className="relative mx-auto flex max-w-[1120px] items-center gap-3 px-4 pt-4 @4xl:px-10 @4xl:pt-7">
            <LogoBadge surface={tokens.surface} />
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <LanguageSwitch lang={lang} onChange={setLang} label={W.language} />
              <ShareButton className="text-c-on-primary hover:bg-[color-mix(in_oklab,var(--c-on-primary)_14%,transparent)]" />
            </div>
          </header>
        </div>

        <div className="relative mx-auto -mt-[104px] max-w-[1120px] px-4 @4xl:-mt-[168px] @4xl:grid @4xl:grid-cols-[400px_minmax(0,1fr)] @4xl:gap-14 @4xl:px-10">
          <div className="@4xl:sticky @4xl:top-6 @4xl:self-start">
            <IdentityCard mode={mode} W={W} cta={cta} actionsRef={actionsRef} />
          </div>

          <main className="flex flex-col gap-12 pt-12 pb-28 @4xl:gap-14 @4xl:pt-[208px] @4xl:pb-20">
            {order.map((k) => (
              <div key={k}>{render[k]()}</div>
            ))}
            <CardFooter tone="background" />
          </main>
        </div>

        <BottomBar watch={actionsRef} W={W} cta={cta} />
      </div>
    </SectionStyle.Provider>
  );
}

/* ----------------------------------------------------------- Header */

function LogoBadge({ surface }: { surface: string }) {
  const { bundle, isHidden } = useCard();
  const c = bundle.card;
  if (isHidden("logo") || (!c.logoUrl && !c.logoDarkUrl && !c.company)) return <span />;
  return (
    <span className="relative flex h-12 min-w-0 items-center rounded-[14px] bg-c-surface px-3 text-c-text shadow-[0_6px_16px_-8px_rgb(0_0_0/0.45)]">
      <Logo on={surface} className="h-8 max-w-[44cqi] text-[15px] font-bold @4xl:max-w-[220px]" />
    </span>
  );
}

/** EN / FIL as a segmented pill; the sun slides to the chosen language. */
function LanguageSwitch({ lang, onChange, label }: { lang: Lang; onChange: (l: Lang) => void; label: string }) {
  const options = [
    ["en", "EN", "English"],
    ["fil", "FIL", "Filipino"],
  ] as const;
  return (
    <div role="group" aria-label={label} className="relative grid grid-cols-2 rounded-full bg-[color-mix(in_oklab,var(--c-on-primary)_14%,var(--c-primary))] p-[3px]">
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-full bg-c-accent transition-transform duration-300 [transition-timing-function:var(--ease-out-expo)] motion-reduce:transition-none",
          lang === "fil" && "translate-x-full",
        )}
      />
      {options.map(([value, short, full]) => (
        <button
          key={value}
          type="button"
          lang={value}
          aria-pressed={lang === value}
          aria-label={full}
          onClick={() => onChange(value)}
          className={cn(
            // 40px to the eye, 44px to the thumb.
            "relative inline-flex h-10 min-w-[52px] cursor-pointer items-center justify-center rounded-full px-3 text-sm font-bold tracking-[0.04em] transition-colors before:absolute before:-inset-y-[5px] before:inset-x-0 before:content-[''] focus-visible:shadow-[0_0_0_2px_var(--c-primary),0_0_0_4px_var(--c-on-primary)]",
            lang === value ? "text-c-primary" : "text-c-on-primary hover:bg-[color-mix(in_oklab,var(--c-on-primary)_12%,transparent)]",
          )}
        >
          {short}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------------------------------- Identity */

function IdentityCard({ mode, W, cta, actionsRef }: { mode: CardMode; W: Words; cta: PrimaryCta | null; actionsRef: React.RefObject<HTMLDivElement | null> }) {
  const { bundle, isHidden } = useCard();
  const c = bundle.card;
  const H1 = mode === "public" ? "h1" : "p";
  const photo = !isHidden("agentPhoto");
  const org = [c.company, c.credential].filter(Boolean);

  return (
    <section
      aria-label={c.name}
      className={cn(
        "relative rounded-[22px] bg-c-surface px-5 pb-5 text-c-text shadow-[0_18px_40px_-22px_rgb(0_0_0/0.45)] @4xl:px-7 @4xl:pb-7",
        photo ? "pt-0" : "pt-6",
      )}
    >
      {photo && <Portrait />}
      <div className={cn("motion-name-rise flex flex-col gap-1.5", photo && "pt-4")}>
        <H1 className="card-display text-[clamp(1.65rem,7.6cqi,2.1rem)] leading-[1.08] [overflow-wrap:anywhere] [text-wrap:balance] @4xl:text-[2.15rem]">
          <NameText name={c.name} />
        </H1>
        {c.title && <p className="text-[17px] leading-snug font-semibold text-c-primary [overflow-wrap:anywhere]">{c.title}</p>}
        {org.length > 0 && (
          <p className="text-[15px] leading-snug text-c-text-muted [overflow-wrap:anywhere]">
            {org.map((t, i) => (
              <span key={t} className={cn(i > 0 && "block tabular-nums text-sm")}>
                {t}
              </span>
            ))}
          </p>
        )}
      </div>
      <div ref={actionsRef} className="pt-6">
        <HeroActions W={W} cta={cta} />
      </div>
    </section>
  );
}

function Portrait() {
  const { bundle } = useCard();
  const c = bundle.card;
  const frame = "relative -mt-11 size-[96px] rounded-[24px] ring-[5px] ring-c-surface @4xl:size-[112px] @4xl:-mt-14";
  if (c.agentPhotoUrl) {
    return (
      <div className={frame}>
        <AgentPhoto shape="rounded-square" sizes="120px" priority className="size-full rounded-[24px]" />
      </div>
    );
  }
  return (
    <div role="img" aria-label={c.name} className={cn(frame, "flex items-center justify-center bg-c-primary")}>
      <span aria-hidden className="card-display text-[2.1rem] leading-none text-c-accent @4xl:text-[2.4rem]">
        {initials(c.name)}
      </span>
    </div>
  );
}

const ext = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {});

const sunBtn =
  "cbtn border-[1.5px] border-c-accent bg-c-accent text-c-primary hover:bg-[color-mix(in_oklab,var(--c-accent)_86%,var(--c-primary))] [[data-fill=outline]_&]:border-c-primary [[data-fill=outline]_&]:bg-transparent [[data-fill=soft]_&]:border-transparent [[data-fill=soft]_&]:bg-[color-mix(in_oklab,var(--c-accent)_45%,var(--c-surface))]";
const lineBtn =
  "cbtn border-[1.5px] border-c-primary bg-transparent text-c-primary hover:bg-[color-mix(in_oklab,var(--c-primary)_7%,var(--c-surface))]";

/** Book first, then Call (sun) and Message (outline). Without a booking link the main button falls back to Message, then Call. */
function HeroActions({ W, cta }: { W: Words; cta: PrimaryCta | null }) {
  const { call, message, messageLabel, saveContact } = useContactActions();

  const callBtn = call && (
    <a key="call" href={call} className={cn(sunBtn, "h-14 min-w-0 gap-1.5 px-2 text-[14px] whitespace-nowrap @sm:text-[15px]")}>
      <Phone aria-hidden className="size-[18px]" strokeWidth={2.25} />
      {W.call}
    </a>
  );
  const messageBtn = message && (
    <a key="message" href={message} {...ext(message)} className={cn(lineBtn, "h-14 min-w-0 gap-1.5 px-2 text-[14px] whitespace-nowrap @sm:text-[15px]")}>
      <MessageIcon className="size-[18px]" />
      {W.message}
      <span className="sr-only"> ({messageLabel})</span>
    </a>
  );
  const saveBtn = (
    <button key="save" type="button" onClick={saveContact} className={cn(lineBtn, "h-14 min-w-0 cursor-pointer gap-1.5 px-2 text-[14px] whitespace-nowrap @sm:text-[15px]")}>
      <UserPlus aria-hidden className="size-[18px]" strokeWidth={2} />
      {W.saveShort}
    </button>
  );

  if (!cta) {
    return (
      <button type="button" onClick={saveContact} className="cbtn cbtn-primary h-14 w-full cursor-pointer text-base">
        <UserPlus aria-hidden className="size-5" strokeWidth={2} />
        {W.save}
      </button>
    );
  }

  const rest = (cta.kind === "link" ? [callBtn, messageBtn] : cta.kind === "message" ? [callBtn, saveBtn] : [saveBtn]).filter(Boolean);
  return (
    <div className="flex flex-col gap-2.5">
      <a href={cta.href} {...(cta.external ? { target: "_blank", rel: "noreferrer" } : {})} className="cbtn cbtn-primary group w-full px-5 py-[18px] text-left">
        <span className="flex min-w-0 flex-col">
          <span className="text-base leading-tight font-bold">{cta.kind === "call" ? W.call : cta.label}</span>
          {cta.sub && <span className="mt-0.5 text-[13px] leading-tight font-medium">{cta.sub}</span>}
        </span>
        <ArrowRight aria-hidden className="size-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" strokeWidth={2.25} />
        {cta.external && <span className="sr-only"> {W.newTab}</span>}
      </a>
      {rest.length > 0 && <div className={cn("grid gap-2.5", rest.length === 2 ? "grid-cols-2" : "grid-cols-1")}>{rest}</div>}
    </div>
  );
}

/* --------------------------------------------------------- Sections */

/** Section heading with a small sun before it. */
function Heading({ children, tone, aside, id }: HeadingProps) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 id={id} className={cn("card-display flex items-center gap-2.5 text-[1.375rem] leading-tight", T[tone].text)}>
        <span aria-hidden className="size-3 shrink-0 rounded-full border-2 border-c-primary bg-c-accent" />
        {children}
      </h2>
      {aside && <span className={cn("shrink-0 text-sm tabular-nums", T[tone].muted)}>{aside}</span>}
    </div>
  );
}

function About({ W, showQuote, showBio, chips }: { W: Words; showQuote: boolean; showBio: boolean; chips: string[] }) {
  const { bundle } = useCard();
  const uid = useId();
  const c = bundle.card;
  const quote = showQuote ? c.quote?.trim().replace(/^[“"]|[”"]$/g, "") : "";
  const text = showBio ? (c.description?.trim() ?? "") : "";

  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-5">
      <Heading tone="background" id={`${uid}-h`}>
        {W.about}
      </Heading>
      {quote && (
        <figure className="m-0">
          <blockquote className="card-display m-0 text-[clamp(1.3rem,5.6cqi,1.6rem)] leading-[1.3] text-c-on-bg [text-wrap:pretty]">
            <p>
              <span aria-hidden className="text-c-primary">
                “
              </span>
              {quote}
              <span aria-hidden className="text-c-primary">
                ”
              </span>
            </p>
          </blockquote>
        </figure>
      )}
      {text && <Bio text={text} W={W} />}
      {chips.length > 0 && (
        <ul aria-label={W.services} className="flex flex-wrap gap-2">
          {chips.map((s) => (
            <li key={s} className="inline-flex min-h-9 items-center rounded-full bg-[color-mix(in_oklab,var(--c-primary)_9%,var(--c-surface))] px-3.5 py-1.5 text-sm leading-snug font-semibold text-c-primary">
              {s}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The first paragraph, clamped to six lines; Read more opens the rest. The button shows only when there is more. */
function Bio({ text, W }: { text: string; W: Words }) {
  const uid = useId();
  const first = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const paragraphs = text.split(/\n{2,}/);

  useEffect(() => {
    const el = first.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setOverflows(el.scrollHeight > el.clientHeight + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  const more = paragraphs.length > 1 || overflows || open;
  return (
    <div className="flex flex-col gap-1">
      <div id={`${uid}-bio`} className="flex max-w-[60ch] flex-col gap-3 text-base leading-[1.65] text-c-on-bg">
        {paragraphs.map((p, i) => (
          <p key={i} ref={i === 0 ? first : undefined} hidden={!open && i > 0} className={cn(i === 0 && !open && "line-clamp-6")}>
            {p}
          </p>
        ))}
      </div>
      {more && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${uid}-bio`}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-11 cursor-pointer items-center self-start text-[15px] font-bold text-c-primary underline underline-offset-4"
        >
          {open ? W.showLess : W.readMore}
        </button>
      )}
    </div>
  );
}

function Office({ W }: { W: Words }) {
  const { bundle } = useCard();
  const uid = useId();
  const c = bundle.card;
  if (!c.address?.trim()) return null;
  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-4">
      <Heading tone="background" id={`${uid}-h`}>
        {W.office}
      </Heading>
      <StyledMap tone="background" className="h-48 rounded-[18px] @3xl:h-64" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <address className="max-w-[34ch] text-[15px] leading-normal text-c-on-bg not-italic">{c.address}</address>
        {c.showDirections && (
          <a href={directionsUrl(c)} target="_blank" rel="noreferrer" className="cbtn cbtn-primary px-4 text-[15px]">
            <Navigation aria-hidden className="size-4" strokeWidth={2.25} />
            {W.directions}
          </a>
        )}
      </div>
    </section>
  );
}

function Contact({ W }: { W: Words }) {
  const { bundle } = useCard();
  const { saveContact } = useContactActions();
  const uid = useId();
  const c = bundle.card;
  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-3 rounded-[18px] bg-c-surface p-4 pt-5 text-c-text @4xl:p-6">
      <Heading tone="surface" id={`${uid}-h`}>
        {W.contact}
      </Heading>
      {(c.phone || c.email) && <ContactList tone="surface" variant="rows" />}
      <button type="button" onClick={saveContact} className={cn(lineBtn, "mt-2 h-14 w-full cursor-pointer text-[15px]")}>
        <UserPlus aria-hidden className="size-[18px]" strokeWidth={2} />
        {W.save}
      </button>
    </section>
  );
}

function Socials({ W }: { W: Words }) {
  const uid = useId();
  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-4">
      <Heading tone="background" id={`${uid}-h`}>
        {W.socials}
      </Heading>
      <SocialLinks tone="background" variant="icons" />
    </section>
  );
}

/* ------------------------------------------------------- Bottom bar */

/** Once the identity card's buttons scroll away: the main button, then Call and Message as icons. */
function BottomBar({ watch, W, cta }: { watch: React.RefObject<HTMLElement | null>; W: Words; cta: PrimaryCta | null }) {
  const { call, message, messageLabel } = useContactActions();
  const root = useScrollRoot();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = watch.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const above = entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0);
        setVisible(!entry.isIntersecting && above);
      },
      { root: root?.current ?? null, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [watch, root]);

  if (!cta) return null;
  const label = cta.kind === "link" ? (bundleLabelIsDefault(cta, W) ? W.ctaShort : cta.label) : cta.kind === "call" ? W.call : cta.label;
  const icons = [
    cta.kind !== "call" && call && { key: "call", href: call, label: W.call, cls: sunBtn, icon: <Phone aria-hidden className="size-5" strokeWidth={2.25} /> },
    cta.kind === "link" && message && { key: "msg", href: message, label: `${W.message} (${messageLabel})`, cls: lineBtn, icon: <MessageIcon className="size-5" /> },
  ].filter(Boolean) as { key: string; href: string; label: string; cls: string; icon: ReactNode }[];

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "sticky bottom-0 z-40 -mt-[84px] h-[84px] transition-[transform,opacity] duration-300 [transition-timing-function:var(--ease-out-expo)] motion-reduce:transition-none @4xl:hidden",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <div
        className="grid h-full gap-2 bg-c-surface px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] text-c-text shadow-[0_-8px_24px_-6px_rgb(0_0_0/0.22)]"
        style={{ gridTemplateColumns: ["minmax(0,1fr)", ...icons.map(() => "56px")].join(" ") }}
      >
        <a href={cta.href} {...(cta.external ? { target: "_blank", rel: "noreferrer" } : {})} className="cbtn cbtn-primary min-w-0 px-2.5 text-[15px]">
          <span className="truncate">{label}</span>
          {cta.external && <span className="sr-only"> {W.newTab}</span>}
        </a>
        {icons.map((i) => (
          <a key={i.key} href={i.href} {...ext(i.href)} aria-label={i.label} className={cn(i.cls, "px-0")}>
            {i.icon}
          </a>
        ))}
      </div>
    </div>
  );
}

/** A card with its own button label shows it everywhere; the default label gets a shorter form in the bar. */
function bundleLabelIsDefault(cta: PrimaryCta, W: Words) {
  return cta.label === W.cta;
}
