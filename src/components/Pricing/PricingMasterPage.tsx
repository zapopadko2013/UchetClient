import React, { useState } from 'react';
import { Tabs } from 'antd';
import MarkupTab from './MarkupTab';
import SettingsTab from './SettingsTab';
import { useTranslation } from 'react-i18next';

const PricingMasterPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('markup');

  const items = [
    {
      key: 'markup',
      label: t('pricingMaster.tabs.markup'),
      children: <MarkupTab />,
    },
    {
      key: 'settings',
      label: t('pricingMaster.tabs.settings'),
      children: <SettingsTab />,
    },
  ];

  return (
    <div>
      <h2>{t('pricingMaster.title')}</h2>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={items}
      />
    </div>
  );
};

export default PricingMasterPage;
