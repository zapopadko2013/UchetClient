import React, { useEffect, useState } from 'react';
import {
  Button,
  Input,
  InputNumber,
  Select,
  Table,
  message,
  Space,
  Typography,
  Form,
} from 'antd';
import useApiRequest from '../../hooks/useApiRequest';
import { useTranslation } from 'react-i18next';
import styles from './ChangePrices.module.css';

const { Title } = Typography;
const { Option } = Select;

interface Product {
  id: string;
  name: string;
  code: string;
}

interface StockInfo {
  stockcurrentid: number;
  unitspr_shortname: string;
  code: string;
  name: string;
  price: number | null;
  wholesale_price: number | null;
  pointid: string;
  address: string;
  pointName?: string;
  isGroupHeader?: boolean;
}

interface ChangeItem {
  stockid: number;
  newprice: number;
  new_wprice?: number;
  pointid: string;
  oldprice: number;
  old_wprice: number;
  pieceprice: string;
  name?: string;
  code?: string;
  address?: string;
  pointName?: string;
}

const ChangePrices: React.FC = () => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();

  const [products, setProducts] = useState<Product[]>([]);
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [productData, setProductData] = useState<StockInfo[]>([]);
  const [selectedRows, setSelectedRows] = useState<StockInfo[]>([]);
  const [newRetailPrice, setNewRetailPrice] = useState<number | null>(null);
  const [newWholesalePrice, setNewWholesalePrice] = useState<number | null>(null);
  const [finalList, setFinalList] = useState<ChangeItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await sendRequest(`${import.meta.env.VITE_API_URL}/api/products/stockcurrent/point`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
      });

      const uniqueProducts = Array.isArray(data)
      ? data.filter(
          (item, index, self) =>
            index === self.findIndex((p) => p.id === item.id)
        )
      : [];

    setProducts(uniqueProducts);

      //setProducts(data || []);
    } catch {
      message.error(t('changePrices.messages.loadError'));
    }
  };

  const handleSelectProduct = async () => {
    if (!barcodeInput) {
      message.warning(t('changePrices.messages.emptyBarcode'));
      return;
    }

    try {
      const result = await sendRequest(
        `${import.meta.env.VITE_API_URL}/api/stockcurrent/pointprod?barcode=${barcodeInput}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
        }
      );

      if (Array.isArray(result) && result.length > 0) {
        const allRows: StockInfo[] = [];

        result.forEach((point: any) => {
          const { id: pointid, address, name } = point;

          allRows.push({
            stockcurrentid: -1,
            code: '',
            name: `${name} (${address})`,
            price: null,
            wholesale_price: null,
            pointid,
            address,
            pointName: name,
            isGroupHeader: true,
            unitspr_shortname: '',
          });

          point.info.forEach((item: any) => {
            allRows.push({
              ...item,
              price: item.price ?? 0,
              wholesale_price: item.wholesale_price ?? 0,
              pointid,
              address,
              pointName: name,
              isGroupHeader: false,
            });
          });
        });

        setSelectedProductId(result[0]?.info?.[0]?.productID || '');
        setFinalList([]);
        setProductData(allRows);
        setSelectedRows([]);
      } else {
        setProductData([]);
        setSelectedRows([]);
        setFinalList([]);
      }
    } catch {
      message.error(t('changePrices.messages.productFetchError'));
    }
  };

  const handleAdd = () => {
    if (newRetailPrice === null || newRetailPrice === undefined) {
      message.warning(t('changePrices.messages.noRetailPrice'));
      return;
    }

    if (selectedRows.length === 0) {
      message.warning(t('changePrices.messages.noSelection'));
      return;
    }

    const newItems: ChangeItem[] = selectedRows
      .filter((item) => !item.isGroupHeader)
      .map((item) => ({
        stockid: item.stockcurrentid,
        newprice: newRetailPrice,
        pieceprice: '',
        pointid: item.pointid,
        oldprice: item.price ?? 0,
        new_wprice: newWholesalePrice ?? 0,
        old_wprice: item.wholesale_price ?? 0,
        name: item.name,
        code: item.code,
        address: item.address,
        pointName: item.pointName,
      }));

    setFinalList((prev) => [...prev, ...newItems]);
    setProductData([]);
    setSelectedRows([]);
    setNewRetailPrice(null);
    setNewWholesalePrice(null);
  };

  const handleRemove = (stockid: number) => {
    setFinalList((prev) => prev.filter((item) => item.stockid !== stockid));
  };

  const handleSubmit = async () => {
    if (finalList.length === 0) {
      message.warning(t('changePrices.messages.noFinalItems'));
      return;
    }

    const payload = {
      product: selectedProductId,
      changes: finalList.map(({ name, code, address, pointName, ...rest }) => rest),
    };

    try {
      await sendRequest(`${import.meta.env.VITE_API_URL}/api/invoice/changeprice`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
      });

      message.success(t('changePrices.messages.success'));
      setFinalList([]);
    } catch {
      message.error(t('changePrices.messages.submitError'));
    }
  };

  const getSelectedRowKeys = () => {
    const selectedByPoint: Record<string, StockInfo[]> = {};

    selectedRows.forEach((item) => {
      if (!item.isGroupHeader) {
        if (!selectedByPoint[item.pointid]) selectedByPoint[item.pointid] = [];
        selectedByPoint[item.pointid].push(item);
      }
    });

    const selectedItemKeys = selectedRows
      .filter((item) => !item.isGroupHeader)
      .map((item) => `item-${item.stockcurrentid}`);

    const groupKeys = Object.entries(selectedByPoint)
      .filter(([pointid, selectedItems]) => {
        const allItemsOfPoint = productData.filter(
          (item) => item.pointid === pointid && !item.isGroupHeader
        );
        return allItemsOfPoint.length > 0 && allItemsOfPoint.length === selectedItems.length;
      })
      .map(([pointid]) => `group-${pointid}`);

    return [...selectedItemKeys, ...groupKeys];
  };

  const columns = [
    {
      title: t('changePrices.table.productName'),
      dataIndex: 'name',
      key: 'name',
      render: (_: any, record: StockInfo) =>
        record.isGroupHeader ? <strong>{record.name}</strong> : record.name,
    },
    {
      title: t('changePrices.table.retailPrice'),
      dataIndex: 'price',
      key: 'price',
      render: (value: number | null, record: StockInfo) =>
        record.isGroupHeader ? '' : value != null ? `${value} ` : '-',
    },
    {
      title: t('changePrices.table.wholesalePrice'),
      dataIndex: 'wholesale_price',
      key: 'wholesale_price',
      render: (value: number | null, record: StockInfo) =>
        record.isGroupHeader ? '' : value != null ? `${value} ` : '-',
    },
  ];

  const finalColumns = [
    {
      title: t('changePrices.table.product'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('changePrices.table.barcode'),
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: t('changePrices.table.currentRetailPrice'),
      dataIndex: 'oldprice',
      key: 'oldprice',
      render: (v: number) => `${v} `,
    },
    {
      title: t('changePrices.table.newRetailPrice'),
      dataIndex: 'newprice',
      key: 'newprice',
      render: (v: number) => `${v} `,
    },
    {
      title: t('changePrices.table.currentWholesalePrice'),
      dataIndex: 'old_wprice',
      key: 'old_wprice',
      render: (v: number) => `${v} `,
    },
    {
      title: t('changePrices.table.newWholesalePrice'),
      dataIndex: 'new_wprice',
      key: 'new_wprice',
      render: (v: number) => `${v} `,
    },
    {
      title: t('changePrices.table.point'),
      key: 'point',
      render: (_: any, record: ChangeItem) =>
        record.pointName ? `${record.pointName} (${record.address})` : record.address,
    },
    {
      title: t('changePrices.table.delete'),
      dataIndex: 'action',
      render: (_: any, record: ChangeItem) => (
        <Button danger onClick={() => handleRemove(record.stockid)}>
          {t('changePrices.table.delete')}
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <Title level={4}>{t('changePrices.title')}</Title>

      <Space align="start" wrap className={styles.selectRow}>
        <Select
          showSearch
          className={styles.selectInputLarge}
          placeholder={t('changePrices.selectProductPlaceholder')}
          optionFilterProp="children"
          value={barcodeInput || undefined}
          onChange={(code) => setBarcodeInput(code)}
          allowClear
          filterOption={(input, option) => {
            const children = option?.children || (option as any)?.props?.children;
            if (typeof children === 'string') {
              return children.toLowerCase().includes(input.toLowerCase());
            }
            return false;
          }}
        >
          {products.map((p, index) => (
            <Option 
            /* key={p.code} */
             key={`${p.id}-${p.code}-${index}`}
             value={p.code}>
              {p.name}
            </Option>
          ))}
        </Select>
        <Input
          placeholder={t('changePrices.barcodeInputPlaceholder')}
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          className={styles.barcodeInput}
        />
        <Button type="primary" onClick={handleSelectProduct}>
          {t('changePrices.selectButton')}
        </Button>
      </Space>

      {productData.length > 0 && (
        <>
          <Space className={styles.priceFormWrapper}>
            <Form layout="inline">
              <Form.Item label={t('changePrices.retailPriceLabel')} required>
                <InputNumber
                  value={newRetailPrice ?? undefined}
                  onChange={(v) => setNewRetailPrice(v)}
                  min={0}
                  placeholder=""
                />
              </Form.Item>
              <Form.Item label={t('changePrices.wholesalePriceLabel')}>
                <InputNumber
                  value={newWholesalePrice ?? undefined}
                  onChange={(v) => setNewWholesalePrice(v)}
                  min={0}
                  placeholder=""
                />
              </Form.Item>
            </Form>
            <Button type="primary" onClick={handleAdd}>
              {t('changePrices.addButton')}
            </Button>
          </Space>

          <Table
            rowKey={(record) =>
              record.isGroupHeader ? `group-${record.pointid}` : `item-${record.stockcurrentid}`
            }
            dataSource={productData}
            columns={columns}
            pagination={false}
            rowClassName={(record) => (record.isGroupHeader ? styles.groupHeaderRow  : '')}
            rowSelection={{
              type: 'checkbox',
              selectedRowKeys: getSelectedRowKeys(),
              getCheckboxProps: () => ({ disabled: false }),
              onSelect: (record, selected) => {
                if (record.isGroupHeader) {
                  const groupPointId = record.pointid;
                  const itemsOfGroup = productData.filter(
                    (item) => item.pointid === groupPointId && !item.isGroupHeader
                  );

                  if (selected) {
                    const newSelection = [...selectedRows, ...itemsOfGroup];
                    const unique = Object.values(
                      newSelection.reduce((acc, item) => {
                        acc[item.stockcurrentid] = item;
                        return acc;
                      }, {} as Record<number, StockInfo>)
                    );
                    setSelectedRows(unique);
                  } else {
                    const filtered = selectedRows.filter(
                      (item) => item.pointid !== groupPointId
                    );
                    setSelectedRows(filtered);
                  }
                } else {
                  if (selected) {
                    setSelectedRows((prev) => [...prev, record]);
                  } else {
                    setSelectedRows((prev) =>
                      prev.filter((item) => item.stockcurrentid !== record.stockcurrentid)
                    );
                  }
                }
              },
              onSelectAll: (selected, _, changeRows) => {
                if (selected) {
                  const newSelection = [
                    ...selectedRows,
                    ...changeRows.filter((r) => !r.isGroupHeader),
                  ];
                  const unique = Object.values(
                    newSelection.reduce((acc, item) => {
                      acc[item.stockcurrentid] = item;
                      return acc;
                    }, {} as Record<number, StockInfo>)
                  );
                  setSelectedRows(unique);
                } else {
                  const idsToRemove = changeRows
                    .filter((r) => !r.isGroupHeader)
                    .map((r) => r.stockcurrentid);
                  setSelectedRows((prev) =>
                    prev.filter((item) => !idsToRemove.includes(item.stockcurrentid))
                  );
                }
              },
              preserveSelectedRowKeys: true,
              columnTitle: t('changePrices.table.select'),
            }}
          />
        </>
      )}

      {finalList.length > 0 && (
        <>
          <Title level={5} className={styles.finalTableTitle}>
            {t('changePrices.finalTableTitle')}
          </Title>
          <Table
            rowKey="stockid"
            dataSource={finalList}
            columns={finalColumns}
            pagination={false}
          />
          <Button type="primary" onClick={handleSubmit} className={styles.submitButton}>
            {t('changePrices.submitButton')}
          </Button>
        </>
      )}
    </div>
  );
};

export default ChangePrices;
