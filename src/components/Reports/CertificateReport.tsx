import React, { useState, useEffect } from 'react';
import { Tabs, Table, Button, Modal, Select, message, Space, Card, Tag } from 'antd';
import { InfoCircleOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs, { Dayjs } from 'dayjs';
import useApiRequest from '../../hooks/useApiRequest';
import DateRangePickerSafe from '../DateRangePickerSafe';
import * as XLSX from 'xlsx';
import styles from "./CertificateReport.module.css";

// Интерфейсы
interface SoldCert { id: string; nominal: number; sell_date: string; shelflife: string; status: string; }
interface UsedCert { id: string; nominal: number; use_date: string; tr_id: string; }
interface StatusCert { id: string; code: string; denomination: number; expiredate: string | null; type: string; selldate: string | null; status: string; }
interface WriteOffCert { id: number; code: string; denomination: number; balance: number; date: string; }

const API_URL = import.meta.env.VITE_API_URL || '';

const CertificateReport: React.FC = () => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();
  
  // Состояния
  const [dates, setDates] = useState<[Dayjs | null, Dayjs | null]>([dayjs().startOf('month'), dayjs()]);
  const [activeTab, setActiveTab] = useState('sold');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const getStatusStyle = (isGood: boolean) => ({
    color: isGood ? '#52c41a' : '#ff4d4f',
    backgroundColor: isGood ? '#f6ffed' : '#fff1f0',
    borderColor: isGood ? '#b7eb8f' : '#ffa39e',
  });
  
  // Состояния для модалок
  const [trDetails, setTrDetails] = useState<any>(null);
  const [isTrModalOpen, setIsTrModalOpen] = useState(false);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [stocks, setStocks] = useState<any[]>([]);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [selectedWriteOffKeys, setSelectedWriteOffKeys] = useState<React.Key[]>([]);

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  // Основная функция загрузки данных
  const fetchData = async () => {
    setLoading(true);
    const dateFrom = dates[0]?.format('DD.MM.YYYY');
    const dateTo = dates[1]?.format('DD.MM.YYYY');
    
    let endpoint = '';
    if (activeTab === 'sold') endpoint = `/api/report/certificates/sold?dateFrom=${dateFrom}&dateTo=${dateTo}`;
    else if (activeTab === 'used') endpoint = `/api/report/certificates/used?dateFrom=${dateFrom}&dateTo=${dateTo}`;
    else if (activeTab === 'status') endpoint = `/api/giftcertificates`;
    else if (activeTab === 'writeoff') endpoint = `/api/giftcertificates/writeofflist`;

    try {
      const response = await sendRequest(`${API_URL}${endpoint}`, { headers: getHeaders() });
      setData(response || []);
    } catch (err) {
      console.error(err);
      message.error(t('reports.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, dates]);

  // Детали транзакции (Чек)
  const fetchTransactionDetails = async (trId: string) => {
    try {
      const details = await sendRequest(
        `${API_URL}/api/report/transactions/fulldetails?transactionid=${trId}&holding=false`,
        { headers: getHeaders() }
      );
      setTrDetails(details);
      setIsTrModalOpen(true);
    } catch (err) {
      message.error(t('reports.transactionLoadError'));
    }
  };

  // Активация сертификата
  const activateCertificate = async () => {
    if (!selectedStock || !selectedCert) return;
    try {
      const res = await sendRequest(`${API_URL}/api/giftcertificates/activate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ point: selectedStock, id: selectedCert.id }),
      });
      message.success(t('reports.activationSuccess'));
      setIsActivateModalOpen(false);
      fetchData();
    } catch (err) {
      message.error(t('reports.activationError'));
    }
  };

  const exportToExcel = () => {
  if (!data || data.length === 0) {
    message.warning(t('reports.noDataToExport'));
    return;
  }

  // Создаем массив данных с переведенными ключами
  const excelData = data.map((item) => {
    // В зависимости от активной вкладки формируем свой набор колонок
    if (activeTab === 'sold') {
      return {
        [t('reports.certId')]: item.id,
        [t('reports.nominal')]: item.nominal,
        [t('reports.sellDate')]: item.sell_date ? dayjs(item.sell_date).format('DD.MM.YYYY HH:mm') : '',
        [t('reports.shelfLife')]: item.shelflife ? dayjs(item.shelflife).format('DD.MM.YYYY') : '',
        [t('reports.status')]: item.status,
      };
    }
    
    if (activeTab === 'used') {
      return {
        [t('reports.certId')]: item.id,
        [t('reports.nominal')]: item.nominal,
        [t('reports.useDate')]: item.use_date ? dayjs(item.use_date).format('DD.MM.YYYY HH:mm') : '',
        [t('reports.transactionId')]: item.tr_id, // Добавьте ключ в переводы
      };
    }

    if (activeTab === 'status') {
      return {
        [t('reports.certId')]: item.code,
        [t('reports.type')]: item.type,
        [t('reports.nominal')]: item.denomination,
        [t('reports.sellDate')]: item.selldate ? dayjs(item.selldate, 'DD.MM.YYYY').format('DD.MM.YYYY') : '',
        [t('reports.status')]: item.status,
      };
    }

    if (activeTab === 'writeoff') {
      return {
        [t('reports.code')]: item.code,
        [t('reports.nominal')]: item.denomination,
        [t('reports.balance')]: item.balance,
        [t('reports.remainingDate')]: item.date,
      };
    }

    return item;
  });

  // Генерация файла
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, t(`reports.tabs.${activeTab}`));

  // Имя файла тоже можно перевести
  const fileName = `${t('reports.certificateReportTitle')}_${dayjs().format('DD_MM_YYYY')}.xlsx`;
  
  XLSX.writeFile(workbook, fileName);
};

  // Списание остатков
  const handleWriteOff = async () => {
    try {
      const res = await sendRequest(`${API_URL}/api/giftcertificates/writeoff`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ writeoff: { id: selectedWriteOffKeys } }),
      });
      if (res.code === "success") {
        message.success(t('reports.writeOffSuccess'));
        setSelectedWriteOffKeys([]);
        fetchData();
      }
    } catch (err) {
      message.error(t('reports.writeOffError'));
    }
  };

  // Колонки
  const columnsSold = [
    { title: t('reports.certId'), dataIndex: 'id' },
    { title: t('reports.nominal'), dataIndex: 'nominal' },
    { title: t('reports.sellDate'), dataIndex: 'sell_date', render: (val: any) => dayjs(val).format('DD.MM.YYYY HH:mm') },
    { title: t('reports.shelfLife'), dataIndex: 'shelflife', render: (val: any) => dayjs(val).format('DD.MM.YYYY') },
    /* { title: t('reports.status'), dataIndex: 'status' }, */
    { 
    title: t('reports.status'), 
    dataIndex: 'status', 
    render: (status: string) => {
      // Проверяем на активность
      const isActive = status === "Активен" || status === "Продан (Активен)";
      return (
        <Tag 
          style={{
            color: isActive ? '#52c41a' : '#ff4d4f',
            backgroundColor: isActive ? '#f6ffed' : '#fff1f0',
            borderColor: isActive ? '#b7eb8f' : '#ffa39e',
            fontWeight: '500'
          }}
        >
          {status}
        </Tag>
      );
    } 
  },
  ];

  const columnsUsed = [
    { title: t('reports.certId'), dataIndex: 'id' },
    { title: t('reports.nominal'), dataIndex: 'nominal' },
    { title: t('reports.useDate'), dataIndex: 'use_date', render: (val: any) => dayjs(val).format('DD.MM.YYYY HH:mm') },
    { 
      title: t('reports.details'), 
      render: (rec: any) => (
        <Button icon={<InfoCircleOutlined />} onClick={() => fetchTransactionDetails(rec.tr_id)} />
      ) 
    },
  ];

  const columnsStatus = [
    { title: t('reports.certId'), dataIndex: 'code' },
    { title: t('reports.type'), dataIndex: 'type' },
    { title: t('reports.nominal'), dataIndex: 'denomination' },
    /* { title: t('reports.sellDate'), dataIndex: 'selldate', render: (val: any) => val ? dayjs(val).format('DD.MM.YYYY') : '-' },
    { title: t('reports.shelfLife'), dataIndex: 'expiredate', render: (val: any) => val ? dayjs(val).format('DD.MM.YYYY') : '-' },
     */
    { 
    title: t('reports.sellDate'), 
    dataIndex: 'selldate', 
    render: (val: any) => {
      if (!val) return '-';
      // Явно указываем формат входящей строки 'DD.MM.YYYY'
      const d = dayjs(val, 'DD.MM.YYYY'); 
      return d.isValid() ? d.format('DD.MM.YYYY') : val;
    } 
  },
  { 
    title: t('reports.shelfLife'), 
    dataIndex: 'expiredate', 
    render: (val: any) => {
      if (!val) return '-';
      const d = dayjs(val, 'DD.MM.YYYY');
      return d.isValid() ? d.format('DD.MM.YYYY') : val;
    }
  },
    { 
    title: t('reports.status'), 
    dataIndex: 'status', 
    render: (status: string) => {
  const isAvailable = status === "Доступен для продажи";
  return (
    <Tag 
      style={{
        color: isAvailable ? '#52c41a' : '#ff4d4f',          // Цвет текста
        backgroundColor: isAvailable ? '#f6ffed' : '#fff1f0', // Цвет фона
        borderColor: isAvailable ? '#b7eb8f' : '#ffa39e',     // Цвет рамки
      }}
    >
      {status}
    </Tag>
  );
}
  },
    { 
      title: t('reports.actions'), 
      render: (rec: any) => rec.status === "Доступен для продажи" && (
        <Button type="link" onClick={async () => {
          setSelectedCert(rec);
          const stockList = await sendRequest(`${API_URL}/api/stock`, { headers: getHeaders() });
          setStocks(stockList);
          setIsActivateModalOpen(true);
        }}>{t('reports.activate')}</Button>
      )
    },
  ];

  const columnsWriteOff = [
    { title: t('reports.certId'), dataIndex: 'code' },
    { title: t('reports.nominal'), dataIndex: 'denomination' },
    { title: t('reports.balance'), dataIndex: 'balance' },
    { title: t('reports.remainingDate'), dataIndex: 'date' },
  ];

  return (
    <Card title={t('reports.certificateReportTitle')}>
      <Space className={styles.toolbar}>
        <DateRangePickerSafe value={dates} onChange={(val: any) => setDates(val)} />
        <Button onClick={exportToExcel} icon={<FileExcelOutlined />}>{t('reports.exportExcel')}</Button>
        {activeTab === 'writeoff' && selectedWriteOffKeys.length > 0 && (
          <Button type="primary" danger onClick={handleWriteOff}>{t('reports.writeOff')}</Button>
        )}
      </Space>

      <Tabs  activeKey={activeTab} onChange={setActiveTab} items={[
        { key: 'sold', label: t('reports.tabs.sold'), children: <Table loading={loading} dataSource={data} columns={columnsSold} rowKey="id" /> },
        { key: 'used', label: t('reports.tabs.used'), children: <Table loading={loading} dataSource={data} columns={columnsUsed} rowKey="id" /> },
        { key: 'status', label: t('reports.tabs.status'), children: <Table loading={loading} dataSource={data} columns={columnsStatus}  scroll={{ x: 'max-content' }} rowKey="id" /> },
        { 
          key: 'writeoff', 
          label: t('reports.tabs.writeoff'), 
          children: <Table 
            loading={loading}
            rowSelection={{ selectedRowKeys: selectedWriteOffKeys, onChange: setSelectedWriteOffKeys }}
            dataSource={data} 
            columns={columnsWriteOff} 
            rowKey="id" 
          /> 
        },
      ]} />

      {/* Модалка Чек */}
      {/* <Modal 
        title={t('reports.receiptTitle')} 
        open={isTrModalOpen} 
        onCancel={() => setIsTrModalOpen(false)} 
        footer={null}
        width={450}
      >
        {trDetails && (
          <div style={{ padding: '10px', backgroundColor: '#f9f9f9', fontFamily: 'monospace' }}>
            <h3 style={{ textAlign: 'center' }}>Чек</h3>
            <p>Покупка {dayjs(trDetails.date).format('DD.MM.YYYY HH:mm')}</p>
            <p>Кассир: {trDetails.cashier}</p>
            <p>Точка: {trDetails.pointname}</p>
            <p>Касса: {trDetails.cashboxname}</p>
            <hr />
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th align="left">Наименование</th>
                  <th align="right">Кол х Цена</th>
                  <th align="right">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {trDetails.details.map((d: any, i: number) => (
                  <tr key={i}>
                    <td>{d.name}</td>
                    <td align="right">{d.units} x {d.price}</td>
                    <td align="right">{d.totalprice} </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <hr />
            <p>Итого к оплате: {trDetails.price} </p>
            <p>Сертификатом: {trDetails.certpay} </p>
            <p>Безналичным: {trDetails.debitpay} </p>
          </div>
        )}
      </Modal> */}

      <Modal 
  title={t('reports.receiptTitle')} 
  open={isTrModalOpen} 
  onCancel={() => setIsTrModalOpen(false)} 
  footer={null}
  width={450}
>
  {trDetails && (
    <div className={styles.receiptContainer}>
      <h3 className={styles.receiptTitle}>{t('reports.receiptTitle').toUpperCase()}</h3>
      <p className={styles.receiptText}>{t('reports.purchaseDate')}: {dayjs(trDetails.date).format('DD.MM.YYYY HH:mm')}</p>
      <p className={styles.receiptText}>{t('reports.cashier')}: {trDetails.cashier}</p>
      <p className={styles.receiptText}>{t('reports.point')}: {trDetails.pointname}</p>
      <p className={styles.receiptText}>{t('reports.cashbox')}: {trDetails.cashboxname}</p>
      
      <hr className={styles.dashedLine} />
      
      <table className={styles.receiptTable}>
        <thead>
          <tr>
            <th align="left">{t('reports.itemName')}</th>
            <th align="right">{t('reports.itemPriceCalc')}</th>
            <th align="right">{t('reports.itemTotal')}</th>
          </tr>
        </thead>
        <tbody>
          {trDetails.details.map((d: any, i: number) => (
            <tr key={i}>
              <td>{d.name}</td>
              <td align="right" >{d.units} x {d.price}</td>
              <td align="right" >{d.totalprice} </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <hr className={styles.dashedLine} />
      
      <div className={styles.totalAmount}>
        {t('reports.totalToPay')}: {trDetails.price} 
      </div>

      <div className={styles.paymentsSection}>
        {/* Отображаем только те типы оплат, сумма которых больше 0 */}
        {trDetails.cashpay > 0 && <p className={styles.receiptText}>{t('reports.payments.cash')}: {trDetails.cashpay} </p>}
        {trDetails.cardpay > 0 && <p className={styles.receiptText}>{t('reports.payments.card')}: {trDetails.cardpay} </p>}
        {trDetails.certpay > 0 && <p className={styles.receiptText}>{t('reports.payments.cert')}: {trDetails.certpay} </p>}
        {trDetails.bonuspay > 0 && <p className={styles.receiptText}>{t('reports.payments.bonus')}: {trDetails.bonuspay} </p>}
        {trDetails.debitpay > 0 && <p className={styles.receiptText}>{t('reports.payments.debit')}: {trDetails.debitpay} </p>}
        {trDetails.debtpay > 0 && <p className={styles.receiptText}>{t('reports.payments.debt')}: {trDetails.debtpay} </p>}
      </div>

      {/* {trDetails.nds > 0 && (
        <div style={{ fontSize: '11px', marginTop: '10px', fontStyle: 'italic' }}>
          В том числе НДС: {trDetails.nds} ₸
        </div>
      )} */}
    </div>
  )}
</Modal>

      {/* Модалка Активации */}
      <Modal
        title={`${t('reports.selectStockTitle')} ${selectedCert?.code}`}
        open={isActivateModalOpen}
        onOk={activateCertificate}
        onCancel={() => setIsActivateModalOpen(false)}
        okText={t('reports.activate')}
        cancelText={t('reports.cancel')}
      >
        <Select 
          className={styles.fullWidthSelect}
          placeholder={t('reports.selectStockPlaceholder')}
          onChange={setSelectedStock}
        >
          {stocks.map(s => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
        </Select>
      </Modal>
    </Card>
  );
};

export default CertificateReport;