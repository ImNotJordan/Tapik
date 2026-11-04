"use client";

import { useRef, type CSSProperties } from "react";
import { visibleSections } from "@/lib/design/sections";
import type { ReorderableSection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { cropStyle } from "@/components/ui/image-tools";
import { ShareButton, StickyActionBar } from "@/components/card/actions";
import { useLabels } from "@/components/card/labels";
import { CardImage, Logo, Monogram } from "@/components/card/primitives";
import { AboutBlock, CardFooter, ContactList, MapBlock, PhotoAlbum, QuoteBlock, SectionStyle } from "@/components/card/sections";
import type { TemplateProps } from "../types";
import { LedgerActions, LedgerHeading, LedgerSocials, LedgerTeam } from "./sections/ledger";

/** Given names on the first line, the surname in italic on the second. */
function splitName(name: string): [string, string] {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return ["", words[0]];
  return [words.slice(0, -1).join(" "), words[words.length - 1]];
}

/**
 * D — Noir Ledger. A tall black-and-white portrait with the name set large in
 * a serif, its second line italic, fading into the ground. Actions are ruled
 * ledger rows; every section is a numbered entry.
 */
export default function NoirLedgerCard({ bundle, tokens, mode }: TemplateProps) {
  const H1 = mode === "public" ? "h1" : "p";
  const { card } = bundle;
  const L = useLabels();
  const actionsRef = useRef<HTMLDivElement>(null);
  const sections = visibleSections(bundle);
  const hidden = (k: string) => card.hiddenSections.includes(k as ReorderableSection);

  const agent = !hidden("agentPhoto") && card.agentPhotoUrl ? card.agentPhotoUrl : undefined;
  const ground = !hidden("backgroundPhoto") && card.backgroundPhotoUrl ? card.backgroundPhotoUrl : undefined;
  const portrait = agent ?? ground;

  const [given, surname] = splitName(card.name);
  // Size from the longest unbreakable word so a long surname never overflows; the cap is the catalog's 64px.
  const longest = Math.max(...card.name.split(/\s+/).map((w) => w.length), 1);
  const nameVars = {
    "--nm-fit": `${(90 / (longest * 0.46)).toFixed(2)}cqi`,
    "--nm-fit-d": `${(36 / (longest * 0.46)).toFixed(2)}cqi`,
  } as CSSProperties;

  const render = (key: ReorderableSection, n: number): React.ReactNode => {
    switch (key) {
      case "quote":
        return (
          <section aria-label={L.quote} className="flex flex-col gap-5">
            <LedgerHeading n={n} tone="background">
              {L.quote}
            </LedgerHeading>
            <QuoteBlock tone="background" />
          </section>
        );
      case "about":
        return <AboutBlock tone="background" heading />;
      case "contact":
        return (
          <section aria-label={L.contactDetails} className="flex flex-col gap-3">
            <LedgerHeading n={n} tone="background">
              {L.contactDetails}
            </LedgerHeading>
            <ContactList tone="background" variant="rows" className="[&>div:first-child]:border-t-0" />
          </section>
        );
      case "socials":
        return <LedgerSocials n={n} />;
      case "photos":
        return <PhotoAlbum tone="background" layout="grid" className="[&_button]:!rounded-none" />;
      case "map":
        return <MapBlock tone="background" mapClassName="!rounded-none grayscale" />;
      case "orgChart":
        return <LedgerTeam n={n} />;
    }
  };

  return (
    <div className="relative min-h-[var(--c-vh)] @4xl:grid @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Portrait and name. On desktop this column stays put while the ledger scrolls. */}
      <div className="relative @4xl:sticky @4xl:top-0 @4xl:h-[var(--c-vh)] @4xl:overflow-hidden">
        <div className="relative h-[420px] overflow-hidden @4xl:h-full">
          {portrait ? (
            <div className="motion-photo-settle absolute inset-0 grayscale contrast-[1.08]" style={agent ? cropStyle(card.agentPhotoCrop) : undefined}>
              <CardImage
                src={portrait}
                alt={agent ? card.agentPhotoAlt || card.name : card.backgroundPhotoAlt || ""}
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority
                focal={agent ? undefined : card.backgroundFocalPoint}
                className="size-full"
                failTone="background"
              />
            </div>
          ) : (
            !hidden("agentPhoto") && <Monogram name={card.name} tone="background" className="absolute inset-0 !text-c-on-bg-muted" />
          )}
          {/* Fade into the ground from the bottom; a lighter scrim at the top keeps the logo legible. */}
          <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, color-mix(in oklab, var(--c-bg) 62%, transparent) 0%, transparent 24%, transparent 32%, color-mix(in oklab, var(--c-bg) 72%, transparent) 62%, var(--c-bg) 92%)" }} />
        </div>

        <header className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-5 pt-4 @4xl:px-12 @4xl:pt-10">
          <Logo on={tokens.background} className="text-c-on-bg" />
          <ShareButton className="border border-c-bg-line text-c-on-bg hover:bg-c-bg-tint" />
        </header>

        <div className="relative -mt-[150px] px-5 @4xl:absolute @4xl:inset-x-0 @4xl:bottom-0 @4xl:mt-0 @4xl:px-12 @4xl:pb-12">
          <H1
            style={nameVars}
            className="motion-name-rise card-display flex flex-col leading-[0.94] [font-size:min(var(--nm-fit),16.4cqi,4rem)] @4xl:[font-size:min(var(--nm-fit-d),6.5cqi,6rem)]"
          >
            {given && <span className="block">{given}</span>}
            <span className="block italic">{surname}</span>
          </H1>
          {(card.title || card.company) && (
            <p className="mt-4 text-[15px] leading-snug text-c-on-bg">
              {card.title}
              {card.title && card.company && <span className="text-c-on-bg-muted"> · </span>}
              {card.company && <span className="text-c-on-bg-muted">{card.company}</span>}
            </p>
          )}
          {card.credential && <p className="mt-1.5 text-[12px] tracking-[0.08em] text-c-on-bg-muted uppercase [font-family:var(--c-font-mono)]">{card.credential}</p>}
        </div>
      </div>

      <div className="@4xl:px-14 @4xl:pt-16 @4xl:pb-12">
        <div className="@4xl:max-w-[620px]">
          <div ref={actionsRef} className="px-5 pt-8 @4xl:px-0 @4xl:pt-0">
            <LedgerActions />
          </div>

          <main className="flex flex-col gap-14 px-5 pt-14 pb-28 @4xl:px-0 @4xl:pb-0">
            {sections.map((key, i) => (
              <SectionStyle.Provider
                key={key}
                value={{
                  quote: "text-[clamp(1.85rem,8.4cqi,2.6rem)] leading-[1.12] italic @4xl:text-[2.4rem]",
                  renderHeading: (p) => <LedgerHeading n={i + 1} {...p} />,
                }}
              >
                <div>{render(key, i + 1)}</div>
              </SectionStyle.Provider>
            ))}
            <CardFooter tone="background" className={cn("border-t border-c-bg-line pt-4 [font-family:var(--c-font-mono)] !text-[12px] uppercase tracking-[0.12em]")} />
          </main>
        </div>
      </div>

      <StickyActionBar watch={actionsRef} />
    </div>
  );
}
