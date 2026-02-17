import React, { useState, useEffect } from 'react';
import { Modal, Input, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from './Sale.module.css';

const { Text } = Typography;

interface MarkupModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (amount: number) => void;
  selectedItem?: any;
}

const MarkupModal: React.FC<MarkupModalProps> = ({ open, onClose, onApply, selectedItem }) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<number>(0);
  const [percent, setPercent] = useState<number>(0);

  // Сброс полей при открытии для нового товара
  /* useEffect(() => {
    if (open) {
      setAmount(0);
      setPercent(0);
    }
  }, [open, selectedItem]); */
  useEffect(() => {
    if (open && selectedItem) {
      // Подтягиваем уже существующую наценку из товара
      const currentMarkup = selectedItem.markup || 0;
      const originalPrice = selectedItem.originalPrice || 0;

      setAmount(currentMarkup);
      
      if (originalPrice > 0) {
        setPercent(Number(((currentMarkup / originalPrice) * 100).toFixed(2)));
      } else {
        setPercent(0);
      }
    }
  }, [open, selectedItem]);

  const handleAmountChange = (val: number) => {
    const originalPrice = selectedItem?.originalPrice || 0;
    setAmount(val);
    if (originalPrice > 0) {
      setPercent(Number(((val / originalPrice) * 100).toFixed(2)));
    }
  };

  const handlePercentChange = (val: number) => {
    const originalPrice = selectedItem?.originalPrice || 0;
    setPercent(val);
    if (originalPrice > 0) {
      setAmount(Number(((originalPrice * val) / 100).toFixed(2)));
    }
  };

  return (
    <Modal
      title={<b>{t('sale.workspace.modals.markup.title') || 'Наценка'}</b>}
      open={open}
      onOk={() => onApply(amount)}
      onCancel={onClose}
      zIndex={3503}
      okText={t('sale.payment.buttons.confirm')}
      cancelText={t('sale.payment.buttons.cancel')}
      destroyOnHidden
    >
      <Space direction="vertical"  size="large">
        {selectedItem && (
          <div>
            <Text type="secondary">{t('sale.workspace.labels.product') || 'Товар'}:</Text>
            <div className={styles.productName}>{selectedItem.name}</div>
          </div>
        )}

        <div>
          <Text>{t('sale.workspace.modals.markup.amountLabel') || 'Сумма наценки'}:</Text>
          <Input
            type="number"
            size="large"
            value={amount}
            onChange={(e) => handleAmountChange(Number(e.target.value))}
            placeholder="0.00"
          />
        </div>

        <div>
          <Text>{t('sale.workspace.modals.markup.percentLabel') || '% наценки'}:</Text>
          <Input
            type="number"
            size="large"
            value={percent}
            onChange={(e) => handlePercentChange(Number(e.target.value))}
            placeholder="0%"
          />
        </div>
      </Space>
    </Modal>
  );
};

export default MarkupModal;