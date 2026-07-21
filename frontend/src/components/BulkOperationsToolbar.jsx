/**
 * 批量操作工具栏：选择模式下展示，支持批量加/删标签、设置截止日期、删除
 */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Tag as TagIcon,
  X,
  Calendar,
  Trash2,
  XCircle,
  Search,
} from "lucide-react";
import { cn } from "../lib/cn.js";

export function BulkOperationsToolbar({
  selectedCount,
  tagsOptions,
  tagsOnSelectedCards,
  onDelete,
  onAddTags,
  onRemoveTags,
  onSetDueDate,
  onClearSelection,
}) {
  const { t } = useTranslation();
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showRemoveTagMenu, setShowRemoveTagMenu] = useState(false);
  const [showDueDateInput, setShowDueDateInput] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [removeTagSearchQuery, setRemoveTagSearchQuery] = useState("");
  const [dueDate, setDueDate] = useState("");

  const tagMenuRef = useRef(null);
  const removeTagMenuRef = useRef(null);
  const dueDateRef = useRef(null);
  const tagSearchRef = useRef(null);
  const removeTagSearchRef = useRef(null);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClick = (e) => {
      if (tagMenuRef.current && !tagMenuRef.current.contains(e.target)) {
        setShowTagMenu(false);
      }
      if (
        removeTagMenuRef.current &&
        !removeTagMenuRef.current.contains(e.target)
      ) {
        setShowRemoveTagMenu(false);
      }
      if (dueDateRef.current && !dueDateRef.current.contains(e.target)) {
        setShowDueDateInput(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // 打开标签下拉时聚焦搜索框
  useEffect(() => {
    if (showTagMenu) tagSearchRef.current?.focus();
  }, [showTagMenu]);

  useEffect(() => {
    if (showRemoveTagMenu) removeTagSearchRef.current?.focus();
  }, [showRemoveTagMenu]);

  // 无可移除标签时自动关闭
  useEffect(() => {
    if (showRemoveTagMenu && tagsOnSelectedCards.length === 0) {
      setShowRemoveTagMenu(false);
    }
  }, [tagsOnSelectedCards, showRemoveTagMenu]);

  const filteredTags = (query) =>
    tagsOptions.filter(
      (name) => !query || name.toLowerCase().includes(query.toLowerCase())
    );

  const filteredRemoveTags = (query) =>
    tagsOnSelectedCards.filter(
      (name) => !query || name.toLowerCase().includes(query.toLowerCase())
    );

  const showCreateOption = (query) =>
    query &&
    query.trim() &&
    !tagsOptions.some((name) => name.toLowerCase() === query.toLowerCase());

  const handleAddTag = (tagName) => {
    onAddTags?.(tagName);
    setTagSearchQuery("");
    tagSearchRef.current?.focus();
  };

  const handleRemoveTag = (tagName) => {
    onRemoveTags?.(tagName);
    setRemoveTagSearchQuery("");
    removeTagSearchRef.current?.focus();
  };

  const handleSetDueDate = () => {
    if (dueDate) {
      onSetDueDate?.(dueDate);
      setDueDate("");
      setShowDueDateInput(false);
    }
  };

  const handleDelete = () => {
    const msg = t("bulk.deleteConfirm", {
      count: selectedCount,
      defaultValue: "Delete selected?",
    });
    if (window.confirm(msg)) {
      onDelete?.();
    }
  };

  const selectedText = t("bulk.selected", {
    count: selectedCount,
    defaultValue: "{{count}} selected",
  });

  return (
    <div className="bulk-operations-toolbar sticky top-0 z-30 bg-bg-2 border-b border-bg-4 px-4 py-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-fg">{selectedText}</span>

        <div className="flex-1" />

        {/* 加标签 */}
        <div ref={tagMenuRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setShowTagMenu(!showTagMenu);
              setShowRemoveTagMenu(false);
              setShowDueDateInput(false);
            }}
            className="btn btn--ghost text-sm"
          >
            <TagIcon size={14} />
            <span className="hidden sm:inline">{t("bulk.addTags")}</span>
          </button>
          {showTagMenu && (
            <div className="absolute right-0 top-full mt-1 w-56 rounded-md border border-bg-4 bg-bg-2 shadow-xl z-50 animate-fade-in">
              <div className="p-2 border-b border-bg-3">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-fg/40"
                  />
                  <input
                    ref={tagSearchRef}
                    type="text"
                    value={tagSearchQuery}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    placeholder={t("bulk.tagSearchPlaceholder")}
                    className="input w-full pl-7 py-1 text-sm"
                  />
                </div>
              </div>
              <ul className="max-h-60 overflow-auto py-1">
                {filteredTags(tagSearchQuery).map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => handleAddTag(name)}
                      className="block w-full text-left px-3 py-1.5 text-sm hover:bg-bg-3"
                    >
                      {name}
                    </button>
                  </li>
                ))}
                {showCreateOption(tagSearchQuery) && (
                  <li>
                    <button
                      type="button"
                      onClick={() => handleAddTag(tagSearchQuery.trim())}
                      className="block w-full text-left px-3 py-1.5 text-sm text-accent hover:bg-bg-3"
                    >
                      {t("bulk.createTag", { tag: tagSearchQuery.trim() })}
                    </button>
                  </li>
                )}
                {filteredTags(tagSearchQuery).length === 0 &&
                  !showCreateOption(tagSearchQuery) && (
                    <li className="px-3 py-2 text-xs text-fg/40">
                      {t("common.noTagsFound")}
                    </li>
                  )}
              </ul>
            </div>
          )}
        </div>

        {/* 删标签 */}
        <div ref={removeTagMenuRef} className="relative">
          <button
            type="button"
            disabled={tagsOnSelectedCards.length === 0}
            onClick={() => {
              setShowRemoveTagMenu(!showRemoveTagMenu);
              setShowTagMenu(false);
              setShowDueDateInput(false);
            }}
            className="btn btn--ghost text-sm"
          >
            <X size={14} />
            <span className="hidden sm:inline">{t("bulk.removeTags")}</span>
          </button>
          {showRemoveTagMenu && (
            <div className="absolute right-0 top-full mt-1 w-56 rounded-md border border-bg-4 bg-bg-2 shadow-xl z-50 animate-fade-in">
              <div className="p-2 border-b border-bg-3">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-fg/40"
                  />
                  <input
                    ref={removeTagSearchRef}
                    type="text"
                    value={removeTagSearchQuery}
                    onChange={(e) => setRemoveTagSearchQuery(e.target.value)}
                    placeholder={t("bulk.removeTagPlaceholder")}
                    className="input w-full pl-7 py-1 text-sm"
                  />
                </div>
              </div>
              <ul className="max-h-60 overflow-auto py-1">
                {filteredRemoveTags(removeTagSearchQuery).map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(name)}
                      className="block w-full text-left px-3 py-1.5 text-sm hover:bg-bg-3"
                    >
                      {name}
                    </button>
                  </li>
                ))}
                {filteredRemoveTags(removeTagSearchQuery).length === 0 && (
                  <li className="px-3 py-2 text-xs text-fg/40">
                    {t("common.noTagsFound")}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* 设置截止日期 */}
        <div ref={dueDateRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setShowDueDateInput(!showDueDateInput);
              setShowTagMenu(false);
              setShowRemoveTagMenu(false);
            }}
            className="btn btn--ghost text-sm"
          >
            <Calendar size={14} />
            <span className="hidden sm:inline">{t("bulk.setDueDate")}</span>
          </button>
          {showDueDateInput && (
            <div className="absolute right-0 top-full mt-1 p-2 rounded-md border border-bg-4 bg-bg-2 shadow-xl z-50 animate-fade-in">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input text-sm"
              />
              <button
                type="button"
                onClick={handleSetDueDate}
                disabled={!dueDate}
                className="btn btn--primary w-full mt-2 text-sm"
              >
                {t("common.confirm")}
              </button>
            </div>
          )}
        </div>

        {/* 删除 */}
        <button
          type="button"
          onClick={handleDelete}
          className="btn btn--danger text-sm"
        >
          <Trash2 size={14} />
          <span className="hidden sm:inline">{t("bulk.delete")}</span>
        </button>

        {/* 清除选择 */}
        <button
          type="button"
          onClick={onClearSelection}
          className="btn btn--ghost text-sm"
        >
          <XCircle size={14} />
          <span className="hidden sm:inline">{t("bulk.clearSelection")}</span>
        </button>
      </div>
    </div>
  );
}
