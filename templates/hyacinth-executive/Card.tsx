"use client";

import { ArrowRight, ChevronRight, Globe, Mail, Phone, UserPlus } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { visibleSections } from "@/lib/design/sections";
import { displayHandle, getPlatform } from "@/lib/social";
import type { ReorderableSection } from "@/lib/types";
import { phoneDigits } from "@/lib/validate";
import { cn, initials } from "@/lib/utils";
import { MessageIcon, ShareButton, useContactActions } from "@/components/card/actions";
import { BrandIcon } from "@/components/card/brand-icons";
import { useCard } from "@/components/card/context";
import { useBookingHref } from "@/components/card/extras";
import { useLabels } from "@/components/card/labels";
import { CardImage, NameText } from "@/components/card/primitives";
import { AboutBlock, CardFooter, MapBlock, OrgChartBlock, PhotoAlbum, SectionStyle, type HeadingProps } from "@/components/card/sections";
import { useScrollRoot } from "@/components/ui/device-preview";
import { cropStyle } from "@/components/ui/image-tools";
import type { TemplateProps } from "../types";
import { PALETTE, rolesFor, VOICE } from "./brand";

/**
 * J — Hyacinth Executive. The brand of Hyacinth Industries, LLC: a black hero
 * with the petal mark, a cover panel with gold rings and the photo framed in
 * gold, the brand line with its last clause in gold, Book a Strategy Call
 * first, then an off-white sheet trimmed in gold. On wide screens the card is
 * a centered column over the ground and rings.
 */
