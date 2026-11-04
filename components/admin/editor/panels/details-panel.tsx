"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import type { CardEvent, OpeningHours } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getTemplate, TEMPLATES } from "@/templates/registry";
import type { TemplateManifest } from "@/templates/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/controls";
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
      </Block>

      <Divider />

      <Block title="Service areas" support="serviceAreas" tpl={tpl} description="Cities, ports or provinces you cover, in route order.">
        <ListEditor label="Area" values={card.serviceAreas ?? []} onChange={(v) => patch({ serviceAreas: v.length ? v : undefined })} placeholder="e.g. Batangas Port" />
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
      <BoundField fieldKey="eventVenue" label="Venue" optional value={event.venue ?? ""} onCommit={(v) => set({ venue: v || undefined })} max={80} />
      <BoundField fieldKey="eventNote" label="One-line note" optional value={event.note ?? ""} onCommit={(v) => set({ note: v || undefined })} max={90} placeholder="e.g. 60 makers, food stalls and a parol-making corner" />
      <Button variant="danger-ghost" size="sm" icon={<Trash2 aria-hidden className="size-4" />} onClick={() => onChange(undefined)} className="self-start">
        Remove event
      </Button>
    </div>
  );
}
