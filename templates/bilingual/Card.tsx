"use client";

import { useRef, useState, type CSSProperties } from "react";
import { visibleSections } from "@/lib/design/sections";
import type { ReorderableSection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PrimaryActions, ShareButton, StickyActionBar } from "@/components/card/actions";
import { EN, FIL, LabelsProvider, useLabels, type CardLabels } from "@/components/card/labels";
import { AgentPhoto, CardImage, Logo, NameText } from "@/components/card/primitives";
import {
  AboutBlock,
  CardFooter,
  ContactList,
  MapBlock,
  OrgChartBlock,
  PhotoAlbum,
  QuoteBlock,
  SectionStyle,
  SocialLinks,
  type HeadingProps,
} from "@/components/card/sections";
import type { TemplateProps } from "../types";

type Lang = "en" | "fil";

/** Label text → the same label in the other language, for the quiet second line under each heading. */
function otherLanguage(text: unknown, lang: Lang): string | null {
  if (typeof text !== "string") return null;
  const from: CardLabels = lang === "en" ? EN : FIL;
  const to: CardLabels = lang === "en" ? FIL : EN;
  const key = (Object.keys(from) as (keyof CardLabels)[]).find((k) => typeof from[k] === "string" && from[k] === text);
  if (!key || key === "lang") return null;
  const other = to[key];
  return typeof other === "string" && other !== text ? other : null;
}

/** Heading in the visitor's language, with the other language set quietly beneath. */
function BiHeading({ children, aside, id }: HeadingProps) {
  const L = useLabels();
  const other = otherLanguage(children, L.lang);
  return (
    <div className="flex items-end justify-between gap-4 border-b-2 border-c-on-bg pb-2">
      <div className="flex min-w-0 flex-col">
        <h2 id={id} className="card-display text-[1.6rem] leading-tight">
          {children}
        </h2>
        {other && (
          <span lang={L.lang === "en" ? "fil" : "en"} className="text-sm italic text-c-on-bg-muted">
            {other}
          </span>
        )}
      </div>
      {aside && <span className="shrink-0 pb-0.5 text-sm tabular-nums text-c-on-bg-muted">{aside}</span>}
    </div>
  );
}

const STYLE = {
  renderHeading: (p: HeadingProps) => <BiHeading {...p} />,
  quote: "text-[clamp(1.5rem,6.6cqi,2.15rem)] leading-[1.25] [text-wrap:pretty]",
};

function LanguageToggle({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div role="group" aria-label={lang === "en" ? "Language" : "Wika"} className="flex rounded-[var(--c-btn-radius)] border-2 border-c-on-bg p-[3px]">
      {(
        [
          ["en", "EN", "English"],
          ["fil", "FIL", "Filipino"],
        ] as const
      ).map(([value, short, full]) => (
        <button
          key={value}
          type="button"
          lang={value}
          aria-pressed={lang === value}
          aria-label={full}
          onClick={() => onChange(value)}
          className={cn(
            "inline-flex h-11 min-w-12 cursor-pointer items-center justify-center rounded-[max(0px,calc(var(--c-btn-radius)-3px))] px-2.5 text-sm font-bold tracking-[0.06em] transition-colors",
            lang === value ? "bg-c-on-bg text-c-bg" : "text-c-on-bg hover:bg-c-bg-tint",
          )}
        >
          {short}
        </button>
      ))}
    </div>
  );
}

/**
 * O — Bilingual. Every word the card prints switches between English and
 * Filipino with a toggle in the header; headings carry both. A color rail runs
 * down the left edge on phones and widens into the identity column on desktop.
 */
export default function BilingualCard(props: TemplateProps) {
  const [lang, setLang] = useState<Lang>("en");
  return (
    <LabelsProvider lang={lang}>
      <BilingualLayout {...props} lang={lang} setLang={setLang} />
    </LabelsProvider>
  );
}

