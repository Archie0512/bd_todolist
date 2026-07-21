/**
 * 卡片：单击打开，选择模式下点击切换选中，包含「完成」按钮（仅登录可见）
 * 拖拽由父级 Lane（@dnd-kit/sortable）处理，Card 这里只负责渲染和点击
 */
import { useMemo } from "react";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../lib/cn.js";

function getTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function Card({
  name,
  tags = [],
  dueDate,
  content,
  selectionMode,
  isSelected,
  isAdmin,
  onClick,
  onComplete,
  onSelectionChange,
  onFocus,
  headerSlot,
  t: tProp,
  locale,
  // dnd-kit 透传
  dragHandleProps,
  isDragging,
}) {
  const { t, i18n } = useTranslation();
  const tt = tProp || t;
  const loc = locale || i18n.language;

  const dueDateStatusClass = useMemo(() => {
    if (!dueDate) return "";
    const today = getTodayISO();
    if (dueDate < today) return "text-danger";
    if (dueDate === today) return "text-warning";
    return "text-success";
  }, [dueDate]);

  const dueDateFormatted = useMemo(() => {
    if (!dueDate) return "";
    try {
      const d = new Date(dueDate);
      return d.toLocaleDateString(loc, { month: "short", day: "numeric" });
    } catch {
      return dueDate;
    }
  }, [dueDate, loc]);

  const handleClick = (e) => {
    if (selectionMode) {
      e.stopPropagation();
      onSelectionChange?.(!isSelected);
      return;
    }
    // 避免点击工具栏子元素（按钮、checkbox）时误触发卡片打开
    onClick?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onClick?.();
    }
    // 方向键冒泡到 board 处理
  };

  return (
    <div
      role="button"
      tabIndex={0}
      id={`card-${name}`}
      data-card-name={name}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onFocus={onFocus}
      className={cn(
        "card group relative flex flex-col gap-1.5 cursor-pointer",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        isSelected && "ring-2 ring-accent",
        isDragging && "being-dragged"
      )}
      {...dragHandleProps}
    >
      <div className="card__toolbar flex items-center gap-1">
        <div className="flex-1 min-w-0">{headerSlot}</div>
        {isAdmin && !selectionMode && onComplete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onComplete?.();
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-success/20 text-success"
            title={tt("card.complete")}
            aria-label={tt("card.complete")}
          >
            <Check size={14} />
          </button>
        )}
        {selectionMode && (
          <input
            type="checkbox"
            checked={!!isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelectionChange?.(e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
            className="card__checkbox h-4 w-4 accent-accent"
            aria-label={`select ${name}`}
          />
        )}
      </div>

      {tags?.length > 0 && (
        <ul className="card__tags flex flex-wrap gap-1 list-none p-0 m-0">
          {tags.map((tag, idx) => (
            <li
              key={tag.name + idx}
              className="tag text-[10px]"
              style={{
                backgroundColor: tag.backgroundColor || "var(--color-background-4)",
                color: "#fff",
              }}
            >
              {tag.name}
            </li>
          ))}
        </ul>
      )}

      {content && (
        <h5 className="card__content text-xs text-fg/70 line-clamp-2 m-0 font-normal">
          {content
            .replace(/\[tag:.*?\]\s*/g, "")
            .replace(/\[due:.*?\]\s*/g, "")
            .trim() || ""}
        </h5>
      )}

      {dueDate && (
        <h5
          className={cn(
            "card__due-date text-xs m-0 font-normal flex items-center gap-1",
            dueDateStatusClass
          )}
        >
          {tt("card.due", { date: dueDateFormatted })}
        </h5>
      )}
    </div>
  );
}
