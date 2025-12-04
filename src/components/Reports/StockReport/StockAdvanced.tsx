import React, { useState, useEffect } from 'react';
import { Table, Button, Select, Checkbox, message, Row, Col,DatePicker } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next'; // Импортируем useTranslation
import useApiRequest from '../../../hooks/useApiRequest';
import DateRangePickerSafe from '../../DateRangePickerSafe';
import ProductBarcodeSearch from '../../ProductBarcodeSearch';
import { TreeSelect } from 'antd';
import styles from './StockReport.module.css';
import AttributeField from '../SoldProductsReport/AttributeField'; // Предполагаем, что этот компонент существует и внутренне переведен


// --- 1. Интерфейс для отдельной записи о товаре (StockItem) ---
interface StockItem {
  // Колонки таблицы
  pointname: string; // Склад (pointname)
  productname: string; // Наименование товара (productname)
  code: string; // Штрих код (code)
  cost: string; // Общая себестоимость (cost)
  pricezak: number; // Цена закупа (pricezak)
  price: number; // Цена продажи (price) - используется для 'Остаток в ценах реализации'
  units: number; // Количество (units)
  brand: string; // Бренд (brand)
  category: string; // Категория (category)
  nds: string; // НДС (nds)
  piece: boolean; // Продажа поштучно (piece)
  pieceinpack: number; // Штук в упаковке (pieceinpack)
  pieceprice: number; // Цена за штуку (pieceprice)
  // В JSON нет явной 'Единица измерения', но предположим, что она должна быть. 
  // Используем unitsprid или добавляем поле 'unit' из другого места. 
  // Здесь предполагаем, что она есть в объекте (unitsprid или unit)
  unitsprid: string; // Единица измерения (unitsprid, ID) - возможно, нужно маппировать на имя

  // Другие поля из JSON, которые не являются колонками
  company: string;
  point: string;
  product: string;
  consunits: string;
  consprice: number;
  conspurchase: number;
  id: string;
  pointType: number;
  productid: string;
}

// --- 2. Интерфейс для полного ответа API ---
interface StockReportResponse {
  totalCount: number;
  totalcost: number;
  totalprice: number | null;
  totalunits: number;
  data: StockItem[]; // Массив товаров для текущей страницы
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

interface Point {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  brand: string;
}

interface CategoryTreeData {
  title: string;
  value: string;
  children?: CategoryTreeData[];
}

//  ТИП ДЛЯ ФИЛЬТРА НДС
type NdsFilterValue = '@' | '0' | '1';

const StockAdvanced: React.FC = () => {
  const { t } = useTranslation();
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
  const [data, setData] = useState<StockItem[]>([]);
  const [counterparties, setCounterparties] = useState<{ id: string; name: string }[]>([]);
  const [selectedCounterparty, setSelectedCounterparty] = useState('0');
  const [stocks, setStocks] = useState<any[]>([]);
  const [selectedStockTo, setSelectedStockTo] = useState("0");

  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null);
  const [attrValue, setAttrValue] = useState<string | Dayjs | null>('');
  const [splitAttributes, setSplitAttributes] = useState(false); 
  const [sprAttrValues, setSprAttrValues] = useState<SprItem[]>([]);

  const [unitsSpr, setUnitsSpr] = useState<{ id: string; name: string }[]>([]);
  
  const [totalcost, setTotalcost] = useState('');
  const [totalprice, setTotalprice] = useState('');
  const [totalunits, setTotalunits] = useState('');

  const [totalItems, setTotalItems] = useState(0);

  const [pagination, setPagination] = useState({
  pageNumber: 1,
  itemsPerPage: 20, // Используем 20, так как вы задали pageSize: 20 в таблице
});
  
  //  НОВОЕ СОСТОЯНИЕ НДС: 'all' = Все, '0' = Без НДС, '1' = С НДС
  const [selectedNds, setSelectedNds] = useState<NdsFilterValue>('@');

  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [includeConsignment, setIncludeConsignment] = useState(false);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  // --------------------------
  // ЗАГРУЗКА ДАННЫХ ДЛЯ ФИЛЬТРОВ
  // --------------------------
  useEffect(() => {
    sendRequest(`${API_URL}/api/point`, { headers: getHeaders() }).then((res: Point[]) => setPoints(res));
    sendRequest(`${API_URL}/api/brand/search`, { headers: getHeaders() }).then((res: Brand[]) => setBrands(res));
    sendRequest(`${API_URL}/api/categories/get_categories`, { headers: getHeaders() }).then(res => setCategories(res));
    sendRequest(`${API_URL}/api/counterparties/search`, { headers: getHeaders() }).then(res => setCounterparties(res));
    sendRequest(`${API_URL}/api/stock`, { headers: getHeaders() }).then(res => setStocks(res));
    sendRequest(`${API_URL}/api/attributes?deleted=false`, { headers: getHeaders() }).then(res => setAttributes(res));
    sendRequest(`${API_URL}/api/products/unitspr`, { headers: getHeaders() }).then(res => setUnitsSpr(res));
 
  
  }, [API_URL, sendRequest]);

