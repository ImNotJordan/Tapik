"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import type { CardEvent, OpeningHours, PromptDemo, StackRow, StatusChip } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getTemplate, TEMPLATES } from "@/templates/registry";
import type { TemplateManifest } from "@/templates/types";
import { Button } from "@/components/ui/button";
import { Badge, Segmented } from "@/components/ui/controls";
import { SortableList } from "@/components/ui/sortable-list";
import { useEditor } from "../editor-context";
import { BoundField, Divider, PanelHeader } from "../fields";

type Support = keyof TemplateManifest["supports"];

const DAYS = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULT_HOURS: OpeningHours[] = DAYS.map((day) => ({ day, open: "09:00", close: "18:00", closed: day === 0 }));

/** "2026-12-12T16:00:00+08:00" ⇄ "2026-12-12T16:00" (Manila time, as entered). */
const toLocal = (iso?: string) => (iso ? iso.slice(0, 16) : "");
const fromLocal = (v: string) => (v ? `${v}:00+08:00` : "");

/**
 * Template-specific details: stored on every card, shown only by templates
 * that support them. Switching templates never deletes them.
 */
export function DetailsPanel() {
  const { card, patch } = useEditor();
  const tpl = getTemplate(card.templateId);
  const hours = card.hours ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PanelHeader
        title="Details"
        description="Extra details some templates show, like opening hours or an event countdown. They’re saved with the card whichever template you use, so switching never loses them."
      />

      <Block title="Opening hours" support="hours" tpl={tpl} description="Drives the Open now status and the hours table.">
        {hours.length === 0 ? (
          <Button icon={<Plus aria-hidden className="size-4" />} onClick={() => patch({ hours: DEFAULT_HOURS })} className="self-start">
            Add opening hours
          </Button>
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-studio-line rounded-xl border border-studio-line">
              {DAYS.map((day) => {
                const h = hours.find((x) => x.day === day) ?? { day, open: "09:00", close: "18:00", closed: true };
                const set = (p: Partial<OpeningHours>) => patch({ hours: DAYS.map((d) => (d === day ? { ...h, ...p } : hours.find((x) => x.day === d) ?? { day: d, open: "09:00", close: "18:00", closed: true })) });
                return (
                  <li key={day} className="flex flex-wrap items-center gap-3 px-3.5 py-2.5">
                    <label className="flex w-36 cursor-pointer items-center gap-2.5 text-sm font-semibold">
                      <input type="checkbox" checked={!h.closed} onChange={(e) => set({ closed: !e.target.checked })} className="size-4 accent-[var(--studio-action)]" />
                      {DAY_NAMES[day]}
                    </label>
                    {h.closed ? (
                      <span className="text-sm text-studio-ink-3">Closed</span>
                    ) : (
                      <span className="flex items-center gap-2 text-sm">
                        <input type="time" aria-label={`${DAY_NAMES[day]} opens`} value={h.open} onChange={(e) => e.target.value && set({ open: e.target.value })} className="h-10 rounded-lg border border-studio-line-strong bg-studio-surface px-2 tabular-nums focus:border-studio-action focus:outline-none" />
                        <span aria-hidden className="text-studio-ink-3">to</span>
                        <input type="time" aria-label={`${DAY_NAMES[day]} closes`} value={h.close} onChange={(e) => e.target.value && set({ close: e.target.value })} className="h-10 rounded-lg border border-studio-line-strong bg-studio-surface px-2 tabular-nums focus:border-studio-action focus:outline-none" />
                      </span>
                    )}
                    {!h.closed && h.close <= h.open && <span className="w-full text-2xs text-studio-danger-ink">Closing time is before opening time.</span>}
                  </li>
                );
              })}
            </ul>
            <p className="text-2xs text-studio-ink-3">Times are Philippine time; visitors abroad see the same hours.</p>
            <Button variant="danger-ghost" size="sm" icon={<Trash2 aria-hidden className="size-4" />} onClick={() => patch({ hours: undefined })} className="self-start">
              Remove hours
            </Button>
          </>
        )}
      </Block>

      <Divider />

      <Block title="Services" support="serviceChips" tpl={tpl} description="Short names, like “Braces” or “Bilao orders”. Faith & Community lists them as ministries.">
        <ListEditor label="Service" values={card.services ?? []} onChange={(v) => patch({ services: v.length ? v : undefined })} placeholder="e.g. Teeth cleaning" />
        {tpl.supports.translations && (
          <ListEditor
            label="Service in Filipino"
            values={card.translations?.fil?.chips ?? []}
            onChange={(v) => {
              const fil = { ...card.translations?.fil, chips: v.length ? v : undefined };
              patch({ translations: Object.values(fil).some(Boolean) ? { ...card.translations, fil } : undefined });
            }}
            placeholder="e.g. Pagpaplano sa pagreretiro"
          />
        )}
      </Block>

      <Divider />

      <Block title="Service areas" support="serviceAreas" tpl={tpl} description="Cities, ports or provinces you cover, in route order.">
        <ListEditor label="Area" values={card.serviceAreas ?? []} onChange={(v) => patch({ serviceAreas: v.length ? v : undefined })} placeholder="e.g. Batangas Port" />
      </Block>

      <Divider />

      <Block title="Status" support="statusChip" tpl={tpl} description="A small pill near the name, like “On duty now” or “Open to projects”.">
        <StatusEditor value={card.statusChip} templateId={tpl.id} onChange={(v) => patch({ statusChip: v })} />
      </Block>

      <Divider />

      <Block title="Tech stack" support="stackRows" tpl={tpl} description="Rows like Frontend → Next.js · React. Up to 8.">
        <StackEditor rows={card.stackRows ?? []} onChange={(v) => patch({ stackRows: v.length ? v : undefined })} />
      </Block>

      <Divider />

      <Block title="GitHub activity" support="githubActivity" tpl={tpl} description="A commit activity graph from your public GitHub profile. Without a username the graph stays hidden: it never shows made-up activity.">
        <BoundField
          fieldKey="githubUsername"
          label="GitHub username"
          optional
          value={card.githubUsername ?? ""}
          validate={(v) => (!v.trim() || /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(v.trim()) ? { ok: true, value: v.trim() } : { ok: false, message: "Use the username only, like octocat." })}
          onCommit={(v) => patch({ githubUsername: v || undefined })}
          placeholder="octocat"
          hint="The part after github.com/."
        />
      </Block>

      <Divider />

      <Block title="Chat demo" support="promptDemo" tpl={tpl} description="The chat at the top of the card: what a client asked, your reply, and the result. Empty, the cover photo shows instead.">
        <PromptEditor value={card.promptDemo} onChange={(v) => patch({ promptDemo: v })} />
      </Block>

      <Divider />

      <Block title="ID card" support="idCard" tpl={tpl} description="Printed on Boardroom’s employee ID card.">
        <div className="grid gap-4 sm:grid-cols-2">
          <BoundField fieldKey="department" label="Department" optional value={card.department ?? ""} onCommit={(v) => patch({ department: v || undefined })} max={40} placeholder="e.g. Corporate Sales" />
          <BoundField fieldKey="employeeId" label="Employee ID" optional value={card.employeeId ?? ""} onCommit={(v) => patch({ employeeId: v || undefined })} max={24} placeholder="e.g. TIG-04127" />
        </div>
      </Block>

      <Divider />

      <Block title="Event" support="event" tpl={tpl} description="A dated event or sale with a live countdown. It shows “ended” once it’s over.">
        {card.event ? <EventEditor event={card.event} onChange={(e) => patch({ event: e })} /> : (
          <Button
            icon={<Plus aria-hidden className="size-4" />}
            className="self-start"
            onClick={() => patch({ event: { title: "", startsAt: "", venue: card.address } })}
          >
            Add an event
          </Button>
        )}
      </Block>
    </div>
  );
}

