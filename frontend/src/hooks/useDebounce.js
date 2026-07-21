import { useEffect, useRef, useState } from "react";

/**
 * 防抖 hook（替代 @solid-primitives/scheduled 的 debounce）
 * @param {any} value - 要防抖的值
 * @param {number} delay - 防抖延迟（毫秒）
 * @returns {any} 防抖后的值
 */
export function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * 防抖回调 hook
 * @param {Function} callback
 * @param {number} delay
 * @returns {Function} 防抖后的回调
 */
export function useDebouncedCallback(callback, delay = 250) {
  const timerRef = useRef(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (...args) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  };
}
