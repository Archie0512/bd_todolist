/**
 * 卡片标题 + 选项菜单（重命名/删除）
 */
import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Menu } from "./Menu.jsx";
import { getButtonCoordinates } from "../lib/utils.js";

export function CardName({ name, hasContent, onRenameBtnClick, onDelete, onClick, t: tProp }) {
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
    { label: tt("cardName.rename"), onClick: () => onRenameBtnClick?.() },
    {
      label: tt("cardName.delete"),
      danger: true,
      requiresConfirmation: true,
      confirmText: `删除「${name}」？`,
      onClick: () => onDelete?.(),
    },
  ];

  return (
    <>
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <button
          type="button"
          onClick={onClick}
          className="text-left text-sm font-medium truncate hover:text-accent transition-colors min-w-0"
          title={name}
        >
          {name}
        </button>
      </div>
      <div className="header-buttons flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={openMenu}
          className="p-1 rounded hover:bg-bg-4 transition-colors"
          aria-label={tt("cardName.showOptions")}
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
        id={`card-name-menu-${name}`}
      />
    </>
  );
}
