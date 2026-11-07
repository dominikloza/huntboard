"use client";

import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  type DropAnimation,
  KeyboardCode,
  type KeyboardCoordinateGetter,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type KeyboardEventHandler, useId, useMemo, useRef, useState } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

import { APPLICATION_STATUSES, type ApplicationStatus, STATUS_LABELS } from "../constants";
import {
  type ColumnItems,
  columnDroppableId,
  findColumn,
  moveToColumn,
  type Placement,
  placementOf,
  reorderInColumn,
  toColumnItems,
} from "../lib/move";
import { type MoveInput } from "../schemas";
import { type Application } from "../types";

import { BoardScroller } from "./board-scroller";
import { DragHandle } from "./drag-handle";
import { FolderColumn } from "./folder-column";
import { OfferCard } from "./offer-card";

/**
 * On drop the card is already in its new place (optimistic update), so the lifted copy simply
 * fades out where it was released. The default animation flies it back to the card's starting
 * rect, which after a column change is the old column: it looked like the move was undone.
 */
const dropAnimation: DropAnimation = {
  duration: 140,
  easing: "ease-out",
  keyframes: ({ transform }) => {
    const at = CSS.Transform.toString(transform.initial);
    return [
      { transform: at, opacity: 1 },
      { transform: at, opacity: 0 },
    ];
  },
  sideEffects: null,
};

type BoardColumnsProps = {
  applications: Application[];
  onMove: (move: Omit<MoveInput, "version">) => void;
};

const describe = (card: Application | undefined) =>
  card ? `${card.role}, ${card.company}` : "Karta";

const where = (p: Placement | undefined) =>
  p ? `kolumna ${STATUS_LABELS[p.status]}, pozycja ${p.index} z ${p.size}` : "";

/**
 * The board with drag & drop (ADR 007): mouse, touch (long press) and keyboard.
 * While dragging, the order lives in local state; on drop it becomes one move for the server.
 */
