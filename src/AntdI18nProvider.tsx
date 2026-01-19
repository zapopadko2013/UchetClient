import React from 'react';
import { ConfigProvider } from 'antd';
import { useTranslation } from 'react-i18next';
import enUS from 'antd/locale/en_US';
import ruRU from 'antd/locale/ru_RU';
import kkKZ from 'antd/locale/kk_KZ';

const antdLocales: Record<string, any> = { en: enUS, ru: ruRU, kk: kkKZ };

export const AntdI18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  
  // Берем только первые две буквы: "ru-RU" -> "ru", "kk-KZ" -> "kk"
  const langKey = i18n.language ? i18n.language.substring(0, 2) : 'ru';
  const locale = antdLocales[langKey] || ruRU;

  return <ConfigProvider locale={locale}>{children}</ConfigProvider>;
};
