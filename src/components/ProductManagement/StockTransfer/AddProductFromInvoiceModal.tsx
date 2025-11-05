import React, { useEffect, useState } from 'react';
import {
  Modal,
  Select,
  Table,
  Input,
  Button,
  Space,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../../hooks/useApiRequest';
import styles from './StockTransfer.module.css';

interface Invoice {
  invoicenumber: string;
  invoicedate: string;
}

interface ProductFromInvoice {
  id: string;
  name: string;
  code: string;
  attributes: string;
  attributescaption: string;
  units: string;
  totalunits: number;
}

interface Product {
  stock: string;
  attributes: string;
  code: string;
  name: string;
  amount: number;
  price: number;
  wholesale_price: number;
  total_price: number;
}

interface Props {
  open: boolean;
  onCancel: () => void;
  invoiceNumber: string;
  stockFrom: string;
  onProductAdded: (selected: any[]) => void;
}

const AddProductFromInvoiceModal: React.FC<Props> = ({
  open,
  onCancel,
  stockFrom,
  onProductAdded,
}) => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductFromInvoice[]>([]);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  const fetchInvoices = async () => {
    try {
      const data = await sendRequest(
        `${API_URL}/api/invoice/list?type=2&status=ACCEPTED&stockfrom=${stockFrom}`,
        { headers: getHeaders() }
      );
      setInvoices(data || []);
    } catch {
      message.error(t('addProductFromInvoice.loadError'));
    }
  };

  useEffect(() => {
    if (open) {
      setInvoices([]);
      setSelectedInvoice(null);
      setProducts([]);
      setSelectedRows([]);
      setQuantities({});
      setSelectedRowKeys([]);
      fetchInvoices();
    }
  }, [open]);

  const handleSelectInvoice = async (invNumber: string) => {
    setSelectedInvoice(invNumber);
    try {
      const data = await sendRequest(
        `${API_URL}/api/stockcurrent/products?invoiceNumber=${invNumber}`,
        { headers: getHeaders() }
      );
      setProducts(data || []);
    } catch {
      message.error(t('addProductFromInvoice.productsLoadError'));
    }
  };

  const handleAddProducts = () => {
    const validProductsForTable: Product[] = selectedRows
      .filter((p) => quantities[p.id] && quantities[p.id] > 0)
      .map((p) => ({
        stock: p.id,
        attributes: p.attributes,
        code: p.code,
        name: p.name,
        amount: quantities[p.id],
        price: 0,
        wholesale_price: 0,
        total_price: 0,
      }));

    if (validProductsForTable.length === 0) {
      message.warning(t('addProductFromInvoice.selectAtLeastOne'));
      return;
    }

    onProductAdded(validProductsForTable);
    onCancel();
  };

  const columns: ColumnsType<ProductFromInvoice> = [
    {
      title: t('addProductFromInvoice.name'),
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: t('addProductFromInvoice.barcode'),
      dataIndex: 'code',
      key: 'code',
      width: 150,
    },
    {
      title: t('addProductFromInvoice.attributes'),
      dataIndex: 'attributescaption',
      key: 'attributescaption',
      render: (v) => v || '-',
      width: 160,
    },
    {
      title: t('addProductFromInvoice.inInvoice'),
      dataIndex: 'totalunits',
      key: 'totalunits',
      width: 100,
    },
    {
      title: t('addProductFromInvoice.inStock'),
      dataIndex: 'units',
      key: 'units',
      width: 100,
    },
    {
      title: t('addProductFromInvoice.move'),
      key: 'amount',
      render: (_, record) => (
        <Input
          value={quantities[record.id] || ''}
          placeholder={t('addProductFromInvoice.enterQuantity')}
          className={styles.datePickerFullWidth}
          onChange={(e) => {
            const value = e.target.value;
            if (/^\d*$/.test(value)) {
              const num = Number(value);

              if (num === 0) {
                setQuantities((prev) => {
                  const newState = { ...prev };
                  delete newState[record.id];
                  return newState;
                });

                setSelectedRowKeys((prevKeys) =>
                  prevKeys.filter((k) => k !== record.id)
                );
                setSelectedRows((prev) =>
                  prev.filter((p) => p.id !== record.id)
                );
              } else {
                setQuantities((prev) => ({ ...prev, [record.id]: num }));

                setSelectedRows((prev) => {
                  const alreadySelected = prev.some((p) => p.id === record.id);
                  if (!alreadySelected) {
                    setSelectedRowKeys((prevKeys) => [...prevKeys, record.id]);
                    return [...prev, record];
                  }
                  return prev;
                });
              }
            }
          }}
        />
      ),
    },
  ];

  const canAdd = selectedRows.some(
    (p) =>
      quantities[p.id] &&
      quantities[p.id] > 0 &&
      quantities[p.id] <= Number(p.units)
  );

  return (
    <Modal
      open={open}
      title={t('addProductFromInvoice.title')}
      onCancel={onCancel}
      width={900}
      footer={null}
      destroyOnHidden
    >
      <Space direction="vertical" className={styles.datePickerFullWidth}>
        <Select
          placeholder={t('addProductFromInvoice.selectInvoice')}
          className={styles.datePickerFullWidth}
          onChange={handleSelectInvoice}
          value={selectedInvoice || undefined}
          options={invoices.map((inv) => ({
            label: `${inv.invoicenumber} ${t('addProductFromInvoice.fromDate', { date: new Date(inv.invoicedate).toLocaleDateString() })}`,
            value: inv.invoicenumber,
          }))}
        />

        {selectedInvoice && (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={products}
            pagination={false}
            size="small"
            rowSelection={{
              type: 'checkbox',
              selectedRowKeys,
              onChange: (keys, rows) => {
                setSelectedRowKeys(keys);
                setSelectedRows(rows);
              },
            }}
          />
        )}

        <Space className={styles.modalFooter}>
          <Button onClick={onCancel}>{t('addProductFromInvoice.cancel')}</Button>
          <Button
            type="primary"
            disabled={!canAdd || isLoading}
            loading={isLoading}
            onClick={handleAddProducts}
          >
            {t('addProductFromInvoice.add')}
          </Button>
        </Space>
      </Space>
    </Modal>
  );
};

export default AddProductFromInvoiceModal;
