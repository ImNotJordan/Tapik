"use client";

import { Mail, Phone, UserPlus } from "lucide-react";
import { useRef } from "react";
import { visibleSections } from "@/lib/design/sections";
import type { ReorderableSection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { cropStyle } from "@/components/ui/image-tools";
import { MessageIcon, ShareButton, StickyActionBar, useContactActions } from "@/components/card/actions";
import { FitLine } from "@/components/card/fit-line";
import { useLabels } from "@/components/card/labels";
import { CardImage, Logo } from "@/components/card/primitives";
import { AboutBlock, CardFooter, ContactList, MapBlock, OrgChartBlock, PhotoAlbum, QuoteBlock, SectionStyle, SocialLinks } from "@/components/card/sections";
import type { TemplateProps } from "../types";

/* Sections that sit on the dark band (surface). */
const BAND: ReorderableSection[] = ["photos", "map", "orgChart"];

/** Split a name into a wide first line and a narrow last line. */
function splitName(name: string): [string, string] {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return [words[0], ""];
  return [words.slice(0, -1).join(" "), words[words.length - 1]];
}

const STYLE = {
  heading: "text-[clamp(3rem,15cqi,5.5rem)] leading-[0.88] [font-stretch:118%] [font-weight:900]",
  quote: "text-[clamp(1.9rem,9cqi,3.25rem)] leading-[1.02] italic [font-stretch:72%] [font-weight:800]",
};

/**
 * B — Landmark: the name set so large it becomes the page's architecture, in a
 * wide cut over a condensed cut of the same family, on a full field of color.
 */
export default function LandmarkCard({ bundle, tokens, mode }: TemplateProps) {
  const H1 = mode === "public" ? "h1" : "p";
  const { card } = bundle;
  const L = useLabels();
  const { call, message, messageLabel, saveContact } = useContactActions();
  const actionsRef = useRef<HTMLDivElement>(null);
  const sections = visibleSections(bundle);
  const [first, last] = splitName(card.name);
  const isArchivo = card.fontPairingId === "landmark";
  // First-paint estimate per line (wide and narrow cuts differ); FitLine then measures and shrinks to fit.
  const fit = (text: string, perChar: number, max: number) => `min(${max}cqi, ${(90 / Math.max(text.length * perChar, 1)).toFixed(2)}cqi)`;
  const size1 = fit(first, isArchivo ? 0.82 : 0.55, 21);
  const size2 = fit(last, isArchivo ? 0.46 : 0.55, 21);
  const hidden = (k: string) => card.hiddenSections.includes(k as ReorderableSection);

  const portrait = !hidden("agentPhoto") && card.agentPhotoUrl ? card.agentPhotoUrl : !hidden("backgroundPhoto") ? card.backgroundPhotoUrl : undefined;
  const portraitIsAgent = portrait === card.agentPhotoUrl;

  const render: Record<ReorderableSection, () => React.ReactNode> = {
    quote: () => <QuoteBlock tone="background" />,
    about: () => <AboutBlock tone="background" />,
    contact: () => <ContactList tone="background" variant="large" />,
    socials: () => <SocialLinks tone="background" variant="chips" />,
    photos: () => <PhotoAlbum tone="surface" layout="carousel" />,
    map: () => <MapBlock tone="surface" />,
    orgChart: () => <OrgChartBlock tone="surface" />,
  };

  // Group consecutive band sections so they share one dark field.
  const groups: { band: boolean; keys: ReorderableSection[] }[] = [];
  sections.forEach((k) => {
    const band = BAND.includes(k);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.band === band) lastGroup.keys.push(k);
    else groups.push({ band, keys: [k] });
  });

  const bigBtn = "cbtn h-16 justify-between px-6";

  return (
    <SectionStyle.Provider value={STYLE}>
      <div className="relative min-h-[var(--c-vh)]">
        <header className="flex items-center justify-between gap-3 px-4 pt-4 @4xl:px-10 @4xl:pt-8">
          <Logo on={tokens.background} className="text-c-on-bg" />
          <ShareButton className="border-2 border-c-on-bg text-c-on-bg hover:bg-c-bg-tint" />
        </header>

        <H1 className="motion-name-rise card-display mt-8 flex flex-col overflow-hidden px-[3.5cqi] leading-[0.86] @4xl:mt-12 @4xl:px-10">
          <FitLine max={size1} style={{ fontStretch: "118%", fontWeight: isArchivo ? 900 : undefined }}>
            {first}
          </FitLine>
          {last && (
            <FitLine max={size2} style={{ fontStretch: "64%", fontWeight: isArchivo ? 800 : undefined }}>
              {last}
            </FitLine>
          )}
        </H1>

        <div className="@4xl:grid @4xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] @4xl:items-start @4xl:gap-14 @4xl:px-10 @4xl:pt-10 @4xl:pb-16">
          <div className="flex flex-col @4xl:sticky @4xl:top-8">
            {(card.title || card.company) && (
              <p className="mx-4 mt-5 max-w-[34ch] text-[17px] leading-snug font-medium @4xl:mx-0 @4xl:mt-0">
                {[card.title, card.company].filter(Boolean).join(", ")}
              </p>
            )}

            {portrait && (
              <div className="relative order-2 mt-7 aspect-[4/5] max-h-[min(78cqi,560px)] w-full overflow-hidden bg-c-bg-tint @4xl:order-3 @4xl:max-h-[420px] @4xl:rounded-[20px]">
                <div className="absolute inset-0" style={portraitIsAgent ? cropStyle(card.agentPhotoCrop) : undefined}>
                  <CardImage
                    src={portrait}
                    alt={portraitIsAgent ? card.agentPhotoAlt || card.name : card.backgroundPhotoAlt || ""}
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    priority
                    focal={portraitIsAgent ? undefined : card.backgroundFocalPoint}
                    className="size-full"
                    failTone="background"
                  />
                </div>
              </div>
            )}

            <div ref={actionsRef} className="order-3 flex flex-col gap-2.5 px-4 pt-5 @4xl:order-2 @4xl:px-0 @4xl:pt-6">
              {call && (
                <a href={call} className={cn(bigBtn, "cbtn-primary")}>
                  <span className="card-display text-[1.3rem] [letter-spacing:-0.01em]">
                    {L.lang === "en" ? `Call ${first.split(" ")[0]}` : L.call}
                  </span>
                  <Phone aria-hidden className="size-[22px]" strokeWidth={2.25} />
                </a>
              )}
              {message && (
                <a href={message} target={message.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={cn(bigBtn, "cbtn-secondary border-2")} style={{ borderColor: "var(--c-on-bg)" }}>
                  <span className="card-display text-[1.3rem] [letter-spacing:-0.01em]">{L.messageOn(messageLabel === "Message" ? "SMS" : messageLabel)}</span>
                  <MessageIcon className="size-[22px]" />
                </a>
              )}
              {/* Save + Email as quiet links: the two big buttons stay the loudest things here. */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button type="button" onClick={saveContact} className="inline-flex h-11 cursor-pointer items-center gap-2 text-[15px] font-bold underline decoration-2 underline-offset-4">
                  <UserPlus aria-hidden className="size-[18px]" strokeWidth={2.25} />
                  {L.saveContact}
                </button>
                {card.email && (
                  <a href={`mailto:${card.email}`} className="inline-flex h-11 items-center gap-2 text-[15px] font-bold underline decoration-2 underline-offset-4">
                    <Mail aria-hidden className="size-[18px]" strokeWidth={2.25} />
                    {L.email}
                  </a>
                )}
              </div>
            </div>
          </div>

          <main className="flex flex-col pt-10 pb-28 @4xl:pt-0 @4xl:pb-0">
            {groups.map((g, gi) =>
              g.band ? (
                <div key={gi} className="my-4 flex flex-col gap-12 bg-c-surface px-4 py-10 text-c-text @4xl:rounded-[24px] @4xl:px-8">
                  {g.keys.map((k) => (
                    <div key={k}>{render[k]()}</div>
                  ))}
                </div>
              ) : (
                <div key={gi} className="flex flex-col gap-10 px-4 py-6 @4xl:px-0">
                  {g.keys.map((k) => (
                    <div key={k}>{render[k]()}</div>
                  ))}
                </div>
              ),
            )}
            <CardFooter tone="background" className="px-4 pt-6 @4xl:px-0" />
          </main>
        </div>

        <StickyActionBar watch={actionsRef} />
      </div>
    </SectionStyle.Provider>
  );
}
