import React, { useEffect, useState } from 'react';
import { Modal, Input, Select, message, Button, Space } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { useTranslation } from 'react-i18next';
import DateRangePickerSafe from '../DateRangePickerSafe';
import useApiRequest from '../../hooks/useApiRequest';
import PromotionStep2Modal from './PromotionStep2Modal';
import styles from './PromotionsPage.module.css';

const { Option } = Select;
dayjs.extend(isBetween);

interface PromotionAddModalProps {
  open: boolean;
  onClose: () => void;
  parentPromotions: any[];
}

type RangeValue = [Dayjs | null, Dayjs | null] | null;

const PromotionAddModal: React.FC<PromotionAddModalProps> = ({
  open,
  onClose,
  parentPromotions,
}) => {
  const { t } = useTranslation(); // ✅ для локализации
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  const [points, setPoints] = useState<any[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<string>();
  const [dateRange, setDateRange] = useState<RangeValue>([dayjs(), dayjs()]);
  const [promoName, setPromoName] = useState('');
  const [step2Visible, setStep2Visible] = useState(false);

  // Заголовки для API
  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
    'Content-Type': 'application/json',
  });

  // Загрузка торговых точек
  useEffect(() => {
    if (open) {
      sendRequest(`${API_URL}/api/point`, { headers: getHeaders() })
        .then((res) => setPoints(res))
        .catch(() => message.error(t('promotions.errorLoadingPoints')));
    }
  }, [open, t]);

  const handleCloseAll = () => {
    // Очистка всех состояний
    setPromoName('');
    setSelectedPoint(undefined);
    setDateRange([dayjs(), dayjs()]);
    setStep2Visible(false);
    onClose(); // закрывает основное окно
  };

  // Проверка и переход к следующему шагу
  const handleContinue = () => {
    if (!promoName.trim()) {
      return message.warning(t('promotions.enterPromoName'));
    }

    if (!selectedPoint) {
      return message.warning(t('promotions.selectPoint'));
    }

    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      return message.warning(t('promotions.selectDateRange'));
    }

    /* const start = dateRange[0];
    const end = dateRange[1]; */
    const start = dateRange[0]?.startOf('day');
    const end = dateRange[1]?.endOf('day');


    // Проверяем есть ли акция для выбранной точки с пересечением по датам
    const hasConflict = parentPromotions.some((promotion) => {
      if (promotion.point !== selectedPoint) return false;

      return promotion.points.some((pt: any) => {
        const bdate = dayjs(pt.bdate);
        const edate = dayjs(pt.edate);
        const overlaps =
          start.isBetween(bdate, edate, null, '[]') ||
          end.isBetween(bdate, edate, null, '[]') ||
          (start.isBefore(bdate) && end.isAfter(edate));
        return overlaps;
      });
    });

    if (hasConflict) {
      message.warning(t('promotions.conflictWarning'));
    } else {
      setStep2Visible(true);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        title={t('promotions.addTitle')}
        width={700}
      >
        <Space direction="vertical" className={styles.container} size="middle">
          <Space>
            <Input
              placeholder={t('promotions.promoNamePlaceholder')}
              value={promoName}
              onChange={(e) => setPromoName(e.target.value)}
              className={styles.input}
            />

            <Select
              placeholder={t('promotions.selectPointPlaceholder')}
              className={styles.input}
              onChange={setSelectedPoint}
              value={selectedPoint}
            >
              {points.map((p) => (
                <Option key={p.id} value={p.id}>
                  {p.name}
                </Option>
              ))}
            </Select>
          </Space>

          <DateRangePickerSafe value={dateRange} onChange={setDateRange} />

          <Button type="primary" onClick={handleContinue}>
            {t('promotions.continue')}
          </Button>
        </Space>
      </Modal>

      {step2Visible && (
        <PromotionStep2Modal
          open={step2Visible}
          onClose={handleCloseAll}
          promoName={promoName}
          pointId={selectedPoint!}
          pointName={points.find((p) => p.id.toString() === selectedPoint)?.name || ''}
          dateRange={dateRange}
          getHeaders={getHeaders}
          onBack={() => setStep2Visible(false)}
        />
      )}
    </>
  );
};

export default PromotionAddModal;
