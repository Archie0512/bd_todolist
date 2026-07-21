import {
  createSignal,
  For,
  Show,
  onMount,
  createMemo,
  createEffect,
  createResource,
  batch,
} from "solid-js";
import ExpandedCard from "./components/expanded-card";
import { debounce } from "@solid-primitives/scheduled";
import { supabase, fetchLanes, fetchCards, fetchTags, createCard, updateCardContent as supaUpdateContent, moveCard as supaMoveCard, renameCard as supaRenameCard, deleteCard as supaDeleteCard, createLane as supaCreateLane, renameLane as supaRenameLane, deleteLane as supaDeleteLane, updateLaneSort, updateCardSort, signIn, signOut, isAdmin, parseTagsFromContent, parseDueDateFromContent } from "./supabase-client";
import { LaneName } from "./components/lane-name";
import { NameInput } from "./components/name-input";
import { Header } from "./components/header";
import { Card } from "./components/card";
import { CardName } from "./components/card-name";
import { BulkOperationsToolbar } from "./components/bulk-operations-toolbar";
import { makePersisted } from "@solid-primitives/storage";
import { DragAndDrop } from "./components/drag-and-drop";
import { useLocation, useNavigate } from "@solidjs/router";
import { v7 } from "uuid";
import { addTagToContent, removeTagFromContent, setDueDateInContent, getTagsFromContent } from "./card-content-utils";
import "./stylesheets/index.css";
import { KeyboardNavigationDialog } from "./components/keyboard-navigation-dialog";
import { useI18n } from "./i18n";

