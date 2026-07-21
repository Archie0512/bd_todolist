import { useCallback, useState } from "react";

/**
 * 持久化到 localStorage 的 state hook（替代 Solid 的 makePersisted）
 * 键名沿用原项目约定（sort、viewMode_v2、locale_v2 等）
 * @param {string} key - localStorage 键名
 * @param {any} initialValue - 初始值
 * @returns {[any, (v: any | (prev: any) => any) => void]}
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) return initialValue;
      // JSON.parse 失败时回退为原值（兼容旧版存了纯字符串的场景）
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
        } catch {
          // localStorage 不可用时静默失败
        }
        return nextValue;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}
