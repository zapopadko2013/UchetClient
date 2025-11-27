import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Select,
  Checkbox,
  Modal,
  message,
  Typography,Row,Col
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { Dayjs } from 'dayjs';
import { FileExcelOutlined,EyeOutlined } from "@ant-design/icons";
import { useTranslation } from 'react-i18next'; // <-- Импорт для интернационализации


type RangeValue = [Dayjs | null, Dayjs | null] | null;

import DateRangePickerSafe from "../DateRangePickerSafe";
import useApiRequest from "../../hooks/useApiRequest";
import styles from "./SalesReport.module.css";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// ===== Types (без изменений) =====
interface Point {
  id: string;
  name: string;
}

interface CashUser {
  id: string;
  name: string;
  role: string;
}

interface Transaction {
  id: string;
  ticketid: string;
  date: string;
  price: number;
  cashboxuser: string;
  consultant: string;
  paymenttype: string;
  tickettype: string;
  pointname: string;
}

interface FullDetails {
  cashier: string;
  pointname: string;
  cashboxname: string;
  date: string;
  price: number;
  cardpay: number;
  cashpay: number;
  debitpay: number;
  certpay: number;
  bonuspay: number;
  bonusadd: number;
  markup: number;
  discount: number;
  total_discount: number;
  nds?: number;
  details: Array<{
    name: string;
    units: number;
    price: number;
    totalprice: number;
    discount: number;
    unitspr_shortname: string;
  }>;
}

// =============================================
//            COMPONENT START
// =============================================
const SalesByChecksReport: React.FC = () => {
  const { t } = useTranslation(); // <-- Использование хука перевода
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL;
  const headers = {
    Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
    "Content-Type": "application/json",
  };

  // [Пропущено объявление состояния]
  const [dates, setDates] = useState<RangeValue>([dayjs(), dayjs()]);
  const [points, setPoints] = useState<Point[]>([]);
  const [cashiers, setCashiers] = useState<CashUser[]>([]);
  const [consultants, setConsultants] = useState<CashUser[]>([]);

  const [pointId, setPointId] = useState<string>("0");
  const [clientType, setClientType] = useState<string>("fiz");
  const [cashierId, setCashierId] = useState<string>("0");
  const [consultantId, setConsultantId] = useState<string>("0");

  const [bonusAdd, setBonusAdd] = useState(false);
  const [bonusPay, setBonusPay] = useState(false);

  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // modal details
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [details, setDetails] = useState<FullDetails | null>(null);

  // Функции для форматирования типов оплаты и операции (используются в Table и Excel)
  const formatPaymentType = (val: string): string => {
      switch (val) {
        case "card":
          return t('reportchecks.paymentTypeCard'); // Карта
        case "cash":
          return t('reportchecks.paymentTypeCash'); // Наличными
        case "debit":
          return t('reportchecks.paymentTypeDebit'); // Перевод
        case "mixed":
          return t('reportchecks.paymentTypeMixed'); // Смешанная
        default:
          return val;
      }
    };

  const formatTicketType = (val: string): string => (val === "1" ? t('reportchecks.operationTypeReturn') : t('reportchecks.operationTypePurchase'));

  // ===== Load filters =====
  const loadPoints = async () => {
    try {
      const data = await sendRequest(`${API_URL}/api/point`, { headers });
      const active = data.filter((p: any) => p.status === "ACTIVE");
      // Перевод "Все"
      setPoints([{ id: "0", name: t('reportchecks.common.all') }, ...active]);
    } catch {
      message.error(t('reportchecks.loadPointsError'));
    }
  };

  const loadUsers = async () => {
    try {
      const data = await sendRequest(`${API_URL}/api/cashboxuser`, { headers });

      // Перевод "Все"
      const allOption = { id: "0", name: t('reportchecks.common.all'), role: "" };

      setCashiers([
        allOption,
        ...data.filter((u: CashUser) => u.role === "3")
      ]);

      setConsultants([
        allOption,
        ...data.filter((u: CashUser) => u.role === "4")
      ]);
    } catch {
      message.error(t('reportchecks.loadUsersError'));
    }
  };

  useEffect(() => {
    loadPoints();
    loadUsers();
  }, []);

  // ===== Load transactions (без изменений логики) =====
  const loadReport = async () => {
    if (!dates || !dates[0] || !dates[1]) return;

    setLoading(true);

    const params = new URLSearchParams({
      dateFrom: dates[0].format("YYYY-MM-DD"),
      dateTo: dates[1].format("YYYY-MM-DD"),
      point: pointId,
      client: clientType,
      consignator: "0",
    });

    if (cashierId !== "0") params.append("cashier", cashierId);
    if (consultantId !== "0") params.append("consultant", consultantId);
    if (bonusAdd) params.append("bonusadd", "true");
    if (bonusPay) params.append("bonuspay", "true");

    try {
      const data = await sendRequest(`${API_URL}/api/report/transactions?${params.toString()}`, { headers });
      setTransactions(data);
    } catch {
      message.error(t('reportchecks.loadReportError'));
    } finally {
      setLoading(false);
    }
  };

  // ===== Load full details (без изменений логики) =====
  const openDetails = async (record: Transaction) => {
    try {
      const data = await sendRequest(
        `${API_URL}/api/report/transactions/fulldetails?transactionid=${record.id}&holding=true`,
        { headers }
      );
      setDetails(data);
      setDetailsVisible(true);
    } catch {
      message.error(t('reportchecks.loadCheckError'));
    }
  };

  // ===== Table columns =====
  const baseColumns: ColumnsType<Transaction> = [
    {
      title: t('reportchecks.colDate'), // "Дата"
      dataIndex: "date",
      render: (val) => dayjs(val).format("DD.MM.YYYY HH:mm"),
    },
   {
    title: t('reportchecks.colPaymentType'), // "Способ оплаты"
    dataIndex: "paymenttype",
    render: formatPaymentType, // Используем переведенную функцию
  },
    {
    title: t('reportchecks.colOperationType'), // "Тип операции"
    dataIndex: "tickettype",
    render: formatTicketType, // Используем переведенную функцию
  },
    { title: t('reportchecks.colCashier'), dataIndex: "cashboxuser" }, // "Кассир"
    { title: t('reportchecks.colConsultant'), dataIndex: "consultant" }, // "Консультант"
    { title: t('reportchecks.colTotalPrice'), dataIndex: "price" }, // "Общая сумма"
    {
      title: t('reportchecks.colCheck'), // "Чек"
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined className={styles.iconLarge} />}
          onClick={() => openDetails(record)}
        />
      ),
    },
  ];

  const columns: ColumnsType<Transaction> =
  clientType === "jur"
    ? [
        ...baseColumns,
        {
          title: t('reportchecks.colInvoice'), // "Накладная"
          render: (_, record) => (
            <Button
              type="link"
              icon={<FileExcelOutlined className={styles.iconLarge} />}
              onClick={() => downloadInvoice(record.id)}
            />
          ),
        },
      ]
    : baseColumns;

  const exportToExcel = () => {
    if (!transactions.length) {
      message.warning(t('reportchecks.exportNoData'));
      return;
    }
  
    const dataForExcel = transactions.map((t1) => ({
      [t('reportchecks.excelDate')]: dayjs(t1.date).format("DD.MM.YYYY HH:mm"),
      [t('reportchecks.excelPaymentType')]: formatPaymentType(t1.paymenttype), 
      [t('reportchecks.excelOperationType')]: formatTicketType(t1.tickettype), 
      [t('reportchecks.excelCashier')]: t1.cashboxuser,
      [t('reportchecks.excelConsultant')]: t1.consultant,
      [t('reportchecks.excelTotalPrice')]: t1.price,
      [t('reportchecks.excelPoint')]: t1.pointname,
      [t('reportchecks.excelCheckNumber')]: t1.ticketid,
    }));
  
    // создаём книгу
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    // Название листа
    XLSX.utils.book_append_sheet(workbook, worksheet, t('reportchecks.excelSheetName'));
  
    // генерируем файл
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
  
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    // Название файла
    saveAs(blob, `${t('reportchecks.excelFileName')}_${dayjs().format("YYYY-MM-DD")}.xlsx`);
  };