  //  ШАГ 1: Создаем мемоизированную карту для быстрого поиска
const unitMap = React.useMemo(() => {
    return unitsSpr.reduce((map, unit) => {
        map[unit.id] = unit.name;
        return map;
    }, {} as Record<string, string>);
}, [unitsSpr]); // Пересоздается только при изменении списка единиц измерения

  // --------------------------
  // ПОИСК ДАННЫХ
  // --------------------------
  const handleSearch = async (page = pagination.pageNumber, 
  limit = pagination.itemsPerPage) => {
    try {
      const body: Record<string, any> = {
        barcode: barcode || '',
        brand: selectedBrand || '@',
        counterparty: selectedCounterparty || '0',
        stockID: selectedStockTo || '0',
        nds: selectedNds || '@',
        flag: true,
        consignment: includeConsignment,
        del:includeDeleted,
        pageNumber:page,
        itemsPerPage:limit,

      };

      if (selectedDate) {
          body.date = selectedDate.format('YYYY-MM-DD');
      }

      if (splitAttributes) {

        body.notattr = 1;
        body.attribute=selectedAttribute|| '@';
        body.attrval=attrValue|| '';

      } else {

        body.notattr = 0;
        body.attrval='';

      }


     

      if (selectedCategories.length > 0) {
        //body.category = selectedCategories;
        //  ГЛАВНОЕ ИЗМЕНЕНИЕ: Раскрываем выбранные категории
        const categoriesToSend = getExpandedCategories(selectedCategories, categories);
        body.category = categoriesToSend;
      }

      const result = await sendRequest(`${API_URL}/api/report/stockbalance`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });

      
     let response;

try {
    response = typeof result === "string" ? JSON.parse(result) : result;
} catch (e) {
    console.error("JSON parse error:", e);
    return;
}

const total = Math.ceil(Number(response.totalCount ?? 0));
//console.log(total);
setTotalItems(total*limit);

setTotalcost(response.totalcost);
setTotalprice(response.totalprice);
setTotalunits(response.totalunits);
      
      // Используем данные из поля 'data'
      const resultWithId = (response.data || []).map((item: StockItem, idx: number) => ({
        ...item,
        // Используем комбинацию productid и index для уникальности
        id: `${item.productid}-${idx}`, 
      }));

     

      setData(resultWithId);
      
      // Обновляем текущую пагинацию, если поиск был по фильтру (сброс на 1 страницу)
      if (page !== pagination.pageNumber) {
         setPagination(prev => ({ ...prev, pageNumber: page }));
      }
    } catch (err) {
      console.error(err);
      message.error(t('stockReport.loadError'));
    }
  };

  const resetAndSearch = () => {
    const defaultPage = 1;
    const defaultLimit = pagination.itemsPerPage; // Лимит можно оставить текущий или тоже сбросить

    // 1. Сбрасываем состояние пагинации на 1-ю страницу
    setPagination(prev => ({ 
        ...prev, 
        pageNumber: defaultPage 
    }));
    
    // 2. Вызываем handleSearch с параметрами 1-й страницы
    handleSearch(defaultPage, defaultLimit);
};


  // 💡 Функция для обработки изменений пагинации
