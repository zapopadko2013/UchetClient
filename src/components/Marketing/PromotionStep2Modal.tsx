import React, { useEffect, useState } from 'react';
import { Modal, Select, Input, Button, Space, message, Row, Col } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import useApiRequest from '../../hooks/useApiRequest';
import { useTranslation } from 'react-i18next';
import styles from './PromotionsPage.module.css';

const { Option } = Select;

interface PromotionStep2ModalProps {
  open: boolean;
  onClose: () => void;
  promoName: string;
  pointId: string;
  pointName: string;
  dateRange: [Dayjs | null, Dayjs | null] | null;
  getHeaders: () => Record<string, string>;
  onBack: () => void;
}

const PromotionStep2Modal: React.FC<PromotionStep2ModalProps> = ({
  open,
  onClose,
  promoName,
  pointId,
  pointName,
  dateRange,
  getHeaders,
  onBack,
}) => {
  const { t } = useTranslation();
  const { sendRequest } = useApiRequest();
  const API_URL = import.meta.env.VITE_API_URL || '';

  const [conditions, setConditions] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [filteredDiscounts, setFilteredDiscounts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [selectedCondition, setSelectedCondition] = useState<number>(1);
  const [selectedDiscount, setSelectedDiscount] = useState<number>(1);

  // Акция
  const [selectedConditionProduct, setSelectedConditionProduct] = useState<string | null>(null);
  const [conditionQuantity, setConditionQuantity] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [addedConditionProducts, setAddedConditionProducts] = useState<
    { id: string; name: string; qty: string }[]
  >([]);

  // Тип
  const [selectedDiscountProduct, setSelectedDiscountProduct] = useState<string | null>(null);
  const [discountQuantity, setDiscountQuantity] = useState<string>('');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [addedDiscountItems, setAddedDiscountItems] = useState<
    { id: string; name: string; val: string }[]
  >([]);

  useEffect(() => {
    if (open) {
      Promise.all([
        sendRequest(`${API_URL}/api/promotions/getspr?name=conditions`, { headers: getHeaders() }),
        sendRequest(`${API_URL}/api/promotions/getspr?name=discounts`, { headers: getHeaders() }),
        sendRequest(`${API_URL}/api/products/mixedsearch?point=${pointId}`, { headers: getHeaders() }),
      ])
        .then(([conds, discts, prods]) => {
          setConditions(conds);
          setDiscounts(discts);
          setProducts(prods);
          setSelectedCondition(1);
          const filtered = discts.filter((d: any) => d.id === 1 || d.id === 3);
          setFilteredDiscounts(filtered);
          setSelectedDiscount(1);
        })
        .catch(() => message.error(t('promotionsStep2.errorLoading')));
    } else {
      setSelectedCondition(1);
      setSelectedDiscount(1);
      setAddedConditionProducts([]);
      setAddedDiscountItems([]);
      setAmount('');
      setDiscountQuantity('');
      setDiscountValue('');
      setSelectedConditionProduct(null);
      setSelectedDiscountProduct(null);
    }
  }, [open]);

  // фильтрация типов по акции
  useEffect(() => {
    if (selectedCondition === 1) {
      const filtered = discounts.filter((d) => d.id === 1 || d.id === 3);
      setFilteredDiscounts(filtered);
      if (![1, 3].includes(selectedDiscount)) setSelectedDiscount(1);
    } else if (selectedCondition === 2) {
      const filtered = discounts.filter((d) => d.id === 2 || d.id === 3);
      setFilteredDiscounts(filtered);
      if (![2, 3].includes(selectedDiscount)) setSelectedDiscount(2);
    }
  }, [selectedCondition, discounts]);

  const getProductName = (id: string) =>
    products.find((p) => p.id.toString() === id)?.name || '';

  const handleAddConditionProduct = () => {
    if (!selectedConditionProduct) return message.warning(t('promotionsStep2.selectProduct'));
    if (Number(conditionQuantity) <= 0) return message.warning(t('promotionsStep2.enterQuantity'));
    setAddedConditionProducts((prev) => [
      ...prev,
      { id: selectedConditionProduct, name: getProductName(selectedConditionProduct), qty: conditionQuantity },
    ]);
    setSelectedConditionProduct(null);
    setConditionQuantity('1');
  };

  const handleAddDiscountItem = () => {
    if (!selectedDiscountProduct) return message.warning(t('promotionsStep2.selectProduct'));
    if (selectedDiscount === 1 && Number(discountValue) <= 0)
      return message.warning(t('promotionsStep2.enterDiscount'));
    if (selectedDiscount === 3 && Number(discountQuantity) <= 0)
      return message.warning(t('promotionsStep2.enterQuantity'));

    setAddedDiscountItems((prev) => [
      ...prev,
      {
        id: selectedDiscountProduct,
        name: getProductName(selectedDiscountProduct),
        val: selectedDiscount === 1 ? discountValue : discountQuantity,
      },
    ]);
    setSelectedDiscountProduct(null);
    setDiscountQuantity('1');
    setDiscountValue('');
  };

  const removeConditionProduct = (i: number) =>
    setAddedConditionProducts((prev) => prev.filter((_, idx) => idx !== i));

  const removeDiscountItem = (i: number) =>
    setAddedDiscountItems((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      return message.error(t('promotionsStep2.noDateRange'));
    }

    if (selectedCondition === 1 && addedConditionProducts.length === 0) {
      return message.warning(t('promotionsStep2.addAtLeastOneProduct'));
    }
    if (selectedCondition === 2 && !amount) {
      return message.warning(t('promotionsStep2.enterAmount'));
    }

    if ((selectedDiscount === 1 || selectedDiscount === 3) && addedDiscountItems.length === 0) {
      return message.warning(t('promotionsStep2.addAtLeastOneTypeProduct'));
    }
    if (selectedDiscount === 2 && !discountValue) {
      return message.warning(t('promotionsStep2.enterDiscountForType'));
    }

    const expirationdate = dateRange[1].format('YYYY-MM-DD');
    const startdate = dateRange[0].format('YYYY-MM-DD');

    const ifValues =
      selectedCondition === 1
        ? addedConditionProducts.map((p) => ({ id: p.id, value: p.qty }))
        : [{ value: amount }];

    const thenValues =
      selectedDiscount === 1 || selectedDiscount === 3
        ? addedDiscountItems.map((p) => ({ id: p.id, value: p.val }))
        : selectedDiscount === 2
        ? [{ value: discountValue }]
        : [];

    const payload = {
      expirationdate,
      if: { id: selectedCondition, values: ifValues },
      point: pointId,
      promotionName: promoName,
      startdate,
      then: { id: selectedDiscount, values: thenValues },
    };

    try {
      const response = await sendRequest(`${API_URL}/api/promotions/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (response.code === 'success') {
        message.success(t('promotionsStep2.savedSuccessfully'));
        onClose();
      } else {
        message.error(response.text || t('promotionsStep2.saveError'));
      }
    } catch {
      message.error(t('promotionsStep2.networkError'));
    }
  };

  const start = dateRange?.[0]?.format('DD.MM.YYYY');
  const end = dateRange?.[1]?.format('DD.MM.YYYY');

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={t('promotionsStep2.title')}
      width={900}
    >
      <Space direction="vertical" className={styles.container} size="middle">
        <div>
          📅 {t('promotionsStep2.period')}: {start} – {end} <br />
          🏪 {t('promotionsStep2.point')}: {pointName} <br />
          🎁 {t('promotionsStep2.promotion')}: {promoName}
        </div>

        {/* === Акция и Тип === */}
        <Row gutter={16}>
          <Col span={12}>
            <Select
              value={selectedCondition}
              onChange={setSelectedCondition}
              className={styles.container}
              placeholder={t('promotionsStep2.selectCondition')}
            >
              {conditions.map((c) => (
                <Option key={c.id} value={c.id}>
                  {c.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={12}>
            <Select
              value={selectedDiscount}
              onChange={setSelectedDiscount}
              className={styles.container}
              placeholder={t('promotionsStep2.selectType')}
            >
              {filteredDiscounts.map((d) => (
                <Option key={d.id} value={d.id}>
                  {d.name}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>

        {/* === Товары === */}
        <Row gutter={16}>
          {/* УСЛОВИЕ */}
          <Col span={12}>
            {selectedCondition === 1 && (
              <>
                {addedConditionProducts.map((p, i) => (
                  <Space key={i} className={styles.flexSpace}>
                    <Input value={p.name} disabled className={styles.inputName} />
                    <Input value={p.qty} disabled className={styles.inputQty} />
                    <Button danger icon={<DeleteOutlined />} onClick={() => removeConditionProduct(i)} />
                  </Space>
                ))}
                <Select
                  placeholder={t('promotionsStep2.selectProduct')}
                  className={`${styles.container} ${styles.marginBottom8}`}
                  value={selectedConditionProduct || undefined}
                  onChange={setSelectedConditionProduct}
                >
                  {products.map((p) => (
                    <Option key={p.id} value={p.id.toString()}>
                      {p.name}
                    </Option>
                  ))}
                </Select>
                <Space>
                  <Input
                    placeholder={t('promotionsStep2.quantity')}
                    value={conditionQuantity}
                    onChange={(e) => setConditionQuantity(e.target.value)}
                    className={styles.inputQtyOrDiscount}
                  />
                  <Button type="primary" onClick={handleAddConditionProduct}>
                    {t('promotionsStep2.addProduct')}
                  </Button>
                </Space>
              </>
            )}

            {selectedCondition === 2 && (
              <Input
                placeholder={t('promotionsStep2.enterAmount')}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={styles.container}
              />
            )}
          </Col>

          {/* ТИП */}
          <Col span={12}>
            {selectedDiscount === 2 && (
              <Input
                placeholder={t('promotionsStep2.enterDiscount')}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className={styles.container}
              />
            )}

            {(selectedDiscount === 1 || selectedDiscount === 3) && (
              <>
                {addedDiscountItems.map((p, i) => (
                  <Space key={i} className={styles.flexSpace}>
                    <Input value={p.name} disabled className={styles.inputName} />
                    <Input value={p.val} disabled className={styles.inputQty} />
                    <Button danger icon={<DeleteOutlined />} onClick={() => removeDiscountItem(i)} />
                  </Space>
                ))}
                <Select
                  placeholder={t('promotionsStep2.selectProduct')}
                  className={`${styles.container} ${styles.marginBottom8}`}
                  value={selectedDiscountProduct || undefined}
                  onChange={setSelectedDiscountProduct}
                >
                  {products.map((p) => (
                    <Option key={p.id} value={p.id.toString()}>
                      {p.name}
                    </Option>
                  ))}
                </Select>
                <Space>
                  <Input
                    placeholder={
                      selectedDiscount === 1
                        ? t('promotionsStep2.discount')
                        : t('promotionsStep2.quantity')
                    }
                    value={selectedDiscount === 1 ? discountValue : discountQuantity}
                    onChange={(e) =>
                      selectedDiscount === 1
                        ? setDiscountValue(e.target.value)
                        : setDiscountQuantity(e.target.value)
                    }
                    className={styles.inputQtyOrDiscount}
                  />
                  <Button type="primary" onClick={handleAddDiscountItem}>
                    {selectedDiscount === 1
                      ? t('promotionsStep2.addDiscount')
                      : t('promotionsStep2.addGift')}
                  </Button>
                </Space>
              </>
            )}
          </Col>
        </Row>

        {/* === Кнопки === */}
        <Row justify="end" gutter={8} className={styles.buttonsRow}>
          <Col>
            <Button onClick={onBack}>{t('promotionsStep2.back')}</Button>
          </Col>
          <Col>
            <Button onClick={onClose}>{t('promotionsStep2.cancel')}</Button>
          </Col>
          <Col>
            <Button type="primary" onClick={handleSave}>
              {t('promotionsStep2.save')}
            </Button>
          </Col>
        </Row>
      </Space>
    </Modal>
  );
};

export default PromotionStep2Modal;
