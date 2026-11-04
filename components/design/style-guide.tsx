"use client";

import { BRAND, brandUrl } from "@/lib/brand";
import { TapikLogo } from "@/components/brand/tapik-logo";
import { Bell, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { FONT_PAIRINGS, getFontPairing } from "@/lib/design/fonts";
import { lookFor, TEMPLATES } from "@/templates/registry";
import { contrastRatio, formatRatio } from "@/lib/design/contrast";
import { bundleFromDB, createSeedDB } from "@/lib/mock";
import { PHOTO_CREDITS } from "@/lib/mock/credits";
import type { CardBundle } from "@/lib/types";
import { Button, IconButton, LinkButton } from "@/components/ui/button";
import { Badge, Segmented, Skeleton, Slider, StatusBadge, Toggle } from "@/components/ui/controls";
import { ColorPicker } from "@/components/ui/color-picker";
import { DevicePreview } from "@/components/ui/device-preview";
import { Dialog, Sheet } from "@/components/ui/dialog";
import { Dropzone, type UploadItem } from "@/components/ui/dropzone";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FontPicker } from "@/components/ui/font-picker";
import { ImageCropper } from "@/components/ui/image-tools";
import { QrPreview } from "@/components/ui/qr-preview";
import { SortableList } from "@/components/ui/sortable-list";
import { Tabs } from "@/components/ui/tabs";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { CardRenderer } from "@/components/card/card-renderer";
import { TemplateThumbnail } from "@/components/templates/template-thumbnail";
import { PortalGuide } from "./portal-guide";

const STUDIO_COLORS = [
  ["--studio-bg", "Page background"],
  ["--studio-surface", "Panels, inputs"],
  ["--studio-sunken", "Preview canvas"],
  ["--studio-raised", "Hover, segmented track"],
  ["--studio-line", "Borders"],
  ["--studio-line-strong", "Input borders"],
  ["--studio-ink", "Primary text"],
  ["--studio-ink-2", "Secondary text"],
  ["--studio-ink-3", "Hints, captions"],
  ["--studio-action", "Primary actions, focus"],
  ["--studio-action-soft", "Selected states"],
  ["--studio-danger", "Destructive, errors"],
  ["--studio-warn-soft", "Draft, warnings"],
  ["--studio-success", "Published, passed"],
] as const;

const CARD_TOKENS = [
  ["--c-bg / --c-on-bg", "Page ground and the text on it"],
  ["--c-surface / --c-text", "Sheets, tiles and their text"],
  ["--c-primary / --c-on-primary", "Main Call and Message buttons"],
  ["--c-accent", "Pins, the NFC mark, small highlights"],
  ["--c-*-muted, --c-line, --c-*-tint", "Derived with color-mix() from the pairs above"],
  ["--c-font-display / --c-font-body", "From the font pairing"],
  ["--c-btn-radius", "From the button shape: pill, rounded, square"],
  ["--c-overlay", "Background photo overlay darkness"],
  ["--c-vh", "One screen of height (frame height in previews)"],
] as const;

const TYPE = [
  ["2xl", "29px / 1.15", "Page titles"],
  ["xl", "24px / 1.25", "Dialog and empty-state titles"],
  ["lg", "20px / 1.3", "Panel titles"],
  ["base", "16px / 1.5", "Section titles, body copy"],
  ["sm", "14px / 1.45", "Default UI text, labels"],
  ["2xs", "12px / 1.35", "Hints, captions, badges"],
] as const;

