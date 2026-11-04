"use client";

import { BRAND } from "@/lib/brand";
import { hasContent } from "@/lib/design/sections";
import { SECTION_LABELS } from "@/lib/design/sections";
import type { HeaderElement, ReorderableSection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/controls";
import { SortableList } from "@/components/ui/sortable-list";
import { useEditor, type EditorTab } from "../editor-context";
import { Divider, PanelHeader } from "../fields";

const WHERE: Record<ReorderableSection, EditorTab> = {
  quote: "content",
  about: "content",
  contact: "content",
  socials: "socials",
  photos: "photos",
  map: "map",
  orgChart: "org",
};

/** `hides`: the switch reads "Hide …", so on means hidden. */
const HEADER: { key: HeaderElement; label: string; description: string; hides?: boolean }[] = [
  { key: "backgroundPhoto", label: "Background photo", description: "The large photo behind the header." },
  { key: "logo", label: "Logo", description: "Company logo at the top of the card." },
  { key: "agentPhoto", label: "Agent photo", description: "Portrait next to the name." },
  { key: "poweredBy", label: `Hide “${BRAND.poweredBy}”`, description: "Removes the small credit line at the very bottom of the card.", hides: true },
];

export function SectionsPanel() {
  const { bundle, card, patch, setTab } = useEditor();
  const items = card.sectionOrder.map((id) => ({ id }));

  const toggle = (key: string, show: boolean) =>
    patch({ hiddenSections: show ? card.hiddenSections.filter((k) => k !== key) : [...card.hiddenSections, key as ReorderableSection] });

  return (
    <div>
      <PanelHeader
        title="Sections"
        description="Drag to set the order on the card. The name, photo and Call and Message buttons always stay at the top."
      />

      <SortableList
        label="Card sections"
        items={items}
        onReorder={(ids) => patch({ sectionOrder: ids as ReorderableSection[] })}
        renderItem={({ id }, handle, { dragging }) => {
          const key = id as ReorderableSection;
          const shown = !card.hiddenSections.includes(key);
          const filled = hasContent(key, bundle);
          return (
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl border bg-studio-surface py-2 pr-3 pl-1",
                dragging ? "border-studio-action shadow-[0_8px_24px_rgb(0_0_0/0.12)]" : "border-studio-line",
              )}
            >
              {handle}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className={cn("text-sm font-semibold", !shown && "text-studio-ink-3")}>{SECTION_LABELS[key]}</span>
                {!filled ? (
                  <span className="text-2xs text-studio-ink-3">
                    Empty, so it’s hidden on the card.{" "}
                    <button type="button" onClick={() => setTab(WHERE[key])} className="cursor-pointer font-semibold text-studio-action-ink underline underline-offset-2">
                      Add content
                    </button>
                  </span>
                ) : !shown ? (
                  <span className="text-2xs text-studio-ink-3">Hidden on the card</span>
                ) : null}
              </div>
              <ShowSwitch label={SECTION_LABELS[key]} checked={shown} onChange={(v) => toggle(key, v)} />
            </div>
          );
        }}
      />

      <Divider />

      <div className="flex flex-col gap-5">
        <h3 className="text-base font-semibold">Header and footer</h3>
        {HEADER.map((h) => (
          <Toggle
            key={h.key}
            label={h.label}
            description={h.description}
            checked={h.hides ? card.hiddenSections.includes(h.key) : !card.hiddenSections.includes(h.key)}
            onCheckedChange={(v) => toggle(h.key, h.hides ? !v : v)}
          />
        ))}
      </div>
    </div>
  );
}

function ShowSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`Show ${label}`}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 before:absolute before:-inset-2.5 before:content-['']"
      style={{ background: checked ? "var(--studio-action)" : "var(--studio-line-strong)" }}
    >
      <span
        className="block size-5 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.25)] transition-transform duration-200"
        style={{ transform: `translateX(${checked ? 18 : 2}px)` }}
      />
    </button>
  );
}
