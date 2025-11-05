import React, { useEffect, useState } from 'react';
import { Button, Space, Table, message } from 'antd';
import useApiRequest from '../../hooks/useApiRequest';
import { useTranslation } from 'react-i18next';
import AddMarginModal from './AddMarginModal';
import styles from './MarkupTab.module.css'; 

interface MarginItem {
  id: string;
  name: string;
  object: string;
  rate: number;
  sum: number;
}

const types = {
  product: 3,
  brand: 2,
  category: 1,
} as const;

type MarginType = keyof typeof types;

const MarkupTab: React.FC = () => {
  const { sendRequest } = useApiRequest();
  const { t } = useTranslation();

  const [activeType, setActiveType] = useState<MarginType>('product');
  const [data, setData] = useState<MarginItem[]>([]);
  const [selectedRow, setSelectedRow] = useState<MarginItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);

  // Кеш для данных
  const [cachedData, setCachedData] = useState<Record<MarginType, MarginItem[]>>({
    product: [],
    brand: [],
    category: [],
  });

  // Загрузка всех данных при монтировании
  const loadAllData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken') || '';
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const urls = {
        product: `${import.meta.env.VITE_API_URL}/api/margin/info?type=${types.product}`,
        brand: `${import.meta.env.VITE_API_URL}/api/margin/info?type=${types.brand}`,
        category: `${import.meta.env.VITE_API_URL}/api/margin/info?type=${types.category}`,
      };

      const [productRes, brandRes, categoryRes] = await Promise.all([
        sendRequest(urls.product, { headers }),
        sendRequest(urls.brand, { headers }),
        sendRequest(urls.category, { headers }),
      ]);

      const updatedCache = {
        product: productRes || [],
        brand: brandRes || [],
        category: categoryRes || [],
      };

      setCachedData(updatedCache);
      setData(updatedCache[activeType]);
    } catch {
      message.error(t('pricingMaster.messages.loadError'));
    } finally {
      setLoading(false);
      setSelectedRow(null);
    }
  };

  // Обновить таблицу при переключении категории
  useEffect(() => {
    setData(cachedData[activeType]);
    setSelectedRow(null);
  }, [activeType, cachedData]);

  // Загружаем все данные при старте
  useEffect(() => {
    loadAllData();
  }, []);

  const handleDelete = async () => {
    if (!selectedRow) return;
    try {
      await sendRequest(`${import.meta.env.VITE_API_URL}/api/margin/del`, {
        method: 'POST',
        body: JSON.stringify({
          id: selectedRow.id,
          type: types[activeType],
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
      });
      message.success(t('pricingMaster.messages.deleteSuccess'));

      // Перезагрузить все данные, чтобы обновить кеш
      await loadAllData();
    } catch {
      message.error(t('pricingMaster.messages.deleteError'));
    }
  };

  const columns = [
    {
      title: t('pricingMaster.tableHeaders.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('pricingMaster.tableHeaders.marginRate'),
      dataIndex: 'rate',
      key: 'rate',
      render: (value: number) => `${value}%`,
    },
    {
      title: t('pricingMaster.tableHeaders.marginSum'),
      dataIndex: 'sum',
      key: 'sum',
    },
  ];

  return (
    <div>
      {/* Кнопки переключения типа */}
      <Space className={styles.buttonGroup}>
        <Button
          type={activeType === 'product' ? 'primary' : 'default'}
          onClick={() => setActiveType('product')}
        >
          {t('pricingMaster.buttons.products')}
        </Button>
        <Button
          type={activeType === 'brand' ? 'primary' : 'default'}
          onClick={() => setActiveType('brand')}
        >
          {t('pricingMaster.buttons.brands')}
        </Button>
        <Button
          type={activeType === 'category' ? 'primary' : 'default'}
          onClick={() => setActiveType('category')}
        >
          {t('pricingMaster.buttons.categories')}
        </Button>
      </Space>

      {/* Кнопки управления */}
      <div className={styles.actionButtons}>
        <Space>
          <Button type="primary" onClick={() => setAddModalVisible(true)}>
            {t('pricingMaster.buttons.add')}
          </Button>
          {selectedRow && (
            <Button danger onClick={handleDelete}>
              {t('pricingMaster.buttons.delete')}
            </Button>
          )}
        </Space>
      </div>

      {/* Таблица */}
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={columns}
        rowSelection={{
          type: 'radio',
          selectedRowKeys: selectedRow ? [selectedRow.id] : [],
          onChange: (_, selectedRows) => {
            setSelectedRow(selectedRows[0] || null);
          },
        }}
        pagination={{ pageSize: 10 }}
      />

      {/* Модальное окно */}
      <AddMarginModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSuccess={loadAllData}
        type={types[activeType]}
      />
    </div>
  );
};

export default MarkupTab;
