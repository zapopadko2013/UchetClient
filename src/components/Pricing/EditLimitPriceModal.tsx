import React, { useEffect, useState } from 'react';
import { Modal, Form, InputNumber, message, Spin } from 'antd';
import useApiRequest from '../../hooks/useApiRequest';
import { useTranslation } from 'react-i18next';
import styles from './LimitPricesPage.module.css';  

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productId: string;
  initialPrice: number | null;
}

const EditLimitPriceModal: React.FC<Props> = ({
  visible,
  onClose,
  onSuccess,
  productId,
  initialPrice,
}) => {
  const [form] = Form.useForm();
  const { sendRequest } = useApiRequest();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({ price: initialPrice });
    }
  }, [visible, initialPrice, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      await sendRequest(`${import.meta.env.VITE_API_URL}/api/invoice/changeprice`, {
        method: 'POST',
        body: JSON.stringify({
          isstaticprice: true,
          product: productId,
          price: values.price,
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
      });

      message.success(t('limitPrices.messages.editSuccess'));
      onSuccess();
      onClose();
    } catch {
      message.error(t('limitPrices.messages.editError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={t('limitPrices.actions.edit')}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={t('limitPrices.actions.save')}
      cancelText={t('limitPrices.actions.cancel')}
      confirmLoading={loading}
    >
      <Spin spinning={loading}>
        <Form layout="vertical" form={form}>
          <Form.Item
            name="price"
            label={t('limitPrices.form.limitPrice')}
            rules={[{ required: true, message: t('limitPrices.validation.enterLimitPrice') }]}
          >
            <InputNumber min={0} className={styles.fullWidth} />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default EditLimitPriceModal;
