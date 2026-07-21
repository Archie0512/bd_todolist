/**
 * 通用工具函数（从原 SolidJS 项目的 utils.js 迁移，去掉了 Solid 依赖）
 * - getButtonCoordinates: 计算弹出菜单位置，自动避免超出视口右侧
 * - handleKeyDown: Enter 确认 / Escape 取消 / 方向键聚焦兄弟节点
 * - useLongPress: 触摸长按 hook（用于移动端拖拽激活）
 */
import { useCallback, useEffect, useRef } from "react";

export function getButtonCoordinates(event, menuWidth = 90) {
  const button = event.currentTarget;
  const rect = button.getBoundingClientRect();
  let x = rect.left;
  if (x + menuWidth > window.innerWidth) {
    x = window.innerWidth - menuWidth - 8;
  }
  return { x, y: rect.bottom + 4 };
}

/**
 * 输入框/按钮的键盘处理：Enter 确认 / Esc 取消 / 方向键聚焦兄弟
 * @param {KeyboardEvent} e
 * @param {Function} enterCallback
 * @param {Function|null} [cancelCallback]
 */
export function handleKeyDown(e, enterCallback, cancelCallback) {
  if (!e) return;
  if (e.key === "Enter") {
    e.preventDefault();
    if (typeof enterCallback === "function") enterCallback(e);
  } else if (e.key === "Escape") {
    e.preventDefault();
    if (typeof cancelCallback === "function") cancelCallback(e);
  } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const target = e.currentTarget;
    const siblings = Array.from(
      target.parentElement?.children || []
    ).filter((el) => el !== target && el.tagName === target.tagName);
    const currentIndex = siblings.indexOf(target);
    const nextIndex =
      e.key === "ArrowDown"
        ? Math.min(currentIndex + 1, siblings.length - 1)
        : Math.max(currentIndex - 1, 0);
    if (siblings[nextIndex]) {
      siblings[nextIndex].focus();
    }
  }
}

/**
 * 触摸长按 hook（替代原 SolidJS 的 useLongPress）
 * @param {Function} callback - 长按触发后的回调
 * @param {number} [pressDuration=500] - 长按阈值（毫秒）
 * @returns {{onTouchStart: Function, onTouchEnd: Function, onTouchMove: Function}}
 */
export function useLongPress(callback, pressDuration = 500) {
  const timerRef = useRef(null);

  const start = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (typeof callback === "function") {
        callback();
        if (navigator.vibrate) navigator.vibrate(300);
      }
    }, pressDuration);
  }, [callback, pressDuration]);

  const end = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const move = useCallback(() => {
    end();
  }, [end]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: end,
    onTouchMove: move,
  };
}
