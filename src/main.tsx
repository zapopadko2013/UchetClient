import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import { I18nextProvider } from 'react-i18next';
import { ConfigProvider } from 'antd';
import i18n from './i18n'; // Ваш файл конфигурации

// Используем функцию i18n.getLocale() или подобный способ, чтобы получить текущий объект локали Ant Design
// В нашем случае, мы берем его из ресурсов i18n
const antdLocale = i18n.options.resources[i18n.language].antd;

createRoot(document.getElementById('root')!).render(
 
    <I18nextProvider i18n={i18n}>
      <ConfigProvider locale={antdLocale}>
        <App />
      </ConfigProvider>
    </I18nextProvider>
 
)
