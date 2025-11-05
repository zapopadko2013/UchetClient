import React, { useEffect, useState } from 'react';
import { Modal, Select, Input, DatePicker, Button, message, Space } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../../hooks/useApiRequest';
import styles from './CreateInvoice.module.css';

const { Option } = Select;

interface Counterparty {
  id: string;
  name: string;
  bin: string;
}

interface InvoiceEditModalProps {
  visible: boolean;
  onClose: () => void;
  invoiceNumber: string;
  altnumberInitial: string;
  invoicedateInitial: string;
  counterpartyId: string;
  counterparties: Counterparty[];
  onSaveSuccess: () => void;
}

const InvoiceEditModal: React.FC<InvoiceEditModalProps> = ({
  visible,
  onClose,
  invoiceNumber,
  altnumberInitial,
  invoicedateInitial,
  counterpartyId,
  counterparties,
  onSaveSuccess,
}) => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  const [selectedCounterparty, setSelectedCounterparty] = useState<string>('0');
  const [altnumber, setAltnumber] = useState(altnumberInitial);
  const [invoicedate, setInvoicedate] = useState<Dayjs>(dayjs(invoicedateInitial));
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);

  // Сброс к исходным при открытии
  useEffect(() => {
    if (visible) {
      setSelectedCounterparty(counterpartyId);
      setAltnumber(altnumberInitial);
      setInvoicedate(dayjs(invoicedateInitial));
    }
  }, [visible, counterpartyId, altnumberInitial, invoicedateInitial]);

  // Проверяем, были ли изменения
  useEffect(() => {
    const dateChanged = !invoicedate.isSame(dayjs(invoicedateInitial), 'day');
    const altChanged = altnumber !== altnumberInitial;
    const cpChanged = selectedCounterparty !== counterpartyId;
    setHasChanges(dateChanged || altChanged || cpChanged);
  }, [altnumber, invoicedate, selectedCounterparty, altnumberInitial, invoicedateInitial, counterpartyId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload: any = {
        invoice: invoiceNumber,
        altnumber,
        invoicedate: invoicedate.format('YYYY-MM-DD'),
      };

      if (selectedCounterparty && selectedCounterparty !== '0') {
        payload.counterparty = selectedCounterparty;
      }

      await sendRequest(`${API_URL}/api/invoice/edit`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      message.success(t('goodsReceipt.history.invoiceSaved'));
      onSaveSuccess();
      onClose();
    } catch {
      message.error(t('goodsReceipt.history.invoiceSaveError'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAltnumber(altnumberInitial);
    setInvoicedate(dayjs(invoicedateInitial));
    setSelectedCounterparty(counterpartyId);
  };

  return (
    <Modal
      title={t('goodsReceipt.history.editInvoice')}
      open={visible}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <div className={styles.section}>
        <label>{t('goodsReceipt.history.supplier')}</label>
        <Select
          value={selectedCounterparty}
          onChange={setSelectedCounterparty}
          className={styles.selectFull}
          placeholder={t('goodsReceipt.history.selectSupplier')}
        >
          {counterparties.map((cp) => (
            <Option key={cp.id} value={cp.id}>
              {cp.bin} | {cp.name}
            </Option>
          ))}
        </Select>
      </div>

      <div className={styles.section}>
        <label>{t('goodsReceipt.history.invoiceNumber')}</label>
        <Input
          value={altnumber}
          onChange={(e) => setAltnumber(e.target.value)}
          placeholder={t('goodsReceipt.history.invoiceNumber')}
        />
      </div>

      <div className={styles.dateField}>
        <label>{t('goodsReceipt.history.invoiceDate')}</label>
        <DatePicker
          value={invoicedate}
          onChange={(date) => date && setInvoicedate(date)}
          format="DD.MM.YYYY"
          className={styles.selectFull}
        />
      </div>

      <Space className={styles.footer}>
        <Button onClick={handleReset} disabled={!hasChanges}>
          {t('goodsReceipt.history.reset')}
        </Button>
        <Button onClick={onClose}>{t('goodsReceipt.history.cancel')}</Button>
        <Button
          type="primary"
          onClick={handleSave}
          disabled={!hasChanges}
          loading={loading}
        >
          {t('goodsReceipt.history.save')}
        </Button>
      </Space>
    </Modal>
  );
};

export default InvoiceEditModal;