const handleTableChange = (newPagination: any) => {
    // Обновляем состояние пагинации
    const newPageNumber = newPagination.current || 1;
    const newItemsPerPage = newPagination.pageSize || 20;

    // Сначала обновляем состояние
    setPagination({
      pageNumber: newPageNumber,
      itemsPerPage: newItemsPerPage,
    });
    
    // Затем выполняем новый поиск с новыми параметрами
    // Передаем новые значения явно, так как setPagination асинхронен
    handleSearch(newPageNumber, newItemsPerPage); 
};

  // --------------------------
  // КОЛОНКИ ТАБЛИЦЫ
  // --------------------------
  const columns = (): ColumnsType<StockItem> => {
    return [
       { title: t('stockReport.table.number'), render: (_, __, index) => index + 1 },
      { 
      title: t('stockReport.table.pointname') || 'Склад', 
      dataIndex: 'pointname', 
      //fixed: 'left', // Закрепляем первую колонку
      width: 150 
    },
    { 
      title: t('stockReport.table.productname') || 'Наименование товара', 
      dataIndex: 'productname', 
      width: 300 
    },
    { 
      title: t('stockReport.table.code') || 'Штрих код', 
      dataIndex: 'code', 
      width: 150 
    },
    
    // --- Денежные колонки ---
    { 
      title: t('stockReport.table.cost') ||'Общая себестоимость', 
      dataIndex: 'cost', 
      align: 'right',
      render: (value: number) => Number(value).toFixed(2),
      
    },
    { 
      title: t('stockReport.table.purchaseprice') ||'Цена закупа', 
      dataIndex: 'pricezak', 
      align: 'right',
      render: (value: number) => Number(value).toFixed(2),
     
    },
    { 
      title: t('stockReport.table.price1') ||'Остаток в ценах реализации', 
      dataIndex: 'price',
      align: 'right',
      render: (value: number) => Number(value).toFixed(2),
    },
    { 
      title: t('stockReport.table.markup') ||'Наценка', 
      key: 'markup', 
      align: 'right',
      render: (_, record) => {
        const salePrice = record.price;
        const purchasePrice = Number(record.cost);
        if (purchasePrice > 0) {
          return `${(((salePrice -purchasePrice)/ purchasePrice ) * 100).toFixed(2)}%`;
        }
        return 'N/A';
      }
    }, 
    
    // --- Количественные и атрибутные колонки ---
    { 
      title: t('stockReport.table.units') ||'Количество', 
      dataIndex: 'units', 
      align: 'right',
      render: (value: number) => Number(value).toFixed(0),
      
    },
    { 
      title: t('stockReport.table.brand') ||'Бренд', 
      dataIndex: 'brand' 
    },
    { 
      title: t('stockReport.table.category') ||'Категория', 
      dataIndex: 'category' 
    },
    { 
      title: t('stockReport.table.nds') ||'НДС', 
      dataIndex: 'nds' 
    },
    
    // --- Поштучная информация ---
    { 
      title: t('stockReport.table.piece') ||'Продажа поштучно', 
      dataIndex: 'piece',
      render: (piece: boolean) => piece ? t('stockReport.table.yes') ||'Да' : t('stockReport.table.no') ||'Нет'
    },
    { 
      title: t('stockReport.table.pieceinpack') ||'Штук в упаковке', 
      dataIndex: 'pieceinpack' 
    },
    { 
      title: t('stockReport.table.pieceprice') ||'Цена за штуку', 
      dataIndex: 'pieceprice',
      align: 'right',
      render: (price: number) => price.toFixed(2)
    },
    { 
      title: t('stockReport.table.unitsprid') ||'Единица измерения', 
      dataIndex: 'unitsprid' // Используем ID, так как название отсутствует в JSON
      ,render: (unitsprid: string) => {
        // Ищем название в созданной карте по ID
        const unitName = unitMap[unitsprid];
        
        // Если нашли, возвращаем название; иначе возвращаем ID или пустую строку
        return unitName || unitsprid || '—';
    }
    },
  ];

  }

  // --------------------------
  // ЭКСПОРТ В EXCEL
  // --------------------------


  // Преобразование колонки title -> string
const normalizeTitle = (title: any): string => {
  if (!title) return "";
  if (typeof title === "string") return title;
  if (typeof title === "number") return title.toString();
  return String(title?.props?.children || title);
};