export default function HyacinthExecutiveCard({ bundle, tokens, mode }: TemplateProps) {
  const { card } = bundle;
  const { isHidden } = useCard();
  const roles = useMemo(() => rolesFor(tokens), [tokens]);
  const actionsRef = useRef<HTMLDivElement>(null);
  const H1 = mode === "public" ? "h1" : "p";

  const sheet = visibleSections(bundle).filter((k) => k !== "quote");
  const chips = useChips();
  const brandLine = !isHidden("quote") && card.quote?.trim() ? splitHeadline(card.quote) : null;
  const eyebrow = card.eyebrow?.trim();

  const vars = {
    "--hx-gold": roles.gold,
    "--hx-focus": roles.dark ? roles.gold : tokens.onBackground,
    "--hx-panel": roles.panel,
    "--hx-panel-border": roles.panelBorder,
    "--hx-hero-muted": roles.heroMuted,
    "--hx-hero-outline": roles.heroOutline,
    "--hx-label": roles.label,
    "--hx-sheet-muted": roles.sheetMuted,
    "--hx-card": roles.card,
    "--hx-card-border": roles.cardBorder,
    "--hx-icon": roles.icon,
    "--hx-social": roles.social,
  } as CSSProperties;

  const render: Partial<Record<ReorderableSection, () => ReactNode>> = {
    about: () => <About />,
    contact: () => <ContactPanel />,
    socials: () => <Socials />,
    photos: () => <PhotoAlbum tone="surface" layout="grid" />,
    // The map pin is brand red, not the hero accent.
    map: () => (
      <div style={{ "--c-accent": "var(--hx-icon)" } as CSSProperties}>
        <MapBlock tone="surface" mapClassName="!rounded-[16px] border border-[var(--hx-card-border)] !h-44" />
      </div>
    ),
    orgChart: () => (
      // Leader on top, members indented beneath a gold rule.
      <div className="[&_li>ul]:border-l-2 [&_li>ul]:border-[color:var(--hx-gold)]">
        <OrgChartBlock tone="surface" />
      </div>
    ),
  };
  // Expertise sits right after About, or first when there is no About.
  const order: (ReorderableSection | "expertise")[] = [...sheet];
  if (chips.length) order.splice(sheet.includes("about") ? sheet.indexOf("about") + 1 : 0, 0, "expertise");

  return (
    <SectionStyle.Provider value={{ renderHeading: (p) => <Label {...p} /> }}>
      <div style={vars} className="relative isolate min-h-[var(--c-vh)] overflow-clip text-c-on-bg">
        <GroundRings />

        <div className="relative mx-auto flex min-h-[var(--c-vh)] max-w-[480px] flex-col @2xl:pt-10">
          {/* Header */}
          <header className="flex items-center gap-3 px-4 pt-4 pb-3">
            <HeaderLogo dark={roles.dark} />
            <ShareButton className="border border-[color:color-mix(in_oklab,var(--hx-hero-outline)_55%,transparent)] text-c-on-bg hover:bg-c-on-bg/10" />
          </header>

          {/* Hero media */}
          <div className="relative px-4">
            <HeroPanel />
            <AgentFrame />
          </div>

          {/* Identity */}
          <div className="flex flex-col gap-3 px-5 pt-4">
            {eyebrow && (
              <p className="inline-flex min-h-7 items-center gap-2 self-start rounded-full border border-[color:color-mix(in_oklab,var(--hx-gold)_45%,transparent)] bg-[color:color-mix(in_oklab,var(--hx-gold)_8%,transparent)] py-1 pr-3.5 pl-2.5 text-[12px] leading-tight font-semibold tracking-[0.08em] text-c-accent uppercase">
                <span aria-hidden className="hx-pulse size-1.5 shrink-0 rounded-full bg-[var(--hx-gold)]" />
                {eyebrow}
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <H1 className="card-display text-[clamp(1.75rem,8.7cqi,2.125rem)] leading-[1.06] [overflow-wrap:anywhere] [text-wrap:balance] @2xl:text-[2.125rem]">
                <NameText name={card.name} />
              </H1>
              {(card.title || card.company) && (
                <p className="flex flex-col text-[15px] leading-snug text-[var(--hx-hero-muted)]">
                  {card.title && <span className="font-medium [overflow-wrap:anywhere]">{card.title}</span>}
                  {card.company && <span className="[overflow-wrap:anywhere]">{card.company}</span>}
                </p>
              )}
            </div>
          </div>

          {/* Brand line */}
          {brandLine && (
            <p className="card-display mt-5 px-5 text-[1.3rem] leading-[1.24] !tracking-[-0.02em] [text-wrap:balance]" style={{ fontWeight: 700 }}>
              {brandLine[0]}
              {brandLine[1] && <span className="text-c-accent">{brandLine[1]}</span>}
            </p>
          )}

          {/* Actions */}
          <div ref={actionsRef} className="px-4 pt-6">
            <HeroActions />
          </div>

          {/* Light content sheet */}
          <main className="relative mt-8 flex flex-1 flex-col gap-9 rounded-t-[20px] border-t-[3px] border-[var(--hx-gold)] bg-c-surface px-4 pt-8 pb-28 text-c-text @2xl:mb-10 @2xl:flex-none @2xl:rounded-b-[20px] @2xl:pb-10 @4xl:pb-10">
            {order.map((key) => (
              <div key={key}>{key === "expertise" ? <Expertise chips={chips} /> : render[key]?.()}</div>
            ))}
            <CardFooter tone="surface" className="text-[var(--hx-sheet-muted)]" />
          </main>
        </div>

        <BottomBar watch={actionsRef} />
      </div>
    </SectionStyle.Provider>
  );
}

/* ------------------------------------------------------------ Helpers */

/** "Close bigger deals, build stronger brands, execute faster." → the last clause carries the accent. */
export function splitHeadline(raw: string): [string, string] {
  const q = raw.trim().replace(/^[“"]|[”"]$/g, "");
  const i = q.lastIndexOf(", ");
  if (i > 0 && q.length - i - 2 <= 40) return [q.slice(0, i + 1) + " ", q.slice(i + 2)];
  return [q, ""];
}

/** Expertise chips; a card with only Services (from another template) shows those instead. */
function useChips(): string[] {
  const { bundle } = useCard();
  const pick = (xs?: string[]) => (xs ?? []).map((s) => s.trim()).filter(Boolean);
  const own = pick(bundle.card.expertiseChips);
  return own.length ? own : pick(bundle.card.services);
}

/* ------------------------------------------------------------- Pieces */

/** The petal mark: three outlined leaves, the left one red. Decorative; the company name carries the meaning. */
export function PetalMark({ className, mono }: { className?: string; mono?: string }) {
  const leaf = "M0,0 C15,20 15,46 0,66 C-15,46 -15,20 0,0Z";
  return (
    <svg aria-hidden viewBox="-6 -4 132 86" className={className} fill="none" strokeWidth="5.5" strokeLinejoin="round">
      <path d={leaf} transform="translate(58 76) rotate(118) scale(0.97)" stroke={mono ?? PALETTE.red} />
      <path d={leaf} transform="translate(60 76) rotate(180) scale(1.06)" stroke={mono ?? PALETTE.gold} />
      <path d={leaf} transform="translate(62 76) rotate(242) scale(0.97)" stroke={mono ?? PALETTE.gold} />
    </svg>
  );
}

function HeaderLogo({ dark }: { dark: boolean }) {
  const { bundle, isHidden } = useCard();
  const c = bundle.card;
  // The site's logo is chrome on black, so on a light hero it falls back to the mark and name.
  const src = isHidden("logo") ? undefined : dark ? c.logoDarkUrl || c.logoUrl : c.logoUrl;
  const tagline = c.tagline?.trim();
  const sub = tagline && <span className="text-[11px] leading-[1.35] font-semibold tracking-[0.16em] text-[var(--hx-hero-muted)] uppercase">{tagline}</span>;

  if (src) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- logos are of unknown aspect ratio */}
        <img src={src} alt={c.logoAlt || c.company || "Logo"} className="h-12 w-auto max-w-[132px] shrink-0 object-contain object-left" />
        {sub && (
          <>
            <span aria-hidden className="h-8 w-px shrink-0 bg-[var(--hx-panel-border)]" />
            <span className="min-w-0 [&>span]:block">{sub}</span>
          </>
        )}
      </div>
    );
  }
  if (!c.company && !tagline) return <span />;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {!isHidden("logo") && <PetalMark className="h-8 w-auto shrink-0" />}
      <span className="flex min-w-0 flex-col gap-0.5">
        {c.company && <span className="truncate font-[family-name:var(--c-font-display)] text-[15px] leading-tight font-bold tracking-[0.025em]">{c.company}</span>}
        {sub}
      </span>
    </div>
  );
}

