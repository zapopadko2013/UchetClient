import React, { useEffect, useState, useMemo } from 'react';
import {
  Table,
  Select,
  Button,
  Space,
  message,
  Modal,
  Input,
} from 'antd';
import {
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import useApiRequest from '../../hooks/useApiRequest';
import dayjs from 'dayjs';
import WeightGoodsInvoicePage from './WeightGoodsInvoicePage';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useTranslation } from 'react-i18next';
import styles from './WeightGoodsPage.module.css';


dayjs.extend(customParseFormat);
const { Option } = Select;

const WeightGoodsPage: React.FC = () => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  const [stocks, setStocks] = useState<any[]>([]);
  const [scales, setScales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedStock, setSelectedStock] = useState<string>();
  const [selectedScale, setSelectedScale] = useState<string>();
  const [loading, setLoading] = useState(false);

  const [editModal, setEditModal] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [hotkeyValue, setHotkeyValue] = useState('');

  const [pluModal, setPluModal] = useState(false);
  const [pluModel, setPluModel] = useState<'RLS1000' | 'Штрих-принт'>('RLS1000');

  const [showInvoice, setShowInvoice] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);
  const [continueModal, setContinueModal] = useState(false);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  // === ЗАГРУЗКА СКЛАДОВ ===
  useEffect(() => {
    sendRequest(`${API_URL}/api/stock`, { headers: getHeaders() })
      .then(setStocks)
      .catch(() => message.error(t('weightGoods.loadStocksError')));
  }, []);

  // === ВЫБОР СКЛАДА ===
  const handleStockSelect = (stockId: string) => {
    setSelectedStock(stockId);
    setSelectedScale(undefined);
    setScales([]);
    setProducts([]);
    sendRequest(`${API_URL}/api/productsweight/scales/search?point=${stockId}`, {
      headers: getHeaders(),
    })
      .then(setScales)
      .catch(() => message.error(t('weightGoods.loadScalesError')));
  };

  // === ВЫБОР ВЕСОВ ===
  const handleScaleSelect = (scaleId: string) => {
    if (!selectedStock) return;
    setSelectedScale(scaleId);
    fetchProducts(selectedStock, scaleId);
  };

  // === ЗАГРУЗКА ТОВАРОВ ===
  const fetchProducts = async (stockId: string, scaleId: string) => {
    setLoading(true);
    try {
      const data = await sendRequest(`${API_URL}/api/productsweight?point=${stockId}&scale=${scaleId}`, {
        headers: getHeaders(),
      });
      const productsWithTotals = data.map((p: any) => ({
        ...p,
        total_purchaseprice: Number(p.lastpurchaseprice) * Number(p.amount),
        total_price: Number(p.price) * Number(p.amount),
      }));
      setProducts(productsWithTotals);
    } catch {
      message.error(t('weightGoods.loadProductsError'));
    } finally {
      setLoading(false);
    }
  };

  // === ОТКРЫТЬ МОДАЛКУ ДЛЯ РЕДАКТИРОВАНИЯ ===
  const openEditModal = (record: any) => {
    setEditRecord(record);
    setHotkeyValue(record.hotkey);
    setEditModal(true);
  };

  // === СОХРАНИТЬ ГОРЯЧУЮ КЛАВИШУ ===
  const saveHotkey = async () => {
    if (!editRecord || !selectedStock || !selectedScale) return;
    try {
      await sendRequest(`${API_URL}/api/productsweight/updatehotkey`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          id: editRecord.id,
          hotkey: hotkeyValue,
          stockcurrentid: editRecord.stockcurrentid,
          point: selectedStock,
          scale: selectedScale,
        }),
      });
      message.success(t('weightGoods.hotkeyUpdated'));
      setEditModal(false);
      fetchProducts(selectedStock, selectedScale);
    } catch {
      message.error(t('weightGoods.hotkeyUpdateError'));
    }
  };

  // === ДОБАВЛЕНИЕ ТОВАРА ===
  const handleAddProduct = async () => {
    if (!selectedStock || !selectedScale) {
      return message.warning(t('weightGoods.selectStockAndScale'));
    }

    try {
      const data = await sendRequest(
        `${API_URL}/api/invoice?status=FORMATION&type=2&isweight=true`,
        { headers: getHeaders() }
      );

      if (data && Object.keys(data).length > 0) {
        setCurrentInvoice(data);
        setContinueModal(true);
        return;
      }

      message.info(t('weightGoods.creatingInvoice'));

      const body = {
        altinvoice: '',
        counterparty: 0,
        invoicedate: dayjs().format('DD.MM.YYYY'),
        scale: selectedScale,
        stockfrom: selectedStock,
        stockto: selectedStock,
        type: '2',
        isweight: true,
      };

      const response = await sendRequest(`${API_URL}/api/invoice/create`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });

      if (!response || response.code !== 'success') {
        message.error(t('weightGoods.createInvoiceError'));
        return;
      }

      const newInvoice = {
        invoicenumber: response.text,
        invoicedate: dayjs(),
        stockfrom: selectedStock,
        stockto: selectedStock,
        scale: selectedScale,
        status: 'FORMATION',
        type: 2,
        isweight: true,
      };

      setCurrentInvoice(newInvoice);
      setShowInvoice(true);
    } catch {
      message.error(t('weightGoods.createInvoiceError'));
    }
  };

  // === ПРОДОЛЖИТЬ НАКЛАДНУЮ ===
  const handleContinueInvoice = () => {
    setContinueModal(false);
    setShowInvoice(true);
  };

  // === УДАЛИТЬ НАКЛАДНУЮ ===
  const handleDeleteInvoice = async () => {
    try {
      await sendRequest(`${API_URL}/api/invoice/delete`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ invoice: currentInvoice.invoicenumber }),
      });
      message.success(t('weightGoods.invoiceDeleted'));
      setContinueModal(false);
      setCurrentInvoice(null);
    } catch {
      message.error(t('weightGoods.invoiceDeleteError'));
    }
  };

  // === ВЫГРУЗКА В EXCEL ===
