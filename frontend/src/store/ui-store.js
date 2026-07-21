/**
 * UI 偏好 store：搜索、排序、视图模式、选择模式、主题、焦点、帮助对话框
 * 持久化部分使用 zustand/middleware/persist
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

// 仅持久化以下字段到 localStorage
const PERSIST_KEYS = ["sort", "sortDirection", "filteredTag", "viewMode", "theme"];

export const useUiStore = create(
  persist(
    (set, get) => ({
      // ===== 持久化字段 =====
      sort: "none", // none | name | tags | due | lastUpdated | createdFirst
      sortDirection: "asc",
      filteredTag: null,
      viewMode: "tight", // extended | regular | compact | tight
      theme: "auto", // auto | light | dark

      // ===== 临时 UI 字段（不持久化） =====
      search: "",
      selectionMode: false,
      selectedCards: new Set(),
      focusedCardId: null,
      focusedLaneIndex: null,
      hasAutoFocusedFirstCard: false,
      showHelpDialog: false,
      renderUID: null, // 用于强制 DnD 容器重渲染（保留原项目机制）

      // ===== Actions =====
      setSearch: (search) => set({ search }),
      setSort: (sort) => set({ sort }),
      setSortDirection: (dir) => set({ sortDirection: dir }),
      setSortFromSelect: (value) => {
        if (value === "none") {
          set({ sort: "none", sortDirection: "asc" });
        } else {
          const [s, d] = value.split(":");
          set({ sort: s, sortDirection: d });
        }
      },
      setFilteredTag: (tag) => set({ filteredTag: tag }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setTheme: (theme) => set({ theme }),

      setSelectionMode: (mode) =>
        set((state) => ({
          selectionMode: mode,
          // 退出选择模式时清空已选
          selectedCards: mode ? state.selectedCards : new Set(),
        })),

      setSelectedCards: (updater) =>
        set((state) => ({
          selectedCards:
            typeof updater === "function" ? updater(state.selectedCards) : updater,
        })),

      toggleCardSelection: (cardKey, isSelected) =>
        set((state) => {
          const next = new Set(state.selectedCards);
          if (isSelected) next.add(cardKey);
          else next.delete(cardKey);
          return { selectedCards: next };
        }),

      clearSelection: () => set({ selectedCards: new Set() }),

      setFocusedCardId: (id) => set({ focusedCardId: id, focusedLaneIndex: null }),
      setFocusedLaneIndex: (idx) => set({ focusedLaneIndex: idx, focusedCardId: null }),
      clearFocus: () => set({ focusedCardId: null, focusedLaneIndex: null }),
      setHasAutoFocusedFirstCard: (v) => set({ hasAutoFocusedFirstCard: v }),

      setShowHelpDialog: (show) => set({ showHelpDialog: show }),
      setRenderUID: (uid) => set({ renderUID: uid }),

      // 派生 getter（非 zustand 内置 selector，组件内调用即可）
      getSortSelectValue: () => {
        const { sort, sortDirection } = get();
        return sort === "none" ? "none" : `${sort}:${sortDirection}`;
      },
    }),
    {
      name: "ui-store-v2",
      // 仅持久化 PERSIST_KEYS 列出的字段，避免临时 UI 状态被存
      partialize: (state) =>
        PERSIST_KEYS.reduce((acc, key) => {
          acc[key] = state[key];
          return acc;
        }, {}),
      // Set 不能直接 JSON 序列化，但 PERSIST_KEYS 不含 selectedCards，所以无需自定义 storage
    }
  )
);

/**
 * 应用主题：根据 store.theme 设置 <html data-theme>
 * - "auto"：移除 data-theme，跟随 prefers-color-scheme
 * - "light"/"dark"：设置 data-theme 对应值
 * 在 App 顶层调用一次，并在 theme 变化时重新应用
 */
export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "auto") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}
