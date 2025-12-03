import React, { useState } from 'react';
import { Tabs } from 'antd';
import { useTranslation } from 'react-i18next'; // Импортируем useTranslation
import StockSimple from './StockSimple';
import StockAdvanced from './StockAdvanced'; 

// Деструктуризация TabPane не нужна, если используется пропс items
// const { TabPane } = Tabs; 

const StockReport: React.FC = () => {
  const { t } = useTranslation(); // Инициализируем хук перевода
  const [activeKey, setActiveKey] = useState('simple');

  const tabItems = [
    {
      // Используем ключ перевода для вкладки "Упрощённый"
      label: t('stockReport.tab.simple'), 
      key: 'simple',
      children: <StockSimple />,
    },
    {
      // Используем ключ перевода для вкладки "Расширенный"
      label: t('stockReport.tab.advanced'), 
      key: 'advanced',
      children: <StockAdvanced />,
    },
  ];

  return (
    <Tabs
      activeKey={activeKey}
      onChange={setActiveKey}
      items={tabItems}
    />
  );
};

export default StockReport;