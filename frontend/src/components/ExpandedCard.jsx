/**
 * 展开卡片对话框：基于 TipTap 的富文本编辑器
 * - 标签平铺勾选（保留原项目偏好，不回退到下拉）
 * - 截止日期
 * - 完成/退回按钮（仅登录可见）+ 备注 + 状态历史时间线
 * - 图片上传（调 Supabase Storage）
 * - 最大化/缩小、Markdown/RichText 模式切换
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  X,
  Maximize2,
  Minimize2,
  Check,
  Undo2,
  ImagePlus,
  Loader2,
  FileText,
  Eye,
} from "lucide-react";
import { cn } from "../lib/cn.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { useAuthStore } from "../store/auth-store.js";
import { useBoardStore } from "../store/board-store.js";
import {
  addTagToContent,
  removeTagFromContent,
  setDueDateInContent,
  getDueDateFromContent,
} from "../lib/card-content-utils.js";
import { markdownToHtml, htmlToMarkdown } from "../lib/markdown.js";
import { uploadImage } from "../lib/upload-image.js";
import { ShimmerButton } from "./react-bits/ShimmerButton.jsx";
import { TiltedCard } from "./react-bits/TiltedCard.jsx";
import { StatusActionDialog } from "./StatusActionDialog.jsx";
import { StatusLogTimeline } from "./StatusLogTimeline.jsx";

const TAG_COLOR_PALETTE = [
  "var(--color-alt-1)",
  "var(--color-alt-2)",
  "var(--color-alt-3)",
  "var(--color-alt-4)",
  "var(--color-alt-5)",
  "var(--color-alt-6)",
  "var(--color-alt-7)",
];

export function ExpandedCard({
  card,
  tagsOptions = [],
  onClose,
  onNameChange,
  getNameErrorMsg,
}) {
  const { t, i18n } = useTranslation();
  const { isAdmin } = useAuthStore();
  const updateCardContent = useBoardStore((s) => s.updateCardContent);
  const updateTagColors = useBoardStore((s) => s.updateTagColors);

  const [isMaximized, setIsMaximized] = useLocalStorage(
    "isExpandedCardMaximized",
    false
  );
  const [editorMode, setEditorMode] = useLocalStorage(
    "lastEditorModeUsed",
    "rich"
  ); // "rich" | "markdown"
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(card?.name || "");
  const [newTagName, setNewTagName] = useState("");
  const [newTagError, setNewTagError] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [statusDialogAction, setStatusDialogAction] = useState(null); // null | "complete" | "return"
  const [lightboxImage, setLightboxImage] = useState(null);

  const fileInputRef = useRef(null);
  const dialogRef = useRef(null);
  const locale = i18n.language;

  // 当前卡片已有的标签名
  const cardTagNames = useMemo(() => {
    return (card?.tags || []).map((t) => t.name);
  }, [card?.tags]);

  // TipTap 编辑器
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 避免与 Image 扩展冲突
        link: false,
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({
        placeholder: t("expandedCard.newTagPlaceholder"),
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: markdownToHtml(card?.content || ""),
    editable: true,
    onUpdate: ({ editor: ed }) => {
      // 转 Markdown 回传 store
      const md = htmlToMarkdown(ed.getHTML());
      updateCardContent(card.id, md);
    },
  });

  // 外部 content 变化时同步编辑器（避免循环：仅当 MD 不一致时才更新）
  useEffect(() => {
    if (!editor || !card) return;
    const currentMd = htmlToMarkdown(editor.getHTML());
    if (currentMd !== card.content) {
      editor.commands.setContent(markdownToHtml(card.content || ""), false);
    }
  }, [card?.content, editor, card?.id]);

  // 点击图片放大
  useEffect(() => {
    if (!editor) return;
    const handleClick = (e) => {
      const target = e.target;
      if (target.tagName === "IMG") {
        e.preventDefault();
        setLightboxImage(target.getAttribute("src"));
      }
    };
    const dom = editor.view.dom;
    dom.addEventListener("click", handleClick);
    return () => dom.removeEventListener("click", handleClick);
  }, [editor]);

  // ===== 标签操作（平铺 checkbox，保留原项目偏好） =====
  const handleToggleTag = (tagName, checked) => {
    if (!card) return;
    let newContent;
    if (checked) {
      newContent = addTagToContent(card.content, tagName);
    } else {
      newContent = removeTagFromContent(card.content, tagName);
    }
    updateCardContent(card.id, newContent);
  };

  const handleCreateNewTag = () => {
    const name = newTagName.trim();
    if (!name) return;
    if (tagsOptions.some((t) => t.name === name) || cardTagNames.includes(name)) {
      setNewTagError(t("expandedCard.tagError.duplicate"));
      return;
    }
    const newContent = addTagToContent(card.content, name);
    updateCardContent(card.id, newContent);
    setNewTagName("");
    setNewTagError("");
  };

  const handleDeleteTag = (tagName) => {
    const newContent = removeTagFromContent(card.content, tagName);
    updateCardContent(card.id, newContent);
  };

  const handleTagColorChange = async (tagName, color) => {
    await updateTagColors({ [tagName]: color });
  };

  // ===== 截止日期 =====
  const dueDate = useMemo(() => getDueDateFromContent(card?.content || ""), [card?.content]);
  const handleChangeDueDate = (newDate) => {
    const newContent = setDueDateInContent(card.content, newDate || "");
    updateCardContent(card.id, newContent);
  };

  // ===== 卡片重命名 =====
  const handleRenameConfirm = () => {
    const err = getNameErrorMsg?.(newName);
    if (err) return;
    onNameChange?.(card.name, newName);
    setIsRenaming(false);
  };

  // ===== 图片上传 =====
  const handleInsertImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 清空 input，允许重复选同一文件
    if (!file || !editor) return;

    setImageUploading(true);
    setImageError("");
    try {
      const publicUrl = await uploadImage(file, card.id, isAdmin);
      editor.chain().focus().setImage({ src: publicUrl, alt: file.name }).run();
    } catch (err) {
      console.error("Image upload failed:", err);
      setImageError(err.message || t("expandedCard.imageUploadError"));
    } finally {
      setImageUploading(false);
    }
  };

  // ===== 完成/退回 =====
  const handleCompleteClick = () => {
    if (!isAdmin) return;
    setStatusDialogAction("complete");
  };
  const handleReturnClick = () => {
    if (!isAdmin) return;
    setStatusDialogAction("return");
  };

  // ===== 关闭 =====
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      if (statusDialogAction) {
        setStatusDialogAction(null);
      } else if (lightboxImage) {
        setLightboxImage(null);
      } else {
        onClose?.();
      }
    }
  };

  if (!card) return null;

  return createPortal(
    <>
      <div
        className="dialog-backdrop"
        onClick={handleBackdropClick}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
      >
        <div
          ref={dialogRef}
          className={cn(
            "dialog__body rounded-lg border border-bg-4 bg-bg-2 shadow-2xl flex flex-col",
            "animate-slide-up",
            isMaximized ? "w-full h-full" : "w-[900px] max-w-[95vw] max-h-[90vh]"
          )}
        >
          {/* 顶部工具栏 */}
          <div className="dialog__toolbar flex items-center justify-between p-4 border-b border-bg-3 gap-2">
            <TiltedCard className="flex-1 min-w-0">
              {isRenaming ? (
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameConfirm();
                    if (e.key === "Escape") {
                      setIsRenaming(false);
                      setNewName(card.name);
                    }
                  }}
                  onBlur={handleRenameConfirm}
                  autoFocus
                  className="input text-lg font-semibold flex-1"
                />
              ) : (
                <h1
                  className="text-lg font-semibold truncate cursor-text hover:text-accent transition-colors"
                  onClick={() => {
                    setNewName(card.name);
                    setIsRenaming(true);
                  }}
                  title={t("expandedCard.rename")}
                >
                  {card.name}
                </h1>
              )}
            </TiltedCard>

            <div className="flex items-center gap-1 shrink-0">
              {/* 完成/退回按钮（仅登录可见） */}
              {isAdmin && (
                <>
                  <ShimmerButton
                    onClick={handleCompleteClick}
                    className="px-3 py-1.5 text-sm"
                    title={t("expandedCard.complete")}
                  >
                    <Check size={14} />
                    <span className="hidden md:inline">
                      {t("expandedCard.complete")}
                    </span>
                  </ShimmerButton>
                  <button
                    type="button"
                    onClick={handleReturnClick}
                    className="btn btn--ghost text-sm"
                    title={t("expandedCard.return")}
                  >
                    <Undo2 size={14} />
                    <span className="hidden md:inline">
                      {t("expandedCard.return")}
                    </span>
                  </button>
                </>
              )}
              {/* 最大化/缩小 */}
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-1.5 rounded hover:bg-bg-3 transition-colors"
                title={isMaximized ? t("expandedCard.minimize") : t("expandedCard.expand")}
                aria-label={isMaximized ? t("expandedCard.minimize") : t("expandedCard.expand")}
              >
                {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              {/* 关闭 */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded hover:bg-bg-3 transition-colors"
                aria-label={t("expandedCard.close")}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* 标签区（平铺 checkbox）+ 截止日期 */}
          <div className="dialog__tags-and-due-date p-4 border-b border-bg-3 space-y-3">
            <div className="dialog__tags">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-fg/60 uppercase tracking-wide">
                  {t("expandedCard.addTag")}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {tagsOptions.map((tag) => {
                  const checked = cardTagNames.includes(tag.name);
                  return (
                    <label
                      key={tag.name}
                      className={cn(
                        "tag-checkbox inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-pointer transition-colors",
                        "hover:bg-bg-3",
                        checked && "bg-bg-4"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => handleToggleTag(tag.name, e.target.checked)}
                        className="h-3 w-3 accent-accent"
                      />
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: tag.backgroundColor }}
                      />
                      <span>{tag.name}</span>
                    </label>
                  );
                })}
              </div>

              {/* 新建标签输入 */}
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => {
                    setNewTagName(e.target.value);
                    setNewTagError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateNewTag();
                  }}
                  placeholder={t("expandedCard.newTagPlaceholder")}
                  className="input text-xs py-1 w-40"
                />
                {newTagName.trim() && (
                  <button
                    type="button"
                    onClick={handleCreateNewTag}
                    className="btn btn--ghost text-xs py-1"
                  >
                    {t("common.confirm")}
                  </button>
                )}
                {newTagError && (
                  <span className="text-xs text-danger">{newTagError}</span>
                )}
              </div>
            </div>

            {/* 截止日期 */}
            <div className="dialog__due-date flex items-center gap-2">
              <label className="text-xs font-semibold text-fg/60 uppercase tracking-wide">
                {t("expandedCard.dueDate")}
              </label>
              <input
                type="date"
                value={dueDate || ""}
                onChange={(e) => handleChangeDueDate(e.target.value)}
                className="input text-xs py-1"
              />
              {dueDate && (
                <button
                  type="button"
                  onClick={() => handleChangeDueDate("")}
                  className="text-xs text-fg/50 hover:text-danger transition-colors"
                >
                  {t("common.delete")}
                </button>
              )}
            </div>
          </div>

          {/* 编辑器工具栏 */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-bg-3">
            <button
              type="button"
              onClick={handleInsertImage}
              disabled={imageUploading}
              className="btn btn--ghost text-sm py-1"
              title={t("expandedCard.insertImage")}
            >
              {imageUploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ImagePlus size={14} />
              )}
              <span className="hidden md:inline">
                {imageUploading
                  ? t("common.uploading")
                  : t("expandedCard.insertImage")}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex-1" />
            {/* Markdown/RichText 模式切换 */}
            <button
              type="button"
              onClick={() => setEditorMode(editorMode === "rich" ? "markdown" : "rich")}
              className="btn btn--ghost text-xs py-1"
              title={
                editorMode === "rich"
                  ? t("expandedCard.markdownMode")
                  : t("expandedCard.richTextMode")
              }
            >
              {editorMode === "rich" ? <FileText size={14} /> : <Eye size={14} />}
              <span className="hidden md:inline">
                {editorMode === "rich" ? "Markdown" : "Rich"}
              </span>
            </button>
          </div>

          {imageError && (
            <div className="px-4 py-1.5 text-xs text-danger bg-danger/10 border-b border-danger/20">
              {imageError}
            </div>
          )}

          {/* 编辑器内容 */}
          <div className="dialog__content flex-1 overflow-auto p-2">
            {editorMode === "rich" ? (
              <EditorContent editor={editor} />
            ) : (
              <textarea
                value={card.content || ""}
                onChange={(e) => updateCardContent(card.id, e.target.value)}
                placeholder="Markdown..."
                className="w-full h-full min-h-[300px] bg-bg-3 text-fg p-3 rounded-md font-mono text-sm resize-none border border-bg-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            )}
          </div>

          {/* 状态历史时间线（底部） */}
          <div className="p-4 border-t border-bg-3 max-h-40 overflow-auto">
            <StatusLogTimeline cardId={card.id} locale={locale} />
          </div>
        </div>
      </div>

      {/* 完成/退回弹窗 */}
      <StatusActionDialog
        open={!!statusDialogAction}
        action={statusDialogAction}
        card={card}
        onClose={() => setStatusDialogAction(null)}
        onDone={onClose}
      />

      {/* 图片预览 lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-8 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <img
            src={lightboxImage}
            alt="preview"
            className="max-w-full max-h-full object-contain animate-fade-in"
          />
          <button
            type="button"
            className="absolute top-4 right-4 p-2 rounded-full bg-bg-4/80 text-white hover:bg-bg-4"
            onClick={() => setLightboxImage(null)}
            aria-label={t("common.close")}
          >
            <X size={20} />
          </button>
        </div>
      )}
    </>,
    document.body
  );
}
