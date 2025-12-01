import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  Select,
  Button,
  Row,
  Col,
  message,
  Tag,
} from "antd";
import type { ColumnsType } from 'antd/es/table'; // 💡 Импортируем ColumnsType
import * as XLSX from "xlsx";
import dayjs, { Dayjs } from "dayjs";
import { PlayCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

import DateRangePickerSafe from "../../DateRangePickerSafe";
import ProductBarcodeSearch from "../../ProductBarcodeSearch";
import useApiRequest from "../../../hooks/useApiRequest";
import InvoiceDetailsModal from "./InvoiceDetailsModal";
import styles from './InvoicesHistoryReport.module.css'; 

const { Option } = Select;

// 💡 Типизация строки данных
interface InvoiceRow {
  altnumber?: string;
  invoicenumber: string;
  invoicedate: string;
  status: string;
  invoicetypeid: string;

  stockfrom?: string;
  stockto?: string;

  counterparty?: string;
  name?: string; // сотрудник
  purchasetotal?: number;
  saletotal?: number;
  
  // Поля, используемые в колонках:
  purchaseprice?: number; 
  newprice?: number; 
}

// Константы для типов накладных
const TYPE_MOVE = "1";
const TYPE_ADD = "2";
const TYPE_PRICE_CHANGE = "0";
const TYPE_WRITE_OFF = "7";
const TYPE_CONSIGNATION_OUT = "16";
const TYPE_CONSIGNATION_RETURN = "17";

const InvoicesHistoryReport: React.FC = () => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL;
  
  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
    "Content-Type": "application/json",
  });

  // -----------------------------
  // Фильтры
  // -----------------------------
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs(),
    dayjs(),
  ]);
  const [productId, setProductId] = useState("");
  const [barcode, setBarcode] = useState("");

  const [invoiceTypes, setInvoiceTypes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<string>("2");

  const [appliedType, setAppliedType] = useState<string>("2");

  const [stocks, setStocks] = useState<any[]>([]);
  const [selectedStockFrom, setSelectedStockFrom] = useState("0");
  const [selectedStockTo, setSelectedStockTo] = useState("0");

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("0");

  const [consignators, setConsignators] = useState<any[]>([]);
  const [selectedConsignator, setSelectedConsignator] = useState("0");

  const [data, setData] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Модальное окно
  const [modalVisible, setModalVisible] = useState(false);
  const [modalInvoice, setModalInvoice] = useState<InvoiceRow | null>(null);

  // ------------------------------------------------------------
  // Загружаем справочники
  // ------------------------------------------------------------
  useEffect(() => {
    loadTypes();
    loadStocks();
    loadSuppliers();
    loadConsignators();
  }, [API_URL, sendRequest, t]);

const handleTypeChange = useCallback((newType: string) => {
    setSelectedType(newType);

    // 1. Сброс фильтров, которые зависят от типа накладной
    setSelectedStockFrom("0");
    setSelectedStockTo("0");
    setSelectedSupplier("0");
    setSelectedConsignator("0");

    // 2. Сброс фильтра товара/штрих-кода (опционально, но логично)
    setProductId("");
    setBarcode("");
    // Примечание: ProductBarcodeSearch должен будет обновиться через свои пропсы, 
    // если он имеет внутреннее состояние для отображения текста. 
    // Для внешнего состояния (productId, barcode) сброс здесь достаточен.

    // 3. Очищаем данные таблицы (визуально)
    setData([]);

  }, []); // Пустой массив зависимостей, так как не используем внешние переменные

const loadTypes = async () => {
    

    try {
        const res = await sendRequest(
            `${API_URL}/api/invoice/types?invoicetypes[]=1&invoicetypes[]=2&invoicetypes[]=7&invoicetypes[]=0&invoicetypes[]=16&invoicetypes[]=17`,
            { headers: getHeaders() }
        );
        
        // 💡 Переименовываем аргумент map с 't' на 'type' для избежания конфликта
        const translatedTypes = res.map((type: any) => ({
            ...type,
            name: t('invoicesHistory.invoiceTypes.' + type.id, type.name),
        }));
        
        //  Устанавливаем только полученные и переведенные типы
        setInvoiceTypes(translatedTypes); 
        
        // 💡 Дополнительно: Если вы хотите, чтобы по умолчанию был выбран первый тип 
        // из списка (а не "2"), можете добавить:
        // if (translatedTypes.length > 0) {
        //     setSelectedType(translatedTypes[0].id);
        //     setAppliedType(translatedTypes[0].id);
        // }

    } catch (error) {
       console.error("Error loading invoice types:", error);
       // В случае ошибки оставляем список пустым или с заданным по умолчанию типом
       setInvoiceTypes([]); 
    }
};



  const loadStocks = async () => {
    const res = await sendRequest(`${API_URL}/api/stock`, {
      headers: getHeaders(),
    });
    setStocks(res);
  };

  const loadSuppliers = async () => {
    const res = await sendRequest(`${API_URL}/api/counterparties/search`, {
      headers: getHeaders(),
    });
    setSuppliers(res);
  };

  const loadConsignators = async () => {
    const res = await sendRequest(`${API_URL}/api/buyers`, {
      headers: getHeaders(),
    });
    setConsignators(res);
  };

  // ------------------------------------------------------------
  // Загрузка отчёта
  // ------------------------------------------------------------
  const handleSearch = async () => {
    setLoading(true);
    try {
      const url = `${API_URL}/api/report/history/invoicesnoformation?` +
        `prodID=${productId || ""}` +
        `&barcode=${barcode || ""}` +
        `&dateFrom=${dateRange[0].format("YYYY-MM-DD")}` +
        `&dateTo=${dateRange[1].format("YYYY-MM-DD")}` +
        `&invoicetype=${selectedType === "all" ? "" : selectedType}` +
        `&stockFrom=${selectedStockFrom}` +
        `&stockTo=${selectedStockTo}` +
        `&counterpartie=${selectedSupplier}` +
        `&consignator=${selectedConsignator}`;

      const res = await sendRequest(url, { headers: getHeaders() });
      setData(res);
      setAppliedType(selectedType);
    } catch (err) {
      console.error(err);
      message.error(t('invoicesHistory.loadError'));
    }
    setLoading(false);
  };

  // ------------------------------------------------------------
  // Колонки таблицы
  // ------------------------------------------------------------
  const openDetailsButton = (row: InvoiceRow) => (
    <Button
      type="link"
      onClick={() => openDetails(row)}
      icon={<PlayCircleOutlined />}
      className={styles.playButton}
    />
  );

  const colorStatus = (text: string) => {
    const translatedText = t(`invoicesHistory.statuses.${text}`, text);
    
    if (text === "Принят на кассе") {
      return <Tag color="green">{translatedText}</Tag>;
    }
    if (text === "Ожидает обработки от кассы") {
      return <Tag color="orange">{translatedText}</Tag>;
    }
    return translatedText;
  };

  // 💡 Явная типизация возвращаемого типа
  const getColumns = (): ColumnsType<InvoiceRow> => {
    const base: ColumnsType<InvoiceRow> = [
      {
        title: t('invoicesHistory.table.number'),
        render: (_: any, __: any, i: number) => i + 1,
      },
      {
        title: t('invoicesHistory.table.invoiceNumber'),
        render: (row: InvoiceRow) => {
          const d = dayjs(row.invoicedate).format("DD.MM.YYYY");
          return `${row.altnumber ? row.altnumber + "/" : ""}${row.invoicenumber} ${t('invoicesHistory.table.from')} ${d}`;
        },
      },
    ];

    let specificColumns: ColumnsType<InvoiceRow> = [];

    if (appliedType === TYPE_ADD) {
      // Приём товара
      specificColumns = [
        { title: t('invoicesHistory.table.totalPurchasePrice'), dataIndex: "purchaseprice" },
        { title: t('invoicesHistory.table.totalSalePrice'), dataIndex: "newprice" },
        { title: t('invoicesHistory.table.fullName'), dataIndex: "name" },
        { title: t('invoicesHistory.table.toStock'), dataIndex: "stockto" },
        { title: t('invoicesHistory.table.supplier'), dataIndex: "counterparty" },
      ];
    } else if (appliedType === TYPE_MOVE) {
      // Перемещение
      specificColumns = [
        { title: t('invoicesHistory.table.amount'), dataIndex: "newprice" },
        { title: t('invoicesHistory.table.fullName'), dataIndex: "name" },
        { title: t('invoicesHistory.table.fromStock'), dataIndex: "stockfrom" },
        { title: t('invoicesHistory.table.toStock'), dataIndex: "stockto" },
      ];
    } else if (appliedType === TYPE_PRICE_CHANGE) {
      // Смена цен
      // При смене цен колонки "Номер" и "Номер накладной" отличаются
      return [
        { title: t('invoicesHistory.table.number'), render: (_: any, __: any, i: number) => i + 1, },
        {
          title: t('invoicesHistory.table.invoiceNumber'),
          render: (row: InvoiceRow) => {
            const d = dayjs(row.invoicedate).format("DD.MM.YYYY");
            return `${row.invoicenumber} ${t('invoicesHistory.table.from')} ${d}`;
          },
        },
        { title: t('invoicesHistory.table.fullName'), dataIndex: "name" },
        { title: t('invoicesHistory.table.status'), dataIndex: "status", render: colorStatus, },
        { title: "", render: (row: InvoiceRow) => openDetailsButton(row), },
      ] as ColumnsType<InvoiceRow>; // 💡 Приведение типа
    } else if (appliedType === TYPE_WRITE_OFF) {
      // Списание
      specificColumns = [
        { title: t('invoicesHistory.table.fullName'), dataIndex: "name" },
        { title: t('invoicesHistory.table.fromStock'), dataIndex: "stockfrom" },
      ];
    } else if (
      appliedType === TYPE_CONSIGNATION_OUT ||
      appliedType === TYPE_CONSIGNATION_RETURN
    ) {
      // Консигнация
      specificColumns = [
        { title: t('invoicesHistory.table.goodsCost'), dataIndex: "saletotal" },
        { title: t('invoicesHistory.table.fullName'), dataIndex: "name" },
        { title: t('invoicesHistory.table.fromStock'), dataIndex: "stockfrom" },
        { title: t('invoicesHistory.table.toStock'), dataIndex: "stockto" },
        { title: t('invoicesHistory.table.supplier'), dataIndex: "counterparty" },
      ];
    }
    
    // Сборка колонок
    return [
      ...base,
      ...specificColumns,
      {
        title: t('invoicesHistory.table.status'),
        dataIndex: "status",
        render: colorStatus,
      },
      {
        title: "",
        render: (row: InvoiceRow) => openDetailsButton(row),
      },
    ] as ColumnsType<InvoiceRow>; // 💡 Приведение типа
  };

  // ------------------------------------------------------------
  // Экспорт в Excel
  // ------------------------------------------------------------
  const convertRowToExcel = (row: InvoiceRow, index: number) => {
    const mapped: any = {};

    getColumns().forEach((col: any) => {
      if (!col.title) return;

      if (col.dataIndex) {
          // Если есть dataIndex, берем значение напрямую
          mapped[col.title] = row[col.dataIndex as keyof InvoiceRow]; 
      }
      else {
        if (col.title === t('invoicesHistory.table.number')) {
          mapped[col.title] = index + 1;
        } else {
          // Вызываем render для сложных колонок (например, Номер накладной)
          mapped[col.title] = col.render(row);
        }
      }
    });

    return mapped;
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      data.map((row, i) => convertRowToExcel(row, i))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('invoicesHistory.sheetName')); 
    XLSX.writeFile(wb, "InvoiceHistory.xlsx");
  };

  // ------------------------------------------------------------
  // Модальное окно
  // ------------------------------------------------------------
  const openDetails = (row: InvoiceRow) => {
    setModalInvoice(row);
    setModalVisible(true);
  };

  return (
    <div>
      <h2 className={styles.reportTitle}>
        {t('invoicesHistory.reportTitle')}
      </h2>

  {/* ================= ФИЛЬТРЫ ================= */}
  <Row gutter={[16, 12]}>
    {/* Дата */}
    <Col span={12}>
      <div className={styles.filterLabel}>{t('invoicesHistory.filter.dateRange')}</div>
      <DateRangePickerSafe
        value={dateRange}
        onChange={(dates) => {
          if (!dates || !dates[0] || !dates[1]) return;
          setDateRange([dates[0], dates[1]]);
        }}
      />
    </Col>

    {/* Товар / Штрих-код */}
    <Col span={12}>
      <div className={styles.filterLabel}>{t('invoicesHistory.filter.productBarcode')}</div>
      <ProductBarcodeSearch
        includeAllProduct
        onProductSelect={(id, code) => {
          setProductId(id);
          setBarcode(code);
        }}
        onClear={() => {
          setProductId("");
          setBarcode("");
        }}
      />
    </Col>

    {/* Тип накладной */}
    <Col span={12}>
      <div className={styles.filterLabel}>{t('invoicesHistory.filter.invoiceType')}</div>
      <Select
        value={selectedType}
        //onChange={setSelectedType}
        onChange={handleTypeChange}
        className={styles.fullWidthControl}
      >
        
        {invoiceTypes.map((t) => (
          <Option key={t.id} value={t.id}>
            {t.name}
          </Option>
        ))}
      </Select>
    </Col>

    {/* Со склада */}
    {(selectedType === TYPE_MOVE ||
      selectedType === TYPE_WRITE_OFF ||
      selectedType === TYPE_CONSIGNATION_OUT ||
      selectedType === TYPE_CONSIGNATION_RETURN) && (
      <Col span={12}>
        <div className={styles.filterLabel}>{t('invoicesHistory.filter.fromStock')}</div>
        <Select
          className={styles.fullWidthControl}
          value={selectedStockFrom}
          onChange={setSelectedStockFrom}
        >
          <Option value="0">{t('invoicesHistory.option.allStocks')}</Option>
          {stocks.map((s) => (
            <Option key={s.id} value={s.id}>
              {s.name}
            </Option>
          ))}
        </Select>
      </Col>
    )}

    {/* На склад */}
    {(selectedType === TYPE_MOVE || selectedType === TYPE_ADD) && (
      <Col span={12}>
        <div className={styles.filterLabel}>{t('invoicesHistory.filter.toStock')}</div>
        <Select
          className={styles.fullWidthControl}
          value={selectedStockTo}
          onChange={setSelectedStockTo}
        >
          <Option value="0">{t('invoicesHistory.option.allStocks')}</Option>
          {stocks.map((s) => (
            <Option key={s.id} value={s.id}>
              {s.name}
            </Option>
          ))}
        </Select>
      </Col>
    )}

    {/* Поставщик — только Приём товара */}
    {selectedType === TYPE_ADD && (
      <Col span={12}>
        <div className={styles.filterLabel}>{t('invoicesHistory.filter.supplier')}</div>
        <Select
          className={styles.fullWidthControl}
          value={selectedSupplier}
          onChange={setSelectedSupplier}
        >
          <Option value="0">{t('invoicesHistory.option.allSuppliers')}</Option>
          {suppliers.map((s) => (
            <Option key={s.id} value={s.id}>
              {s.name}
            </Option>
          ))}
        </Select>
      </Col>
    )}

    {/* Консигнатор — консигнация */}
    {(selectedType === TYPE_CONSIGNATION_OUT ||
      selectedType === TYPE_CONSIGNATION_RETURN) && (
      <Col span={12}>
        <div className={styles.filterLabel}>{t('invoicesHistory.filter.consignator')}</div>
        <Select
          className={styles.fullWidthControl}
          value={selectedConsignator}
          onChange={setSelectedConsignator}
        >
          <Option value="0">{t('invoicesHistory.option.allConsignators')}</Option>
          {consignators.map((c) => (
            <Option key={c.id} value={c.id}>
              {c.name}
            </Option>
          ))}
        </Select>
      </Col>
    )}

    {/* Кнопки */}
    <Col span={12}>
      <Button type="primary" onClick={handleSearch} className={styles.searchButton}>
        {t('invoicesHistory.button.search')}
      </Button>
    </Col>

    <Col span={12}>
      <Button onClick={exportExcel} className={styles.exportButton}>
        {t('invoicesHistory.button.export')}
      </Button>
    </Col>
  </Row>


      {/* =================== ТАБЛИЦА =================== */}
      <Table<InvoiceRow> 
        columns={getColumns()}
        dataSource={data}
        rowKey={(r) => r.invoicenumber + r.invoicedate}
        loading={loading}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 'max-content' }} 
        className={styles.reportTable}
      />

      {/* =================== МОДАЛКА =================== */}
      {modalInvoice && (
        <InvoiceDetailsModal
          visible={modalVisible}
          invoice={modalInvoice}
          onClose={() => setModalVisible(false)}
        />
      )}
    </div>
  );
};

export default InvoicesHistoryReport;