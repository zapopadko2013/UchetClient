import React, { useEffect, useState, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Input,
  Select,
  message,
  Popconfirm,
  Divider,
  Checkbox,
  Form,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  SendOutlined,
  EditOutlined,
} from '@ant-design/icons';
import useApiRequest from '../../hooks/useApiRequest';
import { useTranslation } from 'react-i18next';
import styles from './WeightGoodsPage.module.css';

const { Option } = Select;

interface WeightGoodsInvoicePageProps {
  invoice: any;
  scaleId: string;
  onBack: () => void;
}

const WeightGoodsInvoicePage: React.FC<WeightGoodsInvoicePageProps> = ({
  invoice: propInvoice,
  scaleId,
  onBack,
}) => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  // Состояния
  const [invoice, setInvoice] = useState<any>(propInvoice);
  const [goods, setGoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [modalTitle, setModalTitle] = useState(t('weightGoodsInvoice.addProduct'));
  const [form, setForm] = useState({
  id: null,
  name: '',
  code: '',
  purchaseprice: '',
  price: '',
  taxid: '0',
  updateprice: true,
  amount: '',
  isNew: false,
  hotkey: 2,
});
  
  const [productOptions, setProductOptions] = useState<any[]>([]);
  const [unusedBarcodes, setUnusedBarcodes] = useState<string[]>([]);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  /** ==================== FETCH DATA ==================== **/

  const fetchUnusedBarcodes = async () => {
    try {
      const data = await sendRequest(`${API_URL}/api/productsweight/barcode_unused`, {
        headers: getHeaders(),
      });
      const codes = Array.isArray(data) ? data.map((item) => String(item.code)) : [];
      setUnusedBarcodes(codes);
    } catch {
      message.error(t('weightGoodsInvoice.errors.loadBarcodes'));
    }
  };

  const fetchInvoiceProducts = async () => {
    if (!invoice?.invoicenumber) return;

    setLoading(true);
    try {
      const data = await sendRequest(
        `${API_URL}/api/invoice/product?invoicenumber=${invoice.invoicenumber}`,
        { headers: getHeaders() }
      );
      setGoods(data || []);
    } catch {
      message.error(t('weightGoodsInvoice.errors.loadInvoiceProducts'));
    } finally {
      setLoading(false);
    }
  };

  const fetchOldProducts = async () => {
    try {
      const data = await sendRequest(
        `${API_URL}/api/productsweight/oldproducts?scale=${scaleId}`,
        { headers: getHeaders() }
      );
      setProductOptions(data || []);
    } catch {
      message.error(t('weightGoodsInvoice.errors.loadProducts'));
    }
  };

  useEffect(() => {
    if (invoice?.invoicenumber) {
      fetchInvoiceProducts();
      fetchUnusedBarcodes();
    }
  }, [invoice]);

  /** ==================== TOTALS ==================== **/

  /* const totals = useMemo(() => {
    if (goods.length === 0) return null;

    const totalQty = goods.reduce((acc, cur) => acc + Number(cur.amount || 0), 0);
    const totalPurchase = goods.reduce(
      (acc, cur) => acc + Number(cur.purchaseprice || 0) * Number(cur.amount || 0),
      0
    );
    const totalSale = goods.reduce(
      (acc, cur) => acc + Number(cur.newprice || 0) * Number(cur.amount || 0),
      0
    );
    const avgPurchase = goods.reduce((acc, cur) => acc + Number(cur.purchaseprice || 0), 0) / goods.length;
    const avgPrice = goods.reduce((acc, cur) => acc + Number(cur.newprice || 0), 0) / goods.length;

    return {
      avgPurchase: avgPurchase.toFixed(2),
      avgPrice: avgPrice.toFixed(2),
      totalQty: totalQty.toFixed(2),
      totalPurchase: totalPurchase.toFixed(2),
      totalSale: totalSale.toFixed(2),
    };
  }, [goods]);
 */
  
const totals = useMemo(() => {
  if (goods.length === 0) return null;

  const totalQty = goods.reduce((acc, cur) => acc + Number(cur.amount || 0), 0);

  // Проверяем, если количество явно большое, значит оно в граммах
  const isGrams = totalQty > 1000;
  const qtyFactor = isGrams ? 0.001 : 1;

  
  const totalSale = goods.reduce((acc, cur) => {
    const qty = Number(cur.amount || 0) * qtyFactor;
    const price = Number(cur.newprice || 0);
    return acc + qty * price;
  }, 0);

  

  const totalPurchase = goods.reduce(
  (acc, item) => acc + Number(item.purchaseprice || 0),
  0
);
const totalSale1 = goods.reduce(
  (acc, item) => acc + Number(item.newprice || 0),
  0
);

  const avgPurchase = totalQty > 0 ? totalPurchase / (totalQty * qtyFactor) : 0;
  const avgPrice = totalQty > 0 ? totalSale / (totalQty * qtyFactor) : 0;
  const margin = totalPurchase > 0 ? ((totalSale - totalPurchase) / totalPurchase) * 100 : 0;

  return {
    avgPurchase: avgPurchase.toFixed(2),
    avgPrice: avgPrice.toFixed(2),
    totalQty: (totalQty * qtyFactor).toFixed(2),
    totalPurchase: totalPurchase.toFixed(2),
    totalSale: totalSale.toFixed(2),
    totalSale1:totalSale1.toFixed(2),
    margin: margin.toFixed(2),
  };
}, [goods]);


  
  /** ==================== HANDLERS ==================== **/

  const openAddModal = async () => {
  await fetchOldProducts();
  setEditingProduct(null);
  setForm({
    id: null,
    name: '',
    code: '',
    purchaseprice: '',
    price: '',
    taxid: '0',
    updateprice: true,
    amount: '',
    isNew: false,
    hotkey: 2,
  });
  setModalTitle(t('weightGoodsInvoice.addProduct'));
  setModalVisible(true);
};

const handleEditProduct = async (record: any) => {
  setLoading(true);
  try {
    // Загружаем старые товары для выпадающего списка
    await fetchOldProducts();

    // Запрашиваем детальную информацию по товару
    const details = await sendRequest(
      `${API_URL}/api/invoice/product/details?invoiceNumber=${invoice.invoicenumber}&productId=${record.stock}&attributes=0`,
      { headers: getHeaders() }
    );

    // Ответ — массив, берём первый элемент
    const product = Array.isArray(details) ? details[0] : details;

    // Если сервер не вернул ничего
    if (!product) {
      message.error(t('weightGoodsInvoice.errors.productNotFound'));
      setLoading(false);
      return;
    }

    // Заполняем форму из полученных данных
    setForm({
      id: product.id || record.id || null,
      name: product.name || record.name || '',
      code: product.code || record.code || '',
      purchaseprice: product.purchaseprice ?? record.purchaseprice ?? '',
      price: product.newprice ?? record.newprice ?? '',
      taxid: product.taxid ?? record.taxid ?? '0',
      updateprice: product.updateallprodprice ?? record.updateprice ?? true,
      amount: record.amount || '',
      isNew: false,
      hotkey: record.hotkey || 2,
    });

    // Сохраняем для понимания, что мы редактируем
    setEditingProduct(record);
    setModalTitle(t('weightGoodsInvoice.editProduct'));
    setModalVisible(true);
  } catch (error) {
    console.error('Ошибка при получении деталей товара:', error);
    message.error(t('weightGoodsInvoice.errors.loadProductDetails'));
  } finally {
    setLoading(false);
  }
};


const handleSaveProduct = async () => {
  if (!form.name || !form.amount || !form.price) {
    return message.warning(t('weightGoodsInvoice.fillRequiredFields')); // Заполните все обязательные поля
  }

  try {
    if (editingProduct) {
      // DELETE существующего товара перед добавлением нового
      await sendRequest(`${API_URL}/api/invoice/delete/product`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          attributes: editingProduct.attributes,
          invoice: invoice.invoicenumber,
          stock: editingProduct.stock,
        }),
      });
    }

    let code = form.code;
    if (form.isNew) {
      const raw = unusedBarcodes[0];
      if (!raw) {
        return message.error(t('weightGoodsInvoice.noFreeBarcodes')); // Нет свободных штрихкодов
      }
      code = raw.padStart(7, '0');
    }

    const existingProduct = productOptions.find(
      (p) =>
        p.name.trim().toLowerCase() === form.name.trim().toLowerCase() ||
        p.code === form.code
    );

    const body = {
      invoice: invoice.invoicenumber,
      type: '2',
      scale: scaleId,
      stockcurrentfrom: [
        {
          amount: form.amount,
          attributes: null,
          brand: null,
          category: '-1',
          cnofea: null,
          code,
          hotkey: form.hotkey || 2,
          // id: null,
          //id: !form.isNew && !editingProduct ? form.id : null,
          id:
            existingProduct?.id ??
            (!form.isNew && !editingProduct ? form.id : null),
          lastpurchaseprice: form.purchaseprice,
          name: form.name,
          newprice: form.price,
          purchaseprice: form.purchaseprice,
          sku: null,
          taxid: form.taxid,
          unitsprid: '6',
          updateprice: form.updateprice ?? true,
        },
      ],
    };

    const result = await sendRequest(`${API_URL}/api/invoice/add/product`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (result?.code === 'success') {
      message.success(
        editingProduct
          ? t('weightGoodsInvoice.productUpdated')   // Товар обновлён
          : t('weightGoodsInvoice.productAdded')    // Товар добавлен
      );
      if (form.isNew) {
        setUnusedBarcodes((prev) => prev.slice(1));
      }
      setModalVisible(false);
      fetchUnusedBarcodes();
      fetchInvoiceProducts();
      setEditingProduct(null);
    } else {
      message.error(t('weightGoodsInvoice.errorAddingProduct')); // Ошибка добавления товара
    }
  } catch (err) {
    message.error(t('weightGoodsInvoice.errorSavingProduct')); // Ошибка сохранения товара
  }
};


  const handleDeleteProduct = async (record: any) => {
    try {
      await sendRequest(`${API_URL}/api/invoice/delete/product`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          attributes: record.attributes,
          invoice: invoice.invoicenumber,
          stock: record.stock,
        }),
      });
      message.success(t('weightGoodsInvoice.messages.productDeleted'));
      fetchUnusedBarcodes();
      fetchInvoiceProducts();
    } catch {
      message.error(t('weightGoodsInvoice.errors.deleteProduct'));
    }
  };

  const handleDeleteInvoice = () => {
    Modal.confirm({
      title: t('weightGoodsInvoice.deleteInvoice.title'),
      content: t('weightGoodsInvoice.deleteInvoice.text'),
      okText: t('weightGoodsInvoice.common.delete'),
      cancelText: t('weightGoodsInvoice.common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await sendRequest(`${API_URL}/api/invoice/delete`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ invoice: invoice.invoicenumber }),
          });
          message.success(t('weightGoodsInvoice.messages.invoiceDeleted'));
          onBack();
        } catch {
          message.error(t('weightGoodsInvoice.errors.deleteInvoice'));
        }
      },
    });
  };

  const handleSendToCashbox = async () => {
    try {
      await sendRequest(`${API_URL}/api/invoice/submit/add`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ invoice: invoice.invoicenumber }),
      });
      message.success(t('weightGoodsInvoice.messages.invoiceSent'));
      onBack();
    } catch {
      message.error(t('weightGoodsInvoice.errors.sendInvoice'));
    }
  };

  /** ==================== TABLE COLUMNS ==================== **/

  const columns = [
    {
      title: t('weightGoodsInvoice.columns.name'),
      dataIndex: 'name',
      key: 'name',
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
    },
    {
      title: t('weightGoodsInvoice.columns.barcode'),
      dataIndex: 'code',
      key: 'code',
      align: 'center' as const,
    },
    {
      title: t('weightGoodsInvoice.columns.purchasePrice'),
      dataIndex: 'purchaseprice',
      key: 'purchaseprice',
      align: 'right' as const,
      render: (text: any) => Number(text).toFixed(2),
      sorter: (a: any, b: any) => Number(a.purchaseprice) - Number(b.purchaseprice),
    },
    {
      title: t('weightGoodsInvoice.columns.amount'),
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (text: any) => Number(text).toFixed(2),
      sorter: (a: any, b: any) => Number(a.amount) - Number(b.amount),
    },
    {
      title: t('weightGoodsInvoice.columns.price'),
      dataIndex: 'newprice',
      key: 'newprice',
      align: 'right' as const,
      render: (text: any) => Number(text).toFixed(2),
      sorter: (a: any, b: any) => Number(a.newprice) - Number(b.newprice),
    },
    {
      title: t('weightGoodsInvoice.columns.total'),
      key: 'sum',
      align: 'right' as const,
      render: (_: any, record: any) =>
        (Number(record.newprice) * Number(record.amount)).toFixed(2),
      sorter: (a: any, b: any) =>
        Number(a.newprice) * Number(a.amount) - Number(b.newprice) * Number(b.amount),
    },
    {
      title: t('weightGoodsInvoice.columns.actions'),
      key: 'action',
      align: 'center' as const,
      width: 120,
      render: (_: any, record: any) => (
        <Space size="middle" split={<Divider type="vertical" />}>
          <Button
            icon={<EditOutlined />}
            type="link"
            onClick={() => handleEditProduct(record)}
          />
          <Popconfirm
            title={t('weightGoodsInvoice.confirm.deleteProduct')}
            onConfirm={() => handleDeleteProduct(record)}
            okText={t('weightGoodsInvoice.common.yes')}
            cancelText={t('weightGoodsInvoice.common.no')}
          >
            <Button icon={<DeleteOutlined />} type="link" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  /** ==================== RENDER ==================== **/

  return (
    <>
      <Space className={styles.buttonsBar}>
        <Button onClick={onBack} type="primary" icon={<ArrowLeftOutlined />}>
          {t('weightGoodsInvoice.common.back')}
        </Button>

        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          {t('weightGoodsInvoice.buttons.addProduct')}
        </Button>

        <Button type="default" danger onClick={handleDeleteInvoice}>
          {t('weightGoodsInvoice.buttons.deleteInvoice')}
        </Button>

        <Button type="primary" onClick={handleSendToCashbox} icon={<SendOutlined />}>
          {t('weightGoodsInvoice.buttons.sendInvoice')}
        </Button>
      </Space>

      <Table
        rowKey={(record) => `${record.stock}_${record.attributes}`}
        dataSource={goods}
        columns={columns}
        loading={loading}
        pagination={false}
        summary={() =>
          totals ? (
            <Table.Summary fixed="bottom">
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}>
                  <b>{t('weightGoodsInvoice.common.total')}:</b>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">{totals.totalPurchase}</Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">{totals.totalQty}</Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">{totals.totalSale1}</Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">{totals.totalSale}</Table.Summary.Cell>
                <Table.Summary.Cell index={5}/>
                <Table.Summary.Cell index={6}/>
              </Table.Summary.Row>
            </Table.Summary>
          ) : null
        }
      />

      {/* Модальное окно добавления/редактирования */}
      <Modal
  title={modalTitle}
  open={modalVisible}
  onCancel={() => setModalVisible(false)}
  footer={null}
>
  {!editingProduct && (
    <Button
      type="dashed"
      className={styles.modalToggleButton}
      onClick={() =>
        setForm((prev) => ({
          ...prev,
          isNew: !prev.isNew,
          name: '',
          id: null,
          code: '',
        }))
      }
    >
      {form.isNew
        ? t('weightGoodsInvoice.chooseFromList')
        : t('weightGoodsInvoice.newProduct')}
    </Button>
  )}

  <div className={styles.fieldGroup}>
    <label className={styles.label}>
      {t('weightGoodsInvoice.productName')}
    </label>

    {editingProduct ? (
      <Input
        value={form.name}
        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        disabled
      />
    ) : !form.isNew ? (
      <Select
        showSearch
        placeholder={t('weightGoodsInvoice.chooseProduct')}
        value={form.id || undefined}
        onChange={async (val, option: any) => {
          const selected = option.item;
          if (!selected) return;
          try {
            const res = await sendRequest(
              `${API_URL}/api/products/getProductByBarcodeLocalNow?barcode=${selected.code}&all=0&isWeight=true`,
              { headers: getHeaders() }
            );
            const productInfo = Array.isArray(res) ? res[0] : res;
            setForm((prev) => ({
              ...prev,
              id: selected.id,
              name: selected.name,
              code: selected.code,
              purchaseprice:
                productInfo?.lastpurchaseprice ??
                productInfo?.purchaseprice ??
                selected.purchaseprice ??
                '',
              price:
                productInfo?.newprice ??
                productInfo?.price ??
                selected.price ??
                '',
              taxid: productInfo?.taxid || selected.taxid || '0',
              updateprice: selected.updateallprodprice ?? true,
            }));
          } catch (error) {
            message.error(t('weightGoodsInvoice.errorLoadingProductPrices'));
            console.error(error);
            console.error(val);
          }
        }}
        filterOption={(input, option) =>
          option?.label?.toLowerCase().includes(input.toLowerCase())
        }
        options={productOptions.map((item) => ({
          label: item.name,
          value: item.id,
          item,
        }))}
        className={styles.modalInput}
      />
    ) : (
      <Input
        placeholder={t('weightGoodsInvoice.enterName')}
        value={form.name}
        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        autoFocus
      />
    )}
  </div>

  <Checkbox
    checked={form.updateprice ?? true}
    onChange={(e) => setForm((prev) => ({ ...prev, updateprice: e.target.checked }))}
    className={styles.checkbox}
  >
    {t('weightGoodsInvoice.updatePriceAllPoints')}
  </Checkbox>

  <Space className={styles.bottomRow} size="middle" align="start">
    <div className={styles.inputHalf}>
      <label className={styles.label}>
        {t('weightGoodsInvoice.purchasePricePerKg')}
      </label>
      <Input
        placeholder={t('weightGoodsInvoice.enterPurchasePrice')}
        value={form.purchaseprice}
        onChange={(e) =>
          setForm((prev) => ({
            ...prev,
            purchaseprice: e.target.value.replace(',', '.').replace(/[^\d.]/g, ''),
          }))
        }
        type="number"
        min="0"
        step="any"
      />
    </div>
    <div className={styles.inputHalf}>
      <label className={styles.label}>
        {t('weightGoodsInvoice.sellingPricePerKg')}
      </label>
      <Input
        placeholder={t('weightGoodsInvoice.enterSellingPrice')}
        value={form.price}
        onChange={(e) =>
          setForm((prev) => ({
            ...prev,
            price: e.target.value.replace(',', '.').replace(/[^\d.]/g, ''),
          }))
        }
        type="number"
        min="0"
        step="any"
      />
    </div>
  </Space>

  <Space className={styles.inputHalf} size="middle" align="start">
    <div className={styles.inputHalf}>
      <label className={styles.label}>
        {t('weightGoodsInvoice.quantityKg')}
      </label>
      <Input
        placeholder={t('weightGoodsInvoice.enterQuantity')}
        value={form.amount}
        onChange={(e) =>
          setForm((prev) => ({
            ...prev,
            amount: e.target.value.replace(',', '.').replace(/[^\d.]/g, ''),
          }))
        }
        type="number"
        min="0"
        step="any"
      />
    </div>
    <div className={styles.inputHalf}>
      <label className={styles.label}>
        {t('weightGoodsInvoice.vat')}
      </label>
      <Select
        value={form.taxid}
        className={styles.modalInput}
        onChange={(val) => setForm((prev) => ({ ...prev, taxid: val }))}
      >
        <Option value="0">{t('weightGoodsInvoice.withoutVat')}</Option>
        <Option value="1">{t('weightGoodsInvoice.withVat')}</Option>
      </Select>
    </div>
  </Space>

  <Space className={styles.actions}>
    <Button
      onClick={() => {
        setForm({
          name: '',
          amount: '',
          price: '',
          purchaseprice: '',
          taxid: '0',
          updateprice: true,
          isNew: false,
          id: null,
          code: '',
          hotkey: 2,
        });
        setModalVisible(false);
      }}
    >
      {t('weightGoodsInvoice.cancel')}
    </Button>
    <Button
      onClick={() =>
        setForm({
          name: '',
          amount: '',
          price: '',
          purchaseprice: '',
          taxid: '0',
          updateprice: true,
          isNew: false,
          id: null,
          code: '',
          hotkey: 2,
        })
      }
    >
      {t('weightGoodsInvoice.clear')}
    </Button>
    <Button type="primary" onClick={handleSaveProduct}>
      {t('weightGoodsInvoice.save')}
    </Button>
  </Space>
</Modal>
    </>
  );
};

export default WeightGoodsInvoicePage;
