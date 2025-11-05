import React, { useState } from 'react';
import { Tabs } from 'antd';
import { useTranslation } from 'react-i18next';
import HistoryTab from './HistoryTab';
import CreateInvoice from './CreateInvoice';

const GoodsReceipt: React.FC = () => {
  const { t } = useTranslation();
  const [activeKey, setActiveKey] = useState<string>('history');

  const tabItems = [
    {
      key: 'history',
      label: t('goodsReceipt.tabs.history'), 
      children: <HistoryTab />,
    },
    {
      key: 'create',
      label: t('goodsReceipt.tabs.create'), 
      children: <CreateInvoice />,
    },
  ];

  return <Tabs activeKey={activeKey} onChange={setActiveKey} items={tabItems} />;
};

export default GoodsReceipt;
