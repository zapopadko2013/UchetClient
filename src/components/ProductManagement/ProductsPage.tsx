import React, { useEffect, useState } from 'react';
import { Tabs, message, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import type { Barcode, Tax } from './index';
import WeightsTab from './WeightsTab';
import ProductsTab from './ProductsTab';
import CategoriesTab from './CategoriesTab';
import AttributesTab from './AttributesTab';
import useApiRequest from '../../hooks/useApiRequest';

const ProductsPage: React.FC = () => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  const [barcodes, setBarcodes] = useState<Barcode[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [barcodeData, taxData] = await Promise.all([
          sendRequest(`${API_URL}/api/pluproducts/barcode_unused`, { headers: getHeaders() }),
          sendRequest(`${API_URL}/api/taxes`, { headers: getHeaders() }),
        ]);

        setBarcodes(barcodeData);
        setTaxes(taxData);
      } catch (err) {
        console.error(err);
        message.error(t('products.loadError'));
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
  }, [t]);

  if (loading)
    return (
      <Spin spinning={loading} tip={t('products.loading')} size="large">
        <Tabs defaultActiveKey="1" />
      </Spin>
    );

  return (
    <Tabs
      defaultActiveKey="1"
      items={[
        {
          key: '1',
          label: t('products.tabs.main'), // 🏷 Товары
          children: <ProductsTab />,
        },
        {
          key: '2',
          label: t('products.tabs.weighted'), // ⚖️ Весовые товары
          children: <WeightsTab taxes={taxes} barcodes={barcodes} />,
        },
        {
          key: '3',
          label: t('products.tabs.categories'), // 🗂 Категории
          children: <CategoriesTab />,
        },
        {
          key: '4',
          label: t('products.tabs.attributes'), // 🧩 Атрибуты
          children: <AttributesTab />,
        },
      ]}
    />
  );
};

export default ProductsPage;
