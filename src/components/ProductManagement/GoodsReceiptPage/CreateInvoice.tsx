import React, { useState } from 'react';
import { Button, message, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../../hooks/useApiRequest';
import InvoiceHeaderForm from './InvoiceHeaderForm';
import styles from './CreateInvoice.module.css';

interface InvoiceHeaderData {
  stockId: string | null;
  stockName?: string | null;
  counterpartyId: string | null;
  counterpartyName?: string | null;
  invoiceNumber: string;
  invoiceDate: string;
}

const CreateInvoice: React.FC = () => {
  const navigate = useNavigate();
  const { sendRequest } = useApiRequest();
  const { t } = useTranslation();
  const API_URL = import.meta.env.VITE_API_URL || '';

  const [formData, setFormData] = useState<InvoiceHeaderData>({
    stockId: null,
    stockName: null,
    counterpartyId: null,
    counterpartyName: null,
    invoiceNumber: '',
    invoiceDate: dayjs().format('YYYY-MM-DD'),
  });
  const [loading, setLoading] = useState(false);

  const isReady = !!formData.stockId && !!formData.counterpartyId;

  const handleContinue = async () => {
    if (!formData.stockId || !formData.counterpartyId) return;

    try {
      setLoading(true);

      const payload = {
        stockfrom: formData.stockId,
        stockto: formData.stockId,
        altinvoice: formData.invoiceNumber || '',
        invoicedate: dayjs(formData.invoiceDate).format('DD.MM.YYYY'),
        counterparty: formData.counterpartyId,
        type: '2',
      };

      const res = await sendRequest(`${API_URL}/api/invoice/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.code === 'success') {
        message.success(t('goodsReceipt.create.success', { number: res.text }));
        navigate(`/invoices/${res.text}`, {
          state: {
            counterparty: formData.counterpartyName,
            stockfrom: formData.stockName,
            status: t('goodsReceipt.status.drafting'),
            invoicedate: formData.invoiceDate,
          },
        });
      } else {
        message.error(
          t('goodsReceipt.create.error', { text: res.text || 'Unknown error' })
        );
      }
    } catch (error) {
      console.error('Ошибка при создании накладной:', error);
      message.error(t('goodsReceipt.create.requestError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loading}>
      <div className={styles.createInvoiceContainer}>
        <h2 className={styles.createInvoiceTitle}>
          {t('goodsReceipt.create.title')}
        </h2>

        <InvoiceHeaderForm
          onChange={(data) => setFormData({ ...formData, ...data })}
        />

        <div className={styles.createInvoiceButtonWrapper}>
          <Button
            type="primary"
            size="large"
            disabled={!isReady}
            onClick={handleContinue}
          >
            {t('goodsReceipt.create.continue')}
          </Button>
        </div>
      </div>
    </Spin>
  );
};

export default CreateInvoice;
