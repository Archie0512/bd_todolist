/**
 * 内联重命名输入框：自动聚焦 + 全选 + Enter 确认 / Esc 取消 / 失焦确认
 */
import { useEffect, useRef } from "react";
import { handleKeyDown } from "../lib/utils.js";
import { cn } from "../lib/cn.js";

export function NameInput({
  value,
  errorMsg,
  onChange,
  onConfirm,
  onCancel,
  className,
  datalist,
  list,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(0, value?.length || 0);
    }
  }, [value]);

  const handleConfirm = () => {
    if (!value || errorMsg) {
      onCancel?.();
      return;
    }
    onConfirm?.();
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <input
        ref={inputRef}
        type="text"
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, handleConfirm, onCancel)}
        onBlur={handleConfirm}
        onClick={(e) => e.stopPropagation()}
        list={list}
        className={cn(
          "rounded-md px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          "bg-bg-3 text-fg border border-bg-4",
          errorMsg && "border-danger"
        )}
      />
      {datalist}
      {errorMsg && (
        <div className="absolute left-0 top-full mt-1 text-xs text-danger whitespace-nowrap z-10">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
