import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { Table, Button, Typography, message, Divider, Switch, Input, Modal, Upload } from 'antd';
// 1. Импорт useTranslation
import { useTranslation } from 'react-i18next'; 

import ProductBarcodeSearch from '../../ProductBarcodeSearch'; 
import useApiRequest from '../../../hooks/useApiRequest';
import dayjs from 'dayjs';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import InvoiceHeaderForm from './InvoiceHeaderForm'; 
import ProductFormModal from './../ProductFormModal';
import ProductEditModal from './ProductEditModal';
import * as XLSX from 'xlsx';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd/es/upload';
import BatchAttributeModal from './BatchAttributeModal';
import styles from './CreateInvoice.module.css';


const { Text } = Typography;

interface BatchAttr {
  code: string;
  name: string;
  value: string;
}

interface InvoiceHeaderData {
  stockId: string | null;
  stockName: string | null;
  counterpartyId: string | null;
  counterpartyName: string | null;
  invoiceNumber: string;
  invoiceDate: string;
}

// Компонент фильтра (вне InvoiceDetailsPage)
interface NameFilterDropdownProps {
  products: ProductItem[];
  selectedKeys: React.Key[];
  setSelectedKeys: (keys: React.Key[]) => void;
  confirm: () => void;
  clearFilters?: () => void;
}

const NameFilterDropdown: React.FC<NameFilterDropdownProps> = ({
  products,
  selectedKeys,
  setSelectedKeys,
  confirm,
  clearFilters,
}) => {
  const { t } = useTranslation(); // Использование хука перевода в подкомпоненте
  const [searchText, setSearchText] = React.useState('');
  const [filteredOptions, setFilteredOptions] = React.useState(products);

  React.useEffect(() => {
    if (!searchText) setFilteredOptions(products);
    else
      setFilteredOptions(
        products.filter((p) =>
          p.name.toLowerCase().includes(searchText.toLowerCase())
        )
      );
  }, [searchText, products]);

  return (
    <div className={styles.paddedBox}>
      <input
        // Перевод: Поиск...
        placeholder={t('goodsReceipt.invoiceDetails.common.searchPlaceholder')}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        className={styles.boxStyled}
      />

      <div
        className={styles.scrollContainer}
      >
        {filteredOptions.map((p) => (
          <div key={p.id} className={styles.padded}>
            <label className={styles.flexCenterGap}>
              <input
                type="checkbox"
                checked={selectedKeys.includes(p.name)}
                onChange={(e) => {
                  if (e.target.checked)
                    setSelectedKeys([...selectedKeys, p.name]);
                  else
                    setSelectedKeys(selectedKeys.filter((key) => key !== p.name));
                }}
              />
              <span>{p.name}</span>
            </label>
          </div>
        ))}
      </div>

      <div className={styles.flexSpaceBetween}>
        <Button type="primary" size="small" className={styles.width90} onClick={() => confirm()}>
          {/* Перевод: ОК */}
          {t('goodsReceipt.invoiceDetails.common.ok')}
        </Button>
        <Button
          size="small"
          className={styles.width90}
          onClick={() => {
            clearFilters?.();
            confirm();
          }}
        >
          {/* Перевод: Сбросить */}
          {t('goodsReceipt.invoiceDetails.common.reset')}
        </Button>
      </div>
    </div>
  );
};



interface ProductItem {
  id: string;
  name: string;
  detailscaption?: string;
  attributescaption?: string;
  code: string;
  purchaseprice: number;
  newprice: number; // Цена продажи
  wholesale_price: number;
  amount: number;
  updateallprodprice?: boolean; // для переключателя
  stock?: string;
  invoicelist_id?: string;
  attributes?: string;
 
}

interface ProductDetails {
  brand: string;
  brandid: string;
  categoryid: string;
  category: string;
  newprice: number;
  wholesale_price: number;
  purchaseprice: number;
  code: string;
  name: string;
  cnofeacode: string;
  id: string;
  taxid: string;
  bonusrate: number;
  updateallprodprice: boolean; // "Обновление цены на всех торговых точках"
  unitsprid: string;
  attributescaption: any[]; 
  attributesarray: any[];
  attributes: string; 
  attrs_json: any[];
  unitspr_name: string;
  detailscaption: any[];
  quantity?: number; 
  markup?: number; 
  amount: number;
  invoicelist_id?: string;
}

interface AttributeItem {
  id: string;
  category: string | null;
  values: string;
  deleted: boolean;
  format: string;
  sprvalues: any[]; 
}

interface LocationState {
  counterparty?: string;
  stockfrom?: string;
  status?: string;
  invoicedate?: string;
}

const InvoiceDetailsPage: React.FC = () => {
  const { t } = useTranslation(); // 2. Использование хука перевода
  const { invoicenumber } = useParams<{ invoicenumber: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | undefined;

const [selectedBatchAttr, setSelectedBatchAttr] = useState<string | null>(null);
const [selectedBatchValue, setSelectedBatchValue] = useState<string>('');
const [selectedBatchAttrs, setSelectedBatchAttrs] = useState<BatchAttr[]>([]);

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);

  const isForming = state?.status === t('goodsReceipt.invoiceDetails.statusForming'); // Перевод: 'Формирование'

  const API_URL = import.meta.env.VITE_API_URL || '';
  const { sendRequest } = useApiRequest();

  const [searchText, setSearchText] = useState('');

  const [selectionSource, setSelectionSource] = useState<'search' | 'table' | null>(null);

  const { confirm } = Modal;

  const [isModalVisible, setIsModalVisible] = useState(false);
const [lastGeneratedBarcode, setLastGeneratedBarcode] = useState<string | null>(null);

  const [useInvoiceModalVisible, setUseInvoiceModalVisible] = useState(false);
const [headerData, setHeaderData] = useState<any>(null);
// Проверка: товары с нулевым количеством
const zeroAmountProducts = products.filter(p => p.amount === 0);

// Проверка: товары с нулевой ценой (закупка или продажа)
const zeroPriceProducts = products.filter(
  p => p.purchaseprice === 0 || p.newprice === 0
);

const [resetAmounts, setResetAmounts] = useState(false);
const [useLastPrices, setUseLastPrices] = useState(false);
const [creating, setCreating] = useState(false);

const [isImportModalVisible, setIsImportModalVisible] = useState(false);
const [fileList, setFileList] = useState<UploadFile[]>([]);
const [isImporting, setIsImporting] = useState(false);

const [isEditModalVisible, setIsEditModalVisible] = useState(false);
const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
const [productDetails, setProductDetails] = useState<ProductDetails | null>(null);
const [allAttributes, setAllAttributes] = useState<AttributeItem[]>([]);

const [searchKey, setSearchKey] = useState(0);

const [isBatchModalVisible, setIsBatchModalVisible] = useState(false);
const [batchAttributes, setBatchAttributes] = useState<any[]>([]);
const [currentBatchProduct, setCurrentBatchProduct] = useState<ProductItem | null>(null);

//////
const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);

// После генерации штрих-кода — сохраняем его
const handleBarcodeGenerated = (barcode: string) => {
  // Перевод: `Сгенерирован штрих-код: ${barcode}`
  setPendingBarcode(barcode);
  message.info(t('goodsReceipt.invoiceDetails.barcodeGeneratedInfo', { barcode }));
};

const [batchAttributesList, setBatchAttributesList] = useState<any[]>([]);