/** Two faint gold rings, used in the hero panel and (large) behind the column on wide screens. */
function Rings({ className, size = 220 }: { className?: string; size?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 220 220" width={size} height={size} className={className} fill="none" stroke="var(--hx-gold)">
      <circle cx="110" cy="110" r="108" strokeOpacity="0.32" strokeWidth="1.25" />
      <circle cx="110" cy="110" r="72" strokeOpacity="0.22" strokeWidth="1.25" />
    </svg>
  );
}

function GroundRings() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden @2xl:block">
      <Rings size={760} className="hx-drift absolute -right-[260px] -bottom-[240px]" />
      <Rings size={520} className="hx-drift absolute -top-[200px] -left-[180px] [animation-delay:-9s]" />
    </div>
  );
}

function HeroPanel() {
  const { bundle } = useCard();
  const c = bundle.card;
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-[16px] border border-[var(--hx-panel-border)] bg-[var(--hx-panel)] @2xl:rounded-[20px]">
      {c.backgroundPhotoUrl ? (
        <>
          <div className="absolute inset-0">
            <CardImage src={c.backgroundPhotoUrl} alt={c.backgroundPhotoAlt || ""} sizes="(min-width: 768px) 448px, 92vw" priority focal={c.backgroundFocalPoint} className="size-full" failTone="background" />
          </div>
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        </>
      ) : null}
      <Rings className="hx-drift absolute -right-16 -bottom-20" />
      {/* The site's gold corner bracket */}
      <span aria-hidden className="absolute top-0 right-0 size-14 rounded-tr-[16px] border-t border-r border-[color:color-mix(in_oklab,var(--hx-gold)_60%,transparent)] @2xl:rounded-tr-[20px]" />
    </div>
  );
}

