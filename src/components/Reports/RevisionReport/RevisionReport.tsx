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


import useApiRequest from "../../../hooks/useApiRequest";
import RevisionDetailsModal from "./RevisionDetailsModal";
import styles from './RevisionReport.module.css'; 

const { Option } = Select;

// 💡 Типизация строки данных
interface RevisionRow {
  
  revisionnumber: string;  
  point: string;  
  createdate: string;  
  admin: string;  
  status: string;  
  submitdate: string;  
  name: string;  
  type: number;  
  type_name: string;  
  username: string;
}



const RevisionReport: React.FC = () => {
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
  

  const [points, setPoints] = useState<any[]>([]);  
  const [selectedPoint, setSelectedPoint] = useState("");

  const [data, setData] = useState<RevisionRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Модальное окно
  const [modalVisible, setModalVisible] = useState(false);
  const [modalInvoice, setModalInvoice] = useState<RevisionRow | null>(null);

  // ------------------------------------------------------------
  // Загружаем справочники
  // ------------------------------------------------------------
  useEffect(() => {
   
    loadPoint();
    
  }, [API_URL, sendRequest, t]);


 const loadPoint = async () => {
    const res = await sendRequest(`${API_URL}/api/point`, {
      headers: getHeaders(),
    });
    setPoints(res);
  };

  

  // ------------------------------------------------------------
  // Загрузка отчёта
  // ------------------------------------------------------------
  const handleSearch = async () => {
    setLoading(true);
    try {
      const url = `${API_URL}/api/report/revision?` +
        `pointid=${selectedPoint || ""}` ;

      const res = await sendRequest(url, { headers: getHeaders() });
      setData(res);
     
    } catch (err) {
      console.error(err);
      message.error(t('revisionReport.loadError'));
    }
    setLoading(false);
  };

  // ------------------------------------------------------------
  // Колонки таблицы
  // ------------------------------------------------------------
  const openDetailsButton = (row: RevisionRow) => (
    <Button
      type="link"
      onClick={() => openDetails(row)}
      icon={<PlayCircleOutlined />}
      className={styles.playButton}
    />
  );

  
  // 💡 Явная типизация возвращаемого типа
  const getColumns = (): ColumnsType<RevisionRow> => {
    const base: ColumnsType<RevisionRow> = [
      {
        title: t('revisionReport.table.number'),
        render: (_: any, __: any, i: number) => i + 1,
      },
      {
        title: t('revisionReport.table.revisionnumber'),
        dataIndex: "revisionnumber",
        
      },
      {
        title: t('revisionReport.table.username'),
        dataIndex: "username",
       
      },
      {
        title: t('revisionReport.table.type_name'),
        dataIndex: "type_name",
       
      },
      {
        title: t('revisionReport.table.createdate'),
        render: (row: RevisionRow) => {
          const d = dayjs(row.createdate).format("DD.MM.YYYY HH:mm:ss");
          return `${d}`;
        },
      },
      {
        title: t('revisionReport.table.submitdate'),
        render: (row: RevisionRow) => {
          const d = dayjs(row.submitdate).format("DD.MM.YYYY HH:mm:ss");
          return `${d}`;
        },
      },
    ];

    
    // Сборка колонок
    return [
      ...base,
      
      {
        title: "",
        render: (row: RevisionRow) => openDetailsButton(row),
      },
    ] as ColumnsType<RevisionRow>; // 💡 Приведение типа
  };

  // ------------------------------------------------------------
  // Экспорт в Excel
  // ------------------------------------------------------------
  const convertRowToExcel = (row: RevisionRow, index: number) => {
    const mapped: any = {};

    getColumns().forEach((col: any) => {
      if (!col.title) return;

      if (col.dataIndex) {
          // Если есть dataIndex, берем значение напрямую
          mapped[col.title] = row[col.dataIndex as keyof RevisionRow]; 
      }
      else {
        if (col.title === t('revisionReport.table.number')) {
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
    XLSX.utils.book_append_sheet(wb, ws, t('revisionReport.sheetName')); 
    XLSX.writeFile(wb, "revisionReport.xlsx");
  };

  // ------------------------------------------------------------
  // Модальное окно
  // ------------------------------------------------------------
  const openDetails = (row: RevisionRow) => {
    setModalInvoice(row);
    setModalVisible(true);
  };

  return (
    <div>
      <h2 className={styles.reportTitle}>
        {t('revisionReport.reportTitle')}
      </h2>

  {/* ================= ФИЛЬТРЫ ================= */}
  <Row gutter={[16, 12]} align="bottom">
    
    

    
    {(
      <Col span={12}>
        <div className={styles.filterLabel}>{t('revisionReport.filter.point')}</div>
        <Select
          className={styles.fullWidthControl}
          value={selectedPoint}
          onChange={setSelectedPoint}
        >
           {points.map((s) => (
            <Option key={s.id} value={s.id}>
              {s.name}
            </Option>
          ))}
        </Select>
      </Col>
    )}

    

    {/* Кнопки */}
    <Col span={12}>
      <Button type="primary" onClick={handleSearch} className={styles.searchButton}>
        {t('revisionReport.button.search')}
      </Button>
    </Col>

    <Col span={12}>
      <Button onClick={exportExcel} className={styles.exportButton}>
        {t('revisionReport.button.export')}
      </Button>
    </Col>
  </Row>


      {/* =================== ТАБЛИЦА =================== */}
      <Table<RevisionRow> 
        columns={getColumns()}
        dataSource={data}
        rowKey={(r) => r.revisionnumber}
        loading={loading}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 'max-content' }} 
        className={styles.reportTable}
      />

      {/* =================== МОДАЛКА =================== */}
      {modalInvoice && (
        <RevisionDetailsModal
          visible={modalVisible}
          invoice={modalInvoice}
          onClose={() => setModalVisible(false)}
        />
      )}
    </div>
  );
};

export default RevisionReport;