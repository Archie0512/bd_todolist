/**
 * 状态变更历史时间线：展示卡片的完成/退回流转记录
 * 用 AnimatePresence 做条目入场
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, Undo2 } from "lucide-react";
import { fetchStatusLogs } from "../lib/supabase-client.js";

function formatTime(iso, locale) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function StatusLogTimeline({ cardId, locale }) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    if (!cardId) return;
    setLoading(true);
    fetchStatusLogs(cardId)
      .then((data) => {
        if (!cancelled) {
          setLogs(data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch status logs:", err);
        if (!cancelled) {
          setLogs([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  if (loading) {
    return (
      <div className="text-xs text-fg/40 py-2">{t("common.loading")}</div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-xs text-fg/40 py-2">{t("expandedCard.noStatusHistory")}</div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-fg/60 uppercase tracking-wide">
        {t("expandedCard.statusHistory")}
      </h4>
      <ol className="relative space-y-3 pl-4 border-l border-bg-4">
        <AnimatePresence initial={!reduceMotion}>
          {logs.map((log) => {
            const isComplete = log.action === "complete";
            return (
              <motion.li
                key={log.id}
                initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <span
                  className={`absolute -left-[1.35rem] top-1 flex items-center justify-center w-4 h-4 rounded-full ${
                    isComplete ? "bg-success" : "bg-warning"
                  }`}
                >
                  {isComplete ? (
                    <Check size={10} className="text-white" />
                  ) : (
                    <Undo2 size={10} className="text-white" />
                  )}
                </span>
                <div className="text-sm">
                  <div className="font-medium">
                    {isComplete
                      ? t("expandedCard.completedBy", {
                          email: log.actor_email || t("expandedCard.anonymous"),
                          time: formatTime(log.created_at, locale),
                        })
                      : t("expandedCard.returnedBy", {
                          email: log.actor_email || t("expandedCard.anonymous"),
                          time: formatTime(log.created_at, locale),
                        })}
                  </div>
                  {log.remark && (
                    <div className="text-xs text-fg/70 mt-0.5 whitespace-pre-wrap break-words">
                      {log.remark}
                    </div>
                  )}
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </div>
  );
}
