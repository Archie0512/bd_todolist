import { clsx } from "clsx";

/**
 * 类名合并工具（基于 clsx）
 * 用法：cn("btn", isActive && "btn--active", { "is-disabled": disabled })
 */
export function cn(...args) {
  return clsx(...args);
}
