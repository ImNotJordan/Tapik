"use client";

import { useRef, type CSSProperties } from "react";
import { visibleSections } from "@/lib/design/sections";
import type { ReorderableSection } from "@/lib/types";
import { PrimaryActions, ShareButton, StickyActionBar } from "@/components/card/actions";
import { useLabels } from "@/components/card/labels";
import { Logo } from "@/components/card/primitives";
import { AboutBlock, CardFooter, MapBlock, PhotoAlbum, SectionStyle } from "@/components/card/sections";
import type { TemplateProps } from "../types";
import { FirmMembers, FolioContacts, FolioPortrait, FolioQuote, LetterHeading, Seal } from "./sections/letterhead";

const HONORIFIC = /^(atty|dr|engr|arch|hon|fr|rev)\.?$/i;

/** "Atty. Gabriel Aquino-Reyes" → ["Atty. Gabriel", "Aquino-Reyes"]. */
function splitName(name: string): [string, string] {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return ["", words[0]];
  if (words.length === 2 && HONORIFIC.test(words[0])) return [words[0], words[1]];
  return [words.slice(0, -1).join(" "), words[words.length - 1]];
}

/**
 * I — Folio. Set like a firm's letterhead: a monogram seal, a serif name with
 * an italic surname, a ruled definition list for contacts and firm members as
 * ruled rows. No cover photo. On desktop it becomes a sheet of paper with
 * section labels hung in the left margin.
 */
export default function FolioCard({ bundle, tokens, mode }: TemplateProps) {
  const H1 = mode === "public" ? "h1" : "p";
  const { card } = bundle;
  const L = useLabels();
  const actionsRef = useRef<HTMLDivElement>(null);
  const sections = visibleSections(bundle);
  const [given, surname] = splitName(card.name);
  const longest = Math.max(...card.name.split(/\s+/).map((w) => w.length), 1);
  const nameVars = { "--nm-fit": `${(88 / (longest * 0.48)).toFixed(2)}cqi` } as CSSProperties;
  // The small portrait sits beside the quote; without a quote it moves up beside the name.
  const photoWithQuote = sections.includes("quote");
  const contactShowsLinks = sections.includes("contact");

  const render: Record<ReorderableSection, () => React.ReactNode> = {
    quote: () => <FolioQuote title={L.quote} />,
    about: () => (
      <div className="relative">
        <AboutBlock tone="background" heading />
      </div>
    ),
    contact: () => <FolioContacts title={L.contactDetails} />,
    // When the contact list is shown it already carries Web and Social rows.
    socials: () => (contactShowsLinks ? null : <FolioContacts title={L.socialProfiles} withPhone={false} />),
    photos: () => (
      <div className="relative">
        <PhotoAlbum tone="background" layout="grid" className="[&_button]:!rounded-none" />
      </div>
    ),
    map: () => (
      <div className="relative">
        <MapBlock tone="background" mapClassName="!rounded-none grayscale" />
      </div>
    ),
    orgChart: () => <FirmMembers />,
  };

  return (
    <SectionStyle.Provider value={{ renderHeading: (p) => <LetterHeading {...p} /> }}>
      <div className="relative min-h-[var(--c-vh)] @4xl:bg-c-surface @4xl:px-10 @4xl:py-14">
        <article className="@4xl:mx-auto @4xl:max-w-[960px] @4xl:border @4xl:border-c-line @4xl:bg-c-bg @4xl:px-16 @4xl:pt-12 @4xl:pb-14">
          {/* Letterhead */}
          <header className="flex items-center gap-3.5 px-5 pt-5 @4xl:px-0 @4xl:pt-0">
            <Seal text={card.company || card.name} className="@4xl:size-16" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Logo on={tokens.background} className="line-clamp-2 !text-[15px] !leading-tight !whitespace-normal text-c-on-bg" />
              {card.address && <p className="truncate text-[13px] text-c-on-bg-muted">{card.address.split(",").slice(-2).join(",").trim()}</p>}
            </div>
            <ShareButton className="border border-c-bg-line text-c-on-bg hover:bg-c-bg-tint" />
          </header>
          <div aria-hidden className="mx-5 mt-5 border-t-2 border-c-on-bg @4xl:mx-0" />
          <div aria-hidden className="mx-5 mt-[3px] border-t border-c-on-bg @4xl:mx-0" />

          {/* Addressee: name, title, credential, actions */}
          <div className="px-5 pt-9 @4xl:grid @4xl:grid-cols-[minmax(0,1fr)_300px] @4xl:items-end @4xl:gap-12 @4xl:px-0 @4xl:pt-12">
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <H1 style={nameVars} className="card-display leading-[1.02] text-c-on-bg [font-size:min(var(--nm-fit),11.5cqi,3.4rem)] @4xl:[font-size:min(var(--nm-fit),5.6cqi,4.4rem)]">
                  {given && <>{given} </>}
                  <em className="italic">{surname}</em>
                </H1>
                {(card.title || card.company) && (
                  <p className="mt-3 text-[16px] leading-snug text-c-on-bg">
                    {card.title}
                    {card.title && card.company && ", "}
                    {card.company && <span className="text-c-on-bg-muted">{card.company}</span>}
                  </p>
                )}
                {card.credential && <p className="mt-2 text-[12px] tracking-[0.14em] text-c-on-bg-muted uppercase tabular-nums">{card.credential}</p>}
              </div>
              {!photoWithQuote && <FolioPortrait className="mt-1 w-[72px] @4xl:w-[96px]" />}
            </div>
            <div ref={actionsRef} className="pt-7 @4xl:pt-0">
              <PrimaryActions layout="pair" />
            </div>
          </div>

          <main className="flex flex-col gap-12 px-5 pt-14 pb-28 @4xl:pt-16 @4xl:pr-0 @4xl:pb-0 @4xl:pl-[200px]">
            {sections.map((key) => {
              const node = render[key]();
              return node ? <div key={key}>{node}</div> : null;
            })}
            <div className="relative border-t border-c-bg-line pt-4">
              <CardFooter tone="background" className="!text-[12px] tracking-[0.08em]" />
            </div>
          </main>
        </article>

        <StickyActionBar watch={actionsRef} />
      </div>
    </SectionStyle.Provider>
  );
}
