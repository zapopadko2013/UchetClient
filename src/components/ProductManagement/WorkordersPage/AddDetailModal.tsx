import React, { useState, useEffect } from 'react';
import { Modal, Form, InputNumber, Select, message } from 'antd';
import { useTranslation } from 'react-i18next';
import ProductBarcodeSearch from '../../ProductBarcodeSearch'; // Путь к вашему компоненту
import useApiRequest from '../../../hooks/useApiRequest';

interface Counterparty {
  id: string;
  name: string;
}

interface AddDetailModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  workorderId: string;
  point: string;
}

const AddDetailModal: React.FC<AddDetailModalProps> = ({ visible, onCancel, onSuccess, workorderId, point }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { sendRequest } = useApiRequest();
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [loading, setLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    if (visible) {
      sendRequest(`${API_URL}/api/counterparties`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      }).then(setCounterparties).catch(() => message.error(t('workorder.common.loadError')));
    }
  }, [visible]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const body = {
        product: values.product,
        point: point,
        workorder_id: workorderId,
        units: values.units,
        price: values.price,
        counterparty: values.counterparty
      };

      const response = await sendRequest(`${API_URL}/api/workorder/details/insert`, {
      method: 'POST',
      headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}` 
      },
      body: JSON.stringify(body),
    });

    // ОБРАБОТКА ОШИБКИ "УЖЕ СУЩЕСТВУЕТ"
    // Проверяем, не является ли ответ объектом ошибки
    if (response && response.code === 'exception') {
      message.error(response.text); // Выводим текст: "Товар уже существует..."
      setLoading(false);
      return; // Останавливаем выполнение, чтобы не закрывать модалку
    }

      message.success(t('workorder.addSuccess'));
      form.resetFields();
      onSuccess();
    } catch (err) {
      console.error(err);
      message.error(t('workorder.addError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={t('workorder.addProduct')}
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item label={t('workorder.product.label')} required>
          <ProductBarcodeSearch 
            onProductSelect={(id) => form.setFieldsValue({ product: id })}
            onClear={() => form.setFieldsValue({ product: undefined })}
          />
          {/* Скрытое поле для валидации выбора продукта */}
          <Form.Item name="product" noStyle rules={[{ required: true, message: t('workorder.common.required') }]}>
            <input type="hidden" />
          </Form.Item>
        </Form.Item>

        <Form.Item name="counterparty" label={t('workorder.counterparty')} rules={[{ required: true }]}>
          <Select showSearch optionFilterProp="children">
            {counterparties.map(c => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}
          </Select>
        </Form.Item>

        <div style={{ display: 'flex', gap: '16px' }}>
          <Form.Item name="units" label={t('workorder.qty')} rules={[{ required: true }]} style={{ flex: 1 }}>
            <InputNumber min={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="price" label={t('workorder.price')} rules={[{ required: true }]} style={{ flex: 1 }}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

export default AddDetailModal;