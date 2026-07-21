/**
 * Board 数据 store：lanes / cards / tags + 所有 CRUD/移动/排序动作
 * 关键原则：本地状态先更新（乐观更新），Supabase 在后台异步同步，不阻塞 UI
 */
import { create } from "zustand";
import { v7 as uuidv7 } from "uuid";
import {
  supabase,
  fetchLanes,
  fetchCards,
  fetchTags,
  createCard as supaCreateCard,
  updateCardContent as supaUpdateContent,
  moveCard as supaMoveCard,
  renameCard as supaRenameCard,
  deleteCard as supaDeleteCard,
  createLane as supaCreateLane,
  renameLane as supaRenameLane,
  deleteLane as supaDeleteLane,
  updateLaneSort,
  updateCardSort,
  parseTagsFromContent,
  parseDueDateFromContent,
} from "../lib/supabase-client";
import {
  addTagToContent,
  removeTagFromContent,
  setDueDateInContent,
  getTagsFromContent,
} from "../lib/card-content-utils";

// 卡片数据规范化：把 DB 行转为前端使用的 card 对象
function normalizeCard(c, tagColorMap) {
  const cardTagNames = parseTagsFromContent(c.content);
  const tagsWithColors = cardTagNames.map((tagName) => ({
    name: tagName,
    backgroundColor: tagColorMap[tagName] || "#6b7280",
  }));
  return {
    id: c.id,
    name: c.name,
    content: c.content || "",
    lane: c.lane_name,
    laneId: c.lane_id,
    tags: tagsWithColors,
    dueDate: parseDueDateFromContent(c.content),
    lastUpdated: c.updated_at,
    createdAt: c.created_at,
    lastMovedAt: c.last_moved_at,
    isSubmitted: c.is_submitted || false,
    // 状态日志相关（来自 cards_with_details 视图）
    lastCompletionRemark: c.last_completion_remark || null,
    lastCompletionAt: c.last_completion_at || null,
    lastCompletionBy: c.last_completion_by || null,
    lastReturnRemark: c.last_return_remark || null,
    lastReturnAt: c.last_return_at || null,
    lastReturnBy: c.last_return_by || null,
    lastStatusChangeAt: c.last_status_change_at || null,
  };
}