function App() {
  const [lanes, setLanes] = createSignal([]);
  const [cards, setCards] = createSignal([]);
  const [sort, setSort] = makePersisted(createSignal("none"), {
    storage: localStorage,
    name: "sort",
  });
  const [sortDirection, setSortDirection] = makePersisted(createSignal("asc"), {
    storage: localStorage,
    name: "sortDirection",
  });
  const [search, setSearch] = createSignal("");
  const [filteredTag, setFilteredTag] = makePersisted(createSignal(null), {
    storage: localStorage,
    name: "filteredTag",
  });
  const [tagsOptions, setTagsOptions] = createSignal([]);
  const [laneBeingRenamedName, setLaneBeingRenamedName] = createSignal(null);
  const [newLaneName, setNewLaneName] = createSignal(null);
  const [cardBeingRenamed, setCardBeingRenamed] = createSignal(null);
  const [newCardName, setNewCardName] = createSignal(null);
  const [viewMode, setViewMode] = makePersisted(createSignal("tight"), {
    storage: localStorage,
    name: "viewMode_v2",
  });
  const [renderUID, setRenderUID] = createSignal(v7());
  const [selectionMode, setSelectionMode] = createSignal(false);
  const [selectedCards, setSelectedCards] = createSignal(new Set());
  const [focusedCardId, setFocusedCardId] = createSignal(null);
  const [focusedLaneIndex, setFocusedLaneIndex] = createSignal(null);
  const [hasAutoFocusedFirstCard, setHasAutoFocusedFirstCard] = createSignal(false);
  const [showHelpDialog, setShowHelpDialog] = createSignal(false);
  const [isAdminUser, setIsAdminUser] = createSignal(false);
  const [showLoginDialog, setShowLoginDialog] = createSignal(false);
  const [loginEmail, setLoginEmail] = createSignal("");
  const [loginPassword, setLoginPassword] = createSignal("");
  const [loginError, setLoginError] = createSignal("");
  const { t, locale, setLocale } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  let mainContainerRef;

  const basePath = createMemo(() => {
    if ((import.meta.env.BASE_URL || "").endsWith("/")) {
      return import.meta.env.BASE_URL.substring(
        0,
        import.meta.env.BASE_URL.length - 1
      );
    }
    return import.meta.env.BASE_URL || "";
  });

  const board = createMemo(() => {
    let { pathname } = location || "";
    if (pathname.endsWith(".md") || pathname.endsWith(".md/")) {
      const pathnameParts = pathname.split("/").filter((item) => !!item);
      pathnameParts.pop();
      const concatenatedName = pathnameParts
        .join("/")
        .substring(basePath().length, pathname.length);
      if (!concatenatedName) {
        return "";
      }
      return "/" + concatenatedName;
    }
    if (pathname.endsWith("/")) {
      pathname = pathname.substring(0, pathname.length - 1);
    }
    if (basePath() !== "/") {
      pathname = pathname.substring(basePath().length, pathname.length);
    }
    return pathname;
  });

  const selectedCardName = createMemo(() => {
    let pathname = location.pathname;
    if (location.pathname.endsWith("/")) {
      pathname = pathname.substring(0, pathname.length - 1);
    }
    const cardName = pathname.endsWith(".md") ? pathname.split("/").at(-1) : "";
    return cardName;
  });

  const selectedCard = createMemo(() => {
    const decodedCardName = decodeURIComponent(selectedCardName())
    const card = cards().find(
      (card) => `${card.name}.md` === decodedCardName
    );
    return card;
  });

  function fetchTitle() {
    if (!board()) {
      return Promise.resolve("工作任务清单");
    }
    const boardSplit = board().split("/");
    return decodeURIComponent(boardSplit.at(-1));
  }

  const [title] = createResource(fetchTitle);

  function getTagBackgroundCssColor(tagColor) {
    const backgroundColorNumber = RegExp("[0-9]").exec(`${tagColor || "1"}`)[0];
    const backgroundColor = `var(--color-alt-${backgroundColorNumber})`;
    return backgroundColor;
  }

  async function fetchData() {
    try {
      const [lanesData, cardsData, tagsData] = await Promise.all([
        fetchLanes(), fetchCards(), fetchTags(),
      ]);
      const admin = await isAdmin();
      setIsAdminUser(admin);
      const newLanes = lanesData.map((l) => l.name);
      const tagColorMap = {};
      tagsData.forEach((t) => { tagColorMap[t.name] = t.color; });
      let newCards = cardsData.map((c) => {
        const cardTagNames = parseTagsFromContent(c.content);
        const tagsWithColors = cardTagNames.map((tagName) => ({
          name: tagName, backgroundColor: tagColorMap[tagName] || "#6b7280",
        }));
        return {
          id: c.id, name: c.name, content: c.content || "",
          lane: c.lane_name, laneId: c.lane_id,
          tags: tagsWithColors,
          dueDate: parseDueDateFromContent(c.content),
          lastUpdated: c.updated_at, createdAt: c.created_at,
          lastMovedAt: c.last_moved_at, isSubmitted: c.is_submitted || false,
        };
      });
      setLanes(newLanes.length ? newLanes : []);
      setCards(newCards);
      setTagsOptions(tagsData.map((t) => ({ name: t.name, backgroundColor: t.color })));
    } catch (err) { console.error("Failed to fetch data:", err); }
  }

  function pickTagColorIndexBasedOnHash(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = value.charCodeAt(i) + ((hash << 5) - hash);
    }
    const tagOptionsLength = 7;
    const colorIndex = Math.abs(hash % tagOptionsLength);
    return colorIndex;
  }

  const debounceChangeCardContent = debounce(
    (newContent) => changeCardContent(newContent),
    250
  );

  async function updateTagColors(newTagColors) {
    const entries = Object.entries(newTagColors);
    for (const [tagName, color] of entries) {
      await supabase.from("tags").update({ color }).eq("name", tagName);
    }
    await fetchData();
  }

  async function changeCardContent(newContent) {
    const cardBeingUpdated = selectedCard();
    if (!cardBeingUpdated) return;
    await supaUpdateContent(cardBeingUpdated.id, newContent);
    const newCards = cards().map((c) => {
      if (c.id === cardBeingUpdated.id) {
        const updated = structuredClone(c);
        updated.content = newContent;
        updated.tags = parseTagsFromContent(newContent).map((tagName) => ({
          name: tagName,
          backgroundColor: tagsOptions().find((t) => t.name === tagName)?.backgroundColor || "#6b7280",
        }));
        updated.dueDate = parseDueDateFromContent(newContent);
        updated.lastUpdated = new Date().toISOString();
        return updated;
      }
      return c;
    });
    setCards(newCards);
  }

  // Use shared utility function for getting tags
  const getTagsByCardContent = getTagsFromContent;

  function handleSortSelectOnChange(e) {
    const [newSort, newDirection] = e.target.value === "none" ? ["none", "asc"] : e.target.value.split(":");
    setSort(newSort);
    setSortDirection(newDirection);
  }

  function handleFilterSelectOnChange(e) {
    const value = e.target.value;
    if (value === "none") {
      return setFilteredTag(null);
    }
    setFilteredTag(value);
  }

  async function createNewCard(lane) {
    const newCardName = v7();
    // Fetch lanes to get the correct lane ID
    const lanesData = await fetchLanes();
    const laneObj = lanesData.find((l) => l.name === lane);
    if (!laneObj) { console.error("Lane not found:", lane); return; }
    await createCard(laneObj.id, newCardName, "");
    await fetchData();
    let cardUrl = basePath();
    if (board()) { cardUrl += board(); }
    cardUrl += "/" + encodeURIComponent(newCardName) + ".md";
    navigate(cardUrl);
  }

  function deleteCard(card) {
    supaDeleteCard(card.id);
    const newCards = cards().filter((c) => c.id !== card.id);
    setCards(newCards);
  }

  function moveCardToLane(card, newLane) {
    if (card.lane === newLane) return;
    // Update local state FIRST
    const newCards = structuredClone(cards());
    const cardIdx = newCards.findIndex((c) => c.id === card.id);
    if (cardIdx >= 0) {
      newCards[cardIdx].lane = newLane;
      newCards[cardIdx].lastMovedAt = new Date().toISOString();
    }
    setCards(newCards);
    setTimeout(() => { document.getElementById("card-" + card.name)?.focus(); }, 50);
    // Then save to Supabase in background
    fetchLanes().then((lanesData) => {
      const targetLane = lanesData.find((l) => l.name === newLane);
      if (targetLane) {
        supaMoveCard(card.id, targetLane.id);
      }
    });
  }

  function moveCardInLane(card, direction) {
    const laneCards = cards().filter((c) => c.lane === card.lane);
    const currentIndex = laneCards.findIndex((c) => c.name === card.name);
    if (currentIndex === -1) return;
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= laneCards.length) return;
    handleCardsSortChange({
      id: "card-" + card.name,
      from: "lane-content-" + card.lane,
      to: "lane-content-" + card.lane,
      index: newIndex,
    });
  }

  async function createNewLane() {
    const newName = props.t()('common.lane') + " " + (lanes().length + 1);
    await supaCreateLane(newName);
    await fetchData();
    setNewLaneName(newName);
    setLaneBeingRenamedName(newName);
  }

  async function renameLane() {
    const newLaneNameWithoutSpaces = newLaneName().replaceAll(" ", "-");
    const laneCards = cards().filter((c) => c.lane === laneBeingRenamedName());
    const laneId = laneCards[0]?.laneId;
    if (laneId) { await supaRenameLane(laneId, newLaneNameWithoutSpaces); }
    await fetchData();
    setLaneBeingRenamedName(null);
    setNewLaneName(null);
  }

  function deleteLane(lane) {
    const laneCards = cards().filter((c) => c.lane === lane);
    const laneId = laneCards[0]?.laneId;
    if (laneId) { supaDeleteLane(laneId); }
    const newLanes = lanes().filter((l) => l !== lane);
    const newCards = cards().filter((c) => c.lane !== lane);
    setLanes(newLanes);
    setCards(newCards);
  }

  function sortCardsByName() {
    const newCards = structuredClone(cards());
    return newCards.sort((a, b) =>
      sortDirection() === "asc"
        ? a.name?.localeCompare(b.name)
        : b.name?.localeCompare(a.name)
    );
  }

  function sortCardsByTags() {
    const newCards = structuredClone(cards());
    return newCards.sort((a, b) => {
      const tagNameA = a.tags?.[0]?.name || '';
      const tagNameB = b.tags?.[0]?.name || '';
      return sortDirection() === "asc"
        ? tagNameA.localeCompare(tagNameB)
        : tagNameB.localeCompare(tagNameA);
    });
  }

  function sortCardsByDue() {
    const newCards = structuredClone(cards());
    return newCards.sort((a, b) => {
      return sortDirection() === "asc"
        ? (a.dueDate || "z").localeCompare(b.dueDate || "z")
        : (b.dueDate || "").localeCompare(a.dueDate || "");
    });
  }

  function sortCardsByLastUpdated() {
    const newCards = structuredClone(cards());
    return newCards.sort((a, b) => {
      return (b.lastUpdated || "").localeCompare(a.lastUpdated || "");
    });
  }

  function sortCardsByCreatedFirst() {
    const newCards = structuredClone(cards());
    return newCards.sort((a, b) => {
      return (a.createdAt || "").localeCompare(b.createdAt || "");
    });
  }

  function handleOnSelectedCardNameChange(newName) {
    renameCard(selectedCard().name, newName);
  }

  function handleDeleteCardsByLane(lane) {
    const laneCards = cards().filter((c) => c.lane === lane);
    laneCards.forEach((card) => supaDeleteCard(card.id));
    const newCards = cards().filter((c) => c.lane !== lane);
    setCards(newCards);
  }

  // Bulk operations functions
  function toggleCardSelection(cardKey, isSelected) {
    const newSelected = new Set(selectedCards());
    if (isSelected) {
      newSelected.add(cardKey);
    } else {
      newSelected.delete(cardKey);
    }
    setSelectedCards(newSelected);
  }

  function clearSelection() {
    setSelectedCards(new Set());
  }

  function getCardKey(card) {
    return `${card.lane}/${card.name}`;
  }

  // Get tags that exist on selected cards (for remove tags dropdown)
  const tagsOnSelectedCards = createMemo(() => {
    const selectedCardsList = cards().filter((card) =>
      selectedCards().has(getCardKey(card))
    );

    const allTagsOnSelected = new Set();
    selectedCardsList.forEach((card) => {
      const cardTags = getTagsFromContent(card.content || "");
      cardTags.forEach((tag) => allTagsOnSelected.add(tag));
    });

    return Array.from(allTagsOnSelected);
  });

  async function bulkDeleteCards() {
    const cardsToDelete = cards().filter((card) => selectedCards().has(getCardKey(card)));
    await Promise.all(cardsToDelete.map((card) => supaDeleteCard(card.id)));
    const newCards = cards().filter((card) => !selectedCards().has(getCardKey(card)));
    setCards(newCards);
    setSelectedCards(new Set());
  }

  async function bulkAddTags(tagName) {
    const cardsToUpdate = cards().filter((card) => selectedCards().has(getCardKey(card)));
    await Promise.all(cardsToUpdate.map((card) => {
      const newContent = addTagToContent(card.content, tagName);
      return supaUpdateContent(card.id, newContent);
    }));
    await fetchData();
  }

  async function bulkRemoveTags(tagName) {
    const cardsToUpdate = cards().filter((card) => selectedCards().has(getCardKey(card)));
    await Promise.all(cardsToUpdate.map((card) => {
      const newContent = removeTagFromContent(card.content, tagName);
      return supaUpdateContent(card.id, newContent);
    }));
    await fetchData();
  }

  async function bulkSetDueDate(dueDate) {
    const cardsToUpdate = cards().filter((card) => selectedCards().has(getCardKey(card)));
    await Promise.all(cardsToUpdate.map((card) => {
      const newContent = setDueDateInContent(card.content, dueDate);
      return supaUpdateContent(card.id, newContent);
    }));
    await fetchData();
  }

  function renameCard(oldName, newName) {
    const card = cards().find((c) => c.name === oldName);
    if (!card) return;
    const newCardNameWithoutSpaces = newName.replaceAll(" ", "-");
    supaRenameCard(card.id, newCardNameWithoutSpaces);
    const newCards = structuredClone(cards());
    const cardIndex = newCards.findIndex((c) => c.name === oldName);
    newCards[cardIndex].name = newCardNameWithoutSpaces;
    setCards(newCards);
    setCardBeingRenamed(null);
    setNewCardName(null);
    const newCardUrl = basePath() + board() + "/" + encodeURIComponent(newCardNameWithoutSpaces) + ".md";
    navigate(newCardUrl);
  }

  async function updateTagColorFromExpandedCard(tagColor) {
    await updateTagColors(tagColor);
  }

  function validateName(newName, namesList) {
    if (newName === null) {
      return null;
    }
    if (newName === "") {
      return t()('validation.mustHaveName');
    }
    if (newName.startsWith(".")) {
      return t()('validation.hiddenByDot');
    }
    if (namesList.filter((name) => name === (newName || "").trim()).length) {
      return t()('validation.duplicateName');
    }
    if (/[<>:%"/\\|?*]/g.test(newName)) {
      return t()('validation.forbiddenChars');
    }
    if (newName.endsWith(".md")) {
      return t()('validation.noMdExtension');
    }
    if (newName === "_api") {
      return t()('validation.prohibitedName');
    }
    return null;
  }

  function startRenamingLane(lane) {
    setNewLaneName(lane);
    setLaneBeingRenamedName(lane);
  }

  const sortedCards = createMemo(() => {
    if (sort() === "none") {
      return cards();
    }
    if (sort() === "name") {
      return sortCardsByName();
    }
    if (sort() === "tags") {
      return sortCardsByTags();
    }
    if (sort() === "due") {
      return sortCardsByDue();
    }
    if (sort() === "lastUpdated") {
      return sortCardsByLastUpdated();
    }
    if (sort() === "createdFirst") {
      return sortCardsByCreatedFirst();
    }
    return cards();
  });

  const filteredCards = createMemo(() =>
    sortedCards()
      .filter(
        (card) =>
          card.name.toLowerCase().includes(search().toLowerCase()) ||
          (card.content || "").toLowerCase().includes(search().toLowerCase())
      )
      .filter(
        (card) =>
          filteredTag() === null ||
          card.tags
            ?.map((tag) => tag.name?.toLowerCase())
            .includes(filteredTag().toLowerCase())
      )
  );

  function getCardsFromLane(lane) {
    return filteredCards().filter((card) => card.lane === lane);
  }

  function startRenamingCard(card) {
    setNewCardName(card.name);
    setCardBeingRenamed(card);
  }

  function exportToCSV() {
    const allCards = cards();
    if (!allCards.length) { return; }
    const headers = ["分类(Lane)", "任务名称(Task)", "标签(Tags)", "截止日期(Due Date)", "任务内容(Content)", "创建时间(Created)", "最后更新(Updated)"];
    const rows = allCards.map((card) => {
      const cleanContent = (card.content || "")
        .replace(/\[tag:.*?\]\s*/g, "")
        .replace(/\[due:.*?\]\s*/g, "")
        .replace(/\n/g, " ")
        .replace(/\r/g, "")
        .replace(/"/g, '""')
        .trim();
      return [
        card.lane || "", card.name || "",
        (card.tags || []).map((t) => t.name).join("; "),
        card.dueDate || "", cleanContent,
        card.createdAt ? new Date(card.createdAt).toLocaleString("zh-CN") : "",
        card.lastUpdated ? new Date(card.lastUpdated).toLocaleString("zh-CN") : "",
      ];
    });
    const csv = "\uFEFF" + [headers, ...rows]
      .map((row) => row.map((cell) => '"' + String(cell) + '"').join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tasks_export_" + new Date().toISOString().split("T")[0] + ".csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  async function handleLogin() {
    try {
      setLoginError("");
      await signIn(loginEmail(), loginPassword());
      setIsAdminUser(true);
      setShowLoginDialog(false);
      setLoginEmail("");
      setLoginPassword("");
      await fetchData();
    } catch (err) {
      setLoginError(err.message || "Login failed");
    }
  }

  async function handleLogout() {
    await signOut();
    setIsAdminUser(false);
    await fetchData();
  }

  onMount(() => {
    const url = window.location.href;
    if (!url.match(/\/$/)) {
      window.location.replace(`${url}/`);
    }
    fetchData();
  });

  createEffect(() => {
    if (title()) {
      document.title = title();
    }
  });

  createEffect(() => {
    if (!lanes().length) {
      return;
    }
    if (selectedCard()) {
      return;
    }
    const newSortJson = lanes().reduce((prev, curr) => {
      const laneCardNames = cards()
        .filter((card) => card.lane === curr)
        .map((card) => card.name);
      return {
        ...prev,
        [curr]: laneCardNames,
      };
    }, {});
    if (disableCardsDrag()) {
      return;
    }
  });

  function handleLanesSortChange(changedLane) {
    const laneName = changedLane.id.slice("lane-".length);
    const newLanes = structuredClone(lanes());
    const oldIndex = newLanes.indexOf(laneName);
    newLanes.splice(oldIndex, 1);
    newLanes.splice(changedLane.index, 0, laneName);
    setLanes(newLanes);
    setRenderUID(v7());
  }

  function handleCardsSortChange(changedCard) {
    const cardName = changedCard.id.slice("card-".length);
    const oldIndex = cards().findIndex((card) => card.name === cardName);
    const card = cards()[oldIndex];
    const newCardLane = changedCard.to.slice("lane-content-".length);
    const movedBetweenLanes = card.lane !== newCardLane;

    // Update local state FIRST (synchronous) for instant drag feedback
    card.lane = newCardLane;
    if (movedBetweenLanes) {
      card.lastMovedAt = new Date().toISOString();
    }
    const newCards = lanes().flatMap((lane) => {
      let laneCards = cards().filter((c) => c.lane === lane && c.name !== cardName);
      if (lane === newCardLane) {
        laneCards = [...laneCards.slice(0, changedCard.index), card, ...laneCards.slice(changedCard.index)];
      }
      return laneCards;
    });
    setCards(newCards);
    setFocusedCardId(cardName);
    setTimeout(() => { document.getElementById("card-" + cardName)?.focus(); }, 50);

    // Then save to Supabase in background (async, non-blocking)
    if (movedBetweenLanes) {
      fetchLanes().then((lanesData) => {
        const targetLane = lanesData.find((l) => l.name === newCardLane);
        if (targetLane) {
          supaMoveCard(card.id, targetLane.id);
        }
      });
    }
  }

  const disableCardsDrag = createMemo(() => sort() !== "none" || selectionMode());

  createEffect((prev) => {
    document.body.classList.remove(`view-mode-${prev}`);
    document.body.classList.add(`view-mode-${viewMode()}`);
    return viewMode();
  });

  // Clear selection when exiting selection mode
  createEffect(() => {
    if (!selectionMode()) {
      setSelectedCards(new Set());
    }
  });

  // Auto-focus first card once on initial load for keyboard navigation
  createEffect(() => {
    if (hasAutoFocusedFirstCard()) {
      return;
    }
    // Only auto-focus if no card is currently focused and we have cards
    if (!focusedCardId() && !selectedCard() && lanes().length > 0) {
      setTimeout(() => {
        // Find the first card in the first lane
        const firstLane = lanes()[0];
        const firstLaneCards = getCardsFromLane(firstLane);
        if (firstLaneCards.length > 0) {
          const firstCard = firstLaneCards[0];
          setFocusedCardId(firstCard.name);
          document.getElementById(`card-${firstCard.name}`)?.focus();
          setHasAutoFocusedFirstCard(true);
        }
      }, 100);
    }
  });

  createEffect(() => {
    let focusedElement;
    if (focusedCardId()) {
      focusedElement = document.getElementById(`card-${focusedCardId()}`)?.focus();
    }
    if (focusedLaneIndex()) {
      const laneName = lanes()[focusedLaneIndex()];
      focusedElement = document.getElementById(`lane-${laneName}`)?.focus();
    }
    if (focusedElement) {
      focusedElement.scrollIntoView()
    }
  })

  function handleMainBoardKeyDown(e) {
    // Don't interfere with input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }

    // Don't interfere when a card is expanded
    if (selectedCard()) {
      return;
    }

    const visibleCards = filteredCards();

    // Allow certain keys to work even when there are no cards
    const allowedKeysWithoutCards = ['n', '?', 'Escape'];
    if (!visibleCards.length && !allowedKeysWithoutCards.includes(e.key)) {
      return;
    }

    switch(e.key) {
      case 'ArrowDown':
      case 'j': // vim-style navigation
        e.preventDefault();
        if (focusedCardId()) {
          // Find the actual focused card and get cards in the same lane
          const currentCard = cards().find(c => c.name === focusedCardId());
          if (currentCard) {
            // Alt+Down: Move card down in the lane
            if (e.altKey) {
              moveCardInLane(currentCard, 'down');
            } else {
              // Normal Down: Navigate to next card in lane
              const currentLaneCards = getCardsFromLane(currentCard.lane);
              const currentIndexInLane = currentLaneCards.findIndex(c => c.name === focusedCardId());
              if (currentIndexInLane < currentLaneCards.length - 1) {
                const nextCard = currentLaneCards[currentIndexInLane + 1];
                setFocusedCardId(nextCard.name);
                document.getElementById(`card-${nextCard.name}`)?.focus();
              }
            }
          }
        } else if (focusedLaneIndex() !== null) {
          // From a focused lane, move Down to the first card in that lane
          const laneName = lanes()[focusedLaneIndex()];
          const laneCards = getCardsFromLane(laneName);
          if (laneCards.length > 0) {
            const firstCard = laneCards[0];
            setFocusedCardId(firstCard.name);
            setFocusedLaneIndex(null);
            document.getElementById(`card-${firstCard.name}`)?.focus();
          }
        } else if (visibleCards.length > 0) {
          // If nothing focused, focus first card
          const firstCard = visibleCards[0];
          setFocusedCardId(firstCard.name);
          document.getElementById(`card-${firstCard.name}`)?.focus();
        }
        break;

      case 'ArrowUp':
      case 'k': // vim-style navigation
        e.preventDefault();
        if (focusedCardId()) {
          // Find the actual focused card and get cards in the same lane
          const currentCard = cards().find(c => c.name === focusedCardId());
          if (currentCard) {
            // Alt+Up: Move card up in the lane
            if (e.altKey) {
              moveCardInLane(currentCard, 'up');
            } else {
              // Normal Up: Navigate to previous card in lane
              const currentLaneCards = getCardsFromLane(currentCard.lane);
              const currentIndexInLane = currentLaneCards.findIndex(c => c.name === focusedCardId());
              if (currentIndexInLane > 0) {
                const prevCard = currentLaneCards[currentIndexInLane - 1];
                setFocusedCardId(prevCard.name);
                document.getElementById(`card-${prevCard.name}`)?.focus();
              } else if (currentIndexInLane === 0) {
                // From the first card in a lane, move focus to the lane itself
                const laneIndex = lanes().indexOf(currentCard.lane);
                if (laneIndex !== -1) {
                  setFocusedCardId(null);
                  setFocusedLaneIndex(laneIndex);
                  setTimeout(() => {
                    document.getElementById(`lane-${currentCard.lane}`)?.focus();
                  }, 0);
                }
              }
            }
          }
        } else if (visibleCards.length > 0) {
          // If nothing focused, focus first card
          const firstCard = visibleCards[0];
          setFocusedCardId(firstCard.name);
          document.getElementById(`card-${firstCard.name}`)?.focus();
        }
        break;

      case 'ArrowRight':
      case 'l': // vim-style navigation
        e.preventDefault();
        if (focusedCardId()) {
          // Find the actual focused card from all cards, not just visible filtered ones
          const currentCard = cards().find(c => c.name === focusedCardId());
          if (currentCard) {
            const currentLaneIndex = lanes().indexOf(currentCard.lane);

            // Alt+Right: Move card to next lane (if exists)
            if (e.altKey) {
              if (currentLaneIndex < lanes().length - 1) {
                const nextLane = lanes()[currentLaneIndex + 1];
                moveCardToLane(currentCard, nextLane);
              }
            } else {
              // Normal Right: Navigate to first card in next non-empty lane
              for (let i = currentLaneIndex + 1; i < lanes().length; i++) {
                const nextLaneCards = getCardsFromLane(lanes()[i]);
                if (nextLaneCards.length > 0) {
                  setFocusedCardId(nextLaneCards[0].name);
                  document.getElementById(`card-${nextLaneCards[0].name}`)?.focus();
                  break;
                }
              }
            }
          }
        } else if (focusedLaneIndex() !== null) {
          const currentLaneIdx = focusedLaneIndex();
          if (e.altKey) {
            // Alt+Right: move the lane itself one position to the right
            if (currentLaneIdx < lanes().length - 1) {
              const laneName = lanes()[currentLaneIdx];
              handleLanesSortChange({
                id: `lane-${laneName}`,
                index: currentLaneIdx + 1,
              });
            }
          } else {
            // Normal Right: move lane focus to the next lane
            if (currentLaneIdx < lanes().length - 1) {
              const nextLaneName = lanes()[currentLaneIdx + 1];
              setFocusedLaneIndex(currentLaneIdx + 1);
              setFocusedCardId(null);
              setTimeout(() => {
                document.getElementById(`lane-${nextLaneName}`)?.focus();
              }, 0);
            }
          }
        } else if (visibleCards.length > 0) {
          // If nothing focused, focus first card
          const firstCard = visibleCards[0];
          setFocusedCardId(firstCard.name);
          document.getElementById(`card-${firstCard.name}`)?.focus();
        }
        break;

      case 'ArrowLeft':
      case 'h': // vim-style navigation
        e.preventDefault();
        if (focusedCardId()) {
          // Find the actual focused card from all cards, not just visible filtered ones
          const currentCard = cards().find(c => c.name === focusedCardId());
          if (currentCard) {
            const currentLaneIndex = lanes().indexOf(currentCard.lane);

            // Alt+Left: Move card to previous lane (if exists)
            if (e.altKey) {
              if (currentLaneIndex > 0) {
                const prevLane = lanes()[currentLaneIndex - 1];
                moveCardToLane(currentCard, prevLane);
              }
            } else {
              // Normal Left: Navigate to first card in previous non-empty lane
              for (let i = currentLaneIndex - 1; i >= 0; i--) {
                const prevLaneCards = getCardsFromLane(lanes()[i]);
                if (prevLaneCards.length > 0) {
                  setFocusedCardId(prevLaneCards[0].name);
                  document.getElementById(`card-${prevLaneCards[0].name}`)?.focus();
                  break;
                }
              }
            }
          }
        } else if (focusedLaneIndex() !== null) {
          const currentLaneIdx = focusedLaneIndex();
          if (e.altKey) {
            // Alt+Left: move the lane itself one position to the left
            if (currentLaneIdx > 0) {
              const laneName = lanes()[currentLaneIdx];
              handleLanesSortChange({
                id: `lane-${laneName}`,
                index: currentLaneIdx - 1,
              });
            }
          } else {
            // Normal Left: move lane focus to the previous lane
            if (currentLaneIdx > 0) {
              const prevLaneName = lanes()[currentLaneIdx - 1];
              setFocusedLaneIndex(currentLaneIdx - 1);
              setFocusedCardId(null);
              setTimeout(() => {
                document.getElementById(`lane-${prevLaneName}`)?.focus();
              }, 0);
            }
          }
        } else if (visibleCards.length > 0) {
          // If nothing focused, focus first card
          const firstCard = visibleCards[0];
          setFocusedCardId(firstCard.name);
          document.getElementById(`card-${firstCard.name}`)?.focus();
        }
        break;

      case 'Enter':
      case 'e': // Edit card
        e.preventDefault();
        if (focusedCardId()) {
          const card = cards().find(c => c.name === focusedCardId());
          if (card) {
            navigate(`${basePath()}${board()}/${card.name}.md`);
          }
        }
        break;

      case 'n': // New card
        e.preventDefault();
        if (lanes().length > 0) {
          const currentCard = focusedCardId()
            ? cards().find(c => c.name === focusedCardId())
            : null;
          const targetLane = currentCard ? currentCard.lane : lanes()[0];
          createNewCard(targetLane);
        }
        break;

      case 'r': // Rename card
        e.preventDefault();
        if (focusedCardId()) {
          const card = cards().find(c => c.name === focusedCardId());
          if (card) {
            startRenamingCard(card);
          }
        }
        break;

      case 'd': // Delete card (with confirmation)
        e.preventDefault();
        if (focusedCardId()) {
          const card = cards().find(c => c.name === focusedCardId());
          if (card && confirm(`Delete card "${card.name}"?`)) {
            // Find cards in the same lane for next focus
            const currentLaneCards = getCardsFromLane(card.lane);
            const currentIndexInLane = currentLaneCards.findIndex(c => c.name === focusedCardId());

            deleteCard(card);

            // Wait for the DOM to update, then focus next or previous card in the same lane
            setTimeout(() => {
              if (currentIndexInLane < currentLaneCards.length - 1) {
                const nextCard = currentLaneCards[currentIndexInLane + 1];
                setFocusedCardId(nextCard.name);
                document.getElementById(`card-${nextCard.name}`)?.focus();
              } else if (currentIndexInLane > 0) {
                const prevCard = currentLaneCards[currentIndexInLane - 1];
                setFocusedCardId(prevCard.name);
                document.getElementById(`card-${prevCard.name}`)?.focus();
              } else {
                setFocusedCardId(null);
              }
            }, 50);
          }
        }
        break;

      case 'Escape':
        e.preventDefault();
        if (showHelpDialog()) {
          setShowHelpDialog(false);
        } else {
          setFocusedCardId(null);
          setFocusedLaneIndex(null);
          mainContainerRef?.focus();
        }
        break;

      case '?': // Help
        e.preventDefault();
        setShowHelpDialog(true);
        break;
    }
  }

  return (
    <div
      ref={(el) => mainContainerRef = el}
      tabIndex="-1"
      onKeyDown={handleMainBoardKeyDown}
      style={{ outline: 'none', height: '100%', display: 'flex', 'flex-direction': 'column' }}
    >
      <Header
        search={search()}
        onSearchChange={setSearch}
        sort={sort() === "none" ? "none" : `${sort()}:${sortDirection()}`}
        onSortChange={handleSortSelectOnChange}
        tagOptions={tagsOptions().map((option) => option.name)}
        filteredTag={filteredTag()}
        onTagChange={handleFilterSelectOnChange}
        onNewLaneBtnClick={createNewLane}
        viewMode={viewMode()}
        onViewModeChange={(e) => setViewMode(e.target.value)}
        selectionMode={selectionMode()}
        onSelectionModeChange={setSelectionMode}
        t={t}
        locale={locale()}
        onLocaleChange={(e) => setLocale(e.target.value)}
        isAdmin={isAdminUser()}
        onLoginLogout={() => isAdminUser() ? handleLogout() : setShowLoginDialog(true)}
        onExport={exportToCSV}
      />
      <Show when={selectionMode()}>
        <BulkOperationsToolbar
          selectedCount={selectedCards().size}
          onDelete={bulkDeleteCards}
          onAddTags={bulkAddTags}
          onRemoveTags={bulkRemoveTags}
          onSetDueDate={bulkSetDueDate}
          onClearSelection={clearSelection}
          tagsOptions={tagsOptions().map((option) => option.name)}
          tagsOnSelectedCards={tagsOnSelectedCards()}
          t={t}
        />
      </Show>
      {title() ? <h1 class="app-title">{title()}</h1> : <></>}
      <DragAndDrop.Provider>
        <DragAndDrop.Container class={`lanes`} onChange={handleLanesSortChange}>
          <For each={lanes()}>
            {(lane, index) => (
              <div
                class="lane"
                id={`lane-${lane}`}
                tabIndex={0}
                onFocus={() => {
                  setFocusedLaneIndex(index());
                  setFocusedCardId(null);
                }}
              >
                <header class="lane__header">
                  {laneBeingRenamedName() === lane ? (
                    <NameInput
                      value={newLaneName()}
                      errorMsg={validateName(
                        newLaneName(),
                        lanes().filter(
                          (lane) => lane !== laneBeingRenamedName()
                        )
                      )}
                      onChange={(newValue) => setNewLaneName(newValue)}
                      onConfirm={renameLane}
                      onCancel={() => {
                        setNewLaneName(null);
                        setLaneBeingRenamedName(null);
                      }}
                    />
                  ) : (
                    <LaneName
                      name={lane}
                      count={getCardsFromLane(lane).length}
                      onRenameBtnClick={() => startRenamingLane(lane)}
                      onCreateNewCardBtnClick={() => createNewCard(lane)}
                      onDelete={() => deleteLane(lane)}
                      onDeleteCards={() => handleDeleteCardsByLane(lane)}
                      t={t}
                    />
                  )}
                </header>
                <DragAndDrop.Container
                  class="lane__content"
                  group="cards"
                  id={`lane-content-${lane}`}
                  onChange={handleCardsSortChange}
                >
                  <For each={getCardsFromLane(lane)}>
                    {(card) => (
                      <Card
                        name={card.name}
                        tags={card.tags}
                        dueDate={card.dueDate}
                        content={card.content}
                        disableDrag={disableCardsDrag()}
                        t={t}
                        locale={locale()}
                        selectionMode={selectionMode()}
                        isSelected={selectedCards().has(getCardKey(card))}
                        onComplete={() => moveCardToLane(card, "已完成")}
                        onSelectionChange={(isSelected) =>
                          toggleCardSelection(getCardKey(card), isSelected)
                        }
                        onFocus={() => {
                          setFocusedCardId(card.name);
                          setFocusedLaneIndex(null);
                        }}
                        onClick={() => {
                          if (!selectionMode()) {
                            let cardUrl = basePath();
                            if (board()) {
                              cardUrl += `${board()}`;
                            }
                            cardUrl += `/${encodeURIComponent(card.name)}.md`;
                            navigate(cardUrl);
                          }
                        }}
                        headerSlot={
                          cardBeingRenamed()?.name === card.name ? (
                            <NameInput
                              value={newCardName()}
                              errorMsg={validateName(
                                newCardName(),
                                cards()
                                  .filter(
                                    (card) =>
                                      card.name !== cardBeingRenamed()?.name
                                  )
                                  .map((card) => card.name)
                              )}
                              onChange={(newValue) => setNewCardName(newValue)}
                              onConfirm={() =>
                                renameCard(
                                  cardBeingRenamed()?.name,
                                  newCardName()
                                )
                              }
                              onCancel={() => {
                                const cardName = cardBeingRenamed()?.name;
                                setNewCardName(null);
                                setCardBeingRenamed(null);
                                // Restore focus to the card
                                setTimeout(() => {
                                  if (cardName) {
                                    setFocusedCardId(cardName);
                                    document.getElementById(`card-${cardName}`)?.focus();
                                  }
                                }, 50);
                              }}
                            />
                          ) : (
                            <CardName
                              name={card.name}
                              hasContent={!!card.content}
                              onRenameBtnClick={() => startRenamingCard(card)}
                              onDelete={() => deleteCard(card)}
                              onClick={() =>
                                navigate(
                                  `${basePath()}${board()}/${encodeURIComponent(card.name)}.md`
                                )
                              }
                              t={t}
                            />
                          )
                        }
                      />
                    )}
                  </For>
                </DragAndDrop.Container>
              </div>
            )}
          </For>
        </DragAndDrop.Container>
        <DragAndDrop.Target />
      </DragAndDrop.Provider>
      <Show when={renderUID()} keyed>
        <Show when={selectedCard()}>
          <ExpandedCard
            name={selectedCard().name}
            content={selectedCard().content}
            tags={selectedCard().tags || []}
            tagsOptions={tagsOptions()}
            t={t}
            onClose={() => {
              const cardName = selectedCard().name;
              navigate(`${basePath()}${board()}` || "/");
              // Restore focus to the card after navigation
              setTimeout(() => {
                setFocusedCardId(cardName);
                const cardElement = document.getElementById(`card-${cardName}`);
                if (cardElement) {
                  cardElement.focus();
                  cardElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
              }, 50);
            }}
            onContentChange={(value) =>
              debounceChangeCardContent(value, selectedCard().id)
            }
            onTagColorChange={updateTagColorFromExpandedCard}
            onNameChange={handleOnSelectedCardNameChange}
            getNameErrorMsg={(newName) =>
              validateName(
                newName,
                cards()
                  .filter((card) => card.name !== selectedCard().name)
                  .map((card) => card.name)
              )
            }
            disableImageUpload={false}
            board={board()}
            lane={selectedCard()?.lane}
          />
        </Show>
      </Show>
      <Show when={showHelpDialog()}>
        <KeyboardNavigationDialog onClose={() => setShowHelpDialog(false)} t={t} />
      </Show>
              <Show when={showLoginDialog()}>
        <div class="dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowLoginDialog(false); }}>
          <dialog open class="login-dialog">
            <div class="login-dialog__body">
              <h2>登录管理</h2>
              <Show when={loginError()}>
                <p class="login-error">{loginError()}</p>
              </Show>
              <input type="email" placeholder="邮箱" value={loginEmail()} onInput={(e) => setLoginEmail(e.target.value)} class="login-input" />
              <input type="password" placeholder="密码" value={loginPassword()} onInput={(e) => setLoginPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }} class="login-input" />
              <div class="login-dialog__btns">
                <button type="button" onClick={handleLogin}>登录</button>
                <button type="button" onClick={() => setShowLoginDialog(false)}>取消</button>
              </div>
            </div>
          </dialog>
        </div>
      </Show>
  </div>
  );
}

export default App