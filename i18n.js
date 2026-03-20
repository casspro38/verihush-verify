import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import ko from './locales/ko.json';
import es from './locales/es.json';
import ja from './locales/ja.json';

const i18n = new I18n({ en, ko, es, ja });

i18n.defaultLocale = 'en';
i18n.enableFallback = true;

const LANG_KEY = 'verihush_language';

export async function initLanguage() {
  const saved = await AsyncStorage.getItem(LANG_KEY);
  if (saved) {
    i18n.locale = saved;
  } else {
    const deviceLang = getLocales()[0]?.languageCode || 'en';
    i18n.locale = ['en', 'ko', 'es', 'ja'].includes(deviceLang) ? deviceLang : 'en';
  }
}

export async function setLanguage(lang) {
  i18n.locale = lang;
  await AsyncStorage.setItem(LANG_KEY, lang);
}

export function t(key) {
  return i18n.t(key);
}

export function getCurrentLanguage() {
  return i18n.locale;
}

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
  { code: 'es', label: 'Español' },
  { code: 'ja', label: '日本語' },
];

export default i18n;
