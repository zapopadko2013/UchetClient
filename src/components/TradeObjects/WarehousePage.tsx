import React, { useEffect, useState } from 'react';
import { Tabs, Button, Table, Space, Modal, message, Input, Tag } from 'antd';
import { useTranslation } from 'react-i18next';

import useApiRequest from '../../hooks/useApiRequest';
import styles from './WarehousePage.module.css';

interface Warehouse {
  id: string;
  name: string;
  address: string;
  is_minus?: boolean;             // может отсутствовать у некоторых складов
  status: string;     
  point_type: number;             // например, 0 — центральный склад, 1 — склад точки
  point_type_name: string;        // строковое название типа
  wholesale?: boolean;            // оптовый, может быть только у ACTIVE
}


const WarehousePage: React.FC = () => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();

  const [activeWarehouse, setActiveWarehouse] = useState<Warehouse[]>([]);
  const [inactiveWarehouse, setInactiveWarehouse] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [search, setSearch] = useState('');

  const loadWarehouse = async () => {
    try {
      const [active, inactive] = await Promise.all([
        sendRequest(`${import.meta.env.VITE_API_URL}/api/stock`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
        }),
        sendRequest(`${import.meta.env.VITE_API_URL}/api/stock/inactive`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
        }),
      ]);
      setActiveWarehouse(active);
      setInactiveWarehouse(inactive);
      setSelectedWarehouse(null);
    } catch (err) {
      message.error(t('warehouse.loadingError'));
    }
  };

  useEffect(() => {
    loadWarehouse();
  }, []);


  const filteredData = (activeTab === 'active' ? activeWarehouse : inactiveWarehouse).filter(
    buyer =>
      buyer.name.toLowerCase().includes(search) || buyer.address.includes(search) 
  );

  const columns = [
    {
      title: t('warehouse.name'),
      dataIndex: 'name',
    },
    {
      title: t('warehouse.address'),
      dataIndex: 'address',
    },
    
    ...(activeTab === 'inactive'
      ? [
          {
            title: t('warehouse.status'),
            render: () => <Tag color="red">{t('warehouse.deleted')}</Tag>,
          },
        ]
      : []),
  ];

  return (
    <div className={styles.container}>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key as 'active' | 'inactive');
          setSelectedWarehouse(null);
          setSearch('');
        }}
        items={[
          { key: 'active', label: t('warehouse.activeWarehouse') },
          { key: 'inactive', label: t('warehouse.inactiveWarehouse') },
        ]}
      />

      <Table
         rowKey="id"
         dataSource={filteredData}
         columns={columns}
         pagination={false}
      />
      
    </div>
  );
};

export default WarehousePage;
