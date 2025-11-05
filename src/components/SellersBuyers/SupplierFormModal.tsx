import React, { useEffect } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../hooks/useApiRequest';

interface Supplier {
  id?: string | null;
  name: string;
  bin: string;
  email?: string | null;
  deleted: boolean;
  company?: string;
  address?: string | null;
  bank?: string | null;
  bik?: string | null;
  certificatenum?: string | null;
  certificateseries?: string | null;
  iik?: string | null;
  kbe?: string | null;
  country?: string;
}

interface SupplierFormModalProps {
  visible: boolean;
  mode: 'add' | 'edit';
  supplier: Supplier | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  visible,
  mode,
  supplier,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const { sendRequest } = useApiRequest();
  const { t } = useTranslation();

  useEffect(() => {
    if (mode === 'edit' && supplier) {
      form.setFieldsValue({
        name: supplier.name,
        bin: supplier.bin,
        email: supplier.email || '',
      });
    } else {
      form.resetFields();
    }
  }, [mode, supplier, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const payload =
  mode === 'add'
    ? {
        counterparties: {
          bin: values.bin,
          name: values.name,
          id: null,
          deleted: false,
        },
      }
    : {
        counterparties: {
          id: supplier?.id,
          name: values.name,
          bin: values.bin,
          email: values.email || null,
          deleted: false,
          company: supplier?.company || '2',
          address: supplier?.address || null,
          bank: supplier?.bank || null,
          bik: supplier?.bik || null,
          certificatenum: supplier?.certificatenum || null,
          certificateseries: supplier?.certificateseries || null,
          iik: supplier?.iik || null,
          kbe: supplier?.kbe || null,
          country: supplier?.country || 'KZ',
        },
      };
      
      await sendRequest(`${import.meta.env.VITE_API_URL}/api/counterparties/manage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify(payload),
      });

      message.success(
        mode === 'add'
          ? t('suppliers.messages.addSuccess')
          : t('suppliers.messages.editSuccess')
      );
      onSuccess();
    } catch (error) {
      message.error(t('suppliers.messages.saveError'));
    }
  };

  // Функция для блокировки ввода нецифровых символов
  const handleBinKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const charCode = e.charCode || e.keyCode;
    // Разрешаем только цифры (код 48-57), Backspace (8), Delete (46) и навигационные клавиши
    if (charCode < 48 || charCode > 57) {
      e.preventDefault();
    }
  };

  return (
    <Modal
      open={visible}
      title={mode === 'add' ? t('suppliers.modals.addTitle') : t('suppliers.modals.editTitle')}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {t('suppliers.buttons.cancel')}
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          {t('suppliers.buttons.save')}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label={t('suppliers.form.name')}
          name="name"
          rules={[{ required: true, message: t('suppliers.form.nameRequired') }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={t('suppliers.form.bin')}
          name="bin"
          rules={[
            { required: true, message: t('suppliers.form.binRequired') },
            { len: 12, message: t('suppliers.form.binLength') },
          ]}
        >
          <Input
            maxLength={12}
            inputMode="numeric"
            onKeyPress={handleBinKeyPress}
          />
        </Form.Item>
        <Form.Item label={t('suppliers.form.email')} name="email">
          <Input type="email" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SupplierFormModal;
