import React, { useEffect, useState } from 'react';
import { Row, Col, Select, Input, DatePicker, message, Spin } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../../hooks/useApiRequest';
import styles from './CreateInvoice.module.css';

const { Option } = Select;

interface Stock {
  id: string;
  name: string;
  address?: string;
}

interface Counterparty {
  id: string;
  name: string;
  bin?: string;
}

interface InvoiceHeaderFormProps {
  onChange?: (data: {
    stockId: string | null;
    stockName: string | null;
    counterpartyId: string | null;
    counterpartyName: string | null;
    invoiceNumber: string;
    invoiceDate: string;
  }) => void;

  initialStockId?: string | null;
  initialCounterpartyId?: string | null;
  initialInvoiceNumber?: string;
  initialInvoiceDate?: string;
}

const InvoiceHeaderForm: React.FC<InvoiceHeaderFormProps> = ({
  onChange,
  initialStockId = null,
  initialCounterpartyId = null,
  initialInvoiceNumber = '',
  initialInvoiceDate,
}) => {
  const { t } = useTranslation();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [loading, setLoading] = useState(false);

  const [stockId, setStockId] = useState<string | null>(null);
  const [counterpartyId, setCounterpartyId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState(initialInvoiceNumber);
  const [invoiceDate, setInvoiceDate] = useState<Dayjs>(
    initialInvoiceDate ? dayjs(initialInvoiceDate) : dayjs()
  );

  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  /** Загружаем склады и поставщиков */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [stocksData, counterpartiesData] = await Promise.all([
          sendRequest(`${API_URL}/api/stock`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
            },
          }),
          sendRequest(`${API_URL}/api/counterparties`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
            },
          }),
        ]);

        setStocks(stocksData || []);
        setCounterparties(counterpartiesData || []);
      } catch (err) {
        console.error(err);
        message.error(t('goodsReceipt.form.loadError'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /** Инициализация ID после загрузки данных */
  useEffect(() => {
    if (stocks.length && initialStockId && !stocks.find((s) => s.id === initialStockId)) {
      const stock = stocks.find((s) => s.name === initialStockId);
      if (stock) setStockId(stock.id);
    } else if (initialStockId) {
      setStockId(initialStockId);
    }

    if (counterparties.length && initialCounterpartyId && !counterparties.find((c) => c.id === initialCounterpartyId)) {
      const cp = counterparties.find((c) => c.name === initialCounterpartyId);
      if (cp) setCounterpartyId(cp.id);
    } else if (initialCounterpartyId) {
      setCounterpartyId(initialCounterpartyId);
    }
  }, [stocks, counterparties, initialStockId, initialCounterpartyId]);

  /** Передаем изменения родителю */
  useEffect(() => {
    const stock = stocks.find((s) => s.id === stockId);
    const counterparty = counterparties.find((c) => c.id === counterpartyId);

    onChange?.({
      stockId,
      stockName: stock?.name || null,
      counterpartyId,
      counterpartyName: counterparty?.name || null,
      invoiceNumber,
      invoiceDate: invoiceDate.format('YYYY-MM-DD'),
    });
  }, [stockId, counterpartyId, invoiceNumber, invoiceDate, stocks, counterparties]);

  return (
    <Spin spinning={loading}>
      <div className={styles.section}>
        <Row gutter={16} className={styles.sectionSmall}>
          <Col span={12}>
            <label className={styles.labelSmall}>
              {t('goodsReceipt.form.stock')}
            </label>
            <Select
              value={stockId || undefined}
              onChange={setStockId}
              placeholder={t('goodsReceipt.form.selectStock')}
              className={styles.selectFull}
              showSearch
              optionFilterProp="children"
              allowClear
            >
              {stocks.map((s) => (
                <Option key={s.id} value={s.id}>
                  {s.name} {s.address ? `(${s.address})` : ''}
                </Option>
              ))}
            </Select>
          </Col>

          <Col span={12}>
            <label className={styles.labelSmall}>
              {t('goodsReceipt.form.supplier')}
            </label>
            <Select
              value={counterpartyId || undefined}
              onChange={setCounterpartyId}
              placeholder={t('goodsReceipt.form.selectSupplier')}
              className={styles.selectFull}
              showSearch
              optionFilterProp="children"
              allowClear
            >
              {counterparties.map((c) => (
                <Option key={c.id} value={c.id}>
                  {c.name} {c.bin ? `(${c.bin})` : ''}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <label className={styles.labelSmall}>
              {t('goodsReceipt.form.invoiceNumber')}
            </label>
            <Input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder={t('goodsReceipt.form.enterInvoiceNumber')}
            />
          </Col>

          <Col span={12}>
            <label className={styles.labelSmall}>
              {t('goodsReceipt.form.invoiceDate')}
            </label>
            <DatePicker
              value={invoiceDate}
              onChange={(date) => date && setInvoiceDate(date)}
              format="DD.MM.YYYY"
              className={styles.selectFull}
            />
          </Col>
        </Row>
      </div>
    </Spin>
  );
};

export default InvoiceHeaderForm;
