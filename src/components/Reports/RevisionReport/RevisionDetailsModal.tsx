import React, { useEffect, useState } from "react";
import { Modal, Table, Button, Row, Col, Typography, message } from "antd";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next"; // 💡 Импорт
import useApiRequest from "../../../hooks/useApiRequest";
import styles from './RevisionReport.module.css'; 

const { Title, Text } = Typography;

interface RevisionDetailsModalProps {
  visible: boolean;
  invoice: any;
  onClose: () => void;
}



interface DetailRow {
 
  id: string;
  code: string;
  name: string;
  attributes: string;
  attributescaption: string;
  unitswas: number;
  units: number;
  price: number;
  left_cost: number;
  diff: number;
  diff_price: number;
  revisiondate: string;
  outofrevision: number;
  comment?: string; 
}

const RevisionDetailsModal: React.FC<RevisionDetailsModalProps> = ({
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
        `${API_URL}/api/report/revision/details?` +
        `revisionnumber=${invoice.revisionnumber}&&parametr=2&onlyDiff=0`;

      const res = await sendRequest(url, { headers: getHeaders() });
      setDetails(res);
    } catch (err) {
      console.error(err);
      // 💡 Добавляем сообщение об ошибке
      message.error(t('revisionReport.loadDetailsError'));
    }
    setLoading(false);
  };

  // --------------------------
  // Колонки таблицы
  // --------------------------
  const getColumnsByInvoiceType = () => {
    const baseCols = [
      
      {
                title: t('revisionReport.table.number'), 
                render: (_: any, __: any, i: number) => i + 1,
                width: 60,
            },
            { 
                title: t('revisionReport.details.productName'), // Товар
                dataIndex: "name", 
                width: 250 
            },
            { 
                title: t('revisionReport.details.unitsWas'), // До ревизии
                dataIndex: "unitswas", 
                width: 120 
            },
            { 
                title: t('revisionReport.details.units'), // После ревизии
                dataIndex: "units", 
                width: 120 
            },
            { 
                title: t('revisionReport.details.price'), // Цена реализации
                dataIndex: "price", 
                width: 120 
            },
            { 
                title: t('revisionReport.details.leftCost'), // Остаток (Стоимость после ревизии)
                dataIndex: "left_cost", 
                width: 120 
            },
            { 
                title: t('revisionReport.details.diffUnits'), // Разница в шт.
                dataIndex: "diff", 
                width: 100 
            },
            { 
                title: t('revisionReport.details.diffPrice'), // Разница (в стоимости)
                dataIndex: "diff_price", 
                width: 120 
            },
            { 
                title: t('revisionReport.details.revisionDate'), // Время проведения ревизии
                dataIndex: "revisiondate", 
                width: 160,
                render: (date: string) => dayjs(date).format("DD.MM.YYYY HH:mm")
            },
            { 
                title: t('revisionReport.details.comment'), // Комментарий (если поле добавлено)
                dataIndex: "comment", 
                width: 150 
            } ];

    
        return baseCols;
   
};

const columns = getColumnsByInvoiceType();


  // --------------------------
  // Итого
  // --------------------------
 const totalUnitsWas = details.reduce((s, r) => s + (r.unitswas || 0), 0);
const totalUnits = details.reduce((s, r) => s + (r.units || 0), 0);
// Цена реализации обычно не суммируется, но если нужно, то:
const totalPrice = details.reduce((s, r) => s + (r.price || 0), 0); 
const totalLeftCost = details.reduce((s, r) => s + (r.left_cost || 0), 0);
const totalDiffUnits = details.reduce((s, r) => s + (r.diff || 0), 0);
const totalDiffPrice = details.reduce((s, r) => s + (r.diff_price || 0), 0);

