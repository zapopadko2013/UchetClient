import React, { useEffect, useState } from "react";
import { Modal, Table, Button, Row, Col, Typography, message } from "antd";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next"; // 💡 Импорт
import useApiRequest from "../../../hooks/useApiRequest";
import styles from './InvoicesHistoryReport.module.css'; 

const { Title, Text } = Typography;

interface InvoiceDetailsModalProps {
  visible: boolean;
  invoice: any;
  onClose: () => void;
}

interface DetailRow {
  units: number;
  price_total: number;
  purchaseprice: number | null;
  price: number | null;
  pieceprice: number | null;
  name: string;
  code: string;
  brand: string;
  cnofeacode: string | null;
  taxid: string | null;
  reason: string | null;
  oldprice: number | null;
  newprice: number | null;
  attributescaption: string | null;
}

const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({
  visible,
  invoice,
  onClose,
}) => {
  const { t } = useTranslation(); // 💡 Использование функции перевода
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL;

  const [details, setDetails] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(false);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
    "Content-Type": "application/json",
  });

  // --------------------------
  // Загрузка деталей
  // --------------------------
  useEffect(() => {
    if (!visible) return;
    loadDetails();
  }, [visible]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const url =
        `${API_URL}/api/report/history/invoice/details?` +
        `invoicetype=${invoice.invoicetypeid}&invoicenumber=${invoice.invoicenumber}`;

      const res = await sendRequest(url, { headers: getHeaders() });
      setDetails(res);
    } catch (err) {
      console.error(err);
      // 💡 Добавляем сообщение об ошибке
      message.error(t('invoicesHistory.loadDetailsError'));
    }
    setLoading(false);
  };

  // --------------------------
  // Колонки таблицы
  // --------------------------
  const getColumnsByInvoiceType = (type: string) => {
    const baseCols = [
      {
        title: t('invoicesHistory.table.number'), // "№"
        render: (_: any, __: any, i: number) => i + 1,
        width: 60,
      },
       { title: t('invoicesHistory.details.productName'), 
        
        //dataIndex: "name",
        render: (row: DetailRow) => {
      // Проверяем, существует ли attributescaption и не является ли оно пустым
      if (row.attributescaption) {
        // Объединяем наименование и описание атрибутов через разделитель
        return `${row.name} (${row.attributescaption})`;
      }
      // Если атрибутов нет, возвращаем только наименование
      return row.name;
    },
        
        width: 250 },
       

      
      
      { title: t('invoicesHistory.details.barcode'), dataIndex: "code", width: 120 },
    ];

    const taxRender = (value: string | null) => {
      return value === "1" ? t('invoicesHistory.details.vatStandard') : t('invoicesHistory.details.vatNone');
    };

    const totalRender = (_: any, row: DetailRow) => {
      const price =
        row.purchaseprice && row.purchaseprice > 0
          ? row.purchaseprice
          : row.newprice || 0;

      return (row.units * price).toFixed(2);
    };

    switch (type) {
      case "1": // Перемещение
        return [
          ...baseCols,
          { title: t('invoicesHistory.details.quantity'), dataIndex: "units", width: 100 },
          { 
            title: t('invoicesHistory.details.totalAmount'), // "Общая сумма"
            dataIndex: "calculated_total",
            render: totalRender,
            width: 120 
          },
        ];
      case "2": // Приём товара
        return [
          ...baseCols,
          { title: t('invoicesHistory.details.quantity'), dataIndex: "units", width: 100 },
          { 
            title: t('invoicesHistory.details.totalAmount'), 
            dataIndex: "calculated_total",
            render: totalRender,
            width: 120 
          },
          { title: t('invoicesHistory.details.purchasePrice'), dataIndex: "purchaseprice", width: 120 },
          { title: t('invoicesHistory.details.salePrice'), dataIndex: "price", width: 120 },
          { title: t('invoicesHistory.details.piecePrice'), dataIndex: "pieceprice", width: 120 },
          { title: t('invoicesHistory.details.taxCategory'), dataIndex: "taxid", render: taxRender, width: 120 },
          { title: t('invoicesHistory.details.cnofeacode'), dataIndex: "cnofeacode", width: 140 }
        ];

      case "7": // Списание
        return [
          ...baseCols,
          { title: t('invoicesHistory.details.quantity'), dataIndex: "units", width: 100 },
          { 
            title: t('invoicesHistory.details.totalAmount'), 
            dataIndex: "calculated_total",
            render: totalRender,
            width: 120 
          },
          { title: t('invoicesHistory.details.reason'), dataIndex: "reason", width: 150 },
        ];

      case "0": // Смена цен
        return [
          ...baseCols,
          { title: t('invoicesHistory.details.oldPrice'), dataIndex: "oldprice", width: 120 },
          { title: t('invoicesHistory.details.newPrice'), dataIndex: "newprice", width: 120 },
        ];

      case "16": // Консигнация (Отгрузка)
      case "17": // Консигнация (Возврат)
        return [
          ...baseCols,
          { title: t('invoicesHistory.details.quantity'), dataIndex: "units", width: 100 },
          { 
            title: t('invoicesHistory.details.totalAmount'), 
            dataIndex: "calculated_total",
            render: totalRender,
            width: 120 
          },
          { title: t('invoicesHistory.details.taxCategory'), dataIndex: "taxid", render: taxRender, width: 140 },
          { title: t('invoicesHistory.details.salePrice'), dataIndex: "price", width: 120 },
          { title: t('invoicesHistory.details.piecePrice'), dataIndex: "pieceprice", width: 120 },
        ];

      default:
        return baseCols;
    }
  };

  const columns = getColumnsByInvoiceType(invoice.invoicetypeid);

  // --------------------------
  // Итого
  // --------------------------
  const calcTotal = (units: number, price: number | null) => units * (price || 0);

  const totalPurchase = details.reduce(
    (s, r) => s + calcTotal(r.units, r.purchaseprice),
    0
  );

  const totalSelling = details.reduce(
    (s, r) => s + calcTotal(r.units, r.price),
    0
  );

  const totalUnits = details.reduce((s, r) => s + (r.units || 0), 0);
  const totalSum = details.reduce((s, r) => {
    const price =
      r.purchaseprice && r.purchaseprice > 0
        ? r.purchaseprice
        : r.newprice || 0;

    return s + r.units * price;
  }, 0);

  // --------------------------
  // Экспорт Excel
  // --------------------------
  const exportExcel = () => {
    const cols = getColumnsByInvoiceType(invoice.invoicetypeid);

    const ws = XLSX.utils.json_to_sheet(
      details.map((row, i) => {
        const result: any = { [t('invoicesHistory.table.number')]: i + 1 }; // "№"

        cols.slice(1).forEach(c => {
          const key = typeof c.dataIndex === "string" ? c.dataIndex : null;

          if (key === "calculated_total") {
            // Общая сумма
            const price = row.purchaseprice && row.purchaseprice > 0 ? row.purchaseprice : row.newprice || 0;
            result[c.title] = (row.units * price).toFixed(2);
          } else if (key === "taxid") {
            // Налоговая ставка
            result[c.title] = row.taxid === "1" ? t('invoicesHistory.details.vatStandard') : t('invoicesHistory.details.vatNone');
          } else if (key) {
            // Остальные поля
            result[c.title] = (row as any)[key];
          }
        });

        return result;
      })
    );

    const wb = XLSX.utils.book_new();
    // 💡 Используем перевод для названия листа
    XLSX.utils.book_append_sheet(wb, ws, t('invoicesHistory.details.excelSheetName'));
    XLSX.writeFile(wb, "InvoiceDetails.xlsx");
  };


  if (!invoice) return null;

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      title={false}
      width={"90%"}
      footer={false}
    >
      {/* ---------- ШАПКА НАКЛАДНОЙ ----------- */}
      <div className={styles.modalHeader}>
        <Title level={4}>
          {t('invoicesHistory.details.invoiceOf')} {dayjs(invoice.invoicedate).format("DD.MM.YYYY")}
        </Title>

        <Row gutter={[24, 12]}>
          <Col span={6}>
            <Text strong>{t('invoicesHistory.details.type')}</Text>
            <br />
            <Text>{invoice.invoicetype}</Text>
          </Col>

          <Col span={6}>
            <Text strong>
              {/* Логика определения заголовка поля */}
              {invoice.invoicetypeid === "2"
                ? t('invoicesHistory.details.toStockShort') 
                : invoice.invoicetypeid === "1" || invoice.invoicetypeid === "7"
                ? t('invoicesHistory.details.fromStockShort') 
                : t('invoicesHistory.details.stock')} 
            </Text>
            <br />
            <Text>{invoice.stockto || invoice.stockfrom}</Text>
          </Col>

          {(invoice.invoicetypeid === "2" ||
            invoice.invoicetypeid === "16" ||
            invoice.invoicetypeid === "17") && (
            <Col span={6}>
              <Text strong>{t('invoicesHistory.filter.supplier')}</Text> {/* "Поставщик" */}
              <br />
              <Text>
                {invoice.bin ? `${invoice.bin} | ` : ""}
                {invoice.counterparty}
              </Text>
            </Col>
          )}
        </Row>
      </div>

      {/* ---------- ТАБЛИЦА ----------- */}
      <Table
        bordered
        columns={columns}
        dataSource={details}
        rowKey={(row) => row.code}
        loading={loading}
        pagination={false}
        scroll={{ x: "max-content", y: 400 }}
        summary={
          invoice.invoicetypeid === "0"
            ? undefined // ⛔ при смене цен — не показываем "Итого"
            : () => {
                const cols = getColumnsByInvoiceType(invoice.invoicetypeid);

                return (
                  <Table.Summary.Row>
                    {cols.map((col, idx) => {
                      // Ячейка "Итого"
                      if (idx === 0)
                        return (
                          <Table.Summary.Cell index={idx} key={idx}>
                            <strong>{t('invoicesHistory.details.total')}</strong>
                          </Table.Summary.Cell>
                        );

                      // Количество
                      if (col.dataIndex === "units")
                        return (
                          <Table.Summary.Cell index={idx} key={idx}>
                            <strong>{totalUnits}</strong>
                          </Table.Summary.Cell>
                        );

                      // Общая сумма
                      if (col.dataIndex === "calculated_total")
                        return (
                          <Table.Summary.Cell index={idx} key={idx}>
                            <strong>{totalSum.toFixed(2)}</strong>
                          </Table.Summary.Cell>
                        );

                      // Цена закупки
                      if (col.dataIndex === "purchaseprice")
                        return (
                          <Table.Summary.Cell index={idx} key={idx}>
                            <strong>{totalPurchase.toFixed(2)}</strong>
                          </Table.Summary.Cell>
                        );

                      // Цена продажи
                      if (col.dataIndex === "price")
                        return (
                          <Table.Summary.Cell index={idx} key={idx}>
                            <strong>{totalSelling.toFixed(2)}</strong>
                          </Table.Summary.Cell>
                        );

                      // Остальные — пустые
                      return <Table.Summary.Cell index={idx} key={idx}></Table.Summary.Cell>;
                    })}
                  </Table.Summary.Row>
                );
              }
        }
      />

      <div className={styles.modalFooter}>
        <Button onClick={exportExcel}>{t('invoicesHistory.button.export')}</Button>
      </div>
    </Modal>
  );
};

export default InvoiceDetailsModal;