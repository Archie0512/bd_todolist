/**
 * 弹出菜单：支持二段确认（删除前确认）
 * 用绝对定位 + clickOutside 实现（替代原 Solid 的 popover API + use:clickOutside）
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useClickOutside } from "../hooks/useClickOutside.js";
import { handleKeyDown } from "../lib/utils.js";
import { cn } from "../lib/cn.js";

export function Menu({ open, x, y, options, onClose, id }) {
  const menuRef = useRef(null);
  const [pendingOption, setPendingOption] = useState(null);

  const close = () => {
    setPendingOption(null);
    onClose?.();
  };

  useClickOutside(menuRef, close, "mousedown");

  // 打开时聚焦第一个选项
  useEffect(() => {
    if (open && menuRef.current) {
      const firstBtn = menuRef.current.querySelector("button");
      firstBtn?.focus();
    }
  }, [open]);

  // 关闭时清空确认态
  useEffect(() => {
    if (!open) {
      setPendingOption(null);
    }
  }, [open]);

  if (!open) return null;

  const handleOptionClick = (option) => {
    if (option.requiresConfirmation) {
      setPendingOption(option);
      // 延迟聚焦确认按钮
      setTimeout(() => {
        const confirmBtn = menuRef.current?.querySelector("button[data-confirm]");
        confirmBtn?.focus();
      }, 0);
    } else {
      option.onClick?.();
      close();
    }
  };

  const handleConfirm = () => {
    pendingOption?.onClick?.();
    close();
  };

  const isConfirming = !!pendingOption;

  return createPortal(
    <div
      ref={menuRef}
      id={id}
      className={cn(
        "fixed z-[60] min-w-[120px] rounded-md border border-bg-4 bg-bg-2 py-1 shadow-xl",
        "animate-fade-in"
      )}
      style={{ left: x, top: y }}
      role="menu"
    >
      {!isConfirming &&
        options.map((option, idx) => (
          <button
            key={idx}
            type="button"
            role="menuitem"
            onClick={() => handleOptionClick(option)}
            onKeyDown={(e) =>
              handleKeyDown(e, () => handleOptionClick(option), close)
            }
            className={cn(
              "block w-full px-3 py-1.5 text-left text-sm transition-colors",
              "hover:bg-bg-3 focus:bg-bg-3 focus:outline-none",
              option.danger && "text-danger"
            )}
          >
            {option.label}
          </button>
        ))}
      {isConfirming && (
        <div className="px-2 py-1">
          <div className="mb-2 text-xs text-fg/70">
            {pendingOption.confirmText || "确定？"}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              data-confirm="true"
              onClick={handleConfirm}
              className="flex-1 rounded bg-danger px-2 py-1 text-xs text-white hover:brightness-110"
            >
              确认
            </button>
            <button
              type="button"
              onClick={close}
              className="flex-1 rounded bg-bg-4 px-2 py-1 text-xs hover:brightness-110"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
