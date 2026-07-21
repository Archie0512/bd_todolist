import { useEffect, useState, useRef, useCallback } from "react";

/**
 * 点击外部触发的 hook（替代 Solid 的 use:clickOutside 指令）
 * @param {React.RefObject<HTMLElement>} ref - 目标元素的 ref
 * @param {(e: MouseEvent|TouchEvent) => void} handler - 点击外部时的回调
 * @param {"mousedown"|"click"} [eventType="mousedown"] - 监听的事件类型
 */
export function useClickOutside(ref, handler, eventType = "mousedown") {
  useEffect(() => {
    if (!ref?.current || typeof handler !== "function") return;

    const listener = (event) => {
      const el = ref.current;
      if (!el || el.contains(event.target)) return;
      handler(event);
    };

    document.addEventListener(eventType, listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener(eventType, listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler, eventType]);
}
