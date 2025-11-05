import React, { useState } from 'react';
import { Modal, Select, Button, Space } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import DateRangePickerSafe from '../../DateRangePickerSafe';
import styles from './CreateInvoice.module.css';

const { Option } = Select;

interface Counterparty {
  id: string;
  name: string;
  bin: string;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (dateRange: [Dayjs, Dayjs], counterparty: { id: string; name: string }) => void;
  counterparties: Counterparty[];
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApply,
  counterparties,
}) => {
  const { t } = useTranslation();
  const [selectedCounterparty, setSelectedCounterparty] = useState<string>('0');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(1, 'month'),
    dayjs(),
  ]);

  const handleReset = () => {
    setSelectedCounterparty('0');
    setDateRange([dayjs().subtract(1, 'month'), dayjs()]);
  };

  const handleApply = () => {
    const selectedCp = counterparties.find((cp) => cp.id === selectedCounterparty);
    if (selectedCounterparty === '0' || !selectedCp) {
      onApply(dateRange, { id: '0', name: t('goodsReceipt.history.allSuppliers') });
    } else {
      onApply(dateRange, { id: selectedCp.id, name: selectedCp.name });
    }
  };

  return (
    <Modal
      title={t('goodsReceipt.history.filter')}
      open={visible}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <div className={styles.section}>
        <label className={styles.label}>
          {t('goodsReceipt.history.supplier')}
        </label>
        <Select
          value={selectedCounterparty}
          onChange={setSelectedCounterparty}
          className={styles.selectFull}
        >
          <Option value="0">{t('goodsReceipt.history.allSuppliers')}</Option>
          {counterparties.map((cp) => (
            <Option key={cp.id} value={cp.id}>
              {cp.bin} | {cp.name}
            </Option>
          ))}
        </Select>
      </div>

      <div className={styles.dateField}>
        <label className={styles.label}>
          {t('goodsReceipt.history.date')}
        </label>
        <DateRangePickerSafe
          value={dateRange}
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              setDateRange([dates[0], dates[1]]);
            }
          }}
        />
      </div>

      <Space className={styles.footer}>
        <Button onClick={handleReset}>{t('goodsReceipt.history.reset')}</Button>
        <Button onClick={onClose}>{t('goodsReceipt.history.cancel')}</Button>
        <Button type="primary" onClick={handleApply}>
          {t('goodsReceipt.history.apply')}
        </Button>
      </Space>
    </Modal>
  );
};

export default FilterModal;
