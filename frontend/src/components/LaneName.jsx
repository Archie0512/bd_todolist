/**
 * Lane 标题：名称 + 计数 + 新建卡片按钮 + 选项菜单（重命名/删除卡片/删除列）
 */
import { useState } from "react";
import { MoreVertical, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Menu } from "./Menu.jsx";
import { getButtonCoordinates } from "../lib/utils.js";

export function LaneName({
  name,
  count,
  onRenameBtnClick,
  onCreateNewCardBtnClick,
  onDelete,
  onDeleteCards,
  t: tProp,
}) {
  const { t } = useTranslation();
  const tt = tProp || t;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const openMenu = (e) => {
    e.stopPropagation();
    const coords = getButtonCoordinates(e);
    setMenuPos(coords);
    setMenuOpen(true);
  };

  const menuOptions = [
    { label: tt("laneName.rename"), onClick: () => onRenameBtnClick?.() },
    {
      label: tt("laneName.deleteCard"),
      danger: true,
      requiresConfirmation: true,
      confirmText: `删除「${name}」列下所有卡片？`,
      onClick: () => onDeleteCards?.(),
    },
    {
      label: tt("laneName.deleteLane"),
      danger: true,
      requiresConfirmation: true,
      confirmText: `删除「${name}」列？（含其下所有卡片）`,
      onClick: () => onDelete?.(),
    },
  ];

  return (
    <>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <strong className="text-sm font-semibold truncate">{name}</strong>
        <span className="counter inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs rounded-full bg-bg-4 text-fg">
          {count}
        </span>
      </div>
      <div className="header-buttons flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCreateNewCardBtnClick?.();
          }}
          className="p-1 rounded hover:bg-bg-4 transition-colors"
          aria-label={tt("laneName.createCard")}
          title={tt("laneName.createCard")}
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          onClick={openMenu}
          className="p-1 rounded hover:bg-bg-4 transition-colors"
          aria-label={tt("laneName.showOptions")}
        >
          <MoreVertical size={14} />
        </button>
      </div>
      <Menu
        open={menuOpen}
        x={menuPos.x}
        y={menuPos.y}
        options={menuOptions}
        onClose={() => setMenuOpen(false)}
        id={`lane-name-menu-${name}`}
      />
    </>
  );
}
