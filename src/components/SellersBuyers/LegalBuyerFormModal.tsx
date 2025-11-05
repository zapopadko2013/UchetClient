import React, { useEffect } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { useTranslation } from 'react-i18next';

import useApiRequest from '../../hooks/useApiRequest';

interface Buyer {
  id?: string | null;
  name: string;
  bin: string;
  address: string;
  deleted: boolean;
  company?: string;
  debt?: number;
}

interface LegalBuyerFormModalProps {
  visible: boolean;
  mode: 'add' | 'edit';
  buyer: Buyer | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const LegalBuyerFormModal: React.FC<LegalBuyerFormModalProps> = ({
  visible,
  mode,
  buyer,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const { sendRequest } = useApiRequest();
  const { t } = useTranslation();

  useEffect(() => {
    if (mode === 'edit' && buyer) {
      form.setFieldsValue({
        name: buyer.name,
        bin: buyer.bin,
        address: buyer.address,
      });
    } else {
      form.resetFields();
    }
  }, [mode, buyer, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

     // Формируем объект customers с обязательными полями
    const customersPayload: any = {
      deleted: false,
      bin: values.bin,
      name: values.name,
      address: values.address,
    };

    // При редактировании добавляем id
    if (mode === 'edit' && buyer?.id) {
      customersPayload.id = buyer.id;
    }

    const payload = { customers: customersPayload };

      await sendRequest(`${import.meta.env.VITE_API_URL}/api/buyers/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify(payload),
      });

      message.success(
        mode === 'add'
          ? t('legalBuyers.buyerAdded')
          : t('legalBuyers.buyerUpdated')
      );
      onSuccess();
    } catch (err) {
      message.error(t('legalBuyers.saveError'));
    }
  };

  return (
    <Modal
      open={visible}
      title={
        mode === 'add'
          ? t('legalBuyers.addBuyer')
          : t('legalBuyers.editBuyer')
      }
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {t('legalBuyers.cancel')}
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          {t('legalBuyers.save')}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label={t('legalBuyers.name')}
          name="name"
          rules={[
            {
              required: true,
              message: t('legalBuyers.validation.nameRequired'),
            },
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
  label={t('legalBuyers.bin')}
  name="bin"
  rules={[
    { required: true, message: t('legalBuyers.validation.binRequired') },
    { len: 12, message: t('legalBuyers.validation.binLength') },
    { pattern: /^\d+$/, message: t('legalBuyers.validation.binDigitsOnly') },
  ]}
>
  <Input
    maxLength={12}
    onKeyPress={(e) => {
      if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    }}
  />
</Form.Item>

        <Form.Item
          label={t('legalBuyers.address')}
          name="address"
          rules={[
            {
              required: true,
              message: t('legalBuyers.validation.addressRequired'),
            },
          ]}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default LegalBuyerFormModal;
