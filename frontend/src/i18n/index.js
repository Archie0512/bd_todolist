/**
 * i18next 初始化
 * - 复用原有 locale 文件（en/es/zh.js）
 * - `{{var}}` 插值语法与原 @solid-primitives/i18n 完全兼容
 * - locale 持久化到 localStorage，key 沿用 `locale_v2`
 * - 默认 zh，缺失 key 回退到 en
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zh from "./locales/zh.js";
import en from "./locales/en.js";
import es from "./locales/es.js";

const STORAGE_KEY = "locale_v2";

function detectLocale() {
  // 1. 优先读 localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && ["zh", "en", "es"].includes(stored)) {
    return stored;
  }
  // 2. 浏览器语言
  const browserLang = navigator.language?.toLowerCase() || "";
  if (browserLang.startsWith("zh")) return "zh";
  if (browserLang.startsWith("es")) return "es";
  if (browserLang.startsWith("en")) return "en";
  // 3. 环境变量
  if (import.meta.env.VITE_APP_LOCALE) {
    return import.meta.env.VITE_APP_LOCALE;
  }
  // 4. 默认 zh
  return "zh";
}

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
    es: { translation: es },
  },
  lng: detectLocale(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // React 已防 XSS
  },
  returnNull: false,
});

// 持久化 locale 变更
const originalChangeLanguage = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = (lng, ...rest) => {
  localStorage.setItem(STORAGE_KEY, lng);
  return originalChangeLanguage(lng, ...rest);
};

export default i18n;