export const useBoardStore = create((set, get) => ({
  lanes: [], // 字符串数组（lane 名称）
  laneIds: {}, // { [laneName]: laneId }，用于按名称查找 lane id
  cards: [], // 规范化后的卡片对象数组
  tagsOptions: [], // [{ name, backgroundColor }]
  tagColorMap: {}, // { [tagName]: color }
  isLoading: false,
  error: null,

  // ===== 初始加载 =====
  fetchData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [lanesData, cardsData, tagsData] = await Promise.all([
        fetchLanes(),
        fetchCards(),
        fetchTags(),
      ]);
      const tagColorMap = {};
      tagsData.forEach((t) => {
        tagColorMap[t.name] = t.color;
      });
      const newLanes = lanesData.map((l) => l.name);
      const laneIds = {};
      lanesData.forEach((l) => {
        laneIds[l.name] = l.id;
      });
      const newCards = cardsData.map((c) => normalizeCard(c, tagColorMap));
      set({
        lanes: newLanes,
        laneIds,
        cards: newCards,
        tagsOptions: tagsData.map((t) => ({ name: t.name, backgroundColor: t.color })),
        tagColorMap,
        isLoading: false,
      });
    } catch (err) {
      console.error("Failed to fetch data:", err);
      set({ isLoading: false, error: err.message || "加载数据失败" });
    }
  },

  // ===== 卡片 CRUD =====
  createNewCard: async (lane) => {
    const newCardName = uuidv7();
    const { laneIds } = get();
    const laneId = laneIds[lane];
    if (!laneId) {
      console.error("Lane not found:", lane);
      return null;
    }
    try {
      await supaCreateCard(laneId, newCardName, "");
      await get().fetchData();
      return newCardName;
    } catch (err) {
      console.error("Failed to create card:", err);
      return null;
    }
  },

  deleteCard: (cardId) => {
    // 乐观删除：先本地，后端异步
    set((state) => ({
      cards: state.cards.filter((c) => c.id !== cardId),
    }));
    supaDeleteCard(cardId).catch((err) =>
      console.error("Failed to delete card:", err)
    );
  },

  renameCard: async (oldName, newName) => {
    const newNameWithoutSpaces = newName.replaceAll(" ", "-");
    const { cards } = get();
    const card = cards.find((c) => c.name === oldName);
    if (!card) return null;
    // 乐观更新
    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === card.id ? { ...c, name: newNameWithoutSpaces } : c
      ),
    }));
    supaRenameCard(card.id, newNameWithoutSpaces).catch((err) => {
      console.error("Failed to rename card:", err);
      // 失败时回滚（简单处理：重新拉数据）
      get().fetchData();
    });
    return newNameWithoutSpaces;
  },

  updateCardContent: async (cardId, newContent) => {
    const { tagColorMap } = get();
    // 乐观更新本地
    set((state) => ({
      cards: state.cards.map((c) => {
        if (c.id !== cardId) return c;
        const tagNames = parseTagsFromContent(newContent);
        return {
          ...c,
          content: newContent,
          tags: tagNames.map((name) => ({
            name,
            backgroundColor: tagColorMap[name] || "#6b7280",
          })),
          dueDate: parseDueDateFromContent(newContent),
          lastUpdated: new Date().toISOString(),
        };
      }),
    }));
    // 后台保存
    supaUpdateContent(cardId, newContent).catch((err) =>
      console.error("Failed to update card content:", err)
    );
  },

  // ===== Lane 操作 =====
  createNewLane: async () => {
    const { lanes } = get();
    const newName = `列 ${lanes.length + 1}`;
    try {
      await supaCreateLane(newName);
      await get().fetchData();
      return newName;
    } catch (err) {
      console.error("Failed to create lane:", err);
      return null;
    }
  },

  renameLane: async (oldName, newName) => {
    const newNameWithoutSpaces = newName.replaceAll(" ", "-");
    const { laneIds, cards } = get();
    const laneId = laneIds[oldName];
    if (!laneId) return;
    // 乐观更新
    set((state) => ({
      lanes: state.lanes.map((l) => (l === oldName ? newNameWithoutSpaces : l)),
      laneIds: Object.fromEntries(
        Object.entries(state.laneIds).map(([k, v]) =>
          k === oldName ? [newNameWithoutSpaces, v] : [k, v]
        )
      ),
      cards: state.cards.map((c) =>
        c.lane === oldName ? { ...c, lane: newNameWithoutSpaces } : c
      ),
    }));
    supaRenameLane(laneId, newNameWithoutSpaces).catch((err) => {
      console.error("Failed to rename lane:", err);
      get().fetchData();
    });
  },

  deleteLane: (laneName) => {
    const { laneIds } = get();
    const laneId = laneIds[laneName];
    // 乐观删除
    set((state) => ({
      lanes: state.lanes.filter((l) => l !== laneName),
      cards: state.cards.filter((c) => c.lane !== laneName),
    }));
    if (laneId) {
      supaDeleteLane(laneId).catch((err) =>
        console.error("Failed to delete lane:", err)
      );
    }
  },

  deleteCardsByLane: (laneName) => {
    const { cards } = get();
    const laneCards = cards.filter((c) => c.lane === laneName);
    // 乐观删除
    set((state) => ({
      cards: state.cards.filter((c) => c.lane !== laneName),
    }));
    Promise.all(laneCards.map((c) => supaDeleteCard(c.id))).catch((err) =>
      console.error("Failed to delete cards by lane:", err)
    );
  },

  // ===== 移动卡片 =====
  moveCardToLane: (card, newLane) => {
    if (card.lane === newLane) return;
    // 乐观更新本地
    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === card.id
          ? { ...c, lane: newLane, lastMovedAt: new Date().toISOString() }
          : c
      ),
    }));
    // 后台保存
    const { laneIds } = get();
    const targetLaneId = laneIds[newLane];
    if (targetLaneId) {
      supaMoveCard(card.id, targetLaneId).catch((err) =>
        console.error("Failed to move card:", err)
      );
    }
  },

  // ===== 拖拽排序回调（被 @dnd-kit 调用） =====
  // 改变 lane 顺序（拖动整列）
  handleLanesSortChange: ({ oldIndex, newIndex }) => {
    if (oldIndex === newIndex) return;
    set((state) => {
      const newLanes = [...state.lanes];
      const [moved] = newLanes.splice(oldIndex, 1);
      newLanes.splice(newIndex, 0, moved);
      // 后台持久化 lane sort_order
      const newLanesWithIds = newLanes.map((name, idx) => ({
        id: state.laneIds[name],
        name,
      }));
      updateLaneSort(newLanesWithIds).catch((err) =>
        console.error("Failed to update lane sort:", err)
      );
      return { lanes: newLanes };
    });
  },

  // 改变卡片顺序（拖动单卡，可跨列）
  // changedCard = { cardId, fromLane, toLane, oldIndex, newIndex }
  handleCardsSortChange: ({ cardId, fromLane, toLane, oldIndex, newIndex }) => {
    const { cards, laneIds } = get();
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const movedBetweenLanes = fromLane !== toLane;

    // 乐观更新本地：按 lanes 顺序重排 cards
    set((state) => {
      const updatedCard = {
        ...card,
        lane: toLane,
        lastMovedAt: movedBetweenLanes
          ? new Date().toISOString()
          : card.lastMovedAt,
      };
      // 从原 lane 移除，插入到目标 lane 的 newIndex
      const newCards = state.lanes.flatMap((lane) => {
        let laneCards = state.cards.filter(
          (c) => c.lane === lane && c.id !== cardId
        );
        if (lane === toLane) {
          const insertIdx = Math.min(newIndex, laneCards.length);
          laneCards = [
            ...laneCards.slice(0, insertIdx),
            updatedCard,
            ...laneCards.slice(insertIdx),
          ];
        }
        return laneCards;
      });
      return { cards: newCards };
    });

    // 后台保存
    const targetLaneId = laneIds[toLane];
    if (targetLaneId) {
      updateCardSort(cardId, targetLaneId, newIndex).catch((err) =>
        console.error("Failed to update card sort:", err)
      );
    }
  },

  // 键盘导航：卡片在同列内上下移动
  moveCardInLane: (card, direction) => {
    const { cards } = get();
    const laneCards = cards.filter((c) => c.lane === card.lane);
    const currentIndex = laneCards.findIndex((c) => c.name === card.name);
    if (currentIndex === -1) return;
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= laneCards.length) return;
    get().handleCardsSortChange({
      cardId: card.id,
      fromLane: card.lane,
      toLane: card.lane,
      oldIndex: currentIndex,
      newIndex,
    });
  },

  // ===== 批量操作 =====
  bulkDeleteCards: async (cardKeys) => {
    const { cards } = get();
    const keySet = new Set(cardKeys);
    const cardsToDelete = cards.filter((c) =>
      keySet.has(`${c.lane}/${c.name}`)
    );
    // 乐观删除
    set((state) => ({
      cards: state.cards.filter((c) => !keySet.has(`${c.lane}/${c.name}`)),
    }));
    await Promise.all(cardsToDelete.map((c) => supaDeleteCard(c.id))).catch(
      (err) => console.error("Failed to bulk delete:", err)
    );
  },

  bulkAddTags: async (cardKeys, tagName) => {
    const { cards } = get();
    const keySet = new Set(cardKeys);
    const cardsToUpdate = cards.filter((c) =>
      keySet.has(`${c.lane}/${c.name}`)
    );
    await Promise.all(
      cardsToUpdate.map((card) => {
        const newContent = addTagToContent(card.content, tagName);
        return supaUpdateContent(card.id, newContent);
      })
    ).catch((err) => console.error("Failed to bulk add tags:", err));
    await get().fetchData();
  },

  bulkRemoveTags: async (cardKeys, tagName) => {
    const { cards } = get();
    const keySet = new Set(cardKeys);
    const cardsToUpdate = cards.filter((c) =>
      keySet.has(`${c.lane}/${c.name}`)
    );
    await Promise.all(
      cardsToUpdate.map((card) => {
        const newContent = removeTagFromContent(card.content, tagName);
        return supaUpdateContent(card.id, newContent);
      })
    ).catch((err) => console.error("Failed to bulk remove tags:", err));
    await get().fetchData();
  },

  bulkSetDueDate: async (cardKeys, dueDate) => {
    const { cards } = get();
    const keySet = new Set(cardKeys);
    const cardsToUpdate = cards.filter((c) =>
      keySet.has(`${c.lane}/${c.name}`)
    );
    await Promise.all(
      cardsToUpdate.map((card) => {
        const newContent = setDueDateInContent(card.content, dueDate);
        return supaUpdateContent(card.id, newContent);
      })
    ).catch((err) => console.error("Failed to bulk set due date:", err));
    await get().fetchData();
  },

  // ===== 标签颜色 =====
  updateTagColors: async (newTagColors) => {
    const entries = Object.entries(newTagColors);
    for (const [tagName, color] of entries) {
      await supabase.from("tags").update({ color }).eq("name", tagName);
    }
    await get().fetchData();
  },

  // ===== 辅助方法 =====
  getCardKey: (card) => `${card.lane}/${card.name}`,

  getCardsFromLane: (lane) => get().cards.filter((c) => c.lane === lane),

  getTagsFromContent: getTagsFromContent,

  // 校验名称（与原 App.jsx validateName 一致）
  validateName: (newName, namesList, t) => {
    if (newName === null) return null;
    if (newName === "") return t("validation.mustHaveName");
    if (newName.startsWith(".")) return t("validation.hiddenByDot");
    if (namesList.filter((name) => name === (newName || "").trim()).length) {
      return t("validation.duplicateName");
    }
    if (/[<>:%"/\\|?*]/g.test(newName)) return t("validation.forbiddenChars");
    if (newName.endsWith(".md")) return t("validation.noMdExtension");
    if (newName === "_api") return t("validation.prohibitedName");
    return null;
  },
}));