function AgentFrame() {
  const { bundle, isHidden } = useCard();
  const c = bundle.card;
  if (isHidden("agentPhoto")) return null;
  return (
    <div className="relative z-10 -mt-[84px] ml-3 w-[104px] overflow-hidden rounded-[14px] border-[3px] border-[var(--hx-gold)] bg-[var(--hx-panel)] shadow-[0_14px_30px_-10px_rgb(0_0_0/0.6)]" style={{ aspectRatio: "4 / 5" }}>
      {c.agentPhotoUrl ? (
        <div className="absolute inset-0" style={cropStyle(c.agentPhotoCrop)}>
          <CardImage src={c.agentPhotoUrl} alt={c.agentPhotoAlt || c.name} sizes="120px" priority className="size-full" failTone="background" />
        </div>
      ) : (
        <div role="img" aria-label={c.name} className="flex size-full items-center justify-center">
          <span aria-hidden className="card-display text-[2.1rem] leading-none text-[var(--hx-gold)]">
            {initials(c.name)}
          </span>
        </div>
      )}
    </div>
  );
}

function useBooking() {
  const { bundle } = useCard();
  const c = bundle.card;
  const href = useBookingHref();
  const label = c.bookingLabel?.trim() || VOICE.cta;
  // The default label comes with the default note; a custom label shows a note only if one is set.
  const note = c.bookingNote?.trim() || (c.bookingLabel?.trim() ? "" : VOICE.ctaNote);
  return { href, label, note };
}

function HeroActions() {
  const booking = useBooking();
  const { call, message, messageLabel, saveContact } = useContactActions();
  const L = useLabels();
  const ext = (h: string) => (h.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {});

  const outline = "cbtn hx-outline h-[52px] text-[15px]";
  const callBtn = call && (
    <a key="call" href={call} className={outline}>
      <Phone aria-hidden className="size-[18px]" strokeWidth={2} />
      {L.call}
    </a>
  );
  const messageBtn = message && (
    <a key="message" href={message} {...ext(message)} className={outline}>
      <MessageIcon className="size-[18px]" />
      {messageLabel}
    </a>
  );
  const saveBtn = (
    <button key="save" type="button" onClick={saveContact} className={cn(outline, "cursor-pointer")}>
      <UserPlus aria-hidden className="size-[18px]" strokeWidth={2} />
      {L.save}
    </button>
  );

  // Primary: booking, else Message, else Call, else Save.
  let primary: ReactNode;
  let rest: ReactNode[];
  if (booking.href) {
    primary = <Cta href={booking.href} label={booking.label} note={booking.note} />;
    rest = [callBtn, messageBtn].filter(Boolean);
  } else if (message) {
    primary = <Cta href={message} label={L.messageOn(messageLabel === "Message" ? "SMS" : messageLabel)} icon={<MessageIcon className="size-5" />} />;
    rest = [callBtn, saveBtn].filter(Boolean);
  } else if (call) {
    primary = <Cta href={call} label={L.call} icon={<Phone aria-hidden className="size-5" strokeWidth={2} />} />;
    rest = [saveBtn];
  } else {
    primary = (
      <button type="button" onClick={saveContact} className="cbtn cbtn-primary hx-cta h-[56px] w-full cursor-pointer text-base">
        <UserPlus aria-hidden className="size-5" strokeWidth={2} />
        {L.saveContact}
      </button>
    );
    rest = [];
  }

  return (
    <div className="flex flex-col gap-2.5">
      {primary}
      {rest.length > 0 && <div className={cn("grid gap-2.5", rest.length === 2 ? "grid-cols-2" : "grid-cols-1")}>{rest}</div>}
    </div>
  );
}

function Cta({ href, label, note, icon }: { href: string; label: string; note?: string; icon?: ReactNode }) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="cbtn cbtn-primary hx-cta group min-h-[60px] w-full justify-between gap-3 px-5 py-2.5 text-left"
    >
      <span className="flex min-w-0 items-center gap-3">
        {icon}
        <span className="flex min-w-0 flex-col">
          <span className="text-base leading-tight font-semibold tracking-[0.01em]">{label}</span>
          {note && <span className="mt-0.5 text-[13px] leading-tight font-normal">{note}</span>}
        </span>
      </span>
      <ArrowRight aria-hidden className="size-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1" strokeWidth={2.25} />
      {external && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}

