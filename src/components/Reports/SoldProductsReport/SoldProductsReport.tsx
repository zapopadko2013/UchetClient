import React, { useState } from 'react';
import { Tabs } from 'antd';
import { useTranslation } from 'react-i18next'; // Импортируем useTranslation
import SoldProductsSimple from './SoldProductsSimple';
import SoldProductsAdvanced from './SoldProductsAdvanced'; 

// Деструктуризация TabPane не нужна, если используется пропс items
// const { TabPane } = Tabs; 

const SoldProductsReport: React.FC = () => {
  const { t } = useTranslation(); // Инициализируем хук перевода
  const [activeKey, setActiveKey] = useState('simple');

  const tabItems = [
    {
      // Используем ключ перевода для вкладки "Упрощённый"
      label: t('soldProducts.tab.simple'), 
      key: 'simple',
      children: <SoldProductsSimple />,
    },
    {
      // Используем ключ перевода для вкладки "Расширенный"
      label: t('soldProducts.tab.advanced'), 
      key: 'advanced',
      children: <SoldProductsAdvanced />,
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

export default SoldProductsReport;