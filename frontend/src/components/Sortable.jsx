/**
 * 可排序的卡片包装器：基于 @dnd-kit/sortable
 */
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "../lib/cn.js";

export function SortableCard({ card, laneName, index, disableDrag, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: "card",
      card,
      fromLane: laneName,
      index,
    },
    disabled: disableDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "being-dragged")}>
      {typeof children === "function"
        ? children({ dragHandleProps: { ...attributes, ...listeners }, isDragging })
        : children}
    </div>
  );
}

/**
 * 可排序的 Lane 包装器（横向重排）
 */
export function SortableLane({ lane, index, disableDrag, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `lane-${lane}`,
    data: { type: "lane", lane, index },
    disabled: disableDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "being-dragged")}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}
