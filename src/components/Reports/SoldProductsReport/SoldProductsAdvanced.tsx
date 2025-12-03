import React, { useState, useEffect } from 'react';
import { Table, Button, Select, Checkbox, message, Row, Col } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next'; // Импортируем useTranslation
import useApiRequest from '../../../hooks/useApiRequest';
import DateRangePickerSafe from '../../DateRangePickerSafe';
import ProductBarcodeSearch from '../../ProductBarcodeSearch';
import { TreeSelect } from 'antd';
import styles from './SoldProductsReport.module.css';
import AttributeField from './AttributeField'; // Предполагаем, что этот компонент существует и внутренне переведен

// Интерфейсы остаются без изменений
interface AdvancedSale {
  consultant: string | null;
  counterparty: string;
  transaction_type: string;
  sell_date: string;
  name: string;
  brand: string;
  category: string;
  stock: number;
  units: number;
  price_discount: number;
  price_discount_bonus: number;
  fullprice: number;
}
interface SprItem {
  id: string;
  value: string;
  deleted?: boolean;
}
interface Attribute {
  id: string;
  category: string | null;
  values: string;
  format: 'TEXT' | 'DATE' | 'SPR';
  sprvalues: SprItem[];
}

const SoldProductsAdvanced: React.FC = () => {
  const { t } = useTranslation(); // Инициализируем хук перевода
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  // Базовые фильтры
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs(), dayjs()]);
  const [barcode, setBarcode] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [points, setPoints] = useState<{ id: string; name: string }[]>([]);
  const [selectedPoint, setSelectedPoint] = useState('0');
  const [brands, setBrands] = useState<{ id: string; brand: string }[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('@');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sprAttrValues, setSprAttrValues] = useState<SprItem[]>([]);

  // Расширенные фильтры
  const [counterparties, setCounterparties] = useState<{ id: string; name: string }[]>([]);
  const [selectedCounterparty, setSelectedCounterparty] = useState('@');
  const [transactionType, setTransactionType] = useState('@');
  const [clientType, setClientType] = useState('@');
  const [sellType, setSellType] = useState('@');
  const [splitAttributes, setSplitAttributes] = useState(false);
  const [includeConsignment, setIncludeConsignment] = useState(false);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null);
  const [attrValue, setAttrValue] = useState<string | Dayjs | null>('@');
  const [data, setData] = useState<AdvancedSale[]>([]);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  useEffect(() => {
    // Загрузка справочников
    sendRequest(`${API_URL}/api/point`, { headers: getHeaders() }).then(res => setPoints(res));
    sendRequest(`${API_URL}/api/brand/search`, { headers: getHeaders() }).then(res => setBrands(res));
    sendRequest(`${API_URL}/api/categories/get_categories`, { headers: getHeaders() }).then(res => setCategories(res));
    sendRequest(`${API_URL}/api/counterparties/search`, { headers: getHeaders() }).then(res => setCounterparties(res));
    sendRequest(`${API_URL}/api/attributes?deleted=false`, { headers: getHeaders() }).then(res => setAttributes(res));
  }, [API_URL, sendRequest]);

  const handleSearch = async () => {
    try {
      const body: Record<string, any> =  {
        code: barcode || '',
        brand: selectedBrand || '@',        
        point: selectedPoint || '0',
        dateFrom: dateRange ? dateRange[0].format('YYYY-MM-DD') : dayjs().format('DD.MM.YYYY'),
        dateTo: dateRange ? dateRange[1].format('YYYY-MM-DD') : dayjs().format('DD.MM.YYYY'),
        counterparty: selectedCounterparty === '@' ? '0' : selectedCounterparty,
        transaction_type: transactionType || '@',
        sell_type: sellType || '@',
        client_type: clientType || '@',
        attribute: selectedAttribute?.id || '@',
        attrval: (() => {
            if (attrValue === '@') return '';
            if (typeof attrValue === 'string') return attrValue;
            if (dayjs.isDayjs(attrValue)) return attrValue.format('DD.MM.YYYY');
            return '';
        })(),
        notattr: splitAttributes ? 1 : 0,
        consignment: includeConsignment ? 1 : 0, // Добавлено поле consignment
      };

      if (selectedCategories.length > 0) {
        body.category = selectedCategories;
      }

     const result = await sendRequest(`${API_URL}/api/report/sales`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      }); 
      
      // Добавляем уникальный ключ
    const resultWithId = result.map((item: AdvancedSale, idx: number) => ({
      ...item,
      id: idx.toString(),
    }));

    setData(resultWithId);
    } catch (err) {
      console.error(err);
      message.error(t('soldProducts.loadError')); // Перевод сообщения об ошибке
    }
  };

  const handleExport = () => {
  // Конвертируем данные в формат с переведенными заголовками
  const exportData = data.map(item => ({
    [t('soldProducts.advancedTable.transactionType')]: t(`soldProducts.operationTypes.${item.transaction_type}`, item.transaction_type), // Перевод
    [t('soldProducts.advancedTable.productName')]: item.name,
    [t('soldProducts.advancedTable.sellDate')]: dayjs(item.sell_date).format("DD.MM.YYYY"),
    [t('soldProducts.advancedTable.consultant')]: item.consultant || "",
    [t('soldProducts.advancedTable.priceDiscount')]: item.price_discount,
    [t('soldProducts.advancedTable.priceDiscountBonus')]: item.price_discount_bonus,
    [t('soldProducts.advancedTable.quantity')]: item.units,
    [t('soldProducts.advancedTable.stock')]: item.stock,
    [t('soldProducts.advancedTable.counterparty')]: item.counterparty,
    [t('soldProducts.advancedTable.brand')]: item.brand,
    [t('soldProducts.advancedTable.category')]: item.category,
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t('soldProducts.sheetNameAdvanced')); // Перевод имени листа

  XLSX.writeFile(wb, "SoldProductsAdvanced.xlsx");
};

  const renderCategoryTree = (categories: any[]) =>
    categories.map(cat => ({
      title: cat.label,
      value: cat.value,
      children: cat.children ? renderCategoryTree(cat.children) : undefined,
    }));

  const columns: ColumnsType<AdvancedSale> = [
    { 
      title: t('soldProducts.advancedTable.transactionType'), 
      dataIndex: 'transaction_type',
      // Опционально: можно добавить рендер для стилизации, как в SoldProductsSimple
      render: (text: string) => {
        const translatedText = t(`soldProducts.operationTypes.${text}`, text);
        return translatedText;
      }
    },
    { title: t('soldProducts.advancedTable.productName'), dataIndex: 'name' },
    { 
      title: t('soldProducts.advancedTable.sellDate'), 
      dataIndex: 'sell_date', 
      render: d => dayjs(d).format('DD.MM.YYYY') 
    },
    { title: t('soldProducts.advancedTable.consultant'), dataIndex: 'consultant' },
    { title: t('soldProducts.advancedTable.priceDiscount'), dataIndex: 'price_discount' },
    { title: t('soldProducts.advancedTable.priceDiscountBonus'), dataIndex: 'price_discount_bonus' },
    { title: t('soldProducts.advancedTable.quantity'), dataIndex: 'units' },
    { title: t('soldProducts.advancedTable.stock'), dataIndex: 'stock' },
    { title: t('soldProducts.advancedTable.counterparty'), dataIndex: 'counterparty' },
    { title: t('soldProducts.advancedTable.brand'), dataIndex: 'brand' },
    { title: t('soldProducts.advancedTable.category'), dataIndex: 'category' },
  ];

  return (
    <div className={styles.container}>
      <Row gutter={[16, 16]}>
    <Col span={12}>
    <div className={styles.filterLabel}>{t('reportchecks.colDate')}</div>
      
      <DateRangePickerSafe
        value={dateRange}
        onChange={(dates) => {
          if (dates && dates[0] && dates[1]) {
            setDateRange([dates[0], dates[1]]);
          }
        }}
      />
    </Col>
    <Col span={12}>
    <div className={styles.filterLabel}>{t('soldProducts.advancedTable.productName')}</div>
          
      <ProductBarcodeSearch
        onProductSelect={(id, code) => {
          setSelectedProduct(id);
          setBarcode(code);
        }}
        onClear={() => {
          setSelectedProduct('');
          setBarcode('');
        }}
        includeAllProduct
      />
    </Col>
    <Col span={12}>
    <div className={styles.filterLabel}>{t('soldProducts.placeholder.point')}</div>
          
      <Select
        placeholder={t('soldProducts.placeholder.point')}
        value={selectedPoint}
        onChange={setSelectedPoint}
        className={styles.fullWidthControl}
      >
        <Select.Option value="0">{t('soldProducts.option.all')}</Select.Option>
        {points.map(p => <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>)}
      </Select>
    </Col>
    <Col span={12}>
    <div className={styles.filterLabel}>{t('soldProducts.placeholder.brand')}</div>
      
      <Select
        placeholder={t('soldProducts.placeholder.brand')}
        value={selectedBrand}
        onChange={setSelectedBrand}
        className={styles.fullWidthControl}
      >
        <Select.Option value="@">{t('soldProducts.option.all')}</Select.Option>
        {brands.map(b => <Select.Option key={b.id} value={b.id}>{b.brand}</Select.Option>)}
      </Select>
    </Col>
    <Col span={12}>
    <div className={styles.filterLabel}>{t('soldProducts.placeholder.categories')}</div>
          
      <TreeSelect
        treeData={renderCategoryTree(categories)}
        value={selectedCategories}
        onChange={setSelectedCategories}
        treeCheckable
        placeholder={t('soldProducts.placeholder.categories')}
        className={styles.fullWidthControl}
      />
    </Col>
    <Col span={12}>
    <div className={styles.filterLabel}>{t('soldProducts.placeholder.counterparty')}</div>
          
      <Select
        placeholder={t('soldProducts.placeholder.counterparty')}
        value={selectedCounterparty}
        onChange={setSelectedCounterparty}
        className={styles.fullWidthControl}
      >
        <Select.Option value="@">{t('soldProducts.option.all')}</Select.Option>
        {counterparties.map(c => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}
      </Select>
    </Col>
    <Col span={12}>
    <div className={styles.filterLabel}>{t('soldProducts.placeholder.transactionType')}</div>
          
      <Select
        placeholder={t('soldProducts.placeholder.transactionType')}
        value={transactionType}
        onChange={setTransactionType}
        className={styles.fullWidthControl}
      >
        <Select.Option value="@">{t('soldProducts.option.all')}</Select.Option>
        <Select.Option value="Продажа">{t('soldProducts.option.sales')}</Select.Option>
        <Select.Option value="Возврат">{t('soldProducts.option.returns')}</Select.Option>
      </Select>
    </Col>
    <Col span={12}>
    <div className={styles.filterLabel}>{t('soldProducts.placeholder.clientType')}</div>
      
      <Select
        placeholder={t('soldProducts.placeholder.clientType')}
        value={clientType}
        onChange={setClientType}
        className={styles.fullWidthControl}
      >
        <Select.Option value="@">{t('soldProducts.option.all')}</Select.Option>
        <Select.Option value="0">{t('soldProducts.option.individual')}</Select.Option>
        <Select.Option value="1">{t('soldProducts.option.legalEntity')}</Select.Option>
        <Select.Option value="2">{t('soldProducts.option.notSpecified')}</Select.Option>
      </Select>
    </Col>
    <Col span={12}>
    <div className={styles.filterLabel}>{t('soldProducts.placeholder.sellType')}</div>
          
      <Select
        placeholder={t('soldProducts.placeholder.sellType')}
        value={sellType}
        onChange={setSellType}
        className={styles.fullWidthControl}
      >
        <Select.Option value="@">{t('soldProducts.option.all')}</Select.Option>
        <Select.Option value="0">{t('soldProducts.option.retail')}</Select.Option>
        <Select.Option value="1">{t('soldProducts.option.wholesale')}</Select.Option>
      </Select>
    </Col>
    <Col span={12}>
      <Checkbox 
        checked={splitAttributes} 
        onChange={e => setSplitAttributes(e.target.checked)}
        // Перевод текста чекбокса
      >
        {t('soldProducts.checkbox.splitAttributes')}
      </Checkbox>
      <Checkbox 
        checked={includeConsignment} 
        onChange={e => setIncludeConsignment(e.target.checked)}
        // Перевод текста чекбокса
      >
        {t('soldProducts.checkbox.includeConsignment')}
      </Checkbox>
    </Col>
    {splitAttributes && (
      <Col span={12}>
        <div className={styles.filterLabel}>{t('soldProducts.placeholder.attribute')}</div>
      
        <Select
          placeholder={t('soldProducts.placeholder.attribute')}
          value={selectedAttribute?.id || "@"}
          onChange={id => {
            const attr = attributes.find(a => a.id === id) || null;
            setSelectedAttribute(attr);
            if (!attr) setAttrValue(null);
            else if (attr.format === "TEXT") setAttrValue("");
            else if (attr.format === "DATE") setAttrValue(null);
            else if (attr.format === "SPR") setAttrValue("@");

            if (attr?.format === "SPR") {
              sendRequest(`${API_URL}/api/attributes/getsprattr?sprid=${attr.id}`, {
                headers: getHeaders(),
              }).then((res: Array<string | { value: string }>) => {
                const sprItems: SprItem[] = res.map((v, i) => ({
                  id: i.toString(),
                  value: typeof v === "string" ? v : v.value?.toString() || `item-${i}`,
                }));
                setSprAttrValues(sprItems);
                setAttrValue("@");
              });
            }
          }}
          className={styles.fullWidthControl}
        >
          <Select.Option value="@">{t('soldProducts.option.all')}</Select.Option>
          {attributes.map(a => (
            <Select.Option key={a.id} value={a.id}>
              {a.values}
            </Select.Option>
          ))}
        </Select>
      </Col>
    )}
    {splitAttributes && selectedAttribute && (
      <Col span={12}>
        {/* AttributeField - предполагается, что он использует переводы */}
        <AttributeField
          attribute={selectedAttribute ? { ...selectedAttribute, sprvalues: sprAttrValues } : null}
          value={attrValue}
          onChange={setAttrValue}
        />
      </Col>
    )}
    <Col span={12}>
      <Button type="primary" onClick={handleSearch} className={styles.fullWidthControl}>
        {t('soldProducts.button.search')}
      </Button>
    </Col>
    <Col span={12}>
      <Button onClick={handleExport} className={styles.fullWidthControl}>
        {t('soldProducts.button.export')}
      </Button>
    </Col>
  </Row>
      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        scroll={{ x: 'max-content' }} 
        pagination={{ pageSize: 20 }}
        summary={() => {
    const totalPrice = data.reduce((sum, item) => sum + Number(item.price_discount), 0);
    const totalPriceBonus = data.reduce((sum, item) => sum + Number(item.price_discount_bonus), 0);
    const totalUnits = data.reduce((sum, item) => sum + Number(item.units), 0);
    // Остаток (stock) в итогах обычно не суммируется, но оставлю для соответствия логике
    const totalStock = data.reduce((sum, item) => sum + Number(item.stock), 0); 
    
    // Использование colSpan для объединения ячеек, чтобы избежать пробельных узлов и ошибок
    return (
      <Table.Summary.Row>
        {/* Объединяем ячейки 0-3 (Вид операции, Наименование, Дата, Консультант) */}
        <Table.Summary.Cell index={0} colSpan={4}> 
          <div className={styles.summaryBoldText}>{t('soldProducts.summary.total')}</div>
        </Table.Summary.Cell>
        {/* Итоговая сумма со скидкой */}
        <Table.Summary.Cell index={4}>
          <div className={styles.summaryBoldText}>{totalPrice.toFixed(2)}</div>
        </Table.Summary.Cell>
        {/* Итоговая сумма со скидкой (за минусом бонусов) */}
        <Table.Summary.Cell index={5}>
          <div className={styles.summaryBoldText}>{totalPriceBonus.toFixed(2)}</div>
        </Table.Summary.Cell>
        {/* Количество */}
        <Table.Summary.Cell index={6}>
          <div className={styles.summaryBoldText}>{totalUnits}</div>
        </Table.Summary.Cell>
        {/* Текущий остаток */}
        <Table.Summary.Cell index={7}>
          <div className={styles.summaryBoldText}>{totalStock}</div>
        </Table.Summary.Cell>
        {/* Оставшиеся ячейки - пустые */}
        <Table.Summary.Cell index={8} /> 
        <Table.Summary.Cell index={9} />
        <Table.Summary.Cell index={10} />
      </Table.Summary.Row>
    );
  }}
        className={styles.tableMarginTop}
      />
    </div>
  );
};

export default SoldProductsAdvanced;