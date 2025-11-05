import React, { useEffect, useState } from 'react';
import {
  Tabs,
  Table,
  Button,
  Tag,
  message,
  Space,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import CouponAddModal from './CouponAddModal';
import styles from './CouponsPage.module.css';
import useApiRequest from '../../hooks/useApiRequest';

interface Coupon {
  id: string;
  number: string;
  discount: number;
  objtype: string;
  subtype: string;
  expire: string;
  active: boolean;
  type: string;
  object: string;
}

const CouponsPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeCoupons, setActiveCoupons] = useState<Coupon[]>([]);
  const [inactiveCoupons, setInactiveCoupons] = useState<Coupon[]>([]);
  const [selectedRow, setSelectedRow] = useState<Coupon | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { sendRequest } = useApiRequest();

  const API_URL = import.meta.env.VITE_API_URL || '';

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  const fetchCoupons = async() => {
    
      try {
            const [activeData, inactiveData] = await Promise.all([
              sendRequest(`${API_URL}/api/coupons?active=1`, { headers: getHeaders() }),
      sendRequest(`${API_URL}/api/coupons?active=0`, { headers: getHeaders() }),
    
            ]);
            setActiveCoupons(activeData);
        setInactiveCoupons(inactiveData);
          } catch (err) {
            console.log(err);
            message.error(t('coupons.loadError'));
          }
  };

  const deleteCoupon = () => {
    if (!selectedRow) return;
    sendRequest(`${API_URL}/api/coupons/del`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ id: selectedRow.id }),
    })
        .then(() => {
        message.success(t('coupons.deleted'));
        setSelectedRow(null);
        fetchCoupons();
      })
      .catch(() => message.error(t('coupons.deleteError')));
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const columns: ColumnsType<Coupon> = [
    {
      title: t('coupons.columns.number'),
      dataIndex: 'number',
      key: 'number',
    },
    {
      title: t('coupons.columns.binding'),
      dataIndex: 'objtype',
      key: 'objtype',
      filters: [
        { text: t('coupons.bindings.all'), value: 'все' },
        { text: t('coupons.bindings.category'), value: 'категория' },
        { text: t('coupons.bindings.brand'), value: 'бренд' },
        { text: t('coupons.bindings.product'), value: 'товар' },
        { text: t('coupons.bindings.receipt'), value: 'чек' },
      ],
      onFilter: (value, record) => record.objtype === value,
      render: (_, record) => (
        <div>
          <div>{record.object}</div>
          <div className={styles.objtypeDescription}>
            {`${t('coupons.bindingPrefix')} ${record.objtype}`}
          </div>
        </div>
      ),
    },
    {
      title: t('coupons.columns.type'),
      key: 'type',
      render: (_, record) => `${record.type} (${record.subtype})`,
      filters: [
        { text: t('coupons.types.multi'), value: 'Многоразовый' },
        { text: t('coupons.types.single'), value: 'Одноразовый' },
      ],
      onFilter: (value, record) => record.subtype === value,
    },
    {
      title: t('coupons.columns.expire'),
      dataIndex: 'expire',
      key: 'expire',
      sorter: (a, b) => dayjs(a.expire).unix() - dayjs(b.expire).unix(),
      render: (text: string) => dayjs(text).format('DD.MM.YYYY'),
    },
    {
      title: t('coupons.columns.discount'),
      dataIndex: 'discount',
      key: 'discount',
      render: (text: number) => `${text}%`,
    },
    {
      title: t('coupons.columns.status'),
      key: 'status',
      render: (_, record) =>
        record.active ? (
          <Tag color="green">{t('coupons.status.active')}</Tag>
        ) : (
          <Tag color="red">{t('coupons.status.inactive')}</Tag>
        ),
    },
  ];

  const items = [
    {
      key: '1',
      label: t('coupons.tabs.active'),
      children: (
        <>
          <Space className={styles.actions}>
            <Button type="primary" onClick={() => setModalVisible(true)}>
              {t('coupons.actions.add')}
            </Button>
            {selectedRow && (
              <Button danger onClick={deleteCoupon}>
                {t('coupons.actions.delete')}
              </Button>
            )}
          </Space>
          <Table
            rowKey="id"
            rowSelection={{
              type: 'radio',
              selectedRowKeys: selectedRow ? [selectedRow.id] : [],
              onChange: (_, selectedRows) => setSelectedRow(selectedRows[0]),
            }}
            columns={columns}
            dataSource={activeCoupons}
          />
        </>
      ),
    },
    {
      key: '2',
      label: t('coupons.tabs.inactive'),
      children: <Table rowKey="id" columns={columns} dataSource={inactiveCoupons} />,
    },
  ];

  return (
    <>
      <Tabs defaultActiveKey="1" items={items} />

      <CouponAddModal
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onSave={() => {
          fetchCoupons();
          setModalVisible(false);
        }}
      />
    </>
  );
};

export default CouponsPage;
