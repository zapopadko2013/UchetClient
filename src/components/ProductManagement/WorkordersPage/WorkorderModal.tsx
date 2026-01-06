import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, InputNumber, message } from 'antd';
import { useTranslation } from 'react-i18next';
import useApiRequest from '../../../hooks/useApiRequest';

interface Point {
  id: string;
  name: string;
  point_type: number;
  stockid: string;
}

interface WorkorderModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues?: { id?: string; workorder_number: number; point: string; };
}

const WorkorderModal: React.FC<WorkorderModalProps> = ({ 
  visible, 
  onCancel, 
  onSuccess, 
  initialValues 
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { sendRequest } = useApiRequest();
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || '';

  // Загрузка списка торговых точек
  useEffect(() => {
    if (visible) {
      const fetchPoints = async () => {
        try {
          const data = await sendRequest(`${API_URL}/api/revision/points`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
          });
          setPoints(data || []);
        } catch (err) {
          console.error(err);
        }
      };
      fetchPoints();
    }
  }, [visible]);

  // Установка значений при редактировании
  useEffect(() => {
    if (visible && initialValues) {
      form.setFieldsValue(initialValues);
    } else {
      form.resetFields();
    }
  }, [visible, initialValues, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const body = {
        workorder_number: values.workorder_number,
        point: values.point,
        // Если это редактирование, обычно передается ID
        ...(initialValues?.id && { id: initialValues.id }) 
      };

      const response = await sendRequest(`${API_URL}/api/workorder/manage`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}` 
      },
      body: JSON.stringify(body),
    });

    // ПРОВЕРКА НА БИЗНЕС-ОШИБКУ ОТ СЕРВЕРА
    // Так как ответ может быть массивом [ { workorder_management: ... } ]
    const errorData = Array.isArray(response) ? response[0] : response;

    if (errorData?.workorder_management?.code === 'exception') {
      // Выводим текст ошибки напрямую из ответа сервера
      message.error(errorData.workorder_management.text);
      setLoading(false);
      return; // Прекращаем выполнение, не закрываем модалку
    }

      message.success(t('workorder.submitSuccess'));
      onSuccess();
    } catch (err) {
      console.error(err);
      message.error(t('workorder.submitError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={initialValues?.id ? t('workorder.modalTitleEdit') : t('workorder.modalTitleAdd')}
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      okText={t('workorder.common.save')}
      cancelText={t('workorder.common.cancel')}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" name="workorder_form">
        <Form.Item
          name="point"
          label={t('workorder.pointLabel')}
          rules={[{ required: true, message: t('workorder.common.required') }]}
        >
          <Select placeholder={t('workorder.pointPlaceholder')}>
            {points.map(p => (
              <Select.Option key={p.id} value={p.stockid}>
                {p.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="workorder_number"
          label={t('workorder.numberLabel')}
          rules={[{ required: true, message: t('workorder.common.required') }]}
        >
          <InputNumber 
            style={{ width: '100%' }} 
            placeholder={t('workorder.numberPlaceholder')}
            precision={0} // Только целые числа
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default WorkorderModal;