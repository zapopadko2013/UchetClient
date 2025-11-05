import React, { useEffect } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { useTranslation } from 'react-i18next';

import useApiRequest from '../../hooks/useApiRequest';

interface Buyer {
  id?: string;
  telephone: string;
  lastname: string;
  firstname: string;
  deleted: boolean;
  company?: string;
  debt?: number;
}

interface IndividualBuyerFormModalProps {
  visible: boolean;
  mode: 'add' | 'edit';
  buyer: Buyer | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const IndividualBuyerFormModal: React.FC<IndividualBuyerFormModalProps> = ({
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
        firstname: buyer.firstname,
        lastname: buyer.lastname,
        telephone: buyer.telephone,
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
      firstname: values.firstname,
      lastname: values.lastname,
      telephone: values.telephone,
    };

    // При редактировании добавляем id
    if (mode === 'edit' && buyer?.id) {
      customersPayload.id = buyer.id;
    }

    const payload = { customers: customersPayload };

      await sendRequest(`${import.meta.env.VITE_API_URL}/api/buyers/fizcustomers/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify(payload),
      });

      message.success(
        mode === 'add'
          ? t('individualBuyers.buyerAdded')
          : t('individualBuyers.buyerUpdated')
      );
      onSuccess();
    } catch (err) {
      message.error(t('individualBuyers.saveError'));
    }
  };

  return (
    <Modal
      open={visible}
      title={
        mode === 'add'
          ? t('individualBuyers.addBuyer')
          : t('individualBuyers.editBuyer')
      }
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {t('individualBuyers.cancel')}
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          {t('individualBuyers.save')}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label={t('individualBuyers.firstname')}
          name="firstname"
          rules={[
            {
              required: true,
              message: t('individualBuyers.validation.firstnameRequired'),
            },
          ]}
        >
          <Input />
        </Form.Item>

         <Form.Item
          label={t('individualBuyers.lastname')}
          name="lastname"
          rules={[
            {
              required: true,
              message: t('individualBuyers.validation.lastnameRequired'),
            },
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
  label={t('individualBuyers.telephone')}
  name="telephone"
  rules={[
    { required: true, message: t('individualBuyers.validation.telephoneRequired') },
    { pattern: /^\d+$/, message: t('individualBuyers.validation.telephoneDigitsOnly') },
  ]}
>
  <Input
   
    onKeyPress={(e) => {
      if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    }}
  />
</Form.Item>

       
      </Form>
    </Modal>
  );
};

export default IndividualBuyerFormModal;
