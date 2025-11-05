import React, { useEffect, useState } from 'react';
import {
  Button,
  Form,
  Select,
  Input,
  DatePicker,
  Modal,
  Typography,
  Space,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../../hooks/useApiRequest';
import styles from './StockTransfer.module.css';
import StockTransferProducts from './StockTransferProducts';

const { Title } = Typography;

interface Stock {
  id: string;
  name: string;
  address: string;
}

interface Invoice {
  invoicenumber: string;
  stockfrom: string;
  stockto: string;
}

const StockTransfer: React.FC = () => {
  const { t } = useTranslation(); // ✅ инициализация переводов

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [isFormValid, setIsFormValid] = useState(false);
  const [form] = Form.useForm();
  const { sendRequest } = useApiRequest();

  const API_URL = import.meta.env.VITE_API_URL || '';

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  // 🔹 Загрузка складов и незавершённой накладной
  const loadData = async () => {
    try {
      const [stockData, invoiceData] = await Promise.all([
        sendRequest(`${API_URL}/api/stock`, { headers: getHeaders() }),
        sendRequest(`${API_URL}/api/invoice?status=FORMATION&type=1`, { headers: getHeaders() }),
      ]);

      setStocks(stockData || []);

      if (invoiceData?.invoicenumber) {
        setInvoice(invoiceData);
        setIsModalVisible(true);
      }
    } catch (err) {
      console.error(err);
      message.error(t('stockTransfer.loadError'));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 🔹 Удалить незавершённую накладную
  const handleDeleteInvoice = async () => {
    if (!invoice) return;
    try {
      await sendRequest(`${API_URL}/api/invoice/delete`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ invoice: invoice.invoicenumber }),
      });
      message.success(t('stockTransfer.invoiceDeleted'));
      setInvoice(null);
      setIsModalVisible(false);
      setShowForm(true);
    } catch {
      message.error(t('stockTransfer.invoiceDeleteError'));
    }
  };

  // 🔹 Продолжить
  const handleContinue = () => {
    setIsModalVisible(false);
    setShowForm(false);
    message.info(t('stockTransfer.continueInvoice', { number: invoice?.invoicenumber }));
  };

  // 🔹 Проверка формы
  const handleValuesChange = () => {
    const values = form.getFieldsValue();
    const isValid =
      !!values.stockFrom &&
      !!values.stockTo &&
      values.stockFrom !== values.stockTo;
    setIsFormValid(isValid);
  };

  // 🔹 Создание новой накладной
  const handleCreateInvoice = async (values: any) => {
    if (values.stockFrom === values.stockTo) {
      message.warning(t('stockTransfer.sameStockWarning'));
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        stockfrom: values.stockFrom,
        stockto: values.stockTo,
        altinvoice: values.altinvoice || '',
        invoicedate: dayjs(values.invoicedate).format('DD.MM.YYYY'),
        type: '1',
      };

      const res = await sendRequest(`${API_URL}/api/invoice/create`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.code === 'success') {
        message.success(t('stockTransfer.created', { number: res.text }));
        setInvoice({
          invoicenumber: res.text,
          stockfrom: payload.stockfrom,
          stockto: payload.stockto,
        });
        setShowForm(false);
      } else {
        message.error(res.text || t('stockTransfer.createError'));
      }
    } catch (err) {
      console.error(err);
      message.error(t('stockTransfer.createError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <Title level={3}>{t('stockTransfer.title')}</Title>

      {/* 🔹 Модалка: незавершённая накладная */}
      <Modal open={isModalVisible} footer={null} closable={false} maskClosable={false}>
        <p>{t('stockTransfer.unfinishedInvoice')}</p>
        <Space className={styles.modalButtons}>
          <Button onClick={handleDeleteInvoice}>{t('stockTransfer.buttons.deleteInvoice')}</Button>
          <Button type="primary" onClick={handleContinue}>
            {t('stockTransfer.buttons.continue')}
          </Button>
        </Space>
      </Modal>

      {/* 🔹 Форма создания */}
      {showForm && (
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleValuesChange}
          onFinish={handleCreateInvoice}
          className={styles.formWrapper}
        >
          <Form.Item
            label={t('stockTransfer.stockFrom')}
            name="stockFrom"
            rules={[{ required: true, message: t('stockTransfer.selectStock') }]}
          >
            <Select
              placeholder={t('stockTransfer.selectPlaceholder')}
              options={stocks.map((s) => ({ label: s.name, value: s.id }))}
            />
          </Form.Item>

          <Form.Item
            label={t('stockTransfer.stockTo')}
            name="stockTo"
            rules={[{ required: true, message: t('stockTransfer.selectStock') }]}
          >
            <Select
              placeholder={t('stockTransfer.selectPlaceholder')}
              options={stocks.map((s) => ({ label: s.name, value: s.id }))}
            />
          </Form.Item>

          <Form.Item label={t('stockTransfer.invoiceNumber')} name="altinvoice">
            <Input placeholder={t('stockTransfer.enterNumber')} />
          </Form.Item>

          <Form.Item
            label={t('stockTransfer.invoiceDate')}
            name="invoicedate"
            initialValue={dayjs()}
          >
            <DatePicker format="DD.MM.YYYY" className={styles.datePickerFullWidth} />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={isLoading} disabled={!isFormValid}>
            {t('stockTransfer.buttons.continue')}
          </Button>
        </Form>
      )}

      {/* 🔹 Таблица товаров */}
      {!showForm && invoice && (
        <StockTransferProducts
          invoiceNumber={invoice.invoicenumber}
          stockFrom={invoice.stockfrom}
          stockTo={invoice.stockto}
          stocks={stocks}
          onInvoiceDeleted={() => {
            setInvoice(null);
            setShowForm(true);
          }}
          onInvoiceApplied={() => {
            setInvoice(null);
            setShowForm(true);
          }}
        />
      )}
    </div>
  );
};

export default StockTransfer;
