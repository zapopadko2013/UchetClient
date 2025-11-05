import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Input, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../hooks/useApiRequest';
import AddLimitPriceModal from './AddLimitPriceModal';
import EditLimitPriceModal from './EditLimitPriceModal';
import styles from './LimitPricesPage.module.css';  

interface Product {
  id: string;
  name: string;
  code: string;
  price: number | null;
  staticprice: number | null;
}

const LimitPricesPage: React.FC = () => {
  const { sendRequest } = useApiRequest();
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await sendRequest(
        `${import.meta.env.VITE_API_URL}/api/products/withprice?type=list`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
        }
      );
      const filtered = res.filter(
        (p: Product) => p.price !== null && p.staticprice !== null
      );
      setProducts(filtered);
      setFilteredProducts(filtered);
    } catch (e) {
      message.error(t('limitPrices.messages.loadError'));
    } finally {
      setLoading(false);
      setSelectedProduct(null);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleDelete = async () => {
    if (!selectedProduct) return;
    try {
      await sendRequest(
        `${import.meta.env.VITE_API_URL}/api/products/staticprice/deleteprod`,
        {
          method: 'POST',
          body: JSON.stringify({
            product: selectedProduct.id,
          }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
        }
      );
      message.success(t('limitPrices.messages.deleteSuccess'));
      loadProducts();
    } catch (e) {
      message.error(t('limitPrices.messages.deleteError'));
    }
  };

  const columns = [
    {
      title: t('limitPrices.form.product'),
      dataIndex: 'name',
      key: 'name',
      render: (_: any, record: Product) => (
        <>
          <div>{record.name || '-'}</div>
          <div className={styles.productCode}>{record.code}</div>
        </>
      ),
    },
    {
      title: t('limitPrices.form.price'),
      dataIndex: 'price',
      key: 'price',
    },
    {
      title: t('limitPrices.form.limitPrice'),
      dataIndex: 'staticprice',
      key: 'staticprice',
    },
  ];

  const handleSearch = (value: string) => {
    setSearchText(value);
    const lower = value.toLowerCase();
    const filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) || p.code.toLowerCase().includes(lower)
    );
    setFilteredProducts(filtered);
  };

  return (
    <div>
        <h1 className={styles.pageTitle}>{t('limitPrices.title')}</h1>
      <div className={styles.actionsWrapper}>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddModalVisible(true)}
          >
            {t('limitPrices.actions.add')}
          </Button>

          {selectedProduct && (
            <>
              <Button
                icon={<EditOutlined />}
                onClick={() => setEditModalVisible(true)}
              >
                {t('limitPrices.actions.edit')}
              </Button>
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
                {t('limitPrices.actions.delete')}
              </Button>
            </>
          )}
        </Space>
      </div>

      <div className={styles.searchWrapper}>
        <Input.Search
          placeholder={t('limitPrices.form.product') + ' / ' + t('limitPrices.form.barcode')}
          allowClear
          onSearch={handleSearch}
          value={searchText}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      <Table
        rowKey="id"
        dataSource={filteredProducts}
        columns={columns}
        loading={loading}
        rowSelection={{
          type: 'radio',
          selectedRowKeys: selectedProduct ? [selectedProduct.id] : [],
          onChange: (_, selectedRows) => {
            setSelectedProduct(selectedRows[0] || null);
          },
        }}
        pagination={{ pageSize: 10 }}
      />

      <AddLimitPriceModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSuccess={loadProducts}
      />
      {selectedProduct && (
        <EditLimitPriceModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          onSuccess={loadProducts}
          productId={selectedProduct.id}
          initialPrice={selectedProduct.staticprice}
        />
      )}
    </div>
  );
};

export default LimitPricesPage;