const downloadInvoice = async (transactionId: string) => {
  try {
    const url = `${API_URL}/api/report/transactions/jur/invoice?transactionId=${transactionId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
      },
    });

    if (!response.ok) {
      message.error(t('reportchecks.loadInvoiceError'));
      return;
    }

    const blob = await response.blob();

    saveAs(
      blob,
      `${t('reportchecks.invoiceFileName')}_${transactionId}_${dayjs().format("YYYY-MM-DD")}.xlsx`
    );
  } catch (err) {
    message.error(t('reportchecks.downloadInvoiceError'));
  }
};



  return (
    <div className={styles.wrapper}>
      <Typography.Title level={4}>{t('reportchecks.mainTitle')}</Typography.Title>

   <div className={styles.filtersBlock}>
<Row gutter={[16, 16]} align="middle">
  
  <Col xs={24} sm={24} md={12}>
    <DateRangePickerSafe
      value={dates}
      onChange={setDates}
    />
  </Col>

  <Col xs={24} sm={24} md={12}>
    <Select
      value={pointId}
      onChange={setPointId}
      options={points.map((p) => ({ value: p.id, label: p.name }))}
      placeholder={t('reportchecks.pointPlaceholder')} // "Торговая точка"
      className={styles.fullWidth}
    />
  </Col>

  <Col xs={24} sm={24} md={12}>
    <Select
      value={clientType}
      onChange={setClientType}
      options={[
        { value: "fiz", label: t('reportchecks.clientFiz') }, // "По физ. лицам"
        { value: "jur", label: t('reportchecks.clientJur') }, // "По юр. лицам"
      ]}
      placeholder={t('reportchecks.clientTypePlaceholder')} // "Тип клиента"
      className={styles.fullWidth}
    />
  </Col>

  <Col xs={24} sm={24} md={12}>
    <Select
      value={cashierId}
      onChange={setCashierId}
      options={cashiers.map((c) => ({ value: c.id, label: c.name }))}
      placeholder={t('reportchecks.cashierPlaceholder')} // "Кассир"
      className={styles.fullWidth}
    />
  </Col>

  <Col xs={24} sm={24} md={12}>
    <Select
      value={consultantId}
      onChange={setConsultantId}
      options={consultants.map((c) => ({ value: c.id, label: c.name }))}
      placeholder={t('reportchecks.consultantPlaceholder')} // "Консультант"
      className={styles.fullWidth}
    />
  </Col>

  <Col xs={24} sm={24} md={12}>
    <Checkbox
      checked={bonusAdd}
      onChange={(e) => setBonusAdd(e.target.checked)}
    >
      {t('reportchecks.checkBonusAdd')}
    </Checkbox>

    <Checkbox
      checked={bonusPay}
      onChange={(e) => setBonusPay(e.target.checked)}
      /* className={styles.bonusCheckbox} */
    >
      {t('reportchecks.checkBonusPay')}
    </Checkbox>
  </Col>

  <Col xs={24} sm={24} md={12}>
    <Button type="primary" onClick={loadReport} block>
      {t('reportchecks.reportButton')}
    </Button>
  </Col>

  <Col xs={24} sm={24} md={12}>
    <Button onClick={exportToExcel} block>
      {t('reportchecks.exportButton')}
    </Button>
  </Col>
</Row>
</div>


      {/* TABLE */}
      <Table
        rowKey="id"
        loading={loading}
        dataSource={transactions}
        columns={columns}
      />

      {/* DETAILS MODAL */}
      <Modal
        open={detailsVisible}
        footer={null}
        onCancel={() => setDetailsVisible(false)}
        width={700}
        title={t('reportchecks.modalTitle')} // "Чек"
      >
        {details && (
          <div>
            {/* Блок основной информации */}
            <p>
              <b>{t('reportchecks.modalPurchase')}:</b>{" "}
              {dayjs(details.date).format("DD.MM.YYYY HH:mm:ss")}
            </p>
            <p><b>{t('reportchecks.modalCashier')}:</b> {details.cashier}</p>
            <p><b>{t('reportchecks.modalPoint')}:</b> {details.pointname}</p>
            <p><b>{t('reportchecks.modalCashbox')}:</b> {details.cashboxname}</p>

            {/* Таблица деталей */}
            <Table
              rowKey={(_, index = 0) => index.toString()}
              pagination={false}
              columns={[
                { title: t('reportchecks.modalColName'), dataIndex: "name" },
                { title: t('reportchecks.modalColUnitsPrice'), render: (r) => `${r.units} x ${r.price}` }, 
                { title: t('reportchecks.modalColPrice'), dataIndex: "totalprice" },
                { title: t('reportchecks.modalColDiscount'), dataIndex: "discount" },
              ]}
              dataSource={details.details}
            />

            <br />

            {/* Группировка ИТОГОВ И СКИДОК */}
            <Row gutter={[16, 8]}>
              <Col span={12}><b>{t('reportchecks.modalTotalSum')}:</b></Col>
              <Col span={12} className={styles.modalRight}>{details.price ?? 0}</Col>
              
              <Col span={12}><b>{t('reportchecks.modalDiscount')}:</b></Col>
              <Col span={12} className={styles.modalRight}>{details.discount ?? 0}</Col>

              <Col span={12}><b>{t('reportchecks.modalBonusAdded')}:</b></Col>
              <Col span={12} className={styles.modalRight}>{details.bonusadd ?? 0}</Col>
              
              <Col span={12}><b>{t('reportchecks.modalBonusPaid')}:</b></Col>
              <Col span={12} className={styles.modalRight}>{details.bonuspay ?? 0}</Col>
              
              <Col span={12}><b>{t('reportchecks.modalVAT')}:</b></Col>
              <Col span={12} className={styles.modalRight}>{details.nds ?? 0}</Col>

              <Col span={12} className={styles.modalTotals}>{t('reportchecks.modalToPay')}:</Col>
              <Col span={12}  className={styles.modalTotalsRight}>{details.price ?? 0}</Col>
            </Row>

            <br />
            
            {/* Группировка ОПЛАТ */}
            <Typography.Title level={5}>{t('reportchecks.modalPayments')}</Typography.Title>
            <Row gutter={[16, 4]}>
              <Col span={12}>{t('reportchecks.modalCash')}:</Col>
              <Col span={12} className={styles.modalRight}>{details.cashpay ?? 0}</Col>

              <Col span={12}>{t('reportchecks.modalCard')}:</Col>
              <Col span={12} className={styles.modalRight}>{details.cardpay ?? 0}</Col>
              
              <Col span={12}>{t('reportchecks.modalCertificate')}:</Col>
              <Col span={12} className={styles.modalRight}>{details.certpay ?? 0}</Col>

              <Col span={12}>{t('reportchecks.modalDebit')}:</Col>
              <Col span={12} className={styles.modalRight}>{details.debitpay ?? 0}</Col>
            </Row>

            <Button
              type="primary"
              onClick={() => setDetailsVisible(false)}
              className={styles.modalBlockTitle}
            >
              {t('reportchecks.modalCloseButton')}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SalesByChecksReport;