const exportExcel = async () =>   { 
   if (!products.length) {
    return message.warning(t('weightGoods.noProductsToExport'));
  }
  try { 
    const blob =  await sendRequest(`${API_URL}/api/productsweight/excel`, {
      method: 'POST', headers: getHeaders(), 
      body: JSON.stringify({ productsListChanged: products }),
      responseType: 'blob', });
      
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `products_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`;
      a.click();
      message.success(t('weightGoods.exportExcelSuccess'));
  } catch {
     message.error(t('weightGoods.exportExcelError'));
    }
};

  // === УДАЛЕНИЕ ТОВАРА ===
  const handleDeleteProduct = async (record: any) => {
    if (!record?.id) return;
    if (!selectedStock || !selectedScale) {
      return message.warning(t('weightGoods.selectStockAndScale'));
    }

    Modal.confirm({
      title: t('weightGoods.deleteProductTitle'),
      content: t('weightGoods.deleteProductConfirm', { name: record.name }),
      okText: t('weightGoods.common.delete'),
      cancelText: t('weightGoods.common.cancel'),
      okButtonProps: { danger: true },
      async onOk() {
        try {
          const res1 = await sendRequest(`${API_URL}/api/productsweight/del`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ product: record.id }),
          });

          if (res1.code !== 'success') {
            message.error(t('weightGoods.deleteError'));
            return;
          }

          const res2 = await sendRequest(`${API_URL}/api/productsweight/delete_temp`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({}),
          });

          if (res2.code === 'success') {
            message.success(t('weightGoods.deleteSuccess'));
          } else {
            message.warning(t('weightGoods.deletePartial'));
          }

          fetchProducts(selectedStock, selectedScale);
        } catch {
          message.error(t('weightGoods.deleteError'));
        }
      },
    });
  };

  // === ВЫГРУЗКА PLU ===
  const handleOpenPluModal = () => {
    if (!products.length) {
      return message.warning(t('weightGoods.noProductsToExport'));
    }
    setPluModal(true);
  };

  const handleUploadPLU = async () => {
    if (!selectedStock || !selectedScale) {
      return message.warning(t('weightGoods.selectStockAndScale'));
    }

    try {
      const dateName = `PLU_${dayjs().format('DDMMYYYY')}.txt`;

      let body;
      if (pluModel === 'RLS1000') {
        body = {
          arr: products.map((p) => [
            p.id,
            p.name,
            p.id,
            p.hotkey || 0,
            p.taxid || 7,
            p.price || 0,
            4,
          ]),
          date: dateName,
          type: 0,
        };
      } else {
        body = {
          arr: products.map((p) => [
            p.id,
            p.name,
            '',
            p.price || 0,
            0,
            0,
            0,
            p.hotkey || 0,
            0,
            0,
            '',
            '30.12.99',
            0,
          ]),
          date: dateName,
          type: 1,
        };
      }

      setLoading(true);
      await sendRequest(`${API_URL}/api/productsweight/to-text`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });

      const response = await fetch(
        `${API_URL}/api/productsweight/download?date=${dateName}&type=${pluModel === 'RLS1000' ? 0 : 1}`,
        { headers: getHeaders() }
      );

      if (!response.ok) throw new Error('download error');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = dateName;
      a.click();

      message.success(t('weightGoods.exportPLUSuccess'));
    } catch {
      message.error(t('weightGoods.exportPLUError'));
    } finally {
      setLoading(false);
      setPluModal(false);
    }
  };

  // === КОЛОНКИ ===
  const columns = [
    { title: t('weightGoods.columns.hotkey'), dataIndex: 'hotkey', key: 'hotkey', width: 120 },
    { title: t('weightGoods.columns.name'), dataIndex: 'name', key: 'name' },
    { title: t('weightGoods.columns.lastpurchaseprice'), dataIndex: 'lastpurchaseprice', key: 'lastpurchaseprice' },
    { title: t('weightGoods.columns.price'), dataIndex: 'price', key: 'price' },
    { title: t('weightGoods.columns.amount'), dataIndex: 'amount', key: 'amount' },
    { title: t('weightGoods.columns.total_purchaseprice'), dataIndex: 'total_purchaseprice', key: 'total_purchaseprice' },
    { title: t('weightGoods.columns.total_price'), dataIndex: 'total_price', key: 'total_price' },
    {
      title: t('weightGoods.columns.taxid'),
      dataIndex: 'taxid',
      render: (v: string) => (v === '1' ? t('weightGoods.vatIncluded') : t('weightGoods.vatExcluded')),
    },
    {
      title: '',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteProduct(record)} />
        </Space>
      ),
    },
  ];

  if (showInvoice && currentInvoice) {
    return (
      <WeightGoodsInvoicePage
        invoice={currentInvoice}
        scaleId={selectedScale!}
        onBack={() => setShowInvoice(false)}
      />
    );
  }

  return (
    <div>
      <Space className={styles.controls}>
        <Select
          placeholder={t('weightGoods.selectStock')}
          value={selectedStock}
          onChange={handleStockSelect}
          className={styles.selectStock}
        >
          {stocks.map((s) => (
            <Option key={s.id} value={s.id}>
              {s.name}
            </Option>
          ))}
        </Select>

        <Select
          placeholder={t('weightGoods.selectScale')}
          value={selectedScale}
          onChange={handleScaleSelect}
          className={styles.selectScale}
          disabled={!selectedStock}
        >
          {scales.map((sc) => (
            <Option key={sc.id} value={sc.id}>
              {sc.name}
            </Option>
          ))}
        </Select>

        <Button
          icon={<ReloadOutlined />}
          onClick={() => selectedStock && selectedScale && fetchProducts(selectedStock, selectedScale)}
          disabled={!selectedScale}
        >
          {t('weightGoods.buttons.refresh')}
        </Button>
        <Button icon={<PlusOutlined />} onClick={handleAddProduct} disabled={!selectedScale}>
          {t('weightGoods.buttons.addProduct')}
        </Button>
      </Space>

      {products.length > 0 && (
        <>
          <Table
            bordered
            loading={loading}
            columns={columns}
            dataSource={products}
            rowKey={(r) => r.id}
            pagination={false}
            summary={() => {
              const sum = (key: string) =>
                products.reduce((acc, item) => acc + Number(item[key] || 0), 0);
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={2}>
                    <b>{t('weightGoods.total')}</b>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    {sum('lastpurchaseprice').toFixed(2)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right">
                    {sum('price').toFixed(2)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    {sum('amount').toFixed(3)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    {sum('total_purchaseprice').toFixed(2)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    {sum('total_price').toFixed(2)}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} />
                  <Table.Summary.Cell index={7} />
                </Table.Summary.Row>
              );
            }}
          />

          <Space className={styles.footer}>
            <Button type="primary" icon={<UploadOutlined />} onClick={handleOpenPluModal}>
              {t('weightGoods.buttons.exportPLU')}
            </Button>
            <Button icon={<FileExcelOutlined />} onClick={exportExcel}>
              {t('weightGoods.buttons.exportExcel')}
            </Button>
          </Space>
        </>
      )}

      {/* === МОДАЛКИ === */}
      <Modal
        title={t('weightGoods.modal.editHotkeyTitle')}
        open={editModal}
        onCancel={() => setEditModal(false)}
        onOk={saveHotkey}
      >
        <Input
          type="number"
          value={hotkeyValue}
          onChange={(e) => setHotkeyValue(e.target.value)}
        />
      </Modal>

      <Modal
        open={continueModal}
        title={t('weightGoods.modal.continueInvoiceTitle')}
        onCancel={() => setContinueModal(false)}
        footer={[
          <Button key="no" onClick={handleDeleteInvoice}>
            {t('weightGoods.modal.deleteInvoice')}
          </Button>,
          <Button key="yes" type="primary" onClick={handleContinueInvoice}>
            {t('weightGoods.modal.continueInvoice')}
          </Button>,
        ]}
      >
        {t('weightGoods.modal.continueInvoiceText')}
      </Modal>

      <Modal
        title={t('weightGoods.modal.uploadPLUTitle')}
        open={pluModal}
        onCancel={() => setPluModal(false)}
        onOk={handleUploadPLU}
        okText={t('weightGoods.modal.upload')}
        cancelText={t('weightGoods.modal.cancel')}
        confirmLoading={loading}
      >
        <p>{t('weightGoods.selectPLUModel')}</p>
        <Select
          value={pluModel}
          onChange={(v) => setPluModel(v)}
          className={styles.pluSelect}
        >
          <Option value="RLS1000">RLS1000</Option>
          <Option value="Штрих-принт">{t('weightGoods.models.shtrihPrint')}</Option>
        </Select>
      </Modal>
    </div>
  );
};

export default WeightGoodsPage;