const convertRowToExcel = (row: StockItem, index: number) => {
  const currentColumns = columns();
  const mapped: Record<string, any> = {};

  currentColumns.forEach((col: any) => {
    const title = normalizeTitle(col.title);
    if (!title) return;

    let value: any = null;

    // 1) Если есть dataIndex → берем значение из строки
    if (col.dataIndex) {
      value = row[col.dataIndex];
    }

    // 2) Если колонка с render → вызываем render(value, row, index)
    if (col.render) {
      value = col.render(row[col.dataIndex], row, index);
    }

    // 3) Номер строки (первая колонка)
    if (!col.dataIndex && !col.render && title.includes("№")) {
      value = index + 1;
    }

    mapped[title] = value;
  });

  return mapped;
};

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(
      data.map((row, i) => convertRowToExcel(row, i))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('stockReport.sheetName'));
    XLSX.writeFile(wb, "StockReportAdvansed.xlsx");
  };

  // --------------------------
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ КАТЕГОРИЙ
  // --------------------------

  // Рекурсивно собирает все ID потомков, включая самого себя
  const collectAllDescendantValues = (nodes: CategoryTreeData[]): string[] => {
    let values: string[] = [];
    nodes.forEach(node => {
        values.push(node.value);
        if (node.children) {
            values = values.concat(collectAllDescendantValues(node.children as CategoryTreeData[]));
        }
    });
    return values;
  };

  // Преобразует канонический список выбранных ID в полный список для API
  const getExpandedCategories = (selectedValues: string[], treeData: any[]): string[] => {
      let finalCategories: string[] = [];
      const idToNodeMap = new Map<string, any>();
      
      // 1. Создаем карту ID -> Node для быстрого поиска
      const buildMap = (nodes: any[]) => {
          nodes.forEach(node => {
              idToNodeMap.set(node.value, node);
              if (node.children) buildMap(node.children);
          });
      };
      buildMap(treeData);

      // 2. Итерируем по каноническому списку и раскрываем родителей
      selectedValues.forEach(id => {
          const node = idToNodeMap.get(id);
          if (node) {
              // Добавляем текущий узел (он уже в selectedValues)
              finalCategories.push(id);
              
              // Если это родитель, добавляем все его потомки
              if (node.children) {
                  finalCategories = finalCategories.concat(collectAllDescendantValues(node.children as CategoryTreeData[]));
              }
          }
      });

      // 3. Возвращаем только уникальные значения
      return Array.from(new Set(finalCategories));
  };

  // --------------------------
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // --------------------------
  const renderCategoryTree = (categories: any[]): CategoryTreeData[] =>
    categories.map(cat => ({
      title: cat.label,
      value: cat.value,
      children: cat.children ? renderCategoryTree(cat.children) : undefined,
    }));

  

  // --------------------------
  // РЕНДЕР КОМПОНЕНТА
  // --------------------------
  return (
    <div className={styles.container}>
      <Row gutter={[16, 16]} align="bottom">

        <Col xs={24} sm={12}>
        <div className={styles.filterLabel}>{t('stockReport.advancedTable.sellDate')}</div>
        <DatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            className={styles.fullWidthControl}
            placeholder={t('stockReport.placeholder.selectDate')}
            format="DD.MM.YYYY"
        />
    </Col>
        <Col xs={24} sm={12}>
          <div className={styles.filterLabel}>{t('stockReport.advancedTable.productName')}</div>

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
          <div className={styles.filterLabel}>{t('stockReport.placeholder.counterparty')}</div>

          <Select
            placeholder={t('stockReport.placeholder.counterparty')}
            value={selectedCounterparty}
            onChange={setSelectedCounterparty}
            className={styles.fullWidthControl}
          >
            <Select.Option value="0">{t('stockReport.option.all')}</Select.Option>
            {counterparties.map(c => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}
          </Select>
        </Col>

        <Col span={12}>
          <div className={styles.filterLabel}>{t('stockReport.placeholder.stock')}</div>
          <Select
            className={styles.fullWidthControl}
            value={selectedStockTo}
            onChange={setSelectedStockTo}
          >
            <Select.Option value="0">{t('stockReport.option.all')}</Select.Option>
            {stocks.map(s => (
              <Select.Option key={s.id} value={s.id}>
                {s.name}
              </Select.Option>
            ))}
          </Select>
        </Col>

        <Col xs={24} sm={12}>
          <div className={styles.filterLabel}>{t('stockReport.placeholder.brand')}</div>
          <Select
            placeholder={t('stockReport.placeholder.brand')}
            value={selectedBrand}
            onChange={setSelectedBrand}
            className={styles.fullWidthControl}
          >
            <Select.Option value="@">{t('stockReport.option.all')}</Select.Option>
            {brands.map(b => (
              <Select.Option key={b.id} value={b.id}>{b.brand}</Select.Option>
            ))}
          </Select>
        </Col>

        <Col xs={24} sm={12}>
          <div className={styles.filterLabel}>{t('stockReport.placeholder.categories')}</div>

          <TreeSelect
            treeData={renderCategoryTree(categories)}
            value={selectedCategories}
            onChange={setSelectedCategories}
            treeCheckable
            placeholder={t('stockReport.placeholder.categories')}
            className={styles.fullWidthControl}

            showCheckedStrategy={TreeSelect.SHOW_PARENT}
          />
        </Col>

       
    {splitAttributes && (
      <Col span={12}>
        <div className={styles.filterLabel}>{t('stockReport.placeholder.attribute')}</div>
      
        <Select
          placeholder={t('stockReport.placeholder.attribute')}
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
          <Select.Option value="@">{t('stockReport.option.all')}</Select.Option>
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

    <Col xs={24} sm={12}>
            <div className={styles.filterLabel}>{t('stockReport.table.nds')}</div>
            <Select
                placeholder={t('stockReport.table.nds')}
                value={selectedNds}
                onChange={setSelectedNds as (value: string) => void} // Приведение типа для onChange Select
                className={styles.fullWidthControl}
            >
                <Select.Option value="@">{t('stockReport.option.all')}</Select.Option>
                <Select.Option value="0">{t('stockReport.option.withoutNds') || 'Без НДС'}</Select.Option>
                <Select.Option value="1">{t('stockReport.option.withNds') || 'С НДС'}</Select.Option>
            </Select>
        </Col>

     <Col span={12}>
      <Checkbox 
        checked={splitAttributes} 
        onChange={e => setSplitAttributes(e.target.checked)}
        // Перевод текста чекбокса
      >
        {t('stockReport.checkbox.splitAttributes')}
      </Checkbox>
      
    </Col>

    <Col xs={24} sm={12}>
            <div className={styles.filterLabel}></div> {/* Пустой лейбл для выравнивания */}
            <Checkbox
                checked={includeDeleted}
                onChange={e => setIncludeDeleted(e.target.checked)}
                className={styles.fullWidthControl}
            >
                {t('stockReport.checkbox.includeDeleted') || 'Включить удалённые товары'}
            </Checkbox>
        </Col>

        <Col xs={24} sm={12}>
            <div className={styles.filterLabel}></div>
            <Checkbox
                checked={includeConsignment}
                onChange={e => setIncludeConsignment(e.target.checked)}
                className={styles.fullWidthControl}
            >
                {t('stockReport.checkbox.includeConsignment') || 'Включая товары, находящиеся на консигнации'}
            </Checkbox>
        </Col>

        <Col xs={24} sm={12}>
          <Button type="primary" 
          //onClick={handleSearch} 
          onClick={resetAndSearch}
          className={styles.fullWidthControl}>
            {t('stockReport.button.search')}
          </Button>
        </Col>

        <Col xs={24} sm={12}>
          <Button onClick={handleExport} className={styles.fullWidthControl}>
            {t('stockReport.button.export')}
          </Button>
        </Col>
      </Row>
      <Table
        dataSource={data}
        columns={columns()}
        rowKey="id"
        scroll={{ x: 'max-content' }}
        //pagination={{ pageSize: 20 }}
        pagination={{ 
    current: pagination.pageNumber,
    pageSize: pagination.itemsPerPage,
    pageSizeOptions: ['10', '20', '50', '100'], // Опции для выбора размера страницы
    total: totalItems, 
    showSizeChanger: true,
  }}
  
  
  onChange={(newPagination, __, ___) => {
    handleTableChange(newPagination);
  }}

    summary={() => (
    <Table.Summary.Row>
      {/* № */}
      <Table.Summary.Cell index={0}>{t('stockReport.summary.total')}</Table.Summary.Cell>

      {/* Склад */}
      <Table.Summary.Cell index={1}></Table.Summary.Cell>

      {/* Наименование */}
      <Table.Summary.Cell index={2}></Table.Summary.Cell>

      {/* Штрих-код */}
      <Table.Summary.Cell index={3}></Table.Summary.Cell>

      {/* Общая себестоимость */}
      <Table.Summary.Cell index={4} align="right">
        {Number(totalcost).toFixed(2)}
      </Table.Summary.Cell>

      {/* Цена закупа — итогов у вас нет, поэтому пусто */}
      <Table.Summary.Cell index={5}></Table.Summary.Cell>

      {/* Остаток в ценах реализации */}
      <Table.Summary.Cell index={6} align="right">
        {Number(totalprice).toFixed(2)}
      </Table.Summary.Cell>

      {/* Наценка */}
      <Table.Summary.Cell index={7}></Table.Summary.Cell>

      {/* Количество */}
      <Table.Summary.Cell index={8} align="right">
        {Number(totalunits).toFixed(0)}
      </Table.Summary.Cell>

      {/* Остальные колонки пустые */}
      <Table.Summary.Cell index={9}></Table.Summary.Cell>
      <Table.Summary.Cell index={10}></Table.Summary.Cell>
      <Table.Summary.Cell index={11}></Table.Summary.Cell>
      <Table.Summary.Cell index={12}></Table.Summary.Cell>
      <Table.Summary.Cell index={13}></Table.Summary.Cell>
      <Table.Summary.Cell index={14}></Table.Summary.Cell>
      <Table.Summary.Cell index={15}></Table.Summary.Cell>
    </Table.Summary.Row>
  )}

      className={styles.tableMarginTop}
      />
    </div>
  );
};

export default StockAdvanced;