function BilingualLayout({ bundle, tokens, mode, lang, setLang }: TemplateProps & { lang: Lang; setLang: (l: Lang) => void }) {
  const H1 = mode === "public" ? "h1" : "p";
  const { card } = bundle;
  const L = useLabels();
  const actionsRef = useRef<HTMLDivElement>(null);
  const sections = visibleSections(bundle);
  const cover = card.backgroundPhotoUrl && !card.hiddenSections.includes("backgroundPhoto") ? card.backgroundPhotoUrl : null;

  // On desktop the identity column turns into the primary band; its children read band colors as their ground.
  const band = {
    "--band-bg": tokens.primary,
    "--band-fg": tokens.onPrimary,
  } as CSSProperties;
  const bandVars =
    "@4xl:[--c-bg:var(--band-bg)] @4xl:[--c-on-bg:var(--band-fg)] @4xl:[--c-on-bg-muted:color-mix(in_oklab,var(--band-fg)_82%,var(--band-bg))] @4xl:[--c-bg-line:color-mix(in_oklab,var(--band-fg)_35%,var(--band-bg))] @4xl:[--c-bg-tint:color-mix(in_oklab,var(--band-fg)_12%,var(--band-bg))] @4xl:[--c-primary:var(--band-fg)] @4xl:[--c-on-primary:var(--band-bg)]";

  const render: Record<ReorderableSection, () => React.ReactNode> = {
    quote: () => (
      <figure className="m-0 flex flex-col gap-3">
        <QuoteBlock tone="background" />
        <figcaption className="text-sm text-c-on-bg-muted">— {card.name}</figcaption>
      </figure>
    ),
    about: () => <AboutBlock tone="background" heading />,
    contact: () => (
      <section className="flex flex-col gap-3">
        <BiHeading tone="background">{L.contactDetails}</BiHeading>
        <ContactList tone="background" variant="rows" />
      </section>
    ),
    socials: () => (
      <section className="flex flex-col gap-3">
        <BiHeading tone="background">{L.socialProfiles}</BiHeading>
        <SocialLinks tone="background" variant="rows" />
      </section>
    ),
    photos: () => <PhotoAlbum tone="background" layout="grid" />,
    map: () => <MapBlock tone="background" title={L.office} />,
    orgChart: () => <OrgChartBlock tone="background" />,
  };

  return (
    <SectionStyle.Provider value={STYLE}>
      <div lang={lang === "fil" ? "fil" : "en"} className="relative min-h-[var(--c-vh)] @4xl:grid @4xl:grid-cols-[minmax(340px,400px)_minmax(0,1fr)]">
        {/* Phone rail */}
        <span aria-hidden className="absolute inset-y-0 left-0 w-2.5 bg-c-primary @4xl:hidden" />

        <div style={band} className={cn("relative pl-2.5 @4xl:bg-[var(--band-bg)] @4xl:pl-0 @4xl:text-[var(--band-fg)]", bandVars)}>
          <div className="flex flex-col @4xl:sticky @4xl:top-0 @4xl:min-h-[var(--c-vh)] @4xl:px-9 @4xl:pt-8 @4xl:pb-10">
            <header className="flex items-center justify-between gap-3 px-4 pt-4 @4xl:px-0 @4xl:pt-0">
              <span className="min-w-0 @4xl:hidden">
                <Logo on={tokens.background} className="text-c-on-bg" />
              </span>
              <span className="hidden min-w-0 @4xl:block">
                <Logo on={tokens.primary} className="text-c-on-bg" />
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <LanguageToggle lang={lang} onChange={setLang} />
                <ShareButton className="border-2 border-c-on-bg text-c-on-bg hover:bg-c-bg-tint" />
              </div>
            </header>

            <div className="px-4 pt-8 @4xl:mt-auto @4xl:px-0 @4xl:pt-12">
              <AgentPhoto shape="rounded-square" sizes="160px" priority tone="background" className="w-[34cqi] max-w-[150px] @4xl:w-[150px]" />
              <H1 className="card-display mt-5 text-[clamp(2rem,10cqi,3.1rem)] leading-[1.02] [overflow-wrap:anywhere] [text-wrap:balance] @4xl:text-[3.25rem]">
                <NameText name={card.name} />
              </H1>
              {card.title && <p className="mt-2 text-[17px] leading-snug font-semibold">{card.title}</p>}
              {card.company && <p className="text-[15px] leading-snug text-c-on-bg-muted">{card.company}</p>}
              {card.credential && <p className="mt-1 text-sm tabular-nums text-c-on-bg-muted">{card.credential}</p>}
            </div>

            <div ref={actionsRef} className="px-4 pt-7 @4xl:px-0">
              <PrimaryActions layout="pair" />
            </div>
          </div>
        </div>

        <main className="flex flex-col gap-12 pt-10 pr-5 pb-28 pl-[34px] @4xl:mx-auto @4xl:w-full @4xl:max-w-[720px] @4xl:px-12 @4xl:pt-10 @4xl:pb-16">
          {cover && (
            <figure className="m-0">
              <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--c-btn-radius)] @4xl:aspect-[21/9]">
                <CardImage src={cover} alt={card.backgroundPhotoAlt || ""} sizes="(min-width: 1024px) 720px, 100vw" priority focal={card.backgroundFocalPoint} className="size-full" failTone="background" />
              </div>
            </figure>
          )}
          {sections.map((key) => (
            <div key={key}>{render[key]()}</div>
          ))}
          <CardFooter tone="background" className="pt-2" />
        </main>

        <StickyActionBar watch={actionsRef} />
      </div>
    </SectionStyle.Provider>
  );
}
