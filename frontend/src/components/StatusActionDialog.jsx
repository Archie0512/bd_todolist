/**
 * 完成/退回操作弹窗：填写备注后移动卡片到对应 lane 并记录日志
 * 仅登录用户可触发（按钮在 ExpandedCard 内，未登录时不渲染）
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, Undo2, X } from "lucide-react";
import { ShimmerButton } from "./react-bits/ShimmerButton.jsx";
import { useAuthStore } from "../store/auth-store.js";
import { useBoardStore } from "../store/board-store.js";
import { insertStatusLog } from "../lib/supabase-client.js";

export function StatusActionDialog({ open, action, card, onClose, onDone }) {
  const { t } = useTranslation();
  const { userEmail } = useAuthStore();
  const moveCardToLane = useBoardStore((s) => s.moveCardToLane);
  const fetchData = useBoardStore((s) => s.fetchData);
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const reduceMotion = useReducedMotion();

  if (!open || !card) return null;

  const isComplete = action === "complete";
  const targetLane = isComplete ? "已完成" : "退回";
  const titleKey = isComplete ? "statusDialog.completeTitle" : "statusDialog.returnTitle";
  const descKey = isComplete ? "statusDialog.completeDesc" : "statusDialog.returnDesc";

  const handleSubmit = async () => {
    if (!remark.trim()) {
      setError(t("statusDialog.remarkEmpty"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      // 1. 先写状态日志
      await insertStatusLog(card.id, action, remark.trim(), userEmail);
      // 2. 移动卡片到目标 lane（乐观更新本地 + 后台同步）
      moveCardToLane(card, targetLane);
      // 3. 重新拉数据以刷新 last_completion_remark 等视图字段
      fetchData();
      // 4. 关闭弹窗 + 关闭 ExpandedCard
      setRemark("");
      onDone?.();
      onClose?.();
    } catch (err) {
      console.error("Status action failed:", err);
      setError(err.message || t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setRemark("");
    setError("");
    onClose?.();
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="dialog-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
        role="dialog"
        aria-modal="true"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <motion.div
          className="w-[480px] max-w-[90vw] rounded-lg p-6 bg-bg-2 border border-bg-4 shadow-2xl"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {isComplete ? (
                <Check size={20} className="text-success" />
              ) : (
                <Undo2 size={20} className="text-warning" />
              )}
              <h2 className="text-lg font-semibold">{t(titleKey)}</h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="p-1 rounded hover:bg-bg-3 transition-colors"
              aria-label={t("common.close")}
            >
              <X size={18} />
            </button>
          </div>

          <p className="text-sm text-fg/70 mb-4">{t(descKey)}</p>

          <div className="mb-2">
            <label className="block text-sm font-medium mb-1.5">
              {t("statusDialog.remarkLabel")}{" "}
              <span className="text-danger">*</span>
            </label>
            <textarea
              value={remark}
              onChange={(e) => {
                setRemark(e.target.value);
                setError("");
              }}
              placeholder={t("statusDialog.remarkPlaceholder")}
              rows={4}
              autoFocus
              className="input w-full resize-y"
            />
            {error && (
              <p className="mt-1 text-xs text-danger">{error}</p>
            )}
          </div>

          <div className="flex gap-2 justify-end mt-5">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="btn btn--ghost"
            >
              {t("common.cancel")}
            </button>
            <ShimmerButton
              onClick={handleSubmit}
              disabled={submitting || !remark.trim()}
              className="px-4 py-1.5"
            >
              {submitting ? t("common.loading") : t("statusDialog.submit")}
            </ShimmerButton>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