/** Section label: the site's short gold rule before uppercase, widely tracked text. */
function Label({ children, aside, id }: HeadingProps) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 id={id} className="flex items-center gap-2.5 text-[12px] leading-none font-bold tracking-[0.2em] text-[var(--hx-label)] uppercase">
        <span aria-hidden className="h-px w-3.5 shrink-0 bg-[var(--hx-gold)]" />
        {children}
      </h2>
      {aside && <span className="shrink-0 text-[13px] text-[var(--hx-sheet-muted)] tabular-nums">{aside}</span>}
    </div>
  );
}

/** About: label, the first paragraph as a Playfair lead, then the bio. */
function About() {
  const { bundle } = useCard();
  const L = useLabels();
  const uid = useId();
  const text = bundle.card.description?.trim() ?? "";
  const [lead, ...restParas] = text.split(/\n{2,}/);
  const hasLead = restParas.length > 0 && lead.length <= 220;
  if (!hasLead) {
    return (
      <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-4">
        <Label tone="surface" id={`${uid}-h`}>
          {L.about}
        </Label>
        <AboutBlock tone="surface" className="[&>div]:text-[var(--hx-sheet-muted)] [&>div]:text-[15px]" />
      </section>
    );
  }
  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-4">
      <Label tone="surface" id={`${uid}-h`}>
        {L.about}
      </Label>
      <p className="font-[family-name:var(--c-font-accent)] text-[1.35rem] leading-[1.35] text-c-text [text-wrap:pretty]">{lead}</p>
      <Bio paragraphs={restParas} />
    </section>
  );
}