export function BoardColumns({ applications, onMove }: BoardColumnsProps) {
  const dndId = useId();
  const reduceMotion = useReducedMotion();
  const baseItems = useMemo(() => toColumnItems(applications), [applications]);
  const byId = useMemo(() => new Map(applications.map((a) => [a.id, a])), [applications]);

  const [dragItems, setDragItems] = useState<ColumnItems | null>(null);
  /**
   * After a drop the new order is kept on screen until the cache delivers it. TanStack Query
   * notifies components one tick later (setTimeout), and showing the cached order in between made
   * the moved card flash in its old place and the cards left behind jump.
   */
  const [held, setHeld] = useState<{ items: ColumnItems; until: Application[] } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Latest drag state for event handlers and announcements (they run outside render).
  const itemsRef = useRef<ColumnItems>(baseItems);
  const startRef = useRef<Placement | undefined>(undefined);
  const announcedRef = useRef<string>("");
  const items =
    dragItems ?? (held && held.until === applications ? held.items : undefined) ?? baseItems;

  /**
   * Keyboard: Up/Down use the default sortable behaviour (within the column). Left/Right jump
   * to the top of the neighbouring folder; the default getter only looks at the nearest card.
   */
  const keyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
    const step = event.code === KeyboardCode.Right ? 1 : event.code === KeyboardCode.Left ? -1 : 0;
    if (step === 0) return sortableKeyboardCoordinates(event, args);

    event.preventDefault();
    const overId = args.context.over?.id ?? args.active;
    const current = findColumn(itemsRef.current, String(overId));
    const index = current ? APPLICATION_STATUSES.indexOf(current) : -1;
    const target = APPLICATION_STATUSES[index + step];
    const node =
      target && args.context.droppableContainers.get(columnDroppableId(target))?.node.current;
    if (!node) return args.currentCoordinates;
    // On narrow screens the next folder can be scrolled out of view: bring it in first.
    node.scrollIntoView({ block: "nearest", inline: "nearest" });
    const rect = node.getBoundingClientRect();
    return { x: rect.left + 8, y: rect.top + 8 };
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }), // a click still opens the card
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }), // swipe still scrolls
    useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates }),
  );

  const finalItems = (activeIdValue: string, overId: string | undefined) =>
    overId ? reorderInColumn(itemsRef.current, activeIdValue, overId) : itemsRef.current;

  function handleDragStart({ active }: DragStartEvent) {
    const id = String(active.id);
    itemsRef.current = baseItems;
    startRef.current = placementOf(baseItems, id);
    announcedRef.current = where(startRef.current);
    setActiveId(id);
    setDragItems(baseItems);
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const next = moveToColumn(itemsRef.current, String(active.id), String(over.id));
    if (next) {
      itemsRef.current = next;
      setDragItems(next);
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const id = String(active.id);
    const final = finalItems(id, over ? String(over.id) : undefined);
    const placement = placementOf(final, id);
    const start = startRef.current;
    setActiveId(null);
    setDragItems(null);
    if (!over || !placement || !start) return;
    const unchanged =
      placement.status === start.status &&
      placement.prevId === start.prevId &&
      placement.nextId === start.nextId;
    if (unchanged) return;
    // Hold the dropped order until `applications` changes (optimistic cache update arrives).
    setHeld({ items: final, until: applications });
    onMove({ id, status: placement.status, prevId: placement.prevId, nextId: placement.nextId });
  }

  function handleDragCancel() {
    setActiveId(null);
    setDragItems(null);
  }

  const activeCard = activeId ? byId.get(activeId) : undefined;

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCorners}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "Aby przenieść kartę, naciśnij spację lub Enter. Strzałki w górę i w dół zmieniają miejsce w kolumnie, w lewo i w prawo zmieniają kolumnę. Spacja lub Enter upuszcza kartę, Escape anuluje.",
        },
        announcements: {
          onDragStart: ({ active }) =>
            `Podniesiono kartę ${describe(byId.get(String(active.id)))}. ${where(startRef.current)}.`,
          onDragOver: ({ active, over }) => {
            // Where the card would land if dropped now. Only speak when that changed
            // (dnd-kit fires "over" a lot).
            const id = String(active.id);
            const place = where(
              placementOf(finalItems(id, over ? String(over.id) : undefined), id),
            );
            if (place === announcedRef.current) return undefined;
            announcedRef.current = place;
            return `${describe(byId.get(id))}: ${place}.`;
          },
          onDragEnd: ({ active, over }) => {
            const id = String(active.id);
            if (!over) return `Upuszczono kartę ${describe(byId.get(id))} poza kolumną. Bez zmian.`;
            return `Przeniesiono kartę ${describe(byId.get(id))}: ${where(placementOf(finalItems(id, String(over.id)), id))}.`;
          },
          onDragCancel: ({ active }) =>
            `Anulowano. Karta ${describe(byId.get(String(active.id)))} wraca na swoje miejsce: ${where(startRef.current)}.`,
        },
      }}
    >
      <BoardScroller label="Kartoteka aplikacji, przewijana w poziomie">
        {APPLICATION_STATUSES.map((status) => (
          <DroppableFolder
            key={status}
            status={status}
            ids={items[status]}
            dragging={activeId != null}
          >
            {items[status].map((id) => {
              const card = byId.get(id);
              return card ? (
                <SortableCard key={id} application={card} reduceMotion={reduceMotion} />
              ) : null;
            })}
          </DroppableFolder>
        ))}
      </BoardScroller>

      <DragOverlay dropAnimation={reduceMotion ? null : dropAnimation}>
        {activeCard ? (
          <OfferCard
            application={activeCard}
            className={cn("cursor-grabbing shadow-hard", !reduceMotion && "-rotate-2")}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DroppableFolder({
  status,
  ids,
  dragging,
  children,
}: {
  status: ApplicationStatus;
  ids: string[];
  dragging: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnDroppableId(status) });
  return (
    <SortableContext id={status} items={ids} strategy={verticalListSortingStrategy}>
      <FolderColumn
        title={STATUS_LABELS[status]}
        count={ids.length}
        active={status === "interview" && ids.length > 0}
        bodyRef={setNodeRef}
        highlighted={dragging && isOver}
      >
        {children}
      </FolderColumn>
    </SortableContext>
  );
}

function SortableCard({
  application,
  reduceMotion,
}: {
  application: Application;
  reduceMotion: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: application.id,
    attributes: { roleDescription: "karta do przeniesienia" },
    transition: reduceMotion ? null : undefined,
  });

  // Mouse and touch start a drag anywhere on the card; the keyboard only from the handle,
  // so Tab still reaches the card's link normally.
  const { onKeyDown, ...pointerListeners } = listeners ?? {};

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(isDragging && "opacity-40")}
      {...pointerListeners}
    >
      <OfferCard
        application={application}
        href={`/board/app/${application.id}`}
        handle={
          <DragHandle
            ref={setActivatorNodeRef}
            label={`Przenieś kartę: ${application.role}, ${application.company}`}
            {...attributes}
            onKeyDown={onKeyDown as KeyboardEventHandler<HTMLButtonElement> | undefined}
          />
        }
      />
    </div>
  );
}

/** Shaped like the real board, so nothing jumps when data arrives. */
export function BoardSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Ładuję kartotekę...</span>
      <div aria-hidden className="overflow-hidden pb-2">
        <div className="grid min-w-[1060px] grid-cols-5 gap-3.5">
          {APPLICATION_STATUSES.map((status) => (
            <div key={status} className="flex flex-col">
              <div className="h-[30px] w-28 rounded-t-tab border-[1.5px] border-b-0 border-ink bg-card" />
              <div className="flex min-h-[420px] flex-col gap-2.5 border-[1.5px] border-ink bg-folder p-2.5">
                {[0, 1].map((i) => (
                  <div key={i} className="h-[92px] animate-pulse border border-border bg-card" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
