import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ExclamationCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../../hooks/useApiRequest';

import ShowInactive from './ShowInactive';
import BrandManagePage from './BrandManagePage';
import styles from './Atributte.module.css';

interface Brand {
  id: string;
  brand: string;
  manufacturer: string;
  deleted?: boolean;
}

const BrandList: React.FC = () => {
  const { t } = useTranslation('');  

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || '';
  const { sendRequest } = useApiRequest();

  const [reloadInactive, setReloadInactive] = useState(0);

  const headers = {
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  };

  /** ---- Загрузка ---- */
  const fetchBrands = async () => {
    setLoading(true);
    try {
      const data = await sendRequest(`${API_URL}/api/brand?deleted=false`, {
        headers,
      });
      setBrands(data);
    } catch {
      message.error(t('adminbrands.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  /** ---- Удаление ---- */
  const handleDelete = (brand: Brand) => {
    Modal.confirm({
      title: t('adminbrands.confirmDelete'),
      icon: <ExclamationCircleOutlined />,
      okText: t('adminbrands.common.yes'),
      cancelText: t('adminbrands.common.cancel'),

      onOk: async () => {
        try {
          const req = { brand: [{ ...brand, deleted: true }] };

          await sendRequest(`${API_URL}/api/brand/manage`, {
            method: 'POST',
            headers,
            body: JSON.stringify(req),
          });

          message.success(t('adminbrands.deleted'));
          

          setBrands(prev => prev.filter(b => b.id !== brand.id));
          setReloadInactive(prev => prev + 1);
        
        } catch (err: any) {
          const errText =
            err?.response?.data?.code === 'internal_error'
              ? t('adminbrands.common.internalError')
              : err?.response?.data?.text || t('adminbrands.common.error');

          message.error(errText);
        }
      },
    });
  };

  /** ---- Открыть форму ---- */
  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setModalVisible(true);
  };

  /** ---- Rollback ---- */
  const handleRollback = (newBrand: Brand) => {
    setBrands(prev => [...prev, newBrand]);
  };

  /** ---- Колонки ---- */
  const columns: ColumnsType<Brand> = [
    {
      title: '№',
      width: 40,
      render: (_v, _r, index) => index + 1,
    },
    {
      title: t('adminbrands.name'),
      dataIndex: 'brand',
    },
    {
      title: t('adminbrands.company'),
      dataIndex: 'manufacturer',
    },
    {
      title: '',
      width: 150,
      align: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => handleEdit(record)}>
            ✏️
          </Button>

          <Button danger type="link" onClick={() => handleDelete(record)}>
            🗑
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Заголовок */}
       <Space className={styles.headerSpace}>
        <h3>{t('adminbrands.list')}</h3>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingBrand(null);
            setModalVisible(true);
          }}
        >
          {t('adminbrands.add')}
        </Button>
     
      </Space>

      {/* Таблица */}
      <Table
        loading={loading}
        columns={columns}
        dataSource={brands}
        rowKey="id"
        pagination={false}
        className={styles.tableMarginTop}
      />

      <ShowInactive  key={reloadInactive} callback={handleRollback} mode="brand" />

      {/* Модалка */}
      <Modal
        width={700}
        open={modalVisible}
        footer={null}
        onCancel={() => setModalVisible(false)}
        destroyOnHidden
      >
        <BrandManagePage
          initialBrand={editingBrand}
          onSaved={() => {
            fetchBrands();
            setModalVisible(false);
          }}
        />
      </Modal>
    </div>
  );
};

export default BrandList;
