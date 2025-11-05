import React, { useEffect, useState } from 'react';
import {
  Modal,
  Select,
  InputNumber,
  Table,
  Button,
  Space,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../../hooks/useApiRequest';
import styles from './StockTransfer.module.css';

interface ProductFromStock {
  id: string;
  idto: string;
  name: string;
  code: string;
  prodid: string;
  units: string;
  attributes: string;
  attributescaption: string;
  unitspr_shortname: string;
}

interface StockDetail {
  id: string;
  units: number;
  price: number;
  wholesale_price: number;
}

interface Stock {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onCancel: () => void;
  invoiceNumber: string;
  stockFrom: string;
  stockTo: string;
  onProductAdded: () => void;
  stocks: Stock[];
}

const AddProductFromStockModal: React.FC<Props> = ({
  open,
  onCancel,
  invoiceNumber,
  stockFrom,
  stockTo,
  onProductAdded,
  stocks,
}) => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();
  const [products, setProducts] = useState<ProductFromStock[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductFromStock | null>(null);
  const [detail, setDetail] = useState<StockDetail | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<'from' | 'to' | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || '';

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  const getStockName = (id: string) =>
    stocks.find((s) => s.id === id)?.name || id;

  const fetchProducts = async () => {
    try {
      const data = await sendRequest(
        `${API_URL}/api/products/stockcurrent/stock?stockid=${stockFrom}&stocktoid=${stockTo}`,
        { headers: getHeaders() }
      );
      setProducts(data || []);
    } catch {
      message.error(t('addProductFromStock.loadError'));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      (e.key >= '0' && e.key <= '9') ||
      ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) ||
      e.key.startsWith('Numpad') ||
      ((e.metaKey || e.ctrlKey) && ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase()))
    ) {
      return;
    }
    e.preventDefault();
  };

  const resetState = () => {
    setProducts([]);
    setSelectedProduct(null);
    setDetail(null);
    setSelectedPrice(null);
    setAmount(null);
  };

  useEffect(() => {
    if (open) {
      resetState();
      fetchProducts();
    }
  }, [open]);

  const handleSelectProduct = async (id: string) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    setSelectedProduct(product);

    try {
      const data = await sendRequest(
        `${API_URL}/api/stockcurrent/detail?stockcurrentid=${id}`,
        { headers: getHeaders() }
      );
      setDetail(data);
    } catch {
      message.error(t('addProductFromStock.detailLoadError'));
    }
  };

  const handleAddProduct = async () => {
    if (!amount) {
      message.warning(t('addProductFromStock.enterQuantity'));
      return;
    }
    if (amount <= 0) {
      message.warning(t('addProductFromStock.quantityGreaterThanZero'));
      return;
    }
    if (!selectedPrice) {
      message.warning(t('addProductFromStock.selectPrice'));
      return;
    }
    if (!detail) {
      message.error(t('addProductFromStock.noDetails'));
      return;
    }

    const payload = {
      invoice: invoiceNumber,
      type: '1',
      stockcurrentfrom: [
        {
          id: detail.id,
          amount: amount.toString(),
          attributes: '0',
          SKU: null,
          newprice: selectedPrice === 'from' ? detail.price : detail.wholesale_price,
          piece: false,
          pieceprice: 0,
          unitsprid: '1',
          wholesale_price: detail.wholesale_price,
        },
      ],
    };

    setIsLoading(true);
    try {
      const res = await sendRequest(`${API_URL}/api/invoice/add/product`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.code === 'success') {
        message.success(t('addProductFromStock.addSuccess'));
        onProductAdded();
        onCancel();
        resetState();
      } else {
        message.error(res.text || t('addProductFromStock.addError'));
      }
    } catch {
      message.error(t('addProductFromStock.addError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    resetState();
    onCancel();
  };

  const columns: ColumnsType<any> = [
    {
      title: t('addProductFromStock.inStock'),
      dataIndex: 'units',
      key: 'units',
      render: () => detail?.units ?? '-',
    },
    {
      title: t('addProductFromStock.warehouseFromPrice', { from: getStockName(stockFrom) }),
      key: 'priceFrom',
      render: () => (
        <Button
          type={selectedPrice === 'from' ? 'primary' : 'default'}
          onClick={() => setSelectedPrice('from')}
        >
          {detail?.price ?? '-'}
        </Button>
      ),
    },
    {
      title: t('addProductFromStock.warehouseToPrice', { to: getStockName(stockTo) }),
      key: 'priceTo',
      render: () => (
        <Button
          type={selectedPrice === 'to' ? 'primary' : 'default'}
          onClick={() => setSelectedPrice('to')}
        >
          {detail?.wholesale_price ?? '-'}
        </Button>
      ),
    },
    {
      title: t('addProductFromStock.wholesalePrice'),
      dataIndex: 'wholesale_price',
      key: 'wholesale_price',
      render: () => detail?.wholesale_price ?? '-',
    },
    {
      title: t('addProductFromStock.move'),
      key: 'amount',
      render: () => (
        <InputNumber
          min={1}
          max={detail?.units ?? 0}
          value={amount ?? undefined}
          onChange={(v) => setAmount(v || null)}
          parser={(value) => Number((value ?? '').replace(/[^\d]/g, ''))}
          onKeyDown={handleKeyDown}
          stringMode
        />
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title={t('addProductFromStock.title')}
      onCancel={handleCancel}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <Space direction="vertical" className={styles.datePickerFullWidth}>
        <Select
    showSearch
    placeholder={t('stockTransferProducts.common.name')}
    className={styles.datePickerFullWidth}
    optionFilterProp="label"
    style={{ flex: 1 }}
    value={selectedProduct?.id}
    onChange={(id) => handleSelectProduct(id)}
    options={products.map((p) => ({
      label: p.name,
      value: p.id,
    }))}
  />

  <Select
    showSearch
    placeholder={t('stockTransferProducts.common.code')}
    className={styles.datePickerFullWidth}
    optionFilterProp="label"
    style={{ flex: 1 }}
    value={selectedProduct?.id}
    onChange={(id) => handleSelectProduct(id)}
    options={products.map((p) => ({
      label: p.code,
      value: p.id,
    }))}
  />

        

        {selectedProduct && detail && (
          <Table
            columns={columns}
            dataSource={[detail]}
            pagination={false}
            rowKey="id"
            size="small"
          />
        )}

        <Space className={styles.modalFooter}>
          <Button onClick={handleCancel}>{t('addProductFromStock.cancel')}</Button>
          <Button
            type="primary"
            onClick={handleAddProduct}
            loading={isLoading}
          >
            {t('addProductFromStock.add')}
          </Button>
        </Space>
      </Space>
    </Modal>
  );
};

export default AddProductFromStockModal;
