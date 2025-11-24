import React, { useEffect, useState, useCallback } from 'react';
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

  const getHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  }), []);

  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      try {
        const [barcodeData, taxData] = await Promise.all([
          sendRequest(`${API_URL}/api/pluproducts/barcode_unused`, { headers: getHeaders() }),
          sendRequest(`${API_URL}/api/taxes`, { headers: getHeaders() }),
        ]);

        setBarcodes(barcodeData);
        setTaxes(taxData);
      } catch (err) {
        console.error(err);
        message.error(t('products.loadError', { defaultValue: 'Ошибка загрузки базовых данных.' }));
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
  }, [t, sendRequest, API_URL, getHeaders]);

  const tabItems = [
    {
      key: '1',
      label: t('products.tabs.main', { defaultValue: 'Товары' }),
      children: <ProductsTab />,
    },
    {
      key: '2',
      label: t('products.tabs.weighted', { defaultValue: 'Весовые товары' }),
      // Передаем загруженные данные в компонент WeightsTab
      children: <WeightsTab taxes={taxes} barcodes={barcodes} />,
    },
    {
      key: '3',
      label: t('products.tabs.categories', { defaultValue: 'Категории' }),
      children: <CategoriesTab />,
    },
    {
      key: '4',
      label: t('products.tabs.attributes', { defaultValue: 'Атрибуты' }),
      children: <AttributesTab />,
    },
  ];

  if (loading)
    return (
      // Исправлено: отображаем Tabs, чтобы были видны заголовки, пока идет загрузка
      <Spin spinning={loading} tip={t('products.loading', { defaultValue: 'Загрузка...' })} size="large">
        <Tabs 
          defaultActiveKey="1" 
          items={tabItems.map(item => ({
            ...item,
            // Замена контента на заглушку, чтобы спиннер мог закрыть область
            children: <div style={{ height: 350, border: '1px solid #f0f0f0', borderRadius: 4 }} />
          }))}
        />
      </Spin>
    );

  return (
    <Tabs
      defaultActiveKey="1"
      items={tabItems}
    />
  );
};

export default ProductsPage;