// --------------------------
  // Экспорт Excel
  // --------------------------
  const exportExcel = () => {
    // 💡 Передаем ID типа накладной, чтобы получить нужный набор колонок
    const invoiceType = invoice.invoicetypeid;
    const cols = getColumnsByInvoiceType();

    const ws = XLSX.utils.json_to_sheet(
      details.map((row, i) => {
        // Начинаем с номера строки
        const result: any = { [t('revisionReport.table.number')]: i + 1 }; // "№"

        // Итерируем по колонкам, чтобы получить заголовки
        cols.slice(1).forEach(c => {
          const key = typeof c.dataIndex === "string" ? c.dataIndex : null;
          const value = (row as any)[key!]; // Получаем исходное значение по ключу

          if (key) {
            
            
                // Все поля ревизии (unitswas, diff, diff_price, left_cost и т.д.) 
                // экспортируются напрямую, кроме форматирования времени.
                
                if (key === "revisiondate") {
                    // Форматируем дату
                    result[c.title] = dayjs(value).format("DD.MM.YYYY HH:mm");
                } else if (key === "name" || key === "code" || key === "comment") {
                    // Строковые поля
                    result[c.title] = value || '';
                }
                else {
                    // Числовые поля (unitswas, units, diff, price, left_cost и т.д.)
                    result[c.title] = value; 
                }
            }
         
        });

        return result;
      })
    );

    const wb = XLSX.utils.book_new();
    // 💡 Используем перевод для названия листа. Если это ревизия, можно использовать отдельный ключ.
    const sheetNameKey =  'revisionReport.details.revisia';
    
    XLSX.utils.book_append_sheet(wb, ws, t(sheetNameKey));
    XLSX.writeFile(wb, "revisionReportDetails.xlsx");
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
          {t('revisionReport.details.revisia')} {invoice.revisionnumber}
        </Title>

        <Row gutter={[24, 12]}>
          <Col span={6}>
            <Text strong>{t('revisionReport.details.revisor')}</Text>
            <br />
            <Text>{invoice.username}</Text>
          </Col>

          <Col span={6}>
            <Text strong>
              {t('revisionReport.details.createDate')}
            </Text>
            <br />
            <Text>{dayjs(invoice.createdate).format("DD.MM.YYYY")}</Text>
          </Col>

          
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
        summary={() => {
         
                const cols = getColumnsByInvoiceType();

// Определяем, сколько колонок нужно объединить для "Итого"
// Индекс 'unitswas' равен 2 (№, Товар, unitswas)
const indexOfUnitsWas = cols.findIndex(c => c.dataIndex === "unitswas");
// Нам нужно объединить все, что предшествует 'unitswas' (№ и Товар)
const colSpanForTotalLabel = indexOfUnitsWas > 0 ? indexOfUnitsWas : 1; 


return (
  <Table.Summary.Row>
    {cols.map((col, idx) => {
      // 1. Первая ячейка: "Итого" и объединение колонок
      if (idx === 0) {
        return (
          <Table.Summary.Cell 
            index={idx} 
            key={idx} 
            colSpan={colSpanForTotalLabel} // Объединяем "№" и "Товар"
          >
            <strong>{t('revisionReport.details.total')}</strong>
          </Table.Summary.Cell>
        );
      }
      
      // 2. Пропускаем ячейки, которые были объединены (если colSpan > 1)
      if (idx > 0 && idx < colSpanForTotalLabel) {
         return null; // Важно пропустить остальные ячейки, которые вошли в colSpan
      }
      
      // 3. Вывод сумм в соответствующие ячейки
      
      // До ревизии
      if (col.dataIndex === "unitswas")
        return (
          <Table.Summary.Cell index={idx} key={idx}>
            <strong>{totalUnitsWas}</strong>
          </Table.Summary.Cell>
        );

      // После ревизии
      if (col.dataIndex === "units")
        return (
          <Table.Summary.Cell index={idx} key={idx}>
            <strong>{totalUnits}</strong>
          </Table.Summary.Cell>
        );

       if (col.dataIndex === "price")
        return (
          <Table.Summary.Cell index={idx} key={idx}>
            <strong>{totalPrice}</strong>
          </Table.Summary.Cell>
        );  
        
      // Остаток (Стоимость после ревизии)
      if (col.dataIndex === "left_cost")
        return (
          <Table.Summary.Cell index={idx} key={idx}>
            <strong>{totalLeftCost.toFixed(2)}</strong>
          </Table.Summary.Cell>
        );
        
      // Разница в шт.
      if (col.dataIndex === "diff")
        return (
          <Table.Summary.Cell index={idx} key={idx}>
            <strong>{totalDiffUnits}</strong>
          </Table.Summary.Cell>
        );
        
      // Разница (в стоимости)
      if (col.dataIndex === "diff_price")
        return (
          <Table.Summary.Cell index={idx} key={idx}>
            <strong>{totalDiffPrice.toFixed(2)}</strong>
          </Table.Summary.Cell>
        );
        
      // Остальные ячейки (Цена реализации, Время проведения, Комментарий)
      return <Table.Summary.Cell index={idx} key={idx}></Table.Summary.Cell>;
    })}
  </Table.Summary.Row>
);
              
        }}
      />

      <div className={styles.modalFooter}>
        <Button onClick={exportExcel}>{t('revisionReport.button.export')}</Button>
      </div>
    </Modal>
  );
};

export default RevisionDetailsModal;