export function Block({ title, support, tpl, description, children }: { title: string; support: Support; tpl: TemplateManifest; description: string; children: ReactNode }) {
  const shownBy = TEMPLATES.filter((t) => t.supports[support]).map((t) => t.name);
  const shows = !!tpl.supports[support];
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-sm text-studio-ink-3">{description}</p>
        </div>
        <Badge tone={shows ? "success" : "neutral"}>{shows ? `Shown by ${tpl.name}` : `Not shown by ${tpl.name}`}</Badge>
      </div>
      {children}
      <p className="text-2xs text-studio-ink-3">Templates that show it: {shownBy.join(", ")}.</p>
    </section>
  );
}

/** Templates that show a field, by name. */
export function shownBy(support: Support): string {
  return TEMPLATES.filter((t) => t.supports[support]).map((t) => t.name).join(", ");
}

/** Add and remove short items; `sortable` adds drag-to-reorder (pointer, touch or keyboard). */
export function ListEditor({ label, values, onChange, placeholder, sortable }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string; sortable?: boolean }) {
  const id = useId();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const add = () => {
    const v = text.trim();
    if (!v) return;
    if (values.some((x) => x.toLowerCase() === v.toLowerCase())) return setError(`“${v}” is already on the list.`);
    if (values.length >= 12) return setError("Twelve is the most that reads well on a phone.");
    onChange([...values, v]);
    setText("");
    setError(null);
  };
  return (
    <div className="flex flex-col gap-2.5">
      {sortable && values.length > 0 && (
        <SortableList
          label={`${label} order`}
          items={values.map((v) => ({ id: v }))}
          onReorder={(ids) => onChange(ids)}
          renderItem={(item, handle, { dragging }) => (
            <div className={cn("flex min-h-11 items-center gap-1 rounded-lg border border-studio-line-strong bg-studio-surface pr-1 pl-1", dragging && "shadow-lg")}>
              {handle}
              <span className="min-w-0 flex-1 truncate text-sm">{item.id}</span>
              <button type="button" aria-label={`Remove ${item.id}`} onClick={() => onChange(values.filter((x) => x !== item.id))} className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-studio-ink-3 hover:bg-studio-raised hover:text-studio-ink">
                <X aria-hidden className="size-4" />
              </button>
            </div>
          )}
        />
      )}
      {!sortable && values.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <li key={v} className="inline-flex h-9 items-center gap-1 rounded-full border border-studio-line-strong bg-studio-surface pr-1 pl-3 text-sm">
              {v}
              <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full text-studio-ink-3 hover:bg-studio-raised hover:text-studio-ink">
                <X aria-hidden className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <label htmlFor={id} className="sr-only">
          Add {label.toLowerCase()}
        </label>
        <input
          id={id}
          value={text}
          maxLength={40}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          className={cn("h-11 min-w-0 flex-1 rounded-lg border bg-studio-surface px-3 text-sm focus:border-studio-action focus:outline-none", error ? "border-studio-danger" : "border-studio-line-strong")}
        />
        <Button onClick={add} disabled={!text.trim()} icon={<Plus aria-hidden className="size-4" />}>
          Add
        </Button>
      </div>
      {error && (
        <p id={`${id}-err`} className="text-2xs text-studio-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
}

function EventEditor({ event, onChange }: { event: CardEvent; onChange: (e: CardEvent | undefined) => void }) {
  const set = (p: Partial<CardEvent>) => onChange({ ...event, ...p });
  const endsBeforeStart = event.endsAt && event.startsAt && event.endsAt <= event.startsAt;
  const inputCls = "h-11 w-full rounded-lg border border-studio-line-strong bg-studio-surface px-3 text-sm tabular-nums focus:border-studio-action focus:outline-none";
  return (
    <div className="flex flex-col gap-4">
      <BoundField fieldKey="eventEyebrow" label="Line above the name" optional value={event.eyebrow ?? ""} onCommit={(v) => set({ eyebrow: v || undefined })} max={40} placeholder="e.g. Grand opening" />
      <BoundField fieldKey="eventTitle" label="Event name" value={event.title} onCommit={(v) => set({ title: v })} max={60} placeholder="e.g. Paskuhan sa Kapitolyo Christmas Bazaar" hint={!event.title ? "The countdown shows once the event has a name and a start time." : undefined} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Starts
          <input type="datetime-local" value={toLocal(event.startsAt)} onChange={(e) => set({ startsAt: fromLocal(e.target.value) })} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          <span>
            Ends <span className="font-normal text-studio-ink-3">(optional)</span>
          </span>
          <input type="datetime-local" value={toLocal(event.endsAt)} onChange={(e) => set({ endsAt: fromLocal(e.target.value) || undefined })} className={inputCls} aria-invalid={!!endsBeforeStart || undefined} />
        </label>
      </div>
      {endsBeforeStart && <p className="-mt-2 text-2xs text-studio-danger-ink">The end is before the start. Check the date.</p>}
      <BoundField fieldKey="eventTimeLabel" label="Time as shown" optional value={event.timeLabel ?? ""} onCommit={(v) => set({ timeLabel: v || undefined })} max={40} placeholder="e.g. 4 PM till late" hint="Left empty, the start time shows." />
      <BoundField fieldKey="eventVenue" label="Venue" optional value={event.venue ?? ""} onCommit={(v) => set({ venue: v || undefined })} max={80} />
      <BoundField fieldKey="eventNote" label="One-line note" optional value={event.note ?? ""} onCommit={(v) => set({ note: v || undefined })} max={90} placeholder="e.g. 60 makers, food stalls and a parol-making corner" />
      <Button variant="danger-ghost" size="sm" icon={<Trash2 aria-hidden className="size-4" />} onClick={() => onChange(undefined)} className="self-start">
        Remove event
      </Button>
    </div>
  );
}

const STATUS_DEFAULT: Record<string, string> = { dispatch: "On duty now", commit: "Open to projects" };

function StatusEditor({ value, templateId, onChange }: { value?: StatusChip; templateId: string; onChange: (v: StatusChip | undefined) => void }) {
  const fallback = STATUS_DEFAULT[templateId] ?? "Available";
  const shown = value ? value.label.trim() !== "" : true;
  const tone = value?.tone ?? "live";
  return (
    <div className="flex flex-col gap-4">
      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
        <input type="checkbox" checked={shown} onChange={(e) => onChange(e.target.checked ? undefined : { label: "", tone })} className="size-4 accent-[var(--studio-action)]" />
        Show a status
      </label>
      {shown && (
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
          <BoundField fieldKey="statusLabel" label="Status" optional value={value?.label ?? ""} onCommit={(v) => onChange(v ? { label: v, tone } : tone === "live" ? undefined : { label: fallback, tone })} max={32} placeholder={fallback} hint="Left empty, the template’s own status shows." />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Dot</span>
            <Segmented<StatusChip["tone"]>
              label="Status dot"
              value={tone}
              onChange={(t) => onChange({ label: value?.label || fallback, tone: t })}
              options={[
                { value: "live", label: "Green" },
                { value: "neutral", label: "None" },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StackEditor({ rows, onChange }: { rows: StackRow[]; onChange: (v: StackRow[]) => void }) {
  const inputCls = "h-11 min-w-0 rounded-lg border border-studio-line-strong bg-studio-surface px-3 text-sm focus:border-studio-action focus:outline-none";
  const set = (i: number, p: Partial<StackRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_auto] items-center gap-2">
          <input aria-label={`Row ${i + 1} label`} value={r.label} maxLength={24} onChange={(e) => set(i, { label: e.target.value })} placeholder="Frontend" className={inputCls} />
          <input aria-label={`Row ${i + 1} tools`} value={r.value} maxLength={120} onChange={(e) => set(i, { value: e.target.value })} placeholder="Next.js · React · Tailwind" className={cn(inputCls, "font-mono")} />
          <Button variant="ghost" size="sm" aria-label={`Remove row ${i + 1}`} icon={<X aria-hidden className="size-4" />} onClick={() => onChange(rows.filter((_, j) => j !== i))} />
        </div>
      ))}
      {rows.length < 8 && (
        <Button icon={<Plus aria-hidden className="size-4" />} className="self-start" onClick={() => onChange([...rows, { label: "", value: "" }])}>
          Add a row
        </Button>
      )}
    </div>
  );
}

function PromptEditor({ value, onChange }: { value?: PromptDemo; onChange: (v: PromptDemo | undefined) => void }) {
  if (!value) {
    return (
      <Button icon={<Plus aria-hidden className="size-4" />} className="self-start" onClick={() => onChange({ ask: "", replyLines: [] })}>
        Add a chat demo
      </Button>
    );
  }
  const set = (p: Partial<PromptDemo>) => onChange({ ...value, ...p });
  return (
    <div className="flex flex-col gap-4">
      <BoundField fieldKey="promptAsk" label="What the client asked" multiline rows={2} max={200} value={value.ask} onCommit={(v) => set({ ask: v })} placeholder="Can you build a booking page for my salon by Friday?" />
      <BoundField
        fieldKey="promptReply"
        label="Your reply"
        multiline
        rows={4}
        value={value.replyLines.join("\n")}
        onCommit={(v) => set({ replyLines: v.split("\n").map((l) => l.trimEnd()).filter(Boolean).slice(0, 6) })}
        placeholder={"Scaffolding Next.js + Supabase\nCalendar, deposits, SMS reminders\nTested on your phone"}
        hint="One line each, up to 6. Shown as code."
      />
      <BoundField fieldKey="promptResult" label="Result line" optional max={60} value={value.resultLabel ?? ""} onCommit={(v) => set({ resultLabel: v || undefined })} placeholder="Deployed → salon.example.ph" />
      <Button variant="danger-ghost" size="sm" icon={<Trash2 aria-hidden className="size-4" />} onClick={() => onChange(undefined)} className="self-start">
        Remove chat demo
      </Button>
    </div>
  );
}
