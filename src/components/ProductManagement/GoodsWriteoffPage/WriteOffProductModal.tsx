import React, { useEffect, useState } from 'react';
import { Modal, Select, Input, Button, Table, message } from 'antd';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../../hooks/useApiRequest';
import styles from './GoodsWriteoffPage.module.css';

const { TextArea } = Input;

interface Product {
  id: string;
  name: string;
  code: string;
  units: string;
  attributes: string;
  purchaseprice: number;
  price: number;
}

interface ProductDetail {
  id: string;
  units: number;
  price: number;
  purchaseprice: number;
  attributes: string;
}

interface Props {
  open: boolean;
  onCancel: () => void;
  invoiceNumber: string;
  stockFrom: string;
  onProductWrittenOff: () => void;
}

const WriteOffProductModal: React.FC<Props> = ({
  open,
  onCancel,
  invoiceNumber,
  stockFrom,
  onProductWrittenOff,
}) => {
  const { t } = useTranslation(); // инициализация переводов
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productDetail, setProductDetail] = useState<ProductDetail | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  const resetState = () => {
    setSelectedProduct(null);
    setProductDetail(null);
    setAmount(null);
    setReason('');
  };

  const handleCancel = () => {
    resetState();
    onCancel();
  };

  // Загружаем список продуктов
  useEffect(() => {
    if (!open) return;
    const fetchProducts = async () => {
      try {
        const data = await sendRequest(
          `${API_URL}/api/products/stockcurrent/stock?stockid=${stockFrom}&isWeightProduct=true`,
          { headers: getHeaders() }
        );
        setProducts(data || []);
      } catch {
        message.error(t('writeOffProducts.loadError'));
      }
    };
    fetchProducts();
  }, [open]);

  const handleSelectProduct = async (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    setSelectedProduct(product);

    try {
      const data = await sendRequest(
        `${API_URL}/api/stockcurrent/detail?stockcurrentid=${id}`,
        { headers: getHeaders() }
      );
      setProductDetail(data);
    } catch {
      message.error(t('writeOffProducts.loadError'));
      setProductDetail(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProduct) {
      message.warning(t('writeOffProducts.selectProduct'));
      return;
    }
    if (!productDetail) {
      message.warning(t('writeOffProducts.loadError'));
      return;
    }
    if (!amount || amount <= 0) {
      message.warning(t('writeOffProducts.select')+t('writeOffProducts.common.quantity'));
      return;
    }
    if (!reason.trim()) {
      message.warning(t('writeOffProducts.select')+t('writeOffProducts.common.reason'));
      return;
    }

    setIsSubmitting(true);
    try {
      await sendRequest(`${API_URL}/api/invoice/add/product`, {
        method: 'POST',
        body: JSON.stringify({
          invoice: invoiceNumber,
          type: '7',
          stockcurrentfrom: [
            {
              id: productDetail.id,
              amount,
              reason,
              attributes: productDetail.attributes,
              SKU: null,
              newprice: productDetail.price,
            },
          ],
        }),
        headers: getHeaders(),
      });
      message.success(t('writeOffProducts.addSuccess'));
      onProductWrittenOff();
      resetState();
      onCancel();
    } catch {
      message.error(t('writeOffProducts.addError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title={t('writeOffProducts.transferProducts')}
      open={open}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          {t('writeOffProducts.common.cancel')}
        </Button>,
        <Button key="submit" type="primary" loading={isSubmitting} onClick={handleSubmit}>
          {t('writeOffProducts.transferProducts')}
        </Button>,
      ]}
      width={400}
    >
      <div className={styles.topButtons}>
        <label>{t('writeOffProducts.common.name')}:</label>
        <Select
          showSearch
          className={styles.datePickerFullWidth}
          placeholder={t('writeOffProducts.common.name')}
          value={selectedProduct?.id}
          onChange={handleSelectProduct}
          options={products.map(p => ({ label: p.name, value: p.id }))}
        />
      </div>

      <div className={styles.topButtons}>
        <label>{t('writeOffProducts.common.code')}:</label>
        <Select
          showSearch
          className={styles.datePickerFullWidth}
          placeholder={t('writeOffProducts.common.code')}
          value={selectedProduct?.id}
          onChange={handleSelectProduct}
          options={products.map(p => ({ label: p.code, value: p.id }))}
        />
      </div>

      {productDetail && (
        <Table
          rowKey="id"
          columns={[
            { title: t('writeOffProducts.common.quantity'), dataIndex: 'units', key: 'units' },
            { title: t('writeOffProducts.common.retailPrice'), dataIndex: 'price', key: 'price' },
            { title: t('writeOffProducts.common.wholesalePrice'), dataIndex: 'purchaseprice', key: 'purchaseprice' },
          ]}
          dataSource={[productDetail]}
          pagination={false}
          size="small"
        />
      )}

      <div className={styles.marginVertical16}>
        <label>{t('writeOffProducts.common.quantity')}:</label>
        <Input
          type="number"
          min={1}
          value={amount ?? undefined}
          onChange={e => setAmount(Number(e.target.value))}
        />
      </div>

      <div className={styles.topButtons}>
        <label>{t('writeOffProducts.common.reason')}:</label>
        <TextArea
          rows={3}
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
      </div>
    </Modal>
  );
};

export default WriteOffProductModal;