const fetchBatchAttributesList = async () => {
  try {
    const attributesUrl = `${API_URL}/api/attributes?deleted=false`;
    const attributesRes = await sendRequest(attributesUrl, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        'Content-Type': 'application/json',
      },
    });

    if (attributesRes) {
      setBatchAttributesList(attributesRes); 
    }
  } catch (error) {
    console.error('Ошибка загрузки атрибутов для модалки:', error);
  }
};

const handleAddBatchProduct = async (attrs: BatchAttr[]) => {
  if (!currentBatchProduct || !invoicenumber) return;

  try {
    setLoading(true);

    const body = {
      invoice: invoicenumber,
      zapros: 'invoice_product_addnew',
      type: '2',
      stockcurrentfrom: [
        {
          id: currentBatchProduct.id,
          amount: 1,
          purchaseprice: currentBatchProduct.purchaseprice,
          newprice: currentBatchProduct.newprice,
          wholesale_price: currentBatchProduct.wholesale_price,
          attributes: '0',
          attrlist: attrs, // ← передаём выбранные атрибуты
        },
      ],
    };

    const res = await sendRequest(`${API_URL}/api/invoice/functioncall`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.code === 'success') {
      // Перевод: 'Товар с партией успешно добавлен'
      message.success(t('goodsReceipt.invoiceDetails.batchProductAddedSuccess'));
      await fetchInvoiceProducts();
    } else {
      // Перевод: 'Ошибка при добавлении партийного товара'
      message.error(res.text || t('goodsReceipt.invoiceDetails.batchProductAddError'));
    }
  } catch (error) {
    console.error(error);
    // Перевод: 'Ошибка при добавлении партийного товара'
    message.error(t('goodsReceipt.invoiceDetails.batchProductAddError'));
  } finally {
    setLoading(false);
    setIsBatchModalVisible(false);
    setCurrentBatchProduct(null);
    setBatchAttributes([]);
  }
};

// После успешного сохранения товара — добавляем в накладную
const handleProductCreated = async () => {
  if (!pendingBarcode || !invoicenumber) return;

  try {
    setLoading(true);

    const body = {
      invoice: invoicenumber,
      barcode: pendingBarcode,
      type: 2,
      zapros: 'invoice_from_nomenclature',
    };

    const res = await sendRequest(`${API_URL}/api/invoice/functioncall`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.code === 'success' || res.text === '2') {
      // Перевод: 'Товар успешно добавлен в накладную'
      message.success(t('goodsReceipt.invoiceDetails.productAddedSuccess'));

      // Перезагружаем товары
      const data = await sendRequest(
        `${API_URL}/api/invoice/product1?invoicenumber=${invoicenumber}`,
        {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        'Content-Type': 'application/json',
      },
    }
      );
      setProducts(data || []);
    } else {
      // Перевод: 'Ошибка добавления товара'
      message.error(res.text || t('goodsReceipt.invoiceDetails.productAddError'));
    }
  } catch (error) {
    console.error('Ошибка при добавлении товара:', error);
    // Перевод: 'Не удалось добавить товар в накладную'
    message.error(t('goodsReceipt.invoiceDetails.productAddFailure'));
  } finally {
    setLoading(false);
    setPendingBarcode(null);
    setIsModalVisible(false); // закрываем модалку
  }
};
///////

const handleUseInvoiceCreate = async () => {
  if (!invoicenumber || !headerData?.stockId || !headerData?.counterpartyId) {
    // Перевод: 'Выберите склад и поставщика'
    message.warning(t('goodsReceipt.invoiceDetails.selectStockAndCounterpartyWarning'));
    return;
  }

  try {
    setCreating(true);

    const body = {
      altinvoice: headerData.invoiceNumber, // текущая накладная
      counterparty: headerData.counterpartyId,
      invoicedate: dayjs(headerData.invoiceDate).format('DD.MM.YYYY'),
      stockfrom: headerData.stockId,
      stockto: headerData.stockId,
      type: '2',
      invoice: invoicenumber,
      price_checkbox: useLastPrices,
      units_checkbox: resetAmounts,
      zapros: 'invoice_create_isp',
    };

    const res = await sendRequest(`${API_URL}/api/invoice/functioncall`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.code === 'success' || res.success) {
      // Перевод: 'Новая накладная успешно создана'
      message.success(t('goodsReceipt.invoiceDetails.newInvoiceCreatedSuccess'));
      setUseInvoiceModalVisible(false);

      // переход к новой накладной
      navigate(`/invoices/${res.invoicenumber || res.text}`, {
        state: {
          counterparty: headerData.counterpartyName,
          stockfrom: headerData.stockName,
          status: t('goodsReceipt.invoiceDetails.statusForming'), // Перевод: 'Формирование'
          invoicedate: headerData.invoiceDate,
        },
      });
    } else {
      // Перевод: 'Ошибка при создании накладной'
      message.error(res.text || t('goodsReceipt.invoiceDetails.invoiceCreationError'));
    }
  } catch (error) {
    console.error('Ошибка при создании накладной:', error);
    // Перевод: 'Ошибка при создании накладной'
    message.error(t('goodsReceipt.invoiceDetails.invoiceCreationError'));
  } finally {
    setCreating(false);
  }
};


const handleDeleteProductConfirm = (product: ProductItem) => {
  confirm({
    // Перевод: Вы уверены, что хотите удалить товар "${product.name}"?
    title: t('goodsReceipt.invoiceDetails.deleteProductConfirmTitle', { productName: product.name }),
    // Перевод: 'Это действие нельзя будет отменить'
    content: t('goodsReceipt.invoiceDetails.common.undoActionWarning'),
    // Перевод: 'Да, удалить'
    okText: t('goodsReceipt.invoiceDetails.common.yesDelete'),
    okType: 'danger',
    // Перевод: 'Отмена'
    cancelText: t('goodsReceipt.invoiceDetails.common.cancel'),
    onOk() {
      handleDeleteProduct(product);
    },
    onCancel() {
      // Можно ничего не делать, просто закрыть модалку
    },
  });
};

 const handleDeleteInvoiceConfirm = () => {
  Modal.confirm({
    // Перевод: 'Удалить накладную!'
    title: t('goodsReceipt.invoiceDetails.deleteInvoiceTitle'),
    // Перевод: 'Вы уверены, что хотите удалить накладную?'
    content: t('goodsReceipt.invoiceDetails.deleteInvoiceConfirmContent'),
    // Перевод: 'Да, удалить'
    okText: t('goodsReceipt.invoiceDetails.common.yesDelete'),
    okType: 'danger',
    // Перевод: 'Отмена'
    cancelText: t('goodsReceipt.invoiceDetails.common.cancel'),
    async onOk() {
      await handleDeleteInvoice();
    },
  });
};

