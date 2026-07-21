/**
 * App 主组件：
 * - 编排 Header / BulkToolbar / Lanes / ExpandedCard / 对话框
 * - 键盘导航（h/j/k/l、方向键、Alt+方向移动、n/r/d/e/?/Esc）
 * - URL 路由：/<cardname>.md 打开 ExpandedCard
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableLane, SortableCard } from "./components/Sortable.jsx";
import { Header } from "./components/Header.jsx";
import { BulkOperationsToolbar } from "./components/BulkOperationsToolbar.jsx";
import { LaneName } from "./components/LaneName.jsx";
import { Card } from "./components/Card.jsx";
import { CardName } from "./components/CardName.jsx";
import { NameInput } from "./components/NameInput.jsx";
import { ExpandedCard } from "./components/ExpandedCard.jsx";
import { LoginDialog } from "./components/LoginDialog.jsx";
import { KeyboardHelpDialog } from "./components/KeyboardHelpDialog.jsx";
import { useBoardStore } from "./store/board-store.js";
import { useAuthStore } from "./store/auth-store.js";
import { useUiStore, applyTheme } from "./store/ui-store.js";

// 读取 URL 后缀（.md = 打开卡片）
function useSelectedCard() {
  const location = useLocation();
  const cards = useBoardStore((s) => s.cards);
  return useMemo(() => {
    let pathname = location.pathname;
    if (pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    if (!pathname.endsWith(".md")) return null;
    const cardName = decodeURIComponent(pathname.split("/").pop().replace(/\.md$/, ""));
    return cards.find((c) => c.name === cardName) || null;
  }, [location.pathname, cards]);
}

/**
 * 单个 Lane 子组件（含 droppable 容器接收卡片）
 */
