import React, { useState, useEffect } from 'react';
import { Table, Button, message, Select, TreeSelect, Row, Col } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../../hooks/useApiRequest';
import ProductBarcodeSearch from '../../ProductBarcodeSearch';
import styles from './StockReport.module.css';

// --------------------------
// ИНТЕРФЕЙСЫ
// --------------------------

interface Stock {
  units: string;
  category_id: string;
  code: string;
  productname: string;
  category: string;
  brand: string;
  pieceprice: number;
  purchaseprice: string;
  price: number;
  pointname: string;
  nds: string;
  counterparty: string;
  wholesale_price: number;
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

const StockSimple: React.FC = () => {
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
  const [data, setData] = useState<Stock[]>([]);
  const [counterparties, setCounterparties] = useState<{ id: string; name: string }[]>([]);
  const [selectedCounterparty, setSelectedCounterparty] = useState('0');
  const [stocks, setStocks] = useState<any[]>([]);
  const [selectedStockTo, setSelectedStockTo] = useState("0");

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
  }, [API_URL, sendRequest]);

  // --------------------------
  // ПОИСК ДАННЫХ
  // --------------------------
  const handleSearch = async () => {
    try {
      const body: Record<string, any> = {
        barcode: barcode || '',
        brand: selectedBrand || '@',
        counterparty: selectedCounterparty || '0',
        stockID: selectedStockTo || '0'
      };

      if (selectedCategories.length > 0) {
        //body.category = selectedCategories;
        //  ГЛАВНОЕ ИЗМЕНЕНИЕ: Раскрываем выбранные категории
        const categoriesToSend = getExpandedCategories(selectedCategories, categories);
        body.category = categoriesToSend;
      }

      const result = await sendRequest(`${API_URL}/api/report/stockbalance/simple`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });

      // Добавляем уникальный ключ
      const resultWithId = result.map((item: Stock, idx: number) => ({
        ...item,
        id: idx.toString(), // уникальный ключ
      }));

      setData(resultWithId);
    } catch (err) {
      console.error(err);
      message.error(t('stockReport.loadError'));
    }
  };

  // --------------------------
  // КОЛОНКИ ТАБЛИЦЫ
  // --------------------------
  const columns = (): ColumnsType<Stock> => {
    return [
      { title: t('stockReport.table.number'), render: (_, __, index) => index + 1 },
      { title: t('stockReport.table.pointname'), dataIndex: 'pointname' },
      { title: t('stockReport.table.productname'), dataIndex: 'productname' },
      { title: t('stockReport.table.code'), dataIndex: 'code' },
      { 
        title: t('stockReport.table.price'), 
        dataIndex: 'price',
        render: (price: number) => price.toFixed(2) // Форматирование цены продажи
      },
      { 
        title: t('stockReport.table.purchaseprice'), 
        dataIndex: 'purchaseprice', 
        render: (price: string) => Number(price).toFixed(2) // Форматирование цены закупки
      },
      { 
        title: t('stockReport.table.wholesale_price'), 
        dataIndex: 'wholesale_price',
        render: (price: number) => price.toFixed(2) // Форматирование оптовой цены
      },
      { title: t('stockReport.table.units'), dataIndex: 'units' },
      { title: t('stockReport.table.brand'), dataIndex: 'brand' },
      { title: t('stockReport.table.category'), dataIndex: 'category' },
      { title: t('stockReport.table.counterparty'), dataIndex: 'counterparty' },
      { title: t('stockReport.table.nds'), dataIndex: 'nds' },
    ];
  }

  // --------------------------
  // ЭКСПОРТ В EXCEL
  // --------------------------
  const convertRowToExcel = (row: Stock, index: number) => {
    const mapped: any = {};
    const currentColumns = columns();

    currentColumns.forEach((col: any) => {
      if (!col.title) return;
      const title = col.title;

      if (col.dataIndex) {
        let value = row[col.dataIndex as keyof Stock];

        // Применяем рендеринг для корректного форматирования в Excel
        if (col.render) {
            value = col.render(value, row, index);
        }

        mapped[title] = value;
      }
      else if (title === t('stockReport.table.number')) {
        mapped[title] = index + 1;
      }
    });

    return mapped;
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(
      data.map((row, i) => convertRowToExcel(row, i))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('stockReport.sheetName'));
    XLSX.writeFile(wb, "StockReportSimple.xlsx");
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
  // РАСЧЕТ ИТОГОВ
  // --------------------------
  const calculateTotals = (data: readonly Stock[]) => { // 💡 ИСПРАВЛЕНИЕ: readonly Stock[]
    let totalUnits = 0;
    let totalStockCostSale = 0;
    let totalStockCostPurchase = 0;

    data.forEach(item => {
      // Использование || 0 для безопасности
      const units = Number(item.units) || 0;
      const salePrice = Number(item.price) || 0;
      const purchasePrice = Number(item.purchaseprice) || 0;

      totalUnits += units;

      totalStockCostSale += units * salePrice;
      totalStockCostPurchase += units * purchasePrice;
    });

    return {
      totalUnits,
      totalStockCostSale,
      totalStockCostPurchase,
    };
  };

  // --------------------------
  // РЕНДЕР КОМПОНЕНТА
  // --------------------------
  return (
    <div className={styles.container}>
      <Row gutter={[16, 16]}>
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

            // ГЛАВНОЕ ИЗМЕНЕНИЕ: Добавляем стратегию, чтобы ID родителя тоже попадал в value
        showCheckedStrategy={TreeSelect.SHOW_PARENT}
          />
        </Col>

        <Col xs={24} sm={12}>
          <Button type="primary" onClick={handleSearch} className={styles.fullWidthControl}>
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
        pagination={{ pageSize: 20 }}
        summary={pageData => {
          const {
            totalUnits,
            totalStockCostSale,
            totalStockCostPurchase,
          } = calculateTotals(pageData);

          // Индекс колонки "Цена продажи" = 4. Объединяем 4 ячейки (0, 1, 2, 3)
          const colSpanForTotalLabel = 4;

          return (
            <Table.Summary.Row>

              {/* 0. Ячейка "Итого" (объединяем 4 ячейки: №, Склад, Товар, Штрих-код) */}
              <Table.Summary.Cell index={0} colSpan={colSpanForTotalLabel}>
                <div className={styles.summaryBoldText}>{t('stockReport.summary.total')}</div>
              </Table.Summary.Cell>

              {/* 1, 2, 3. Ячейки пропускаются из-за colSpan */}

              {/* 4. Колонка "Цена продажи". Выводим общую стоимость запасов по ЦЕНЕ ПРОДАЖИ */}
              <Table.Summary.Cell index={4}>
                <div className={styles.summaryBoldText}>{totalStockCostSale.toFixed(2)}</div>
              </Table.Summary.Cell>

              {/* 5. Колонка "Цена закупки". Выводим общую стоимость запасов по ЦЕНЕ ЗАКУПКИ */}
              <Table.Summary.Cell index={5}>
                <div className={styles.summaryBoldText}>{totalStockCostPurchase.toFixed(2)}</div>
              </Table.Summary.Cell>

              {/* 6. Оптовая цена (пусто) */}
              <Table.Summary.Cell index={6}></Table.Summary.Cell>

              {/* 7. Колонка "Количество". Выводим общее количество */}
              <Table.Summary.Cell index={7}>
                <div className={styles.summaryBoldText}>{totalUnits.toFixed(3)}</div>
              </Table.Summary.Cell>

              {/* 8-11. Остальные ячейки пустые */}
              <Table.Summary.Cell index={8}></Table.Summary.Cell>
              <Table.Summary.Cell index={9}></Table.Summary.Cell>
              <Table.Summary.Cell index={10}></Table.Summary.Cell>
              <Table.Summary.Cell index={11}></Table.Summary.Cell>

            </Table.Summary.Row>
          );
        }}
        className={styles.tableMarginTop}
      />
    </div>
  );
};

export default StockSimple;