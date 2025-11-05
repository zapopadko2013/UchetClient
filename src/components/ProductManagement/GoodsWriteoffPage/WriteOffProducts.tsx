import React, { useEffect, useState } from 'react';
import {
  Button,
  Modal,
  Table,
  Space,
  message,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../../hooks/useApiRequest';
import styles from './GoodsWriteoffPage.module.css';
import WriteOffProductModal from './WriteOffProductModal';

const { Title } = Typography;

interface Product {
  stock: string;
  attributes: string;
  code: string;
  name: string;
  amount: number;
  price: number;
  wholesale_price: number;
  total_price: number;
  source?: 'stock' | 'invoice';
}

interface Stock {
  id: string;
  name: string;
}

interface Props {
  invoiceNumber: string;
  stockFrom: string;
  stockTo: string;
  stocks: Stock[];
  onInvoiceDeleted: () => void;
  onInvoiceApplied?: () => void;
}

const WriteOffProducts: React.FC<Props> = ({
  invoiceNumber,
  stockFrom,
  stockTo,
  stocks,
  onInvoiceDeleted,
  onInvoiceApplied,
}) => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitModalVisible, setIsSubmitModalVisible] = useState(false);
  const [isAddFromStockVisible, setIsAddFromStockVisible] = useState(false);
  const [isAddFromInvoiceVisible, setIsAddFromInvoiceVisible] = useState(false);

  const [isAddFromStockDisabled, setIsAddFromStockDisabled] = useState(false);
  const [isAddFromInvoiceDisabled, setIsAddFromInvoiceDisabled] = useState(false);

  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  const fetchProducts = async () => {
    try {
      const data = await sendRequest(
        `${API_URL}/api/invoice/stockcurrent/product?invoicenumber=${invoiceNumber}`,
        { headers: getHeaders() }
      );
      setProducts(data || []);

      setSelectedProduct(null);

      if (data && data.length > 0) {
        setIsAddFromStockDisabled(false);
        setIsAddFromInvoiceDisabled(true);
      } else {
        setIsAddFromStockDisabled(false);
        setIsAddFromInvoiceDisabled(false);
      }
    } catch {
      message.error(t('writeOffProducts.loadError'));
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [invoiceNumber]);

  useEffect(() => {
    const hasInvoiceProducts = products.some(p => p.source === 'invoice');
    let hasStockProducts = false;
    if (!hasInvoiceProducts && products.length > 0) {
      hasStockProducts = true;
    }

    setIsAddFromStockDisabled(hasInvoiceProducts);
    setIsAddFromInvoiceDisabled(hasStockProducts);
  }, [products, stockFrom]);

  const handleAddFromInvoice = (newProducts: Product[]) => {
    setProducts(prevProducts => {
      const updated = [...prevProducts];
      newProducts.forEach(np => {
        const exists = updated.find(
          p => p.code === np.code && p.attributes === np.attributes && p.stock === np.stock
        );
        if (!exists) {
          updated.push({ ...np, source: 'invoice' });
        }
      });
      return updated;
    });
  };

  const handleDeleteInvoice = async () => {
    Modal.confirm({
      title: t('writeOffProducts.deleteInvoiceTitle'),
      content: t('writeOffProducts.deleteInvoiceConfirm'),
      okText: t('writeOffProducts.deleteInvoice'),
      cancelText: t('writeOffProducts.common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await sendRequest(`${API_URL}/api/invoice/delete`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ invoice: invoiceNumber }),
          });
          message.success(t('writeOffProducts.invoiceDeleted'));
          onInvoiceDeleted();
        } catch {
          message.error(t('writeOffProducts.invoiceDeleteError'));
        }
      },
    });
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;

    if (isAddFromStockDisabled) {
      setProducts(prev => prev.filter(p => p.stock !== selectedProduct.stock));
      message.success(t('writeOffProducts.productRemoved'));
      setSelectedProduct(null);
    } else {
      try {
        await sendRequest(`${API_URL}/api/invoice/delete/product`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            invoice: invoiceNumber,
            stock: selectedProduct.stock,
            attributes: selectedProduct.attributes,
          }),
        });
        message.success(t('writeOffProducts.productRemoved'));
        setSelectedProduct(null);
        fetchProducts();
      } catch {
        message.error(t('writeOffProducts.deleteProductError'));
      }
    }
  };

  const handleSubmitInvoice = async () => {
    if (products.length === 0) {
      message.warning(t('writeOffProducts.emptyInvoiceWarning'));
      return;
    }

   
    setIsLoading(true);

    try {
     
        const res = await sendRequest(`${API_URL}/api/invoice/submit/writeoff`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ invoice: invoiceNumber }),
        });

        if (res.code === 'success') {
          message.success(t('writeOffProducts.submitSuccess'));
          onInvoiceApplied?.();
        } else {
          message.error(res.text || t('writeOffProducts.submitError'));
        }
      
    } catch {
      message.error(t('writeOffProducts.submitError'));
    } finally {
      setIsLoading(false);
      setIsSubmitModalVisible(false);
    }
  };

  const columns: ColumnsType<Product> = [
    {
    title: t('writeOffProducts.common.name'),
    key: 'nameAndCode',
    render: (_, record) => (
      <div>
        <div><strong>{record.name}</strong></div>
        <div className={styles.placeholder}>{record.code}</div>
      </div>
    ),
  },{ title: t('writeOffProducts.common.retailPrice'), dataIndex: 'price', key: 'price', render: v => `${v} `, width: 120 },
    { title: t('writeOffProducts.common.quantity'), dataIndex: 'amount', key: 'amount', width: 100 },
    { title: t('writeOffProducts.common.reason'), dataIndex: 'reason', key: 'reason' },
  ];

  const stockFromName = stocks.find(s => s.id === stockFrom)?.name || '';
  const stockToName = stocks.find(s => s.id === stockTo)?.name || '';

  return (
    <div className={styles.wrappern}>
      <Title level={4}>{t('writeOffProducts.title', { number: invoiceNumber })}</Title>
      <p>
        {t('writeOffProducts.transferInfo', { from: stockFromName, to: stockToName })}
      </p>

      <Space className={styles.topButtons}>
        <Button danger onClick={handleDeleteInvoice}>{t('writeOffProducts.deleteInvoice')}</Button>
        <Button
          type="primary"
          onClick={() => setIsSubmitModalVisible(true)}
          disabled={products.length === 0}
        >
          {t('writeOffProducts.transferProducts')}
        </Button>
      </Space>

      <div className={styles.tableSection}>
        <Space className={styles.actionButtons}>
          <Button
            type="primary"
            onClick={() => setIsAddFromStockVisible(true)}
            disabled={isAddFromStockDisabled}
          >
            {t('writeOffProducts.addFromStock')}
          </Button>

          

          {selectedProduct && (
            <Button danger onClick={handleDeleteProduct}>
              {t('writeOffProducts.common.delete')}
            </Button>
          )}
        </Space>

        

        <Table
          rowKey={(record) => `${record.stock}-${record.code}`}
          columns={columns}
          dataSource={products}
          loading={isLoading}
          size="small"
          /* rowSelection={{ type: 'radio', onSelect: record => setSelectedProduct(record) }}
         */
         
          rowSelection={{
            type: 'radio',
            onSelect: record => setSelectedProduct(record),
            selectedRowKeys: selectedProduct ? [`${selectedProduct.stock}-${selectedProduct.code}`] : [],
          }}
         
         />
      </div>

      <Modal
        open={isSubmitModalVisible}
        onCancel={() => setIsSubmitModalVisible(false)}
        onOk={handleSubmitInvoice}
        okText={t('writeOffProducts.common.confirm')}
        cancelText={t('writeOffProducts.common.cancel')}
        okButtonProps={{ disabled: products.length === 0 }}
        confirmLoading={isLoading}
      >
        <p className={styles.modalTitle}>{t('writeOffProducts.confirmFinishTitle')}</p>
        <p>{t('writeOffProducts.confirmFinishText')}</p>
      </Modal>

     <WriteOffProductModal
  open={isAddFromStockVisible}
  onCancel={() => setIsAddFromStockVisible(false)}
  invoiceNumber={invoiceNumber}
  stockFrom={stockFrom}
  onProductWrittenOff={fetchProducts}
/>

    </div>
  );
};

export default WriteOffProducts;
