"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Drag-to-reorder list or grid. Works with pointer, touch and keyboard
 * (focus the handle, Space to lift, arrows to move, Space to drop).
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  layout = "list",
  label,
  className,
}: {
  items: T[];
  onReorder: (orderedIds: string[], from: number, to: number) => void;
  renderItem: (item: T, handle: ReactNode, state: { dragging: boolean }) => ReactNode;
  layout?: "list" | "grid";
  label: string;
  className?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((i) => i.id === e.active.id);
    const to = items.findIndex((i) => i.id === e.over!.id);
    onReorder(arrayMove(items, from, to).map((i) => i.id), from, to);
  };

  const name = (id: string | number) => {
    const i = items.findIndex((x) => x.id === id);
    return `item ${i + 1} of ${items.length}`;
  };

  // A stable id keeps dnd-kit's screen-reader ids the same on the server and in the browser.
  const dndId = useId();
  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable: "To reorder, press Space to pick up, use the arrow keys to move, Space to drop, or Escape to cancel.",
        },
        announcements: {
          onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
          onDragOver: ({ over }) => (over ? `Moved to position ${items.findIndex((x) => x.id === over.id) + 1}.` : ""),
          onDragEnd: ({ over }) => (over ? `Dropped at position ${items.findIndex((x) => x.id === over.id) + 1}.` : "Dropped."),
          onDragCancel: () => "Reorder cancelled.",
        },
      }}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={layout === "grid" ? rectSortingStrategy : verticalListSortingStrategy}>
        <ul aria-label={label} className={cn(layout === "grid" ? "grid grid-cols-3 gap-2" : "flex flex-col gap-2", className)}>
          {items.map((item) => (
            <SortableRow key={item.id} id={item.id} label={label}>
              {(handle, dragging) => renderItem(item, handle, { dragging })}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: (handle: ReactNode, dragging: boolean) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Drag to reorder (${label})`}
      className="inline-flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-studio-ink-3 hover:bg-studio-raised hover:text-studio-ink active:cursor-grabbing"
    >
      <GripVertical aria-hidden className="size-4" />
    </button>
  );
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10")}
    >
      {children(handle, isDragging)}
    </li>
  );
}
