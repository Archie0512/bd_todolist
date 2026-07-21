/**
 * 顶部工具栏：搜索、排序、标签筛选、视图模式、主题、导出、新建列、选择模式、登录、语言
 */
import { useTranslation } from "react-i18next";
import {
  Search,
  Plus,
  LogIn,
  LogOut,
  Download,
  CheckSquare,
  Square,
  Sun,
  Moon,
  Monitor,
  HelpCircle,
} from "lucide-react";
import { cn } from "../lib/cn.js";
import { useUiStore } from "../store/ui-store.js";
import i18n from "../i18n/index.js";

const SORT_OPTIONS = [
  { value: "none", key: "header.sort.manually" },
  { value: "name:asc", key: "header.sort.nameAsc" },
  { value: "name:desc", key: "header.sort.nameDesc" },
  { value: "tags:asc", key: "header.sort.tagsAsc" },
  { value: "tags:desc", key: "header.sort.tagsDesc" },
  { value: "due:asc", key: "header.sort.dueAsc" },
  { value: "due:desc", key: "header.sort.dueDesc" },
  { value: "lastUpdated:desc", key: "header.sort.lastUpdated" },
  { value: "createdFirst:asc", key: "header.sort.createdFirst" },
];

const VIEW_MODES = ["extended", "compact", "tight"];

const LOCALES = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
];

export function Header({
  search,
  onSearchChange,
  onSortChange,
  tagOptions,
  filteredTag,
  onTagChange,
  onNewLaneBtnClick,
  onViewModeChange,
  selectionMode,
  onSelectionModeChange,
  isAdmin,
  onLoginLogout,
  onExport,
  onShowHelp,
}) {
  const { t } = useTranslation();
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const viewMode = useUiStore((s) => s.viewMode);
  const sort = useUiStore((s) => s.sort);
  const sortDirection = useUiStore((s) => s.sortDirection);

  const sortSelectValue =
    sort === "none" ? "none" : `${sort}:${sortDirection}`;

  return (
    <header className="app-header sticky top-0 z-20 bg-bg-1/80 backdrop-blur border-b border-bg-3">
      <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
        {/* 搜索 */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-fg/40"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("header.searchPlaceholder")}
            className="input pl-7 py-1 text-sm w-40"
          />
        </div>

        {/* 排序 */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-fg/60 hidden md:inline">
            {t("header.sortBy")}
          </span>
          <select
            value={sortSelectValue}
            onChange={onSortChange}
            className="input py-1 text-sm"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.key)}
              </option>
            ))}
          </select>
        </div>

        {/* 标签筛选 */}
        {tagOptions?.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-fg/60 hidden md:inline">
              {t("header.filterByTag")}
            </span>
            <select
              value={filteredTag || "none"}
              onChange={onTagChange}
              className="input py-1 text-sm"
            >
              <option value="none">{t("header.filterNone")}</option>
              {tagOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 视图模式 */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-fg/60 hidden md:inline">
            {t("header.viewMode")}
          </span>
          <select
            value={viewMode}
            onChange={onViewModeChange}
            className="input py-1 text-sm"
          >
            {VIEW_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {t(`header.view.${mode}`)}
              </option>
            ))}
          </select>
        </div>

        {/* 主题切换 */}
        <div className="flex items-center gap-0.5 bg-bg-3 rounded-md p-0.5">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={cn(
              "p-1 rounded transition-colors",
              theme === "light"
                ? "bg-bg-4 text-fg"
                : "text-fg/50 hover:text-fg"
            )}
            title={t("header.themeLight")}
            aria-label={t("header.themeLight")}
          >
            <Sun size={14} />
          </button>
          <button
            type="button"
            onClick={() => setTheme("auto")}
            className={cn(
              "p-1 rounded transition-colors",
              theme === "auto"
                ? "bg-bg-4 text-fg"
                : "text-fg/50 hover:text-fg"
            )}
            title={t("header.themeAuto")}
            aria-label={t("header.themeAuto")}
          >
            <Monitor size={14} />
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={cn(
              "p-1 rounded transition-colors",
              theme === "dark"
                ? "bg-bg-4 text-fg"
                : "text-fg/50 hover:text-fg"
            )}
            title={t("header.themeDark")}
            aria-label={t("header.themeDark")}
          >
            <Moon size={14} />
          </button>
        </div>

        <div className="flex-1" />

        {/* 导出 */}
        <button
          type="button"
          onClick={onExport}
          disabled={selectionMode}
          className="btn btn--ghost text-sm"
          title={t("header.export")}
        >
          <Download size={14} />
          <span className="hidden lg:inline">{t("header.export")}</span>
        </button>

        {/* 新建列 */}
        <button
          type="button"
          onClick={onNewLaneBtnClick}
          className="btn btn--primary text-sm"
          title={t("header.newLane")}
        >
          <Plus size={14} />
          <span className="hidden lg:inline">{t("header.newLane")}</span>
        </button>

        {/* 选择模式 */}
        <button
          type="button"
          onClick={() => onSelectionModeChange(!selectionMode)}
          className={cn(
            "btn text-sm",
            selectionMode ? "btn--primary" : "btn--ghost"
          )}
          title={selectionMode ? t("header.exitSelection") : t("header.selectCards")}
        >
          {selectionMode ? <Square size={14} /> : <CheckSquare size={14} />}
          <span className="hidden lg:inline">
            {selectionMode ? t("header.exitSelection") : t("header.selectCards")}
          </span>
        </button>

        {/* 帮助 */}
        <button
          type="button"
          onClick={onShowHelp}
          className="btn btn--ghost text-sm"
          title={t("keyboard.title")}
          aria-label={t("keyboard.title")}
        >
          <HelpCircle size={14} />
        </button>

        {/* 登录/登出 */}
        <button
          type="button"
          onClick={onLoginLogout}
          className={cn(
            "btn text-sm",
            isAdmin ? "btn--ghost" : "btn--primary"
          )}
          title={isAdmin ? t("header.logout") : t("header.login")}
        >
          {isAdmin ? <LogOut size={14} /> : <LogIn size={14} />}
          <span className="hidden md:inline">
            {isAdmin ? t("header.logout") : t("header.login")}
          </span>
        </button>

        {/* 语言切换 */}
        <select
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          className="input py-1 text-sm w-20"
          aria-label={t("header.locale")}
        >
          {LOCALES.map((loc) => (
            <option key={loc.value} value={loc.value}>
              {loc.label}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
