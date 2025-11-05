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
import styles from './GoodsWriteoffPage.module.css';
import WriteOffProducts from './WriteOffProducts';

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

const GoodsWriteoffPage: React.FC = () => {
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
        sendRequest(`${API_URL}/api/invoice?status=FORMATION&type=7`, { headers: getHeaders() }),
      ]);

      setStocks(stockData || []);

      if (invoiceData?.invoicenumber) {
        setInvoice(invoiceData);
        setIsModalVisible(true);
      }
    } catch (err) {
      console.error(err);
      message.error(t('goodsWriteoffPage.loadError'));
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
      message.success(t('goodsWriteoffPage.invoiceDeleted'));
      setInvoice(null);
      setIsModalVisible(false);
      setShowForm(true);
    } catch {
      message.error(t('goodsWriteoffPage.invoiceDeleteError'));
    }
  };

  // 🔹 Продолжить
  const handleContinue = () => {
    setIsModalVisible(false);
    setShowForm(false);
    message.info(t('goodsWriteoffPage.continueInvoice', { number: invoice?.invoicenumber }));
  };

  // 🔹 Проверка формы
  const handleValuesChange = () => {
    const values = form.getFieldsValue();
   /*  const isValid =
      !!values.stockFrom &&
      !!values.stockTo &&
      values.stockFrom !== values.stockTo; */
       const isValid =
      !!values.stockFrom ;
    setIsFormValid(isValid);
  };

  // 🔹 Создание новой накладной
  const handleCreateInvoice = async (values: any) => {
    

    setIsLoading(true);
    try {
      const payload = {
        stockfrom: values.stockFrom,
        stockto: values.stockFrom,
        altinvoice: values.altinvoice || '',
        invoicedate: dayjs(values.invoicedate).format('DD.MM.YYYY'),
        type: '7',
      };

      const res = await sendRequest(`${API_URL}/api/invoice/create`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.code === 'success') {
        message.success(t('goodsWriteoffPage.created', { number: res.text }));
        setInvoice({
          invoicenumber: res.text,
          stockfrom: payload.stockfrom,
          stockto: payload.stockto,
        });
        setShowForm(false);
      } else {
        message.error(res.text || t('goodsWriteoffPage.createError'));
      }
    } catch (err) {
      console.error(err);
      message.error(t('goodsWriteoffPage.createError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <Title level={3}>{t('goodsWriteoffPage.title')}</Title>

      {/* 🔹 Модалка: незавершённая накладная */}
      <Modal open={isModalVisible} footer={null} closable={false} maskClosable={false}>
        <p>{t('goodsWriteoffPage.unfinishedInvoice')}</p>
        <Space className={styles.modalButtons}>
          <Button onClick={handleDeleteInvoice}>{t('goodsWriteoffPage.buttons.deleteInvoice')}</Button>
          <Button type="primary" onClick={handleContinue}>
            {t('goodsWriteoffPage.buttons.continue')}
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
            label={t('goodsWriteoffPage.stockFrom')}
            name="stockFrom"
            rules={[{ required: true, message: t('goodsWriteoffPage.selectStock') }]}
          >
            <Select
              placeholder={t('goodsWriteoffPage.selectPlaceholder')}
              options={stocks.map((s) => ({ label: s.name, value: s.id }))}
            />
          </Form.Item>

         

          <Form.Item label={t('goodsWriteoffPage.invoiceNumber')} name="altinvoice">
            <Input placeholder={t('goodsWriteoffPage.enterNumber')} />
          </Form.Item>

          <Form.Item
            label={t('goodsWriteoffPage.invoiceDate')}
            name="invoicedate"
            initialValue={dayjs()}
          >
            <DatePicker format="DD.MM.YYYY" className={styles.datePickerFullWidth} />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={isLoading} disabled={!isFormValid}>
            {t('goodsWriteoffPage.buttons.continue')}
          </Button>
        </Form>
      )}

      {/* 🔹 Таблица товаров */}
      {!showForm && invoice && (
        <WriteOffProducts
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

export default GoodsWriteoffPage;
