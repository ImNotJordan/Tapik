"use client";

/* eslint-disable @next/next/no-img-element -- previews of local uploads */
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, FileText, GripVertical, IndentDecrease, IndentIncrease, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { addMember, patchMember, patchOrgChart, removeMember, setMembers, uploadImage, uploadOrgChartFile } from "@/lib/services/cards";
import type { OrgMember } from "@/lib/types";
import { clamp, cn, initials } from "@/lib/utils";
import { Button, IconButton } from "@/components/ui/button";
import { Segmented } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/dialog";
import { Dropzone, useUploadQueue } from "@/components/ui/dropzone";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useEditor } from "../editor-context";
import { PanelHeader } from "../fields";

const INDENT = 28;

type Flat = { m: OrgMember; depth: number; hasChildren: boolean };

function flatten(members: OrgMember[], collapsed: Set<string>, skip?: string): Flat[] {
  const byParent = new Map<string | null, OrgMember[]>();
  members.forEach((m) => {
    const k = m.parentId && members.some((x) => x.id === m.parentId) ? m.parentId : null;
    byParent.set(k, [...(byParent.get(k) ?? []), m]);
  });
  byParent.forEach((list) => list.sort((a, b) => a.position - b.position));
  const out: Flat[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const m of byParent.get(parent) ?? []) {
      const kids = byParent.get(m.id) ?? [];
      out.push({ m, depth, hasChildren: kids.length > 0 });
      if (!collapsed.has(m.id) && m.id !== skip) walk(m.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

function descendants(members: OrgMember[], id: string): Set<string> {
  const out = new Set<string>();
  const visit = (pid: string) =>
    members.filter((m) => m.parentId === pid).forEach((m) => {
      out.add(m.id);
      visit(m.id);
    });
  visit(id);
  return out;
}

/** Rewrites positions so siblings follow the order they appear in `ordered`. */
function renumber(members: OrgMember[], ordered: string[]): OrgMember[] {
  const rank = new Map(ordered.map((id, i) => [id, i]));
  const groups = new Map<string | null, OrgMember[]>();
  members.forEach((m) => groups.set(m.parentId, [...(groups.get(m.parentId) ?? []), m]));
  const next: OrgMember[] = [];
  groups.forEach((list) =>
    list
      .sort((a, b) => (rank.get(a.id) ?? 1e6 + a.position) - (rank.get(b.id) ?? 1e6 + b.position))
      .forEach((m, i) => next.push({ ...m, position: i })),
  );
  return next;
}

export function OrgPanel() {
  const { bundle, card } = useEditor();
  const chart = bundle.orgChart;
  const mode = chart?.mode ?? "tree";

  return (
    <div className="flex flex-col gap-5">
      <PanelHeader title="Organization chart" description="Show the team behind the card. Build it here, or upload a chart you already have." />
      <Segmented
        label="Chart type"
        value={mode}
        onChange={(v) => patchOrgChart(card.id, { mode: v })}
        className="w-full"
        options={[
          { value: "tree", label: "Build a team tree" },
          { value: "upload", label: "Upload a chart" },
        ]}
      />
      {mode === "tree" ? <TreeBuilder /> : <ChartUpload />}
    </div>
  );
}

function ChartUpload() {
  const { bundle, card } = useEditor();
  const toast = useToast();
  const chart = bundle.orgChart;
  const upload = useCallback((f: File, p: (n: number) => void, signal: AbortSignal) => uploadOrgChartFile(card.id, f, p, signal), [card.id]);
  const done = useCallback(
    (d: { url: string; type: "image" | "pdf" }, f: File) =>
      patchOrgChart(card.id, { fileUrl: d.url, fileType: d.type, fileName: f.name, mode: "upload" }),
    [card.id],
  );
  const q = useUploadQueue(upload, done);

  if (!chart?.fileUrl) {
    return (
      <Dropzone
        accept="image/*,application/pdf"
        title="Upload an organization chart"
        hint="Image or PDF, up to 15 MB"
        icon={<FileText className="size-5" />}
        onFiles={q.add}
        items={q.items}
        onRetry={q.retry}
        onDismiss={q.dismiss}
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {chart.fileType === "pdf" ? (
        <div className="flex items-center gap-3 rounded-xl border border-studio-line p-4">
          <FileText aria-hidden className="size-6 text-studio-ink-2" />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{chart.fileName}</span>
        </div>
      ) : (
        <img src={chart.fileUrl} alt={chart.fileAlt || "Organization chart"} className="w-full rounded-xl border border-studio-line bg-white" />
      )}
      {chart.fileType === "pdf" && (
        <p className="text-2xs text-studio-ink-3">PDFs open in a new tab on the card. In this demo the file is kept only until the page reloads.</p>
      )}
      <Field label="Chart description (alt text)" hint="List the main people and roles so the chart is readable without seeing it.">
        {(p) => (
          <Input id={p.id} aria-describedby={p.describedBy} value={chart.fileAlt ?? ""} onChange={(e) => patchOrgChart(card.id, { fileAlt: e.target.value })} />
        )}
      </Field>
      <div className="flex gap-2">
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-studio-line-strong bg-studio-surface px-4 text-sm font-semibold hover:bg-studio-raised focus-within:outline-2 focus-within:outline-studio-focus">
          Replace file
          <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => e.target.files?.[0] && q.add([e.target.files[0]])} />
        </label>
        <Button
          variant="danger-ghost"
          icon={<Trash2 aria-hidden className="size-4" />}
          onClick={() => {
            const before = { fileUrl: chart.fileUrl, fileType: chart.fileType, fileName: chart.fileName, fileAlt: chart.fileAlt };
            patchOrgChart(card.id, { fileUrl: undefined, fileType: undefined, fileName: undefined });
            toast.success("Chart removed", { action: { label: "Undo", onClick: () => patchOrgChart(card.id, before) } });
          }}
        >
          Remove
        </Button>
      </div>
      {q.items.length > 0 && <Dropzone title="" onFiles={q.add} items={q.items} onRetry={q.retry} onDismiss={q.dismiss} compact />}
    </div>
  );
}

function TreeBuilder() {
  const { bundle, card } = useEditor();
  const toast = useToast();
  const members = bundle.orgMembers;
  const chartId = bundle.orgChart?.id ?? `org_${card.id}`;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [editing, setEditing] = useState<OrgMember | "new" | null>(null);

  const flat = useMemo(() => flatten(members, collapsed, activeId ?? undefined), [members, collapsed, activeId]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const projected = (overId: string | null) => {
    if (!activeId) return null;
    const from = flat.findIndex((f) => f.m.id === activeId);
    const to = overId ? flat.findIndex((f) => f.m.id === overId) : from;
    const moved = arrayMove(flat, from, to);
    const prev = moved[to - 1];
    const next = moved[to + 1];
    const active = flat[from];
    const depth = clamp(active.depth + Math.round(offsetX / INDENT), next ? next.depth : 0, prev ? prev.depth + 1 : 0);
    let parentId: string | null = null;
    if (depth > 0) for (let i = to - 1; i >= 0; i--) if (moved[i].depth === depth - 1) { parentId = moved[i].m.id; break; }
    return { depth, parentId, order: moved.map((f) => f.m.id) };
  };
  const [overId, setOverId] = useState<string | null>(null);
  const proj = projected(overId);

  const commit = (next: OrgMember[], order: string[]) => setMembers(card.id, chartId, renumber(next, order));

  const onDragEnd = (e: DragEndEvent) => {
    const p = projected(e.over ? String(e.over.id) : null);
    setActiveId(null);
    setOffsetX(0);
    setOverId(null);
    if (!p || !activeId) return;
    const next = members.map((m) => (m.id === activeId ? { ...m, parentId: p.parentId } : m));
    commit(next, p.order);
  };

  const indent = (f: Flat, i: number) => {
    // Become the last report of the sibling above.
    const above = flat.slice(0, i).reverse().find((x) => x.depth === f.depth && x.m.parentId === f.m.parentId);
    if (!above) return;
    const next = members.map((m) => (m.id === f.m.id ? { ...m, parentId: above.m.id, position: 999 } : m));
    commit(next, flat.map((x) => x.m.id));
    setCollapsed((c) => {
      const s = new Set(c);
      s.delete(above.m.id);
      return s;
    });
  };
  const outdent = (f: Flat) => {
    const parent = members.find((m) => m.id === f.m.parentId);
    if (!parent) return;
    const next = members.map((m) => (m.id === f.m.id ? { ...m, parentId: parent.parentId, position: parent.position + 0.5 } : m));
    setMembers(card.id, chartId, renumber(next, []));
  };

  const del = (m: OrgMember) => {
    const before = removeMember(card.id, m.id);
    toast.success(`${m.name} removed`, {
      description: members.some((x) => x.parentId === m.id) ? "Their reports moved up one level." : undefined,
      action: { label: "Undo", onClick: () => setMembers(card.id, chartId, before) },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {members.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-studio-line-strong p-5">
          <p className="text-sm font-semibold">No one in the chart yet</p>
          <p className="text-2xs text-studio-ink-3">Start with the most senior person, then add the people who report to them.</p>
        </div>
      ) : (
        <>
          <p className="text-2xs text-studio-ink-3">Drag a person up or down to reorder, and right or left to change who they report to.</p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(e) => {
              setActiveId(String(e.active.id));
              setOverId(String(e.active.id));
            }}
            onDragMove={(e: DragMoveEvent) => setOffsetX(e.delta.x)}
            onDragOver={(e) => setOverId(e.over ? String(e.over.id) : null)}
            onDragEnd={onDragEnd}
            onDragCancel={() => {
              setActiveId(null);
              setOffsetX(0);
            }}
          >
            <SortableContext items={flat.map((f) => f.m.id)} strategy={verticalListSortingStrategy}>
              <ul aria-label="Team tree" className="flex flex-col gap-1.5">
                {flat.map((f, i) => (
                  <TreeRow
                    key={f.m.id}
                    f={f}
                    depth={f.m.id === activeId && proj ? proj.depth : f.depth}
                    collapsed={collapsed.has(f.m.id)}
                    onToggle={() =>
                      setCollapsed((c) => {
                        const s = new Set(c);
                        if (s.has(f.m.id)) s.delete(f.m.id);
                        else s.add(f.m.id);
                        return s;
                      })
                    }
                    canIndent={flat.slice(0, i).some((x) => x.depth === f.depth && x.m.parentId === f.m.parentId)}
                    canOutdent={!!f.m.parentId}
                    onIndent={() => indent(f, i)}
                    onOutdent={() => outdent(f)}
                    onEdit={() => setEditing(f.m)}
                    onDelete={() => del(f.m)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </>
      )}
      <Button className="self-start" icon={<Plus aria-hidden className="size-4" />} onClick={() => setEditing("new")}>
        Add person
      </Button>

      <PersonDialog
        key={editing === "new" ? "new" : editing?.id ?? "closed"}
        open={!!editing}
        person={editing === "new" ? null : editing}
        members={members}
        onClose={() => setEditing(null)}
        onSave={(data) => {
          if (editing === "new") {
            addMember(card.id, data);
            toast.success(`${data.name} added`);
          } else if (editing) {
            patchMember(card.id, editing.id, data);
            toast.success("Changes saved");
          }
          setEditing(null);
        }}
      />
    </div>
  );
}

function TreeRow({
  f,
  depth,
  collapsed,
  onToggle,
  canIndent,
  canOutdent,
  onIndent,
  onOutdent,
  onEdit,
  onDelete,
}: {
  f: Flat;
  depth: number;
  collapsed: boolean;
  onToggle: () => void;
  canIndent: boolean;
  canOutdent: boolean;
  onIndent: () => void;
  onOutdent: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: f.m.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition, paddingLeft: depth * INDENT }} className={cn("relative", isDragging && "z-10")}>
      <div
        className={cn(
          "flex items-center gap-1 rounded-xl border bg-studio-surface py-1 pr-1 pl-0.5",
          isDragging ? "border-studio-action shadow-[0_10px_24px_rgb(0_0_0/0.14)]" : "border-studio-line",
        )}
      >
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Move ${f.m.name}`}
          className="inline-flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-studio-ink-3 hover:bg-studio-raised active:cursor-grabbing"
        >
          <GripVertical aria-hidden className="size-4" />
        </button>
        {f.hasChildren ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? `Show ${f.m.name}’s team` : `Hide ${f.m.name}’s team`}
            className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-studio-ink-2 hover:bg-studio-raised"
          >
            {collapsed ? <ChevronRight aria-hidden className="size-4" /> : <ChevronDown aria-hidden className="size-4" />}
          </button>
        ) : (
          <span className="w-8 shrink-0" />
        )}
        {f.m.photoUrl ? (
          <img src={f.m.photoUrl} alt="" className="size-8 shrink-0 rounded-full object-cover" />
        ) : (
          <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-studio-raised text-2xs font-semibold text-studio-ink-2">
            {initials(f.m.name)}
          </span>
        )}
        <span className="ml-1 flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold">{f.m.name}</span>
          <span className="truncate text-2xs text-studio-ink-3">{f.m.role}</span>
        </span>
        <div className="flex shrink-0">
          <IconButton size="sm" label="Move left: report one level higher" icon={<IndentDecrease aria-hidden />} onClick={onOutdent} disabled={!canOutdent} />
          <IconButton size="sm" label="Move right: report to the person above" icon={<IndentIncrease aria-hidden />} onClick={onIndent} disabled={!canIndent} />
          <IconButton size="sm" label={`Edit ${f.m.name}`} icon={<Pencil aria-hidden />} onClick={onEdit} />
          <IconButton size="sm" variant="danger-ghost" label={`Remove ${f.m.name}`} icon={<Trash2 aria-hidden />} onClick={onDelete} />
        </div>
      </div>
    </li>
  );
}

function PersonDialog({
  open,
  person,
  members,
  onClose,
  onSave,
}: {
  open: boolean;
  person: OrgMember | null;
  members: OrgMember[];
  onClose: () => void;
  onSave: (d: Pick<OrgMember, "name" | "role" | "parentId" | "photoUrl">) => void;
}) {
  const [name, setName] = useState(person?.name ?? "");
  const [role, setRole] = useState(person?.role ?? "");
  const [parentId, setParentId] = useState<string | null>(person?.parentId ?? members.find((m) => !m.parentId)?.id ?? null);
  const [photoUrl, setPhotoUrl] = useState(person?.photoUrl);
  const [tried, setTried] = useState(false);
  const excluded = person ? new Set([person.id, ...descendants(members, person.id)]) : new Set<string>();
  const cardId = useEditor().card.id;
  const upload = useCallback((f: File, p: (n: number) => void, signal: AbortSignal) => uploadImage(f, "org-member", p, { cardId, signal }), [cardId]);
  const done = useCallback((d: { url: string }) => setPhotoUrl(d.url), []);
  const q = useUploadQueue(upload, done);

  const submit = () => {
    setTried(true);
    if (!name.trim() || !role.trim()) return;
    onSave({ name: name.trim(), role: role.trim(), parentId, photoUrl });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={person ? `Edit ${person.name}` : "Add a person"}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={q.busy}>
            {person ? "Save changes" : "Add person"}
          </Button>
        </>
      }
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex items-center gap-4">
          {photoUrl ? (
            <img src={photoUrl} alt="" className="size-16 rounded-full object-cover" />
          ) : (
            <span aria-hidden className="flex size-16 items-center justify-center rounded-full bg-studio-raised text-lg font-semibold text-studio-ink-2">
              {name ? initials(name) : "?"}
            </span>
          )}
          <div className="flex flex-col gap-1">
            <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-studio-line-strong px-3 text-sm font-semibold hover:bg-studio-raised focus-within:outline-2 focus-within:outline-studio-focus">
              {photoUrl ? "Change photo" : "Add photo"}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && q.add([e.target.files[0]])} />
            </label>
            {photoUrl && (
              <button type="button" onClick={() => setPhotoUrl(undefined)} className="self-start text-2xs font-semibold text-studio-danger-ink underline underline-offset-2">
                Remove photo
              </button>
            )}
          </div>
        </div>
        {q.items.length > 0 && <Dropzone title="" onFiles={q.add} items={q.items} onRetry={q.retry} onDismiss={q.dismiss} compact />}
        <Field label="Name" error={tried && !name.trim() ? "Add the person’s name." : null}>
          {(p) => <Input id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} autoFocus value={name} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <Field label="Role" error={tried && !role.trim() ? "Add a role, like Sales Agent." : null}>
          {(p) => <Input id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} value={role} onChange={(e) => setRole(e.target.value)} />}
        </Field>
        <Field label="Reports to">
          {(p) => (
            <Select id={p.id} value={parentId ?? ""} onChange={(e) => setParentId(e.target.value || null)}>
              <option value="">No one (top of the chart)</option>
              {members
                .filter((m) => !excluded.has(m.id))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}, {m.role}
                  </option>
                ))}
            </Select>
          )}
        </Field>
        <button type="submit" className="sr-only">
          Save
        </button>
      </form>
    </Dialog>
  );
}