function Lane({ lane, index, cardsInLane, disableCardsDrag, ...handlers }) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({
    id: `lane-content-${lane}`,
    data: { type: "lane-content", laneName: lane },
  });

  return (
    <SortableLane lane={lane} index={index} disableDrag={disableCardsDrag}>
      <div
        className="lane flex flex-col w-72 min-w-[18rem] max-h-full bg-bg-2 rounded-lg border border-bg-3"
        id={`lane-${lane}`}
        tabIndex={0}
        onFocus={() => handlers.onLaneFocus(index)}
      >
        <header className="lane__header p-3 border-b border-bg-3 flex items-center gap-2">
          {handlers.laneBeingRenamed === lane ? (
            <NameInput
              value={handlers.newLaneName}
              errorMsg={handlers.getLaneErrorMsg(lane)}
              onChange={handlers.setNewLaneName}
              onConfirm={handlers.onRenameLaneConfirm}
              onCancel={handlers.onRenameLaneCancel}
              className="flex-1"
            />
          ) : (
            <LaneName
              name={lane}
              count={cardsInLane.length}
              t={t}
              onRenameBtnClick={() => handlers.onRenameLane(lane)}
              onCreateNewCardBtnClick={() => handlers.onCreateNewCard(lane)}
              onDelete={() => handlers.onDeleteLane(lane)}
              onDeleteCards={() => handlers.onDeleteCardsByLane(lane)}
            />
          )}
        </header>
        <SortableContext
          items={cardsInLane.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            ref={setNodeRef}
            className={`lane__content flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px] ${
              isOver ? "dragging-over" : ""
            }`}
          >
            {cardsInLane.length === 0 ? (
              <div className="text-xs text-fg/30 text-center py-8">-</div>
            ) : (
              cardsInLane.map((card, cardIdx) => (
                <SortableCard
                  key={card.id}
                  card={card}
                  laneName={lane}
                  index={cardIdx}
                  disableDrag={disableCardsDrag}
                >
                  {({ dragHandleProps, isDragging }) => (
                    <Card
                      name={card.name}
                      tags={card.tags}
                      dueDate={card.dueDate}
                      content={card.content}
                      selectionMode={handlers.selectionMode}
                      isSelected={handlers.selectedCards.has(
                        `${card.lane}/${card.name}`
                      )}
                      isAdmin={handlers.isAdmin}
                      t={t}
                      locale={handlers.locale}
                      onClick={() => handlers.onCardClick(card)}
                      onComplete={() => handlers.onCardComplete(card)}
                      onSelectionChange={(sel) =>
                        handlers.onToggleCardSelection(
                          `${card.lane}/${card.name}`,
                          sel
                        )
                      }
                      onFocus={() => handlers.onCardFocus(card.name)}
                      isDragging={isDragging}
                      dragHandleProps={dragHandleProps}
                      headerSlot={
                        handlers.cardBeingRenamed?.id === card.id ? (
                          <NameInput
                            value={handlers.newCardName}
                            errorMsg={handlers.getCardNameErrorMsg(card)}
                            onChange={handlers.setNewCardName}
                            onConfirm={() => handlers.onRenameCardConfirm(card)}
                            onCancel={handlers.onRenameCardCancel}
                          />
                        ) : (
                          <CardName
                            name={card.name}
                            hasContent={!!card.content}
                            t={t}
                            onRenameBtnClick={() => handlers.onRenameCard(card)}
                            onDelete={() => handlers.onDeleteCard(card)}
                            onClick={() => handlers.onCardClick(card)}
                          />
                        )
                      }
                    />
                  )}
                </SortableCard>
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </SortableLane>
  );
}

function App() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const mainContainerRef = useRef(null);

  // board store
  const {
    lanes,
    cards,
    tagsOptions,
    fetchData,
    createNewCard,
    deleteCard,
    renameCard,
    moveCardToLane,
    moveCardInLane,
    createNewLane,
    renameLane,
    deleteLane,
    deleteCardsByLane,
    bulkDeleteCards,
    bulkAddTags,
    bulkRemoveTags,
    bulkSetDueDate,
    handleLanesSortChange,
    handleCardsSortChange,
    validateName,
  } = useBoardStore();

  // auth store
  const {
    isAdmin,
    showLoginDialog,
    logout,
    setShowLoginDialog,
    initAuth,
  } = useAuthStore();

  // ui store
  const {
    search,
    sort,
    sortDirection,
    filteredTag,
    viewMode,
    theme,
    selectionMode,
    selectedCards,
    focusedCardId,
    focusedLaneIndex,
    showHelpDialog,
    setSearch,
    setSortFromSelect,
    setFilteredTag,
    setViewMode,
    setSelectionMode,
    toggleCardSelection,
    clearSelection,
    setFocusedCardId,
    setFocusedLaneIndex,
    clearFocus,
    setShowHelpDialog,
  } = useUiStore();

  const selectedCard = useSelectedCard();

  // 内联重命名状态（不入全局 store）
  const [laneBeingRenamed, setLaneBeingRenamed] = useState(null);
  const [newLaneName, setNewLaneName] = useState("");
  const [cardBeingRenamed, setCardBeingRenamed] = useState(null);
  const [newCardName, setNewCardName] = useState("");
  const [activeDrag, setActiveDrag] = useState(null);

  // ===== 初始化 =====
  useEffect(() => {
    initAuth();
    fetchData();
    const url = window.location.href;
    if (!url.match(/\/$/)) {
      window.history.replaceState(null, "", `${url}/`);
    }
  }, [initAuth, fetchData]);

  // 应用主题
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // 应用视图模式
  useEffect(() => {
    document.body.className = document.body.className.replace(/view-mode-\w+/g, "");
    document.body.classList.add(`view-mode-${viewMode}`);
  }, [viewMode]);

  // 退出选择模式时清空已选
  useEffect(() => {
    if (!selectionMode) clearSelection();
  }, [selectionMode, clearSelection]);

  useEffect(() => {
    document.title = "工作任务清单";
  }, []);

  // ===== 派生：排序 + 筛选 =====
  const sortedCards = useMemo(() => {
    if (sort === "none") return cards;
    const sorted = [...cards];
    const dir = sortDirection === "asc" ? 1 : -1;
    switch (sort) {
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name) * dir);
        break;
      case "tags":
        sorted.sort((a, b) =>
          (a.tags?.[0]?.name || "").localeCompare(b.tags?.[0]?.name || "") * dir
        );
        break;
      case "due":
        sorted.sort((a, b) => (a.dueDate || "z").localeCompare(b.dueDate || "z") * dir);
        break;
      case "lastUpdated":
        sorted.sort((a, b) => (b.lastUpdated || "").localeCompare(a.lastUpdated || ""));
        break;
      case "createdFirst":
        sorted.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
        break;
      default:
        break;
    }
    return sorted;
  }, [cards, sort, sortDirection]);

  const filteredCards = useMemo(() => {
    return sortedCards
      .filter(
        (card) =>
          card.name.toLowerCase().includes(search.toLowerCase()) ||
          (card.content || "").toLowerCase().includes(search.toLowerCase())
      )
      .filter(
        (card) =>
          !filteredTag ||
          card.tags?.some(
            (tag) => tag.name.toLowerCase() === filteredTag.toLowerCase()
          )
      );
  }, [sortedCards, search, filteredTag]);

  const getCardsFromLaneFiltered = (lane) =>
    filteredCards.filter((c) => c.lane === lane);

  // ===== DnD 传感器 =====
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 500, tolerance: 5 },
  });
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  });
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(touchSensor, pointerSensor, keyboardSensor);

  const handleDragStart = (event) => setActiveDrag(event.active);
  const handleDragCancel = () => setActiveDrag(null);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveDrag(null);
    if (!over) return;

    if (active.data.current?.type === "lane") {
      if (over.data.current?.type !== "lane") return;
      if (active.id === over.id) return;
      handleLanesSortChange({
        oldIndex: active.data.current.index,
        newIndex: over.data.current.index,
      });
      return;
    }

    if (active.data.current?.type === "card") {
      const fromLane = active.data.current.fromLane;
      const cardId = active.id;
      let toLane = over.data.current?.laneName;
      let newIndex = over.data.current?.index;
      if (over.data.current?.type === "lane-content") {
        toLane = over.data.current.laneName;
        newIndex = getCardsFromLaneFiltered(toLane).length;
      }
      if (!toLane) return;
      handleCardsSortChange({
        cardId,
        fromLane,
        toLane,
        oldIndex: active.data.current.index,
        newIndex,
      });
    }
  };

  // ===== 卡片操作 =====
  const navigateToCard = (card) => {
    navigate(`/${encodeURIComponent(card.name)}.md`);
  };

  const handleCardClick = (card) => {
    if (selectionMode) return;
    navigateToCard(card);
  };

  const handleCardComplete = (card) => {
    if (!isAdmin) return;
    navigateToCard(card);
  };

  const handleDeleteCard = (card) => deleteCard(card.id);
  const handleDeleteLane = (lane) => deleteLane(lane);
  const handleDeleteCardsByLane = (lane) => deleteCardsByLane(lane);

  const handleRenameCard = (card) => {
    setCardBeingRenamed(card);
    setNewCardName(card.name);
  };
  const handleRenameCardConfirm = async (card) => {
    const error = validateName(
      newCardName,
      cards.filter((c) => c.name !== card.name).map((c) => c.name),
      t
    );
    if (error) return;
    const newName = await renameCard(card.name, newCardName);
    setCardBeingRenamed(null);
    setNewCardName("");
    if (newName) navigate(`/${encodeURIComponent(newName)}.md`);
  };
  const handleRenameCardCancel = () => {
    setCardBeingRenamed(null);
    setNewCardName("");
  };

  const handleRenameLane = (lane) => {
    setLaneBeingRenamed(lane);
    setNewLaneName(lane);
  };
  const handleRenameLaneConfirm = async () => {
    const error = validateName(
      newLaneName,
      lanes.filter((l) => l !== laneBeingRenamed),
      t
    );
    if (error) return;
    await renameLane(laneBeingRenamed, newLaneName);
    setLaneBeingRenamed(null);
    setNewLaneName("");
  };
  const handleRenameLaneCancel = () => {
    setLaneBeingRenamed(null);
    setNewLaneName("");
  };

  const getLaneErrorMsg = (currentLane) =>
    validateName(
      newLaneName,
      lanes.filter((l) => l !== currentLane),
      t
    );

  const getCardNameErrorMsg = (currentCard) =>
    validateName(
      newCardName,
      cards.filter((c) => c.id !== currentCard.id).map((c) => c.name),
      t
    );

  const handleCreateNewCard = async (lane) => {
    const newCardName = await createNewCard(lane);
    if (newCardName) navigate(`/${encodeURIComponent(newCardName)}.md`);
  };

  const handleCreateNewLane = async () => {
    const newName = await createNewLane();
    if (newName) {
      setLaneBeingRenamed(newName);
      setNewLaneName(newName);
    }
  };

  const exportToCSV = () => {
    if (!cards.length) return;
    const headers = [
      "分类(Lane)",
      "任务名称(Task)",
      "标签(Tags)",
      "截止日期(Due Date)",
      "任务内容(Content)",
      "创建时间(Created)",
      "最后更新(Updated)",
    ];
    const rows = cards.map((card) => {
      const cleanContent = (card.content || "")
        .replace(/\[tag:.*?\]\s*/g, "")
        .replace(/\[due:.*?\]\s*/g, "")
        .replace(/\n/g, " ")
        .replace(/\r/g, "")
        .replace(/"/g, '""')
        .trim();
      return [
        card.lane || "",
        card.name || "",
        (card.tags || []).map((tag) => tag.name).join("; "),
        card.dueDate || "",
        cleanContent,
        card.createdAt ? new Date(card.createdAt).toLocaleString("zh-CN") : "",
        card.lastUpdated ? new Date(card.lastUpdated).toLocaleString("zh-CN") : "",
      ];
    });
    const csv =
      "\uFEFF" +
      [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell)}"`).join(","))
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tasks_export_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoginLogout = () => {
    if (isAdmin) logout();
    else setShowLoginDialog(true);
  };

  // ===== 批量操作 =====
  const handleBulkDelete = async () => {
    await bulkDeleteCards(Array.from(selectedCards));
    clearSelection();
  };
  const handleBulkAddTags = async (tagName) => {
    await bulkAddTags(Array.from(selectedCards), tagName);
  };
  const handleBulkRemoveTags = async (tagName) => {
    await bulkRemoveTags(Array.from(selectedCards), tagName);
  };
  const handleBulkSetDueDate = async (dueDate) => {
    await bulkSetDueDate(Array.from(selectedCards), dueDate);
  };

  // ===== 焦点 =====
  const handleCardFocus = (name) => setFocusedCardId(name);
  const handleLaneFocus = (index) => setFocusedLaneIndex(index);

  const hasAutoFocused = useRef(false);
  useEffect(() => {
    if (hasAutoFocused.current) return;
    if (!focusedCardId && !selectedCard && lanes.length > 0) {
      const firstLane = lanes[0];
      const firstLaneCards = getCardsFromLaneFiltered(firstLane);
      if (firstLaneCards.length > 0) {
        const firstCard = firstLaneCards[0];
        setTimeout(() => {
          setFocusedCardId(firstCard.name);
          document.getElementById(`card-${firstCard.name}`)?.focus();
          hasAutoFocused.current = true;
        }, 100);
      }
    }
  }, [lanes, focusedCardId, selectedCard, setFocusedCardId]);

  useEffect(() => {
    if (focusedCardId) {
      document.getElementById(`card-${focusedCardId}`)?.focus();
    }
    if (focusedLaneIndex !== null) {
      const laneName = lanes[focusedLaneIndex];
      if (laneName) document.getElementById(`lane-${laneName}`)?.focus();
    }
  }, [focusedCardId, focusedLaneIndex, lanes]);

  const disableCardsDrag = sort !== "none" || selectionMode;

  // ===== 键盘导航 =====
  const handleMainBoardKeyDown = (e) => {
    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA" ||
      e.target.tagName === "SELECT"
    ) {
      return;
    }
    if (selectedCard) return;

    const visibleCards = filteredCards;
    const allowedKeysWithoutCards = ["n", "?", "Escape"];
    if (!visibleCards.length && !allowedKeysWithoutCards.includes(e.key)) return;

    const focusCard = (name) => {
      setFocusedCardId(name);
      setTimeout(() => document.getElementById(`card-${name}`)?.focus(), 0);
    };
    const focusLane = (idx) => {
      setFocusedLaneIndex(idx);
      setTimeout(() => {
        const laneName = lanes[idx];
        if (laneName) document.getElementById(`lane-${laneName}`)?.focus();
      }, 0);
    };

    switch (e.key) {
      case "ArrowDown":
      case "j": {
        e.preventDefault();
        if (focusedCardId) {
          const currentCard = cards.find((c) => c.name === focusedCardId);
          if (currentCard) {
            if (e.altKey) moveCardInLane(currentCard, "down");
            else {
              const laneCards = getCardsFromLaneFiltered(currentCard.lane);
              const idx = laneCards.findIndex((c) => c.name === focusedCardId);
              if (idx < laneCards.length - 1) focusCard(laneCards[idx + 1].name);
            }
          }
        } else if (focusedLaneIndex !== null) {
          const laneName = lanes[focusedLaneIndex];
          const laneCards = getCardsFromLaneFiltered(laneName);
          if (laneCards.length > 0) {
            setFocusedCardId(laneCards[0].name);
            setFocusedLaneIndex(null);
            focusCard(laneCards[0].name);
          }
        } else if (visibleCards.length > 0) {
          focusCard(visibleCards[0].name);
        }
        break;
      }
      case "ArrowUp":
      case "k": {
        e.preventDefault();
        if (focusedCardId) {
          const currentCard = cards.find((c) => c.name === focusedCardId);
          if (currentCard) {
            if (e.altKey) moveCardInLane(currentCard, "up");
            else {
              const laneCards = getCardsFromLaneFiltered(currentCard.lane);
              const idx = laneCards.findIndex((c) => c.name === focusedCardId);
              if (idx > 0) focusCard(laneCards[idx - 1].name);
              else if (idx === 0) {
                const laneIdx = lanes.indexOf(currentCard.lane);
                if (laneIdx !== -1) {
                  setFocusedCardId(null);
                  focusLane(laneIdx);
                }
              }
            }
          }
        } else if (visibleCards.length > 0) {
          focusCard(visibleCards[0].name);
        }
        break;
      }
      case "ArrowRight":
      case "l": {
        e.preventDefault();
        if (focusedCardId) {
          const currentCard = cards.find((c) => c.name === focusedCardId);
          if (currentCard) {
            const laneIdx = lanes.indexOf(currentCard.lane);
            if (e.altKey) {
              if (laneIdx < lanes.length - 1)
                moveCardToLane(currentCard, lanes[laneIdx + 1]);
            } else {
              for (let i = laneIdx + 1; i < lanes.length; i++) {
                const nextLaneCards = getCardsFromLaneFiltered(lanes[i]);
                if (nextLaneCards.length > 0) {
                  focusCard(nextLaneCards[0].name);
                  break;
                }
              }
            }
          }
        } else if (focusedLaneIndex !== null) {
          if (e.altKey) {
            if (focusedLaneIndex < lanes.length - 1) {
              handleLanesSortChange({
                oldIndex: focusedLaneIndex,
                newIndex: focusedLaneIndex + 1,
              });
            }
          } else if (focusedLaneIndex < lanes.length - 1) {
            focusLane(focusedLaneIndex + 1);
          }
        } else if (visibleCards.length > 0) {
          focusCard(visibleCards[0].name);
        }
        break;
      }
      case "ArrowLeft":
      case "h": {
        e.preventDefault();
        if (focusedCardId) {
          const currentCard = cards.find((c) => c.name === focusedCardId);
          if (currentCard) {
            const laneIdx = lanes.indexOf(currentCard.lane);
            if (e.altKey) {
              if (laneIdx > 0) moveCardToLane(currentCard, lanes[laneIdx - 1]);
            } else {
              for (let i = laneIdx - 1; i >= 0; i--) {
                const prevLaneCards = getCardsFromLaneFiltered(lanes[i]);
                if (prevLaneCards.length > 0) {
                  focusCard(prevLaneCards[0].name);
                  break;
                }
              }
            }
          }
        } else if (focusedLaneIndex !== null) {
          if (e.altKey) {
            if (focusedLaneIndex > 0) {
              handleLanesSortChange({
                oldIndex: focusedLaneIndex,
                newIndex: focusedLaneIndex - 1,
              });
            }
          } else if (focusedLaneIndex > 0) {
            focusLane(focusedLaneIndex - 1);
          }
        } else if (visibleCards.length > 0) {
          focusCard(visibleCards[0].name);
        }
        break;
      }
      case "Enter":
      case "e": {
        e.preventDefault();
        if (focusedCardId) {
          const card = cards.find((c) => c.name === focusedCardId);
          if (card) navigateToCard(card);
        }
        break;
      }
      case "n": {
        e.preventDefault();
        if (lanes.length > 0) {
          const currentCard = focusedCardId
            ? cards.find((c) => c.name === focusedCardId)
            : null;
          const targetLane = currentCard ? currentCard.lane : lanes[0];
          handleCreateNewCard(targetLane);
        }
        break;
      }
      case "r": {
        e.preventDefault();
        if (focusedCardId) {
          const card = cards.find((c) => c.name === focusedCardId);
          if (card) handleRenameCard(card);
        }
        break;
      }
      case "d": {
        e.preventDefault();
        if (focusedCardId) {
          const card = cards.find((c) => c.name === focusedCardId);
          if (card && window.confirm(`Delete card "${card.name}"?`)) {
            handleDeleteCard(card);
          }
        }
        break;
      }
      case "Escape": {
        e.preventDefault();
        if (showHelpDialog) setShowHelpDialog(false);
        else {
          clearFocus();
          mainContainerRef.current?.focus();
        }
        break;
      }
      case "?": {
        e.preventDefault();
        setShowHelpDialog(true);
        break;
      }
      default:
        break;
    }
  };

  const handleSelectedCardNameChange = async (oldName, newName) => {
    await renameCard(oldName, newName);
  };

  // 拖拽预览
  const renderDragPreview = () => {
    if (!activeDrag) return null;
    const data = activeDrag.data.current;
    if (data?.type === "card") {
      return (
        <div className="card opacity-80 max-w-xs">
          <div className="text-sm font-medium">{data.card.name}</div>
        </div>
      );
    }
    if (data?.type === "lane") {
      return <div className="text-sm font-semibold">{data.lane}</div>;
    }
    return null;
  };

  // 收集已选卡片上的所有标签（给 BulkToolbar 用）
  const tagsOnSelectedCards = useMemo(() => {
    const set = new Set();
    selectedCards.forEach((key) => {
      const [lane, name] = key.split("/");
      const card = cards.find((c) => c.lane === lane && c.name === name);
      card?.tags?.forEach((tag) => set.add(tag.name));
    });
    return Array.from(set);
  }, [selectedCards, cards]);

  return (
    <div
      ref={mainContainerRef}
      tabIndex={-1}
      onKeyDown={handleMainBoardKeyDown}
      className="flex flex-col h-screen outline-none"
    >
      <Header
        search={search}
        onSearchChange={setSearch}
        onSortChange={(e) => setSortFromSelect(e.target.value)}
        tagOptions={tagsOptions.map((opt) => opt.name)}
        filteredTag={filteredTag}
        onTagChange={(e) =>
          setFilteredTag(e.target.value === "none" ? null : e.target.value)
        }
        onNewLaneBtnClick={handleCreateNewLane}
        onViewModeChange={(e) => setViewMode(e.target.value)}
        selectionMode={selectionMode}
        onSelectionModeChange={setSelectionMode}
        isAdmin={isAdmin}
        onLoginLogout={handleLoginLogout}
        onExport={exportToCSV}
        onShowHelp={() => setShowHelpDialog(true)}
      />

      {selectionMode && (
        <BulkOperationsToolbar
          selectedCount={selectedCards.size}
          tagsOptions={tagsOptions.map((opt) => opt.name)}
          tagsOnSelectedCards={tagsOnSelectedCards}
          onDelete={handleBulkDelete}
          onAddTags={handleBulkAddTags}
          onRemoveTags={handleBulkRemoveTags}
          onSetDueDate={handleBulkSetDueDate}
          onClearSelection={clearSelection}
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="lanes flex-1 overflow-auto p-4">
          <SortableContext
            items={lanes.map((l) => `lane-${l}`)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex gap-3 h-full items-stretch">
              {lanes.map((lane, index) => (
                <Lane
                  key={lane}
                  lane={lane}
                  index={index}
                  cardsInLane={getCardsFromLaneFiltered(lane)}
                  disableCardsDrag={disableCardsDrag}
                  selectionMode={selectionMode}
                  selectedCards={selectedCards}
                  isAdmin={isAdmin}
                  locale={i18n.language}
                  laneBeingRenamed={laneBeingRenamed}
                  newLaneName={newLaneName}
                  setNewLaneName={setNewLaneName}
                  getLaneErrorMsg={getLaneErrorMsg}
                  onRenameLane={handleRenameLane}
                  onRenameLaneConfirm={handleRenameLaneConfirm}
                  onRenameLaneCancel={handleRenameLaneCancel}
                  onCreateNewCard={handleCreateNewCard}
                  onDeleteLane={handleDeleteLane}
                  onDeleteCardsByLane={handleDeleteCardsByLane}
                  cardBeingRenamed={cardBeingRenamed}
                  newCardName={newCardName}
                  setNewCardName={setNewCardName}
                  getCardNameErrorMsg={getCardNameErrorMsg}
                  onRenameCard={handleRenameCard}
                  onRenameCardConfirm={handleRenameCardConfirm}
                  onRenameCardCancel={handleRenameCardCancel}
                  onCardClick={handleCardClick}
                  onCardComplete={handleCardComplete}
                  onCardFocus={handleCardFocus}
                  onLaneFocus={handleLaneFocus}
                  onToggleCardSelection={toggleCardSelection}
                  onDeleteCard={handleDeleteCard}
                />
              ))}
            </div>
          </SortableContext>
        </div>
        <DragOverlay>{renderDragPreview()}</DragOverlay>
      </DndContext>

      {selectedCard && (
        <ExpandedCard
          card={selectedCard}
          tagsOptions={tagsOptions}
          onClose={() => {
            navigate("/");
            setTimeout(() => {
              const cardEl = document.getElementById(`card-${selectedCard.name}`);
              if (cardEl) {
                cardEl.focus();
                cardEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
              }
            }, 50);
          }}
          onNameChange={handleSelectedCardNameChange}
          getNameErrorMsg={(newName) =>
            validateName(
              newName,
              cards
                .filter((c) => c.name !== selectedCard.name)
                .map((c) => c.name),
              t
            )
          }
        />
      )}

      <LoginDialog />

      {showHelpDialog && (
        <KeyboardHelpDialog onClose={() => setShowHelpDialog(false)} />
      )}
    </div>
  );
}

export default App;