function Bio({ paragraphs }: { paragraphs: string[] }) {
  const L = useLabels();
  const uid = useId();
  const [open, setOpen] = useState(false);
  const long = paragraphs.join(" ").length > 280;
  return (
    <>
      <div id={`${uid}-bio`} className={cn("flex max-w-[56ch] flex-col gap-3 text-[15px] leading-[1.7] text-[var(--hx-sheet-muted)]", long && !open && "line-clamp-5")}>
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${uid}-bio`}
          onClick={() => setOpen((v) => !v)}
          className="-my-2 inline-flex h-11 cursor-pointer items-center self-start text-[15px] font-semibold text-c-text underline underline-offset-4"
        >
          {open ? L.showLess : L.readMore}
        </button>
      )}
    </>
  );
}

function Expertise({ chips }: { chips: string[] }) {
  const uid = useId();
  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-4">
      <Label tone="surface" id={`${uid}-h`}>
        Industries &amp; expertise
      </Label>
      {/* Plain text in a list: chips are not buttons. */}
      <ul className="hx-chips flex flex-wrap gap-2">
        {chips.map((s, i) => (
          <li
            key={s}
            style={{ "--i": i } as CSSProperties}
            className="inline-flex min-h-9 items-center rounded-full border border-[var(--hx-card-border)] bg-[var(--hx-card)] px-3.5 py-1 text-sm font-medium text-c-text"
          >
            {s}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ContactPanel() {
  const { bundle } = useCard();
  const { saveContact } = useContactActions();
  const L = useLabels();
  const uid = useId();
  const c = bundle.card;
  const site = bundle.socials.find((s) => s.visible && s.platform === "website");

  const rows = [
    c.email && { key: "email", icon: <Mail aria-hidden className="size-5" strokeWidth={1.75} />, label: L.email, value: c.email, href: `mailto:${c.email}` },
    c.phone && { key: "phone", icon: <Phone aria-hidden className="size-5" strokeWidth={1.75} />, label: L.phone, value: c.phone, href: `tel:${phoneDigits(c.phone)}` },
    site && { key: "web", icon: <Globe aria-hidden className="size-5" strokeWidth={1.75} />, label: L.web, value: site.label || displayHandle(site.url), href: site.url },
  ].filter(Boolean) as { key: string; icon: ReactNode; label: string; value: string; href: string }[];

  const row = "flex min-h-[64px] w-full items-center gap-3.5 px-4 py-2.5 text-left transition-colors hover:bg-c-surface-tint";
  const iconTile = "flex size-9 shrink-0 items-center justify-center rounded-[7px] bg-[color:color-mix(in_oklab,var(--hx-icon)_9%,var(--hx-card))] text-[var(--hx-icon)]";

  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-4">
      <Label tone="surface" id={`${uid}-h`}>
        {L.contactDetails}
      </Label>
      <ul className="flex flex-col divide-y divide-[var(--hx-card-border)] overflow-hidden rounded-[16px] border border-[var(--hx-card-border)] bg-[var(--hx-card)]">
        {rows.map((r) => (
          <li key={r.key}>
            <a href={r.href} target={r.key === "web" ? "_blank" : undefined} rel={r.key === "web" ? "noreferrer" : undefined} className={row}>
              <span className={iconTile}>{r.icon}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[12px] font-medium text-[var(--hx-sheet-muted)]">{r.label}</span>
                <span className={cn("text-[15px] font-medium text-c-text [overflow-wrap:anywhere]", r.key === "phone" && "tabular-nums")}>{r.value}</span>
              </span>
              <ChevronRight aria-hidden className="size-4 shrink-0 text-[var(--hx-sheet-muted)]" />
            </a>
          </li>
        ))}
        <li>
          <button type="button" onClick={saveContact} className={cn(row, "cursor-pointer")}>
            <span className={iconTile}>
              <UserPlus aria-hidden className="size-5" strokeWidth={1.75} />
            </span>
            <span className="flex-1 text-[15px] font-semibold text-c-text">{L.saveToContacts}</span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-[var(--hx-sheet-muted)]" />
          </button>
        </li>
      </ul>
    </section>
  );
}

function Socials() {
  const { bundle } = useCard();
  const L = useLabels();
  const uid = useId();
  // The website is a row in Contact, so it isn't repeated here.
  const links = bundle.socials.filter((s) => s.visible && s.platform !== "website");
  if (!links.length) return null;
  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-4">
      <Label tone="surface" id={`${uid}-h`}>
        {L.socialProfiles}
      </Label>
      <nav aria-labelledby={`${uid}-h`} className="flex flex-wrap gap-2.5">
        {links.map((s) => {
          const name = s.label || getPlatform(s.platform).label;
          return (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              aria-label={name}
              title={name}
              className="hx-social inline-flex size-12 items-center justify-center rounded-[8px] bg-[var(--hx-social)] text-white transition-transform hover:-translate-y-0.5"
            >
              <BrandIcon platform={s.platform} />
            </a>
          );
        })}
      </nav>
    </section>
  );
}

/**
 * Sticky bottom bar once the hero actions scroll away: Book a call (2fr, red),
 * Call (1fr, black), Text (1fr, outline). Without a booking link: Call + Message.
 */
function BottomBar({ watch }: { watch: React.RefObject<HTMLElement | null> }) {
  const { call, message, messageLabel, channel } = useContactActions();
  const booking = useBooking();
  const L = useLabels();
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

  const textLabel = channel === "sms" ? "Text" : messageLabel;
  const ext = (h: string) => (h.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {});
  const items = [
    booking.href && { key: "book", href: booking.href, cls: "cbtn cbtn-primary hx-cta", label: "Book a call", icon: null, span: "2fr" },
    call && { key: "call", href: call, cls: "cbtn hx-bar-dark", label: L.call, icon: <Phone aria-hidden className="size-[18px]" strokeWidth={2} />, span: "1fr" },
    message && { key: "msg", href: message, cls: "cbtn hx-bar-outline", label: booking.href ? textLabel : messageLabel, icon: booking.href ? null : <MessageIcon className="size-[18px]" />, span: "1fr" },
  ].filter(Boolean) as { key: string; href: string; cls: string; label: string; icon: ReactNode; span: string }[];
  if (!items.length) return null;

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "sticky bottom-0 z-40 -mt-[84px] h-[84px] transition-[transform,opacity] duration-300 [transition-timing-function:var(--ease-out-expo)] @4xl:hidden",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <div
        className="hx-bar mx-auto grid h-full max-w-[480px] gap-2 border-t border-[var(--hx-card-border)] bg-c-surface px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(0_0_0/0.16)]"
        style={{ gridTemplateColumns: items.map((i) => i.span).join(" ") }}
      >
        {items.map((i) => (
          <a key={i.key} href={i.href} {...ext(i.href)} className={cn(i.cls, "min-w-0 px-2 text-[15px]")}>
            {i.icon}
            <span className="truncate">{i.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
