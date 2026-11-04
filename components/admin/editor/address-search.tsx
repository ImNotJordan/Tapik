"use client";

import { LoaderCircle, MapPin } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { searchAddress, type AddressHit } from "@/lib/maps/google";
import { Field, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type Picked = { address: string; lat: number; lng: number };

/**
 * The card's address, with Google suggestions while typing (buildings and
 * businesses by name). Picking one writes the address and moves the pin there.
 * Typed text is saved as typed, like every other field.
 */
export function AddressSearch({
  value,
  onText,
  onPick,
  onSettle,
  near,
  search,
}: {
  value: string;
  onText: (v: string) => void;
  onPick: (p: Picked) => void;
  /** Left the field without picking a suggestion. */
  onSettle?: (text: string) => void;
  near?: { lat: number; lng: number };
  /** Off without a Maps key: a plain field. */
  search: boolean;
}) {
  const uid = useId();
  const listId = `${uid}-list`;
  const [text, setText] = useState(value);
  const [hits, setHits] = useState<AddressHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const focused = useRef(false);
  const picked = useRef(false);
  const query = useRef(0);
  const nearRef = useRef(near);

  useEffect(() => {
    nearRef.current = near;
  });

  // Follow outside changes (undo, another tab) unless the person is typing here.
  useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);

  // Debounced lookup: one request after a short pause, and only the latest answer counts.
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const runSearch = (v: string) => {
    clearTimeout(timer.current);
    const n = ++query.current;
    const q = v.trim();
    if (!search || q.length < 3) {
      setHits([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setOpen(true);
    timer.current = setTimeout(async () => {
      const found = await searchAddress(q, nearRef.current);
      if (n !== query.current) return;
      setLoading(false);
      setHits(found);
      setActive(found.length ? 0 : -1);
      setStatus(found.length ? `${found.length} suggestion${found.length === 1 ? "" : "s"}. Use the arrow keys to choose.` : "No matches.");
    }, 350);
  };

  const choose = async (hit: AddressHit) => {
    setResolving(hit.id);
    const at = await hit.resolve().catch(() => null);
    setResolving(null);
    if (!at) {
      setStatus("That place has no location on the map. Try another suggestion.");
      return;
    }
    picked.current = true;
    query.current++;
    setText(at.address);
    setOpen(false);
    setHits([]);
    setStatus(`Pin moved to ${at.address}.`);
    onPick(at);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!open || !hits.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? hits.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      void choose(hits[active]!);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const showList = search && open && (loading || hits.length > 0 || text.trim().length >= 3);

  return (
    <Field label="Address" optional hint="Type the building or street, then pick it from the list. The pin moves there.">
      {(p) => (
        <div className="relative">
          <Textarea
            id={p.id}
            aria-describedby={p.describedBy}
            rows={2}
            value={text}
            placeholder="e.g. Four-C Building, San Roque, Cebu City"
            role={search ? "combobox" : undefined}
            aria-autocomplete={search ? "list" : undefined}
            aria-expanded={search ? Boolean(showList) : undefined}
            aria-controls={search ? listId : undefined}
            aria-activedescendant={showList && active >= 0 && hits[active] ? `${listId}-${active}` : undefined}
            autoComplete="off"
            onFocus={() => {
              focused.current = true;
              picked.current = false;
              if (hits.length) setOpen(true);
            }}
            onChange={(e) => {
              picked.current = false;
              setText(e.target.value);
              onText(e.target.value);
              runSearch(e.target.value);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => {
              focused.current = false;
              setOpen(false);
              if (!picked.current) onSettle?.(text);
            }}
          />
          {showList && (
            <div className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-studio-line bg-studio-surface text-studio-ink shadow-[0_12px_32px_rgb(0_0_0/0.14)] [animation:fade-in_120ms_ease-out]">
              <ul id={listId} role="listbox" aria-label="Address suggestions" className="max-h-72 overflow-y-auto p-1.5">
                {hits.map((h, i) => (
                  <li
                    key={h.id}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    // Keep focus in the field so the list doesn't close before the pick.
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => void choose(h)}
                    className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2", i === active && "bg-studio-raised")}
                  >
                    {resolving === h.id ? (
                      <LoaderCircle aria-hidden className="mt-0.5 size-4 shrink-0 animate-spin text-studio-ink-3" />
                    ) : (
                      <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-studio-ink-3" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{h.main}</span>
                      {h.secondary && <span className="block truncate text-2xs text-studio-ink-3">{h.secondary}</span>}
                    </span>
                  </li>
                ))}
                {!hits.length && (
                  <li role="presentation" className="flex items-center gap-2 px-2.5 py-2 text-sm text-studio-ink-3">
                    {loading ? (
                      <>
                        <LoaderCircle aria-hidden className="size-4 animate-spin" /> Searching…
                      </>
                    ) : (
                      "No matches. Keep typing, or move the map to place the pin."
                    )}
                  </li>
                )}
              </ul>
              <p className="border-t border-studio-line px-3 py-1.5 text-right text-[11px] text-studio-ink-3">Suggestions from Google</p>
            </div>
          )}
          <p aria-live="polite" className="sr-only">
            {status}
          </p>
        </div>
      )}
    </Field>
  );
}
