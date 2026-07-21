/**
 * 键盘快捷键帮助对话框
 */
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

export function KeyboardHelpDialog({ onClose }) {
  const { t } = useTranslation();

  const sections = [
    {
      title: t("keyboard.sections.navigation"),
      items: [
        { key: "←/→/↑/↓", desc: t("keyboard.shortcuts.arrowRight") },
        { key: "h/j/k/l", desc: "vim-style navigation" },
        { key: "?", desc: t("keyboard.shortcuts.questionMark") },
      ],
    },
    {
      title: t("keyboard.sections.cardActions"),
      items: [
        { key: "Enter / e", desc: t("keyboard.shortcuts.enter") },
        { key: "n", desc: t("keyboard.shortcuts.n") },
        { key: "r", desc: t("keyboard.shortcuts.r") },
        { key: "d", desc: t("keyboard.shortcuts.d") },
        { key: "Alt+←/→", desc: "Move card across lanes" },
        { key: "Alt+↑/↓", desc: "Reorder card within lane" },
      ],
    },
    {
      title: t("keyboard.sections.general"),
      items: [{ key: "Esc", desc: t("keyboard.shortcuts.escape") }],
    },
  ];

  return createPortal(
    <div
      className="dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-[480px] max-w-[90vw] max-h-[80vh] overflow-auto rounded-lg p-6 bg-bg-2 border border-bg-4 shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t("keyboard.title")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-3 transition-colors"
            aria-label={t("common.close")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-accent mb-2">
                {section.title}
              </h3>
              <table className="w-full text-sm">
                <tbody>
                  {section.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-bg-3 last:border-0">
                      <td className="py-1.5 pr-4 font-mono text-xs whitespace-nowrap text-fg/80">
                        {item.key}
                      </td>
                      <td className="py-1.5 text-fg/70">{item.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn btn--primary px-4 py-1.5"
          >
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
