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
import styles from './StockTransfer.module.css';
import AddProductFromStockModal from './AddProductFromStockModal';
import AddProductFromInvoiceModal from './AddProductFromInvoiceModal';

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

const StockTransferProducts: React.FC<Props> = ({
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
      message.error(t('stockTransferProducts.loadError'));
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
      title: t('stockTransferProducts.deleteInvoiceTitle'),
      content: t('stockTransferProducts.deleteInvoiceConfirm'),
      okText: t('stockTransferProducts.deleteInvoice'),
      cancelText: t('stockTransferProducts.common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await sendRequest(`${API_URL}/api/invoice/delete`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ invoice: invoiceNumber }),
          });
          message.success(t('stockTransferProducts.invoiceDeleted'));
          onInvoiceDeleted();
        } catch {
          message.error(t('stockTransferProducts.invoiceDeleteError'));
        }
      },
    });
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;

    if (isAddFromStockDisabled) {
      setProducts(prev => prev.filter(p => p.stock !== selectedProduct.stock));
      message.success(t('stockTransferProducts.productRemoved'));
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
        message.success(t('stockTransferProducts.productRemoved'));
        setSelectedProduct(null);
        fetchProducts();
      } catch {
        message.error(t('stockTransferProducts.deleteProductError'));
      }
    }
  };

  const handleSubmitInvoice = async () => {
    if (products.length === 0) {
      message.warning(t('stockTransferProducts.emptyInvoiceWarning'));
      return;
    }

    const hasInvoiceProducts = products.some(p => p.source === 'invoice');

    setIsLoading(true);

    try {
      if (hasInvoiceProducts) {
        const validProducts = products.map(p => ({
          id: p.stock,
          amount: p.amount,
          attributes: p.attributes,
          SKU: null,
        }));

        const payload = {
          invoice: invoiceNumber,
          type: '1',
          stockcurrentfrom: validProducts,
        };

        const res = await sendRequest(`${API_URL}/api/invoice/submit/movement/list`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payload),
        });

        if (res.code === 'success') {
          message.success(t('stockTransferProducts.submitSuccess'));
          onInvoiceApplied?.();
        } else {
          message.error(res.text || t('stockTransferProducts.submitError'));
        }
      } else {
        const res = await sendRequest(`${API_URL}/api/invoice/submit/movement`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ invoice: invoiceNumber }),
        });

        if (res.code === 'success') {
          message.success(t('stockTransferProducts.submitSuccess'));
          onInvoiceApplied?.();
        } else {
          message.error(res.text || t('stockTransferProducts.submitError'));
        }
      }
    } catch {
      message.error(t('stockTransferProducts.submitError'));
    } finally {
      setIsLoading(false);
      setIsSubmitModalVisible(false);
    }
  };

  const columns: ColumnsType<Product> = [
    { title: t('stockTransferProducts.common.name'), dataIndex: 'name', key: 'name' },
    { title: t('stockTransferProducts.common.code'), dataIndex: 'code', key: 'code', width: 160 },
    { title: t('stockTransferProducts.common.retailPrice'), dataIndex: 'price', key: 'price', render: v => `${v} `, width: 120 },
    { title: t('stockTransferProducts.common.wholesalePrice'), dataIndex: 'wholesale_price', key: 'wholesale_price', render: v => `${v || 0} `, width: 120 },
    { title: t('stockTransferProducts.common.quantity'), dataIndex: 'amount', key: 'amount', width: 100 },
    { title: t('stockTransferProducts.common.total'), dataIndex: 'total_price', key: 'total_price', render: v => `${v} `, width: 120 },
  ];

  const stockFromName = stocks.find(s => s.id === stockFrom)?.name || '';
  const stockToName = stocks.find(s => s.id === stockTo)?.name || '';

  return (
    <div className={styles.wrappern}>
      <Title level={4}>{t('stockTransferProducts.title', { number: invoiceNumber })}</Title>
      <p>
        {t('stockTransferProducts.transferInfo', { from: stockFromName, to: stockToName })}
      </p>

      <Space className={styles.topButtons}>
        <Button danger onClick={handleDeleteInvoice}>{t('stockTransferProducts.deleteInvoice')}</Button>
        <Button
          type="primary"
          onClick={() => setIsSubmitModalVisible(true)}
          disabled={products.length === 0}
        >
          {t('stockTransferProducts.transferProducts')}
        </Button>
      </Space>

      <div className={styles.tableSection}>
        <Space className={styles.actionButtons}>
          <Button
            type="primary"
            onClick={() => setIsAddFromStockVisible(true)}
            disabled={isAddFromStockDisabled}
          >
            {t('stockTransferProducts.addFromStock')}
          </Button>

          <Button
            onClick={() => setIsAddFromInvoiceVisible(true)}
            disabled={isAddFromInvoiceDisabled}
          >
            {t('stockTransferProducts.addFromInvoice')}
          </Button>

          {selectedProduct && (
            <Button danger onClick={handleDeleteProduct}>
              {t('stockTransferProducts.common.delete')}
            </Button>
          )}
        </Space>

        <AddProductFromStockModal
          open={isAddFromStockVisible}
          onCancel={() => setIsAddFromStockVisible(false)}
          invoiceNumber={invoiceNumber}
          stockFrom={stockFrom}
          stockTo={stockTo}
          onProductAdded={fetchProducts}
          stocks={stocks}
        />

        <AddProductFromInvoiceModal
          open={isAddFromInvoiceVisible}
          onCancel={() => setIsAddFromInvoiceVisible(false)}
          invoiceNumber={invoiceNumber}
          stockFrom={stockFrom}
          onProductAdded={handleAddFromInvoice}
        />

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
        okText={t('stockTransferProducts.common.confirm')}
        cancelText={t('stockTransferProducts.common.cancel')}
        okButtonProps={{ disabled: products.length === 0 }}
        confirmLoading={isLoading}
      >
        <p className={styles.modalTitle}>{t('stockTransferProducts.confirmFinishTitle')}</p>
        <p>{t('stockTransferProducts.confirmFinishText')}</p>
      </Modal>
    </div>
  );
};

export default StockTransferProducts;
