import React, { useState, useEffect } from 'react';
import { 
  Table, Button, DatePicker, Select, Card, Space, Modal, Input, message, Row, Col, Divider , Typography
} from 'antd';
import { 
  FileExcelOutlined, 
  FileSearchOutlined, 
  InfoCircleOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../hooks/useApiRequest';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx'; // Для экспорта в Excel
import styles from './DebtReport.module.css';

const { Title } = Typography;

// --- Типы данных ---
interface DebtCustomer {
  id: string;
  name: string;
  telephone: string;
  customertype: number;
  debt: number;
  credit: number;
  debit: number;
}

interface TicketDetail {
  id: string;
  price: number;
  date: string;
  tickettype: string;
  debttype: number;
  debt: number;
}

const DebtReport: React.FC = () => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  // Фильтры
  const [filterDate, setFilterDate] = useState(dayjs());
  const [clientType, setClientType] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DebtCustomer[]>([]);

  const [historyLoading, setHistoryLoading] = useState(false);

  // Модалка погашения
  const [repayModalVisible, setRepayModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<DebtCustomer | null>(null);
  const [repayAmount, setRepayAmount] = useState<string>('');

  // Модалка истории чеков (уровень 2)
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyData, setHistoryData] = useState<TicketDetail[]>([]);
  const [historyPeriod, setHistoryPeriod] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().subtract(1, 'month'), dayjs()]);

  // Модалка чека (уровень 3)
  const [ticketDetailVisible, setTicketDetailVisible] = useState(false);
  const [ticketInfo, setTicketInfo] = useState<any>(null);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  // 1. Загрузка основного списка
  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/report/fizcustomers/debt_book?date=${filterDate.format('YYYY-MM-DD')}`;
      if (clientType === '0') url += '&clientType=0';
      if (clientType === '1') url += '&clientType=1';

      const response = await sendRequest(url, { headers: getHeaders() });
      setData(response);
    } catch (err) {
      message.error(t('report.debt.loadError'));
    } finally {
      setLoading(false);
    }
  };

  // 2. Погашение долга (POST)
  const handleRepay = async () => {
    if (!selectedCustomer || !repayAmount) return;
    try {
      await sendRequest(`${API_URL}/api/report/fizcustomers/writeoff_debt`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          writeoff_debt_customers: {
            id: selectedCustomer.id,
            debt: repayAmount,
            user: localStorage.getItem('userId') || "2", // или из контекста пользователя
            clientType: selectedCustomer.customertype
          }
        })
      });
      message.success(t('report.debt.repaySuccess'));
      setRepayModalVisible(false);
      fetchData(); // обновить таблицу
    } catch (err) {
      message.error(t('report.debt.repayError'));
    }
  };

  // 3. История чеков
  const fetchHistory = async (customer: DebtCustomer) => {
    setSelectedCustomer(customer);
    try {
      const url = `${API_URL}/api/report/customers/details?dateFrom=${historyPeriod[0].format('YYYY-MM-DD')}&dateTo=${historyPeriod[1].format('YYYY-MM-DD')}&customer=${customer.id}&clientType=0`;
      const response = await sendRequest(url, { headers: getHeaders() });
      setHistoryData(response);
      setHistoryModalVisible(true);
    } catch (err) {
      message.error(t('report.debt.historyError'));
    }
  };

  // 1. Открываем модальное окно истории (без запроса)
  const handleOpenHistory = (customer: DebtCustomer) => {
    setSelectedCustomer(customer);
    setHistoryData([]); // Очищаем таблицу перед новым поиском
    setHistoryModalVisible(true);
  };

  // 2. Выполняем запрос истории внутри модального окна
  const loadHistoryData = async () => {
    if (!selectedCustomer) return;
    setHistoryLoading(true);
    try {
      const url = `${API_URL}/api/report/customers/details?dateFrom=${historyPeriod[0].format('YYYY-MM-DD')}&dateTo=${historyPeriod[1].format('YYYY-MM-DD')}&customer=${selectedCustomer.id}&clientType=${selectedCustomer.customertype}`;
      const response = await sendRequest(url, { headers: getHeaders() });
      setHistoryData(response);
    } catch (err) {
      message.error(t('report.debt.historyError'));
    } finally {
      setHistoryLoading(false);
    }
  };

  // 4. Детали конкретного чека
  const fetchTicketFullInfo = async (transactionId: string) => {
    try {
      const response = await sendRequest(`${API_URL}/api/report/transactions/fulldetails?transactionid=${transactionId}&holding=true`, { headers: getHeaders() });
      setTicketInfo(response);
      setTicketDetailVisible(true);
    } catch (err) {
      message.error(t('report.debt.ticketDetailError'));
    }
  };

  // Экспорт в Excel
  const exportToExcel = (dataSource: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(dataSource);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const columns: ColumnsType<DebtCustomer> = [
    { title: 'Фамилия Имя', dataIndex: 'name' },
    { title: 'Телефон', dataIndex: 'telephone' },
    { title: 'Покупка в долг', dataIndex: 'credit', render: (val) => Math.abs(val) },
    { title: 'Погашение', dataIndex: 'debit' },
    { title: 'Текущий долг', dataIndex: 'debt', render: (val) => <b style={{color: val > 0 ? 'red' : 'green'}}>{val}</b> },
    { 
      title: 'Списание', 
      key: 'action', 
      render: (_, record) => (
        <Button size="small" onClick={() => { setSelectedCustomer(record); setRepayModalVisible(true); }}>
          Погасить
        </Button>
      )
    },
    {
      title: 'Чеки',
      key: 'tickets',
      render: (_, record) => (
       <Button icon={<FileSearchOutlined />} onClick={() => handleOpenHistory(record)} />
      )
    }
  ];

  return (
    <div className={styles.container}>
        <Title level={2}>Отчёт по долгам</Title>
      <Card className={styles.filterCard}>
        <Space wrap>
          <DatePicker value={filterDate} onChange={(d) => d && setFilterDate(d)} />
          <Select value={clientType} onChange={setClientType} style={{ width: 200 }}>
            <Select.Option value="all">Все</Select.Option>
            <Select.Option value="0">Физические лица</Select.Option>
            {/* <Select.Option value="1">Юридические лица</Select.Option> */}
          </Select>
          <Button type="primary" onClick={fetchData} loading={loading}>Показать</Button>
          <Button icon={<FileExcelOutlined />} onClick={() => exportToExcel(data, 'DebtReport')}>Экспорт</Button>
        </Space>
      </Card>

      <Table 
        dataSource={data} 
        columns={columns} 
        rowKey="id" 
        loading={loading} 
        scroll={{ x: 'max-content' }}
      />

      {/* Модалка 1: Погашение долга */}
      <Modal
        title="Погашение долга"
        open={repayModalVisible}
        onCancel={() => setRepayModalVisible(false)}
        onOk={handleRepay}
        okText="Погасить долг"
        cancelText="Закрыть"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div><b>Клиент:</b> {selectedCustomer?.name}</div>
          <div><b>Номер телефона:</b> {selectedCustomer?.telephone}</div>
          <div><b>Долг:</b> {selectedCustomer?.debt}</div>
          <Input 
            type="number" 
            placeholder="Сумма списания" 
            value={repayAmount}
            onChange={(e) => setRepayAmount(e.target.value.replace(/\D/g, ''))}
          />
        </Space>
      </Modal>

      {/* Модалка 2: История чеков */}
      <Modal
        title={`История чеков: ${selectedCustomer?.name}`}
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        width={800}
        zIndex={3500}
        footer={[
          <Button key="excel" icon={<FileExcelOutlined />} onClick={() => exportToExcel(historyData, 'History')}>Экспорт</Button>,
          <Button key="close" onClick={() => setHistoryModalVisible(false)}>Закрыть</Button>
        ]}
      >
        <Space style={{ marginBottom: 16 }}>
          <DatePicker.RangePicker 
            value={historyPeriod} 
            onChange={(dates) => dates && setHistoryPeriod([dates[0]!, dates[1]!])} 
          />
          <Button onClick={() => selectedCustomer && fetchHistory(selectedCustomer)}>Показать</Button>
        </Space>
        <Table 
          dataSource={historyData} 
          rowKey="id"
          pagination={{ pageSize: 5 }}
          columns={[
            { title: 'Дата', dataIndex: 'date', render: (d) => dayjs(d).format('DD.MM.YYYY HH:mm') },
            { title: 'Номер чека', dataIndex: 'id' },
            { title: 'Тип', dataIndex: 'tickettype' },
            { title: 'Сумма чека', dataIndex: 'price' },
            { title: 'Сумма долга', dataIndex: 'debt' },
            { title: 'Детали', render: (_, r) => <Button icon={<InfoCircleOutlined />} onClick={() => fetchTicketFullInfo(r.id)} /> }
          ]}
        />
      </Modal>

      {/* Модалка 3: Детальный чек */}
      <Modal
        title="Детали чека"
        open={ticketDetailVisible}
        onCancel={() => setTicketDetailVisible(false)}
        footer={null}
        width={400}
      >
        {ticketInfo && (
          <div className={styles.receipt}>
            <div style={{ textAlign: 'center' }}>
              <h3>Чек</h3>
              <p>Покупка {dayjs(ticketInfo.date).format('D MMMM YYYY HH:mm:ss')}</p>
            </div>
            <Divider />
            <Row>
              <Col span={12}>Клиент:</Col><Col span={12} style={{textAlign: 'right'}}>{ticketInfo.customertype === "0" ? 'Физ. лицо' : 'Юр. лицо'}</Col>
              <Col span={12}>Кассир:</Col><Col span={12} style={{textAlign: 'right'}}>{ticketInfo.cashier}</Col>
              <Col span={12}>Точка:</Col><Col span={12} style={{textAlign: 'right'}}>{ticketInfo.pointname}</Col>
              <Col span={12}>Касса:</Col><Col span={12} style={{textAlign: 'right'}}>{ticketInfo.cashboxname}</Col>
              <Col span={12}>ФИО:</Col><Col span={12} style={{textAlign: 'right'}}>{ticketInfo.fio}</Col>
            </Row>
            <Divider />
            <table style={{ width: '100%' }}>
              <thead>
                <tr style={{ fontSize: '12px', borderBottom: '1px solid #eee' }}>
                  <th>Наименование</th>
                  <th>Кол.</th>
                  <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {ticketInfo.details.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{ fontSize: '12px' }}>{item.name}</td>
                    <td>{item.units} x {item.price}</td>
                    <td style={{ textAlign: 'right' }}>{item.totalprice} ₸</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Divider />
            <Row className={styles.receiptRow}>
               <Col span={18}>Итого сумма:</Col><Col span={6} className={styles.right}>{ticketInfo.price} ₸</Col>
               <Col span={18}>Скидка:</Col><Col span={6} className={styles.right}>{ticketInfo.total_discount} ₸</Col>
               <Col span={18}>В долг:</Col><Col span={6} className={styles.right}><b>{ticketInfo.debtpay} ₸</b></Col>
               <Col span={18}>НДС:</Col><Col span={6} className={styles.right}>{ticketInfo.details[0]?.nds} ₸</Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DebtReport;