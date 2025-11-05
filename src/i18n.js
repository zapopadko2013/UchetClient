import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Импортируйте ваши файлы переводов
import translationEN from './locales/en/translation.json';
import translationRU from './locales/ru/translation.json';
import translationKZ from './locales/kk/translation.json';

// Файлы переводов для компонентов Ant Design
import antdEN from 'antd/locale/en_US';
import antdRU from 'antd/locale/ru_RU';
import antdKZ from 'antd/locale/kk_KZ';

// Объединяем переводы
const resources = {
  en: {
    translation: translationEN,
    antd: antdEN,
  },
  ru: {
    translation: translationRU,
    antd: antdRU,
  },
  kk: {
    translation: translationKZ,
    antd: antdKZ,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ru', // Язык по умолчанию
    fallbackLng: 'ru', // Если перевод не найден, использовать этот язык
    interpolation: {
      escapeValue: false, // React уже экранирует, так что это не нужно
    },
  });

export default i18n;