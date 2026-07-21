// i18n/index.js
import { createSignal, createMemo, createContext, useContext } from 'solid-js';
import { makePersisted } from '@solid-primitives/storage';
import { flatten, resolveTemplate, translator } from '@solid-primitives/i18n';

// Supported locales
const SUPPORTED = ['zh', 'en', 'es'];

// Dictionaries (imported from separate files or defined here)
import en from './locales/en.js';
import es from './locales/es.js';
import zh from './locales/zh.js';

const dictionaries = { en, es, zh };

/**
 * Detects the user's preferred locale.
 * Order: persisted locale -> browser locale -> default to 'zh'.
 * @returns {string} Detected locale.
 */
function detectLocale() {
	const browserLocale = navigator.language.split('-')[0];
	const envLocale = import.meta.env.VITE_APP_LOCALE;

	if (SUPPORTED.includes(browserLocale)) {
		return browserLocale;
	} else if (SUPPORTED.includes(envLocale)) {
		return envLocale;
	} else {
		return 'zh';
	}
}

// Create persisted signal for locale
const [locale, setLocale] = makePersisted(
	createSignal(detectLocale()),
	{ storage: localStorage, name: 'locale_v2' }
);

// Create memoized flattened dictionary based on current locale
const dict = createMemo(() => flatten(dictionaries[locale()] || zh));

// Translation function that uses the current dict
const t = createMemo(() => translator(dict, resolveTemplate));

// Create context
const I18nContext = createContext({ t, locale, setLocale });

/**
 * Provider component to wrap the app.
 * @param {Object} props - Component props.
 * @param {any} props.children - Child elements.
 * @returns {JSX.Element} Provider wrapper.
 */
export function I18nProvider(props) {
	return (
		<I18nContext.Provider value={{ t, locale, setLocale }}>
			{props.children}
		</I18nContext.Provider>
	);
}

/**
 * Hook to use i18n context.
 * @returns {{ t: Function, locale: () => string, setLocale: Function }} i18n utilities.
 */
export function useI18n() {
	const context = useContext(I18nContext);
	if (!context) {
		throw new Error('useI18n must be used within an I18nProvider');
	}
	return context;
}

// Export context for direct usage if needed
export { I18nContext };