const handleDeleteInvoice = async () => {
  if (!invoicenumber) return;

  try {
    setLoading(true);
    const body = {
      invoices: [{ id: invoicenumber }],
    };

    const res = await sendRequest(`${API_URL}/api/invoice/delete/many`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.code === 'success' || res.success) {
      // Перевод: `Накладная №${invoicenumber} успешно удалена`
      message.success(t('goodsReceipt.invoiceDetails.invoiceDeletedSuccess', { invoicenumber }));
      navigate(-1); // вернуться назад
    } else {
      // Перевод: `Ошибка удаления накладной: ${res.text || 'Неизвестная ошибка'}`
      message.error(t('goodsReceipt.invoiceDetails.invoiceDeleteError', { error: res.text || t('goodsReceipt.invoiceDetails.common.unknownError') }));
    }
  } catch (error) {
    console.error('Ошибка при удалении накладной:', error);
    // Перевод: 'Ошибка при удалении накладной'
    message.error(t('goodsReceipt.invoiceDetails.invoiceDeleteErrorGeneric'));
  } finally {
    setLoading(false);
  }
};


  const totalPurchase = products.reduce((sum, p) => sum + p.purchaseprice * p.amount, 0);
  const totalSale = products.reduce((sum, p) => sum + p.newprice * p.amount, 0);
  const totalAmount = products.reduce((sum, p) => sum + p.amount, 0); 

  const fetchInvoiceProducts = async () => {
  if (!invoicenumber) return;
  setLoading(true);
  try {
    const data: ProductItem[] = await sendRequest(`${API_URL}/api/invoice/product1?invoicenumber=${invoicenumber}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        'Content-Type': 'application/json',
      },
    });
    setProducts(data);
  } catch (error) {
    // Перевод: 'Ошибка загрузки товаров накладной'
    message.error(t('goodsReceipt.invoiceDetails.productLoadError'));
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  
  fetchBatchAttributesList(); // вызываем при монтировании компонента
}, []);

  useEffect(() => {
    if (!invoicenumber) return;

    setLoading(true);
    sendRequest(`${API_URL}/api/invoice/product1?invoicenumber=${invoicenumber}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        'Content-Type': 'application/json',
      },
    })
      .then((data: ProductItem[]) => {
        //console.log('Loaded products:', data);
        setProducts(data);
      })
      // Перевод: 'Ошибка загрузки товаров накладной'
      .catch(() => message.error(t('goodsReceipt.invoiceDetails.productLoadError')))
      .finally(() => setLoading(false));
  }, [invoicenumber]);

  const onProductSelect = async (productId: string, barcode: string) => {
  //console.log('onProductSelect called', { productId, barcode });

  if (barcode && barcode.trim() !== '') {
    try {
      setLoading(true);
      const productFromApi = await sendRequest(`${API_URL}/api/products/getProductByBarcodeLocal?barcode=${barcode.trim()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'Content-Type': 'application/json',
        },
      });

      //console.log('Product from local API:', productFromApi);

      if (productFromApi && productFromApi.id) {
        // Преобразуем ответ API в ProductItem с минимальным набором свойств
        const selected: ProductItem = {
          id: productFromApi.id,
          name: productFromApi.name,
          code: productFromApi.code,
          purchaseprice: productFromApi.lastpurchaseprice || 0,
          newprice: productFromApi.pieceprice || 0,
          wholesale_price: productFromApi.wholesale_price || 0,
          amount: 1,
          detailscaption: productFromApi.detailscaption,
          attributescaption: productFromApi.attributescaption,
        };

        setSelectedProduct(selected);
        setSelectedRowKey(productFromApi.code);

        setSelectionSource('search');


        return;
      } else {
        // Перевод: 'Товар по штрихкоду не найден'
        message.warning(t('goodsReceipt.invoiceDetails.barcodeProductNotFound'));
        setSelectedProduct(null);
        setSelectedRowKey(null);
      }
    } catch (error) {
      console.error('Ошибка при запросе товара по штрихкоду:', error);
      // Перевод: 'Ошибка при загрузке товара по штрихкоду'
      message.error(t('goodsReceipt.invoiceDetails.barcodeProductLoadError'));
      setSelectedProduct(null);
      setSelectedRowKey(null);
    } finally {
      setLoading(false);
    }
  } else if (productId && productId.trim() !== '') {
    // fallback: поиск по productId в локальном массиве products
    const found = products.find(p => p.id && p.id.trim().toLowerCase() === productId.trim().toLowerCase());
    setSelectedProduct(found || null);
    setSelectedRowKey(found ? found.code : null);
  } else {
    setSelectedProduct(null);
    setSelectedRowKey(null);
  }
};

//////
const handleEditProduct = async (record: ProductItem) => {
  if (!invoicenumber || !record.stock) {
    // Перевод: 'Не удалось получить данные товара.'
    message.error(t('goodsReceipt.invoiceDetails.productDataFetchError'));
    return;
  }

  setEditingProduct(record);
  setProductDetails(null);
  

  try {
    const detailsUrl = `${API_URL}/api/invoice/product/details?invoiceNumber=${invoicenumber}&productId=${record.stock}&attributes=${record.attributescaption ?? '0'}`;
    
    const detailsRes = await sendRequest(detailsUrl, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        'Content-Type': 'application/json',
      },
    });

    if (Array.isArray(detailsRes) && detailsRes.length > 0) {
      const details = detailsRes[0];

      const detailsWithAmount: ProductDetails = {
        ...details,
        amount: record.amount,
        purchaseprice: Number(details.purchaseprice) || 0,
        newprice: Number(details.newprice) || 0,
        wholesale_price: Number(details.wholesale_price) || 0,
        invoicelist_id: record.invoicelist_id,
      };

      setProductDetails(detailsWithAmount);
      setIsEditModalVisible(true);
    } else {
      // Перевод: 'Детали товара не найдены.'
      message.error(t('goodsReceipt.invoiceDetails.productDetailsNotFound'));
      setIsEditModalVisible(false);
      return;
    }

    const attributesUrl = `${API_URL}/api/attributes?deleted=false`;
    const attributesRes = await sendRequest(attributesUrl, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        'Content-Type': 'application/json',
      },
    });

    setAllAttributes(attributesRes || []);

  } catch (error) {
    console.error('Ошибка загрузки данных редактирования:', error);
    // Перевод: 'Не удалось загрузить данные для редактирования.'
    message.error(t('goodsReceipt.invoiceDetails.editDataLoadError'));
    setIsEditModalVisible(false);
  }
};


  // 3. Обработчик закрытия модалки
  const handleEditModalClose = () => {
    setIsEditModalVisible(false);
    setEditingProduct(null);
    setProductDetails(null);
  };
//////

//////

const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('accessToken') || '';
      const response = await fetch(`${API_URL}/api/files/download?file=template.xlsx`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        // Перевод: 'Ошибка загрузки шаблона'
        throw new Error(t('goodsReceipt.invoiceDetails.templateDownloadError'));
      }
      const blob = await response.blob();
      
      // Создаем ссылку в памяти для скачивания
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      // Перевод: 'Не удалось скачать шаблон'
      message.error(t('goodsReceipt.invoiceDetails.templateDownloadFailure'));
    }
  };

  /**
   * Обрабатывает импорт выбранного .xlsx файла
   */
  const handleImportXLSX = async () => {
    if (fileList.length === 0) {
      // Перевод: 'Пожалуйста, сначала выберите .xlsx файл'
      message.warning(t('goodsReceipt.invoiceDetails.selectXLSXFileWarning'));
      return;
    }
    if (!invoicenumber) {
      // Перевод: 'Номер накладной не определен'
      message.error(t('goodsReceipt.invoiceDetails.invoiceNumberUndefinedError'));
      return;
    }

    const file = fileList[0].originFileObj; // <-- originFileObj содержит реальный объект File
    if (!file) {
      // Перевод: 'Файл не найден'
      message.error(t('goodsReceipt.invoiceDetails.common.fileNotFound')); 
      return;
    }

    setIsImporting(true);

    // Используем FileReader для чтения файла
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        // Перевод: 'Не удалось прочитать файл'
        if (!data) throw new Error(t('goodsReceipt.invoiceDetails.common.fileReadError'));

        // 1. Парсим XLSX
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // 2. Конвертируем в JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // 3. Готовим тело запроса
        const invoiceprods = JSON.stringify(jsonData);
        const bodyParams = new URLSearchParams();
        bodyParams.append('invoiceprods', invoiceprods);
        bodyParams.append('invoice', invoicenumber);

        // 4. Отправляем запрос
        // Используем fetch, так как sendRequest может быть настроен только на JSON
        const token = localStorage.getItem('accessToken') || '';
        const response = await fetch(`${API_URL}/api/utils/invoice_add_xls`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          },
          body: bodyParams.toString(),
        });

        const res = await response.json(); // Ожидаем JSON в ответ

        if (res.code === 'success' || res.success) {
          // Перевод: 'Товары из .xlsx успешно импортированы'
          message.success(t('goodsReceipt.invoiceDetails.xlsxImportSuccess'));
          setIsImportModalVisible(false);
          setFileList([]);
          await fetchInvoiceProducts(); // Перезагружаем список товаров
        } else {
          // Перевод: 'Ошибка импорта файла'
          message.error(res.text || t('goodsReceipt.invoiceDetails.fileImportError'));
        }
      } catch (parseError) {
        console.error('Ошибка парсинга или отправки:', parseError);
        // Перевод: 'Ошибка при обработке файла'
        message.error(t('goodsReceipt.invoiceDetails.common.fileProcessingError'));
      } finally {
        setIsImporting(false);
      }
    };

    reader.onerror = () => {
      // Перевод: 'Ошибка чтения файла'
      message.error(t('goodsReceipt.invoiceDetails.common.fileReadError'));
      setIsImporting(false);
    };

    reader.readAsArrayBuffer(file);
  };


const uploadProps: UploadProps = {
  fileList,
  accept: ".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel",
  // Добавьте режим одиночного файла (важно для Dragger)
  multiple: false, 
  
  beforeUpload: (file) => {
    const isXlsx = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx');
    if (!isXlsx) {
      // Перевод: 'Можно загружать только .xlsx файлы'
      message.error(t('goodsReceipt.invoiceDetails.onlyXLSXWarning'));
      return Upload.LIST_IGNORE;
    }
    // УДАЛЯЕМ: setFileList([file]); 
    return false; // Все еще отключаем автоматическую загрузку
  },

  // 2. Добавьте onChange для корректного обновления списка файлов
  onChange: (info) => {
    let newFileList = [...info.fileList];
    
    // Оставляем только последний загруженный файл (если нужно только 1)
    newFileList = newFileList.slice(-1); 

    // Проверяем статус файла. Если он в очереди (status 'uploading'), 
    // сохраняем его для кнопки Импорт
    if (newFileList[0] && newFileList[0].status !== 'error') {
      setFileList(newFileList);
    } else {
      setFileList([]);
    }
  },
  
  onRemove: (file) => {
    // При удалении файла очищаем список
    const index = fileList.indexOf(file);
    const newFileList = fileList.slice();
    newFileList.splice(index, 1);
    setFileList(newFileList);
    return true;
  },
};

//////


const handleToggleUpdatePrice = async (record: ProductItem, checked: boolean) => {
  if (!invoicenumber || !isForming) return;

  // 1. Оптимистичное обновление UI
  const newProducts = products.map(p => {
    if (p.code === record.code) {
      return { ...p, updateallprodprice: checked };
    }
    return p;
  });
  setProducts(newProducts);

  try {
    const body = {
      invoice: invoicenumber,
      stock: {
        //id: record.id,
        id: record.stock,
        attributes: record.attributes || '0',
        key: 'updateallprodprice', // Ключ для обновления флага на сервере
        value: checked, // true или false
      },
      zapros: 'invoice_product_update',
      all: -1, // Согласно вашему примеру
    };

    const res = await sendRequest(`${API_URL}/api/invoice/functioncall`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.code === 'success') {
      // Перевод: `Флаг обновления цены для "${record.name}" изменен на ${checked ? 'Да' : 'Нет'}`
      message.success(t('goodsReceipt.invoiceDetails.priceUpdateFlagSuccess', { 
        productName: record.name, 
        status: checked ? t('goodsReceipt.invoiceDetails.common.yes') : t('goodsReceipt.invoiceDetails.common.no') 
      }));
      
    } else {
      // Откат при ошибке и вывод сообщения
      setProducts(products); // Возвращаем старое состояние
      // Перевод: `Ошибка обновления флага: ${res.text || 'Неизвестная ошибка'}`
      message.error(t('goodsReceipt.invoiceDetails.priceUpdateFlagError', { error: res.text || t('goodsReceipt.invoiceDetails.common.unknownError') }));
    }
  } catch (error) {
    console.error('Ошибка при переключении флага:', error);
    setProducts(products); // Откат при ошибке
    // Перевод: 'Ошибка при обновлении флага цены'
    message.error(t('goodsReceipt.invoiceDetails.priceUpdateFlagErrorGeneric'));
  }
};

const handleProductUpdate = async (record: ProductItem, key: 'purchaseprice' | 'newprice' | 'amount', value: number | string) => {
  if (!invoicenumber || !isForming) return;
  const numericValue = Number(value);
  if (isNaN(numericValue) || numericValue < 0) {
    // Перевод: 'Некорректное значение'
    message.error(t('goodsReceipt.invoiceDetails.common.invalidValue'));
    return;
  }

  const updatedValue = numericValue;
  
  // Создаем объект для обновления в таблице (чтобы показать изменения сразу)
  const newProducts = products.map(p => {
    if (p.code === record.code) {
      return { ...p, [key]: updatedValue };
    }
    return p;
  });
  
  // Временно обновляем состояние, чтобы пользователь видел изменения
  setProducts(newProducts);
  
  // Определяем, какое значение изменилось
  let payloadKey: 'purchaseprice' | 'newprice' | 'units';
  let payloadValue: number;

  if (key === 'purchaseprice') {
      payloadKey = 'purchaseprice';
      payloadValue = updatedValue;
  } else if (key === 'newprice') {
      payloadKey = 'newprice';
      payloadValue = updatedValue;
  } else if (key === 'amount') {
      payloadKey = 'units';
      payloadValue = updatedValue;
  } else {
      return; // На всякий случай
  }

  try {
    const body: any = { // Используем any для удобства
      invoice: invoicenumber,
      stock: {
        //id: record.id,
        id: record.stock,
        attributes: record.attributes || '0',
        key: payloadKey,
        value: payloadValue,
        // Отправляем текущие значения для полноты, как в примере тела запроса:
        units: key === 'amount' ? updatedValue : record.amount,
        purchaseprice: key === 'purchaseprice' ? updatedValue : record.purchaseprice,
        newprice: key === 'newprice' ? updatedValue : record.newprice,
        // Эти поля можно оставить по умолчанию, если они не меняются
        manualprice: false, 
        staticprice: null,
      },
      zapros: 'invoice_product_update',
    };
    
    // ВАЖНО: При отправке запроса на обновление, необходимо использовать текущие актуальные значения
    // в полях units, purchaseprice, newprice, даже если они не менялись в данном конкретном действии.
    // Используем значения из только что обновленного локального состояния `newProducts`:
    const currentRecord = newProducts.find(p => p.code === record.code);
    if (currentRecord) {
        body.stock.units = currentRecord.amount;
        body.stock.purchaseprice = currentRecord.purchaseprice;
        body.stock.newprice = currentRecord.newprice;
    }


    const res = await sendRequest(`${API_URL}/api/invoice/functioncall`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.code === 'success' || res.text === '1') {
      // Перевод: `Значение "${key}" для "${record.name}" обновлено`
      message.success(t('goodsReceipt.invoiceDetails.productValueUpdateSuccess', { key, productName: record.name }));
      // Нет необходимости в повторном fetch, т.к. мы уже обновили локально (newProducts).
      // Если бы сервер возвращал полный список, мы бы использовали его для setProducts.
    } else {
      // Откат изменений при ошибке
      setProducts(products); // Возвращаем старое состояние
      // Перевод: `Ошибка обновления: ${res.text || 'Неизвестная ошибка'}`
      message.error(t('goodsReceipt.invoiceDetails.productUpdateError', { error: res.text || t('goodsReceipt.invoiceDetails.common.unknownError') }));
    }
  } catch (error) {
    console.error('Ошибка обновления товара:', error);
    // Откат изменений при ошибке
    setProducts(products); // Возвращаем старое состояние
    // Перевод: 'Ошибка при обновлении товара'
    message.error(t('goodsReceipt.invoiceDetails.productUpdateErrorGeneric'));
  }
};

const handleCompleteInvoiceConfirm = () => {
  // 1. Есть товары с нулевым количеством? (Розовая рамка/фон)
  if (zeroAmountProducts.length > 0) {
    Modal.warning({
      // Перевод: 'Невозможно завершить приём'
      title: t('goodsReceipt.invoiceDetails.cannotCompleteTitle'),
      content: (
        // Используем встроенный стиль для розового фона/рамки
        <div className={styles.alertBox}>
          {/* Перевод: В накладной есть товары с нулевым количеством: */}
          <p className={styles.boldRedText}>{t('goodsReceipt.invoiceDetails.zeroAmountProductsWarning')}</p>
          <ul>
            {zeroAmountProducts.slice(0, 5).map(p => (
              <li key={p.code}>{p.name}</li>
            ))}
            {zeroAmountProducts.length > 5 && (
              // Перевод: и ещё ${zeroAmountProducts.length - 5}...
              <li>{t('goodsReceipt.invoiceDetails.common.andMore', { count: zeroAmountProducts.length - 5 })}</li>
            )}
          </ul>
          {/* Перевод: Удалите или исправьте количество перед завершением. */}
          <p className={styles.tagList}>{t('goodsReceipt.invoiceDetails.fixAmountInstruction')}</p>
        </div>
      ),
      // Перевод: 'Понятно'
      okText: t('goodsReceipt.invoiceDetails.common.understood'),
    });
    return;
  }

  // 2. Есть товары с нулевой ценой? (Светло-желтая рамка/фон)
  if (zeroPriceProducts.length > 0) {
    Modal.confirm({
      // Перевод: 'Товары с нулевой ценой'
      title: t('goodsReceipt.invoiceDetails.zeroPriceProductsTitle'),
      content: (
        // Используем встроенный стиль для светло-желтого фона/рамки
        <div className={styles.warningBox}>
          {/* Перевод: У Вас имеется(ются) товар(ы) с нулевой ценой: */}
          <p className={styles.warningText}>
            {t('goodsReceipt.invoiceDetails.zeroPriceProductsList')}
          </p>
          <ul>
            {zeroPriceProducts.slice(0, 5).map(p => (
              <li key={p.code}>
                {p.name} —{' '}
                {/* Перевод: закупка: 0, продажа: 0 */}
                {p.purchaseprice === 0 && `${t('goodsReceipt.invoiceDetails.purchasePrice')}: 0, `}
                {p.newprice === 0 && `${t('goodsReceipt.invoiceDetails.sellingPrice')}: 0`}
              </li>
            ))}
            {zeroPriceProducts.length > 5 && (
              // Перевод: и ещё ${zeroPriceProducts.length - 5}...
              <li>{t('goodsReceipt.invoiceDetails.common.andMore', { count: zeroPriceProducts.length - 5 })}</li>
            )}
          </ul>
          {/* Перевод: Внимание: При нулевой цене... */}
          <p className={styles.marginTopMedium}>
            {t('goodsReceipt.invoiceDetails.zeroPriceConsequenceWarning')}
          </p>
          {/* Перевод: Вы хотите изменить цены на них или завершить приём как есть? */}
          <p>
            {t('goodsReceipt.invoiceDetails.zeroPriceActionQuestion')}
          </p>
        </div>
      ),
      // Перевод: 'Завершить как есть'
      okText: t('goodsReceipt.invoiceDetails.completeAsIs'),
      // Перевод: 'Изменить цены'
      cancelText: t('goodsReceipt.invoiceDetails.changePrices'),
      okType: 'primary',
      onOk: () => handleCompleteInvoice(),
      onCancel: () => {
        // Перевод: 'Вы можете отредактировать цены в таблице'
        message.info(t('goodsReceipt.invoiceDetails.editPricesInfo'));
      },
    });
    return;
  }

  // 3. Всё ок — обычное подтверждение (без изменений)
  Modal.confirm({
    // Перевод: 'Прием товаров на кассу / склад'
    title: t('goodsReceipt.invoiceDetails.completeInvoiceConfirmTitle'),
    content: (
      <div>
        {/* Перевод: После завершения приема товаров Вы не сможете внести изменения в данную накладную. */}
        {t('goodsReceipt.invoiceDetails.completeInvoiceWarning1')}
        <br /><br />
        {/* Перевод: Вы уверены, что хотите завершить прием товаров? */}
        {t('goodsReceipt.invoiceDetails.completeInvoiceWarning2')}
      </div>
    ),
    // Перевод: 'Завершить приём'
    okText: t('goodsReceipt.invoiceDetails.completeInvoiceButton'),
    // Перевод: 'Отмена'
    cancelText: t('goodsReceipt.invoiceDetails.common.cancel'),
    okType: 'primary',
    onOk: () => handleCompleteInvoice(),
  });
};

const handleCompleteInvoice = async () => {
  if (!invoicenumber) return;

  try {
    setLoading(true);
    const body = {
      invoice: invoicenumber,
      overrideChecks: false,
    };

    const res = await sendRequest(`${API_URL}/api/invoice/submit/add`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.code === 'success') {
      // Перевод: `Накладная №${invoicenumber} успешно завершена`
      message.success(t('goodsReceipt.invoiceDetails.invoiceCompletedSuccess', { invoicenumber }));
      navigate(-1); // возвращаемся назад
    } else {
      // Перевод: `Ошибка завершения: ${res.text || 'Неизвестная ошибка'}`
      message.error(t('goodsReceipt.invoiceDetails.invoiceCompletionError', { error: res.text || t('goodsReceipt.invoiceDetails.common.unknownError') }));
    }
  } catch (error) {
    console.error('Ошибка при завершении накладной:', error);
    // Перевод: 'Ошибка при завершении накладной'
    message.error(t('goodsReceipt.invoiceDetails.invoiceCompletionErrorGeneric'));
  } finally {
    setLoading(false);
  }
};



// Функция удаления товара
const handleDeleteProduct = async (product: ProductItem) => {
  //console.log('Deleting product:', product);
  if (!invoicenumber) return;
  try {
    setLoading(true);
    const body = {
      invoice: invoicenumber,
      stock: product.stock || '',
      attributes: product.attributes || '0',
    };
    const res = await sendRequest(`${API_URL}/api/invoice/delete/product`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.code === 'success') {
      // Перевод: `Товар "${product.name}" удалён`
      message.success(t('goodsReceipt.invoiceDetails.productDeletedSuccess', { productName: product.name }));
      setProducts(products.filter(p => p.code !== product.code));
      if (selectedRowKey === product.code) {
        setSelectedRowKey(null);
        setSelectedProduct(null);
      }
    } else {
      // Перевод: `Ошибка удаления товара: ${res.text || 'неизвестно'}`
      message.error(t('goodsReceipt.invoiceDetails.productDeleteError', { error: res.text || t('goodsReceipt.invoiceDetails.common.unknownError') }));
    }
  } catch (error) {
    // Перевод: 'Ошибка при удалении товара'
    message.error(t('goodsReceipt.invoiceDetails.productDeleteErrorGeneric'));
    console.error(error);
  } finally {
    setLoading(false);
  }
};



  const onClearSelection = () => {
    setSelectedProduct(null);
  };


  const onAddProductToInvoice = async () => {
  if (!selectedProduct || !invoicenumber) {
    // Перевод: 'Сначала выберите товар и убедитесь, что номер накладной доступен.'
    message.warning(t('goodsReceipt.invoiceDetails.selectProductWarning'));
    return;
  }


  try {
    setLoading(true);

    // Подготовка тела запроса
    const body = {
      invoice: invoicenumber, // Текущий номер накладной
      type: '2', 
      barcode: selectedProduct.code, // Штрихкод (code) выбранного товара
      zapros: 'invoice_addproduct_dop',
    };

    const res = await sendRequest(`${API_URL}/api/invoice/functioncall`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.code === 'success' || res.text === '1') {
      // Перевод: `Товар "${selectedProduct.name}" успешно добавлен в накладную`
      message.success(t('goodsReceipt.invoiceDetails.productAddedSuccessToInvoice', { productName: selectedProduct.name }));
      
      // Сброс выбора
      setSelectedProduct(null);
      setSelectedRowKey(null);

      onClearSelection();

      setSearchKey(prev => prev + 1);

      // Перезагрузка списка товаров накладной для отображения изменений
      await fetchInvoiceProducts(); 

    } else {
      // Перевод: 'Ошибка добавления товара в накладную'
      message.error(res.text || t('goodsReceipt.invoiceDetails.productAddErrorToInvoice'));
    }
  } catch (error) {
    console.error('Ошибка при добавлении товара:', error);
    // Перевод: 'Не удалось добавить товар в накладную'
    message.error(t('goodsReceipt.invoiceDetails.productAddFailureToInvoice'));
  } finally {
    setLoading(false);
  }
};

  const onDeleteInvoice = () => {
    // Перевод: 'Удаление накладной...'
    message.info(t('goodsReceipt.invoiceDetails.deletingInvoiceInfo'));
  };

  const onImportXLSX = () => {
    // Перевод: 'Импорт .xlsx...'
    message.info(t('goodsReceipt.invoiceDetails.importXLSXInfo'));
  };

  const onImportCEDM = () => {
    // Перевод: 'Импорт маркировок ЦЭДМ...'
    message.info(t('goodsReceipt.invoiceDetails.importCEDMInfo'));
  };

  const onCompleteInvoice = () => {
    // Перевод: 'Накладная завершена'
    message.success(t('goodsReceipt.invoiceDetails.invoiceCompletedInfo'));
  };

  const onAddNewProduct = () => {
    setIsModalVisible(true);
  };

  // Обработка выбора строки в таблице
  

   const onSelectChange = (selectedRowKeys: React.Key[]) => {
  if (selectedRowKeys.length === 1) {
    const key = selectedRowKeys[0];
    if (typeof key === 'string') {
      const selected = products.find(p => p.code.trim().toLowerCase() === key.trim().toLowerCase());
      //setSelectedProduct(selected || null);
      setSelectedRowKey(key);
      return;
    }
  }
  setSelectedProduct(null);
  setSelectedRowKey(null);
};

  // Обновление переключателя обновления цены
  const toggleUpdatePriceAllPoints = (checked: boolean, record: ProductItem) => {
    const newProducts = products.map(p => {
      if (p.code === record.code) {
        return { ...p, updateallprodprice: checked };
      }
      return p;
    });
    setProducts(newProducts);
  };

 
  const baseColumns: ColumnsType<ProductItem> = [
  
{
    // Перевод: 'Наименование'
    title: t('goodsReceipt.invoiceDetails.columnName'),
    dataIndex: 'name',
    key: 'name',
    ...(isForming
      ? ({
          filterDropdown: (props: FilterDropdownProps) => (
            <NameFilterDropdown {...props} products={products} />
          ),
          onFilter: (value: string, record: ProductItem) =>
            record.name.toLowerCase().includes(value.toLowerCase()),
        } as Partial<ColumnType<ProductItem>>)
      : {}),
    render: (_: any, record: ProductItem) => (
      <div>
        <div>{record.name}</div>
        {record.detailscaption && (
          <div className={styles.smallText}>{record.detailscaption}</div>
        )}
        {record.attributescaption && (
          <div className={styles.graySmallText}>{record.attributescaption}</div>
        )}
      </div>
    ),
  },
  {
    // Перевод: 'Штрих код'
    title: t('goodsReceipt.invoiceDetails.columnBarcode'),
    dataIndex: 'code',
    key: 'code',
  },
 
  // Колонка Цена закупки
{
    // Перевод: 'Цена закупки'
    title: <div>{t('goodsReceipt.invoiceDetails.columnPurchasePrice')}<br/>{t('goodsReceipt.invoiceDetails.columnPriceSubtext')}</div>,
    dataIndex: 'purchaseprice',
    key: 'purchaseprice',
    width: 100, // Увеличим ширину для удобства
    sorter: isForming ? (a: ProductItem, b: ProductItem) => a.purchaseprice - b.purchaseprice : undefined,
    render: (price: number| null, record: ProductItem) => {
      const safePrice = price ?? 0;
        const content = (
          <div className={styles.rightAligned}>
            <div>{safePrice.toFixed(2)}</div>
          </div>
        );
        
        if (!isForming) return content;

        return (
          <Input 
            defaultValue={safePrice.toFixed(2)}
            onBlur={(e) => {
              const newValue = parseFloat(e.target.value);
              if (!isNaN(newValue) && newValue !== price) {
                handleProductUpdate(record, 'purchaseprice', newValue);
              }
            }}
            onPressEnter={(e) => {
              const newValue = parseFloat(e.currentTarget.value);
              if (!isNaN(newValue) && newValue !== price) {
                handleProductUpdate(record, 'purchaseprice', newValue);
              }
            }}
            className={styles.rightPadded}
            type="number"
            step="0.01"
          />
        );
    },
},
  
  // Колонка Цена продажи
{
    // Перевод: 'Цена продажи'
    title: <div>{t('goodsReceipt.invoiceDetails.columnSellingPrice')}<br/>{t('goodsReceipt.invoiceDetails.columnPriceSubtext')}</div>,
    dataIndex: 'newprice',
    key: 'newprice',
    width: 100, // Увеличим ширину
    sorter: isForming ? (a: ProductItem, b: ProductItem) => a.newprice - b.newprice : undefined,
    render: (price: number| null, record: ProductItem) => {
       const safePrice = price ?? 0;
        const content = (
          <div className={styles.rightAligned}>
            <div>{safePrice.toFixed(2)}</div>
          </div>
        );

        if (!isForming) return content;

        return (
          <Input 
            defaultValue={safePrice.toFixed(2)}
            onBlur={(e) => {
              const newValue = parseFloat(e.target.value);
              if (!isNaN(newValue) && newValue !== price) {
                handleProductUpdate(record, 'newprice', newValue);
              }
            }}
            onPressEnter={(e) => {
              const newValue = parseFloat(e.currentTarget.value);
              if (!isNaN(newValue) && newValue !== price) {
                handleProductUpdate(record, 'newprice', newValue);
              }
            }}
            className={styles.rightPadded}
            type="number"
            step="0.01"
          />
        );
    },
},
{
    // Перевод: 'Оптовая цена'
    title: <div>{t('goodsReceipt.invoiceDetails.columnWholesalePrice')}<br/>{t('goodsReceipt.invoiceDetails.columnPriceSubtext')}</div>,
    dataIndex: 'wholesale_price',
    key: 'wholesale_price',
    width: 80,
    sorter: isForming ? (a: ProductItem, b: ProductItem) => a.wholesale_price - b.wholesale_price : undefined,
    render: (price: number | null) => {
         const safePrice = price ?? 0; 
        
        return (
          <div className={styles.rightAligned}>
           
            <div>{safePrice.toFixed(2)}</div>
          </div>
        );
    },
},
  
  // Колонка Количество
{
    // Перевод: 'Количество'
    title: t('goodsReceipt.invoiceDetails.columnAmount'),
    dataIndex: 'amount',
    key: 'amount',
    width: 80, // Увеличим ширину
    sorter: isForming ? (a: ProductItem, b: ProductItem) => a.amount - b.amount : undefined,
    render: (amount: number, record: ProductItem) => {
        const content = amount;

        if (!isForming) return content;

        return (
          <Input 
            defaultValue={amount.toString()}
            onBlur={(e) => {
              const newValue = parseFloat(e.target.value);
              if (!isNaN(newValue) && newValue !== amount) {
                handleProductUpdate(record, 'amount', newValue);
              }
            }}
            onPressEnter={(e) => {
              const newValue = parseFloat(e.currentTarget.value);
              if (!isNaN(newValue) && newValue !== amount) {
                handleProductUpdate(record, 'amount', newValue);
              }
            }}
            className={styles.textCenterPadding}
            type="number"
            step="1"
          />
        );
    },
},
 
  {
    // Перевод: 'Сумма закупки'
    title: <div>{t('goodsReceipt.invoiceDetails.columnSumPurchase')}<br/>{t('goodsReceipt.invoiceDetails.columnPriceSubtext')}</div>,
    key: 'sumPurchase',
    width: 80,
    render: (_: any, record: ProductItem) => (
      <div className={styles.rightAligned}>
        <div>{(record.purchaseprice * record.amount).toFixed(2)}</div>
      </div>
    ),
  },
  {
    // Перевод: 'Сумма продажи'
    title: <div>{t('goodsReceipt.invoiceDetails.columnSumSale')}<br/>{t('goodsReceipt.invoiceDetails.columnPriceSubtext')}</div>,
    key: 'sumSale',
    width: 80,
    render: (_: any, record: ProductItem) => (
      <div className={styles.rightAligned}>
        <div>{(record.newprice * record.amount).toFixed(2)}</div>
      </div>
    ),
  },
  {
    // Перевод: 'Обновление цены на всех точках'
    title: <div>{t('goodsReceipt.invoiceDetails.columnUpdatePriceAllPoints')}</div>,
    dataIndex: 'updateallprodprice',
    key: 'updateallprodprice',
    fixed: 'right',
    width: 100,
    render: (value: boolean, record: ProductItem) => {
      // Переключатель доступен только в режиме "Формирование"
      if (!isForming) {
        // Перевод: 'Да' : 'Нет'
        return <Text>{value ? t('goodsReceipt.invoiceDetails.common.yes') : t('goodsReceipt.invoiceDetails.common.no')}</Text>;
      }

      return (
        <div className={styles.textCenter}>
          <Switch
            checked={!!value} // !!value для безопасной работы с undefined/null
            onChange={(checked) => handleToggleUpdatePrice(record, checked)}
            size="small"
          />
        </div>
      );
    },
  },
   
];  

const actionColumn: ColumnType<ProductItem> = {
  // Перевод: 'Действие'
  title: t('goodsReceipt.invoiceDetails.common.action'),
  key: 'actions',
  fixed: 'right',
  width: 100,
  render: (_: any, record: ProductItem) => (
    <div className={styles.flexCenterGap}>
      <Button
        icon={<EditOutlined />}
        size="small"
        onClick={() => handleEditProduct(record)}
      />
      <Button
        icon={<DeleteOutlined />}
        size="small"
        danger
        onClick={() => handleDeleteProductConfirm(record)}
      />
    </div>
  ),
};

const columns: ColumnsType<ProductItem> = isForming
  ? [...baseColumns, actionColumn]
  : baseColumns;


  const rowSelection = {
    type: 'radio' as const,
    selectedRowKeys: selectedRowKey ? [selectedRowKey] : [],
    onChange: onSelectChange,
    getCheckboxProps: (_: ProductItem) => ({
      disabled: !isForming,
    }),
  };

  return (
    <div className={styles.paddingOverflowX}>
      {/* Перевод: Назад */}
      <Button onClick={() => navigate(-1)} className={styles.section}>
        {t('goodsReceipt.invoiceDetails.common.back')}
      </Button>

      <div className={styles.section}>
        {/* Перевод: Накладная ... от ... */}
        <Text strong>
          {t('goodsReceipt.invoiceDetails.invoiceLabel', { invoicenumber })} {state?.invoicedate ? dayjs(state.invoicedate).format('DD.MM.YYYY') : '—'}
        </Text>
      </div>

      <div className={styles.formItem}>
        {/* Перевод: Прием товара: */}
        <Text>{t('goodsReceipt.invoiceDetails.receiptStockLabel')}: {state?.stockfrom || '—'}</Text>
      </div>
      <div className={styles.section}>
        {/* Перевод: Поставщик: */}
        <Text>{t('goodsReceipt.invoiceDetails.counterpartyLabel')}: {state?.counterparty || '—'}</Text>
      </div>

      {state?.status && (
        <div className={styles.section}>
          {/* Перевод: Статус: */}
          <Text>{t('goodsReceipt.invoiceDetails.common.status')}: {state.status}</Text>
        </div>
      )}

     {isForming ? (
        <div className={styles.fieldGroup}>
          {/* Перевод: Удалить накладную, Импортировать .xlsx, Завершить накладную */}
          <Button danger onClick={() => handleDeleteInvoiceConfirm()}>
            {t('goodsReceipt.invoiceDetails.deleteInvoiceButton')}
          </Button>
          <Button onClick={() => setIsImportModalVisible(true)}>
            {t('goodsReceipt.invoiceDetails.importXLSXButton')}
          </Button>
          <Button type="primary" onClick={() => handleCompleteInvoiceConfirm()}>
            {t('goodsReceipt.invoiceDetails.completeInvoiceButton')}
          </Button>
        </div>
      ) : (
        <Button type="primary" className={styles.section} onClick={() => setUseInvoiceModalVisible(true)}>
          {/* Перевод: Использовать накладную */}
          {t('goodsReceipt.invoiceDetails.useInvoiceButton')}
        </Button>
      )}

      {/* Новый блок выбора товара и кнопок */}
      {isForming && (
        <>
          <div className={styles.userSettingsRow}>
            <ProductBarcodeSearch
              key={searchKey}
              onProductSelect={onProductSelect}
              onClear={onClearSelection}
              useLocalApi={true}
              resetTrigger={invoicenumber ? Number(invoicenumber) : 0}
            />
            {/* Перевод: Добавить новый товар в накладную */}
            <Button onClick={onAddNewProduct}>{t('goodsReceipt.invoiceDetails.addNewProductButton')}</Button>
          </div>

          <div className={styles.section}>
            {/* Перевод: Добавить в накладную */}
            <Button type="primary" disabled={!selectedProduct} onClick={onAddProductToInvoice}>
              {t('goodsReceipt.invoiceDetails.addProductToInvoiceButton')}
            </Button>
          </div>
        </>
      )}

      {/* Таблица */}
      <Table
        loading={loading}
        dataSource={products}
        columns={columns}
        /* rowKey={(record) => record.invoicelist_id} */
        rowKey={(record) => record.invoicelist_id || String(Math.random())}
        pagination={false}
        scroll={{ x: 'max-content' }}
        rowSelection={rowSelection}
        footer={() => (
  <div className={styles.boldText}>
    <div
      className={styles.actionButtonsRow}
    >
      <div className={styles.fixedWidth100}></div>
      {/* Перевод: Количество, Сумма закупки, Сумма продажи */}
      <div className={styles.rightAlignedBox}>{t('goodsReceipt.invoiceDetails.columnAmount')}</div>
      <div className={styles.rightAlignedBox}>{t('goodsReceipt.invoiceDetails.columnSumPurchase')}</div>
      <div className={styles.rightAlignedBox}>{t('goodsReceipt.invoiceDetails.columnSumSale')}</div>
    </div>

    <div
      className={styles.flexEndRow}
    >
      {/* Перевод: ИТОГО: */}
      <div className={styles.autoMarginRight}>{t('goodsReceipt.invoiceDetails.common.total')}:</div>
      <div className={styles.rightAlignedBox}>{totalAmount}</div>
      <div className={styles.rightAlignedBox}>{totalPurchase.toFixed(2)}</div>
      <div className={styles.rightAlignedBox}>{totalSale.toFixed(2)}</div>
    </div>
  </div>
)}

     
      />

      <ProductFormModal
        visible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          setPendingBarcode(null);
        }}
        onSuccess={handleProductCreated}
        onBarcodeGenerated={handleBarcodeGenerated}
      />

     {isEditModalVisible && ( <ProductEditModal
  isVisible={isEditModalVisible}
  onClose={handleEditModalClose}
  details={productDetails}
  attributes={allAttributes}
  invoiceNumber={invoicenumber || ''}
  onSuccess={fetchInvoiceProducts} 
  sendRequest={sendRequest} 
  API_URL={API_URL}
/>)}

      <Modal
  // Перевод: 'Создание новой накладной на основе'
  title={t('goodsReceipt.invoiceDetails.createNewInvoiceTitle')}
  open={useInvoiceModalVisible}
  onCancel={() => setUseInvoiceModalVisible(false)}
  footer={null}
  width={800}
>
  <InvoiceHeaderForm
    onChange={setHeaderData}
    initialStockId={state?.stockfrom || null}
    initialCounterpartyId={state?.counterparty || null}
    initialInvoiceDate={dayjs().format('YYYY-MM-DD')}
  />  

  

  

  <div
    className={styles.flexBetweenRow}
  >
    <div className={styles.flexCenterGap}>
      <div>
        <Switch
          checked={resetAmounts}
          onChange={setResetAmounts}
          className={styles.marginRight8}
        />
        {/* Перевод: Обнулить количество товаров */}
        <span>{t('goodsReceipt.invoiceDetails.resetAmountSwitch')}</span>
      </div>
      <div>
        <Switch
          checked={useLastPrices}
          onChange={setUseLastPrices}
         className={styles.marginRight8}
        />
        {/* Перевод: Выбрать последние цены */}
        <span>{t('goodsReceipt.invoiceDetails.useLastPricesSwitch')}</span>
      </div>
    </div>

    <div className={styles.flexGap8}>
      {/* Перевод: Отменить, Создать */}
      <Button onClick={() => setUseInvoiceModalVisible(false)}>{t('goodsReceipt.invoiceDetails.common.cancel')}</Button>
      <Button
        type="primary"
        loading={creating}
        disabled={!headerData?.stockId || !headerData?.counterpartyId}
        onClick={handleUseInvoiceCreate}
      >
        {t('goodsReceipt.invoiceDetails.common.create')}
      </Button>
    </div>
  </div>
</Modal>

<Modal
        // Перевод: "Импортировать .xlsx файл"
        title={t('goodsReceipt.invoiceDetails.importXLSXModalTitle')}
        open={isImportModalVisible}
        onCancel={() => setIsImportModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setIsImportModalVisible(false)}>
            {/* Перевод: Назад */}
            {t('goodsReceipt.invoiceDetails.common.back')}
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={isImporting}
            onClick={handleImportXLSX}
            disabled={fileList.length === 0}
          >
            {/* Перевод: Импортировать */}
            {t('goodsReceipt.invoiceDetails.common.import')}
          </Button>,
        ]}
      >
        <p>
          {/* Перевод: Скачайте шаблон */}
          <a onClick={handleDownloadTemplate} className={styles.pointerCursor}>
            {t('goodsReceipt.invoiceDetails.downloadTemplateLink')}
          </a>
          {/* Перевод: для заполнения. */}
          {t('goodsReceipt.invoiceDetails.forFillingText')}
        </p>

        {/* 🚀 Используем Upload.Dragger для большой области перетаскивания */}
        <Upload.Dragger {...uploadProps} className={styles.paddingVertical40}>
          <p className="ant-upload-drag-icon">
            {/* Используем иконку загрузки для визуального оформления */}
            <UploadOutlined className={styles.largePrimaryText} />
          </p>
          {/* Перевод: Нажмите или перетащите файл сюда */}
          <p className="ant-upload-text">{t('goodsReceipt.invoiceDetails.uploadDragText')}</p>
          {/* Перевод: Поддерживается только загрузка одного файла формата .xlsx. */}
          <p className="ant-upload-hint">
            {t('goodsReceipt.invoiceDetails.uploadHint')}
          </p>
          {/* Перевод: Добавить .xlsx файл */}
          <Button icon={<UploadOutlined />}>{t('goodsReceipt.invoiceDetails.addXLSXFileButton')}</Button>
        </Upload.Dragger>
      </Modal>

     {/* <BatchAttributeModal
  isVisible={isBatchModalVisible}
  onClose={() => setIsBatchModalVisible(false)}
  onSubmit={handleAddBatchProduct}
  attributes={batchAttributes}
/> */}

    </div>
  );
};

export default InvoiceDetailsPage;