export function StyleGuide() {
  return (
    <ToastProvider>
      <StyleGuideInner />
    </ToastProvider>
  );
}

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="flex scroll-mt-6 flex-col gap-6 border-t border-studio-line pt-10">
      <div className="flex max-w-[65ch] flex-col gap-1.5">
        <h2 id={`${id}-h`} className="text-xl font-semibold tracking-[-0.01em]">
          {title}
        </h2>
        {description && <p className="text-sm text-studio-ink-3">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Demo({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex min-w-0 flex-col gap-3 border-t border-studio-line pt-4 ${className ?? ""}`}>
      <p className="text-2xs font-semibold text-studio-ink-3">{label}</p>
      {children}
    </div>
  );
}

function StyleGuideInner() {
  const toast = useToast();
  const db = useMemo(() => createSeedDB(), []);
  const samples = useMemo(() => ["card_carmela", "card_joel", "card_lia"].map((id) => bundleFromDB(db, id)!), [db]);
  const carmela = samples[0];
  const [toggle, setToggle] = useState(true);
  const [slider, setSlider] = useState(55);
  const [seg, setSeg] = useState("rounded");
  const [color, setColor] = useState("#183A2E");
  const [font, setFont] = useState("printed");
  const [tab, setTab] = useState("one");
  const [dialog, setDialog] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [crop, setCrop] = useState({ zoom: 1.2, x: 0, y: 0 });
  const [list, setList] = useState([
    { id: "a", label: "Quote" },
    { id: "b", label: "Photos" },
    { id: "c", label: "Map" },
  ]);
  const fakeUploads: UploadItem[] = [
    { id: "1", name: "listing-living-room.jpg", progress: 64, status: "uploading", file: new File([], "a") },
    { id: "2", name: "pool-at-dusk.jpg", progress: 100, status: "done", file: new File([], "b") },
    { id: "3", name: "floor-plan.heic", progress: 0, status: "error", error: "floor-plan.heic isn’t an image. Use JPG, PNG, WebP or SVG.", file: new File([], "c") },
  ];

  // One sample card in every template: same content, so only the design differs.
  const sameContent = useMemo(
    () => TEMPLATES.map((t): [string, CardBundle] => [t.id, { ...carmela, card: { ...carmela.card, ...lookFor(t) } }]),
    [carmela],
  );

  return (
    <div className="flex flex-col gap-12">
      <nav aria-label="Style guide sections" className="flex flex-wrap gap-2">
        {[
          ["templates", "Templates"],
          ["tokens", "Tokens"],
          ["type", "Type"],
          ["components", "Components"],
          ["card-sections", "Card sections"],
          ["themes", "Themes"],
          ["fonts", "Fonts"],
          ["catalog", "Template catalog"],
          ["credits", "Photo credits"],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="inline-flex h-9 items-center rounded-full border border-studio-line bg-studio-surface px-3.5 text-sm font-medium hover:border-studio-line-strong">
            {label}
          </a>
        ))}
      </nav>

      <Section id="templates" title="Templates" description="Three sample clients on their own templates. Live renders: scroll inside each phone, tap photos, open the share sheet.">
        <div className="grid gap-6 lg:grid-cols-3">
          {samples.map((b) => (
            <div key={b.card.id} className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">{TEMPLATES.find((t) => t.id === b.card.templateId)?.name}</p>
                <p className="truncate text-2xs text-studio-ink-3">{b.card.name}</p>
              </div>
              <div className="flex h-[720px] rounded-2xl bg-studio-sunken p-4">
                <DevicePreview device="phone">
                  <CardRenderer bundle={b} mode="preview" viewportHeight="844px" />
                </DevicePreview>
              </div>
            </div>
          ))}
        </div>
        <Demo label={`Same card, all ${TEMPLATES.length} templates`}>
          <p className="max-w-[65ch] text-sm text-studio-ink-3">
            Carmela Reyes-Tan’s card rendered by every template in its default theme. Content never changes between templates; fields a template doesn’t show (like clinic hours) are kept, not deleted.
          </p>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(176px,1fr))] gap-x-4 gap-y-6">
            {sameContent.map(([id, b]) => {
              const t = TEMPLATES.find((x) => x.id === id)!;
              return (
                <li key={id} className="flex flex-col gap-2">
                  <a href={`/design/preview/${id}`} className="group flex flex-col gap-2 rounded-xl focus-visible:outline-offset-4">
                    <span className="flex justify-center overflow-hidden rounded-xl border border-studio-line bg-studio-sunken transition-colors group-hover:border-studio-line-strong">
                      <TemplateThumbnail bundle={b} scale={0.43} />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-sm font-semibold">{t.name}</span>
                      <span className="text-2xs text-studio-ink-3">{t.category}</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </Demo>
      </Section>

      <Section id="tokens" title="Tokens" description="Studio tokens are CSS variables in app/globals.css with light and dark values, exposed to Tailwind as studio-* colors. Card tokens are set per card by the theme engine.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STUDIO_COLORS.map(([v, use]) => (
            <div key={v} className="flex items-center gap-3 rounded-xl border border-studio-line bg-studio-surface p-3">
              <span aria-hidden className="size-10 shrink-0 rounded-lg border border-studio-line" style={{ background: `var(${v})` }} />
              <span className="flex min-w-0 flex-col">
                <code className="truncate text-2xs font-semibold">{v}</code>
                <span className="text-2xs text-studio-ink-3">{use}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Demo label="Card tokens (resolved per card)">
            <dl className="flex flex-col divide-y divide-studio-line text-sm">
              {CARD_TOKENS.map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
                  <dt className="shrink-0 font-mono text-2xs font-semibold sm:w-60">{k}</dt>
                  <dd className="text-studio-ink-2">{v}</dd>
                </div>
              ))}
            </dl>
          </Demo>
          <Demo label="Spacing, radius, elevation, motion">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-end gap-3">
                {[4, 8, 12, 16, 20, 24, 32, 40, 48, 64].map((s) => (
                  <span key={s} className="flex flex-col items-center gap-1">
                    <span className="block bg-studio-action" style={{ width: s, height: s }} />
                    <span className="text-2xs tabular-nums text-studio-ink-3">{s}</span>
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  ["6", 6],
                  ["8", 8],
                  ["12", 12],
                  ["16", 16],
                  ["pill", 999],
                ].map(([l, r]) => (
                  <span key={l} className="flex flex-col items-center gap-1">
                    <span className="block h-10 w-14 border-2 border-studio-ink-3" style={{ borderRadius: r as number }} />
                    <span className="text-2xs text-studio-ink-3">{l}</span>
                  </span>
                ))}
              </div>
              <p className="max-w-[52ch] text-2xs text-studio-ink-3">
                Elevation: borders in the studio; shadows only on floating layers (menus, dialogs, toasts) and the printed card. Motion: 120 / 200 / 360 ms with an exponential ease-out. Every animation turns off under reduced motion.
              </p>
            </div>
          </Demo>
        </div>
      </Section>

      <Section id="type" title="Type" description="Studio: Atkinson Hyperlegible Next on a minor-third scale from 14px. Cards use their own font pairing.">
        <div className="flex flex-col divide-y divide-studio-line rounded-2xl border border-studio-line bg-studio-surface">
          {TYPE.map(([k, spec, use]) => (
            <div key={k} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:gap-6">
              <span className="w-28 shrink-0 font-mono text-2xs text-studio-ink-3">
                text-{k}
                <br />
                {spec}
              </span>
              <span className={`text-${k} font-semibold`} style={{ fontSize: `var(--text-${k})` }}>
                {use}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="components" title="Components" description="Studio component library. Every control has a visible label, a focus ring and a 40px+ target.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Demo label={`TapikLogo: a temporary wordmark (sm, md, lg). Inherits the text colour; the admin side reads “${BRAND.adminAppName}”`} className="lg:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-wrap items-end gap-x-6 gap-y-3 rounded-xl border border-studio-line bg-studio-surface p-5 text-studio-ink">
                <TapikLogo size="sm" />
                <TapikLogo app="admin" />
                <TapikLogo size="lg" />
              </div>
              <div className="flex flex-wrap items-end gap-x-6 gap-y-3 rounded-xl bg-[#121513] p-5 text-[#f3f4f1]">
                <TapikLogo size="sm" />
                <TapikLogo app="admin" />
                <TapikLogo size="lg" />
              </div>
            </div>
            <p className="text-2xs text-studio-ink-3">Public cards never show the mark: their footer is a plain “{BRAND.poweredBy}” line, so it doesn’t compete with the client’s brand.</p>
          </Demo>
          <Demo label="Button, IconButton, Tooltip">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary">Publish</Button>
              <Button>Preview</Button>
              <Button variant="ghost">Cancel</Button>
              <Button variant="danger">Unpublish</Button>
              <Button variant="primary" loading>
                Publishing
              </Button>
              <Button disabled>Disabled</Button>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <IconButton label="Edit" icon={<Pencil aria-hidden />} />
              <IconButton label="Copy link" icon={<Copy aria-hidden />} />
              <IconButton label="Delete" variant="danger-ghost" icon={<Trash2 aria-hidden />} />
              <Tooltip content="Tooltips name icon-only buttons">
                <span className="ml-2 text-sm underline decoration-dotted underline-offset-4">Hover or focus me</span>
              </Tooltip>
            </div>
          </Demo>
          <Demo label="Input, Textarea, Select with validation">
            <Field label="Mobile number" hint="The Call button dials this number.">
              {(p) => <Input id={p.id} aria-describedby={p.describedBy} defaultValue="+63 917 555 0142" />}
            </Field>
            <Field label="Email" error="Add the ending after the dot, like .ph or .com.">
              {(p) => <Input id={p.id} aria-describedby={p.describedBy} invalid defaultValue="carmela@tanocampo" />}
            </Field>
            <Field label="Quote" counter={{ value: 74, max: 140 }}>
              {(p) => <Textarea id={p.id} rows={2} defaultValue="I sell homes the way I’d want my own sold: honestly, and never in a hurry." />}
            </Field>
            <Field label="Reports to">
              {(p) => (
                <Select id={p.id} defaultValue="r">
                  <option value="r">Ramon Ocampo, Managing Broker</option>
                  <option value="">No one (top of the chart)</option>
                </Select>
              )}
            </Field>
          </Demo>
          <Demo label="Toggle, Slider, Segmented, Badges">
            <Toggle label="Show agent photo" description="When hidden, no photo or initials appear." checked={toggle} onCheckedChange={setToggle} />
            <Slider label="Overlay darkness" value={slider} min={0} max={90} step={5} onValueChange={setSlider} format={(v) => `${v}%`} />
            <Segmented label="Button shape" value={seg} onChange={setSeg} options={[{ value: "pill", label: "Pill" }, { value: "rounded", label: "Rounded" }, { value: "square", label: "Square" }]} />
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="draft" />
              <StatusBadge status="published" />
              <StatusBadge status="published" dirty />
              <Badge tone="action">Default</Badge>
              <Badge tone="danger">2 contrast issues</Badge>
            </div>
          </Demo>
          <Demo label="ColorPicker with contrast">
            <ColorPicker label="Background" value={color} onChange={setColor} />
            <p className="text-2xs text-studio-ink-3 tabular-nums">
              Against #F1F2EE: {formatRatio(contrastRatio(color, "#F1F2EE"))} {contrastRatio(color, "#F1F2EE") >= 4.5 ? "passes" : "fails"} AA
            </p>
          </Demo>
          <Demo label="FontPicker" className="lg:row-span-2">
            <FontPicker value={font} onChange={setFont} sampleName="Carmela Reyes-Tan" />
          </Demo>
          <Demo label="Dropzone: empty, uploading, success, error">
            <Dropzone multiple title="Add photos to the album" hint="JPG, PNG or WebP" onFiles={() => toast.show({ tone: "info", title: "Uploads are wired in the editor" })} items={fakeUploads} />
          </Demo>
          <Demo label="ImageCropper (arch shape)">
            <ImageCropper src="/mock/cafe/pinoy-pandesal.jpg" alt="Pandesal and coffee" shape="arch" crop={crop} onChange={setCrop} />
          </Demo>
          <Demo label="SortableList (drag the handle, or Space and arrow keys)">
            <SortableList
              label="Demo sections"
              items={list}
              onReorder={(ids) => setList(ids.map((id) => list.find((x) => x.id === id)!))}
              renderItem={(it, handle) => (
                <div className="flex items-center gap-2 rounded-xl border border-studio-line bg-studio-surface py-1.5 pl-1">
                  {handle}
                  <span className="text-sm font-semibold">{it.label}</span>
                </div>
              )}
            />
          </Demo>
          <Demo label="Tabs, Dialog, Sheet, Toast">
            <Tabs
              label="Demo tabs"
              value={tab}
              onValueChange={setTab}
              tabs={[
                { value: "one", label: "Agent photo", content: <p className="text-sm text-studio-ink-2">Tabs switch panels without leaving the page.</p> },
                { value: "two", label: "Background", content: <p className="text-sm text-studio-ink-2">Arrow keys move between tabs.</p> },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setDialog(true)}>Open dialog</Button>
              <Button onClick={() => setSheet(true)}>Open sheet</Button>
              <Button
                icon={<Bell aria-hidden className="size-4" />}
                onClick={() => toast.success("Photo deleted", { action: { label: "Undo", onClick: () => toast.success("Photo restored") } })}
              >
                Show toast with Undo
              </Button>
            </div>
            <Dialog open={dialog} onOpenChange={setDialog} size="sm" title="Unpublish this card?" description="People who tap the card will see “This card isn’t available” until you publish again." footer={<><Button onClick={() => setDialog(false)}>Keep it live</Button><Button variant="danger" onClick={() => setDialog(false)}>Unpublish</Button></>} />
            <Sheet open={sheet} onOpenChange={setSheet} title="Sheet" description="Side sheet on wide screens, bottom sheet on phones.">
              <p className="text-sm text-studio-ink-2">Focus is trapped inside and returns to the button on close.</p>
            </Sheet>
          </Demo>
          <Demo label="QR preview, Skeleton">
            <div className="flex flex-wrap items-center gap-6">
              <div className="rounded-xl bg-white p-2">
                <QrPreview value={brandUrl("/c/carmela-reyes-tan")} size={132} />
              </div>
              <div className="flex w-48 flex-col gap-2">
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </Demo>
        </div>
      </Section>

      <Section id="card-sections" title="Card sections" description="Public card components in components/card. Each reads only the card tokens, so they work in every template and theme.">
        <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Hero / Cover", "Background photo with focal point and overlay"],
            ["ProfileHeader", "Name, title, company, agent photo in the template’s shape"],
            ["QuoteBlock", "Pull quote, sized per template"],
            ["AboutBlock", "Bio with Read more for long text"],
            ["ActionBar", "Call, Message, Save contact; sticky bar after scrolling"],
            ["SocialLinks", "Icons, chips or rows, in the admin’s order"],
            ["ContactRow", "Phone and email with tap-to-copy"],
            ["MapBlock", "Styled map stand-in, address, Get directions"],
            ["PhotoAlbum", "Grid, carousel or masonry, with a swipeable lightbox"],
            ["OrgChart", "Team tree with detail sheet, or an uploaded chart with zoom"],
            ["Footer", `“${BRAND.poweredBy}”, hideable`],
            ["Share sheet", "Native share, or QR and copy link"],
          ].map(([n, d]) => (
            <li key={n} className="flex flex-col gap-0.5 rounded-xl border border-studio-line bg-studio-surface p-4">
              <span className="font-semibold">{n}</span>
              <span className="text-2xs text-studio-ink-3">{d}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="themes" title="Themes" description="Three or more presets per template, each passing WCAG AA (npm run check:contrast). Ratios shown are text on background and button text on primary.">
        {TEMPLATES.map((t) => (
          <div key={t.id} className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{t.name}</h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {t.themes.map((th) => (
                <li key={th.id} className="flex flex-col gap-2 rounded-xl border border-studio-line bg-studio-surface p-2.5">
                  <span className="flex h-20 flex-col justify-between rounded-lg p-2.5" style={{ background: th.tokens.background, color: th.tokens.onBackground }}>
                    <span className="text-sm font-semibold">Aa</span>
                    <span className="self-end rounded px-2 py-0.5 text-2xs font-semibold" style={{ background: th.tokens.primary, color: th.tokens.onPrimary }}>
                      Call
                    </span>
                  </span>
                  <span className="text-2xs font-semibold">{th.name}</span>
                  <span className="text-2xs tabular-nums text-studio-ink-3">
                    {formatRatio(contrastRatio(th.tokens.onBackground, th.tokens.background))} · {formatRatio(contrastRatio(th.tokens.onPrimary, th.tokens.primary))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section id="fonts" title="Font pairings">
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {FONT_PAIRINGS.map((f) => (
            <li key={f.id} className="flex flex-col gap-3 rounded-2xl border border-studio-line bg-studio-surface p-5">
              <span className="text-[34px] leading-none" style={{ fontFamily: f.display, fontWeight: f.displayWeight, letterSpacing: f.displayTracking }}>
                {f.sample}
              </span>
              <span className="text-sm text-studio-ink-2" style={{ fontFamily: f.body }}>
                Twelve years matching families with homes across Cebu. +63 917 555 0142
              </span>
              <span className="text-2xs font-semibold">{f.name}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="portal"
        title="Client portal and paid templates"
        description="Shared pieces for invites, the Client Portal and paid templates. Only the Default template is free; themes are always free. Locks never save: canApplyTemplate guards every apply and publish (npm run test:guards)."
      >
        <PortalGuide Demo={Demo} />
      </Section>

      <Section id="catalog" title="Template catalog" description="Every template is a folder in /templates with a manifest, a Card component and a sample card. templates/registry.ts lists them.">
        <div className="relative overflow-x-auto rounded-2xl border border-studio-line bg-studio-surface">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="border-b border-studio-line text-2xs text-studio-ink-3">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Template</th>
                <th scope="col" className="px-4 py-3 font-semibold">Category</th>
                <th scope="col" className="px-4 py-3 font-semibold">Fonts</th>
                <th scope="col" className="px-4 py-3 font-semibold">Themes</th>
                <th scope="col" className="px-4 py-3 font-semibold">Shows</th>
                <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Preview</span></th>
              </tr>
            </thead>
            <tbody>
              {TEMPLATES.map((t) => {
                const extras = [t.supports.hours && "hours", t.supports.serviceChips && "services", t.supports.serviceAreas && "service areas", t.supports.booking && "booking", t.supports.bookingCta && "booking button text", t.supports.expertiseChips && "expertise chips", t.supports.taglines && "tagline", t.supports.idCard && "ID card", t.supports.event && "event"].filter(Boolean);
                return (
                  <tr key={t.id} className="border-b border-studio-line last:border-0">
                    <th scope="row" className="px-4 py-3 font-semibold">
                      {t.name}
                      <span className="block font-mono text-2xs font-normal text-studio-ink-3">{t.id}</span>
                    </th>
                    <td className="px-4 py-3 text-studio-ink-2">{t.category}</td>
                    <td className="px-4 py-3 text-studio-ink-2">
                      <span style={{ fontFamily: getFontPairing(t.fontPairingId).display }}>{t.fonts.heading}</span>
                      {t.fonts.body !== t.fonts.heading && <> + {t.fonts.body}</>}
                      {t.fonts.mono && <> + {t.fonts.mono}</>}
                      {t.fonts.accent && <> + {t.fonts.accent}</>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex gap-1" aria-label={t.themes.map((th) => th.name).join(", ")}>
                        {t.themes.map((th) => (
                          <span key={th.id} title={th.name} className="size-4 rounded-full border border-studio-line-strong" style={{ background: th.tokens.background }} />
                        ))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-2xs text-studio-ink-2">{t.supports.coverPhoto ? "cover photo" : "no cover photo"}{extras.length ? `, ${extras.join(", ")}` : ""}</td>
                    <td className="px-4 py-3 text-right">
                      <a href={`/design/preview/${t.id}`} className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-studio-action-ink underline-offset-4 hover:underline">
                        Full size
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <LinkButton href="/admin/templates" className="self-start" icon={<Plus aria-hidden className="size-4" />}>
          Open the template library
        </LinkButton>
      </Section>

      <Section id="credits" title="Photo credits" description="Sample photos are openly licensed from Wikimedia Commons; share-alike licences apply to edited versions. The Hyacinth Industries logo and artwork belong to the brand owner and appear only on its own template.">
        <ul className="grid gap-x-8 gap-y-1.5 text-2xs text-studio-ink-2 md:grid-cols-2">
          {PHOTO_CREDITS.map((c) => (
            <li key={c.url} className="[text-wrap:pretty]">
              <a href={c.page} target="_blank" rel="noreferrer" className="underline decoration-studio-line-strong underline-offset-2 hover:decoration-current">
                {c.credit}
              </a>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
