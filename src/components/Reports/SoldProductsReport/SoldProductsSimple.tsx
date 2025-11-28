import React, { useState, useEffect } from 'react';
import { Table, Button, message, Select, TreeSelect, Row, Col } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next'; // Импортируем useTranslation
import useApiRequest from '../../../hooks/useApiRequest';
import DateRangePickerSafe from '../../DateRangePickerSafe';
import ProductBarcodeSearch from '../../ProductBarcodeSearch';
import styles from './SoldProductsReport.module.css';

// Интерфейсы остаются без изменений
interface ProductSale {
  reason: string;
  product: string;
  price: number;
  units: string;
  point_name: string;
  product_name: string;
  brand: string;
  category_name: string;
}

interface Point {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  brand: string;
}

// Типизация для TreeSelect
interface CategoryTreeData {
  title: string;
  value: string;
  children?: CategoryTreeData[];
}

const SoldProductsSimple: React.FC = () => {
  const { t } = useTranslation(); // Инициализируем хук перевода
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs(), dayjs()]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [barcode, setBarcode] = useState('');
  const [points, setPoints] = useState<Point[]>([]);
  const [selectedPoint, setSelectedPoint] = useState('0');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('@');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [data, setData] = useState<ProductSale[]>([]);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  useEffect(() => {
    // Загрузка точек
    sendRequest(`${API_URL}/api/point`, { headers: getHeaders() }).then((res: Point[]) => setPoints(res));
    // Загрузка брендов
    sendRequest(`${API_URL}/api/brand/search`, { headers: getHeaders() }).then((res: Brand[]) => setBrands(res));
    // Загрузка категорий
    sendRequest(`${API_URL}/api/categories/get_categories`, { headers: getHeaders() }).then(res => setCategories(res));
  }, [API_URL, sendRequest]);

  const handleSearch = async () => {
    try {
      const body: Record<string, any> =  {
        barcode: barcode || '',
        brand: selectedBrand || '@',
        pointID: selectedPoint || '0',
        dateFrom: dateRange ? dateRange[0].format('DD.MM.YYYY') : dayjs().format('DD.MM.YYYY'),
        dateTo: dateRange ? dateRange[1].format('DD.MM.YYYY') : dayjs().format('DD.MM.YYYY'),
      };

      if (selectedCategories.length > 0) {
        body.category = selectedCategories;
      }

       const result = await sendRequest(`${API_URL}/api/report/sales/simple`, {
        method: 'POST',  
        headers: getHeaders() ,
        body: JSON.stringify(body),
      }); 
    
      // Добавляем уникальный ключ
    const resultWithId = result.map((item: ProductSale, idx: number) => ({
      ...item,
      id: idx.toString(), // уникальный ключ
    }));

    setData(resultWithId);
    } catch (err) {
      console.error(err);
      message.error(t('soldProducts.loadError')); // Используем перевод для сообщения об ошибке
    }
  };

  const columns: ColumnsType<ProductSale> = [
    { title: t('soldProducts.table.number'), render: (_, __, index) => index + 1 }, // Перевод заголовка
    {
    title: t('soldProducts.table.operationType'), // Перевод заголовка
    dataIndex: 'reason',
    render: (text: string) => {
      // Переводим текст внутри ячейки для отображения, но стили оставляем прежними
      const translatedText = t(`soldProducts.operationTypes.${text}`, text);

      if (text === 'Продажа') {
        return (
          <span className={styles.saleTag}>
            {translatedText}
          </span>
        );
      } else if (text === 'Возврат') {
        return (
          <span className={styles.returnTag}>
            {translatedText}
          </span>
        );
      }
      return translatedText;
    }
  },
    { title: t('soldProducts.table.warehouse'), dataIndex: 'point_name' }, // Перевод заголовка
    { title: t('soldProducts.table.productName'), dataIndex: 'product_name' }, // Перевод заголовка
    { title: t('soldProducts.table.amount'), dataIndex: 'price' }, // Перевод заголовка
    { title: t('soldProducts.table.quantity'), dataIndex: 'units' }, // Перевод заголовка
    { title: t('soldProducts.table.brand'), dataIndex: 'brand' }, // Перевод заголовка
    { title: t('soldProducts.table.category'), dataIndex: 'category_name' }, // Перевод заголовка
  ];

  const handleExport = () => {
  // Конвертируем данные в формат с переведенными заголовками
  const exportData = data.map(item => ({
    [t('soldProducts.table.operationType')]: t(`soldProducts.operationTypes.${item.reason}`, item.reason), // Перевод значения
    [t('soldProducts.table.warehouse')]: item.point_name,
    [t('soldProducts.table.productName')]: item.product_name,
    [t('soldProducts.table.amount')]: item.price,
    [t('soldProducts.table.quantity')]: item.units,
    [t('soldProducts.table.brand')]: item.brand,
    [t('soldProducts.table.category')]: item.category_name,
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t('soldProducts.sheetName')); // Перевод имени листа

  XLSX.writeFile(wb, "SoldProductsSimple.xlsx");
};

  // Функция для рендеринга дерева категорий
  const renderCategoryTree = (categories: any[]): CategoryTreeData[] =>
    categories.map(cat => ({
      // Предполагаем, что title и value приходят с сервера и не нуждаются в переводе, 
      // если это имена категорий, которые должны быть одинаковыми в любом языке
      title: cat.label,
      value: cat.value,
      children: cat.children ? renderCategoryTree(cat.children) : undefined,
    }));

  return (
    <div className={styles.container}>
      <Row gutter={[16, 16]}>
    <Col xs={24} sm={12}>
      {/* DateRangePickerSafe - оставляем как есть, предполагая, что он сам переводит даты */}
      <DateRangePickerSafe
        value={dateRange}
        onChange={(dates) => {
          if (dates && dates[0] && dates[1]) {
            setDateRange([dates[0], dates[1]]);
          }
        }}
      />
    </Col>

    <Col xs={24} sm={12}>
      {/* ProductBarcodeSearch - оставляем как есть, предполагая, что он внутренне переведен или не содержит видимого текста */}
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

    <Col xs={24} sm={12}>
      <Select
        placeholder={t('soldProducts.placeholder.point')} // Перевод плейсхолдера
        value={selectedPoint}
        onChange={setSelectedPoint}
        className={styles.fullWidthControl}
      >
        <Select.Option value="0">{t('soldProducts.option.all')}</Select.Option> {/* Перевод "Все" */}
        {points.map(p => (
          <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
        ))}
      </Select>
    </Col>

    <Col xs={24} sm={12}>
      <Select
        placeholder={t('soldProducts.placeholder.brand')} // Перевод плейсхолдера
        value={selectedBrand}
        onChange={setSelectedBrand}
        className={styles.fullWidthControl}
      >
        <Select.Option value="@">{t('soldProducts.option.all')}</Select.Option> {/* Перевод "Все" */}
        {brands.map(b => (
          <Select.Option key={b.id} value={b.id}>{b.brand}</Select.Option>
        ))}
      </Select>
    </Col>

    <Col xs={24} sm={12}>
      <TreeSelect
        treeData={renderCategoryTree(categories)}
        value={selectedCategories}
        onChange={setSelectedCategories}
        treeCheckable
        placeholder={t('soldProducts.placeholder.categories')} // Перевод плейсхолдера
        className={styles.fullWidthControl}
      />
    </Col>

    <Col xs={24} sm={12}>
      <Button type="primary" onClick={handleSearch} className={styles.fullWidthControl}>
        {t('soldProducts.button.search')} {/* Перевод текста кнопки */}
      </Button>
    </Col>

    <Col xs={24} sm={12}>
      <Button onClick={handleExport} className={styles.fullWidthControl}>
        {t('soldProducts.button.export')} {/* Перевод текста кнопки */}
      </Button>
    </Col>
  </Row>
      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        scroll={{ x: 'max-content' }} 
        pagination={{ pageSize: 20 }}
        summary={pageData => {
    const totalPrice = pageData.reduce((sum, item) => sum + Number(item.price), 0);
    const totalUnits = pageData.reduce((sum, item) => sum + Number(item.units), 0);
    return (
      <Table.Summary.Row>
        <Table.Summary.Cell index={0}>
          <div className={styles.summaryBoldText}>{t('soldProducts.summary.total')}</div>
          </Table.Summary.Cell>
        <Table.Summary.Cell index={1}></Table.Summary.Cell>
        <Table.Summary.Cell index={2}></Table.Summary.Cell>
        <Table.Summary.Cell index={3}></Table.Summary.Cell>
        <Table.Summary.Cell index={4}>
          <div className={styles.summaryBoldText}>{totalPrice.toFixed(2)}</div>
          </Table.Summary.Cell>
        <Table.Summary.Cell index={5}>
          <div className={styles.summaryBoldText}>{totalUnits}</div>
          </Table.Summary.Cell>
        <Table.Summary.Cell index={6}></Table.Summary.Cell>
        <Table.Summary.Cell index={7}></Table.Summary.Cell>
      </Table.Summary.Row>
    );
  }}
        className={styles.tableMarginTop}
      />
    </div>
  );
};

export default SoldProductsSimple;